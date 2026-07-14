// supabase/functions/_shared/merge_test.ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mergeMembers, normalizeCohort } from "./merge.ts";

Deno.test("normalizeCohort: 한 자리 → 두 자리", () => {
  assertEquals(normalizeCohort("3"), "03");
  assertEquals(normalizeCohort("21"), "21");
  assertEquals(normalizeCohort(" 9 "), "09");
});

Deno.test("동의 응답이 원본 회원의 빈 값을 갱신, 비운 값은 유지", () => {
  const members = [["홍길동", "90", "옛회사", "", "", "", "옛한마디", ""]];
  // resp 인덱스: 0=ts,1=기수,2=이름,3=폰,4=메일,5=근황,6=공개,7=동의,10=현소속
  const resp = [["2026-01-02", "90", "홍길동", "010-1", "a@b.c", "새한마디", "", "동의합니다", "", "", "새회사", ""]];
  const out = mergeMembers(members, resp);
  assertEquals(out.length, 1);
  assertEquals(out[0], ["홍길동", "90", "새회사", "a@b.c", "010-1", "", "새한마디", ""]);
});

Deno.test("비공개 응답자는 원본에 있어도 제외", () => {
  const members = [["김비밀", "88", "회사", "x@y.z", "010-9", "", "", ""]];
  const resp = [["2026-01-01", "88", "김비밀", "", "", "", "비공개", "동의", "", "", "", ""]];
  assertEquals(mergeMembers(members, resp).length, 0);
});

Deno.test("동의 안 한 응답은 무시", () => {
  const resp = [["2026-01-01", "95", "무동의", "", "", "", "", "", "", "", "", ""]];
  assertEquals(mergeMembers([], resp).length, 0);
});

Deno.test("같은 사람 최신 응답이 최종", () => {
  const resp = [
    ["2026-01-01", "00", "이중복", "", "", "옛", "", "동의", "", "", "", ""],
    ["2026-02-01", "00", "이중복", "", "", "신", "", "동의", "", "", "", ""],
  ];
  const out = mergeMembers([], resp);
  assertEquals(out.length, 1);
  assertEquals(out[0][6], "신");
});

Deno.test("정렬: 연대순(80s→00s) 후 이름 가나다순", () => {
  const members = [
    ["나중", "05", "", "", "", "", "", ""],
    ["가장", "05", "", "", "", "", "", ""],
    ["선배", "88", "", "", "", "", "", ""],
  ];
  const out = mergeMembers(members, []);
  assertEquals(out.map((r) => [r[0], r[1]]), [["선배", "88"], ["가장", "05"], ["나중", "05"]]);
});
