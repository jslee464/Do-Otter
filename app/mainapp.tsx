"use client";
/* =====================================================================
 *  MainApp — 오케스트레이터 (상태 + 핸들러 + 라우팅)
 *  UI는 app/views/*, app/components/* 로 분리되어 있습니다.
 *  ⚠️ 여러 명이 함께 쓰는 통합 지점 — 상태/핸들러 변경 시 팀에 공유하세요.
 * ===================================================================== */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addChat,
  addSchedule,
  addSessionLog,
  defaultState,
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
import {
  AchCtx,
  calcDday,
  calcSession,
  checkAchievements,
  getUrgencyTier,
  itemById,
  levelState,
  levelUpShells,
  OtterItem,
  pickBubble,
  SHELL,
} from "../lib/logic";
import {
  buildContext,
  dstr,
  OpenChat,
  todayStr,
  type Phase,
  type SessionOutcome,
  type Tab,
} from "./shared";
import { BottomNav, StatusBar } from "./components/ui";
import {
  CongratsOverlay,
  InterventionOverlay,
  OopsOverlay,
  type InterventionMode,
} from "./components/Overlays";
import HomeView from "./views/HomeView";
import StatsView from "./views/StatsView";
import CalendarView from "./views/CalendarView";
import CharacterView from "./views/CharacterView";
import SettingsView from "./views/SettingsView";
import ImpactView from "./views/ImpactView";
import ChatView from "./views/ChatView";
import ProAd from "./components/ProAd";

