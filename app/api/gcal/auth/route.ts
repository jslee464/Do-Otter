import { NextResponse } from "next/server";
import { buildAuthUrl, GCAL_CONFIGURED, signState } from "../../../../lib/gcal";
import { baseUrl, getUserId } from "../../../../lib/serverSupabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 클라이언트(로그인 상태)가 호출 → 구글 동의 URL 반환
export async function POST(req: Request) {
  if (!GCAL_CONFIGURED)
    return NextResponse.json({ error: "not_configured" }, { status: 400 });
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = buildAuthUrl(baseUrl(req), signState(userId));
  return NextResponse.json({ url });
}
