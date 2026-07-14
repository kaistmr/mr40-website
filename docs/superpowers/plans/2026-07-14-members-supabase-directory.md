# 주소록 Supabase 이관 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 주소록을 정적 암호문(`members.enc`) 방식에서 Supabase(Postgres) 실시간 DB로 이관하고, 근황 수집을 사이트 자체 폼 → Supabase 직접 저장으로 바꾼다.

**Architecture:** 회원 데이터는 Supabase `members`/`responses` 두 테이블에 저장한다. `members`는 RLS로 anon 직접 조회를 완전 차단하고, Edge Function `directory`가 **공유 접속코드**를 검증한 뒤에만 병합된 명단(JSON)을 반환한다. 근황 폼은 `responses`에 insert만 가능(조회 불가)하며, 관리자는 Supabase 대시보드에서 `members`를 직접 편집한다. 기존 병합 규칙(동의자·최신·비공개제외·기수정렬)은 Deno/TS로 포팅해 Edge Function 안에서 실행한다.

**Tech Stack:** Supabase(Postgres + RLS + Edge Functions/Deno), 바닐라 JS 정적 프런트(GitHub Pages), Supabase CLI, Node(일회성 데이터 이관 스크립트).

## Global Constraints

- **쓰기 가능 영역은 `40th_website/` 내부만.** 그 외 폴더(원본 자료)는 읽기 전용 — 절대 수정 금지.
- **레포/배포:** `kaistmr/mr40-website`, `main` 브랜치 루트 → GitHub Pages. 라이브 <https://kaistmr.github.io/mr40-website/>. push는 `git push origin main`. 옛 이름 `MOSW626/mr40-website`로 archive/설정변경 절대 금지(리다이렉트 함정).
- **개인정보 불변식(설계 생명줄):** `members` 테이블(전화·이메일 포함)은 anon 키로 **절대 SELECT 불가**. 조회는 오직 `directory` Edge Function(service_role)이 접속코드 검증 후 수행. anon 키로 테이블이 열리면 그 자체가 개인정보 유출 사고.
- **접속코드:** 지금 동문에게 공지된 것과 **동일한 공유 코드 1개**. Supabase Edge Function 시크릿 `MEMBERS_CODE`로 보관(DB에 저장 금지). 비교는 상수시간.
- **사이트 스키마(8열, 인덱스 0-7):** `이름, 기수, 소속, 이메일, 전화번호, 관심사, 한마디, 회장`. 프런트 렌더가 이 순서의 배열을 기대하므로 `directory`는 이 8열 배열의 배열(JSON)을 반환한다.
- **기수 정규화:** 한 자리 숫자 기수 `"1"~"9"` → `"01"~"09"`. 정렬은 연대순(80~99→19xx, 00~79→20xx) 후 같은 기수 내 이름 가나다순.
- **CORS:** Edge Function은 `https://kaistmr.github.io` origin 허용 헤더를 반환해야 함(로컬 테스트용 `http://localhost:*` 포함).
- 원본 병합 규칙 SSOT: `scripts/build-members-enc.mjs`의 `mergeMembers()` (Task 2에서 그대로 포팅).
- 이 레포엔 테스트 러너가 없다. Edge Function 병합 로직만 `deno test`로 단위 검증하고, 인프라·UI는 명시적 기대결과가 있는 수동 검증으로 확인한다.

---

## File Structure

