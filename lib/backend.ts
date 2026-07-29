"use client";

import { isSupabaseConfigured, supabase, usernameToEmail } from "./supabase";

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
  isChatPro: boolean; // 수달 Chat Pro 구독 중
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
  const { error } = await supabase!.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });
  if (error) return { ok: false, error: translate(error.message) };
  return { ok: true };
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
  const { data } = await supabase!.auth.getUser();
  const u = data.user;
  if (!u) return null;
  return (u.user_metadata?.username as string) || u.email?.split("@")[0] || null;
}

async function uid(): Promise<string | null> {
  if (backendMode === "demo") return ls<string | null>(LS.session, null);
  const { data } = await supabase!.auth.getUser();
  return data.user?.id ?? null;
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
  // 구독 상태 (Stripe webhook 이 갱신한 profiles 컬럼)
  const { data: prof } = await supabase!
    .from("profiles")
    .select("pro_until, chatpro_until")
    .eq("id", id)
    .single();
  const now = Date.now();
  const isPro = !!prof?.pro_until && new Date(prof.pro_until).getTime() > now;
  const isChatPro = !!prof?.chatpro_until && new Date(prof.chatpro_until).getTime() > now;
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
    return ls<ScheduleEvent[]>(LS.schedPfx + who, defaultSchedules());
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

// 데모 최초 일정 (Figma 예시)
function defaultSchedules(): ScheduleEvent[] {
  const d = (offset: number) => {
    const t = new Date();
    t.setDate(t.getDate() + offset);
    return t.toISOString().slice(0, 10);
  };
  return [
    { id: "seed1", title: "통계학입문 시험", eventDate: d(2), source: "manual" },
    { id: "seed2", title: "영화의 이해 시험", eventDate: d(4), source: "manual" },
    { id: "seed3", title: "종강", eventDate: d(9), source: "manual" },
  ];
}

/* =====================================================================
 *  CHAT (수달이 챗봇 대화 기록)
 * ===================================================================== */
export type ChatRow = { role: "user" | "assistant"; content: string; at: number };
const CHAT_PFX = "dootter_chat_";

export async function getChat(): Promise<ChatRow[]> {
  if (backendMode === "demo") {
    const who = await currentUsername();
    if (!who) return [];
    return ls<ChatRow[]>(CHAT_PFX + who, []);
  }
  const id = await uid();
  if (!id) return [];
  const { data } = await supabase!
    .from("chat_messages")
    .select("role, content, created_at")
    .eq("user_id", id)
    .order("created_at", { ascending: true })
    .limit(200);
  return (data ?? []).map((r: any) => ({
    role: r.role,
    content: r.content,
    at: new Date(r.created_at).getTime(),
  }));
}

export async function addChat(role: "user" | "assistant", content: string) {
  if (backendMode === "demo") {
    const who = await currentUsername();
    if (!who) return;
    const arr = ls<ChatRow[]>(CHAT_PFX + who, []);
    arr.push({ role, content, at: Date.now() });
    setLs(CHAT_PFX + who, arr.slice(-200));
    return;
  }
  const id = await uid();
  if (!id) return;
  await supabase!.from("chat_messages").insert({ user_id: id, role, content });
}

/* =====================================================================
 *  STRIPE 결제 (구독) — 서버 라우트 /api/stripe/* 호출
 * ===================================================================== */
async function accessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function startCheckout(
  plan: "pro" | "chatpro"
): Promise<{ ok: boolean; url?: string; error?: string }> {
  if (backendMode === "demo") return { ok: false, error: "demo" };
  const t = await accessToken();
  if (!t) return { ok: false, error: "no_session" };
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
    body: JSON.stringify({ plan }),
  });
  const d = await res.json();
  return d.url ? { ok: true, url: d.url } : { ok: false, error: d.error || "failed" };
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
  if (m.includes("already registered") || m.includes("already been registered"))
    return "이미 가입된 아이디예요.";
  if (m.includes("invalid login")) return "아이디 또는 비밀번호가 올바르지 않아요.";
  if (m.includes("email not confirmed"))
    return "이메일 확인이 켜져 있어요. Supabase에서 Confirm email을 꺼주세요.";
  if (m.includes("password")) return "비밀번호는 6자 이상이어야 해요.";
  return msg;
}
