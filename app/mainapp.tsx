"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  addChat,
  addSchedule,
  addSessionLog,
  backendMode,
  deleteSchedule,
  getChat,
  getSchedules,
  getSessionLogs,
  loadState,
  saveState,
  signOut,
  type ChatRow,
  type ScheduleEvent,
  type SessionLog,
  type UserState,
} from "../lib/backend";
import type { OtterContext } from "../lib/llm";
import {
  ACHIEVEMENTS,
  aiComment,
  Achievement,
  AchCtx,
  calcDday,
  calcSession,
  checkAchievements,
  getUrgencyTier,
  HARMFUL,
  itemById,
  levelState,
  levelUpShells,
  OTTER_ITEMS,
  OtterItem,
  pickBubble,
  SHELL,
  SLOT_POS,
} from "../lib/logic";

type Tab = "character" | "stats" | "home" | "calendar" | "settings";
type Phase = "idle" | "selecting" | "running" | "paused";
const IMG = "/images";

/* ---------- date/time helpers ---------- */
const pad = (n: number) => n.toString().padStart(2, "0");
function fmt(sec: number) {
  return `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;
}
function fmtDur(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분 ${sec % 60}초`;
  return `${sec}초`;
}
function dstr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function todayStr() {
  return dstr(new Date());
}

// TopBar에서 채팅 열기 위한 context (프롭 드릴링 방지)
const OpenChat = createContext<() => void>(() => {});

// Supabase 통계/일정 → LLM 컨텍스트
function buildContext(
  state: UserState,
  logs: SessionLog[],
  schedules: ScheduleEvent[]
): OtterContext {
  const now = Date.now();
  const last7 = logs.filter((l) => l.at >= now - 7 * 86400000);
  const withDday = schedules.map((s) => ({
    title: s.title,
    dday: calcDday(s.eventDate),
  }));
  const upcoming = withDday.filter((s) => s.dday >= 0).sort((a, b) => a.dday - b.dday);
  return {
    username: state.username,
    level: levelState(state.totalExp).level,
    streak: state.streak,
    todayEffectiveMin: Math.round(state.todayEffectiveSec / 60),
    todayHarmfulMin: Math.round(state.todayHarmfulSec / 60),
    last7StudyMin: Math.round(last7.reduce((a, l) => a + l.effectiveSec, 0) / 60),
    last7HarmfulCount: last7.filter((l) => l.harmfulSec > 0).length,
    last7HarmfulMin: Math.round(last7.reduce((a, l) => a + l.harmfulSec, 0) / 60),
    totalEffectiveMin: Math.round(state.effectiveSeconds / 60),
    totalStopMin: Math.round(state.stopSeconds / 60),
    totalHarmfulMin: Math.round(state.harmfulSeconds / 60),
    nearestDday: upcoming[0] ?? null,
    schedules: withDday,
  };
}

const TIME_OPTIONS = [
  { label: "20분", min: 20 },
  { label: "50분", min: 50 },
  { label: "1시간", min: 60 },
  { label: "2시간", min: 120 },
  { label: "스톱워치", min: 0 },
];

type SessionOutcome = {
  effectiveSec: number;
  harmfulSec: number;
  qualityRatio: number;
  expEarned: number;
  oldLevel: number;
  newLevel: number;
  shellsGained: number;
  achievements: Achievement[];
  goalReached: boolean;
};