- `supabase/config.toml` — Supabase CLI 프로젝트 설정 (Create)
- `supabase/migrations/0001_members_schema.sql` — 테이블·RLS·인덱스 (Create)
- `supabase/functions/_shared/merge.ts` — 병합 규칙 TS 포팅 (Create)
- `supabase/functions/_shared/merge_test.ts` — 병합 Deno 단위테스트 (Create)
- `supabase/functions/_shared/cors.ts` — 공용 CORS 헬퍼 (Create)
- `supabase/functions/directory/index.ts` — 접속코드 검증 + 명단 반환 (Create)
- `supabase/functions/directory/index_test.ts` — 코드검증 단위테스트 (Create)
- `scripts/migrate-enc-to-supabase.mjs` — 기존 members.enc 복호 → seed SQL 생성 (Create)
- `members.html` — 복호화 경로를 `directory` 호출로 교체 (Modify: `~597-655`)
- `config.js` — `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `DIRECTORY_FN_URL` / `SUBMIT_FN_URL` 추가 (Modify: `~1-20`)
- `update.html` — 근황 입력 네이티브 폼(→ Supabase insert) 신규 페이지 (Create)
- `survey.html` — `id=contact` 구글폼 임베드를 `update.html`로 대체/링크 (Modify)
- `.github/workflows/update-members.yml` — 미사용 파이프라인 비활성/삭제 (Modify/Delete)
- `docs/members-supabase-guide.md` — 운영자 가이드(프로젝트 생성·시크릿·편집·백업) (Create)

---

## Task 0: Supabase 프로젝트 생성 및 자격증명 확보 (운영자 수행)

이 태스크는 사람이 Supabase 대시보드/CLI에서 수행한다. 코드 산출물 없음. 결과 자격증명은 이후 태스크의 입력이다.

**Interfaces:**
- Produces: `SUPABASE_URL`(예: `https://abcd.supabase.co`), `SUPABASE_ANON_KEY`(공개 가능), `SUPABASE_SERVICE_ROLE_KEY`(비밀), `SUPABASE_PROJECT_REF`(예: `abcd`), `SUPABASE_DB_PASSWORD`.

- [ ] **Step 1: Supabase 프로젝트 생성**

<https://supabase.com> 로그인(회장 계정) → New project → 이름 `mr40-directory`, 리전 `Northeast Asia (Seoul)` 선택, DB 비밀번호 설정(안전한 곳에 보관).

- [ ] **Step 2: 자격증명 수집**

Project Settings → API 에서 `Project URL`, `anon public` 키, `service_role` 키를 복사. Settings → General 에서 `Reference ID` 복사. 이 5개 값을 비밀 메모(비공개)로 보관.

- [ ] **Step 3: Supabase CLI 설치·로그인·링크**

로컬에서 실행(별도 터미널):

```bash
brew install supabase/tap/supabase
supabase login
cd 40th_website
supabase init          # supabase/ 디렉터리 생성 (이미 있으면 건너뜀)
supabase link --project-ref <SUPABASE_PROJECT_REF>
```

Expected: `Finished supabase link.` 출력, `supabase/config.toml` 생성됨.

- [ ] **Step 4: config.toml 커밋**

```bash
git add supabase/config.toml
git commit -m "chore(supabase): CLI 프로젝트 초기화·링크"
```

> 주의: `service_role` 키와 DB 비밀번호는 **레포에 커밋 금지**. Edge Function 시크릿(Task 3)과 로컬 `.env`로만 사용.

---

## Task 1: DB 스키마 · RLS · 인덱스

**Files:**
- Create: `supabase/migrations/0001_members_schema.sql`

**Interfaces:**
- Produces:
  - 테이블 `public.members(name text, cohort text, org text, email text, phone text, interests text, quote text, president text default '', id bigint pk, updated_at timestamptz)`.
  - 테이블 `public.responses(id bigint pk, created_at timestamptz default now(), cohort text, name text, phone text, email text, note text, visibility text, consent text, education text, major text, current_org text, career text)`.
  - RLS: `members` — anon/authenticated 모두 정책 없음(= 접근 전면 거부). `responses` — anon `INSERT`만 허용, `SELECT` 정책 없음(조회 거부).

- [ ] **Step 1: 마이그레이션 SQL 작성**

