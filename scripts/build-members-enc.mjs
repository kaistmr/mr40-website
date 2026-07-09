#!/usr/bin/env node
// 주소록 자동 갱신 — 비공개 구글 시트 2개(주소록 원본 + 설문 응답)를 구글 서비스 계정으로
// 읽어 병합한 뒤 members.enc(AES-256-GCM)로 암호화해 저장한다. 외부 npm 의존성 없음
// (node:crypto / 내장 fetch만 사용).
//
// 사용법(운영, GitHub Actions):
//   GSA_CLIENT_EMAIL=... GSA_PRIVATE_KEY=... MEMBERS_CODE=... \
//   MEMBERS_SHEET_ID=... RESPONSES_SHEET_ID=... \
//   node scripts/build-members-enc.mjs
//
// 사용법(테스트, 실제 구글 API 없이):
//   TEST_FIXTURE_DIR=<픽스처 디렉터리> MEMBERS_CODE=... OUT=<출력경로> \
//   node scripts/build-members-enc.mjs
//   (또는 node scripts/build-members-enc.mjs --test 와 함께 TEST_FIXTURE_DIR 지정)
//   픽스처 디렉터리에는 members.json / responses.json 이 있어야 하며, 각각
//   구글 Sheets API values.get 응답과 같은 모양 { "values": [[...], ...] } 이어야 한다.
//   (첫 행은 헤더로 취급된다.)
//
// 보안 수칙:
//   - 액세스 토큰은 획득 즉시 ::add-mask:: 로 마스킹해 로그에 남지 않게 한다.
//   - 회원 데이터·시트 내용은 어떤 형태로도 로그에 출력하지 않는다(개수만 출력).
//   - API 실패 시에도 응답 본문을 출력하지 않는다(상태 코드만).

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { toCsv, encrypt, decrypt } from "./encrypt-members.mjs";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

const DEFAULT_MEMBERS_RANGE = "주소록!A:H";
const DEFAULT_RESPONSES_RANGE = "설문지 응답 시트1!A:L";
const DEFAULT_OUT = "data/members.enc";

// ── 기수 정규화: "1"~"9" 한 자리 → "01"~"09" 두 자리 (encrypt-members.mjs와 동일 규칙) ──
function normalizeCohort(c) {
  const s = (c == null ? "" : String(c)).trim();
  return /^\d$/.test(s) ? s.padStart(2, "0") : s;
}

function memberKey(name, cohort) {
  return `${(name == null ? "" : String(name)).trim()}|${normalizeCohort(cohort)}`;
}

function parseTimestamp(ts) {
  const t = Date.parse(String(ts == null ? "" : ts));
  return Number.isNaN(t) ? null : t;
}

function cell(row, idx) {
  const v = row[idx];
  return v == null ? "" : String(v);
}

