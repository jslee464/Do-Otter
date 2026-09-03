/* =====================================================================
 *  Google Calendar OAuth (서버 전용) — raw REST, SDK 없이
 *  ⚠️ GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET 는 서버 전용 비밀.
 * ===================================================================== */
import crypto from "crypto";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
export const GCAL_CONFIGURED = Boolean(CLIENT_ID && CLIENT_SECRET);

const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
export const gcalRedirect = (base: string) => `${base}/api/gcal/callback`;

export function buildAuthUrl(base: string, state: string): string {
  const p = new URLSearchParams({
    client_id: CLIENT_ID || "",
    redirect_uri: gcalRedirect(base),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

export async function exchangeCode(base: string, code: string): Promise<any> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID || "",
      client_secret: CLIENT_SECRET || "",
      code,
      grant_type: "authorization_code",
      redirect_uri: gcalRedirect(base),
    }),
  });
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID || "",
      client_secret: CLIENT_SECRET || "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof d?.error_description === "string"
        ? d.error_description
        : typeof d?.error === "string"
          ? d.error
          : `Google token error ${res.status}`;
    throw new Error(message);
  }
  return d.access_token ?? null;
}

type GCalendar = {
  id: string;
  summary?: string;
  primary?: boolean;
  selected?: boolean;
  hidden?: boolean;
  accessRole?: string;
};

export type GEvent = {
  id: string;
  summary?: string;
  status?: string;
  start?: { date?: string; dateTime?: string };
  calendarId: string;
  calendarSummary?: string;
};

async function googleJson<T>(url: string, accessToken: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data?.error?.message === "string"
        ? data.error.message
        : `Google API error ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

async function listCalendars(accessToken: string): Promise<GCalendar[]> {
  const p = new URLSearchParams({
    showHidden: "false",
    minAccessRole: "reader",
  });
  const data = await googleJson<{ items?: GCalendar[] }>(
    `https://www.googleapis.com/calendar/v3/users/me/calendarList?${p.toString()}`,
    accessToken
  );
  return (data.items ?? []).filter((calendar) => {
    if (!calendar.id || calendar.hidden) return false;
    return calendar.accessRole !== "freeBusyReader";
  });
}

async function listCalendarEvents(
  accessToken: string,
  calendar: GCalendar,
  timeMin: string,
  timeMax: string
): Promise<GEvent[]> {
  const p = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
  });
  const data = await googleJson<{ items?: Omit<GEvent, "calendarId" | "calendarSummary">[] }>(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events?${p.toString()}`,
    accessToken
  );
  return (data.items ?? [])
    .filter((event) => event.id && event.status !== "cancelled")
    .map((event) => ({
      ...event,
      calendarId: calendar.id,
      calendarSummary: calendar.summary,
    }));
}

export async function listUpcomingEvents(accessToken: string): Promise<GEvent[]> {
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + 90 * 86400000).toISOString();
  const calendars = await listCalendars(accessToken);
  const targets =
    calendars.length > 0
      ? calendars
      : [{ id: "primary", summary: "Primary", primary: true }];
  const eventGroups = await Promise.all(
    targets.map((calendar) =>
      listCalendarEvents(accessToken, calendar, timeMin, timeMax).catch(() => [])
    )
  );
  return eventGroups.flat().sort((a, b) => {
    const aStart = a.start?.dateTime || a.start?.date || "";
    const bStart = b.start?.dateTime || b.start?.date || "";
    return aStart.localeCompare(bStart);
  });
}

/* ---- OAuth state 서명 (userId 위변조 방지) ---- */
const STATE_SECRET =
  process.env.SUPABASE_SERVICE_ROLE_KEY || CLIENT_SECRET || "dev-only-secret";

export function signState(userId: string): string {
  const payload = `${userId}.${Date.now()}`;
  const sig = crypto
    .createHmac("sha256", STATE_SECRET)
    .update(payload)
    .digest("hex")
    .slice(0, 24);
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyState(state: string): string | null {
  try {
    const [userId, ts, sig] = Buffer.from(state, "base64url").toString().split(".");
    const expect = crypto
      .createHmac("sha256", STATE_SECRET)
      .update(`${userId}.${ts}`)
      .digest("hex")
      .slice(0, 24);
    if (sig !== expect) return null;
    if (Date.now() - Number(ts) > 10 * 60 * 1000) return null; // 10분 만료
    return userId;
  } catch {
    return null;
  }
}
