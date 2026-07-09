#!/usr/bin/env node
// 주소록 암호화 도구 — 평문은 메모리에만, 출력은 암호문(data/members.enc)뿐.
//
// 사용법:
//   node scripts/encrypt-members.mjs --csv <path>            (사이트 스키마 CSV → 암호화)
//   node scripts/encrypt-members.mjs --legacy-xlsx <path>    (구 MR 주소록.xlsx → 매핑 후 암호화)
//   [--out data/members.enc]  출력 경로(기본 data/members.enc)
//
// 접속 코드는 stdin으로 입력(가려짐). 환경변수 MEMBERS_CODE 로도 전달 가능(테스트용).
//
// 사이트 스키마(열 순서): 이름, 기수, 소속, 이메일, 전화번호, 관심사, 한마디, 회장
// 브라우저(members.html)는 헤더 1줄을 건너뛰고 위치 기반으로 읽는다.

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import readline from "node:readline";

const ITERATIONS = 300000;

// ── 인자 파싱 ──
function parseArgs(argv) {
  const out = { out: "data/members.enc" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--csv") out.csv = argv[++i];
    else if (a === "--legacy-xlsx") out.xlsx = argv[++i];
    else if (a === "--out") out.out = argv[++i];
    else throw new Error("알 수 없는 인자: " + a);
  }
  if (!out.csv && !out.xlsx) throw new Error("--csv 또는 --legacy-xlsx 를 지정하세요.");
  return out;
}

// ── CSV ──
function parseCsv(text) {
  const rows = [];
  let field = "", row = [], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); field = ""; row = []; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function toCsv(rows) {
  // 브라우저 파서(common.js)는 줄 단위로 먼저 나눈 뒤 파싱하므로 필드 내 개행을 처리하지 못한다.
  // 따라서 필드 안의 CR/LF는 공백으로 치환해 한 줄 = 한 레코드를 보장한다.
  return rows.map((r) => r.map((v) => {
    const s = (v == null ? "" : String(v)).replace(/[\r\n]+/g, " ");
    return /[",]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(",")).join("\n");
}

// ── 최소 xlsx 리더 (zip + inflate, 표준 라이브러리만) ──
function readZipEntries(buf, wanted) {
  // EOCD 탐색
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("EOCD를 찾을 수 없음 (xlsx가 아님?)");
  const cdCount = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const result = {};
  for (let n = 0; n < cdCount; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error("중앙 디렉터리 손상");
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const fnLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.toString("utf8", off + 46, off + 46 + fnLen);
    if (wanted.includes(name)) {
      const lfnLen = buf.readUInt16LE(localOff + 26);
      const lexLen = buf.readUInt16LE(localOff + 28);
      const dataStart = localOff + 30 + lfnLen + lexLen;
      const comp = buf.subarray(dataStart, dataStart + compSize);
      result[name] = method === 0 ? Buffer.from(comp) : zlib.inflateRawSync(comp);
    }
    off += 46 + fnLen + extraLen + commLen;
  }
  return result;
}

function decodeXmlEntities(s) {
  return s.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

function parseSharedStrings(xml) {
  const out = [];
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = siRe.exec(xml))) {
    const inner = m[1];
    let text = "";
    const tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let t;
    while ((t = tRe.exec(inner))) text += t[1];
    out.push(decodeXmlEntities(text));
  }
  return out;
}

function colLetter(ref) { return ref.replace(/[0-9]+/g, ""); }

function parseSheet(xml, strings) {
  const rows = [];
  const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rm;
  while ((rm = rowRe.exec(xml))) {
    const cells = {};
    // 자기닫힘 대안(<c .../>)을 먼저 시도해야 한다 — 여는 태그 대안의 [^>]*가
    // 순서상 먼저 걸리면 자기닫힘 태그 끝의 "/"까지 attrs로 먹어치우고, 그 뒤
    // "<c .../><c ...>본문</c>" 형태를 "여는 태그 + 본문"으로 잘못 매치해
    // 다음 셀 전체를 이 셀의 body로 삼켜버린다(다음 셀 t="s" 정보 유실 → 공유
    // 문자열 인덱스가 원시 숫자 값으로 새어나감).
    const cRe = /<c\b([^>]*)\/>|<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    let cm;
    while ((cm = cRe.exec(rm[1]))) {
      const attrs = cm[1] || cm[2] || "";
      const body = cm[3] || "";
      const refM = /r="([A-Z]+\d+)"/.exec(attrs);
      if (!refM) continue;
      const type = (/t="([^"]+)"/.exec(attrs) || [])[1];
      let val = "";
      const vM = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(body);
      const isM = /<is\b[^>]*>([\s\S]*?)<\/is>/.exec(body);
      if (type === "s" && vM) val = strings[parseInt(vM[1], 10)] || "";
      else if (type === "inlineStr" && isM) {
        const tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g; let t;
        while ((t = tRe.exec(isM[1]))) val += t[1];
        val = decodeXmlEntities(val);
      } else if (vM) val = decodeXmlEntities(vM[1]);
      cells[colLetter(refM[1])] = val;
    }
    rows.push(cells);
  }
  return rows;
}

function legacyXlsxToRows(buf) {
  const parts = readZipEntries(buf, ["xl/sharedStrings.xml", "xl/worksheets/sheet1.xml"]);
  if (!parts["xl/worksheets/sheet1.xml"]) throw new Error("sheet1.xml 없음");
  const strings = parts["xl/sharedStrings.xml"]
    ? parseSharedStrings(parts["xl/sharedStrings.xml"].toString("utf8")) : [];
  const sheet = parseSheet(parts["xl/worksheets/sheet1.xml"].toString("utf8"), strings);
  // 구 스키마: A 기수/학번, B 이름, C 전화, D 직장, E 지역1, F 지역2, G 이메일, H 이메일2, J 비고(회장 표시)
  const header = ["이름", "기수", "소속", "이메일", "전화번호", "관심사", "한마디", "회장"];
  const dataRows = sheet.slice(1); // 1행 헤더 제외
  const mapped = [];
  for (const d of dataRows) {
    const name = (d.B || "").trim();
    if (!name) continue;
    let cohort = (d.A || "").trim();
    if (cohort.endsWith(".0")) cohort = cohort.slice(0, -2);
    // 01~09학번이 숫자 1~9로 저장된 경우 두 자리로 정규화(members.html의 로드 시점 정규화와 동일 규칙)
    if (/^\d$/.test(cohort)) cohort = cohort.padStart(2, "0");
    const org = [ (d.D || "").trim(), (d.E || "").trim() ].filter(Boolean).join(", ");
    const email = (d.G || "").trim() || (d.H || "").trim();
    const phone = (d.C || "").trim();
    const pres = (d.J || "").includes("회장") ? "회장" : "";
    mapped.push([name, cohort, org, email, phone, "", "", pres]);
  }
  return [header, ...mapped];
}

// ── 코드 입력(가려짐) ──
function readCode() {
  if (process.env.MEMBERS_CODE) return Promise.resolve(process.env.MEMBERS_CODE);
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const query = "접속 코드 입력(화면에 표시되지 않음): ";
    rl._writeToOutput = function (s) {
      if (s.includes(query) || s === "\r\n" || s === "\n") rl.output.write(s);
      else rl.output.write("*");
    };
    rl.question(query, (answer) => { rl.close(); process.stdout.write("\n"); resolve(answer); });
  });
}