```sql
-- supabase/migrations/0001_members_schema.sql
-- 주소록(members): 8열 사이트 스키마. RLS로 anon 조회 전면 차단.
create table public.members (
  id         bigint generated always as identity primary key,
  name       text not null,
  cohort     text not null default '',
  org        text not null default '',
  email      text not null default '',
  phone      text not null default '',
  interests  text not null default '',
  quote      text not null default '',
  president  text not null default '',
  updated_at timestamptz not null default now()
);

-- 근황 응답(responses): 구글폼 A:L 스키마와 인덱스 정합. insert만 허용.
create table public.responses (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  cohort      text not null default '',
  name        text not null default '',
  phone       text not null default '',
  email       text not null default '',
  note        text not null default '',   -- 주소·근황 (병합 시 한마디)
  visibility  text not null default '',   -- 공개 범위 ("비공개" 포함 시 제외)
  consent     text not null default '',   -- 개인정보 동의 ("동의"로 시작해야 유효)
  education   text not null default '',
  major       text not null default '',
  current_org text not null default '',   -- 현재 소속·직위 (병합 시 소속)
  career      text not null default ''
);

alter table public.members   enable row level security;
alter table public.responses enable row level security;

-- members: 정책을 하나도 만들지 않음 => anon/authenticated 접근 전면 거부.
--          조회는 오직 service_role(Edge Function)만 가능(RLS 우회).

-- responses: anon INSERT만 허용. SELECT 정책 없음 => 조회 거부.
create policy "responses anon insert"
  on public.responses for insert
  to anon
  with check (true);

create index responses_created_at_idx on public.responses (created_at);
create index members_cohort_name_idx  on public.members (cohort, name);
```

- [ ] **Step 2: 마이그레이션 적용**

별도 터미널:

```bash
cd 40th_website
supabase db push
```

Expected: `Applying migration 0001_members_schema.sql...` 후 성공 메시지.

- [ ] **Step 3: RLS 차단 검증 (anon으로 members 조회 시 0행/거부)**

```bash
curl -s "$SUPABASE_URL/rest/v1/members?select=name" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

Expected: `[]` (빈 배열 — RLS로 어떤 행도 안 보임). 절대 회원 데이터가 나오면 안 됨.

- [ ] **Step 4: responses insert 허용 + 조회 거부 검증**

```bash
curl -s -X POST "$SUPABASE_URL/rest/v1/responses" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"테스트","cohort":"99","consent":"동의합니다"}'
curl -s "$SUPABASE_URL/rest/v1/responses?select=name" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

Expected: 첫 명령 성공(201, 빈 본문 또는 삽입행), 둘째 명령 `[]`(조회 거부). 검증 후 대시보드에서 테스트 행 삭제.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0001_members_schema.sql
git commit -m "feat(supabase): members/responses 스키마·RLS·인덱스"
```

---

## Task 2: 병합 규칙 TS 포팅 + Deno 단위테스트

`scripts/build-members-enc.mjs`의 `mergeMembers`/`normalizeCohort`/`memberKey`를 Deno/TS로 그대로 옮긴다. **행 인덱스 규약을 원본과 동일하게 유지**한다.

**Files:**
- Create: `supabase/functions/_shared/merge.ts`
- Test: `supabase/functions/_shared/merge_test.ts`

**Interfaces:**
- Produces:
  - `normalizeCohort(c: unknown): string`
  - `memberKey(name: unknown, cohort: unknown): string`
  - `mergeMembers(memberDataRows: string[][], responseDataRows: string[][]): string[][]` — 입력은 헤더 제외 데이터 행. members 행은 8열, responses 행은 12열(인덱스 0=timestamp … 5=note … 6=visibility … 7=consent … 10=current_org). 반환은 8열 사이트 스키마 배열, 정렬 완료.

- [ ] **Step 1: 실패 테스트 작성**

```ts
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
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd 40th_website && deno test supabase/functions/_shared/merge_test.ts
```

Expected: FAIL — `Module not found "./merge.ts"`.

- [ ] **Step 3: merge.ts 구현 (원본 로직 그대로 포팅)**

```ts
// supabase/functions/_shared/merge.ts
// scripts/build-members-enc.mjs 의 mergeMembers 를 그대로 포팅. 행 인덱스 규약 동일.
export function normalizeCohort(c: unknown): string {
  const s = (c == null ? "" : String(c)).trim();
  return /^\d$/.test(s) ? s.padStart(2, "0") : s;
}

