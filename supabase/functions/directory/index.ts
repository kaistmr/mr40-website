// supabase/functions/directory/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { mergeMembers } from "../_shared/merge.ts";
import { corsHeaders } from "../_shared/cors.ts";

// 상수시간 비교(길이 노출 최소화). expected 비어있으면 항상 false.
export function codeMatches(input: string, expected: string): boolean {
  const a = (input ?? "").trim();
  const b = expected ?? "";
  if (!b) return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < b.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method" }), {
      status: 405, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let code = "";
  let ping = false;
  try {
    const body = await req.json();
    code = typeof body?.code === "string" ? body.code : "";
    ping = body?.ping === true;
  } catch { /* 잘못된 JSON */ }

  // keep-alive: 무료 플랜은 7일간 DB 활동이 없으면 프로젝트가 일시정지(주소록 먹통)된다.
  // .github/workflows/keepalive.yml 이 주기적으로 {ping:true}를 보내 DB를 한 번 읽는다. 데이터는 안 돌려준다.
  if (ping) {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await sb.from("members").select("name", { count: "exact", head: true });
    return new Response(JSON.stringify({ ok: !error }), {
      status: error ? 500 : 200, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (!codeMatches(code, Deno.env.get("MEMBERS_CODE") ?? "")) {
    return new Response(JSON.stringify({ error: "invalid_code" }), {
      status: 401, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // service_role 로 RLS 우회 조회
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

  const memberRows = (mem ?? []).map((r) => [
    r.name, r.cohort, r.org, r.email, r.phone, r.interests, r.quote, r.president,
  ].map((v) => (v == null ? "" : String(v))));

  // 응답 행을 병합 함수가 기대하는 인덱스 순서(0=ts … 10=current_org … 12=role)로 배열화
  const responseRows = (resp ?? []).map((r) => [
    r.created_at, r.cohort, r.name, r.phone, r.email, r.note,
    r.visibility, r.consent, r.education, r.major, r.current_org, r.career, r.role,
  ].map((v) => (v == null ? "" : String(v))));

  const rows = mergeMembers(memberRows, responseRows);

  return new Response(JSON.stringify({ rows }), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
});
