import { NextRequest, NextResponse } from "next/server";
import { callDeepseek, otterLinePrompt, type OtterContext } from "../../../lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let ctx: OtterContext;
  try {
    ctx = (await req.json()) as OtterContext;
  } catch {
    return NextResponse.json({ line: "오늘도 같이 공부하자! 🦦" });
  }
  try {
    const { system, user } = otterLinePrompt(ctx);
    const line = await callDeepseek(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { maxTokens: 60, temperature: 1.05 }
    );
    return NextResponse.json({ line: line.replace(/^["'“”]|["'“”]$/g, "") || "화이팅! 🦦" });
  } catch (e: any) {
    // 키 없음/오류 시 규칙 기반 폴백
    return NextResponse.json({ line: fallback(ctx) });
  }
}

function fallback(c: OtterContext): string {
  if (c?.nearestDday && c.nearestDday.dday <= 3)
    return `${c.nearestDday.title} D-${c.nearestDday.dday}! 지금 시작하자 🔥`;
  if (c?.todayEffectiveMin === 0) return "오늘 아직인데, 20분만 같이 해볼까? 🦦";
  if (c?.streak >= 3) return `${c.streak}일 연속이라니 대단해! 👏`;
  return "오늘도 같이 공부하자! 🦦";
}