export function memberKey(name: unknown, cohort: unknown): string {
  return `${(name == null ? "" : String(name)).trim()}|${normalizeCohort(cohort)}`;
}

function parseTimestamp(ts: unknown): number | null {
  const t = Date.parse(String(ts == null ? "" : ts));
  return Number.isNaN(t) ? null : t;
}

function cell(row: string[], idx: number): string {
  const v = row[idx];
  return v == null ? "" : String(v);
}

export function mergeMembers(
  memberDataRows: string[][],
  responseDataRows: string[][],
): string[][] {
  const members = memberDataRows.map((r) => {
    const row: string[] = [];
    for (let i = 0; i < 8; i++) row.push(cell(r, i));
    return row;
  });

  const memberIndexByKey = new Map<string, number>();
  members.forEach((r, i) => {
    if (r[0]) memberIndexByKey.set(memberKey(r[0], r[1]), i);
  });

  const validResponses = responseDataRows
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => cell(r, 7).trim().startsWith("동의"));

  validResponses.sort((a, b) => {
    const ta = parseTimestamp(a.r[0]);
    const tb = parseTimestamp(b.r[0]);
    if (ta !== null && tb !== null && ta !== tb) return ta - tb;
    if (ta !== null && tb === null) return -1;
    if (ta === null && tb !== null) return 1;
    return a.i - b.i;
  });

  const finalByKey = new Map<string, string[]>();
  for (const { r } of validResponses) {
    const name = cell(r, 2);
    if (!name.trim()) continue;
    finalByKey.set(memberKey(name, cell(r, 1)), r);
  }

  const excludedKeys = new Set<string>();
  const newRows: string[][] = [];

  for (const [key, r] of finalByKey) {
    const visibility = cell(r, 6);
    if (visibility.includes("비공개")) {
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
      const row = members[memberIndexByKey.get(key)!];
      row[3] = email || row[3];
      row[4] = phone || row[4];
      row[2] = org || row[2];
      row[6] = quote || row[6];
    } else {
      newRows.push([name, cohort, org, email, phone, "", quote, ""]);
    }
  }

  let finalRows = members.filter((r) => !excludedKeys.has(memberKey(r[0], r[1])));
  finalRows = finalRows.concat(newRows);

  const chronoYear = (n: number) => (n >= 80 ? 1900 + n : 2000 + n);
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
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd 40th_website && deno test supabase/functions/_shared/merge_test.ts
```

Expected: PASS (6 tests ok).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/merge.ts supabase/functions/_shared/merge_test.ts
git commit -m "feat(supabase): 병합 규칙 TS 포팅 + Deno 단위테스트"
```

---

## Task 3: `directory` Edge Function — 접속코드 검증 + 명단 반환

**Files:**
- Create: `supabase/functions/_shared/cors.ts`
- Create: `supabase/functions/directory/index.ts`
- Test: `supabase/functions/directory/index_test.ts`

**Interfaces:**
- Consumes: `mergeMembers`(Task 2), 시크릿 `MEMBERS_CODE`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Produces:
  - HTTP `POST /functions/v1/directory`, body `{ "code": string }`.
  - `codeMatches(input: string, expected: string): boolean` — 상수시간 비교(내보내 테스트).
  - 성공 200 → `{ "rows": string[][] }` (8열 배열의 배열, 헤더 없음).
  - 실패 401 → `{ "error": "invalid_code" }`. CORS preflight(OPTIONS) 204.

- [ ] **Step 1: 실패 테스트 작성 (코드 비교 로직)**