export default function MainApp({
  onSignOut,
  preview,
}: {
  onSignOut: () => void;
  preview?: "home" | "impact" | "complete";
}) {
  const [tab, setTab] = useState<Tab>(preview === "impact" ? "impact" : "home");
  const [darkMode, setDarkMode] = useState(() =>
    typeof window !== "undefined" && window.localStorage.getItem("do-otter-theme") === "dark"
  );
  const [state, setState] = useState<UserState | null>(null);
  const [schedules, setSchedules] = useState<ScheduleEvent[]>([]);
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [showProAd, setShowProAd] = useState(false);
  const proAdChecked = useRef(false);

  // timer
  const [phase, setPhase] = useState<Phase>("idle");
  const [targetMin, setTargetMin] = useState(25);
  const [goalName, setGoalName] = useState("");
  const [studySec, setStudySec] = useState(0); // 총 타이머 시간
  const [harmfulSec, setHarmfulSec] = useState(0);
  const [stopSec, setStopSec] = useState(0);
  const [harmfulActive, setHarmfulActive] = useState(false);
  const [alarm, setAlarm] = useState<string | null>(null);

  const [outcome, setOutcome] = useState<SessionOutcome | null>(() =>
    preview === "complete"
      ? {
          effectiveSec: 25 * 60,
          harmfulSec: 0,
          qualityRatio: 1,
          expEarned: 25,
          oldLevel: 1,
          newLevel: 1,
          shellsGained: 0,
          achievements: [],
          goalReached: false,
        }
      : null,
  );
  const [oops, setOops] = useState(false);
  const [intervention, setIntervention] = useState<InterventionMode | null>(null);
  const finishRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 수달이 LLM (챗봇 + 홈 터치 멘트)
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsgs, setChatMsgs] = useState<ChatRow[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [tapLine, setTapLine] = useState<string | null>(null);
  const [tapBusy, setTapBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (preview) {
      setState({
        ...defaultState("미리보기"),
        effectiveSeconds: 240 * 60,
        totalTimerSeconds: 240 * 60,
        sessionCount: 8,
      });
      setSchedules([]);
      setLogs([]);
      return;
    }
    setState(await loadState());
    setSchedules(await getSchedules());
    setLogs(await getSessionLogs());
  }, [preview]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // 첫 공부를 마친 사용자가 앱을 다시 열었을 때만 Pro 안내 표시
  useEffect(() => {
    if (!state || preview || proAdChecked.current) return;
    proAdChecked.current = true;
    if (state.sessionCount < 1) return;

    const hiddenUntil = Number(
      window.localStorage.getItem(`do-otter-pro-hidden-until:${state.username}`) ?? 0,
    );
    if (Date.now() >= hiddenUntil) setShowProAd(true);
  }, [state, preview]);

  // 레퍼런스 화면을 빠르게 확인할 수 있는 미리보기 딥링크 (#screen-09 ... #screen-27)
  useEffect(() => {
    const screen = Number(window.location.hash.replace("#screen-", ""));
    if (!screen) return;
    if ([9, 10, 11, 12, 13].includes(screen)) setTab("home");
    if ([14, 15, 16].includes(screen)) setTab("stats");
    if ([17, 18].includes(screen)) setTab("calendar");
    if ([23, 24, 25, 26].includes(screen)) setTab("impact");
    if (screen === 27) setTab("settings");
    if (screen === 10) {
      setTargetMin(25);
      setStudySec(10);
      setPhase("running");
    }
    if (screen === 12) setChatOpen(true);
    if (screen === 13) {
      setOutcome({
        effectiveSec: 1450,
        harmfulSec: 0,
        qualityRatio: 0.96,
        expEarned: 90,
        oldLevel: 1,
        newLevel: 1,
        shellsGained: 90,
        achievements: [],
        goalReached: false,
      });
    }
    if (screen === 22) setIntervention("sheet");
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
      }
    }, 1000);
    return () => clearInterval(id);
  }, [phase, harmfulActive]);

  // 목표 시간 도달 → 자동 완료
  useEffect(() => {
    if (phase === "running" && targetMin > 0 && studySec >= targetMin * 60) {
      finishSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studySec, phase, targetMin]);

  const lv = state ? levelState(state.totalExp) : { level: 1, currentExp: 0, nextReq: 60 };

  /* ---------------- 수달이 LLM ---------------- */
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
      setTimeout(() => setTapLine(null), 6000);
    }
  }

  /* ---------------- 세션 컨트롤 ---------------- */
  function startSelecting() {
    setPhase("selecting");
  }
  function beginSession(min: number) {
    setTargetMin(min);
    setStudySec(0);
    setHarmfulSec(0);
    setStopSec(0);
    setHarmfulActive(false);
    setPhase("running");
  }
  function toggleHarmful() {
    if (harmfulActive) {
      setHarmfulActive(false);
      setIntervention(null);
    } else {
      setHarmfulActive(true);
      setIntervention("sheet");
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
    if (next.todayDate !== today) {
      next.todayDate = today;
      next.todayEffectiveSec = 0;
      next.todayHarmfulSec = 0;
      next.dailyGoalClaimed = false;
    }
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

    const yesterday = dstr(new Date(Date.now() - 86400000));
    if (next.lastStudyDate === today) {
      /* 유지 */
    } else if (next.lastStudyDate === yesterday) next.streak += 1;
    else next.streak = 1;
    next.lastStudyDate = today;

    const newLevel = levelState(next.totalExp).level;
    let shellsGained = 0;
    if (newLevel > oldLevel) shellsGained += levelUpShells(oldLevel, newLevel);

    let goalReached = false;
    if (next.todayEffectiveSec / 60 >= next.dailyGoalMin && !next.dailyGoalClaimed) {
      next.dailyGoalClaimed = true;
      goalReached = true;
      shellsGained += SHELL.dailyGoal;
    }

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
  }

  function stopDown() {
    finishRef.current = setTimeout(finishSession, 700);
  }
  function stopUp() {
    if (finishRef.current) clearTimeout(finishRef.current);
  }

  /* ---------------- 설정 / 커스텀 / 일정 ---------------- */
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
    next.equippedItems = [
      ...next.equippedItems.filter((id) => itemById(id)?.slot !== item.slot),
      item.id,
    ];
    setState(next);
    await saveState(next);
    setAlarm(`${item.name} 구매 완료! Otti가 착용했어요 ${item.emoji}`);
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

  const bubble = useMemo(() => {
    const upcoming = schedules
      .map((schedule) => ({ ...schedule, dday: calcDday(schedule.eventDate) }))
      .filter((schedule) => schedule.dday >= 0)
      .sort((a, b) => a.dday - b.dday)[0];
    if (!upcoming) return pickBubble("일정없음", "", 0, schedules.length);
    const tier = getUrgencyTier(upcoming.dday);
    return pickBubble(tier, upcoming.title, upcoming.dday, upcoming.dday + upcoming.title.length);
  }, [schedules]);

  if (!state) {
    return (
      <div className={`screen ${darkMode ? "theme-dark" : ""}`}>
        <div className="notch" />
        <div className="main-loading" role="status" aria-label="메인 화면 불러오는 중">
          <span className="main-loading-dot" />
          <span className="main-loading-dot" />
          <span className="main-loading-dot" />
        </div>
      </div>
    );
  }

  return (
    <OpenChat.Provider value={openChat}>
      <div className={`screen ${darkMode ? "theme-dark" : ""}`}>
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
        {tab === "impact" && <ImpactView state={state} />}
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
        {tab === "impact" && <ImpactView state={state} />}
        {tab === "customize" && (
          <CharacterView state={state} lv={lv} onBuy={buyItem} onEquip={toggleEquip} />
        )}
        {tab === "settings" && (
          <SettingsView
            state={state}
            lv={lv}
            onAd={watchAd}
            onOops={simulateOops}
            onCustomize={() => setTab("customize")}
            onImpact={() => setTab("impact")}
            dark={darkMode}
            onDarkChange={(value) => {
              setDarkMode(value);
              window.localStorage.setItem("do-otter-theme", value ? "dark" : "light");
            }}
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
        {intervention && (
          <InterventionOverlay
            mode={intervention}
            onReturn={() => {
              setHarmfulActive(false);
              setIntervention(null);
            }}
            onContinue={() => setIntervention(null)}
          />
        )}

        {chatOpen && (
          <ChatView
            username={state.username}
            msgs={chatMsgs}
            busy={chatBusy}
            onSend={sendChat}
            onClose={() => setChatOpen(false)}
          />
        )}

        {showProAd && (
          <ProAd
            onClose={() => setShowProAd(false)}
            onHideWeek={() => {
              window.localStorage.setItem(
                `do-otter-pro-hidden-until:${state.username}`,
                String(Date.now() + 7 * 24 * 60 * 60 * 1000),
              );
              setShowProAd(false);
            }}
            onOpenPro={() => {
              setShowProAd(false);
              setTab("settings");
            }}
          />
        )}

        <BottomNav tab={tab} setTab={setTab} />
      </div>
    </OpenChat.Provider>
  );
}
