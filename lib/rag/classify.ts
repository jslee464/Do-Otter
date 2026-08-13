/* =====================================================================
 *  Do-Otter · 챗봇 자유 입력 → 상황 ID 분류
 *  ─────────────────────────────────────────────────────────────────────
 *  사용자가 말로 직접 표현할 수 있는 학습·생산성 고민과 A51~A58 건강
 *  입력이 대상이다. 앱 상태만으로 판단해야 하는 상황은 제외한다.
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

type Rule = { id: SituationId; patterns: RegExp[] };

/**
 * 명확한 표현만 잡는 고정밀 규칙. 애매한 입력은 LLM 분류기로 넘긴다.
 * 건강/안전 표현을 먼저 두어 일반 집중 고민으로 잘못 낮추지 않는다.
 */
const CLASSIFICATION_RULES: Rule[] = [
  { id: "A52", patterns: [/스트레스|불안|초조|긴장.*공부|공부.*긴장/] },
  { id: "A53", patterns: [/(목|어깨).*(아프|통증|뻐근|결리|불편)/] },
  { id: "A54", patterns: [/(손목|손가락|손).*(아프|통증|저리|뻐근|불편)/] },
  { id: "A55", patterns: [/밤샘|밤을\s*새|안\s*자고\s*공부|수면.*[0-3]\s*시간/] },
  { id: "A56", patterns: [/(눈|시야).*(피로|아프|건조|흐려)|화면.*두통/] },
  { id: "A57", patterns: [/카페인.*(많|과다|400)|커피.*(많이|계속)|에너지\s*드링크.*(여러|계속)/] },
  { id: "A29", patterns: [/(과제|레포트|보고서|제출).*(내일|하루\s*남|24\s*시간).*(안\s*했|못\s*했|시작)/] },
  { id: "A30", patterns: [/(마감|제출).*(지났|넘겼|늦었)|기한.*지났/] },
  { id: "A17", patterns: [/(시험|고사).*(내일|하루\s*남|D-?1)/i] },
  { id: "A16", patterns: [/(시험|고사).*(일주일|7일|D-?7)/i] },
  { id: "A39", patterns: [/(연속|스트릭).*(끊|깨질|유지)/] },
  { id: "A50", patterns: [/(알림|리마인더).*(계속|반복).*(닫|무시|싫)/] },
  { id: "A44", patterns: [/(같은|방해).*(앱).*(계속|반복|자꾸).*(열|들어)/] },
  { id: "A22", patterns: [/(방해\s*앱|유튜브|인스타|틱톡|쇼츠).*(너무|오래|계속|반복)/] },
  { id: "A18", patterns: [/(며칠|[2-9]일|오랜만).*(공부).*(안|못|공백|다시)/] },
  { id: "A11", patterns: [/(공부|집중).*(자꾸|계속|반복).*(끊|중단|멈)/] },
  { id: "A31", patterns: [/(뭘|무엇을).*(해야|할지).*(모르|막막)|목표.*(없|못\s*정)/] },
  { id: "A34", patterns: [/(목표|타이머|계획).*(절반|반도).*(못|전에).*(끝|종료|포기)/] },
  { id: "A41", patterns: [/(지난주|저번\s*주).*(보다).*(줄|감소|못\s*했)/] },
  { id: "A40", patterns: [/(주간|이번\s*주).*(리포트|회고|점검|계획)/] },
  { id: "A15", patterns: [/(오늘).*(할\s*일|일정|과제).*(많이|남|밀)/] },
  { id: "A14", patterns: [/(오늘).*(공부).*(아직|하나도|0분|안\s*했|못\s*했)/] },
  { id: "A3", patterns: [/(예정|시작\s*시간|하기로).*(지났|넘었).*(시작|못|안)/] },
  { id: "A51", patterns: [/집중.*(안|못)|시작하기\s*싫|공부하기\s*싫|공부.*막막/] },
];

export function classifySituationByRules(userText: string): SituationId | null {
  const text = (userText ?? "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  return (
    CLASSIFICATION_RULES.find((rule) =>
      rule.patterns.some((pattern) => pattern.test(text))
    )?.id ?? null
  );
}

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
- 신체 증상이나 수면/카페인 언급이 없는 일반적인 공부 고민은 A3, A11, A14~A18, A22, A29~A31, A34, A39~A41, A44, A50, A51 중 가장 구체적인 상황을 먼저 확인한다.
- 사용자가 앱 이벤트를 직접 말하지 않았고 단순 대화만 했다면 억지로 이벤트 상황을 추정하지 않는다.`;
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
  const ruleMatch = classifySituationByRules(text);
  if (ruleMatch) return ruleMatch;
  try {
    const out = await callDeepseek(
      [
        { role: "system", content: classifierPrompt() },
        { role: "user", content: text },
      ],
      // deepseek-v4-flash는 추론 모델이라 reasoning_content에 먼저 토큰을 쓴다.
      // 예산이 작으면 content가 빈 문자열로 돌아오고(finish_reason=length)
      // 분류가 조용히 실패한다. 라벨은 짧아도 여유를 줘야 한다.
      { maxTokens: 512, temperature: 0 }
    );
    const label = out.trim().toUpperCase().match(/A\d{1,2}/)?.[0];
    if (label && VALID.has(label)) return label as SituationId;
    return null;
  } catch {
    return null;
  }
}
