/* =====================================================================
 *  POST /api/situation
 *  앱 이벤트로 트리거된 상황(A1~A50, A59, A60)의 알람 문구 생성.
 *  챗봇 자유 입력은 /api/chat 이 담당한다 (분류기 포함).
 *
 *  body: { situationId: "A59", context: OtterContext, slots?: {...} }
 * ===================================================================== */

import { NextRequest, NextResponse } from "next/server";
import { callDeepseek, type OtterContext } from "../../../lib/llm";
import { evidenceSources, retrieve } from "../../../lib/rag/retrieve";
import {
  normalizeTemplateText,
  situationAlarmPrompt,
} from "../../../lib/rag/prompt";
import type { SituationId } from "../../../lib/rag/situations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** {슬롯}을 실제 값으로 치환. 채워지지 않은 슬롯은 그대로 둔다. */
function fillSlots(tpl: string, slots: Record<string, string | number> = {}) {
  return tpl.replace(/\{([^}]+)\}/g, (m, key) => {
    const v = slots[key.trim()];
    return v === undefined || v === null ? key.trim() : String(v);
  });
}

export async function POST(req: NextRequest) {
  let body: {
    situationId: SituationId;
    context: OtterContext;
    slots?: Record<string, string | number>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ line: null, error: "BAD_BODY" }, { status: 400 });
  }

  const hit = retrieve(body.situationId);
  if (!hit) {
    return NextResponse.json(
      { line: null, error: "UNKNOWN_SITUATION" },
      { status: 404 }
    );
  }

  const draft = fillSlots(hit.situation.template, body.slots);

  // 고정 문구 상황은 LLM을 부르지 않는다 — 검수된 문구를 그대로 낸다.
  if (hit.situation.generation === "고정문구") {
    return NextResponse.json({
      line: draft,
      situationId: hit.situation.id,
      evidenceIds: hit.evidence.map((evidence) => evidence.id),
      sources: evidenceSources(hit),
      retrieval: hit.retrieval,
      generation: hit.situation.generation,
    });
  }

  try {
    const { system, user } = situationAlarmPrompt(hit, body.context);
    // 건강은 가장 낮게, 근거 코칭도 일반 개인화보다 낮은 온도로 생성한다.
    const medical = hit.situation.medical;
    const grounded = hit.evidence.length > 0;
    const line = await callDeepseek(
      [
        { role: "system", content: system },
        { role: "user", content: `${user}\n\n참고 초안: "${draft}"` },
      ],
      {
        maxTokens: medical ? 400 : grounded ? 500 : 300,
        temperature: medical ? 0.3 : grounded ? 0.45 : 0.8,
      }
    );
    return NextResponse.json({
      line:
        normalizeTemplateText(line.replace(/^["'“”]|["'“”]$/g, "")) || draft,
      situationId: hit.situation.id,
      evidenceIds: hit.evidence.map((evidence) => evidence.id),
      sources: evidenceSources(hit),
      retrieval: hit.retrieval,
      generation: hit.situation.generation,
    });
  } catch {
    // LLM 실패 시 검수된 초안으로 폴백 — 의학 상황에서도 안전한 문구가 나간다.
    return NextResponse.json({
      line: draft,
      situationId: hit.situation.id,
      evidenceIds: hit.evidence.map((evidence) => evidence.id),
      sources: evidenceSources(hit),
      retrieval: hit.retrieval,
      generation: hit.situation.generation,
      fallback: true,
    });
  }
}
