"use client";

import { isSupabaseConfigured, supabase, usernameToEmail } from "./supabase";
import type { RagMetadata } from "./rag/api-types";

export type Result = { ok: boolean; error?: string };
export type Consent = {
  terms: boolean;
  privacy: boolean;
  notifications: boolean;
  calendar: boolean;
};
export type BlockedApp = { key: string; name: string };

/** 앱 전역 상태 (개발_데이터모델 UserStats 확장) */
export type UserState = {
  username: string;
  totalExp: number;
  shells: number;
  shellsEarnedTotal: number;
  totalTimerSeconds: number;
  effectiveSeconds: number; // 순공시간
  harmfulSeconds: number; // 유해앱(외부앱) 사용시간
  stopSeconds: number; // 타이머 스톱(일시정지) 시간
  sessionCount: number;
  harmfulFreeSessions: number;
  angryCount: number;
  streak: number;
  lastStudyDate: string | null;
  dailyGoalMin: number;
  todayEffectiveSec: number;
  todayHarmfulSec: number;
  todayDate: string | null;
  dailyGoalClaimed: boolean;
  adWatchedToday: number;
  adDate: string | null;
  unlocked: string[];
  ownedItems: string[]; // 수달 커스텀: 보유 아이템
  equippedItems: string[]; // 수달 커스텀: 착용 아이템
  isPro: boolean; // Pro 수달 구독 중
  isChatPro: boolean; // legacy: Pro 수달 RAG 권한과 동일하게 유지
};

export type ScheduleEvent = {
  id: string;
  title: string;
  eventDate: string; // yyyy-mm-dd
  source: "manual" | "googleCalendar";
};

export type SessionLog = {
  totalSec: number;
  harmfulSec: number;
  effectiveSec: number;
  qualityRatio: number;
  expEarned: number;
  at: number;
};

export const backendMode: "supabase" | "demo" = isSupabaseConfigured
  ? "supabase"
  : "demo";

export function defaultState(username: string): UserState {
  return {
    username,
    totalExp: 0,
    shells: 0,
    shellsEarnedTotal: 0,
    totalTimerSeconds: 0,
    effectiveSeconds: 0,
    harmfulSeconds: 0,
    stopSeconds: 0,
    sessionCount: 0,
    harmfulFreeSessions: 0,
    angryCount: 0,
    streak: 0,
    lastStudyDate: null,
    dailyGoalMin: 60,
    todayEffectiveSec: 0,
    todayHarmfulSec: 0,
    todayDate: null,
    dailyGoalClaimed: false,
    adWatchedToday: 0,
    adDate: null,
    unlocked: [],
    ownedItems: [],
    equippedItems: [],
    isPro: false,
    isChatPro: false,
  };
}

/* =====================================================================
 *  DEMO 저장소
 * ===================================================================== */
const LS = {
  users: "dootter_demo_users",
  session: "dootter_demo_session",
  statePfx: "dootter_state_",
  schedPfx: "dootter_sched_",
  logsPfx: "dootter_logs_",
  consentPfx: "dootter_demo_consent_",
  appsPfx: "dootter_demo_apps_",
  onboardPfx: "dootter_onboarded_",
};
function ls<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function setLs(key: string, v: unknown) {
  if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(v));
}
type DemoUsers = Record<string, { password: string }>;

/* =====================================================================
 *  AUTH
 * ===================================================================== */
export async function signUp(username: string, password: string): Promise<Result> {
  username = username.trim();
  if (!username || !password) return { ok: false, error: "아이디와 비밀번호를 입력해주세요." };
  if (password.length < 6) return { ok: false, error: "비밀번호는 6자 이상이어야 해요." };

  if (backendMode === "demo") {
    const users = ls<DemoUsers>(LS.users, {});
    if (users[username]) return { ok: false, error: "이미 존재하는 아이디예요." };
    users[username] = { password };
    setLs(LS.users, users);
    setLs(LS.statePfx + username, defaultState(username));
    setLs(LS.session, username);
    return { ok: true };
  }
  const email = usernameToEmail(username);
  try {
    const { data, error } = await supabase!.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) return { ok: false, error: translate(error.message) };
    if (!data.session) {
      const s = await supabase!.auth.signInWithPassword({ email, password });
      if (s.error) return { ok: false, error: translate(s.error.message) };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: translateError(error) };
  }
}