export default function MainApp({ onSignOut }: { onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>("home");
  const [state, setState] = useState<UserState | null>(null);
  const [schedules, setSchedules] = useState<ScheduleEvent[]>([]);
  const [logs, setLogs] = useState<SessionLog[]>([]);

  // timer
  const [phase, setPhase] = useState<Phase>("idle");
  const [targetMin, setTargetMin] = useState(0);
  const [studySec, setStudySec] = useState(0); // 총 타이머 시간
  const [harmfulSec, setHarmfulSec] = useState(0);
  const [stopSec, setStopSec] = useState(0);
  const [harmfulActive, setHarmfulActive] = useState(false);
  const [contHarmful, setContHarmful] = useState(0);
  const [alarm, setAlarm] = useState<string | null>(null);

  const [outcome, setOutcome] = useState<SessionOutcome | null>(null);
  const [oops, setOops] = useState(false);
  const finishRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 수달이 LLM (챗봇 + 홈 터치 멘트)
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsgs, setChatMsgs] = useState<ChatRow[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [tapLine, setTapLine] = useState<string | null>(null);
  const [tapBusy, setTapBusy] = useState(false);

  async function refresh() {
    setState(await loadState());
    setSchedules(await getSchedules());
    setLogs(await getSessionLogs());
  }
  useEffect(() => {
    refresh();
  }, []);

  // 1초 틱
  useEffect(() => {
    if (phase !== "running" && phase !== "paused") return;
    const id = setInterval(() => {
      if (phase === "paused") {
        setStopSec((s) => s + 1);
        return;
      }
      setStudySec((s) => s + 1);
      if (harmfulActive) {
        setHarmfulSec((h) => h + 1);
        setContHarmful((c) => c + 1);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [phase, harmfulActive]);

  // 유해앱 알람 티어
  useEffect(() => {
    if (!harmfulActive) return;
    if (contHarmful === HARMFUL.mildAtSec) setAlarm(HARMFUL.mild);
    else if (contHarmful === HARMFUL.strongAtSec) setAlarm(HARMFUL.strong);
  }, [contHarmful, harmfulActive]);

  // 목표 시간 도달 → 자동 완료
  useEffect(() => {
    if (phase === "running" && targetMin > 0 && studySec >= targetMin * 60) {
      finishSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studySec, phase, targetMin]);

  const lv = state ? levelState(state.totalExp) : { level: 1, currentExp: 0, nextReq: 60 };

  // ---- 수달이 LLM ----
  async function openChat() {
    setChatOpen(true);
    setChatMsgs(await getChat());
  }

  async function sendChat(text: string) {
    if (!state || chatBusy) return;
    const userMsg: ChatRow = { role: "user", content: text, at: Date.now() };
    const nextMsgs = [...chatMsgs, userMsg];
    setChatMsgs(nextMsgs);
    setChatBusy(true);
    addChat("user", text);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: buildContext(state, logs, schedules),
          messages: nextMsgs.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply: ChatRow = {
        role: "assistant",
        content: data.reply || "음… 다시 말해줄래?",
        at: Date.now(),
      };
      setChatMsgs((m) => [...m, reply]);
      addChat("assistant", reply.content);
    } catch {
      setChatMsgs((m) => [
        ...m,
        { role: "assistant", content: "앗, 연결이 잠깐 끊겼어. 다시 보내줄래?", at: Date.now() },
      ]);
    } finally {
      setChatBusy(false);
    }
  }

  async function tapOtter() {
    if (!state || tapBusy) return;
    setTapBusy(true);
    setTapLine("음…");
    try {
      const res = await fetch("/api/otter-line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildContext(state, logs, schedules)),
      });
      const data = await res.json();
      setTapLine(data.line || "오늘도 화이팅! 🦦");
    } catch {
      setTapLine("오늘도 같이 공부하자! 🦦");
    } finally {
      setTapBusy(false);
      setTimeout(() => setTapLine(null), 6000); // 6초 후 원래 말풍선으로
    }
  }

  /* ---------- session control ---------- */
  function startSelecting() {
    setPhase("selecting");
  }
  function beginSession(min: number) {
    setTargetMin(min);
    setStudySec(0);
    setHarmfulSec(0);
    setStopSec(0);
    setContHarmful(0);
    setHarmfulActive(false);
    setPhase("running");
  }
  function toggleHarmful() {
    if (harmfulActive) {
      setHarmfulActive(false);
      setContHarmful(0);
      setAlarm(HARMFUL.praise);
    } else {
      setHarmfulActive(true);
      setContHarmful(0);
    }
  }

  async function finishSession() {
    if (!state) return;
    setPhase("idle");
    setHarmfulActive(false);
    setAlarm(null);
    const total = studySec;
    const harmful = harmfulSec;
    const res = calcSession(total, harmful);

    const next: UserState = { ...state };
    const today = todayStr();
    // 오늘 카운터 리셋
    if (next.todayDate !== today) {
      next.todayDate = today;
      next.todayEffectiveSec = 0;
      next.todayHarmfulSec = 0;
      next.dailyGoalClaimed = false;
    }
    // 누적
    const oldLevel = levelState(next.totalExp).level;
    next.totalExp += res.expEarned;
    next.totalTimerSeconds += total;
    next.effectiveSeconds += res.effectiveSec;
    next.harmfulSeconds += harmful;
    next.stopSeconds += stopSec;
    next.todayEffectiveSec += res.effectiveSec;
    next.todayHarmfulSec += harmful;
    next.sessionCount += 1;
    if (harmful === 0) next.harmfulFreeSessions += 1;
    if (harmful > 0) next.angryCount += 1;

    // 스트릭
    const yesterday = dstr(new Date(Date.now() - 86400000));
    if (next.lastStudyDate === today) {
      /* 유지 */
    } else if (next.lastStudyDate === yesterday) next.streak += 1;
    else next.streak = 1;
    next.lastStudyDate = today;

    const newLevel = levelState(next.totalExp).level;
    let shellsGained = 0;
    if (newLevel > oldLevel) {
      const up = levelUpShells(oldLevel, newLevel);
      shellsGained += up;
    }
    // 데일리 목표 100%
    let goalReached = false;
    if (
      next.todayEffectiveSec / 60 >= next.dailyGoalMin &&
      !next.dailyGoalClaimed
    ) {
      next.dailyGoalClaimed = true;
      goalReached = true;
      shellsGained += SHELL.dailyGoal;
    }
    // 업적 판정
    const ctx: AchCtx = {
      sessionCount: next.sessionCount,
      effectiveMinTotal: Math.floor(next.effectiveSeconds / 60),
      harmfulFreeSessions: next.harmfulFreeSessions,
      streak: next.streak,
      level: newLevel,
      shellsEarnedTotal: next.shellsEarnedTotal + shellsGained,
      lastStartHour: new Date().getHours(),
      lastSessionEffectiveSec: res.effectiveSec,
      dailyGoalMet: goalReached || next.dailyGoalClaimed,
      weekendStreak: false,
    };
    const newlyUnlocked = checkAchievements(ctx, next.unlocked);
    for (const a of newlyUnlocked) {
      next.unlocked.push(a.id);
      shellsGained += a.reward;
    }
    next.shells += shellsGained;
    next.shellsEarnedTotal += shellsGained;

    setState(next);
    await saveState(next);
    await addSessionLog({
      totalSec: total,
      harmfulSec: harmful,
      effectiveSec: res.effectiveSec,
      qualityRatio: res.qualityRatio,
      expEarned: res.expEarned,
      at: Date.now(),
    });
    setLogs(await getSessionLogs());

    setOutcome({
      effectiveSec: res.effectiveSec,
      harmfulSec: harmful,
      qualityRatio: res.qualityRatio,
      expEarned: res.expEarned,
      oldLevel,
      newLevel,
      shellsGained,
      achievements: newlyUnlocked,
      goalReached,
    });
  }

  function closeOutcome() {
    setOutcome(null);
    setStudySec(0);
    setHarmfulSec(0);
    setStopSec(0);
    setContHarmful(0);
  }

  function stopDown() {
    finishRef.current = setTimeout(finishSession, 700);
  }
  function stopUp() {
    if (finishRef.current) clearTimeout(finishRef.current);
  }

  /* ---------- settings actions ---------- */
  async function watchAd() {
    if (!state) return;
    const next = { ...state };
    const today = todayStr();
    if (next.adDate !== today) {
      next.adDate = today;
      next.adWatchedToday = 0;
    }
    if (next.adWatchedToday >= SHELL.adDailyLimit) {
      setAlarm("오늘 광고 조개는 다 받았어요 (일 5회)");
      return;
    }
    next.adWatchedToday += 1;
    next.shells += SHELL.adWatch;
    next.shellsEarnedTotal += SHELL.adWatch;
    setState(next);
    await saveState(next);
    setAlarm(`광고 시청 완료! 조개 +${SHELL.adWatch} 🐚`);
  }

  async function simulateOops() {
    if (!state) return;
    const next = { ...state };
    const today = todayStr();
    if (next.todayDate !== today) {
      next.todayDate = today;
      next.todayEffectiveSec = 0;
      next.todayHarmfulSec = 0;
      next.dailyGoalClaimed = false;
    }
    next.harmfulSeconds += 30 * 60;
    next.todayHarmfulSec += 30 * 60;
    next.angryCount += 1;
    setState(next);
    await saveState(next);
    setOops(true);
  }

  async function buyItem(item: OtterItem) {
    if (!state) return;
    if (state.ownedItems.includes(item.id)) return;
    if (state.shells < item.price) {
      setAlarm("조개가 부족해요! 공부하고 더 모아볼까요? 🐚");
      return;
    }
    const next: UserState = { ...state };
    next.shells -= item.price;
    next.ownedItems = [...next.ownedItems, item.id];
    // 구매 시 같은 슬롯 아이템 교체하여 자동 착용
    next.equippedItems = [
      ...next.equippedItems.filter((id) => itemById(id)?.slot !== item.slot),
      item.id,
    ];
    setState(next);
    await saveState(next);
    setAlarm(`${item.name} 구매 완료! 수달이가 착용했어요 ${item.emoji}`);
  }

  async function toggleEquip(item: OtterItem) {
    if (!state || !state.ownedItems.includes(item.id)) return;
    const next: UserState = { ...state };
    if (next.equippedItems.includes(item.id)) {
      next.equippedItems = next.equippedItems.filter((id) => id !== item.id);
    } else {
      next.equippedItems = [
        ...next.equippedItems.filter((id) => itemById(id)?.slot !== item.slot),
        item.id,
      ];
    }
    setState(next);
    await saveState(next);
  }

  async function addUserSchedule(title: string, date: string) {
    await addSchedule(title, date);
    setSchedules(await getSchedules());
  }
  async function removeSchedule(id: string) {
    await deleteSchedule(id);
    setSchedules(await getSchedules());
  }

  // 메인 말풍선 (D-day 티어)
  const bubble = useMemo(() => {
    const upcoming = schedules
      .map((s) => ({ ...s, dday: calcDday(s.eventDate) }))
      .filter((s) => s.dday >= 0)
      .sort((a, b) => a.dday - b.dday)[0];
    if (!upcoming) return pickBubble("일정없음", "", 0, schedules.length);
    const tier = getUrgencyTier(upcoming.dday);
    return pickBubble(tier, upcoming.title, upcoming.dday, upcoming.dday + upcoming.title.length);
  }, [schedules]);

  if (!state) {
    return (
      <div className="screen">
        <div className="notch" />
        <div className="view" style={{ display: "grid", placeItems: "center" }}>
          <img src={`${IMG}/otter_default1.png`} width={120} alt="loading" />
        </div>
      </div>
    );
  }

  return (
    <OpenChat.Provider value={openChat}>
    <div className="screen">
      <div className="notch" />
      <StatusBar />

      {tab === "home" && (
        <HomeView
          state={state}
          lv={lv}
          phase={phase}
          studySec={studySec}
          targetMin={targetMin}
          harmfulActive={harmfulActive}
          bubble={bubble}
          onPlay={startSelecting}
          onSelect={beginSession}
          onPause={() => setPhase("paused")}
          onResume={() => setPhase("running")}
          onToggleHarmful={toggleHarmful}
          stopDown={stopDown}
          stopUp={stopUp}
          equipped={state.equippedItems}
          onTapOtter={tapOtter}
          tapLine={tapLine}
        />
      )}
      {tab === "calendar" && (
        <CalendarView
          state={state}
          lv={lv}
          schedules={schedules}
          onAdd={addUserSchedule}
          onDelete={removeSchedule}
        />
      )}
      {tab === "stats" && <StatsView state={state} lv={lv} logs={logs} />}
      {tab === "character" && (
        <CharacterView state={state} lv={lv} onBuy={buyItem} onEquip={toggleEquip} />
      )}
      {tab === "settings" && (
        <SettingsView
          state={state}
          lv={lv}
          onAd={watchAd}
          onOops={simulateOops}
          onCustomize={() => setTab("character")}
          onSignOut={async () => {
            await signOut();
            onSignOut();
          }}
        />
      )}

      {alarm && (
        <div className="blockwarn" onClick={() => setAlarm(null)}>
          <span className="bw-emoji">🦦</span>
          <div>
            <div className="bw-t">{alarm}</div>
            <div className="bw-d">탭하면 닫혀요</div>
          </div>
        </div>
      )}

      {outcome && <CongratsOverlay o={outcome} onClose={closeOutcome} />}
      {oops && <OopsOverlay onClose={() => setOops(false)} />}

      {chatOpen && (
        <ChatView
          username={state.username}
          msgs={chatMsgs}
          busy={chatBusy}
          onSend={sendChat}
          onClose={() => setChatOpen(false)}
        />
      )}

      <BottomNav tab={tab} setTab={setTab} />
    </div>
    </OpenChat.Provider>
  );
}

/* ================================================================== */
function StatusBar() {
  return (
    <div className="statusbar">
      <span>9:41</span>
      <span className="sb-icons">
        <span>􀙇</span>
        <span>􀛨</span>
        <span>􀛧</span>
      </span>
    </div>
  );
}

type LV = { level: number; currentExp: number; nextReq: number };
function TopBar({ state, lv }: { state: UserState; lv: LV }) {
  const openChat = useContext(OpenChat);
  const xp = `${Math.round((lv.currentExp / lv.nextReq) * 100)}%`;
  return (
    <>
      <div className="topbar">
        <div className="shell-pill">
          <span className="shell">🐚</span>
          {state.shells.toLocaleString()}
        </div>
        <button className="bell" aria-label="알림">
          🔔
        </button>
      </div>
      <div className="level-row">
        <div className="level-pill">
          <span className="level-badge">Lv.{lv.level}</span>
          <div className="level-track">
            <div className="level-fill" style={{ ["--xp" as string]: xp }} />
          </div>
        </div>
        <button className="otter-chat-btn" onClick={openChat} aria-label="수달이와 채팅">
          <img src={`${IMG}/face_happy.png`} alt="수달이" />
          <span className="chat-dot" />
        </button>
      </div>
      <div className="exp-caption">
        EXP {lv.currentExp} / {lv.nextReq}
      </div>
    </>
  );
}

/* --------------------------- OTTER AVATAR --------------------------- */
function OtterAvatar({
  img,
  equipped,
  children,
  onClick,
}: {
  img: string;
  equipped: string[];
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      className={`avatar ${onClick ? "tappable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      {children}
      <img src={`${IMG}/${img}`} alt="otter" />
      {equipped.map((id) => {
        const it = itemById(id);
        if (!it) return null;
        const pos = SLOT_POS[it.slot];
        return (
          <span
            key={id}
            className="otter-item"
            style={{ top: pos.top, left: pos.left, fontSize: pos.size }}
          >
            {it.emoji}
          </span>
        );
      })}
    </div>
  );
}

/* ------------------------------ HOME ------------------------------ */
function HomeView(p: {
  state: UserState;
  lv: LV;
  phase: Phase;
  studySec: number;
  targetMin: number;
  harmfulActive: boolean;
  bubble: string;
  onPlay: () => void;
  onSelect: (min: number) => void;
  onPause: () => void;
  onResume: () => void;
  onToggleHarmful: () => void;
  stopDown: () => void;
  stopUp: () => void;
  equipped: string[];
  onTapOtter: () => void;
  tapLine: string | null;
}) {
  const running = p.phase === "running";
  const active = p.phase === "running" || p.phase === "paused";
  const otter = p.harmfulActive
    ? "otter_astonished.png"
    : running
    ? "otter_study.png"
    : "otter_default1.png";
  const remain =
    p.targetMin > 0 ? Math.max(0, p.targetMin * 60 - p.studySec) : null;
  const bubbleText = p.tapLine
    ? p.tapLine
    : p.harmfulActive
    ? HARMFUL.strong
    : p.bubble;

  return (
    <div className="view">
      <TopBar state={p.state} lv={p.lv} />

      <div className="avatar-wrap">
        <OtterAvatar img={otter} equipped={p.equipped} onClick={p.onTapOtter}>
          <div className="speech">{bubbleText}</div>
        </OtterAvatar>
      </div>
      <div className="tap-hint">수달이를 톡 건드려봐! 🫧</div>

      <div className="timer">{fmt(p.studySec)}</div>
      <div className="mode-tag">
        {running && !p.harmfulActive && "STUDY MODE · 집중하는 중"}
        {running && p.harmfulActive && "⚠️ 딴짓 중 · 순공시간이 줄고 있어요"}
        {p.phase === "paused" && "일시정지"}
        {p.phase === "idle" && " "}
        {p.phase === "selecting" && "공부 시간을 선택하세요"}
      </div>

      {p.phase === "selecting" && (
        <div className="time-select">
          {TIME_OPTIONS.map((t) => (
            <button key={t.label} className="time-chip" onClick={() => p.onSelect(t.min)}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {active && remain !== null && (
        <div className="target-line">목표 {p.targetMin}분 · 남은 시간 {fmt(remain)}</div>
      )}

      <div className="controls">
        {p.phase === "idle" && (
          <button className="claybtn play" onClick={p.onPlay} aria-label="시작">
            ▶
          </button>
        )}
        {running && (
          <>
            <button className="claybtn small" onClick={p.onPause} aria-label="일시정지">
              ❚❚
            </button>
            <button
              className="claybtn small"
              onMouseDown={p.stopDown}
              onMouseUp={p.stopUp}
              onMouseLeave={p.stopUp}
              onTouchStart={p.stopDown}
              onTouchEnd={p.stopUp}
              aria-label="정지(길게)"
            >
              ■
            </button>
          </>
        )}
        {p.phase === "paused" && (
          <>
            <button className="claybtn small" onClick={p.onResume} aria-label="다시 시작">
              ▶
            </button>
            <button
              className="claybtn small"
              onMouseDown={p.stopDown}
              onMouseUp={p.stopUp}
              onMouseLeave={p.stopUp}
              onTouchStart={p.stopDown}
              onTouchEnd={p.stopUp}
              aria-label="정지(길게)"
            >
              ■
            </button>
          </>
        )}
      </div>

      {active && (
        <>
          <button
            className={`distract-btn ${p.harmfulActive ? "on" : ""}`}
            onClick={p.onToggleHarmful}
          >
            {p.harmfulActive ? "📚 공부로 돌아가기" : "📱 딴짓하기 (유해앱 열기)"}
          </button>
          <div className="hint-hold">■ 정지 버튼을 꾹 누르면 세션이 완료돼요</div>
        </>
      )}
    </div>
  );
}

/* ----------------------------- STATS (기록) ----------------------------- */
function StatsView({ state, lv, logs }: { state: UserState; lv: LV; logs: SessionLog[] }) {
  const goalSec = state.dailyGoalMin * 60;
  const todayPct = Math.min(100, Math.round((state.todayEffectiveSec / goalSec) * 100));

  // 최근 7일 / 28일 집계
  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of logs) {
      const key = dstr(new Date(l.at));
      map.set(key, (map.get(key) ?? 0) + l.effectiveSec);
    }
    return map;
  }, [logs]);

  const week = useMemo(() => {
    const arr: { label: string; sec: number }[] = [];
    const wd = ["일", "월", "화", "수", "목", "금", "토"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      arr.push({ label: wd[d.getDay()], sec: byDay.get(dstr(d)) ?? 0 });
    }
    return arr;
  }, [byDay]);
  const weekMax = Math.max(60, ...week.map((w) => w.sec));

  const heat = useMemo(() => {
    const arr: { date: string; sec: number }[] = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      arr.push({ date: dstr(d), sec: byDay.get(dstr(d)) ?? 0 });
    }
    return arr;
  }, [byDay]);
  const heatLevel = (sec: number) => {
    if (sec === 0) return 0;
    const m = sec / 60;
    if (m < 20) return 1;
    if (m < 60) return 2;
    if (m < 120) return 3;
    return 4;
  };

  const unlocked = new Set(state.unlocked);
  const nextAch = ACHIEVEMENTS.find((a) => !unlocked.has(a.id));
  const [modal, setModal] = useState<Achievement | null>(null);

  const comment = aiComment({
    todayEffectiveMin: Math.floor(state.todayEffectiveSec / 60),
    goalMin: state.dailyGoalMin,
    streak: state.streak,
    harmfulMinToday: Math.floor(state.todayHarmfulSec / 60),
  });

  return (
    <div className="view">
      <TopBar state={state} lv={lv} />

      {/* 오늘 요약 링 */}
      <div className="section-title" style={{ marginTop: 14 }}>
        오늘 요약
      </div>
      <div className="card">
        <div className="today-row">
          <Ring pct={todayPct} />
          <div className="today-lines">
            <div className="tl-big">순공 {fmtDur(state.todayEffectiveSec)}</div>
            <div className="tl-sub">목표 {state.dailyGoalMin}분 · 달성 {todayPct}%</div>
            <div className="tl-sub">🔥 {state.streak}일 연속 · 세션 {state.sessionCount}회</div>
          </div>
        </div>
      </div>

      {/* 업적 트레이 */}
      <div className="section-title">
        업적 <span className="count-chip">{unlocked.size}/{ACHIEVEMENTS.length}</span>
      </div>
      <div className="badge-tray">
        {ACHIEVEMENTS.map((a) => {
          const on = unlocked.has(a.id);
          return (
            <div
              key={a.id}
              className={`badge ${on ? "on" : "off"}`}
              onClick={() => setModal(a)}
            >
              <div className="badge-ic">{on ? "🏅" : "🔒"}</div>
              <div className="badge-name">{a.name}</div>
            </div>
          );
        })}
      </div>

      {/* 누적 기록 (요청하신 로그) */}
      <div className="section-title">누적 기록</div>
      <div className="card">
        <TotalRow ic="⏱️" label="총 공부(타이머) 시간" val={fmtDur(state.totalTimerSeconds)} />
        <TotalRow ic="📖" label="순공시간" val={fmtDur(state.effectiveSeconds)} />
        <TotalRow ic="⏸️" label="총 타이머 스톱 시간" val={fmtDur(state.stopSeconds)} />
        <TotalRow ic="📵" label="총 외부 앱 액세스 시간" val={fmtDur(state.harmfulSeconds)} />
        <TotalRow ic="🐚" label="조개 · 레벨 · EXP" val={`${state.shells}개 · Lv.${lv.level} · ${state.totalExp}`} />
      </div>

      {/* 월간 히트맵 */}
      <div className="section-title">월간 히트맵 (최근 4주)</div>
      <div className="card">
        <div className="heat-grid">
          {heat.map((h) => (
            <div key={h.date} className={`heat-cell h${heatLevel(h.sec)}`} title={`${h.date} · ${fmtDur(h.sec)}`} />
          ))}
        </div>
        <div className="heat-legend">
          적음 <span className="hl h0" /> <span className="hl h1" /> <span className="hl h2" /> <span className="hl h3" /> <span className="hl h4" /> 많음
        </div>
      </div>

      {/* 주간 그래프 */}
      <div className="section-title">주간 리포트</div>
      <div className="card">
        <div className="bars">
          {week.map((w, i) => (
            <div key={i} className="bar-col">
              <div className="bar" style={{ height: `${Math.round((w.sec / weekMax) * 100)}%` }} />
              <div className="bar-lbl">{w.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI 코멘트 */}
      <div className="section-title">수달 AI 코멘트</div>
      <div className="ai-card">
        <img src={`${IMG}/otter_study.png`} width={54} alt="" />
        <div className="ai-text">{comment}</div>
      </div>

      {nextAch && (
        <div className="next-ach">🎯 다음 업적: <b>{nextAch.name}</b> — {nextAch.cond}</div>
      )}

      {modal && (
        <div className="ach-modal-bg" onClick={() => setModal(null)}>
          <div className="ach-modal" onClick={(e) => e.stopPropagation()}>
            <div className="am-ic">{unlocked.has(modal.id) ? "🏅" : "🔒"}</div>
            <div className="am-name">{modal.name}</div>
            <div className="am-cond">{modal.cond}</div>
            <div className="am-meta">{modal.category} · {modal.tier} · 보상 🐚 {modal.reward}</div>
            <div className={`am-status ${unlocked.has(modal.id) ? "done" : ""}`}>
              {unlocked.has(modal.id) ? "달성 완료!" : "미달성"}
            </div>
            <button className="primary-btn" onClick={() => setModal(null)}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  return (
    <svg width="86" height="86" viewBox="0 0 86 86" className="ring">
      <circle cx="43" cy="43" r={r} fill="none" stroke="#eaddc2" strokeWidth="9" />
      <circle
        cx="43" cy="43" r={r} fill="none" stroke="#a9784e" strokeWidth="9"
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        transform="rotate(-90 43 43)"
      />
      <text x="43" y="49" textAnchor="middle" fontSize="20" fontWeight="800" fill="#7c5a3c">
        {pct}%
      </text>
    </svg>
  );
}
function TotalRow({ ic, label, val }: { ic: string; label: string; val: string }) {
  return (
    <div className="total-row">
      <div className="total-ico">{ic}</div>
      <div className="tl">{label}</div>
      <div className="tv">{val}</div>
    </div>
  );
}

/* ----------------------------- CALENDAR (일정) ----------------------------- */
function CalendarView(p: {
  state: UserState;
  lv: LV;
  schedules: ScheduleEvent[];
  onAdd: (t: string, d: string) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayStr());
  const withDday = p.schedules
    .map((s) => ({ ...s, dday: calcDday(s.eventDate) }))
    .sort((a, b) => a.dday - b.dday);
  const upcoming = withDday.filter((s) => s.dday >= 0);
  const nearest = upcoming[0];
  const tierClass = (dday: number) => {
    const t = getUrgencyTier(dday);
    return t === "긴급" || t === "당일" ? "urgent" : t === "주의" ? "warn" : "calm";
  };

  return (
    <div className="view">
      <TopBar state={p.state} lv={p.lv} />

      {nearest && (
        <div className={`dday-hero ${tierClass(nearest.dday)}`}>
          <div className="dh-tier">{getUrgencyTier(nearest.dday)}</div>
          <div className="dh-title">{nearest.title}</div>
          <div className="dh-dday">{nearest.dday === 0 ? "D-DAY" : `D-${nearest.dday}`}</div>
        </div>
      )}

      <div className="section-title" style={{ marginTop: 6 }}>일정 추가</div>
      <div className="card">
        <div className="field" style={{ marginBottom: 10 }}>
          <input
            placeholder="일정명 (예: 중간고사)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="add-row">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button
            className="add-btn"
            onClick={() => {
              if (title.trim()) {
                p.onAdd(title.trim(), date);
                setTitle("");
              }
            }}
          >
            추가
          </button>
        </div>
        <div className="gcal-mini">📅 구글 캘린더 연동됨 · 자동 동기화</div>
      </div>

      <div className="section-title">등록된 일정</div>
      <div className="card">
        {withDday.length === 0 && <div className="empty-line">등록된 일정이 없어요</div>}
        {withDday.map((s) => (
          <div key={s.id} className="sched-row">
            <div className="sched-info">
              <div className="sched-title">{s.title}</div>
              <div className="sched-date">{s.eventDate}</div>
            </div>
            <div className={`sched-dday ${s.dday < 0 ? "past" : tierClass(s.dday)}`}>
              {s.dday < 0 ? "지남" : s.dday === 0 ? "D-DAY" : `D-${s.dday}`}
            </div>
            <button className="sched-del" onClick={() => p.onDelete(s.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------- CHARACTER (수달 커스텀) --------------------- */
function CharacterView({
  state,
  lv,
  onBuy,
  onEquip,
}: {
  state: UserState;
  lv: LV;
  onBuy: (i: OtterItem) => void;
  onEquip: (i: OtterItem) => void;
}) {
  return (
    <div className="view">
      <TopBar state={state} lv={lv} />

      {/* 미리보기 */}
      <div className="custom-preview">
        <OtterAvatar img="otter_default1.png" equipped={state.equippedItems} />
      </div>
      <div className="char-name">{state.username}</div>
      <div className="char-sub">
        Lv.{lv.level} · 🔥{state.streak}일 연속 · 🏅{state.unlocked.length}개 업적
      </div>

      <div className="section-title">
        수달 커스텀 <span className="count-chip">보유 {state.ownedItems.length}개</span>
      </div>
      <div className="shop-grid">
        {OTTER_ITEMS.map((it) => {
          const owned = state.ownedItems.includes(it.id);
          const equipped = state.equippedItems.includes(it.id);
          const canBuy = state.shells >= it.price;
          return (
            <div key={it.id} className={`shop-item ${equipped ? "equipped" : ""}`}>
              <div className={`grade-tag g-${it.grade}`}>{it.grade}</div>
              <div className="emoji">{it.emoji}</div>
              <div className="name">{it.name}</div>
              {!owned ? (
                <button
                  className={`shop-btn buy ${canBuy ? "" : "off"}`}
                  onClick={() => onBuy(it)}
                >
                  🐚 {it.price}
                </button>
              ) : (
                <button
                  className={`shop-btn ${equipped ? "on" : "equip"}`}
                  onClick={() => onEquip(it)}
                >
                  {equipped ? "착용중 ✓" : "착용"}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="custom-hint">
        아이템을 사면 자동으로 착용돼요. 같은 부위는 하나만 착용할 수 있어요.
      </div>
    </div>
  );
}

/* ---------------------------- SETTINGS ---------------------------- */
function SettingsView(p: {
  state: UserState;
  lv: LV;
  onAd: () => void;
  onOops: () => void;
  onCustomize: () => void;
  onSignOut: () => void;
}) {
  const [block, setBlock] = useState(true);
  const [noti, setNoti] = useState(true);
  const [gcal, setGcal] = useState(true);
  const [dark, setDark] = useState(false);
  const [notiTiming, setNotiTiming] = useState("자동");
  const [timerMode, setTimerMode] = useState("일반");
  const rows: [string, string, string, boolean, (v: boolean) => void][] = [
    ["📵", "방해 앱 차단", "공부 중 지정한 앱을 잠가요", block, setBlock],
    ["🔔", "알림", "d-day와 목표 알림을 받아요", noti, setNoti],
    ["📅", "구글 캘린더 연동", "일정을 자동으로 동기화해요", gcal, setGcal],
    ["🌙", "다크 모드", "밤에 눈이 편한 화면", dark, setDark],
  ];
  return (
    <div className="view">
      <TopBar state={p.state} lv={p.lv} />
      <div className="section-title" style={{ marginTop: 14 }}>
        계정
        <span className={`mode-chip ${backendMode === "supabase" ? "live" : "demo"}`}>
          {backendMode === "supabase" ? "● Supabase" : "● 데모"}
        </span>
      </div>
      <div className="card">
        <div className="set-item" style={{ borderBottom: "none" }}>
          <div className="set-ico">🦦</div>
          <div className="set-txt">
            <div className="t">{p.state.username}</div>
            <div className="d">Lv.{p.lv.level} · 조개 {p.state.shells}개</div>
          </div>
        </div>
      </div>

      <div className="section-title">환경 설정</div>
      <div className="card">
        {rows.map(([e, t, d, val, set]) => (
          <div key={t} className="set-item">
            <div className="set-ico">{e}</div>
            <div className="set-txt">
              <div className="t">{t}</div>
              <div className="d">{d}</div>
            </div>
            <div className={`toggle ${val ? "on" : ""}`} onClick={() => set(!val)}>
              <div className="knob" />
            </div>
          </div>
        ))}
        <div className="set-item">
          <div className="set-ico">⏰</div>
          <div className="set-txt">
            <div className="t">유해앱 알림 시점</div>
            <div className="d">유해앱 사용 후 알림 타이밍</div>
          </div>
          <SegPick opts={["자동", "10분", "20분", "30분"]} val={notiTiming} set={setNotiTiming} />
        </div>
        <div className="set-item" style={{ borderBottom: "none" }}>
          <div className="set-ico">🍅</div>
          <div className="set-txt">
            <div className="t">타이머 모드</div>
            <div className="d">뽀모도로 등</div>
          </div>
          <SegPick opts={["일반", "뽀모도로"]} val={timerMode} set={setTimerMode} />
        </div>
      </div>

      <div className="section-title">수달 · 조개</div>
      <div className="card">
        <MenuRow ic="🎨" t="수달 커스텀 설정" d="아이템으로 수달이를 꾸며요" onClick={p.onCustomize} />
        <MenuRow ic="😊" t="수달 모드 설정" d="응원형 / 츤데레형 등" />
        <button className="wide-btn" onClick={p.onAd}>📺 광고 보고 조개 얻기 (+{SHELL.adWatch})</button>
        <button className="wide-btn pro">👑 Pro 수달 결제 (광고 제거 + 커스텀)</button>
      </div>

      <div className="section-title">체험하기</div>
      <div className="card">
        <div className="set-item" style={{ borderBottom: "none" }}>
          <div className="set-ico">🚫</div>
          <div className="set-txt">
            <div className="t">방해앱 사용 시뮬레이션</div>
            <div className="d">외부 앱 30분 사용 → 기록 + 수달 화남</div>
          </div>
        </div>
        <button className="danger-btn" onClick={p.onOops}>유해 앱 사용해보기 😾</button>
      </div>

      <button className="ghost-btn" onClick={p.onSignOut}>로그아웃</button>
    </div>
  );
}
function MenuRow({
  ic,
  t,
  d,
  onClick,
}: {
  ic: string;
  t: string;
  d: string;
  onClick?: () => void;
}) {
  return (
    <div className="set-item" onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}>
      <div className="set-ico">{ic}</div>
      <div className="set-txt">
        <div className="t">{t}</div>
        <div className="d">{d}</div>
      </div>
      <div className="chev">›</div>
    </div>
  );
}
function SegPick({ opts, val, set }: { opts: string[]; val: string; set: (v: string) => void }) {
  return (
    <div className="segpick">
      {opts.map((o) => (
        <button key={o} className={val === o ? "on" : ""} onClick={() => set(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------- OVERLAYS ---------------------------- */
function CongratsOverlay({ o, onClose }: { o: SessionOutcome; onClose: () => void }) {
  const leveled = o.newLevel > o.oldLevel;
  return (
    <div className="overlay congrats">
      <h2>{leveled ? "LEVEL UP! 🎉" : "Congratulations!"}</h2>
      <img className="otterbig" src={`${IMG}/otter_cheer.png`} alt="cheer" />
      <div className="pts-pill">
        <span className="plus">+{o.expEarned} EXP</span>
        {o.shellsGained > 0 && <span className="plus">+{o.shellsGained} 🐚</span>}
      </div>
      <div className="msg">
        순공 {fmtDur(o.effectiveSec)} · 품질 {Math.round(o.qualityRatio * 100)}%
        {leveled && (
          <>
            <br />
            <b>Lv.{o.oldLevel} → Lv.{o.newLevel}!</b>
          </>
        )}
        {o.goalReached && (
          <>
            <br />
            🎯 오늘 목표 달성!
          </>
        )}
      </div>
      {o.achievements.length > 0 && (
        <div className="ach-earned">
          {o.achievements.map((a) => (
            <div key={a.id} className="ach-earned-row">
              🏅 <b>{a.name}</b> 달성 {a.reward > 0 && `(+${a.reward}🐚)`}
            </div>
          ))}
        </div>
      )}
      <button className="continue" onClick={onClose}>계속</button>
    </div>
  );
}
function OopsOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay oops">
      <h2>Oops!</h2>
      <img className="otterbig" src={`${IMG}/otter_astonished.png`} alt="oops" />
      <div className="pts-pill">
        <span className="minus">유해앱 30분</span>
        <span className="minus">순공 감소</span>
      </div>
      <div className="msg">
        나쁜 앱 사용시간 30min
        <br />
        수달이가 화났어요 · 기록에 남았어요
      </div>
      <button className="continue" onClick={onClose}>계속</button>
    </div>
  );
}

/* ----------------------- CHAT (수달이 챗봇) ----------------------- */
function ChatView({
  username,
  msgs,
  busy,
  onSend,
  onClose,
}: {
  username: string;
  msgs: ChatRow[];
  busy: boolean;
  onSend: (t: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);
  const quicks = ["오늘 뭐부터 할까?", "집중이 안 돼 😵", "동기부여 해줘", "내 공부 어때?"];
  function send() {
    const t = text.trim();
    if (!t || busy) return;
    setText("");
    onSend(t);
  }
  return (
    <div className="chat-screen">
      <div className="chat-header">
        <button className="chat-back" onClick={onClose} aria-label="뒤로">
          ‹
        </button>
        <img className="chat-ava" src={`${IMG}/face_happy.png`} alt="수달이" />
        <div>
          <div className="chat-name">수달이</div>
          <div className="chat-status">● 항상 네 곁에 있어</div>
        </div>
      </div>

      <div className="chat-body" ref={bodyRef}>
        {msgs.length === 0 && (
          <div className="chat-empty">
            <img src={`${IMG}/otter_default1.png`} width={120} alt="" />
            <div className="ce-t">안녕 {username}! 🦦</div>
            <div className="ce-d">공부 고민, 계획, 뭐든 편하게 얘기해봐.</div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role}`}>
            {m.content}
          </div>
        ))}
        {busy && (
          <div className="chat-bubble assistant typing">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>

      <div className="chat-quicks">
        {quicks.map((q) => (
          <button key={q} onClick={() => !busy && onSend(q)} disabled={busy}>
            {q}
          </button>
        ))}
      </div>

      <div className="chat-input">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="수달이에게 말 걸기…"
        />
        <button className="chat-send" onClick={send} disabled={busy || !text.trim()}>
          ↑
        </button>
      </div>
    </div>
  );
}

/* --------------------------- BOTTOM NAV --------------------------- */
function BottomNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const items: { key: Tab; icon: string; label: string }[] = [
    { key: "character", icon: "🦦", label: "수달이" },
    { key: "stats", icon: "📊", label: "기록" },
    { key: "home", icon: "🏠", label: "홈" },
    { key: "calendar", icon: "📖", label: "일정" },
    { key: "settings", icon: "⚙️", label: "설정" },
  ];
  return (
    <div className="nav">
      {items.map((it) => (
        <button
          key={it.key}
          className={`nav-btn ${tab === it.key ? "active" : ""}`}
          onClick={() => setTab(it.key)}
        >
          <span>{it.icon}</span>
          <span className="nlabel">{it.label}</span>
        </button>
      ))}
    </div>
  );
}
