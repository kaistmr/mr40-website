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
