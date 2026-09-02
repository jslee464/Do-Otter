import { NextResponse } from "next/server";
import { listUpcomingEvents, refreshAccessToken } from "../../../../lib/gcal";
import { getUserId, supabaseAdmin } from "../../../../lib/serverSupabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 저장된 refresh_token 으로 구글 일정을 가져와 schedules 에 반영
export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 400 });

  const { data: row } = await admin
    .from("gcal_tokens")
    .select("refresh_token")
    .eq("user_id", userId)
    .single();
  if (!row?.refresh_token)
    return NextResponse.json({ error: "not_connected" }, { status: 400 });

  const access = await refreshAccessToken(row.refresh_token);
  if (!access) return NextResponse.json({ error: "refresh_failed" }, { status: 400 });

  let events;
  try {
    events = await listUpcomingEvents(access);
  } catch (error) {
    return NextResponse.json(
      {
        error: "google_calendar_failed",
        detail: error instanceof Error ? error.message : "Google Calendar API failed",
      },
      { status: 400 }
    );
  }
  const rows = events
    .filter((e) => e.start && (e.start.date || e.start.dateTime))
    .map((e) => ({
      id:
        "gcal_" +
        Buffer.from(`${e.calendarId}:${e.id}`).toString("base64url").slice(0, 120),
      user_id: userId,
      title: e.summary || "(제목 없음)",
      event_date: (e.start!.date || e.start!.dateTime || "").slice(0, 10),
      source: "googleCalendar",
    }))
    .filter((r) => r.event_date);

  // 기존 구글 일정 교체 (수동 일정은 유지)
  await admin.from("schedules").delete().eq("user_id", userId).eq("source", "googleCalendar");
  if (rows.length) {
    const { error } = await admin.from("schedules").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ count: rows.length });
}
