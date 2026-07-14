// supabase/functions/directory/index_test.ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { codeMatches } from "./index.ts";

Deno.test("정확히 일치할 때만 true", () => {
  assertEquals(codeMatches("mr40", "mr40"), true);
  assertEquals(codeMatches("mr40 ", "mr40"), true);   // 입력 trim
  assertEquals(codeMatches("wrong", "mr40"), false);
  assertEquals(codeMatches("", "mr40"), false);
  assertEquals(codeMatches("mr40", ""), false);       // 서버 시크릿 미설정 시 항상 실패
});
