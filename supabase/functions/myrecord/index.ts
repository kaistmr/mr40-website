// supabase/functions/myrecord/index.ts
// 본인 기록 불러오기: 접속 코드 + 기수 + 이름으로 한 사람의 전체 편집 필드를 반환.
// 프리필 후 편집→재제출(responses insert)해도 안 건드린 값이 보존되도록 최신 응답 전체를 돌려준다.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// 상수시간 비교(directory 함수와 동일 규약). expected 비어있으면 항상 false.
export function codeMatches(input: string, expected: string): boolean {
  const a = (input ?? "").trim();
  const b = expected ?? "";
  if (!b) return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < b.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function normCohort(c: unknown): string {
  const s = (c == null ? "" : String(c)).trim();
  return /^\d$/.test(s) ? s.padStart(2, "0") : s;
}
function key(name: unknown, cohort: unknown): string {
  return `${(name == null ? "" : String(name)).trim()}|${normCohort(cohort)}`;
}
function str(v: unknown): string {
  return v == null ? "" : String(v);
}
function ts(v: unknown): number | null {
  const t = Date.parse(str(v));
  return Number.isNaN(t) ? null : t;
}

export interface FormRecord {
  cohort: string;
  name: string;
  phone: string;
  email: string;
  note: string;
  visibility: string;
  education: string;
  major: string;
  current_org: string;
  career: string;
  role: string;
}

export interface MemberRow {
  name: string; cohort: string; org: string; email: string;
  phone: string; interests: string; quote: string; president: string;
}
export interface ResponseRow {
  created_at: string; cohort: string; name: string; phone: string; email: string;
  note: string; visibility: string; consent: string; education: string;
  major: string; current_org: string; career: string; role: string;
}

// 순수 함수: 주어진 이름·기수에 대해 폼 프리필용 레코드를 고른다.
// 1) 동의한 응답 중 최신 것 → 그대로 매핑, 2) 없으면 base members 매핑, 3) 둘 다 없으면 null.
export function pickRecord(
  name: string,
  cohort: string,
  members: MemberRow[],
  responses: ResponseRow[],
): FormRecord | null {
  const k = key(name, cohort);

  const mine = responses
    .filter((r) => str(r.consent).trim().startsWith("동의"))
    .filter((r) => key(r.name, r.cohort) === k);

  if (mine.length > 0) {
    // 최신 응답 선택: created_at 오름차순 정렬 후 마지막(= directory 병합과 동일한 "최신 우선").
    mine.sort((a, b) => {
      const ta = ts(a.created_at), tb = ts(b.created_at);
      if (ta !== null && tb !== null && ta !== tb) return ta - tb;
      if (ta !== null && tb === null) return -1;
      if (ta === null && tb !== null) return 1;
      return 0;
    });
    const r = mine[mine.length - 1];
    return {
      cohort: normCohort(r.cohort),
      name: str(r.name).trim(),
      phone: str(r.phone).trim(),
      email: str(r.email).trim(),
      note: str(r.note).trim(),
      visibility: str(r.visibility).trim() || "공개",
      education: str(r.education).trim(),
      major: str(r.major).trim(),
      current_org: str(r.current_org).trim(),
      career: str(r.career).trim(),
      role: str(r.role).trim(),
    };
  }

  const m = members.find((row) => key(row.name, row.cohort) === k);
  if (m) {
    return {
      cohort: normCohort(m.cohort),
      name: str(m.name).trim(),
      phone: str(m.phone).trim(),
      email: str(m.email).trim(),
      note: str(m.quote).trim(),
      visibility: "공개",
      education: "",
      major: "",
      current_org: str(m.org).trim(),
      career: "",
      role: str(m.president).trim(),
    };
  }

  return null;
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method" }), {
      status: 405, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let code = "", name = "", cohort = "";
  try {
    const body = await req.json();
    code = typeof body?.code === "string" ? body.code : "";
    name = typeof body?.name === "string" ? body.name : "";
    cohort = typeof body?.cohort === "string" ? body.cohort : "";
  } catch { /* 잘못된 JSON */ }

  if (!codeMatches(code, Deno.env.get("MEMBERS_CODE") ?? "")) {
    return new Response(JSON.stringify({ error: "invalid_code" }), {
      status: 401, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (!name.trim() || !cohort.trim()) {
    return new Response(JSON.stringify({ error: "missing_fields" }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: mem, error: e1 } = await supabase
    .from("members")
    .select("name,cohort,org,email,phone,interests,quote,president");
  const { data: resp, error: e2 } = await supabase
    .from("responses")
    .select("created_at,cohort,name,phone,email,note,visibility,consent,education,major,current_org,career,role");

  if (e1 || e2) {
    return new Response(JSON.stringify({ error: "db" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const record = pickRecord(
    name, cohort,
    (mem ?? []) as MemberRow[],
    (resp ?? []) as ResponseRow[],
  );

  return new Response(
    JSON.stringify(record ? { found: true, record } : { found: false }),
    { status: 200, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } },
  );
});
