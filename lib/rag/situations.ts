/* =====================================================================
 *  Do-Otter · 감지 상황 카탈로그 (A1~A60)
 *  ─────────────────────────────────────────────────────────────────────
 *  「상황 목록」 문서의 각 행 = 여기의 한 객체.
 *  evidenceIds 가 곧 RAG 검색 결과다 — 벡터 유사도 대신 사람이 확정한
 *  매핑을 그대로 쓴다 (retrieve() in ./retrieve.ts).
 * ===================================================================== */

import type { EvidenceId } from "./evidence";

export type SituationId = `A${number}`;

/** 답변 유형 */
export type AnswerType = "단순알람" | "집중유도" | "의학적답변";

/** 생성 방식 */
export type Generation = "고정문구" | "LLM개인화" | "RAG+LLM";

/** 현재 감지 가능 여부 */
export type Detectable = "가능" | "부분가능" | "불가";

export type Situation = {
  id: SituationId;
  /** 감지 상황 */
  name: string;
  /** 알람 발생 조건 */
  trigger: string;
  detectable: Detectable;
  /** 감지 제약 사유 (부분가능/불가일 때) */
  detectNote?: string;
  answerType: AnswerType;
  /** 의학적 내용 포함 여부 — true면 RAG 경로 + 의학 가드레일 */
  medical: boolean;
  /** 개입 목적 */
  purpose: string;
  /** 수달 알람 문구 (초안 템플릿, {슬롯} 포함) */
  template: string;
  /** 기대 후속 행동 */
  expectedAction: string;
  generation: Generation;
  /** 근거자료 ID — RAG 룩업 키 */
  evidenceIds: EvidenceId[];
};

