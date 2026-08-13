/* =====================================================================
 *  Do-Otter · 통합 RAG 근거자료 코퍼스 (R1~R38)
 *  ─────────────────────────────────────────────────────────────────────
 *  R1~R12는 건강·안전, R13~R38은 학습·계획·집중·습관 근거다.
 *  상황별 매핑을 사람이 검수하고, 검색 단계에서는 그 안전한 후보군 안에서만
 *  사용자 질의와 관련도가 높은 근거를 고른다.
 *
 *  ⚠️ 이 파일은 사람이 검수한 내용만 들어간다. LLM이 여기 없는 효과나
 *     수치를 지어내지 않도록 생성 단계에서 claim 밖 내용을 금지한다.
 *
 *  ⚠️ 이 파일은 서버(app/api/*)에서만 import 된다.
 * ===================================================================== */

import type { SituationId } from "./situations";

export const EVIDENCE_IDS = [
  "R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "R10",
  "R11", "R12", "R13", "R14", "R15", "R16", "R17", "R18", "R19", "R20",
  "R21", "R22", "R23", "R24", "R25", "R26", "R27", "R28", "R29", "R30",
  "R31", "R32", "R33", "R34", "R35", "R36", "R37", "R38",
] as const;

export type EvidenceId = (typeof EVIDENCE_IDS)[number];

export type EvidenceDomain =
  | "health"
  | "safety"
  | "learning"
  | "productivity"
  | "focus"
  | "habit";

export type EvidenceLevel =
  | "guideline"
  | "systematic-review"
  | "meta-analysis"
  | "review"
  | "randomized-trial"
  | "primary-study";

