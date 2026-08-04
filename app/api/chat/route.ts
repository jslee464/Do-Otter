import { NextRequest, NextResponse } from "next/server";
import {
  callDeepseek,
  chatSystemPrompt,
  type ChatMsg,
  type OtterContext,
} from "../../../lib/llm";
import { classifySituation } from "../../../lib/rag/classify";
import { emergencyReply, isEmergency, retrieve } from "../../../lib/rag/retrieve";
import { medicalSystemPrompt } from "../../../lib/rag/prompt";

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
  const history = (messages ?? []).slice(-12); // 최근 12개만
  const lastUser =
    [...history].reverse().find((m) => m.role === "user")?.content ?? "";

  // ── 1) 응급 차단: LLM을 아예 거치지 않는다 (A58 / R11, R12) ──────────
  if (isEmergency(lastUser)) {
    return NextResponse.json({
      reply: emergencyReply(),
      situationId: "A58",
      evidenceIds: ["R11", "R12"],
      emergency: true,
    });
  }

  try {
    // ── 2) 상황 분류 → RAG 룩업 ──────────────────────────────────────
    const sid = await classifySituation(lastUser);
    const hit = sid ? retrieve(sid) : null;

    // ── 3) 의학 경로 vs 일반 채팅 경로 ───────────────────────────────
    if (hit && hit.situation.medical) {
      const reply = await callDeepseek(
        [
          { role: "system", content: medicalSystemPrompt(hit, context) },
          ...history.map((m) => ({ role: m.role, content: m.content })),
        ],
        { maxTokens: 600, temperature: 0.3 } // 의학 경로는 낮은 온도
      );
      return NextResponse.json({
        reply: reply || hit.situation.template, // 실패 시 검수된 초안으로 폴백
        situationId: hit.situation.id,
        evidenceIds: hit.situation.evidenceIds,
      });
    }

    const reply = await callDeepseek(
      [
        { role: "system", content: chatSystemPrompt(context) },
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ],
      { maxTokens: 3000, temperature: 0.9 }
    );
    return NextResponse.json({
      reply: reply || "음… 잘 못 들었어, 다시 말해줄래?",
      situationId: hit?.situation.id ?? null,
    });
  } catch (e: any) {
    const msg =
      e?.message === "NO_KEY"
        ? "지금은 수달이가 살짝 졸려서 대답을 못 해… (DeepSeek 키 미설정) 그래도 공부는 응원할게! 🦦"
        : "앗, 잠깐 딴생각했어. 다시 한 번만 말해줄래? 🦦";
    return NextResponse.json({ reply: msg });
  }
}
