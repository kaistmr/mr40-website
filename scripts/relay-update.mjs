#!/usr/bin/env node
// 문자·전화로 받은 연락처/근황 수정을 회원 대신 반영한다.
// update.html 이 하는 일과 똑같이 responses 에 한 줄 추가할 뿐이다(members 직접 수정 아님).
// 병합 규칙상 "가장 최신 응답 1건"만 반영되므로, 기존 기록(myrecord)을 먼저 불러와
// 바꿀 필드만 덮어쓴 뒤 통째로 다시 제출한다 — 안 건드린 값이 사라지지 않게.
//
// 사용:
//   node scripts/relay-update.mjs --name 홍길동 --cohort 86 --phone 010-1234-5678
//   (미리보기만. 실제 반영은 끝에 --yes 추가)
//
// 접속 코드: --code, 환경변수 MR_CODE, 또는 .mr-code 파일(깃 제외) 중 하나.

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const { values: a } = parseArgs({ options: {
  name: { type: "string" }, cohort: { type: "string" }, code: { type: "string" },
  phone: { type: "string" }, email: { type: "string" }, org: { type: "string" },
  note: { type: "string" }, role: { type: "string" }, visibility: { type: "string" },
  education: { type: "string" }, major: { type: "string" }, career: { type: "string" },
  yes: { type: "boolean" },
}});

function die(msg) { console.error("✗ " + msg); process.exit(1); }

if (!a.name || !a.cohort) die("--name 과 --cohort 는 필수입니다.");

const CONFIG = (() => {
  const src = readFileSync(join(ROOT, "config.js"), "utf8");
  return new Function(src + "; return CONFIG;")();
})();

const code = (a.code || process.env.MR_CODE || (() => {
  try { return readFileSync(join(ROOT, ".mr-code"), "utf8"); } catch { return ""; }
})()).trim();
if (!code) die("접속 코드가 없습니다. --code, MR_CODE 환경변수, 또는 .mr-code 파일 중 하나로 주세요.");

// 1) 현재 기록 불러오기 (안 바꾸는 값 보존용)
const res = await fetch(CONFIG.MYRECORD_FN_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    apikey: CONFIG.SUPABASE_ANON_KEY,
    Authorization: "Bearer " + CONFIG.SUPABASE_ANON_KEY,   // myrecord 는 JWT 검증이 켜져 있음
  },
  body: JSON.stringify({ code, name: a.name, cohort: a.cohort }),
});
if (res.status === 401) die("접속 코드가 올바르지 않습니다.");
if (!res.ok) die("기존 기록 조회 실패 (HTTP " + res.status + ")");
const { found, record } = await res.json();
if (!found) die(`주소록에 "${a.cohort}학번 ${a.name}" 기록이 없습니다. 이름·기수를 확인하세요.`);

// 2) 넘겨준 필드만 덮어쓰기
const FIELDS = ["phone", "email", "note", "role", "visibility", "education", "major", "career"];
const next = { ...record };
for (const f of FIELDS) if (a[f] !== undefined) next[f] = a[f].trim();
if (a.org !== undefined) next.current_org = a.org.trim();   // 폼의 "현재 소속" = 카드의 소속

const changed = Object.keys(next).filter((k) => next[k] !== record[k]);
if (changed.length === 0) die("바뀌는 값이 없습니다. (--phone / --email / --org / --note / --role …)");

console.log(`\n${record.cohort}학번 ${record.name}`);
for (const k of changed) console.log(`  ${k}: ${record[k] || "(비어있음)"}  →  ${next[k] || "(비움)"}`);

if (!a.yes) { console.log("\n미리보기입니다. 실제 반영하려면 --yes 를 붙여 다시 실행하세요.\n"); process.exit(0); }

// 3) update.html 과 동일한 경로로 제출 (consent 에 대리 입력 사실을 남긴다)
const today = new Date().toISOString().slice(0, 10);
const payload = {
  cohort: next.cohort, name: next.name, phone: next.phone, email: next.email,
  note: next.note, role: next.role, visibility: next.visibility || "공개",
  consent: `동의합니다 (본인 전달 → 운영진 대리 입력 ${today})`,
  education: next.education, major: next.major,
  current_org: next.current_org, career: next.career,
};
const post = await fetch(CONFIG.SUBMIT_UPDATE_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    apikey: CONFIG.SUPABASE_ANON_KEY,
    Authorization: "Bearer " + CONFIG.SUPABASE_ANON_KEY,
    Prefer: "return=minimal",
  },
  body: JSON.stringify(payload),
});
if (!post.ok) die("제출 실패 (HTTP " + post.status + "): " + await post.text());
console.log("\n✓ 반영됨. 주소록 새로고침하면 바로 보입니다.\n");