```ts
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
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd 40th_website && deno test supabase/functions/directory/index_test.ts
```

Expected: FAIL — `Module not found "./index.ts"`.

- [ ] **Step 3: cors.ts 작성**

```ts
// supabase/functions/_shared/cors.ts
const ALLOWED = [
  "https://kaistmr.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
];

export function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED.includes(origin) ? origin : ALLOWED[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
```

- [ ] **Step 4: directory/index.ts 구현**

```ts
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
  try {
    const body = await req.json();
    code = typeof body?.code === "string" ? body.code : "";
  } catch { /* 잘못된 JSON */ }

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
    .select("created_at,cohort,name,phone,email,note,visibility,consent,education,major,current_org,career");

  if (e1 || e2) {
    return new Response(JSON.stringify({ error: "db" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const memberRows = (mem ?? []).map((r) => [
    r.name, r.cohort, r.org, r.email, r.phone, r.interests, r.quote, r.president,
  ].map((v) => (v == null ? "" : String(v))));

  // 응답 행을 병합 함수가 기대하는 인덱스 순서(0=ts … 10=current_org)로 배열화
  const responseRows = (resp ?? []).map((r) => [
    r.created_at, r.cohort, r.name, r.phone, r.email, r.note,
    r.visibility, r.consent, r.education, r.major, r.current_org, r.career,
  ].map((v) => (v == null ? "" : String(v))));

  const rows = mergeMembers(memberRows, responseRows);

  return new Response(JSON.stringify({ rows }), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
});
```

- [ ] **Step 5: 코드 비교 테스트 통과 확인**

```bash
cd 40th_website && deno test supabase/functions/directory/index_test.ts
```

Expected: PASS. (`Deno.serve`는 import 시 리스닝하지 않으므로 테스트에 영향 없음.)

- [ ] **Step 6: 시크릿 등록 + 배포**

별도 터미널:

```bash
cd 40th_website
supabase secrets set MEMBERS_CODE='<현재 동문 공유 접속코드>'
supabase functions deploy directory
```

Expected: `Deployed Function directory`. (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 는 Supabase가 함수 런타임에 자동 주입.)

- [ ] **Step 7: 배포 함수 수동 검증 (틀린 코드 401, 맞는 코드 200)**

```bash
FN="$SUPABASE_URL/functions/v1/directory"
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$FN" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" -d '{"code":"__wrong__"}'
curl -s -X POST "$FN" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" -d '{"code":"<진짜코드>"}' | head -c 200
```

Expected: 첫 명령 `401`. 둘째 명령 `{"rows":[...]}` (아직 데이터 없으면 `{"rows":[]}`).

- [ ] **Step 8: Commit**

```bash
git add supabase/functions/_shared/cors.ts supabase/functions/directory/
git commit -m "feat(supabase): directory Edge Function(접속코드 검증→명단 반환)"
```

---

## Task 4: 기존 `members.enc` → Supabase 이관(일회성 seed)

현재 라이브 주소록(암호문)을 복호해 `members` 테이블에 적재한다.

**Files:**
- Create: `scripts/migrate-enc-to-supabase.mjs`

**Interfaces:**
- Consumes: `data/members.enc`, 접속코드(stdin/env `MEMBERS_CODE`), `scripts/encrypt-members.mjs`의 `decrypt`, `parseCsv`.
- Produces: `scripts/seed-members.sql` (INSERT 문) — 대시보드 SQL 에디터로 실행.

- [ ] **Step 1: 이관 스크립트 작성**

```js
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
```

- [ ] **Step 2: 실행해 seed SQL 생성 (별도 터미널 — 코드 입력)**

```bash
cd 40th_website
MEMBERS_CODE='<진짜코드>' node scripts/migrate-enc-to-supabase.mjs
head -3 scripts/seed-members.sql
```

