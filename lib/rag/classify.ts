/* =====================================================================
 *  Do-Otter · 챗봇 자유 입력 → 상황 ID 분류
 *  ─────────────────────────────────────────────────────────────────────
 *  A51~A58만 대상. 나머지 상황(A1~A50, A59, A60)은 앱 이벤트로 직접
 *  트리거되므로 분류가 필요 없다.
 *
 *  순서:
 *    1) 응급 정규식 (retrieve.isEmergency) — 호출부에서 먼저 처리
 *    2) LLM 분류 1회 (temperature 0, 라벨만 출력)
 *    3) 실패/불명확 → null → 기존 일반 채팅 경로
 * ===================================================================== */

import { callDeepseek } from "../llm";
import { chatSituations, type SituationId } from "./situations";
import { CHAT_SITUATION_IDS } from "./situations";

const VALID = new Set<string>(CHAT_SITUATION_IDS);

function classifierPrompt(): string {
  const lines = chatSituations()
    .map((s) => `${s.id}: ${s.name} — ${s.trigger}`)
    .join("\n");
  return `너는 학습 앱 챗봇의 입력 분류기다. 사용자의 마지막 발화가 아래 상황 중 하나에 해당하는지 판단한다.

${lines}

규칙:
- 해당하는 상황이 있으면 그 ID만 출력한다. 예: A53
- 어디에도 명확히 해당하지 않으면 none 만 출력한다.
- 설명, 문장, 따옴표, 마침표를 쓰지 않는다. 오직 ID 또는 none.
- 애매하면 none을 고른다. 억지로 끼워 맞추지 않는다.
- 신체 증상이나 수면/카페인 언급이 없는 일반적인 공부 고민은 none이 아니라 A51인지 먼저 확인한다.`;
}

/**
 * 사용자 발화를 A51~A58 중 하나로 분류. 해당 없으면 null.
 * 실패(키 없음/네트워크/파싱)해도 throw 하지 않고 null을 반환한다 —
 * 분류 실패는 일반 채팅으로 흘러가면 되는 일이지 에러가 아니다.
 */
export async function classifySituation(
  userText: string
): Promise<SituationId | null> {
  const text = (userText ?? "").trim();
  if (!text) return null;
  try {
    const out = await callDeepseek(
      [
        { role: "system", content: classifierPrompt() },
        { role: "user", content: text },
      ],
      { maxTokens: 8, temperature: 0 }
    );
    const label = out.trim().toUpperCase().match(/A\d{1,2}/)?.[0];
    if (label && VALID.has(label)) return label as SituationId;
    return null;
  } catch {
    return null;
  }
}
