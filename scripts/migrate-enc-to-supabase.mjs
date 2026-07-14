// scripts/migrate-enc-to-supabase.mjs
// 사용법: MEMBERS_CODE=... node scripts/migrate-enc-to-supabase.mjs
// data/members.enc 를 복호해 seed-members.sql(INSERT 문)을 생성한다. DB 직접접속 없음.
import fs from "node:fs";
import { decrypt, parseCsv } from "./encrypt-members.mjs";

const code = process.env.MEMBERS_CODE || "";
if (!code) { console.error("MEMBERS_CODE 필요"); process.exit(1); }

const blob = JSON.parse(fs.readFileSync("data/members.enc", "utf8"));
const csv = decrypt(blob, code);
const rows = parseCsv(csv);            // [header, ...data]
const data = rows.slice(1).filter((r) => r.some((v) => v && String(v).trim()));

const q = (s) => "'" + String(s == null ? "" : s).replace(/'/g, "''") + "'";
const cols = "name,cohort,org,email,phone,interests,quote,president";
const values = data.map((r) => {
  const c = [];
  for (let i = 0; i < 8; i++) c.push(q(r[i] == null ? "" : r[i]));
  return "(" + c.join(",") + ")";
}).join(",\n");

const sql = `-- 자동생성: members.enc → members 테이블 seed (${data.length}명)\n` +
  `truncate public.members;\ninsert into public.members (${cols}) values\n${values};\n`;
fs.writeFileSync("scripts/seed-members.sql", sql);
console.log(`seed-members.sql 생성: ${data.length}명`);