export async function signIn(username: string, password: string): Promise<Result> {
  username = username.trim();
  if (backendMode === "demo") {
    const users = ls<DemoUsers>(LS.users, {});
    if (!users[username] || users[username].password !== password)
      return { ok: false, error: "아이디 또는 비밀번호가 올바르지 않아요." };
    setLs(LS.session, username);
    if (!localStorage.getItem(LS.statePfx + username))
      setLs(LS.statePfx + username, defaultState(username));
    return { ok: true };
  }
  try {
    const { error } = await supabase!.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    if (error) return { ok: false, error: translate(error.message) };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: translateError(error) };
  }
}

export async function signInWithGoogle(): Promise<Result> {
  if (backendMode === "demo" || !supabase) return { ok: false, error: "demo" };
  const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: redirectTo ? { redirectTo } : undefined,
    });
    return error ? { ok: false, error: translate(error.message) } : { ok: true };
  } catch (error) {
    return { ok: false, error: translateError(error) };
  }
}

export async function signOut() {
  if (backendMode === "demo") {
    setLs(LS.session, null);
    return;
  }
  await supabase!.auth.signOut();
}

export async function currentUsername(): Promise<string | null> {
  if (backendMode === "demo") return ls<string | null>(LS.session, null);
  try {
    const { data } = await supabase!.auth.getUser();
    const u = data.user;
    if (!u) return null;
    return (u.user_metadata?.username as string) || u.email?.split("@")[0] || null;
  } catch {
    return null;
  }
}

