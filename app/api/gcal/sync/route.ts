import { NextResponse } from "next/server";
import crypto from "crypto";
import { listUpcomingEvents, refreshAccessToken } from "../../../../lib/gcal";
import { getUserId, supabaseAdmin } from "../../../../lib/serverSupabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function gcalScheduleId(calendarId: string, eventId: string): string {
  return "gcal_" + crypto.createHash("sha256").update(`${calendarId}:${eventId}`).digest("hex");
}

// 저장된 refresh_token 으로 구글 일정을 가져와 schedules 에 반영
export async function POST(req: Request) {
  try {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const admin = supabaseAdmin();
    if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 400 });

    const { data: row, error: tokenError } = await admin
      .from("gcal_tokens")
      .select("refresh_token")
      .eq("user_id", userId)
      .single();
    if (tokenError) {
      return NextResponse.json(
        { error: "token_lookup_failed", detail: tokenError.message },
        { status: 400 }
      );
    }
    if (!row?.refresh_token)
      return NextResponse.json({ error: "not_connected" }, { status: 400 });

    let access: string | null = null;
    try {
      access = await refreshAccessToken(row.refresh_token);
    } catch (error) {
      return NextResponse.json(
        {
          error: "refresh_failed",
          detail: error instanceof Error ? error.message : "Google token refresh failed",
        },
        { status: 400 }
      );
    }
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
        id: gcalScheduleId(e.calendarId, e.id),
        user_id: userId,
        title: e.summary || "(제목 없음)",
        event_date: (e.start!.date || e.start!.dateTime || "").slice(0, 10),
        source: "googleCalendar",
      }))
      .filter((r) => r.event_date)
      .filter((row, index, allRows) => allRows.findIndex((r) => r.id === row.id) === index);

    // 기존 구글 일정 교체 (수동 일정은 유지)
    const { error: deleteError } = await admin
      .from("schedules")
      .delete()
      .eq("user_id", userId)
      .eq("source", "googleCalendar");
    if (deleteError) {
      return NextResponse.json(
        { error: "schedule_delete_failed", detail: deleteError.message },
        { status: 500 }
      );
    }
    if (rows.length) {
      const { error } = await admin.from("schedules").insert(rows);
      if (error)
        return NextResponse.json(
          { error: "schedule_insert_failed", detail: error.message },
          { status: 500 }
        );
    }
    return NextResponse.json({ count: rows.length });
  } catch (error) {
    return NextResponse.json(
      {
        error: "sync_failed",
        detail: error instanceof Error ? error.message : "Google Calendar sync failed",
      },
      { status: 500 }
    );
  }
}
