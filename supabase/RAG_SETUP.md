# Do-Otter RAG 데이터 Supabase 적재

현재 Supabase 프로젝트에는 RAG 테이블이 없으므로 최초 한 번은 SQL Editor에서
[`rag_schema_and_seed.sql`](./rag_schema_and_seed.sql)을 실행해야 합니다.

## 실행 방법

1. Supabase Dashboard에서 프로젝트 `rjplvlodlkifqpisiyut`를 엽니다.
2. 왼쪽 메뉴에서 **SQL Editor → New query**를 선택합니다.
3. `supabase/rag_schema_and_seed.sql` 전체를 붙여넣습니다.
4. **Run**을 누릅니다.
5. 마지막 결과가 아래와 같은지 확인합니다.

| evidence_count | situation_count | rag_situation_count | chat_situation_count | mapping_count |
|---:|---:|---:|---:|---:|
| 38 | 60 | 35 | 25 | 97 |

SQL은 여러 번 실행해도 됩니다. `managed_by = 'do-otter-code'`인 행만 현재 코드와
동기화하므로, 별도로 추가한 `managed_by = 'external'` 행은 삭제하지 않습니다.

## 생성되는 테이블

- `rag_evidence`: R1~R38의 주장, 활용법, 주의사항, 원문 출처
- `rag_situations`: A1~A60의 감지 조건, 답변 유형, 템플릿, RAG/채팅 활성화 여부
- `rag_situation_evidence`: 상황별 허용 근거와 우선순위 97개
- `rag_corpus_meta`: 검색 방식, 가중치, 응급 상황 ID와 코퍼스 건수

기존 `chat_messages` 테이블이 있으면 `rag_meta jsonb` 열도 함께 추가합니다. 이 열에는
근거 기반 답변의 상황 ID, 출처와 검색 모드가 저장되어 대화를 다시 열어도 출처 UI가
유지됩니다. 앱 기본 스키마를 새로 만드는 경우에는 `supabase/schema.sql`이 같은 열을
생성합니다.

클라이언트는 읽기만 가능하고 쓰기는 허용되지 않도록 RLS와 권한이 설정됩니다.

## 코드가 바뀐 뒤 SQL 다시 만들기

```powershell
npm run validate:rag
npm run generate:rag-sql
```

이후 새로 생성된 `supabase/rag_schema_and_seed.sql`을 SQL Editor에서 다시 실행하면
코드가 관리하는 행만 갱신됩니다.

## 연결 키 주의사항

- publishable key는 `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 사용할 수 있습니다.
- secret key는 브라우저 코드나 `NEXT_PUBLIC_*` 변수에 넣으면 안 됩니다.
- JWKS URL은 인증 토큰 검증용이며 이번 데이터 적재에는 필요하지 않습니다.
- 채팅에 노출된 secret key는 적재 작업 후 Supabase Dashboard에서 교체하는 것을
  권장합니다.

## 현재 앱의 데이터 소스

현재 실행 중인 RAG는 `lib/rag/evidence.ts`와 `lib/rag/situations.ts`를 직접 읽습니다.
이 SQL 적재는 서버 보관·조회·분석을 위한 동기화본입니다. Supabase를 런타임의 단일
데이터 소스로 사용하려면 API 경로에 서버 전용 Supabase 조회 어댑터를 추가해야 합니다.

## 앱에서 확인하기

- 집중 타이머를 시작하거나 `딴짓하기`를 누르면 `/api/situation` 기반 개입 카드가
  표시됩니다.
- `근거 기반 코칭` 카드에서는 `근거 출처 보기`를 눌러 기관, 문서명과 URL을 확인할
  수 있습니다.
- 홈에서 수달이를 터치한 문구는 `일상 응원`, 일반 채팅은 `일상 대화`로 표시되어
  근거 기반 조언과 구분됩니다.
- `npm run validate:rag`는 코퍼스 무결성뿐 아니라 분류 32건, 응급 15건, 검색 3건과
  의료 프롬프트 안전 규칙도 회귀 검사합니다.