async function uid(): Promise<string | null> {
  if (backendMode === "demo") return ls<string | null>(LS.session, null);
  try {
    const { data } = await supabase!.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/* =====================================================================
 *  STATE (load / save)
 * ===================================================================== */
export async function loadState(): Promise<UserState | null> {
  const who = await currentUsername();
  if (!who) return null;

  if (backendMode === "demo") {
    return ls<UserState>(LS.statePfx + who, defaultState(who));
  }
  const id = await uid();
  if (!id) return null;
  const { data } = await supabase!
    .from("user_stats")
    .select("*")
    .eq("user_id", id)
    .single();
  const { data: achs } = await supabase!
    .from("achievements")
    .select("ach_id")
    .eq("user_id", id);
  const unlocked = (achs ?? []).map((r: any) => r.ach_id);
  // 구독 상태 (PortOne 검증 라우트가 갱신한 profiles 컬럼)
  const { data: prof } = await supabase!
    .from("profiles")
    .select("pro_until, chatpro_until")
    .eq("id", id)
    .single();
  const now = Date.now();
  const hasProAccess =
    (!!prof?.pro_until && new Date(prof.pro_until).getTime() > now) ||
    (!!prof?.chatpro_until && new Date(prof.chatpro_until).getTime() > now);
  const isPro = hasProAccess;
  const isChatPro = hasProAccess;
  if (!data) return { ...defaultState(who), unlocked, isPro, isChatPro };
  return {
    username: who,
    totalExp: data.total_exp ?? 0,
    shells: data.shells ?? 0,
    shellsEarnedTotal: data.shells_earned_total ?? 0,
    totalTimerSeconds: data.total_timer_seconds ?? 0,
    effectiveSeconds: data.effective_seconds ?? 0,
    harmfulSeconds: data.harmful_seconds ?? 0,
    stopSeconds: data.stop_seconds ?? 0,
    sessionCount: data.session_count ?? 0,
    harmfulFreeSessions: data.harmful_free_sessions ?? 0,
    angryCount: data.angry_count ?? 0,
    streak: data.streak ?? 0,
    lastStudyDate: data.last_study_date ?? null,
    dailyGoalMin: data.daily_goal_min ?? 60,
    todayEffectiveSec: data.today_effective_sec ?? 0,
    todayHarmfulSec: data.today_harmful_sec ?? 0,
    todayDate: data.today_date ?? null,
    dailyGoalClaimed: data.daily_goal_claimed ?? false,
    adWatchedToday: data.ad_watched_today ?? 0,
    adDate: data.ad_date ?? null,
    unlocked,
    ownedItems: data.owned_items ?? [],
    equippedItems: data.equipped_items ?? [],
    isPro,
    isChatPro,
  };
}

export async function saveState(s: UserState): Promise<Result> {
  if (backendMode === "demo") {
    setLs(LS.statePfx + s.username, s);
    return { ok: true };
  }
  const id = await uid();
  if (!id) return { ok: false, error: "로그인이 필요해요." };
  const row = {
    user_id: id,
    total_exp: s.totalExp,
    shells: s.shells,
    shells_earned_total: s.shellsEarnedTotal,
    total_timer_seconds: s.totalTimerSeconds,
    effective_seconds: s.effectiveSeconds,
    harmful_seconds: s.harmfulSeconds,
    stop_seconds: s.stopSeconds,
    session_count: s.sessionCount,
    harmful_free_sessions: s.harmfulFreeSessions,
    angry_count: s.angryCount,
    streak: s.streak,
    last_study_date: s.lastStudyDate,
    daily_goal_min: s.dailyGoalMin,
    today_effective_sec: s.todayEffectiveSec,
    today_harmful_sec: s.todayHarmfulSec,
    today_date: s.todayDate,
    daily_goal_claimed: s.dailyGoalClaimed,
    ad_watched_today: s.adWatchedToday,
    ad_date: s.adDate,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase!.from("user_stats").upsert(row);
  if (error) return { ok: false, error: error.message };
  // 수달 커스텀 아이템 (컬럼이 아직 없으면 조용히 무시 — 앱은 안 깨짐)
  await supabase!
    .from("user_stats")
    .update({ owned_items: s.ownedItems, equipped_items: s.equippedItems })
    .eq("user_id", id)
    .then(
      () => {},
      () => {}
    );
  // 레벨/조개는 profiles에도 반영(표시용)
  await supabase!
    .from("profiles")
    .update({ shells: s.shells })
    .eq("id", id);
  if (s.unlocked.length) {
    const rows = s.unlocked.map((ach_id) => ({ user_id: id, ach_id }));
    await supabase!.from("achievements").upsert(rows, { onConflict: "user_id,ach_id" });
  }
  return { ok: true };
}

export async function addSessionLog(log: SessionLog): Promise<void> {
  if (backendMode === "demo") {
    const who = await currentUsername();
    if (!who) return;
    const arr = ls<SessionLog[]>(LS.logsPfx + who, []);
    arr.unshift(log);
    setLs(LS.logsPfx + who, arr.slice(0, 200));
    return;
  }
  const id = await uid();
  if (!id) return;
  await supabase!.from("study_logs").insert({
    user_id: id,
    total_sec: log.totalSec,
    harmful_sec: log.harmfulSec,
    effective_sec: log.effectiveSec,
    quality_ratio: log.qualityRatio,
    exp_earned: log.expEarned,
  });
}

export async function getSessionLogs(): Promise<SessionLog[]> {
  if (backendMode === "demo") {
    const who = await currentUsername();
    if (!who) return [];
    return ls<SessionLog[]>(LS.logsPfx + who, []);
  }
  const id = await uid();
  if (!id) return [];
  const { data } = await supabase!
    .from("study_logs")
    .select("*")
    .eq("user_id", id)
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []).map((r: any) => ({
    totalSec: r.total_sec,
    harmfulSec: r.harmful_sec,
    effectiveSec: r.effective_sec,
    qualityRatio: r.quality_ratio,
    expEarned: r.exp_earned,
    at: new Date(r.created_at).getTime(),
  }));
}

/* =====================================================================
 *  SCHEDULES
 * ===================================================================== */
export async function getSchedules(): Promise<ScheduleEvent[]> {
  if (backendMode === "demo") {
    const who = await currentUsername();
    if (!who) return [];
    const key = LS.schedPfx + who;
    const schedules = ls<ScheduleEvent[]>(key, defaultSchedules());
    const cleaned = schedules.filter((schedule) => !schedule.id.startsWith("seed"));
    if (cleaned.length !== schedules.length) setLs(key, cleaned);
    return cleaned;
  }
  const id = await uid();
  if (!id) return [];
  const { data } = await supabase!
    .from("schedules")
    .select("*")
    .eq("user_id", id)
    .order("event_date", { ascending: true });
  return (data ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    eventDate: r.event_date,
    source: r.source,
  }));
}