export type Evidence = {
  id: EvidenceId;
  /** 관련 상황 ID — 사람이 확정한 매핑. 검색 대신 이 필드로 룩업한다. */
  situations: SituationId[];
  /** 주제 */
  topic: string;
  /** 검색·필터용 도메인과 키워드 */
  domain?: EvidenceDomain;
  tags?: string[];
  /** 근거 설계 수준. 연구의 품질을 자동 보증하는 값은 아니다. */
  evidenceLevel?: EvidenceLevel;
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
  {
    id: "R13",
    situations: ["A16", "A17", "A28"],
    topic: "효과적인 학습기법의 비교",
    domain: "learning",
    tags: ["시험계획", "인출연습", "분산학습", "복습", "오답"],
    evidenceLevel: "review",
    sourceTitle: "Improving Students' Learning With Effective Learning Techniques",
    publisher: "Psychological Science in the Public Interest",
    year: "2013",
    claim:
      "10가지 학습기법을 폭넓게 검토한 결과, 연습시험과 분산학습은 다양한 학습 조건에서 높은 활용도를 보였다. 반면 밑줄 긋기와 단순 재독은 전반적 활용도가 낮게 평가됐다.",
    usage:
      "시험 계획을 단순 읽기 위주로 채우지 않고, 자료를 덮고 답해 보는 인출 연습과 날짜를 나눈 복습을 포함하도록 제안한다.",
    caution:
      "모든 과목과 학습목표에 동일한 방법이 최선이라는 뜻은 아니다. 이해가 부족한 새 내용에는 설명과 예시 학습이 먼저 필요할 수 있다.",
    url: "https://doi.org/10.1177/1529100612453266",
  },
  {
    id: "R14",
    situations: ["A16", "A17", "A28"],
    topic: "교실 환경의 인출 연습",
    domain: "learning",
    tags: ["퀴즈", "자기시험", "인출연습", "피드백", "오답"],
    evidenceLevel: "meta-analysis",
    sourceTitle: "Testing (quizzing) boosts classroom learning: A systematic and meta-analytic review",
    publisher: "Psychological Bulletin",
    year: "2021",
    claim:
      "222개 연구와 48,478명의 자료를 종합했을 때, 교실에서의 퀴즈와 인출 연습은 다시 읽기 등 비교 조건보다 학업 성취를 중간 정도 향상시켰다. 효과는 피드백, 반복 횟수, 시험 형식과 자료의 일치 등에 따라 달라졌다.",
    usage:
      "핵심 내용을 보지 않고 짧게 답한 뒤 정답과 오답을 확인하는 복습 구간을 일정에 넣도록 제안한다.",
    caution:
      "인출 시도만 반복하고 오답을 방치하지 않는다. 이해·추론처럼 단순 회상과 다른 목표에는 설명, 문제 해결과 피드백을 함께 사용한다.",
    url: "https://pubmed.ncbi.nlm.nih.gov/33683913/",
  },
  {
    id: "R15",
    situations: ["A16", "A17", "A28"],
    topic: "분산학습과 복습 간격",
    domain: "learning",
    tags: ["분산학습", "간격반복", "시험계획", "장기기억"],
    evidenceLevel: "meta-analysis",
    sourceTitle: "Distributed practice in verbal recall tasks: A review and quantitative synthesis",
    publisher: "Psychological Bulletin",
    year: "2006",
    claim:
      "184편의 논문에 포함된 317개 실험을 분석한 결과, 학습을 한 번에 몰아서 반복하는 것보다 시간 간격을 둔 학습이 장기 기억에 유리했다. 유리한 학습 간격은 최종적으로 기억해야 하는 기간과 함께 달라졌다.",
    usage:
      "남은 학습 범위를 하루에 몰지 않고 시험 전 여러 날에 걸쳐 다시 만나도록 일정을 나눈다.",
    caution:
      "모든 사용자에게 적용되는 고정 간격을 제시하지 않는다. 시험까지 남은 기간, 과목, 현재 숙련도에 맞춰 간격을 조정한다.",
    url: "https://pubmed.ncbi.nlm.nih.gov/16719566/",
  },
  {
    id: "R16",
    situations: ["A16", "A17"],
    topic: "실제 수업 맥락의 분산학습",
    domain: "learning",
    tags: ["분산학습", "교실", "시험대비", "복습"],
    evidenceLevel: "meta-analysis",
    sourceTitle: "The Distributed Practice Effect on Classroom Learning: A Meta-Analytic Review of Applied Research",
    publisher: "Behavioral Sciences",
    year: "2025",
    claim:
      "실제 교실 자료를 사용한 22개 보고서의 31개 효과크기를 종합했을 때, 하루 이상 간격을 둔 분산학습이 몰아 학습보다 기억 유지에 중간 정도 유리했다.",
    usage:
      "시험 전 남은 날짜가 허용한다면 같은 핵심 범위를 서로 다른 날에 다시 확인하도록 계획한다.",
    caution:
      "포함 연구 수와 과목 구성이 제한적이므로 정확한 효과크기를 개인에게 보장하지 않는다. 시험 전날처럼 시간이 거의 없으면 간격을 새로 만들 수 없다는 점도 고려한다.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12189222/",
  },
  {
    id: "R17",
    situations: ["A16", "A17"],
    topic: "교차 연습의 적용 조건",
    domain: "learning",
    tags: ["교차연습", "문제풀이", "수학", "범주구별", "시험대비"],
    evidenceLevel: "meta-analysis",
    sourceTitle: "Similarity matters: A meta-analysis of interleaved learning and its moderators",
    publisher: "Psychological Bulletin",
    year: "2019",
    claim:
      "59개 연구를 종합한 결과, 서로 다른 유형을 섞어 연습하는 교차 연습은 전체적으로 중간 정도 효과가 있었지만 자료 유형에 따라 차이가 컸다. 수학 과제에는 작은 이점이 있었으나 설명문에는 효과가 불명확했고 단어 학습에는 묶음 연습이 더 유리했다.",
    usage:
      "유사한 문제 유형을 구별해야 하는 수학·문제풀이에서는 유형을 적절히 섞되, 암기 단어와 설명문에는 자동 적용하지 않는다.",
    caution:
      "교차 연습을 모든 과목의 보편적 원칙으로 표현하지 않는다. 기본 풀이를 아직 모르는 단계에서는 한 유형의 예시와 연습이 먼저 필요할 수 있다.",
    url: "https://pubmed.ncbi.nlm.nih.gov/31556629/",
  },
  {
    id: "R18",
    situations: ["A15", "A28", "A31", "A40", "A41"],
    topic: "메타인지와 자기조절학습",
    domain: "learning",
    tags: ["계획", "점검", "회고", "자기조절", "학습전략"],
    evidenceLevel: "guideline",
    sourceTitle: "Metacognition and Self-Regulated Learning",
    publisher: "Education Endowment Foundation (EEF)",
    year: "2025",
    claim:
      "EEF는 학습자가 과제와 자신의 강·약점, 사용할 전략을 인식하고 학습을 계획·점검·평가하도록 명시적으로 지원할 것을 권고한다. 전략은 특정 과목과 실제 과제 안에 연결할 때 더 효과적일 수 있다.",
    usage:
      "주간 기록이나 미완료 일정을 보여 준 뒤 무엇이 막혔는지 한 가지를 고르고, 다음 계획에서 바꿀 전략을 구체화하도록 돕는다.",
    caution:
      "공부시간만으로 이해도나 학습전략의 질을 단정하지 않는다. 사용자에게 확인 질문을 하고 실제 과목과 과제에 맞춰 제안한다.",
    url: "https://educationendowmentfoundation.org.uk/education-evidence/guidance-reports/metacognition",
  },
  {
    id: "R19",
    situations: ["A2", "A3", "A14", "A18", "A29", "A50", "A51"],
    topic: "실행의도와 시작 계획",
    domain: "productivity",
    tags: ["미루기", "시작", "실행계획", "언제", "어디서", "if-then"],
    evidenceLevel: "review",
    sourceTitle: "Implementation Intentions",
    publisher: "U.S. National Cancer Institute",
    year: "확인 2026",
    claim:
      "실행의도는 '상황 Y가 오면 행동 Z를 한다'처럼 기회나 장애물과 목표 행동을 연결하는 if-then 계획이다. 이런 계획은 의도를 실제 행동으로 옮기는 데 도움을 줄 수 있으며, 목표가 분명하고 활성화돼 있을 때 더 잘 작동한다.",
    usage:
      "막연히 공부하겠다는 다짐 대신 시작 시각·장소·첫 행동을 연결한 한 문장 계획을 만들도록 제안한다.",
    caution:
      "if-then 계획이 동기, 시간, 필요한 자료의 부족을 자동으로 해결한다고 말하지 않는다. 실행 가능한 목표와 함께 사용한다.",
    url: "https://dccps.nci.nih.gov/BRP/constructs/implementation_intentions/goal_intent_attain.pdf",
  },
  {
    id: "R20",
    situations: ["A4", "A15", "A31", "A34"],
    topic: "목표 설정과 행동 변화",
    domain: "productivity",
    tags: ["구체적목표", "목표난이도", "행동변화", "계획", "재설정"],
    evidenceLevel: "meta-analysis",
    sourceTitle: "Unique effects of setting goals on behavior change: Systematic review and meta-analysis",
    publisher: "Journal of Consulting and Clinical Psychology",
    year: "2017",
    claim:
      "141편의 무작위 연구에서 목표 설정은 다양한 행동 변화에 작지만 긍정적인 고유 효과를 보였다. 효과는 목표의 난이도와 공개 여부, 집단 목표 여부 등 조건에 따라 달라졌다.",
    usage:
      "'공부하기'처럼 모호한 목표를 문제 수, 페이지, 결과물처럼 완료 여부를 확인할 수 있는 단위로 바꾼다.",
    caution:
      "무조건 어려운 목표를 강요하지 않는다. 시간과 숙련도에 비해 비현실적인 목표는 조정하고, 사용자가 목표를 받아들일 수 있어야 한다.",
    url: "https://pubmed.ncbi.nlm.nih.gov/29189034/",
  },
  {
    id: "R21",
    situations: ["A4", "A11", "A31", "A51"],
    topic: "구체적 목표와 피드백",
    domain: "productivity",
    tags: ["구체적목표", "단기목표", "피드백", "집중", "실행전략"],
    evidenceLevel: "review",
    sourceTitle: "Locke's theory of goal setting",
    publisher: "American Psychological Association Dictionary of Psychology",
    year: "2018",
    claim:
      "목표설정 이론은 모호한 목표보다 구체적 목표가 활동을 더 잘 이끌며, 장기 목표를 위해 단기 목표를 사용할 수 있다고 설명한다. 목표가 작동하려면 진행 상황에 대한 적시 피드백과 행동 전략이 필요하다.",
    usage:
      "집중이 흐려졌을 때 다음 구간에서 끝낼 한 가지 결과와 확인 시점을 정하도록 돕는다.",
    caution:
      "구체적이라는 이유만으로 목표 달성이 보장된다고 말하지 않는다. 복잡하고 새로운 과제에는 학습목표와 전략 탐색이 먼저일 수 있다.",
    url: "https://dictionary.apa.org/lockes-theory-of-goal-setting",
  },
  {
    id: "R22",
    situations: ["A12", "A13", "A35", "A40", "A41"],
    topic: "진행 상황 기록과 목표 달성",
    domain: "productivity",
    tags: ["진행점검", "기록", "회고", "목표달성", "피드백"],
    evidenceLevel: "meta-analysis",
    sourceTitle: "Does Monitoring Goal Progress Promote Goal Attainment?",
    publisher: "Psychological Bulletin",
    year: "2016",
    claim:
      "138개 연구와 19,951명의 자료를 종합했을 때, 진행 상황 점검을 늘리는 개입은 목표 달성을 향상시켰다. 결과를 실제로 기록하거나 보고할 때 효과가 더 큰 경향이 있었다.",
    usage:
      "공부시간만 칭찬하지 않고 완료 범위와 계획 대비 진행을 기록한 뒤, 다음에 조정할 행동 하나를 고른다.",
    caution:
      "점검 횟수를 과도하게 늘려 공부 자체를 방해하지 않는다. 기록은 평가나 자책이 아니라 다음 조정을 위한 정보로 사용한다.",
    url: "https://eprints.whiterose.ac.uk/id/eprint/91437/",
  },
  {
    id: "R23",
    situations: ["A15", "A16", "A28", "A30", "A40", "A41"],
    topic: "시간관리와 학업·웰빙",
    domain: "productivity",
    tags: ["시간관리", "우선순위", "일정", "학업성과", "웰빙"],
    evidenceLevel: "meta-analysis",
    sourceTitle: "Does time management work? A meta-analysis",
    publisher: "PLOS ONE",
    year: "2021",
    claim:
      "158개 연구와 53,957명의 자료를 종합한 결과, 시간관리는 학업성취·업무수행·웰빙과 중간 정도 관련됐고 고통감과는 부적 관련을 보였다. 웰빙과의 관련성이 수행과의 관련성보다 더 크게 나타났다.",
    usage:
      "남은 일을 전부 밀어 넣기보다 중요한 과제를 고르고, 실제 가능한 시간에 맞춰 일정을 재배치하도록 돕는다.",
    caution:
      "대부분의 결과가 상관관계를 포함하므로 시간관리가 성적 향상을 직접 보장한다고 말하지 않는다. 개인의 여건과 과제 난이도를 함께 고려한다.",
    url: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0245066",
  },
  {
    id: "R24",
    situations: ["A3", "A14", "A18", "A29", "A30", "A34", "A51"],
    topic: "미루기 개입의 효과와 한계",
    domain: "productivity",
    tags: ["미루기", "과제시작", "목표축소", "자기조절", "마감"],
    evidenceLevel: "meta-analysis",
    sourceTitle: "Targeting Procrastination Using Psychological Treatments",
    publisher: "Frontiers in Psychology",
    year: "2018",
    claim:
      "12개 무작위 연구를 종합했을 때 미루기를 겨냥한 심리 개입은 전체적으로 작지만 유의한 이점이 있었고 연구 간 차이가 컸다. 인지행동 접근의 하위 분석은 중간 정도 효과를 보였으나 포함 연구가 적었다.",
    usage:
      "미루기를 성격 문제로 단정하지 않고, 과제의 첫 단계를 작게 만들거나 방해 요인과 실행 시점을 구체화하는 선택지를 제공한다.",
    caution:
      "앱의 짧은 알림을 심리치료와 동일시하지 않는다. 지속적이고 심각한 어려움이나 정신건강 문제를 진단·치료한다고 표현하지 않는다.",
    url: "https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2018.01588/full",
  },
  {
    id: "R25",
    situations: ["A19", "A20", "A21", "A22", "A44"],
    topic: "스마트폰 알림의 주의 비용",
    domain: "focus",
    tags: ["스마트폰", "알림", "방해앱", "주의", "집중"],
    evidenceLevel: "primary-study",
    sourceTitle: "The attentional cost of receiving a cell phone notification",
    publisher: "Journal of Experimental Psychology: Human Perception and Performance",
    year: "2015",
    claim:
      "실험에서 휴대전화 알림을 받는 것만으로도 기기를 직접 확인하지 않은 상태에서 주의가 필요한 과제 수행이 유의하게 방해됐다.",
    usage:
      "집중 구간에는 방해 앱을 닫고 불필요한 알림을 잠시 끄거나 모아서 확인하도록 제안한다.",
    caution:
      "단일 실험 결과를 모든 사용자와 실제 공부 성과에 그대로 일반화하지 않는다. 앱에서 정한 3분·10분 임계값의 효과를 입증하는 자료도 아니다.",
    url: "https://pubmed.ncbi.nlm.nih.gov/26121498/",
  },
  {
    id: "R26",
    situations: ["A11", "A19", "A20", "A21", "A22", "A44", "A51"],
    topic: "멀티태스킹과 과제 전환 비용",
    domain: "focus",
    tags: ["멀티태스킹", "과제전환", "방해", "단일과제", "집중"],
    evidenceLevel: "review",
    sourceTitle: "Multitasking: Switching costs",
    publisher: "American Psychological Association",
    year: "2006",
    claim:
      "과제 전환 실험에서는 두 과제를 번갈아 수행할 때 반복 수행보다 시간이 더 걸렸고, 과제가 복잡하거나 익숙하지 않을수록 전환 비용이 커졌다. 준비 시간을 줘도 비용이 완전히 사라지지는 않았다.",
    usage:
      "다음 공부 구간에는 한 과제만 남기고, 방해 앱에서 돌아올 때 직전에 하던 위치와 다음 한 행동을 명시한다.",
    caution:
      "사람이 어떤 상황에서도 두 활동을 동시에 할 수 없다고 과장하지 않는다. 제품의 차단 임계값 자체를 연구 결과로 표현하지 않는다.",
    url: "https://www.apa.org/topics/research/multitasking",
  },
  {
    id: "R27",
    situations: ["A19", "A20", "A21", "A22", "A44"],
    topic: "모바일 인터넷 제한과 지속주의",
    domain: "focus",
    tags: ["스마트폰차단", "모바일인터넷", "지속주의", "디지털웰빙"],
    evidenceLevel: "randomized-trial",
    sourceTitle: "Blocking mobile internet on smartphones improves sustained attention, mental health, and subjective well-being",
    publisher: "PNAS Nexus",
    year: "2025",
    claim:
      "사전등록 무작위 교차시험에서 2주 동안 스마트폰의 모바일 인터넷을 차단했을 때 스마트폰 사용이 줄고 객관적으로 측정한 지속주의와 주관적 웰빙이 개선됐다.",
    usage:
      "반복 이탈이 있는 사용자가 원할 경우 다음 공부 구간에 한해 인터넷이나 특정 앱 접근을 제한하는 선택지를 제안한다.",
    caution:
      "2주간 모바일 인터넷 전체를 제한한 연구이므로 특정 앱을 몇 분 차단하는 효과와 동일시하지 않는다. 정신건강 치료 효과로 홍보하지 않는다.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11834938/",
  },
  {
    id: "R28",
    situations: ["A5", "A9", "A10"],
    topic: "짧은 휴식과 피로·수행",
    domain: "focus",
    tags: ["미세휴식", "피로", "활력", "집중", "휴식"],
    evidenceLevel: "meta-analysis",
    sourceTitle: "Give me a break! A systematic review and meta-analysis on the efficacy of micro-breaks",
    publisher: "PLOS ONE",
    year: "2022",
    claim:
      "22개 표본을 종합한 결과 10분 이하의 짧은 휴식은 활력을 높이고 피로를 낮추는 작은 효과가 있었다. 전체 수행 향상 효과는 유의하지 않았고, 고난도 인지 과제에서는 더 긴 회복이 필요할 수 있었다.",
    usage:
      "집중이 흐려지거나 피로하면 짧은 휴식을 선택하게 하되, 집중이 유지되는 사용자에게 일률적으로 작업을 끊도록 강제하지 않는다.",
    caution:
      "35분, 1분, 5분 같은 앱의 시점을 보편적인 최적 집중·휴식 시간으로 표현하지 않는다. 휴식이 항상 성과를 높인다고 보장하지 않는다.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9432722/",
  },
  {
    id: "R29",
    situations: ["A19", "A20", "A21", "A22", "A44"],
    topic: "푸시 알림과 과제 수행",
    domain: "focus",
    tags: ["푸시알림", "Go-NoGo", "방해", "스마트폰", "집중"],
    evidenceLevel: "primary-study",
    sourceTitle: "An Analysis of the Effects of Smartphone Push Notifications on Task Performance",
    publisher: "Computational Intelligence and Neuroscience",
    year: "2016",
    claim:
      "Go/No-Go 과제 실험에서 스마트폰 푸시 알림은 과제 수행과 관련된 행동·뇌파 지표에 부정적 영향을 보였고, 과다사용 위험군에서는 후속 수행에도 영향이 관찰됐다.",
    usage:
      "집중 세션 중 불필요한 푸시 알림을 줄이는 환경 설정을 선택지로 제공한다.",
    caution:
      "소규모 실험의 뇌파 결과를 학업성취나 개인의 뇌 기능에 대한 진단으로 확대하지 않는다. R25의 보조 근거로 사용한다.",
    url: "https://pubmed.ncbi.nlm.nih.gov/27366147/",
  },
  {
    id: "R30",
    situations: ["A18", "A37", "A38", "A39"],
    topic: "습관과 안정된 맥락의 반복",
    domain: "habit",
    tags: ["습관", "반복", "맥락", "루틴", "재시작"],
    evidenceLevel: "review",
    sourceTitle: "Psychology of Habit",
    publisher: "Annual Review of Psychology",
    year: "2016",
    claim:
      "습관 연구는 사람들이 목표를 추구하며 특정 맥락에서 같은 반응을 반복할 때 습관이 형성된다고 설명한다. 반복되는 맥락 단서는 행동을 더 자동적으로 이끌 수 있다.",
    usage:
      "연속 일수 자체보다 잘 지켜진 시간·장소·앞선 행동을 찾아 다음 공부를 같은 단서에 연결한다.",
    caution:
      "며칠 연속 수행했다는 사실만으로 습관이 완성됐다고 말하지 않는다. 반복 횟수와 자동화 속도에는 개인차가 있다.",
    url: "https://pubmed.ncbi.nlm.nih.gov/26361052/",
  },
  {
    id: "R31",
    situations: ["A18", "A37", "A38", "A39"],
    topic: "일상에서의 습관 형성 과정",
    domain: "habit",
    tags: ["습관형성", "연속기록", "누락", "반복", "자동화"],
    evidenceLevel: "primary-study",
    sourceTitle: "How are habits formed: Modelling habit formation in the real world",
    publisher: "European Journal of Social Psychology",
    year: "2010",
    claim:
      "참가자들이 같은 맥락에서 행동을 12주 반복했을 때 자동성은 점차 증가했지만 개인차가 컸다. 한 번의 수행 기회 누락은 습관 형성 과정에 실질적인 영향을 주지 않았다.",
    usage:
      "스트릭이 끊길 가능성을 겁주지 않고, 놓친 날이 있어도 다음 기회에 같은 단서로 재개하도록 안내한다.",
    caution:
      "연구의 18~254일 범위를 보편적인 습관 완성 기간으로 제시하지 않는다. 연구 행동이 공부 습관과 완전히 동일하다고 가정하지 않는다.",
    url: "https://doi.org/10.1002/ejsp.674",
  },
  {
    id: "R32",
    situations: ["A37", "A38", "A39"],
    topic: "습관 형성 기간의 개인차",
    domain: "habit",
    tags: ["습관기간", "개인차", "맥락안정성", "반복", "루틴"],
    evidenceLevel: "systematic-review",
    sourceTitle: "Time to Form a Habit: A Systematic Review and Meta-Analysis of Health Behaviour Habit Formation",
    publisher: "Healthcare",
    year: "2024",
    claim:
      "20개 건강행동 연구에서 습관 형성 기간은 사람과 행동에 따라 크게 달랐다. 반복 빈도, 안정된 맥락, 행동의 선택과 난이도 등이 습관 강도에 영향을 주는 요인으로 보고됐다.",
    usage:
      "고정된 며칠 목표보다 사용자가 지속 가능한 최소 행동과 반복할 맥락을 고르게 한다.",
    caution:
      "건강행동 중심 연구이며 상당수 연구의 비뚤림 위험이 높았다. 공부 습관에 정확한 형성 기간이나 효과크기를 적용하지 않는다.",
    url: "https://pubmed.ncbi.nlm.nih.gov/39685110/",
  },
  {
    id: "R33",
    situations: ["A45", "A46", "A47", "A48", "A49"],
    topic: "교육 게이미피케이션과 행동 변화",
    domain: "habit",
    tags: ["게이미피케이션", "레벨", "배지", "보상", "참여"],
    evidenceLevel: "meta-analysis",
    sourceTitle: "Effects of Gamification on Behavioral Change in Education: A Meta-Analysis",
    publisher: "International Journal of Environmental Research and Public Health",
    year: "2021",
    claim:
      "통제집단이 있는 교육 연구를 종합했을 때 게이미피케이션은 학습 행동에 중간 정도의 긍정적 효과를 보였다. 짧은 개입의 효과가 더 컸고, 장기간 적용에서는 효과가 약하거나 부정적인 결과도 관찰됐다.",
    usage:
      "레벨·업적·재화는 학습 행동을 보여 주는 짧은 피드백으로 사용하고, 실제 완료 범위와 다음 행동에 연결한다.",
    caution:
      "배지나 재화가 성적 또는 장기 습관을 보장한다고 말하지 않는다. 보상을 잃는다는 압박이나 사용자 간 과도한 비교를 사용하지 않는다.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8037535/",
  },
  {
    id: "R34",
    situations: ["A12", "A13", "A37", "A38", "A42", "A43", "A45", "A46", "A47", "A48", "A49"],
    topic: "칭찬의 내용과 내재적 동기",
    domain: "habit",
    tags: ["칭찬", "피드백", "동기", "전략", "과정"],
    evidenceLevel: "review",
    sourceTitle: "The effects of praise on children's intrinsic motivation: a review and synthesis",
    publisher: "Psychological Bulletin",
    year: "2002",
    claim:
      "칭찬은 언제나 같은 효과를 내지 않는다. 진실하게 받아들여지고, 통제 가능한 원인과 자율성·유능감을 지원하며 과도한 사회 비교를 피할 때 동기에 도움이 될 수 있다.",
    usage:
      "'천재야' 같은 사람 평가보다 실제로 완료한 범위, 사용한 전략, 다시 반복할 수 있는 행동을 구체적으로 짚는다.",
    caution:
      "아동 중심 문헌을 모든 연령에 그대로 일반화하지 않는다. 빈 칭찬이나 과장된 칭찬, 성적을 보장하는 표현을 피한다.",
    url: "https://pubmed.ncbi.nlm.nih.gov/12206194/",
  },
  {
    id: "R35",
    situations: ["A12", "A13", "A33", "A35", "A40", "A41", "A42", "A43"],
    topic: "학습 피드백의 효과와 내용",
    domain: "learning",
    tags: ["피드백", "진행률", "학습목표", "다음행동", "회고"],
    evidenceLevel: "meta-analysis",
    sourceTitle: "The Power of Feedback Revisited: A Meta-Analysis of Educational Feedback Research",
    publisher: "Frontiers in Psychology",
    year: "2020",
    claim:
      "435개 연구와 61,000명 이상의 자료를 종합했을 때 피드백은 학습에 중간 정도 효과가 있었지만 연구 간 차이가 컸다. 전달하는 정보의 내용이 효과를 크게 좌우했고, 인지·운동 결과에서 동기·행동 결과보다 영향이 컸다.",
    usage:
      "현재 기록을 목표와 비교하고 무엇이 완료됐는지, 다음에는 무엇을 바꿀지를 구체적으로 알려 준다.",
    caution:
      "모든 피드백이 긍정적이라고 가정하지 않는다. 단순 순위·사람 평가·막연한 칭찬보다 과제와 전략, 다음 행동에 관한 정보를 우선한다.",
    url: "https://pubmed.ncbi.nlm.nih.gov/32038429/",
  },
  {
    id: "R36",
    situations: ["A12", "A13", "A40"],
    topic: "효과적인 학습 피드백 지침",
    domain: "learning",
    tags: ["피드백", "학습격차", "목표", "다음단계", "형성평가"],
    evidenceLevel: "guideline",
    sourceTitle: "Teacher Feedback to Improve Pupil Learning",
    publisher: "Education Endowment Foundation (EEF)",
    year: "2021",
    claim:
      "EEF는 피드백을 학습 목표와 현재 수행 사이의 차이를 줄이기 위한 정보로 다루며, 모든 피드백이 긍정적 효과를 내는 것은 아니라고 강조한다. 학습 의도와 실제 학습 격차를 먼저 파악해야 한다.",
    usage:
      "완료 알림에서 결과만 축하하지 않고, 목표 대비 현재 위치와 바로 이어갈 다음 한 단계를 보여 준다.",
    caution:
      "교사가 학생에게 주는 피드백 지침을 앱 알림에 적용하는 것이므로, 앱 기록만으로 이해도와 오류 원인을 확정하지 않는다.",
    url: "https://educationendowmentfoundation.org.uk/education-evidence/guidance-reports/feedback",
  },
  {
    id: "R37",
    situations: ["A50"],
    topic: "개인화 알림과 앱 지속 사용",
    domain: "productivity",
    tags: ["알림", "개인화", "지속사용", "참여", "타이밍"],
    evidenceLevel: "systematic-review",
    sourceTitle: "Factors Influencing Adherence to mHealth Apps",
    publisher: "Journal of Medical Internet Research",
    year: "2022",
    claim:
      "99개 연구를 검토한 결과, 사용자 필요에 맞춘 내용, 개별화된 푸시 알림, 사용하기 쉬운 안정적 설계와 보조적 지원이 앱 지속 사용에 긍정적인 요인으로 보고됐다. 다만 다수 연구는 기간이 짧은 예비 연구였다.",
    usage:
      "알림을 반복해서 닫은 사용자의 알림 시간·빈도·내용을 이전 반응에 맞춰 줄이거나 다시 설정하도록 제안한다.",
    caution:
      "건강 앱의 지속 사용 연구를 학습 앱에 간접 적용한다. 개인화 알림이 반드시 공부 행동이나 성적을 높인다고 말하지 않는다.",
    url: "https://pubmed.ncbi.nlm.nih.gov/35612886/",
  },
  {
    id: "R38",
    situations: ["A50"],
    topic: "리마인더와 알림 피로",
    domain: "productivity",
    tags: ["알림피로", "리마인더", "참여", "빈도조절", "옵트아웃"],
    evidenceLevel: "systematic-review",
    sourceTitle: "Conceptualising engagement with digital behaviour change interventions",
    publisher: "Translational Behavioral Medicine",
    year: "2017",
    claim:
      "디지털 행동변화 개입 참여 문헌에서는 리마인더가 참여를 높일 수 있지만, 너무 많은 리마인더는 알림 피로 때문에 참여에 부정적 영향을 줄 수 있다고 정리한다.",
    usage:
      "사용자가 알림을 반복해서 닫으면 더 강하게 압박하지 않고, 빈도를 낮추거나 시간 재설정·일시 중지를 선택하게 한다.",
    caution:
      "가장 효과적인 알림 횟수를 고정 수치로 제시하지 않는다. 사용자가 원하지 않는 알림을 계속 보내도록 설계하지 않는다.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5526809/",
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