// ── 병합 규칙(순수 함수) ──
// memberDataRows / responseDataRows 는 헤더를 제외한 데이터 행 배열(각 행은 문자열 배열).
// 반환값: 사이트 스키마(8열) 행 배열, 정렬 완료.
function mergeMembers(memberDataRows, responseDataRows) {
  // 8열로 정규화한 사본(원본 배열은 변경하지 않음)
  const members = memberDataRows.map((r) => {
    const row = [];
    for (let i = 0; i < 8; i++) row.push(cell(r, i));
    return row;
  });

  const memberIndexByKey = new Map();
  members.forEach((r, i) => {
    if (r[0]) memberIndexByKey.set(memberKey(r[0], r[1]), i);
  });

  // 1) 동의 시작 행만 유효
  const validResponses = responseDataRows
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => cell(r, 7).trim().startsWith("동의"));

  // 타임스탬프 오름차순(파싱 불가 시 원래 순서를 보존하는 안정 정렬로 대체)
  validResponses.sort((a, b) => {
    const ta = parseTimestamp(a.r[0]);
    const tb = parseTimestamp(b.r[0]);
    if (ta !== null && tb !== null && ta !== tb) return ta - tb;
    if (ta !== null && tb === null) return -1;
    if (ta === null && tb !== null) return 1;
    return a.i - b.i;
  });

  // 같은 사람(이름+기수)의 마지막 유효 응답이 최종
  const finalByKey = new Map();
  for (const { r } of validResponses) {
    const name = cell(r, 2);
    if (!name.trim()) continue;
    finalByKey.set(memberKey(name, cell(r, 1)), r);
  }

  const excludedKeys = new Set();
  const newRows = [];

  for (const [key, r] of finalByKey) {
    const visibility = cell(r, 6);
    if (visibility.includes("비공개")) {
      // 4) 비공개 응답자는 원본에 있어도 최종 출력에서 제외
      excludedKeys.add(key);
      continue;
    }

    const name = cell(r, 2).trim();
    const cohort = normalizeCohort(cell(r, 1));
    const phone = cell(r, 3).trim();
    const email = cell(r, 4).trim();
    const org = cell(r, 10).trim();
    const quote = cell(r, 5).trim();

    if (memberIndexByKey.has(key)) {
      // 3) 원본에 있는 사람 — 갱신(빈 값이면 기존 값 유지)
      const row = members[memberIndexByKey.get(key)];
      row[3] = email || row[3];
      row[4] = phone || row[4];
      row[2] = org || row[2];
      row[6] = quote || row[6];
    } else {
      // 3) 원본에 없는 사람 — 8열 새 행 추가(회장="")
      newRows.push([name, cohort, org, email, phone, "", quote, ""]);
    }
  }

  let finalRows = members.filter((r) => !excludedKeys.has(memberKey(r[0], r[1])));
  finalRows = finalRows.concat(newRows);

  // 5) 기수 오름차순(연대순, 숫자 우선) → 같은 기수 내 이름 가나다순
  // 두 자리 기수를 실제 연도로 환산해 비교: 80~99 → 19xx, 00~79 → 20xx.
  // (동아리 창립이 1986년이므로 80 이상의 두 자리 기수만 1900년대일 수 있음 — 80이 경계)
  const chronoYear = (n) => (n >= 80 ? 1900 + n : 2000 + n);
  finalRows.sort((a, b) => {
    const ca = normalizeCohort(a[1]);
    const cb = normalizeCohort(b[1]);
    const na = /^\d+$/.test(ca) ? chronoYear(parseInt(ca, 10)) : null;
    const nb = /^\d+$/.test(cb) ? chronoYear(parseInt(cb, 10)) : null;
    if (na !== null && nb !== null && na !== nb) return na - nb;
    if (na !== null && nb === null) return -1;
    if (na === null && nb !== null) return 1;
    if (ca !== cb) return ca < cb ? -1 : 1;
    return (a[0] || "").localeCompare(b[0] || "", "ko");
  });

  return finalRows;
}

// ── GSA_PRIVATE_KEY 정규화: GitHub Secrets에서 실개행/리터럴 \n 둘 다 처리 ──
function normalizePrivateKey(key) {
  if (!key) return key;
  if (key.includes("\\n") && !key.includes("\n")) return key.replace(/\\n/g, "\n");
  return key;
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

// ── JWT(RS256) 서명: node:crypto만 사용 ──
function signJwt(clientEmail, privateKeyPem, scope) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: clientEmail,
    scope,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(privateKeyPem).toString("base64url");
  return `${signingInput}.${signature}`;
}

// ── JWT-bearer 그랜트로 액세스 토큰 교환 ──
async function getAccessToken(clientEmail, privateKeyPem) {
  const assertion = signJwt(clientEmail, privateKeyPem, SHEETS_SCOPE);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    // 실패 시에도 응답 본문은 출력하지 않는다 — 상태 코드만.
    throw new Error(`토큰 교환 실패: status=${res.status}`);
  }
  const json = await res.json();
  const token = json.access_token;
  if (token) {
    // 액세스 토큰은 받자마자 마스킹
    process.stdout.write(`::add-mask::${token}\n`);
  }
  if (!token) throw new Error("토큰 교환 응답에 access_token이 없습니다.");
  return token;
}