export async function addSchedule(title: string, eventDate: string): Promise<Result> {
  const id = "s" + Date.now() + Math.floor(Math.random() * 1000);
  if (backendMode === "demo") {
    const who = await currentUsername();
    if (!who) return { ok: false, error: "로그인이 필요해요." };
    const arr = ls<ScheduleEvent[]>(LS.schedPfx + who, defaultSchedules());
    arr.push({ id, title, eventDate, source: "manual" });
    setLs(LS.schedPfx + who, arr);
    return { ok: true };
  }
  const u = await uid();
  if (!u) return { ok: false, error: "로그인이 필요해요." };
  const { error } = await supabase!
    .from("schedules")
    .insert({ user_id: u, title, event_date: eventDate, source: "manual" });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteSchedule(id: string): Promise<void> {
  if (backendMode === "demo") {
    const who = await currentUsername();
    if (!who) return;
    const arr = ls<ScheduleEvent[]>(LS.schedPfx + who, []).filter((s) => s.id !== id);
    setLs(LS.schedPfx + who, arr);
    return;
  }
  const u = await uid();
  if (!u) return;
  await supabase!.from("schedules").delete().eq("id", id).eq("user_id", u);
}

// 데모 계정은 사용자가 직접 추가한 일정만 보여줍니다.
function defaultSchedules(): ScheduleEvent[] {
  return [];
}

/* =====================================================================
 *  CHAT (수달이 챗봇 대화 기록)
 * ===================================================================== */
export type ChatRow = {
  role: "user" | "assistant";
  content: string;
  at: number;
  rag?: RagMetadata;
};
const CHAT_PFX = "dootter_chat_";

export async function getChat(): Promise<ChatRow[]> {
  if (backendMode === "demo") {
    const who = await currentUsername();
    if (!who) return [];
    return ls<ChatRow[]>(CHAT_PFX + who, []);
  }
  const id = await uid();
  if (!id) return [];
  const withMeta = await supabase!
    .from("chat_messages")
    .select("role, content, created_at, rag_meta")
    .eq("user_id", id)
    .order("created_at", { ascending: true })
    .limit(200);
  // 이전 DB 스키마에도 앱이 멈추지 않도록 메타데이터 컬럼이 없으면 재조회한다.
  const { data } = withMeta.error
    ? await supabase!
        .from("chat_messages")
        .select("role, content, created_at")
        .eq("user_id", id)
        .order("created_at", { ascending: true })
        .limit(200)
    : withMeta;
  return (data ?? []).map((r: any) => ({
    role: r.role,
    content: r.content,
    at: new Date(r.created_at).getTime(),
    ...(r.rag_meta ? { rag: r.rag_meta as RagMetadata } : {}),
  }));
}

export async function addChat(
  role: "user" | "assistant",
  content: string,
  rag?: RagMetadata
) {
  if (backendMode === "demo") {
    const who = await currentUsername();
    if (!who) return;
    const arr = ls<ChatRow[]>(CHAT_PFX + who, []);
    arr.push({ role, content, at: Date.now(), ...(rag ? { rag } : {}) });
    setLs(CHAT_PFX + who, arr.slice(-200));
    return;
  }
  const id = await uid();
  if (!id) return;
  const payload = { user_id: id, role, content, ...(rag ? { rag_meta: rag } : {}) };
  const result = await supabase!.from("chat_messages").insert(payload);
  if (result.error && rag) {
    // rag_meta 마이그레이션 전 DB에서도 대화 본문은 보존한다.
    await supabase!.from("chat_messages").insert({ user_id: id, role, content });
  }
}

/* =====================================================================
 *  PORTONE(아임포트) 결제 — 브라우저 SDK 결제창 + 서버 검증(/api/portone/verify)
 *  프로토타입: 30일 이용권 단건결제 (정기결제 빌링키는 추후 고도화)
 * ===================================================================== */
export async function accessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

const PLAN_INFO = {
  chatpro: { amount: 2900, orderName: "Pro 수달 30일 이용권" },
  pro: { amount: 4900, orderName: "Pro 수달 30일 이용권" },
} as const;

export async function startCheckout(
  plan: "pro" | "chatpro"
): Promise<{ ok: boolean; error?: string }> {
  if (backendMode === "demo") return { ok: false, error: "demo" };
  const t = await accessToken();
  if (!t) return { ok: false, error: "no_session" };

  const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
  const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;
  if (!storeId || !channelKey) return { ok: false, error: "not_configured" };

  const info = PLAN_INFO[plan];
  const paymentId = `pay-${plan}-${Date.now()}-${Math.floor(Math.random() * 1e5)}`;

  let resp: any;
  try {
    const PortOne = (await import("@portone/browser-sdk/v2")).default;
    resp = await PortOne.requestPayment({
      storeId,
      channelKey,
      paymentId,
      orderName: info.orderName,
      totalAmount: info.amount,
      currency: "CURRENCY_KRW",
      payMethod: "CARD",
    } as any);
  } catch {
    return { ok: false, error: "sdk_error" };
  }
  // 결제창에서 취소/실패 시 code 가 채워짐
  if (resp?.code != null) return { ok: false, error: resp.message || "cancelled" };

  // 서버 검증 + 이용권 부여
  const v = await fetch("/api/portone/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
    body: JSON.stringify({ paymentId, plan }),
  });
  const d = await v.json();
  return d.ok ? { ok: true } : { ok: false, error: d.error || "verify_failed" };
}

