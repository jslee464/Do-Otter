/* =====================================================================
 *  Do-Otter · RAG 생성 단계 프롬프트
 *  ─────────────────────────────────────────────────────────────────────
 *  근거자료를 주입하고, 각 자료의 '주의사항'을 금지사항으로 묶는다.
 *  수달이 톤은 유지하되 의학 내용은 근거 밖으로 나갈 수 없게 한다.
 *
 *  ⚠️ lib/llm.ts 의 PERSONA에는 "의학적 단정은 피하고"가 들어 있어
 *     의학 답변과 충돌한다. 그래서 여기서는 PERSONA를 재사용하지 않고
 *     톤 규칙만 따로 정의한다.
 * ===================================================================== */

import type { OtterContext } from "../llm";
import type { Retrieved } from "./retrieve";

/** 수달이 말투 — 의학 경로에서도 유지되는 부분만 추림 */
const MEDICAL_TONE = `너는 'Do-Otter' 앱의 마스코트이자 공부 친구 '수달이'야.
- 갈색 수달 캐릭터. 따뜻하고 다정하게, 한국어 반말로 자연스럽게 말해.
- 이모지는 0~1개. 지금은 건강과 관련된 이야기니 과하게 들뜨지 않게.
- 겁주거나 다그치지 말고, 담백하고 침착하게 말해.`;

function evidenceBlock(r: Retrieved): string {
  if (r.evidence.length === 0) return "";
  const items = r.evidence
    .map(
      (e) =>
        `[${e.id}] ${e.claim}\n   └ 출처: ${e.publisher} 「${e.sourceTitle}」 (${e.year})`
    )
    .join("\n");
  return `[근거자료 — 아래 내용 안에서만 말할 것]
${items}`;
}

function cautionBlock(r: Retrieved): string {
  if (r.evidence.length === 0) return "";
  const items = r.evidence.map((e) => `- (${e.id}) ${e.caution}`).join("\n");
  return `[반드시 지킬 것 — 위반하면 안 되는 제약]
${items}
- 위 근거자료에 없는 의학 정보를 새로 만들어내지 않는다.
- 진단하지 않는다. "~인 것 같다", "~증상이다" 같은 표현을 쓰지 않는다.
- 특정 약물, 복용량, 영양제, 치료법을 권하지 않는다.
- 수치를 인용할 때는 근거자료에 적힌 그대로만 쓴다. 임의로 바꾸지 않는다.`;
}

/** 사용자 데이터 요약 (llm.ts의 contextBlock과 중복을 피하려 최소만) */
function userBlock(c: OtterContext): string {
  const near = c.nearestDday
    ? `${c.nearestDday.title} D-${c.nearestDday.dday}`
    : "없음";
  return `[사용자 데이터]
- 이름: ${c.username}, 레벨: Lv.${c.level}, 연속 공부: ${c.streak}일
- 오늘 순공: ${c.todayEffectiveMin}분, 오늘 방해앱: ${c.todayHarmfulMin}분
- 가장 임박한 D-day: ${near}`;
}

/**
 * 의학적 답변용 시스템 프롬프트.
 * 근거 + 주의사항 + 기대 후속행동 + 사용자 데이터를 결합한다.
 */
export function medicalSystemPrompt(r: Retrieved, c: OtterContext): string {
  const s = r.situation;
  return `${MEDICAL_TONE}

지금 상황: ${s.name}
개입 목적: ${s.purpose}

${evidenceBlock(r)}

${cautionBlock(r)}

[답변 지침]
- 아래 초안과 같은 내용을 전달하되, 사용자의 말투와 상황에 맞게 자연스럽게 다시 써.
  초안: "${s.template}"
- 사용자가 이어서 할 행동은 이거야: ${s.expectedAction}
- 2~4문장. 근거의 출처 기관명을 자연스럽게 한 번 언급해도 좋아 (예: "WHO 자료에 따르면").
- 공부를 계속하라고 몰아붙이지 말고, 지금 필요한 휴식이나 조치를 먼저 말해.

${userBlock(c)}`;
}

/**
 * 앱 이벤트로 트리거된 상황(A6, A7, A59 등)의 알람 문구 생성 프롬프트.
 * 채팅이 아니라 한 번에 내보내는 알람이므로 user 메시지도 함께 만든다.
 */
export function situationAlarmPrompt(
  r: Retrieved,
  c: OtterContext
): { system: string; user: string } {
  return {
    system: medicalSystemPrompt(r, c),
    user: `지금 "${r.situation.name}" 상황이야. 사용자에게 건넬 알람 문구를 말해줘.`,
  };
}
