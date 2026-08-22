import { NextRequest, NextResponse } from "next/server";
import {
  callDeepseek,
  chatSystemPrompt,
  type ChatMsg,
  type OtterContext,
} from "../../../lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { context: OtterContext; messages: ChatMsg[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ reply: "앗, 뭐라고 했어? 다시 말해줄래?" });
  }
  const { context, messages } = body;
  try {
    const history = (messages ?? []).slice(-12); // 최근 12개만
    const reply = await callDeepseek(
      [
        { role: "system", content: chatSystemPrompt(context) },
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ],
      { maxTokens: 320, temperature: 0.9 }
    );
    return NextResponse.json({ reply: reply || "음… 잘 못 들었어, 다시 말해줄래?" });
  } catch (e: any) {
    const msg =
      e?.message === "NO_KEY"
        ? "지금은 Otti가 살짝 졸려서 대답을 못 해… (DeepSeek 키 미설정) 그래도 공부는 응원할게! 🦦"
        : "앗, 잠깐 딴생각했어. 다시 한 번만 말해줄래? 🦦";
    return NextResponse.json({ reply: msg });
  }
}