Expected: `seed-members.sql 생성: N명` 출력, 파일 상단에 `truncate` + `insert ... values` 확인. (N은 현재 회원 수와 일치해야 함.)

- [ ] **Step 3: Supabase에 seed 적용**

Supabase 대시보드 → SQL Editor → `scripts/seed-members.sql` 내용 붙여넣기 → Run. Expected: `Success. N rows`.

- [ ] **Step 4: directory 함수로 이관 검증**

```bash
curl -s -X POST "$SUPABASE_URL/functions/v1/directory" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"code":"<진짜코드>"}' | node -e 'process.stdin.on("data",d=>console.log(JSON.parse(d).rows.length+"명"))'
```

Expected: seed한 회원 수와 동일한 "N명" 출력.

- [ ] **Step 5: Commit (seed-members.sql은 PII이므로 커밋 금지)**

```bash
printf '\nscripts/seed-members.sql\n' >> .gitignore
git add scripts/migrate-enc-to-supabase.mjs .gitignore
git commit -m "chore(members): enc→supabase 일회성 이관 스크립트(seed는 gitignore)"
```

---

## Task 5: 프런트 `config.js` + `members.html`를 directory 함수 호출로 교체

**Files:**
- Modify: `config.js` (상단 CONFIG 객체)
- Modify: `members.html` (`~597-655`, 복호화 → fetch 교체)

**Interfaces:**
- Consumes: `directory` 함수(Task 3), 반환 `{ rows: string[][] }`.
- Produces: 프런트가 접속코드를 함수에 POST해 명단을 받아 기존 렌더 파이프라인(`allRows` 배열의 배열)에 그대로 주입.

- [ ] **Step 1: config.js에 Supabase 값 추가**

`config.js` CONFIG 객체 안에 추가:

```js
  // Supabase (주소록 실시간 DB)
  SUPABASE_URL: "https://<PROJECT_REF>.supabase.co",
  SUPABASE_ANON_KEY: "<anon public key>",
  DIRECTORY_FN_URL: "https://<PROJECT_REF>.supabase.co/functions/v1/directory",
  SUBMIT_UPDATE_URL: "https://<PROJECT_REF>.supabase.co/rest/v1/responses",
```

> anon 키는 공개용이라 정적 파일에 넣어도 안전(RLS가 members를 잠금). service_role 키는 절대 넣지 말 것.

- [ ] **Step 2: members.html의 `unlock()` 교체**

기존 `deriveKey`/`b64ToBuf`/`ENC_PATH` 기반 복호 블록(약 597-650행)을 아래로 대체. 렌더·정규화 이후 로직은 그대로 둔다.

```js
    var FN_URL = CONFIG.DIRECTORY_FN_URL;
    var ANON = CONFIG.SUPABASE_ANON_KEY;

    async function checkCode() {
      var code = document.getElementById("code-input").value.trim();
      if (!code) { showToast("접속 코드를 입력하세요."); return; }
      await unlock(code, false);
    }

    async function unlock(code, silent) {
      var rows;
      try {
        var res = await fetch(FN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": ANON },
          body: JSON.stringify({ code: code }),
        });
        if (res.status === 401) {
          sessionStorage.removeItem("mr40_code");
          if (!silent) showToast("접속 코드가 올바르지 않습니다.");
          return;
        }
        if (!res.ok) throw new Error(res.status);
        var payload = await res.json();
        rows = (payload.rows || []).filter(function (r) { return r.length > 1 && r[0]; });
      } catch (e) {
        showToast("주소록 데이터를 불러오지 못했습니다.");
        return;
      }
      rows.forEach(function (r) {
        if (r[COL_COHORT]) r[COL_COHORT] = normCohort(r[COL_COHORT]);
      });
      allRows = rows;
      sessionStorage.setItem("mr40_code", code);
      localStorage.removeItem("mr40_members");
      revealDirectory();
      applyFilter(document.getElementById("search-input").value);
    }
```

