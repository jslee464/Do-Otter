/* =====================================================================
 *  Do-Otter · RAG 근거자료 코퍼스 (R1~R12)
 *  ─────────────────────────────────────────────────────────────────────
 *  「상황 목록」 문서의 근거자료 시트를 그대로 데이터화한 것.
 *  의학적 답변(의학적 내용 = O)인 상황에서만 이 코퍼스를 참조한다.
 *
 *  ⚠️ 이 파일은 사람이 검수한 내용만 들어간다. LLM이 여기 없는 의학
 *     정보를 지어내지 않도록, 생성 단계에서 claim 밖 내용을 금지한다.
 *
 *  ⚠️ 이 파일은 서버(app/api/*)에서만 import 된다.
 * ===================================================================== */

import type { SituationId } from "./situations";

export type EvidenceId =
  | "R1" | "R2" | "R3" | "R4" | "R5" | "R6"
  | "R7" | "R8" | "R9" | "R10" | "R11" | "R12";

export type Evidence = {
  id: EvidenceId;
  /** 관련 상황 ID — 사람이 확정한 매핑. 검색 대신 이 필드로 룩업한다. */
  situations: SituationId[];
  /** 주제 */
  topic: string;
  /** 자료명 (원문 제목) */
  sourceTitle: string;
  /** 발행기관이나 저자 */
  publisher: string;
  /** 연도 ("2020" | "확인 2026") */
  year: string;
  /** 핵심 근거 — LLM에 주입되는 본문. 답변은 이 범위를 벗어날 수 없다. */
  claim: string;
  /** 답변에 활용할 내용 — 이 근거를 어떤 행동 제안으로 바꿀지 */
  usage: string;
  /** ⚠️ 주의사항 — 프롬프트에 '금지사항'으로 그대로 주입되는 가드레일 */
  caution: string;
  /** 출처 URL (선택) — 사용자에게 노출할 경우 사용 */
  url?: string;
};