/* =====================================================================
 *  GOOGLE CALENDAR 연동 (서버 라우트 /api/gcal/* 호출)
 * ===================================================================== */
export async function gcalStatus(): Promise<{ connected: boolean; configured: boolean }> {
  if (backendMode === "demo") return { connected: false, configured: false };
  const t = await accessToken();
  if (!t) return { connected: false, configured: false };
  try {
    const res = await fetch("/api/gcal/status", {
      method: "POST",
      headers: { Authorization: `Bearer ${t}` },
    });
    const d = await res.json();
    return { connected: !!d.connected, configured: !!d.configured };
  } catch {
    return { connected: false, configured: false };
  }
}

export async function gcalConnectUrl(): Promise<{ ok: boolean; url?: string; error?: string }> {
  if (backendMode === "demo") return { ok: false, error: "demo" };
  const t = await accessToken();
  if (!t) return { ok: false, error: "no_session" };
  const res = await fetch("/api/gcal/auth", {
    method: "POST",
    headers: { Authorization: `Bearer ${t}` },
  });
  const d = await res.json();
  return d.url ? { ok: true, url: d.url } : { ok: false, error: d.error || "failed" };
}

export async function gcalSync(): Promise<{ ok: boolean; count?: number; error?: string; detail?: string }> {
  if (backendMode === "demo") return { ok: false, error: "demo" };
  const t = await accessToken();
  if (!t) return { ok: false, error: "no_session" };
  const res = await fetch("/api/gcal/sync", {
    method: "POST",
    headers: { Authorization: `Bearer ${t}` },
  });
  const d = await res.json();
  return typeof d.count === "number"
    ? { ok: true, count: d.count }
    : { ok: false, error: d.error || "failed", detail: d.detail };
}

/* =====================================================================
 *  ONBOARDING 부가 저장 (약관 / 방해앱)
 * ===================================================================== */
export async function saveConsent(c: Consent): Promise<Result> {
  if (backendMode === "demo") {
    const who = await currentUsername();
    if (who) setLs(LS.consentPfx + who, c);
    return { ok: true };
  }
  const id = await uid();
  if (!id) return { ok: false, error: "로그인이 필요해요." };
  const { error } = await supabase!.from("consents").upsert({ user_id: id, ...c });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function saveBlockedApps(apps: BlockedApp[]): Promise<Result> {
  if (backendMode === "demo") {
    const who = await currentUsername();
    if (who) setLs(LS.appsPfx + who, apps);
    return { ok: true };
  }
  const id = await uid();
  if (!id) return { ok: false, error: "로그인이 필요해요." };
  await supabase!.from("blocked_apps").delete().eq("user_id", id);
  if (apps.length) {
    const rows = apps.map((a) => ({ user_id: id, app_key: a.key, app_name: a.name }));
    const { error } = await supabase!.from("blocked_apps").insert(rows);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function getBlockedApps(): Promise<BlockedApp[]> {
  if (backendMode === "demo") {
    const who = await currentUsername();
    if (!who) return [];
    return ls<BlockedApp[]>(LS.appsPfx + who, []);
  }
  const id = await uid();
  if (!id) return [];
  const { data } = await supabase!
    .from("blocked_apps")
    .select("app_key, app_name")
    .eq("user_id", id);
  return (data ?? []).map((r: any) => ({ key: r.app_key, name: r.app_name }));
}

export async function isOnboarded(): Promise<boolean> {
  const who = await currentUsername();
  if (!who || typeof window === "undefined") return false;
  return localStorage.getItem(LS.onboardPfx + who) === "1";
}
export async function setOnboarded() {
  const who = await currentUsername();
  if (who && typeof window !== "undefined")
    localStorage.setItem(LS.onboardPfx + who, "1");
}

/* ---------- helpers ---------- */
function translate(msg: string): string {
  const m = msg.toLowerCase();
  if (
    m.includes("failed to fetch") ||
    m.includes("fetcherror") ||
    m.includes("network request") ||
    m.includes("networkerror")
  )
    return "Supabase 서버에 연결할 수 없어요. 프로젝트 URL과 상태를 확인해주세요.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "이미 가입된 아이디예요.";
  if (m.includes("invalid login")) return "아이디 또는 비밀번호가 올바르지 않아요.";
  if (m.includes("email not confirmed"))
    return "이메일 확인이 켜져 있어요. Supabase에서 Confirm email을 꺼주세요.";
  if (m.includes("password")) return "비밀번호는 6자 이상이어야 해요.";
  return msg;
}

function translateError(error: unknown): string {
  return translate(error instanceof Error ? error.message : String(error));
}