// ── Sheets API values.get ──
async function fetchSheetValuesFromApi(spreadsheetId, range, accessToken) {
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}` +
    `/values/${encodeURIComponent(range)}?majorDimension=ROWS`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    // 실패 시에도 응답 본문은 출력하지 않는다 — 상태 코드(+가능하면 에러 코드)만.
    let errCode = "";
    try {
      const j = await res.json();
      errCode = (j && j.error && j.error.status) || "";
    } catch { /* 본문 파싱 실패 — 무시 */ }
    throw new Error(`시트 조회 실패: status=${res.status}${errCode ? " code=" + errCode : ""}`);
  }
  const json = await res.json();
  return json.values || [];
}

// ── 시트 값 조회 (테스트 모드에서는 픽스처 JSON으로 대체) ──
async function getSheetValues(kind, opts) {
  if (opts.fixtureDir) {
    const file = path.join(opts.fixtureDir, kind === "members" ? "members.json" : "responses.json");
    if (!fs.existsSync(file)) return [];
    const json = JSON.parse(fs.readFileSync(file, "utf8"));
    return json.values || [];
  }
  return fetchSheetValuesFromApi(opts.spreadsheetId, opts.range, opts.accessToken);
}

function resolveFixtureDir() {
  const fromEnv = process.env.TEST_FIXTURE_DIR || "";
  const testFlag = process.argv.includes("--test");
  if (fromEnv) return fromEnv;
  if (testFlag) {
    throw new Error("--test 플래그 사용 시 TEST_FIXTURE_DIR 환경변수로 픽스처 디렉터리를 지정하세요.");
  }
  return "";
}

async function main() {
  const fixtureDir = resolveFixtureDir();
  const out = process.env.OUT || DEFAULT_OUT;
  const membersRange = process.env.MEMBERS_SHEET_RANGE || DEFAULT_MEMBERS_RANGE;
  const responsesRange = process.env.RESPONSES_SHEET_RANGE || DEFAULT_RESPONSES_RANGE;
  const membersSheetId = process.env.MEMBERS_SHEET_ID || "";
  const responsesSheetId = process.env.RESPONSES_SHEET_ID || "";
  const code = process.env.MEMBERS_CODE || "";

  if (!code) throw new Error("MEMBERS_CODE 환경변수가 필요합니다.");

  let accessToken = "";
  if (!fixtureDir) {
    if (!membersSheetId) throw new Error("MEMBERS_SHEET_ID 환경변수가 필요합니다.");
    const clientEmail = process.env.GSA_CLIENT_EMAIL || "";
    const privateKey = normalizePrivateKey(process.env.GSA_PRIVATE_KEY || "");
    if (!clientEmail || !privateKey) {
      throw new Error("GSA_CLIENT_EMAIL / GSA_PRIVATE_KEY 환경변수가 필요합니다.");
    }
    accessToken = await getAccessToken(clientEmail, privateKey);
  }

  const memberRows = await getSheetValues("members", {
    fixtureDir, spreadsheetId: membersSheetId, range: membersRange, accessToken,
  });

  let responseRows = [];
  const hasResponsesSource = fixtureDir || responsesSheetId;
  if (hasResponsesSource) {
    responseRows = await getSheetValues("responses", {
      fixtureDir, spreadsheetId: responsesSheetId, range: responsesRange, accessToken,
    });
  } else {
    process.stdout.write("경고: RESPONSES_SHEET_ID 미설정 — 응답 병합 없이 원본 주소록만으로 진행합니다.\n");
  }

  const header = memberRows[0] && memberRows[0].length
    ? memberRows[0]
    : ["이름", "기수", "소속", "이메일", "전화번호", "관심사", "한마디", "회장"];
  const memberDataRows = memberRows.slice(1).filter((r) => r.some((v) => v && String(v).trim()));
  const responseDataRows = responseRows.slice(1).filter((r) => r.some((v) => v && String(v).trim()));

  const merged = mergeMembers(memberDataRows, responseDataRows);
  const csv = toCsv([header, ...merged]);

  const outPath = path.resolve(out);
  let unchanged = false;
  if (fs.existsSync(outPath)) {
    try {
      const existingBlob = JSON.parse(fs.readFileSync(outPath, "utf8"));
      const existingPlain = decrypt(existingBlob, code);
      if (existingPlain === csv) unchanged = true;
    } catch {
      // 복호화 실패(코드 변경 등) — 변경된 것으로 간주하고 새로 암호화해 덮어씀
    }
  }

  if (unchanged) {
    process.stdout.write("no-change\n");
    return;
  }

  const blob = encrypt(csv, code);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(blob));
  process.stdout.write(`changed (회원 ${merged.length}명)\n`);
}

export { mergeMembers, normalizeCohort, memberKey };

const invokedDirectly = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (invokedDirectly) {
  main().catch((e) => { process.stderr.write("오류: " + e.message + "\n"); process.exit(1); });
}