// ── 암호화 (AES-256-GCM, WebCrypto 호환: ct||tag) ──
function encrypt(plaintext, code) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(Buffer.from(code, "utf8"), salt, ITERATIONS, 32, "sha256");
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(Buffer.from(plaintext, "utf8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 1, kdf: "PBKDF2-SHA256", hash: "SHA-256", iter: ITERATIONS,
    salt: salt.toString("base64"), iv: iv.toString("base64"),
    ct: Buffer.concat([ct, tag]).toString("base64"),
  };
}

export { parseCsv, toCsv, legacyXlsxToRows, encrypt, ITERATIONS };

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let rows;
  if (args.xlsx) {
    rows = legacyXlsxToRows(fs.readFileSync(args.xlsx));
  } else {
    rows = parseCsv(fs.readFileSync(args.csv, "utf8")).filter((r) => r.some((v) => v && v.trim()));
  }
  const dataCount = Math.max(0, rows.length - 1);
  if (dataCount === 0) throw new Error("데이터 행이 없습니다.");
  const csv = toCsv(rows);
  const code = (await readCode()).trim();
  if (code.length < 6) throw new Error("접속 코드는 6자 이상을 권장합니다. 중단합니다.");
  const blob = encrypt(csv, code);
  const outPath = path.resolve(args.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(blob));
  process.stdout.write(`완료: ${outPath} (회원 ${dataCount}명 암호화, PBKDF2 ${ITERATIONS}회)\n`);
}

const invokedDirectly = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (invokedDirectly) {
  main().catch((e) => { process.stderr.write("오류: " + e.message + "\n"); process.exit(1); });
}
