/* =====================================================================
 *  Do-Otter · RAG 검색 (결정론적 룩업)
 *  ─────────────────────────────────────────────────────────────────────
 *  벡터 유사도를 쓰지 않는다. 상황 ID → 근거 ID 매핑이 이미 사람 손으로
 *  확정되어 있으므로(situations.ts의 evidenceIds), 그 매핑을 그대로
 *  따른다. 12건짜리 코퍼스에서 임베딩 검색은 비용만 늘리고, 의학 답변에
 *  엉뚱한 근거가 딸려올 위험을 새로 만든다.
 *
 *  코퍼스가 수백 건으로 늘어나면 이 파일의 retrieve()만 교체하면 된다.
 *  상위 레이어(prompt.ts / route)는 Evidence[] 형태만 알면 되도록 격리.
 * ===================================================================== */

import { evidenceByIds, type Evidence } from "./evidence";
import { situationById, type Situation, type SituationId } from "./situations";

export type Retrieved = {
  situation: Situation;
  evidence: Evidence[];
};

/** 상황 ID → { 상황, 근거자료[] } */
export function retrieve(id: SituationId): Retrieved | null {
  const situation = situationById(id);
  if (!situation) return null;
  return { situation, evidence: evidenceByIds(situation.evidenceIds) };
}

/* =====================================================================
 *  응급 상황(A58) 사전 차단
 *  ─────────────────────────────────────────────────────────────────────
 *  LLM 분류를 신뢰하지 않는다. 응급 표현이 잡히면 분류기를 거치지 않고
 *  즉시 A58로 확정하고, 생성 단계도 건너뛴 고정 문구를 낸다.
 *  (근거: R11 — 응급 가능성이 있는 상황에서 스트레칭/휴식/공부 재개를
 *   먼저 권하지 않는다)
 *
 *  오탐(false positive)은 감수한다. "숨막혀"가 비유여도 119 안내가
 *  나가는 편이, 진짜 응급을 놓치는 것보다 낫다.
 * ===================================================================== */
const EMERGENCY_PATTERNS: RegExp[] = [
  // 가슴 통증 / 압박
  /가슴이?\s*(너무\s*)?(아프|아파|아픔|조여|답답|짓눌|쥐어짜)/,
  /흉통|가슴\s*통증|심장이?\s*(아파|아프|조여|쥐어)/,
  // 호흡곤란
  /숨이?\s*(안\s*쉬어|안\s*쉬|막혀|막힌|차|가빠|가쁘|턱)/,
  /호흡\s*곤란|숨쉬기\s*(힘들|어렵)/,
  // 실신 / 의식
  /기절|실신|졸도|의식이?\s*(없|흐|안)/,
  /쓰러(질|졌|져|지겠)|정신을?\s*잃/,
  // 기타 응급 경고
  /말이?\s*(어눌|안\s*나와)|한쪽이?\s*마비|마비(가|된|돼)/,
  /피를?\s*토|각혈|경련(이|을)?\s*(일어|나)/,
];

export function isEmergency(text: string): boolean {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return false;
  return EMERGENCY_PATTERNS.some((re) => re.test(t));
}

/** 응급 시 LLM을 거치지 않고 그대로 내보내는 고정 답변 (A58 / R11, R12) */
export function emergencyReply(): string {
  const s = situationById("A58");
  return (
    s?.template ??
    "공부를 바로 멈춰. 갑작스러운 가슴 통증, 호흡곤란, 실신이나 의식 저하는 응급상황일 수 있으니 혼자 버티지 말고 주변 사람에게 알리고 119에 연락해."
  );
}
