/* =====================================================================
 *  Do-Otter · 통합 RAG 생성 프롬프트
 *  ─────────────────────────────────────────────────────────────────────
 *  건강·안전과 학습·생산성 근거를 같은 파이프라인에서 사용하되,
 *  의료 상황에는 더 강한 안전 제약을 추가한다.
 * ===================================================================== */

import type { OtterContext } from "../llm";
import type { Retrieved } from "./retrieve";

/** 슬롯 값이 없는 검수 템플릿도 사용자에게 중괄호 표식 없이 보여준다. */
export function normalizeTemplateText(text: string): string {
  return text.replace(/\{([^}]+)\}/g, (_match, label: string) => label.trim());
}

const COACH_TONE = `너는 'Do-Otter' 앱의 마스코트이자 공부 친구 '수달이'야.
- 따뜻하고 담백하게, 한국어 반말로 자연스럽게 말해.
- 이모지는 0~1개만 사용해.
- 사용자를 평가하거나 죄책감을 주지 말고, 관찰된 상황과 바꿀 수 있는 행동에 집중해.
- 동기부여 문구보다 지금 실행 가능한 다음 행동을 우선해.`;

const MEDICAL_TONE = `${COACH_TONE}
- 지금은 건강과 관련된 이야기니 과하게 들뜨지 말고 침착하게 말해.
- 공부를 계속하도록 몰아붙이지 말고 필요한 휴식·중단·도움 요청을 우선해.`;

function evidenceBlock(r: Retrieved): string {
  if (r.evidence.length === 0) return "";
  const items = r.evidence
    .map((evidence) => {
      const level = evidence.evidenceLevel
        ? ` / 근거유형: ${evidence.evidenceLevel}`
        : "";
      return `[${evidence.id}] ${evidence.claim}
   ├ 적용: ${evidence.usage}
   └ 출처: ${evidence.publisher} 「${evidence.sourceTitle}」 (${evidence.year}${level})`;
    })
    .join("\n");

  return `[검색된 근거 — 아래 내용 안에서만 사실을 말할 것]
${items}`;
}

function cautionBlock(r: Retrieved): string {
  if (r.evidence.length === 0) return "";
  const evidenceCautions = r.evidence
    .map((evidence) => `- (${evidence.id}) ${evidence.caution}`)
    .join("\n");
  const medicalRules = r.situation.medical
    ? `
- 사용자의 상태를 진단하거나 질환명을 추정하지 않는다.
- 특정 약물, 복용량, 영양제, 치료법을 권하지 않는다.
- 응급 가능성이 있으면 공부 조언보다 중단과 응급 도움을 우선한다.`
    : "";

  return `[반드시 지킬 제약]
${evidenceCautions}
- 검색된 근거에 없는 효과, 수치, 인과관계를 새로 만들지 않는다.
- 앱이 정한 5분·10분·35분 같은 임계값을 과학적으로 최적인 시간이라고 말하지 않는다.
- 성적, 생산성, 집중력 향상을 보장하지 않는다.
- 연속 기록이 끊기거나 계획에 실패한 사용자를 비난하지 않는다.${medicalRules}`;
}

function userBlock(c: OtterContext): string {
  const nearest = c.nearestDday
    ? `${c.nearestDday.title} D-${c.nearestDday.dday}`
    : "없음";
  const schedules = c.schedules?.length
    ? c.schedules
        .slice(0, 5)
        .map((schedule) => `${schedule.title}(D-${schedule.dday})`)
        .join(", ")
    : "등록된 일정 없음";

  return `[사용자 데이터]
- 이름: ${c.username}, 레벨: Lv.${c.level}, 연속 공부: ${c.streak}일
- 오늘 순공: ${c.todayEffectiveMin}분, 오늘 방해앱: ${c.todayHarmfulMin}분
- 최근 7일 순공: ${c.last7StudyMin}분, 방해앱: ${c.last7HarmfulCount}회/${c.last7HarmfulMin}분
- 가장 임박한 D-day: ${nearest}
- 일정: ${schedules}`;
}

/** 건강과 코칭을 모두 처리하는 근거 기반 시스템 프롬프트. */
export function groundedSystemPrompt(r: Retrieved, c: OtterContext): string {
  const situation = r.situation;
  const tone = situation.medical ? MEDICAL_TONE : COACH_TONE;
  const sourceInstruction = r.evidence.length
    ? "필요하면 출처 기관이나 연구를 자연스럽게 1회 언급하되, 논문 목록처럼 나열하지 마."
    : "출처나 연구를 임의로 언급하지 마.";

  return `${tone}

[현재 상황]
- 상황: ${situation.name}
- 개입 목적: ${situation.purpose}
- 기대 행동: ${situation.expectedAction}
- 검수 초안: "${normalizeTemplateText(situation.template)}"

${evidenceBlock(r)}

${cautionBlock(r)}

[답변 지침]
- 사용자의 마지막 말과 데이터를 먼저 반영하고, 검수 초안은 그대로 복사하지 말고 자연스럽게 고쳐 써.
- 중괄호 슬롯 표식은 절대 출력하지 말고, 정보가 없으면 해당 표현을 자연스럽게 일반화하거나 생략해.
- 관찰 또는 짧은 공감 → 근거에 맞는 이유 → 지금 할 한 가지 행동 순서로 답해.
- 2~4문장으로 짧게 답해. 실행에 꼭 필요한 정보가 없으면 추측하지 말고 짧은 확인 질문을 최대 1개 해.
- 여러 전략을 한꺼번에 나열하지 말고 지금 가장 적합한 행동 하나를 우선해.
- ${sourceInstruction}

${userBlock(c)}`;
}

export function groundedChatSystemPrompt(r: Retrieved, c: OtterContext): string {
  const base = groundedSystemPrompt(r, c);
  return `${base}

[Chat Pro RAG 답변 확장]
- 지금은 사용자가 Chat Pro에서 근거 기반 챗봇 답변을 요청한 상황이야.
- 검색된 근거가 여러 개 있으면 5~8문장까지 답해도 돼.
- 답변은 공감/요약 → 근거에서 나온 핵심 이유 2~3개 → 바로 할 행동 2~3개 순서로 자연스럽게 구성해.
- 출처는 길게 나열하지 말고, 필요한 경우 근거 기관이나 연구명을 짧게 묶어서 언급해.
- 단, 의료 관련 내용은 길어지더라도 진단·치료 단정 없이 안전 안내와 도움 요청을 우선해.`;
}

/** 기존 호출부 호환용. 의료 상황이 아닌 경우에도 통합 프롬프트를 사용한다. */
export function medicalSystemPrompt(r: Retrieved, c: OtterContext): string {
  return groundedSystemPrompt(r, c);
}

/** 앱 이벤트 알람 생성. 근거가 있는 상황은 모두 같은 통합 RAG 경로를 탄다. */
export function situationAlarmPrompt(
  r: Retrieved,
  c: OtterContext
): { system: string; user: string } {
  return {
    system: groundedSystemPrompt(r, c),
    user: `지금 "${r.situation.name}" 상황이 감지됐어. 사용자가 바로 행동할 수 있는 알람 문구만 말해줘.`,
  };
}