- [ ] **Step 3: FAB(근황 업데이트) 링크를 update.html로**

`revealDirectory()` 안의 `formUrl` 산출을 `var formUrl = "update.html";` 로 변경(Task 6에서 페이지 생성).

- [ ] **Step 4: 브라우저 수동 검증**

```bash
cd 40th_website && python3 -m http.server 8000
```

브라우저 `http://localhost:8000/members.html` → 틀린 코드 입력 시 "접속 코드가 올바르지 않습니다" 토스트, 맞는 코드 입력 시 명단 카드가 이관한 회원 수만큼 표시·검색 동작. (콘솔 네트워크 탭에서 `members` REST 직접 호출이 없고 `directory` 함수만 호출되는지 확인.)

- [ ] **Step 5: Commit**

```bash
git add config.js members.html
git commit -m "feat(members): 주소록 열람을 Supabase directory 함수 호출로 교체"
```

---

## Task 6: 근황 입력 네이티브 폼 `update.html` (→ Supabase insert)

**Files:**
- Create: `update.html`
- Modify: `survey.html` (`id=contact` 구글폼 임베드를 `update.html` 링크로 대체)

**Interfaces:**
- Consumes: `CONFIG.SUBMIT_UPDATE_URL`, `CONFIG.SUPABASE_ANON_KEY`, responses 테이블 insert 정책(Task 1).
- Produces: 폼 제출 → `responses`에 1행 insert. 성공 시 완료 메시지. (조회는 불가 — insert-only.)

- [ ] **Step 1: update.html 작성 (핵심 스크립트)**

기존 사이트 헤더/스타일(`config.js`, `injectNav`)을 재사용하고, 폼 본문은 다음 필드를 담는다: 기수, 이름, 휴대폰, 이메일, 근황(note), 공개범위(visibility: 공개/비공개 라디오), 개인정보 동의(consent 체크 → "동의합니다"), 최종학력, 전공, 현재 소속·직위(current_org), 경력(career). 제출 스크립트:

```html
<script src="config.js"></script>
<script>
  async function submitUpdate(e) {
    e.preventDefault();
    var f = e.target;
    if (!f.consent.checked) { alert("개인정보 수집·이용에 동의해 주세요."); return; }
    var payload = {
      cohort: f.cohort.value.trim(),
      name: f.name.value.trim(),
      phone: f.phone.value.trim(),
      email: f.email.value.trim(),
      note: f.note.value.trim(),
      visibility: f.visibility.value,               // "공개" | "비공개"
      consent: "동의합니다",
      education: f.education.value.trim(),
      major: f.major.value.trim(),
      current_org: f.current_org.value.trim(),
      career: f.career.value.trim(),
    };
    var res = await fetch(CONFIG.SUBMIT_UPDATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": CONFIG.SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + CONFIG.SUPABASE_ANON_KEY,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify(payload),
    });
    var ok = document.getElementById("done");
    if (res.ok) { f.style.display = "none"; ok.style.display = "block"; }
    else { alert("제출에 실패했습니다. 잠시 후 다시 시도해 주세요."); }
  }
  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("update-form").addEventListener("submit", submitUpdate);
  });
</script>
```

폼 상단에 개인정보 수집·이용 목적/보관·파기(행사 후 파기) 고지문과 동의 체크박스를 반드시 둔다(PIPA).

- [ ] **Step 2: survey.html의 contact 설문을 update.html로 연결**

`survey.html`에서 `id=contact` 구글폼 임베드를 제거하고 "근황·연락처 업데이트 → `update.html`" 안내 링크로 대체. (동잠(jacket) 설문 등 다른 항목은 그대로 유지.)

- [ ] **Step 3: 브라우저 수동 검증 (제출 → DB 반영)**

로컬 서버에서 `http://localhost:8000/update.html` 폼 작성·제출 → "완료" 메시지 확인. Supabase 대시보드 → Table editor → `responses`에 방금 행이 있는지 확인.

