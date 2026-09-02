-- ============================================================
--  Do-Otter · Google Calendar 연동용 스키마
--  Supabase 대시보드 > SQL Editor 에 붙여넣고 RUN 하세요. (재실행 안전)
-- ============================================================

-- 구글 refresh_token 저장 (서버 service_role 만 접근)
create table if not exists public.gcal_tokens (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null,
  connected_at  timestamptz not null default now()
);

alter table public.gcal_tokens enable row level security;
-- 정책을 두지 않음 → 일반 클라이언트(anon/authenticated)는 접근 불가,
-- 오직 service_role 키(서버)만 읽고 쓸 수 있음 (토큰 보호).

-- schedules.source 컬럼 보장 ('manual' | 'googleCalendar')
alter table public.schedules add column if not exists source text not null default 'manual';