export const SITUATIONS: Situation[] = [
  /* ---------- 진입 / 세션 시작 ---------- */
  {
    id: "A1",
    name: "오늘 첫 홈 화면 진입",
    trigger: "당일 최초 로그인 또는 4시간 이상 미접속 후 홈 화면 진입",
    detectable: "가능",
    answerType: "단순알람",
    medical: false,
    purpose: "오늘 일정/D-day 인지, 첫 공부 선택",
    template:
      "오늘은 {예정 과목 수}개가 예정되어 있고, 가장 가까운 시험은 D-{남은 일수}야. 먼저 {첫 일정}부터 열어 보자.",
    expectedAction: "오늘 일정 확인 후 첫 과목의 공부 모드 시작",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A2",
    name: "공부 예정 시각 10분 전",
    trigger: "등록된 공부 일정 시작 10분 전",
    detectable: "가능",
    answerType: "단순알람",
    medical: false,
    purpose: "시작 준비와 지연 예방",
    template: "10분 뒤 {과목} 시작이야. 책과 필요한 자료만 먼저 꺼내 두자.",
    expectedAction: "책/자료 준비 후 예정 시각에 공부 시작",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A3",
    name: "예정 시각이 지났지만 공부를 시작하지 않음",
    trigger: "등록된 일정 시작 후 5분이 지났고 공부 모드가 시작되지 않음",
    detectable: "가능",
    answerType: "집중유도",
    medical: false,
    purpose: "계획 미루기 중단, 즉시 착수",
    template:
      "예정 시각이 5분 지났어. 지금은 {과목}을 5분만 시작해—계획 전체보다 첫 문제 하나가 우선이야.",
    expectedAction: "공부 모드 실행 후 첫 문제/첫 페이지 시작",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A4",
    name: "공부 모드 시작",
    trigger: "사용자가 공부 모드 또는 타이머를 시작함",
    detectable: "가능",
    answerType: "집중유도",
    medical: false,
    purpose: "첫 목표 명확화",
    template:
      "공부 모드 시작했어. 첫 목표는 {목표 시간}분 동안 {할 일} 하나만 끝내는 거야.",
    expectedAction: "한 가지 목표에 집중하여 첫 구간 수행",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A5",
    name: "35분 연속 공부",
    trigger: "공부 모드가 중단 없이 35분 지속됨",
    detectable: "가능",
    answerType: "집중유도",
    medical: false,
    purpose: "집중 상태 점검과 흐름 유지",
    template:
      "35분째 이어가고 있어. 집중이 유지되면 그대로 가고, 흐려졌다면 1분만 정리한 뒤 다음 구간을 시작하자.",
    expectedAction: "집중 상태를 점검하고 계속 공부하거나 짧게 정리 후 재개",
    generation: "고정문구",
    evidenceIds: [],
  },
  {
    id: "A6",
    name: "20분 연속 화면 사용",
    trigger: "웹앱 내 학습 화면을 20분 이상 연속 사용함",
    detectable: "부분가능",
    detectNote: "웹앱 내 화면 시간만 감지",
    answerType: "의학적답변",
    medical: true,
    purpose: "눈의 피로를 줄이기 위한 짧은 화면 휴식",
    template:
      "화면을 20분째 보고 있어. 20초 동안 약 6m 밖을 보고 눈을 쉬게 한 뒤 돌아오자.",
    expectedAction: "20초간 먼 곳을 본 후 학습 화면으로 복귀",
    generation: "RAG+LLM",
    evidenceIds: ["R3"],
  },
  {
    id: "A7",
    name: "60분 연속 공부",
    trigger: "공부 모드가 중단 없이 60분 지속됨",
    detectable: "부분가능",
    detectNote: "공부 시간만 감지, 자세는 미감지",
    answerType: "의학적답변",
    medical: true,
    purpose: "장시간 같은 자세를 끊고 움직임 확보",
    template:
      "한 시간 동안 공부를 이어갔어. 5분 동안 일어나 걷거나 가볍게 몸을 움직인 뒤 다시 앉자.",
    expectedAction: "자리에서 일어나 5분간 움직인 후 공부 재개",
    generation: "RAG+LLM",
    evidenceIds: ["R1", "R2"],
  },
  {
    id: "A8",
    name: "공부 타이머 종료",
    trigger: "설정한 공부 타이머가 0분이 됨",
    detectable: "가능",
    answerType: "단순알람",
    medical: false,
    purpose: "학습 기록 저장과 완료 범위 확인",
    template: "타이머가 끝났어. 기록을 저장하고 끝낸 범위를 체크해 줘.",
    expectedAction: "공부 기록 저장 및 완료 범위 표시",
    generation: "고정문구",
    evidenceIds: [],
  },
  {
    id: "A9",
    name: "휴식 타이머 종료",
    trigger: "설정한 휴식 타이머가 0분이 됨",
    detectable: "가능",
    answerType: "집중유도",
    medical: false,
    purpose: "휴식 연장 방지와 공부 복귀",
    template:
      "쉬는 시간이 끝났어. 방금 하던 페이지로 돌아가 다음 5분만 다시 시작하자.",
    expectedAction: "기존 공부 화면으로 돌아가 타이머 재시작",
    generation: "고정문구",
    evidenceIds: [],
  },
  {
    id: "A10",
    name: "공부 모드가 5분 이상 일시정지됨",
    trigger: "공부 모드를 일시정지한 뒤 5분 동안 재개하거나 종료하지 않음",
    detectable: "가능",
    answerType: "집중유도",
    medical: false,
    purpose: "애매한 중단 상태 종료",
    template:
      "공부 모드가 5분째 멈춰 있어. 계속 쉴 거면 종료하고, 아니라면 지금 재개 버튼을 눌러.",
    expectedAction: "공부 모드 재개 또는 명시적으로 종료",
    generation: "고정문구",
    evidenceIds: [],
  },
  {
    id: "A11",
    name: "짧은 시간에 공부가 반복 중단됨",
    trigger: "1시간 안에 공부 모드 일시정지/종료가 3회 이상 발생",
    detectable: "가능",
    answerType: "집중유도",
    medical: false,
    purpose: "목표 축소를 통한 흐름 복구",
    template:
      "한 시간 안에 {중단 횟수}번 흐름이 끊겼어. 다음 구간은 {짧은 목표 시간}분으로 줄이고 한 가지 일만 끝내자.",
    expectedAction: "짧은 타이머로 한 가지 과제 재시작",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A12",
    name: "등록한 공부 과제 완료",
    trigger: "사용자가 일정 또는 할 일을 완료 처리함",
    detectable: "가능",
    answerType: "단순알람",
    medical: false,
    purpose: "성과 확인과 다음 행동 연결",
    template:
      "{과목}의 {완료 범위}를 끝냈어. 완료 기록을 남기고 다음 일정은 하나만 확인하자.",
    expectedAction: "완료 기록 저장 후 다음 일정 1개 확인",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A13",
    name: "하루 공부 목표 달성",
    trigger: "당일 누적 공부 시간이 설정 목표 이상이 됨",
    detectable: "가능",
    answerType: "단순알람",
    medical: false,
    purpose: "달성 칭찬과 의식적인 종료 선택",
    template:
      "오늘 목표 {목표 시간}을 채웠어. 여기서 종료할지, 남은 일정 하나를 더 할지 선택해 줘.",
    expectedAction: "공부 종료 또는 다음 일정 1개 선택",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A14",
    name: "하루 중간까지 공부 기록이 없음",
    trigger:
      "사용자 지정 중간 점검 시각에 예정 일정이 1개 이상이고 당일 공부 기록이 0분임",
    detectable: "가능",
    answerType: "집중유도",
    medical: false,
    purpose: "첫 공부 기록 생성",
    template:
      "오늘 예정된 공부가 아직 시작되지 않았어. 가장 짧은 {과목}을 5분만 켜서 첫 기록부터 만들자.",
    expectedAction: "가장 짧은 과목으로 5분 공부 시작",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A15",
    name: "하루 종료 전 미완료 일정이 남음",
    trigger: "사용자 지정 하루 종료 시각 1시간 전, 미완료 일정이 1개 이상 남음",
    detectable: "부분가능",
    detectNote: "하루 종료 시각 설정 필요",
    answerType: "집중유도",
    medical: false,
    purpose: "무리한 몰아치기 방지와 우선순위 조정",
    template:
      "오늘 남은 일정이 {남은 개수}개야. 전부 밀어 넣지 말고, 꼭 필요한 {우선 과제} 하나만 끝내고 나머지는 다시 배치하자.",
    expectedAction: "우선 과제 1개 수행 후 나머지 일정 재배치",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A16",
    name: "시험 D-7 도달",
    trigger: "등록된 시험일까지 7일 남음",
    detectable: "가능",
    answerType: "단순알람",
    medical: false,
    purpose: "남은 범위 분할과 일주일 계획 착수",
    template:
      "시험까지 7일 남았어. 오늘은 {남은 범위}를 7일에 나눈 분량 중 첫 구간부터 시작하자.",
    expectedAction: "남은 범위를 분할하고 오늘 분량 시작",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A17",
    name: "시험 D-1 도달",
    trigger: "등록된 시험일까지 1일 남음",
    detectable: "가능",
    answerType: "집중유도",
    medical: false,
    purpose: "과도한 범위 확장 방지와 핵심 복습",
    template:
      "시험이 내일이야. 새 범위를 넓히기보다 {오답 또는 핵심 범위}를 정해진 시간만 확인하고 마무리하자.",
    expectedAction: "오답/핵심 범위 중심으로 제한된 시간 복습",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A18",
    name: "공부 공백 후 앱에 복귀",
    trigger: "2일 이상 공부 기록이 없다가 앱 홈 또는 공부 모드에 진입",
    detectable: "가능",
    answerType: "집중유도",
    medical: false,
    purpose: "낮은 부담으로 공부 습관 재개",
    template:
      "공부 기록이 {공백 일수}일 비어 있었어. 복구 목표는 크게 잡지 말고 오늘 10분 기록 하나부터 다시 만들자.",
    expectedAction: "10분 타이머로 공부 재시작",
    generation: "LLM개인화",
    evidenceIds: [],
  },

  /* ---------- 방해 앱 (모바일 권한 필요 — 웹앱에서 트리거 불가) ---------- */
  {
    id: "A19",
    name: "공부 모드 중 방해 앱 진입",
    trigger: "공부 모드가 켜진 상태에서 차단 목록 앱을 실행함",
    detectable: "불가",
    detectNote: "모바일 앱 사용 권한 필요",
    answerType: "집중유도",
    medical: false,
    purpose: "방해 앱 즉시 종료와 공부 복귀",
    template:
      "지금 {앱명}에 들어왔어. 필요한 용도가 아니라면 닫고, 방금 하던 {과목}으로 돌아가자.",
    expectedAction: "방해 앱 종료 후 기존 공부 화면 복귀",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A20",
    name: "방해 앱을 3분 사용",
    trigger: "공부 모드 중 차단 목록 앱의 연속 사용 시간이 3분에 도달",
    detectable: "불가",
    detectNote: "모바일 앱 사용 권한 필요",
    answerType: "집중유도",
    medical: false,
    purpose: "초기 이탈 단계에서 빠른 종료",
    template:
      "3분째 {앱명}을 보고 있어. 여기서 닫으면 공부 흐름을 바로 복구할 수 있어—지금 종료하자.",
    expectedAction: "방해 앱 종료 및 공부 모드 복귀",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A21",
    name: "방해 앱을 10분 사용",
    trigger: "공부 모드 중 차단 목록 앱의 연속 사용 시간이 10분에 도달",
    detectable: "불가",
    detectNote: "모바일 앱 사용 권한 필요",
    answerType: "집중유도",
    medical: false,
    purpose: "장기 이탈 중단과 작은 목표로 재시작",
    template:
      "10분이 지났어. 해야 할 양은 그대로이니 {앱명}을 닫고, {과목} 5분부터 다시 시작하자.",
    expectedAction: "방해 앱 종료 후 5분 공부 타이머 시작",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A22",
    name: "방해 앱 장시간/반복 사용",
    trigger: "공부 모드 중 방해 앱 누적 사용 60분 또는 하루 이탈 3회 이상",
    detectable: "불가",
    detectNote: "모바일 앱 사용 권한 필요",
    answerType: "집중유도",
    medical: false,
    purpose: "자책 없이 이탈 패턴 인지와 최소 단위 복귀",
    template:
      "오늘 방해 앱 이탈이 {이탈 횟수}번, 총 {사용 시간}분이야. 자책하지 말고 앱을 닫은 뒤 다음 공부 목표를 5분으로 줄여 다시 시작하자.",
    expectedAction: "방해 앱 종료 후 5분 목표로 공부 재개",
    generation: "LLM개인화",
    evidenceIds: [],
  },

  /* ---------- 수면 / 카페인 (의학) ---------- */
  {
    id: "A23",
    name: "수면 시간이 부족하거나 심한 졸림을 입력",
    trigger:
      "사용자가 최근 수면 시간이 7시간 미만이라고 기록하거나 현재 심하게 졸리다고 입력",
    detectable: "부분가능",
    detectNote: "사용자 입력 또는 웨어러블 연동 필요",
    answerType: "의학적답변",
    medical: true,
    purpose: "무리한 밤샘 억제와 수면 시간 확보",
    template:
      "성인은 보통 하루 7시간 이상 수면이 권장돼. 지금 심하게 졸리면 새 범위를 늘리지 말고 오늘 잘 시간을 먼저 확보하자.",
    expectedAction: "새 학습 범위 확장을 멈추고 수면 계획 설정",
    generation: "RAG+LLM",
    evidenceIds: ["R4"],
  },
  {
    id: "A24",
    name: "취침에 가까운 시간에 카페인을 추가하려 함",
    trigger:
      "사용자가 취침 예정 시각에 가까운 시간에 카페인 섭취를 기록하거나 추가 섭취 여부를 물음",
    detectable: "부분가능",
    detectNote: "카페인/취침 시각 입력 필요",
    answerType: "의학적답변",
    medical: true,
    purpose: "수면 방해 가능성 안내와 추가 섭취 회피",
    template:
      "취침에 가까운 카페인은 일부 성인의 수면 시간과 패턴에 영향을 줄 수 있어. 지금은 추가 섭취 대신 물이나 무카페인 음료를 선택하자.",
    expectedAction: "추가 카페인 섭취를 피하고 대체 음료 선택",
    generation: "RAG+LLM",
    evidenceIds: ["R5", "R6"],
  },

  /* ---------- 온보딩 / 일정 등록 ---------- */
  {
    id: "A25",
    name: "초기 설정에서 수달 성격 선택 완료",
    trigger: "사용자가 T수달/F수달/코치수달 중 하나를 선택하고 온보딩을 완료함",
    detectable: "가능",
    answerType: "단순알람",
    medical: false,
    purpose: "선택한 코칭 방식 확인과 첫 행동 연결",
    template:
      "{선택 수달}로 설정했어. 앞으로 같은 기준으로 공부 흐름을 관리할게—먼저 오늘 할 일 하나를 등록하자.",
    expectedAction: "첫 공부 일정 또는 할 일 1개 등록",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A26",
    name: "온보딩을 마쳤지만 일정이 없음",
    trigger: "온보딩 완료 후 10분이 지나도 등록된 일정/할 일이 0개임",
    detectable: "가능",
    answerType: "집중유도",
    medical: false,
    purpose: "빈 홈 화면에서 첫 계획 생성",
    template:
      "아직 등록된 공부가 없어. 오늘 꼭 해야 하는 과목 하나와 시작 시각만 먼저 넣자.",
    expectedAction: "과목/시작 시각이 포함된 첫 일정 등록",
    generation: "고정문구",
    evidenceIds: [],
  },
  {
    id: "A27",
    name: "첫 공부 일정 등록 완료",
    trigger: "사용자가 계정 생성 후 처음으로 공부 일정을 저장함",
    detectable: "가능",
    answerType: "단순알람",
    medical: false,
    purpose: "계획 생성 성과 확인과 실행 준비",
    template:
      "첫 일정이 등록됐어. {시작 시각}에 {과목}을 바로 시작할 수 있게 필요한 자료만 준비해 두자.",
    expectedAction: "예정 시각 전 학습 자료 준비",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A28",
    name: "시험 D-day 등록 완료",
    trigger: "사용자가 시험명과 시험일을 처음 저장함",
    detectable: "가능",
    answerType: "단순알람",
    medical: false,
    purpose: "시험 일정 인지와 범위 분할 유도",
    template:
      "{시험명}까지 D-{남은 일수}야. 남은 범위를 확인하고 오늘 할 첫 구간 하나를 일정에 넣자.",
    expectedAction: "남은 범위를 나누고 오늘 분량 등록",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A29",
    name: "마감이 내일인데 과제를 시작하지 않음",
    trigger: "마감까지 24시간 이내이고 해당 과제의 공부 기록/완료 기록이 없음",
    detectable: "가능",
    answerType: "집중유도",
    medical: false,
    purpose: "마감 직전 미루기 중단과 최소 착수",
    template:
      "{과제명} 마감이 내일이야. 전체를 끝내려 하지 말고 지금 10분 동안 첫 단계부터 시작하자.",
    expectedAction: "10분 타이머로 과제 첫 단계 시작",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A30",
    name: "마감이 지난 미완료 과제가 있음",
    trigger: "등록된 마감 시각이 지났고 과제가 완료 처리되지 않음",
    detectable: "가능",
    answerType: "집중유도",
    medical: false,
    purpose: "미완료 사실 확인과 일정 재배치",
    template:
      "{과제명} 마감이 지났지만 아직 미완료야. 지금 처리할지, 현실적인 새 마감 시각을 정할지 하나를 선택해.",
    expectedAction: "즉시 수행 또는 새 마감 시각 설정",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A31",
    name: "공부 모드를 시작했지만 목표가 비어 있음",
    trigger: "공부 모드 시작 후 목표 과목/범위/시간 중 핵심 정보가 입력되지 않음",
    detectable: "가능",
    answerType: "집중유도",
    medical: false,
    purpose: "모호한 공부를 구체적인 한 단위로 변환",
    template:
      "무엇을 끝낼지 정해지지 않았어. {과목}에서 문제 수나 페이지 범위 하나만 입력하고 시작하자.",
    expectedAction: "구체적인 범위 또는 문제 수 입력",
    generation: "LLM개인화",
    evidenceIds: [],
  },

  /* ---------- 세션 진행 / 목표 ---------- */
  {
    id: "A32",
    name: "설정한 공부 시간의 절반 도달",
    trigger: "현재 공부 세션이 목표 시간의 50%에 도달함",
    detectable: "가능",
    answerType: "단순알람",
    medical: false,
    purpose: "진행률 확인과 남은 구간 유지",
    template:
      "목표 시간의 절반을 채웠어. 지금 흐름을 유지하면 남은 {남은 시간}분 뒤에 끝낼 수 있어.",
    expectedAction: "현재 과제 유지하며 남은 시간 공부",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A33",
    name: "예정 범위를 타이머보다 일찍 완료",
    trigger: "사용자가 목표 범위를 완료 처리했지만 타이머가 남아 있음",
    detectable: "가능",
    answerType: "단순알람",
    medical: false,
    purpose: "성과 기록 후 의식적인 다음 선택",
    template:
      "예정한 {완료 범위}를 끝냈어. 남은 시간은 종료할지, 복습 한 구간을 추가할지 선택해 줘.",
    expectedAction: "세션 종료 또는 짧은 복습 선택",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A34",
    name: "목표 시간의 절반 전에 세션 종료",
    trigger: "사용자가 목표 시간의 50% 미만에서 공부 모드를 종료함",
    detectable: "가능",
    answerType: "집중유도",
    medical: false,
    purpose: "중단 원인 확인과 목표 재설정",
    template:
      "목표 {목표 시간}분 중 {실제 시간}분에서 끝났어. 다음 세션은 가능한 시간으로 줄여 다시 잡자.",
    expectedAction: "짧아진 목표 시간으로 다음 세션 예약",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A35",
    name: "하루 공부 목표의 50% 달성",
    trigger: "당일 누적 공부 시간이 하루 목표의 절반에 도달함",
    detectable: "가능",
    answerType: "단순알람",
    medical: false,
    purpose: "중간 성과 확인과 남은 분량 인지",
    template:
      "오늘 목표의 절반을 채웠어. 남은 {남은 목표 시간}분은 {다음 과목}부터 이어가자.",
    expectedAction: "다음 과목 공부 시작 또는 일정 확인",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A36",
    name: "하루 공부 목표를 초과 달성",
    trigger: "당일 누적 공부 시간이 목표보다 30분 이상 많아짐",
    detectable: "가능",
    answerType: "단순알람",
    medical: false,
    purpose: "과잉 공부 자동 연장 방지와 종료 판단",
    template:
      "오늘 목표를 {초과 시간}분 넘겼어. 남은 일정이 필수가 아니라면 기록을 저장하고 여기서 마쳐도 돼.",
    expectedAction: "공부 기록 저장 후 종료 여부 결정",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A37",
    name: "3일 연속 공부 기록 달성",
    trigger: "3일 연속으로 최소 공부 기준을 충족함",
    detectable: "가능",
    answerType: "단순알람",
    medical: false,
    purpose: "초기 습관 형성 칭찬과 다음 날 연결",
    template:
      "3일 연속으로 공부 기록을 만들었어. 내일도 같은 시각에 {최소 목표 시간}분만 이어가자.",
    expectedAction: "다음 날 최소 공부 일정 예약",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A38",
    name: "7일 연속 공부 기록 달성",
    trigger: "7일 연속으로 최소 공부 기준을 충족함",
    detectable: "가능",
    answerType: "단순알람",
    medical: false,
    purpose: "일주일 지속 성과 확인과 유지 전략 선택",
    template:
      "7일 연속 기록을 채웠어. 가장 잘 지켜진 시간대를 다음 주 기본 공부 시간으로 고정하자.",
    expectedAction: "다음 주 반복 일정 설정",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A39",
    name: "연속 기록이 끊길 가능성이 높음",
    trigger: "사용자 지정 하루 종료 2시간 전이며 당일 최소 공부 기록이 없음",
    detectable: "부분가능",
    detectNote: "하루 종료 시각/연속 기록 기준 설정 필요",
    answerType: "집중유도",
    medical: false,
    purpose: "연속 기록 유지를 위한 최소 행동 촉진",
    template:
      "오늘 기록이 아직 없어. 연속 기록을 유지하려면 지금 {최소 목표 시간}분만 시작하면 돼.",
    expectedAction: "최소 목표 시간의 공부 세션 시작",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A40",
    name: "주간 공부 리포트 생성",
    trigger: "한 주가 종료되고 7일간 공부 기록이 집계됨",
    detectable: "가능",
    answerType: "단순알람",
    medical: false,
    purpose: "주간 패턴 확인과 개선점 1개 선택",
    template:
      "이번 주 총 {주간 공부 시간}, 계획 달성률은 {달성률}%야. 다음 주에는 가장 자주 미룬 {취약 시간대 또는 과목} 하나만 조정하자.",
    expectedAction: "리포트 확인 후 다음 주 개선 항목 1개 설정",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A41",
    name: "지난주보다 공부 시간이 크게 감소",
    trigger: "이번 주 누적 공부 시간이 지난주 같은 시점보다 30% 이상 적음",
    detectable: "가능",
    answerType: "집중유도",
    medical: false,
    purpose: "감소 추세 인지와 현실적 목표 재설정",
    template:
      "지난주 같은 시점보다 공부 시간이 {감소율}% 줄었어. 남은 기간 목표를 다시 계산하고 오늘 가능한 한 구간부터 채우자.",
    expectedAction: "주간 목표 조정 후 오늘 세션 시작",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A42",
    name: "지난주보다 방해 앱 사용이 감소",
    trigger: "이번 주 방해 앱 사용 시간이 지난주 같은 기간보다 20% 이상 감소함",
    detectable: "불가",
    detectNote: "모바일 앱 사용 권한 필요",
    answerType: "단순알람",
    medical: false,
    purpose: "디지털 이탈 감소 성과 강화",
    template:
      "이번 주 방해 앱 사용이 지난주보다 {감소율}% 줄었어. 줄어든 시간 중 일부를 {우선 과목}에 그대로 연결하자.",
    expectedAction: "절약한 시간으로 우선 과목 일정 생성",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A43",
    name: "하루 방해 앱 사용 목표 달성",
    trigger: "당일 방해 앱 누적 시간이 사용자가 정한 한도 이하로 종료됨",
    detectable: "불가",
    detectNote: "모바일 앱 사용 권한 필요",
    answerType: "단순알람",
    medical: false,
    purpose: "사용시간 관리 성공 확인",
    template:
      "오늘 방해 앱 사용을 {설정 한도} 안으로 지켰어. 잘된 시간대와 차단 설정을 내일도 그대로 유지하자.",
    expectedAction: "효과적이었던 차단 설정 유지",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A44",
    name: "같은 방해 앱에 짧게 반복 진입",
    trigger: "30분 안에 같은 차단 목록 앱을 3회 이상 실행함",
    detectable: "불가",
    detectNote: "모바일 앱 사용 권한 필요",
    answerType: "집중유도",
    medical: false,
    purpose: "습관적 재진입 차단과 환경 변경",
    template:
      "30분 안에 {앱명}을 {진입 횟수}번 열었어. 앱을 닫고 다음 공부 구간 동안만 차단 강도를 올리자.",
    expectedAction: "방해 앱 종료 후 일시적 강한 차단 적용",
    generation: "LLM개인화",
    evidenceIds: [],
  },

  /* ---------- 게이미피케이션 ---------- */
  {
    id: "A45",
    name: "수달 레벨 상승",
    trigger: "공부/일정 달성으로 경험치가 기준에 도달해 레벨이 오름",
    detectable: "부분가능",
    detectNote: "레벨 시스템 구현 필요",
    answerType: "단순알람",
    medical: false,
    purpose: "보상 피드백과 다음 목표 연결",
    template:
      "수달이 레벨 {현재 레벨}이 됐어. 다음 레벨까지 필요한 행동은 {다음 조건}이야.",
    expectedAction: "레벨 보상 확인 후 다음 조건 확인",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A46",
    name: "업적 달성",
    trigger: "연속 공부/누적 시간/방해 앱 감소 등 업적 조건을 충족함",
    detectable: "부분가능",
    detectNote: "업적 시스템 구현 필요",
    answerType: "단순알람",
    medical: false,
    purpose: "구체적 성과 시각화와 반복 강화",
    template:
      "{업적명} 업적을 달성했어. 이번에 성공한 행동은 {달성 조건}이니 다음에도 같은 방식으로 반복하자.",
    expectedAction: "업적 확인 후 성공 행동 반복 계획",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A47",
    name: "보상 재화 획득",
    trigger: "공부 세션 또는 일일 목표 완료로 재화가 지급됨",
    detectable: "부분가능",
    detectNote: "보상 시스템 구현 필요",
    answerType: "단순알람",
    medical: false,
    purpose: "즉각적 보상 제공과 기록 강화",
    template:
      "{보상 수량}{재화명}을 받았어. 오늘 기록은 저장됐고, 보상은 상점에서 확인할 수 있어.",
    expectedAction: "보상 내역 또는 상점 확인",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A48",
    name: "상점 아이템 해금 또는 구매",
    trigger: "레벨 조건 충족 또는 재화 사용으로 아이템을 획득함",
    detectable: "부분가능",
    detectNote: "상점 시스템 구현 필요",
    answerType: "단순알람",
    medical: false,
    purpose: "보상 사용 경험 제공",
    template: "{아이템명}을 획득했어. 바로 적용할지 보관할지 선택해 줘.",
    expectedAction: "아이템 적용 또는 보관 선택",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A49",
    name: "수달 외형 아이템 적용",
    trigger: "사용자가 보유 아이템을 수달 캐릭터에 장착함",
    detectable: "부분가능",
    detectNote: "캐릭터 꾸미기 구현 필요",
    answerType: "단순알람",
    medical: false,
    purpose: "개인화 결과 확인과 캐릭터 애착 강화",
    template: "{아이템명}을 적용했어. 이 모습으로 다음 공부 세션을 시작해 보자.",
    expectedAction: "꾸민 캐릭터와 공부 모드 시작",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A50",
    name: "알림을 반복해서 닫고 행동하지 않음",
    trigger: "공부 시작/복귀 알림을 3회 연속 닫았고 연결된 행동이 발생하지 않음",
    detectable: "부분가능",
    detectNote: "알림 클릭/후속 행동 추적 필요",
    answerType: "집중유도",
    medical: false,
    purpose: "과도한 압박을 줄이고 개입 방식 조정",
    template:
      "알림을 세 번 닫았어. 지금은 긴 계획 대신 시작 시각을 다시 정하거나 5분 목표로 낮추자.",
    expectedAction: "알림 시간 재설정 또는 5분 세션 시작",
    generation: "LLM개인화",
    evidenceIds: [],
  },

  /* ---------- 챗봇 자유 입력 (A51~A58) ---------- */
  {
    id: "A51",
    name: "사용자가 집중이 안 된다고 입력",
    trigger: "챗봇에 집중이 안 됨/시작하기 싫음 등 공부 어려움을 직접 입력함",
    detectable: "가능",
    answerType: "집중유도",
    medical: false,
    purpose: "감정 분석보다 즉시 가능한 최소 행동 제안",
    template:
      "지금 집중이 안 되는 상태는 확인했어. 책상 위에서 필요 없는 것 하나를 치우고 {과목} 첫 문제만 5분 동안 보자.",
    expectedAction: "환경 정리 1개 후 5분 공부 시작",
    generation: "LLM개인화",
    evidenceIds: [],
  },
  {
    id: "A52",
    name: "사용자가 스트레스나 불안이 높다고 입력",
    trigger: "챗봇에 스트레스/불안 때문에 공부가 어렵다고 직접 입력함",
    detectable: "가능",
    answerType: "의학적답변",
    medical: true,
    purpose: "짧은 안정화 행동 후 공부 범위 축소",
    template:
      "스트레스가 높을 때는 잠깐 현재 감각에 주의를 돌리는 연습이 도움이 될 수 있어. 발바닥이 바닥에 닿는 감각과 주변에서 보이는 것 세 가지를 확인한 뒤, 공부 목표를 5분으로 줄여서 다시 시작하자.",
    expectedAction: "짧은 그라운딩 후 5분 목표로 재시작",
    generation: "RAG+LLM",
    evidenceIds: ["R7"],
  },
  {
    id: "A53",
    name: "공부 중 목/어깨 불편감을 입력",
    trigger: "장시간 앉은 뒤 목 또는 어깨가 뻐근하거나 불편하다고 입력함",
    detectable: "가능",
    answerType: "의학적답변",
    medical: true,
    purpose: "같은 자세 중단과 중립 자세 점검",
    template:
      "공부를 잠시 멈추고 일어나 움직인 뒤, 머리는 몸통과 일직선으로 두고 어깨 힘을 빼자. 통증이 심하거나 계속되면 참고 계속하지 말고 의료진에게 확인받자.",
    expectedAction: "짧게 움직이고 작업 자세 조정",
    generation: "RAG+LLM",
    evidenceIds: ["R8", "R9"],
  },
  {
    id: "A54",
    name: "타이핑 중 손목/손 불편감을 입력",
    trigger: "키보드/마우스 사용 중 손목이나 손에 통증/저림/불편감이 있다고 입력함",
    detectable: "가능",
    answerType: "의학적답변",
    medical: true,
    purpose: "반복 사용 중단과 손목 중립 자세 점검",
    template:
      "타이핑을 잠시 멈추고 손목과 전완을 일직선에 가깝게 두자. 통증이나 저림이 반복되거나 악화되면 사용을 계속하지 말고 의료진에게 확인받자.",
    expectedAction: "입력 작업 중단 후 손목 자세 조정",
    generation: "RAG+LLM",
    evidenceIds: ["R8", "R9"],
  },
  {
    id: "A55",
    name: "시험 전 밤샘 공부를 계획한다고 입력",
    trigger:
      "사용자가 오늘 잠을 자지 않고 공부하겠다고 말하거나 수면 시간을 0~3시간으로 계획함",
    detectable: "가능",
    answerType: "의학적답변",
    medical: true,
    purpose: "밤샘 억제와 수면을 포함한 복습 계획 전환",
    template:
      "수면 부족은 집중/학습/기억과 판단에 불리할 수 있어. 새 범위를 밤새 늘리기보다 핵심 복습 시간을 정하고 최소한의 수면 시간을 확보하자.",
    expectedAction: "핵심 복습 종료 시각과 수면 시작 시각 설정",
    generation: "RAG+LLM",
    evidenceIds: ["R4", "R10"],
  },
  {
    id: "A56",
    name: "화면 사용 후 눈 불편감이나 두통을 입력",
    trigger: "화면 학습 중 눈의 피로/건조감/두통을 직접 입력하거나 화면 사용이 길게 지속됨",
    detectable: "부분가능",
    detectNote: "증상은 사용자 입력 필요",
    answerType: "의학적답변",
    medical: true,
    purpose: "화면 휴식과 증상 지속 시 안전 안내",
    template:
      "화면에서 눈을 떼고 20초 동안 약 6m 밖을 본 뒤 눈을 쉬게 하자. 불편감이 심하거나 시야 변화가 있거나 계속되면 화면 사용을 중단하고 의료진에게 확인받자.",
    expectedAction: "화면 휴식 후 증상에 따라 학습 중단 여부 결정",
    generation: "RAG+LLM",
    evidenceIds: ["R3"],
  },
  {
    id: "A57",
    name: "카페인 섭취량이 많다고 입력",
    trigger: "당일 카페인 섭취량이 400mg을 넘었다고 기록하거나 에너지음료/커피를 반복 섭취",
    detectable: "부분가능",
    detectNote: "섭취량 사용자 입력 필요",
    answerType: "의학적답변",
    medical: true,
    purpose: "추가 섭취 중단과 이상 증상 확인",
    template:
      "카페인 반응은 사람마다 다르고, 400mg은 모두에게 안전한 목표량이 아니야. 오늘은 추가 섭취를 멈추고 물을 마시며, 두근거림이나 불면 같은 증상이 있으면 의료진에게 확인받자.",
    expectedAction: "추가 카페인 중단 및 증상 점검",
    generation: "RAG+LLM",
    evidenceIds: ["R6"],
  },
  {
    id: "A58",
    name: "갑작스럽고 심한 증상을 입력",
    trigger: "가슴 통증/호흡곤란/의식 저하/실신 등 응급 가능성이 있는 증상을 직접 입력함",
    detectable: "가능",
    answerType: "의학적답변",
    medical: true,
    purpose: "공부 즉시 중단과 응급 도움 연결",
    template:
      "공부를 바로 멈춰. 갑작스러운 가슴 통증, 호흡곤란, 실신이나 의식 저하는 응급상황일 수 있으니 혼자 버티지 말고 주변 사람에게 알리고 119에 연락해. 신고할 때 위치와 의식, 호흡 상태를 전달해 줘.",
    expectedAction: "공부 중단 후 주변 도움 요청 및 119 연락",
    generation: "RAG+LLM",
    evidenceIds: ["R11", "R12"],
  },

  /* ---------- 장시간 / 누적 수면 (의학) ---------- */
  {
    id: "A59",
    name: "120분 이상 연속 공부",
    trigger: "공부 모드가 휴식 없이 120분 이상 지속됨",
    detectable: "가능",
    answerType: "의학적답변",
    medical: true,
    purpose: "장시간 정적 자세 중단과 충분한 휴식",
    template:
      "두 시간 동안 계속 공부했어. 지금은 타이머를 멈추고 자리에서 일어나 움직이며 화면과 입력 작업에서 벗어난 뒤 다시 시작하자.",
    expectedAction: "공부 모드 일시정지 후 움직임과 화면 휴식",
    generation: "RAG+LLM",
    evidenceIds: ["R1", "R2", "R9"],
  },
  {
    id: "A60",
    name: "수면 부족이 여러 날 반복됨",
    trigger: "최근 3일 연속 수면 시간이 7시간 미만으로 기록됨",
    detectable: "부분가능",
    detectNote: "사용자 입력 또는 웨어러블 연동 필요",
    answerType: "의학적답변",
    medical: true,
    purpose: "누적 수면 부족 인지와 일정 축소",
    template:
      "최근 3일 동안 수면이 계속 부족했어. 오늘 공부량을 무리하게 늘리지 말고 종료 시각을 앞당겨 수면 시간을 확보하자.",
    expectedAction: "오늘 일정 축소 후 수면 시작 시각 설정",
    generation: "RAG+LLM",
    evidenceIds: ["R4", "R10"],
  },
];

/* ---------- 인덱스 / 조회 ---------- */
const BY_ID = new Map<SituationId, Situation>(SITUATIONS.map((s) => [s.id, s]));

export function situationById(id: SituationId): Situation | undefined {
  return BY_ID.get(id);
}

/** 챗봇 자유 입력으로 분류 가능한 상황 (A51~A58) */
export const CHAT_SITUATION_IDS: SituationId[] = [
  "A51", "A52", "A53", "A54", "A55", "A56", "A57", "A58",
];

export function chatSituations(): Situation[] {
  return CHAT_SITUATION_IDS.map((id) => BY_ID.get(id)!).filter(Boolean);
}

/** 웹앱에서 실제로 트리거 가능한 상황 (detectable !== "불가") */
export function detectableSituations(): Situation[] {
  return SITUATIONS.filter((s) => s.detectable !== "불가");
}

/** 의학적 답변 = RAG 경로를 타는 상황 */
export function medicalSituations(): Situation[] {
  return SITUATIONS.filter((s) => s.medical);
}
