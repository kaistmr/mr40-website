-- supabase/migrations/0002_responses_role.sql
-- 근황 폼에서 동아리 임원 직책(회장·부회장·총무·기타 임원)을 자기보고로 수집.
-- 병합 시 members.president(8열 스키마 index 7)로 매핑되어 카드에 뱃지로 표시.
alter table public.responses add column role text not null default '';
