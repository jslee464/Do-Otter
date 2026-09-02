-- ============================================================
--  Do-Otter · PortOne(아임포트) 결제 — 구독/이용권 상태
--  Supabase 대시보드 > SQL Editor 에 붙여넣고 RUN 하세요. (재실행 안전)
-- ============================================================
alter table public.profiles add column if not exists pro_until      timestamptz;  -- Pro 수달 이용권 만료
alter table public.profiles add column if not exists chatpro_until  timestamptz;  -- 수달 Chat Pro 이용권 만료
-- 클라이언트는 자기 profiles 의 pro_until/chatpro_until 을 읽어 상태 표시.
-- 값 갱신은 서버(/api/portone/verify, service_role)만 수행.