- [ ] **Step 4: 실시간 반영 확인 (근황 → 주소록)**

제출한 근황의 이름/기수를 이미 있는 회원과 동일하게 넣고 `공개` 선택 → `members.html`을 새로고침해 잠금 해제 → 해당 회원 카드의 소속/한마디가 갱신됐는지 확인(병합 규칙 동작). "비공개"로 제출하면 카드에서 사라지는지도 확인.

- [ ] **Step 5: Commit**

```bash
git add update.html survey.html
git commit -m "feat(members): 근황 입력 네이티브 폼(update.html)→Supabase 직접 insert"
```

---

## Task 7: 옛 파이프라인 정리 + 운영자 가이드

**Files:**
- Delete: `.github/workflows/update-members.yml`
- Create: `docs/members-supabase-guide.md`
- Modify: `docs/members-pipeline-guide.md` (상단에 폐기 안내)

**Interfaces:**
- Consumes: 위 태스크들이 라이브 검증 완료됐다는 전제.

- [ ] **Step 1: 미사용 워크플로 삭제**

```bash
cd 40th_website && git rm .github/workflows/update-members.yml
```

(서비스 계정 시크릿/변수도 GitHub Settings에서 제거 — 수동. `build-members-enc.mjs`/`encrypt-members.mjs`는 비상 복구용으로 남겨두되 더 이상 스케줄 실행 안 함.)

- [ ] **Step 2: 옛 가이드에 폐기 배너 추가**

`docs/members-pipeline-guide.md` 최상단에 한 줄: `> ⚠️ 폐기(2026-07-14): 주소록은 Supabase로 이관됨. docs/members-supabase-guide.md 를 따르세요.`

- [ ] **Step 3: 새 운영자 가이드 작성**

`docs/members-supabase-guide.md`에 다음을 담는다: (a) 회원 추가·수정은 Supabase 대시보드 Table editor에서, (b) 접속코드 변경 시 `supabase secrets set MEMBERS_CODE=...` 재설정 + 동문 공지, (c) `responses`에 쌓인 근황을 검토해 `members`에 반영/정리하는 운영 흐름, (d) 정기 백업(대시보드 → Database → Backups, 또는 `supabase db dump`), (e) service_role 키·DB 비밀번호 취급 주의.

- [ ] **Step 4: Commit**

```bash
git add -A docs/ .github/
git commit -m "docs(members): Supabase 운영 가이드 추가·옛 파이프라인 폐기"
```

- [ ] **Step 5: 배포 및 라이브 최종 확인**

```bash
git push origin main
```

Pages 재빌드 후 <https://kaistmr.github.io/mr40-website/members.html>에서 실코드로 열람, `update.html`에서 실제 제출 1건 → 대시보드 반영까지 end-to-end 확인.

---

## Self-Review 결과

- **Spec 커버리지:** DB 이관(T1) · 병합규칙 보존(T2) · 접속코드 열람 유지(T3) · 기존 데이터 이관(T4) · 프런트 교체(T5) · 근황 네이티브 수집(T6, Apps Script 불필요) · 옛 파이프라인 정리(T7) 모두 태스크 존재. 개인정보 불변식은 T1(RLS)·T3(service_role 게이트)·T5(anon 키 안전성)에서 강제.
- **열린 결정(실행 전 확인 권장):** ① 근황 폼을 anon 직접 insert로 둘지(스팸 시 Turnstile/Edge Function 추가 여지), ② `members.enc` 파일 자체를 언제 삭제할지(T7 이후 안정화되면 제거), ③ 관리자 편집을 대시보드로 할지 별도 관리 UI를 만들지(현재 계획은 대시보드).
- **타입 일관성:** `mergeMembers(string[][], string[][]) → string[][]`, `codeMatches(string,string)→boolean`, directory 반환 `{rows:string[][]}` — T2/T3/T5에서 동일 사용 확인.
