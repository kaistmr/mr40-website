// supabase/functions/myrecord/index_test.ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { codeMatches, pickRecord, type MemberRow, type ResponseRow } from "./index.ts";

function member(p: Partial<MemberRow>): MemberRow {
  return {
    name: "", cohort: "", org: "", email: "", phone: "",
    interests: "", quote: "", president: "", ...p,
  };
}
function response(p: Partial<ResponseRow>): ResponseRow {
  return {
    created_at: "", cohort: "", name: "", phone: "", email: "",
    note: "", visibility: "", consent: "동의합니다", education: "",
    major: "", current_org: "", career: "", role: "", ...p,
  };
}

Deno.test("codeMatches: 정확히 일치할 때만 true", () => {
  assertEquals(codeMatches("mr40", "mr40"), true);
  assertEquals(codeMatches("mr40 ", "mr40"), true);
  assertEquals(codeMatches("wrong", "mr40"), false);
  assertEquals(codeMatches("", "mr40"), false);
  assertEquals(codeMatches("mr40", ""), false);
});

Deno.test("pickRecord: 최신 응답이 base members보다 우선", () => {
  const members = [member({ name: "홍길동", cohort: "95", org: "옛회사", quote: "옛한마디" })];
  const responses = [
    response({ created_at: "2026-01-01T00:00:00Z", name: "홍길동", cohort: "95", current_org: "구응답", career: "구경력" }),
    response({ created_at: "2026-06-01T00:00:00Z", name: "홍길동", cohort: "95", current_org: "신응답", career: "신경력", education: "박사" }),
  ];
  const r = pickRecord("홍길동", "95", members, responses)!;
  assertEquals(r.current_org, "신응답");
  assertEquals(r.career, "신경력");
  assertEquals(r.education, "박사");
});

Deno.test("pickRecord: 응답 없으면 base members 폴백 매핑", () => {
  const members = [member({ name: "김철수", cohort: "08", org: "현대차", email: "a@b.c", phone: "010", quote: "안녕", president: "회장" })];
  const r = pickRecord("김철수", "08", members, [])!;
  assertEquals(r.current_org, "현대차");
  assertEquals(r.email, "a@b.c");
  assertEquals(r.note, "안녕");
  assertEquals(r.role, "회장");
  assertEquals(r.career, "");        // base엔 경력 없음
  assertEquals(r.visibility, "공개");
});

Deno.test("pickRecord: 둘 다 없으면 null", () => {
  assertEquals(pickRecord("없는사람", "99", [], []), null);
});

Deno.test("pickRecord: 동의하지 않은 응답은 무시하고 base로 폴백", () => {
  const members = [member({ name: "이영희", cohort: "10", org: "베이스소속" })];
  const responses = [
    response({ created_at: "2026-06-01T00:00:00Z", name: "이영희", cohort: "10", consent: "", current_org: "미동의응답" }),
  ];
  const r = pickRecord("이영희", "10", members, responses)!;
  assertEquals(r.current_org, "베이스소속");
});

Deno.test("pickRecord: 한 자리 기수 정규화(9 == 09)로 매칭", () => {
  const members = [member({ name: "박기수", cohort: "09", org: "일치" })];
  const r = pickRecord("박기수", "9", members, [])!;
  assertEquals(r.current_org, "일치");
  assertEquals(r.cohort, "09");
});
