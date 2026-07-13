# 🦦 Do-Otter — 수달이랑 공부하기 (웹앱 프로토타입 + Supabase)

방해앱을 차단하고 수달과 함께 집중하는 **공부 타이머 앱**의 Next.js 웹앱 프로토타입입니다.
Miro 서비스 블루프린트의 **온보딩 순서**와 `D_Otter` Figma 디자인을 그대로 따릅니다.

## 온보딩 플로우 (블루프린트 순서 그대로)

```
스플래시 → 로그인/회원가입(아이디·비밀번호) → 약관 동의
      → 방해 앱 선택 → 구글 캘린더 연동 → 튜토리얼(메인/통계/일정/설정 안내) → 첫 공부
```

- **회원가입**: 아이디 + 비밀번호를 입력하면 백엔드(Supabase Auth)로 저장됩니다.
- 온보딩에서 고른 **방해 앱 목록**과 **약관 동의**도 백엔드에 저장됩니다.

## Phase 2 블루프린트 (엑셀) 반영

`Do-otter_블루프린트_기록일정.xlsx`의 설계를 그대로 이식했습니다 (`lib/logic.ts`):

- **순공시간·품질·EXP**: 순공 = 총타이머 − 유해앱시간, 품질비율 = 순공/총, 기본EXP = 순공(분)×1, 품질 배율(95%↑ ×1.2 / 80%↑ ×1.0 / 50%↑ ×0.8 / 그 외 ×0.6)
- **레벨**: 필요 EXP = `round(60 × 1.15^(n-1))` (레벨테이블 시트와 동일, Lv.1~30)
- **조개**: 레벨업 시 레벨×10, 데일리목표 100% +15, 광고 +20(일 5회), 업적 보상 30~500
- **업적 24종**: 기록페이지 뱃지 트레이(달성=컬러/미달성=흑백), 탭 시 조건 모달, 세션 종료 시 자동 판정
- **D-day 티어 말풍선 20종**: 메인 수달 말풍선이 가장 임박한 일정의 티어(여유/주의/긴급/당일)에 맞춰 랜덤 노출
- **유해앱 알람 티어**: 세션 중 딴짓 → 마일드("조금만 봐~") → 강력("이제 그만 봐!") → 복귀 칭찬("잘~했어!!")
- **AI 코멘트**: v1 규칙 기반(if-else) 피드백

## 백엔드에 기록되는 것 (요청하신 로그)

| 항목 | 저장 위치 (`user_stats`) |
|------|-----------|
| 총 공부(타이머) 시간 | `total_timer_seconds` |
| 순공시간 | `effective_seconds` |
| 총 타이머 스톱(일시정지) 시간 | `stop_seconds` |
| 총 외부 앱 액세스 시간 | `harmful_seconds` |
| 조개껍데기 개수 | `shells` |
| 레벨(EXP) | `total_exp` (레벨은 EXP로 계산) |
| 스트릭·세션수·업적 등 | `streak` / `session_count` / `achievements` 테이블 |
| 세션별 로그 | `study_logs` (총/유해/순공/품질/EXP 1행씩) |
| 일정 | `schedules` 테이블 |

- 공부 세션을 **정지 버튼 길게 눌러 완료** → 순공·품질·EXP 계산, 레벨업/데일리목표/업적 조개 지급, 로그 append.
- 설정 > **방해앱 사용 시뮬레이션** → 외부앱 30분 기록 + 수달 화남(Oops).

---

## 실행 방법

```bash
npm install
npm run dev        # http://localhost:3000
```

> **Supabase 키가 없어도 실행됩니다.** 키가 없으면 자동으로 **데모 모드**(브라우저 localStorage)로 동작하고,
> 키를 넣으면 **실제 Supabase**에 연결됩니다. 화면 우측 상단 칩(`● 데모` / `● Supabase`)으로 현재 모드를 표시합니다.

## Supabase 연결 (3단계)

1. **DB 테이블 만들기** — Supabase 대시보드 > SQL Editor 에서 [`supabase/schema.sql`](supabase/schema.sql) 전체를 붙여넣고 **RUN**.
   (profiles / user_stats / study_logs / blocked_apps / consents 테이블 + RLS + 회원가입 트리거 생성)

2. **이메일 확인 끄기** — Authentication > Providers > Email 에서 **"Confirm email" 을 OFF**.
   (아이디는 `아이디@dootter.local` 형태의 가짜 이메일로 매핑되므로 확인 메일을 받을 수 없어요. 반드시 꺼야 즉시 로그인됩니다.)

3. **키 넣기** — `.env.local.example` 을 복사해 `.env.local` 로 저장하고 값 채우기:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://rjplvlodlkifqpisiyut.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<Project Settings > API 의 anon public key>
   ```
   그 후 `npm run dev` **재시작**.

---

## 화면 구성 (하단 탭 5개)

| 탭 | 내용 |
|----|------|
| 🦦 수달이 | **수달 커스텀** — 조개로 아이템(안경/목도리/헤드폰/학사모/왕관 등 9종) 구매·착용, 홈·미리보기 수달에 실시간 반영 |
| 📊 기록 | 오늘 요약 원형 링 · 업적 뱃지 트레이 · 누적 기록 · 월간 히트맵 · 주간 그래프 · AI 코멘트 |
| 🏠 홈 | 수달 아바타 · 레벨/EXP/조개 · **시간 선택 타이머** · D-day 말풍선 · 딴짓하기 |
| 📖 일정 | D-day hero 카드 · 일정 수동 추가 · 등록 일정(D-day 배지) |
| ⚙️ 설정 | 계정 · 방해앱/알림/캘린더/다크모드 · 알림 시점 · 타이머 모드 · 수달 커스텀 · 광고 조개 · Pro 결제 · 로그아웃 |

## 데모용 딥링크

```
/#ob-auth  /#ob-terms  /#ob-apps  /#ob-calendar  /#ob-tutorial   (온보딩 각 단계)
```

## 구조

```
app/
  page.tsx        컨트롤러 (온보딩 ↔ 메인 앱 전환)
  onboarding.tsx  스플래시·가입·약관·방해앱·캘린더·튜토리얼
  mainapp.tsx     홈/타이머·통계·일정·캐릭터·설정 + 로그 기록
  globals.css     디자인 토큰(크림/수달 브라운) + 전체 스타일
lib/
  supabase.ts     Supabase 클라이언트 (키 없으면 null)
  backend.ts      통합 백엔드 어댑터 (Supabase ↔ 데모 자동 전환)
  logic.ts        게임 로직 (EXP/레벨/품질/업적24종/D-day/말풍선 — 엑셀 이식)
supabase/
  schema.sql      DB 스키마 v2 (SQL Editor에 붙여넣기 — 기존 v1 위에 재실행해도 안전)
public/images/    수달 일러스트
```

## 기술 스택

- Next.js 14 (App Router) · React 18 · TypeScript · 순수 CSS
- `@supabase/supabase-js` (Auth + Postgres + RLS)
