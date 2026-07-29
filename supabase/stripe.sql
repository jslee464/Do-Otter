-- ============================================================
--  Do-Otter · Stripe 구독용 스키마
--  Supabase 대시보드 > SQL Editor 에 붙여넣고 RUN 하세요. (재실행 안전)
-- ============================================================

-- 구독 상태 컬럼 (webhook 이 service_role 로 갱신)
alter table public.profiles add column if not exists stripe_customer_id text;
alter table public.profiles add column if not exists pro_until      timestamptz;  -- Pro 수달 구독 만료
alter table public.profiles add column if not exists chatpro_until  timestamptz;  -- 수달 Chat Pro 구독 만료

-- (참고) 클라이언트는 자기 profiles 행의 pro_until/chatpro_until 을 읽어
--        구독 상태를 표시합니다. 실제 값 갱신은 서버 webhook(service_role)만 수행.
