import { NextRequest, NextResponse } from "next/server";
import {
  callDeepseek,
  chatSystemPrompt,
  type ChatMsg,
  type OtterContext,
} from "../../../lib/llm";
import { classifySituation } from "../../../lib/rag/classify";
import {
  emergencyReply,
  evidenceSources,
  isEmergency,
  retrieve,
} from "../../../lib/rag/retrieve";
import {
  groundedChatSystemPrompt,
  normalizeTemplateText,
} from "../../../lib/rag/prompt";
import { getUserId, supabaseAdmin } from "../../../lib/serverSupabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function hasActivePro(req: NextRequest): Promise<boolean> {
  try {
    const userId = await getUserId(req);
    if (!userId) return false;
    const admin = supabaseAdmin();
    if (!admin) return false;
    const { data } = await admin
      .from("profiles")
      .select("pro_until, chatpro_until")
      .eq("id", userId)
      .maybeSingle();
    const now = Date.now();
    return (
      (!!data?.pro_until && new Date(data.pro_until).getTime() > now) ||
      (!!data?.chatpro_until && new Date(data.chatpro_until).getTime() > now)
    );
  } catch {
    return false;
  }
}

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
  const pro = await hasActivePro(req);

  // ── 1) 응급 차단: LLM을 아예 거치지 않는다 (A58 / R11, R12) ──────────
  if (isEmergency(lastUser)) {
    const emergencyHit = retrieve("A58");
    return NextResponse.json({
      reply: emergencyReply(),
      situationId: "A58",
      evidenceIds: pro ? ["R11", "R12"] : [],
      sources: pro && emergencyHit ? evidenceSources(emergencyHit) : [],
      generation: "고정문구",
      emergency: true,
    });
  }

  try {
    // ── 2) 상황 분류 → RAG 룩업 ──────────────────────────────────────
    const sid = pro ? await classifySituation(lastUser) : null;
    const hit =
      pro && sid
        ? retrieve(sid, { query: lastUser, maxEvidence: 4 })
        : null;

    // ── 3) 통합 근거 경로: 건강은 강한 가드레일, 코칭은 근거 기반 행동 제안 ──
    if (pro && hit && hit.evidence.length > 0) {
      try {
        const reply = await callDeepseek(
          [
            { role: "system", content: groundedChatSystemPrompt(hit, context) },
            ...history.map((m) => ({ role: m.role, content: m.content })),
          ],
          {
            maxTokens: hit.situation.medical ? 1200 : 1600,
            temperature: hit.situation.medical ? 0.3 : 0.45,
          }
        );
        return NextResponse.json({
          reply: normalizeTemplateText(reply || hit.situation.template),
          situationId: hit.situation.id,
          evidenceIds: hit.evidence.map((evidence) => evidence.id),
          sources: evidenceSources(hit),
          retrieval: hit.retrieval,
          generation: hit.situation.generation,
        });
      } catch {
        return NextResponse.json({
          reply: normalizeTemplateText(hit.situation.template),
          situationId: hit.situation.id,
          evidenceIds: hit.evidence.map((evidence) => evidence.id),
          sources: evidenceSources(hit),
          retrieval: hit.retrieval,
          generation: hit.situation.generation,
          fallback: true,
        });
      }
    }

    const reply = await callDeepseek(
      [
        {
          role: "system",
          content:
            chatSystemPrompt(context) +
            "\n\n무료 챗봇 경로에서는 RAG/논문 검색 결과를 사용하지 않는다. 사용자가 논문 근거나 출처 기반 답변을 요구하면 Pro 수달에서 근거 기반 답변을 볼 수 있다고 짧게 안내하고, 일반적인 공부 조언은 계속 제공해.",
        },
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
        ? "지금은 Otti가 살짝 졸려서 대답을 못 해… (DeepSeek 키 미설정) 그래도 공부는 응원할게! 🦦"
        : "앗, 잠깐 딴생각했어. 다시 한 번만 말해줄래? 🦦";
    return NextResponse.json({ reply: msg });
  }
}