export const EVIDENCE: Evidence[] = [
  {
    id: "R1",
    situations: ["A7", "A59"],
    topic: "장시간 컴퓨터 작업과 미세 휴식",
    sourceTitle: "Computer Workstations: Work Process and Recognition",
    publisher: "U.S. Occupational Safety and Health Administration (OSHA)",
    year: "확인 2026",
    claim:
      "장시간의 정적 자세와 반복 작업은 목, 어깨 등 국소 피로를 높일 수 있으며, 짧고 잦은 휴식과 자세 변화가 회복에 도움이 된다. OSHA eTool은 컴퓨터 작업 매시간 5분 정도 화면에서 벗어나도록 제안한다.",
    usage: "60분 연속 공부 뒤 5분간 일어나 걷거나 가볍게 움직이도록 제안한다.",
    caution:
      "직업성 인간공학 안내이며 개인의 질환을 진단하는 자료가 아니다. 통증이 심하거나 지속되는 경우에 대한 진료 지시는 별도 안전 규칙으로 처리한다.",
  },
  {
    id: "R2",
    situations: ["A7", "A59"],
    topic: "좌식 행동과 신체활동",
    sourceTitle: "WHO Guidelines on Physical Activity and Sedentary Behaviour",
    publisher: "World Health Organization (WHO)",
    year: "2020",
    claim:
      "성인은 좌식 행동 시간을 제한하고 가능한 범위에서 신체활동으로 대체해야 하며, 적은 양의 움직임도 전혀 하지 않는 것보다 낫다.",
    usage: "오래 앉아 공부한 뒤 짧게라도 일어나 움직이도록 권한다.",
    caution:
      "WHO 자료는 '매시간 5분' 같은 정확한 휴식 간격을 정하지 않는다. 구체적인 60분/5분 조건은 R1과 앱 운영 기준으로 함께 사용해야 한다.",
  },
  {
    id: "R3",
    situations: ["A6", "A56"],
    topic: "디지털 눈 피로와 화면 휴식",
    sourceTitle:
      "Healthy Vision Month Social Media Library – Digital Eye Strain and Screen Time Tips",
    publisher: "National Eye Institute, U.S. National Institutes of Health (NEI/NIH)",
    year: "2026",
    claim:
      "화면을 오래 보면 눈이 피로해질 수 있으며, 20분마다 20초 동안 약 20피트(약 6m) 떨어진 곳을 보는 20-20-20 휴식법을 안내한다.",
    usage: "웹앱 내 화면 사용 20분 후 20초 동안 약 6m 밖을 보도록 제안한다.",
    caution:
      "눈 질환의 치료법으로 표현하지 않는다. 증상이 지속되거나 시력 변화가 있으면 일반 알림이 아닌 별도의 의료 안전 안내가 필요하다.",
  },
  {
    id: "R4",
    situations: ["A23", "A55", "A60"],
    topic: "성인 권장 수면 시간",
    sourceTitle: "About Sleep",
    publisher: "U.S. Centers for Disease Control and Prevention (CDC)",
    year: "2024",
    claim:
      "CDC는 18~60세 성인에게 하루 7시간 이상의 수면을 권장하며, 충분한 수면과 수면의 질이 건강에 중요하다고 설명한다.",
    usage:
      "수면이 7시간 미만이거나 심하게 졸린다고 입력한 사용자가 밤샘으로 새 범위를 늘리지 않고 수면 시간을 확보하도록 안내한다.",
    caution:
      "개인별 필요 수면 시간은 다를 수 있다. 불면이나 과도한 졸림이 지속되는 경우는 의료진 상담이 필요할 수 있음을 별도 규칙으로 둔다.",
  },
  {
    id: "R5",
    situations: ["A24"],
    topic: "카페인의 수면 영향",
    sourceTitle: "Caffeine",
    publisher: "European Food Safety Authority (EFSA)",
    year: "2015",
    claim:
      "일부 성인은 취침에 가까운 시간에 카페인 100mg을 섭취해도 수면 시간과 수면 양상이 영향을 받을 수 있다.",
    usage:
      "취침에 가까운 시간에는 카페인을 추가로 마시기보다 물이나 무카페인 음료를 고르도록 안내한다.",
    caution:
      "100mg을 모든 사람에게 동일한 기준으로 적용하지 않는다. 카페인 민감도, 임신, 복용 약물과 건강 상태에 따라 영향이 다르다.",
  },
  {
    id: "R6",
    situations: ["A24", "A57"],
    topic: "카페인 섭취량과 개인차",
    sourceTitle: "Spilling the Beans: How Much Caffeine is Too Much?",
    publisher: "U.S. Food and Drug Administration (FDA)",
    year: "확인 2026",
    claim:
      "FDA는 대부분의 성인에서 하루 400mg까지는 일반적으로 부정적 영향과 연관되지 않는 양으로 소개하지만, 카페인 민감도와 제거 속도에는 큰 개인차가 있다고 설명한다. 과도한 섭취는 좋지 않다.",
    usage:
      "카페인을 공부를 위한 무조건적 해결책으로 권하지 않고, 취침이 가까우면 추가 섭취를 피하도록 한다.",
    caution:
      "400mg을 권장량이나 모든 사람에게 안전한 상한으로 표현하지 않는다. 임신/수유, 특정 질환/약물 복용자는 의료진과 상의가 필요하다.",
  },
  {
    id: "R7",
    situations: ["A52"],
    topic: "스트레스 상황의 짧은 자기조절",
    sourceTitle: "Doing What Matters in Times of Stress: An Illustrated Guide",
    publisher: "World Health Organization (WHO)",
    year: "2020",
    claim:
      "WHO는 스트레스에 대처하기 위한 실용적 자기관리 기술로 현재 감각과 주변에 주의를 돌리는 그라운딩 등을 제시하며, 짧은 시간에 연습할 수 있다고 설명한다.",
    usage:
      "스트레스가 높다고 입력한 사용자가 주변에서 보이는 것과 신체 감각을 짧게 확인한 뒤 공부 목표를 5분으로 줄이도록 안내한다.",
    caution:
      "일반적 스트레스 관리 자료이며 불안장애 등 질환을 진단하거나 치료하는 답변으로 사용하지 않는다. 극심한 고통, 자해 위험 등의 표현은 별도 안전 대응으로 넘긴다.",
  },
  {
    id: "R8",
    situations: ["A53", "A54"],
    topic: "컴퓨터 작업의 중립 자세",
    sourceTitle: "Computer Workstations eTool: Good Working Positions",
    publisher: "U.S. Occupational Safety and Health Administration (OSHA)",
    year: "확인 2026",
    claim:
      "OSHA는 머리와 몸통을 정렬하고 어깨를 이완하며, 손/손목/전완을 일직선에 가깝게 두는 중립 자세가 근육/힘줄/골격의 부담을 줄이는 데 도움이 된다고 설명한다.",
    usage:
      "목이나 어깨 또는 손목 불편감이 있을 때 작업을 잠시 멈추고 머리, 어깨, 손목의 중립 자세를 점검하도록 안내한다.",
    caution:
      "직업성 인간공학 안내이며 통증 원인을 진단하지 않는다. 통증, 저림이 반복되거나 악화될 때는 계속 사용하도록 권하지 말고 의료진 확인을 안내한다.",
  },
  {
    id: "R9",
    situations: ["A53", "A54", "A59"],
    topic: "컴퓨터 작업의 불편감과 짧은 휴식",
    sourceTitle: "Office Environments and Your Safety",
    publisher: "National Institute for Occupational Safety and Health (NIOSH), U.S. CDC",
    year: "확인 2026",
    claim:
      "NIOSH는 오래 앉거나 서 있거나 어색한 자세를 피하도록 작업 환경을 조정해야 하며, 컴퓨터 작업에서 매시간 짧은 휴식이 불편감 감소에 도움이 될 수 있다고 설명한다.",
    usage:
      "오랜 공부나 불편감 입력 시 같은 자세와 입력 작업을 끊고 일어나 움직이며, 작업 환경과 자세를 조정하도록 제안한다.",
    caution:
      "직장 환경 연구를 학생 공부 상황에 일반화하는 자료다. 정확한 치료법이나 모든 사람에게 동일한 휴식 간격으로 표현하지 않는다.",
  },
  {
    id: "R10",
    situations: ["A55", "A60"],
    topic: "수면 부족과 학습 집중 기능",
    sourceTitle: "Sleep Deprivation and Deficiency: How Sleep Affects Your Health",
    publisher: "National Heart, Lung, and Blood Institute (NHLBI), U.S. NIH",
    year: "2022",
    claim:
      "수면 부족은 학습, 집중, 기억, 판단과 반응에 문제를 일으킬 수 있고, 여러 날 수면이 부족하면 수행 저하와 실수가 누적될 수 있다.",
    usage:
      "밤샘을 계획하거나 여러 날 수면 부족이 반복된 사용자에게 새 범위를 늘리기보다 복습 범위를 제한하고 수면 시간을 확보하도록 안내한다.",
    caution:
      "개인의 상태를 진단하지 않는다. 특정 시간의 수면이 성적을 보장한다고 표현하지 말고, 지속적인 과도한 졸림이나 수면 문제는 의료진 상담이 필요할 수 있음을 별도로 안내한다.",
  },
  {
    id: "R11",
    situations: ["A58"],
    topic: "응급상황 경고 신호",
    sourceTitle: "Recognizing Medical Emergencies",
    publisher: "MedlinePlus, U.S. National Library of Medicine",
    year: "확인 2026",
    claim:
      "호흡곤란, 지속되는 가슴 통증/불편감, 실신/의식 소실, 의식 상태 변화 등은 즉시 의료 도움을 받아야 할 수 있는 응급 경고 신호로 제시된다.",
    usage:
      "갑작스럽고 심한 증상을 입력하면 공부를 즉시 중단하고 혼자 버티지 않도록 하며 주변 사람과 응급 도움을 연결한다.",
    caution:
      "증상만으로 질환을 추정하지 않는다. 응급 가능성이 있는 상황에서 스트레칭/휴식/공부 재개를 먼저 권하지 않는다.",
  },
  {
    id: "R12",
    situations: ["A58"],
    topic: "대한민국 119 구급신고",
    sourceTitle: "119 구급신고 요령",
    publisher: "대한민국 소방청",
    year: "확인 2026",
    claim:
      "소방청은 환자가 발생하면 119에 알리고 위치, 아픈 부위와 상황, 의식, 호흡 여부, 나이, 지병, 복용약 등을 전달하며 전화를 끊지 않고 의료지도를 받도록 안내한다.",
    usage:
      "응급 증상 입력 시 사용자에게 주변에 알리고 119에 연락하도록 하며, 신고 시 위치와 의식, 호흡 상태를 전달하도록 안내한다.",
    caution:
      "대한민국 사용자를 전제로 한 안내다. 해외 사용자는 현지 응급전화로 대체해야 하며, 앱이 응급의료기관을 대신할 수 없음을 명확히 한다.",
  },
];

/* ---------- 인덱스 ---------- */
const BY_ID = new Map<EvidenceId, Evidence>(EVIDENCE.map((e) => [e.id, e]));

export function evidenceById(id: EvidenceId): Evidence | undefined {
  return BY_ID.get(id);
}

/** 근거 ID 목록 → Evidence[] (없는 ID는 조용히 버림) */
export function evidenceByIds(ids: readonly EvidenceId[]): Evidence[] {
  return ids.map((id) => BY_ID.get(id)).filter((e): e is Evidence => !!e);
}
