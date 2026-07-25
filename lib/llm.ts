/* =====================================================================
 *  Do-Otter · 수달이 LLM (DeepSeek) 프롬프트 / 컨텍스트
 *  ⚠️ 이 파일은 서버(app/api/*)에서만 import 됩니다. 키는 서버에만.
 * ===================================================================== */

// 클라이언트가 넘겨주는 사용자 맥락 (Supabase 통계 + 일정에서 구성)
export type OtterContext = {
  username: string;
  level: number;
  streak: number;
  todayEffectiveMin: number;
  todayHarmfulMin: number;
  last7StudyMin: number;
  last7HarmfulCount: number; // 최근 7일 방해앱 사용(유해세션) 횟수
  last7HarmfulMin: number; // 최근 7일 방해 시간(분)
  totalEffectiveMin: number; // 누적 순공(분)
  totalStopMin: number; // 누적 타이머 스톱(분)
  totalHarmfulMin: number; // 누적 외부앱 액세스(분)
  nearestDday: { title: string; dday: number } | null;
  schedules: { title: string; dday: number }[];
};

export type ChatMsg = { role: "user" | "assistant"; content: string };

const PERSONA = `너는 'Do-Otter' 앱의 마스코트이자 공부 친구 '수달이'야.
- 갈색 수달 캐릭터. 따뜻하고 다정하지만 가끔 귀엽게 츤데레.
- 사용자를 응원하고 공부 습관을 챙겨주는 게 목표.
- 항상 한국어 반말로, 친근하고 자연스럽게. 이모지는 0~2개 정도만.
- 잔소리는 부드럽게. 부담 주지 말고 "지금이라도 해볼까?" 같은 톤.
- 사용자의 실제 데이터(공부시간/방해앱/일정/D-day)를 근거로 구체적으로 말해.
- 의학적/전문적 단정은 피하고, 공부·집중·동기부여에 집중.`;

function contextBlock(c: OtterContext): string {
  const sched =
    c.schedules.length > 0
      ? c.schedules
          .map((s) => `${s.title}(D${s.dday <= 0 ? "-day" : "-" + s.dday})`)
          .join(", ")
      : "등록된 일정 없음";
  const near = c.nearestDday
    ? `${c.nearestDday.title} D-${c.nearestDday.dday}`
    : "없음";
  return `[사용자 데이터]
- 이름: ${c.username}, 레벨: Lv.${c.level}, 연속 공부(스트릭): ${c.streak}일
- 오늘 순공: ${c.todayEffectiveMin}분, 오늘 방해앱: ${c.todayHarmfulMin}분
- 최근 7일 순공: ${c.last7StudyMin}분, 방해앱 사용 ${c.last7HarmfulCount}회 / ${c.last7HarmfulMin}분
- 누적 순공: ${c.totalEffectiveMin}분, 누적 타이머정지: ${c.totalStopMin}분, 누적 외부앱: ${c.totalHarmfulMin}분
- 가장 임박한 D-day: ${near}
- 전체 일정: ${sched}`;
}

/** 기능1: 홈에서 수달 터치 → 한 문장 멘트 */
export function otterLinePrompt(c: OtterContext) {
  return {
    system: `${PERSONA}

지금은 사용자가 홈 화면에서 너(수달이)를 톡 건드린 순간이야.
아래 데이터를 참고해서, 상황에 딱 맞는 **한국어 한 문장**만 말해.
- 25자 내외로 짧게. 매번 조금씩 다르게.
- 인사, 응원, D-day 리마인드, 방해앱 지적, 칭찬 중 상황에 맞는 걸 골라.
- 따옴표/설명 없이 대사 문장만 출력.

${contextBlock(c)}`,
    user: "지금 상황에 맞는 한 문장 멘트를 말해줘.",
  };
}

/** 기능2: 채팅 시스템 프롬프트 */
export function chatSystemPrompt(c: OtterContext): string {
  return `${PERSONA}

지금은 사용자가 너와 1:1 채팅을 하는 중이야. 위 데이터를 활용해서
공감하고, 공부 계획을 같이 세우고, 동기부여를 해줘.
- 답변은 2~4문장 정도로 너무 길지 않게.
- 데이터에 근거해 구체적으로. 예: "어제 순공 40분이었네, 오늘은 1시간 가볼까?"
- 사용자가 힘들다고 하면 먼저 공감하고 작은 목표를 제안해.

${contextBlock(c)}`;
}

/** DeepSeek 호출 (서버에서만) */
export async function callDeepseek(
  messages: { role: string; content: string }[],
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
  if (!key) throw new Error("NO_KEY");
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: opts.maxTokens ?? 300,
      temperature: opts.temperature ?? 0.9,
      stream: false,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`DEEPSEEK_${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
}
