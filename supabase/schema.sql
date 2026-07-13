-- ============================================================
--  Do-Otter · Supabase schema  (v2 — Phase 2 블루프린트 반영)
--  Supabase 대시보드 > SQL Editor 에 그대로 붙여넣고 RUN 하세요.
--  기존 v1을 실행했었다면 이 파일이 컬럼을 추가/보정합니다.
-- ============================================================

-- 1) profiles : 아이디
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  level       int  not null default 1,
  shells      int  not null default 0,
  created_at  timestamptz not null default now()
);

-- 2) user_stats : 전역 통계 (개발_데이터모델 UserStats 확장)
create table if not exists public.user_stats (
  user_id                     uuid primary key references auth.users(id) on delete cascade,
  total_exp                   bigint not null default 0,   -- 누적 EXP
  shells                      int    not null default 0,   -- 보유 조개
  shells_earned_total         int    not null default 0,   -- 누적 획득 조개
  total_timer_seconds         bigint not null default 0,   -- 총 타이머 시간
  effective_seconds           bigint not null default 0,   -- 순공시간
  harmful_seconds             bigint not null default 0,   -- 유해앱 사용시간
  stop_seconds                bigint not null default 0,   -- 타이머 스톱(일시정지) 시간
  session_count               int    not null default 0,
  harmful_free_sessions       int    not null default 0,
  angry_count                 int    not null default 0,
  streak                      int    not null default 0,
  last_study_date             date,
  daily_goal_min              int    not null default 60,
  today_effective_sec         int    not null default 0,
  today_harmful_sec           int    not null default 0,
  today_date                  date,
  daily_goal_claimed          boolean not null default false,
  ad_watched_today            int    not null default 0,
  ad_date                     date,
  owned_items                 text[] not null default '{}',   -- 수달 커스텀: 보유 아이템
  equipped_items              text[] not null default '{}',   -- 수달 커스텀: 착용 아이템
  updated_at                  timestamptz not null default now()
);
-- v1 → v2 컬럼 보정 (이미 만든 테이블이 있을 때)
alter table public.user_stats add column if not exists total_exp bigint not null default 0;
alter table public.user_stats add column if not exists shells int not null default 0;
alter table public.user_stats add column if not exists shells_earned_total int not null default 0;
alter table public.user_stats add column if not exists total_timer_seconds bigint not null default 0;
alter table public.user_stats add column if not exists effective_seconds bigint not null default 0;
alter table public.user_stats add column if not exists harmful_seconds bigint not null default 0;
alter table public.user_stats add column if not exists stop_seconds bigint not null default 0;
alter table public.user_stats add column if not exists session_count int not null default 0;
alter table public.user_stats add column if not exists harmful_free_sessions int not null default 0;
alter table public.user_stats add column if not exists streak int not null default 0;
alter table public.user_stats add column if not exists last_study_date date;
alter table public.user_stats add column if not exists daily_goal_min int not null default 60;
alter table public.user_stats add column if not exists today_effective_sec int not null default 0;
alter table public.user_stats add column if not exists today_harmful_sec int not null default 0;
alter table public.user_stats add column if not exists today_date date;
alter table public.user_stats add column if not exists daily_goal_claimed boolean not null default false;
alter table public.user_stats add column if not exists ad_watched_today int not null default 0;
alter table public.user_stats add column if not exists ad_date date;
alter table public.user_stats add column if not exists owned_items text[] not null default '{}';
alter table public.user_stats add column if not exists equipped_items text[] not null default '{}';

-- 3) study_logs : 세션 기록 (StudySession)
create table if not exists public.study_logs (
  id             bigint generated always as identity primary key,
  user_id        uuid references auth.users(id) on delete cascade,
  total_sec      int    not null default 0,
  harmful_sec    int    not null default 0,
  effective_sec  int    not null default 0,
  quality_ratio  double precision not null default 0,
  exp_earned     int    not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists study_logs_user_idx on public.study_logs(user_id, created_at desc);

-- 4) schedules : 일정 (ScheduleEvent)
create table if not exists public.schedules (
  id          text primary key default gen_random_uuid()::text,
  user_id     uuid references auth.users(id) on delete cascade,
  title       text not null,
  event_date  date not null,
  source      text not null default 'manual',
  created_at  timestamptz not null default now()
);
create index if not exists schedules_user_idx on public.schedules(user_id, event_date);

-- 5) achievements : 달성 업적 (Achievement)
create table if not exists public.achievements (
  user_id     uuid references auth.users(id) on delete cascade,
  ach_id      text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, ach_id)
);

-- 6) blocked_apps / consents (온보딩)
create table if not exists public.blocked_apps (
  user_id     uuid references auth.users(id) on delete cascade,
  app_key     text not null,
  app_name    text not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, app_key)
);
create table if not exists public.consents (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  terms         boolean not null default false,
  privacy       boolean not null default false,
  notifications boolean not null default false,
  calendar      boolean not null default false,
  agreed_at     timestamptz not null default now()
);

-- ============================================================
--  Row Level Security
-- ============================================================
alter table public.profiles     enable row level security;
alter table public.user_stats   enable row level security;
alter table public.study_logs   enable row level security;
alter table public.schedules    enable row level security;
alter table public.achievements enable row level security;
alter table public.blocked_apps enable row level security;
alter table public.consents     enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "own stats" on public.user_stats;
create policy "own stats" on public.user_stats for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own logs" on public.study_logs;
create policy "own logs" on public.study_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own schedules" on public.schedules;
create policy "own schedules" on public.schedules for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own achievements" on public.achievements;
create policy "own achievements" on public.achievements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own blocked apps" on public.blocked_apps;
create policy "own blocked apps" on public.blocked_apps for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own consents" on public.consents;
create policy "own consents" on public.consents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
--  회원가입 시 profiles / user_stats 자동 생성 트리거
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  insert into public.user_stats (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
