-- ============================================================
--  Do-Otter · PortOne(아임포트) 결제 — 구독/이용권 상태
--  Supabase 대시보드 > SQL Editor 에 붙여넣고 RUN 하세요. (재실행 안전)
-- ============================================================
alter table public.profiles add column if not exists pro_until      timestamptz;  -- Pro 수달 이용권 만료
alter table public.profiles add column if not exists chatpro_until  timestamptz;  -- legacy: 기존 Chat Pro 구매 호환용
-- 클라이언트는 자기 profiles 의 pro_until/chatpro_until 중 하나라도 유효하면 Pro 수달로 표시.
-- 값 갱신은 서버(/api/portone/verify, service_role)만 수행.
