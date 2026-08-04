"use client";
/* =====================================================================
 *  MainApp — 오케스트레이터 (상태 + 핸들러 + 라우팅)
 *  UI는 app/views/*, app/components/* 로 분리되어 있습니다.
 *  ⚠️ 여러 명이 함께 쓰는 통합 지점 — 상태/핸들러 변경 시 팀에 공유하세요.
 * ===================================================================== */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addChat,
  addSchedule,
  addSessionLog,
  deleteSchedule,
  getChat,
  getSchedules,
  getSessionLogs,
  loadState,
  saveState,
  signOut,
  startCheckout,
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
  HARMFUL,
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
  IMG,
  OpenChat,
  todayStr,
  type Phase,
  type SessionOutcome,
  type Tab,
} from "./shared";
import { BottomNav, StatusBar } from "./components/ui";
import { ChatProPaywall, CongratsOverlay, OopsOverlay } from "./components/Overlays";
import HomeView from "./views/HomeView";
import StatsView from "./views/StatsView";
import CalendarView from "./views/CalendarView";
import CharacterView from "./views/CharacterView";
import SettingsView from "./views/SettingsView";
import ChatView from "./views/ChatView";

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
  const [chatLocked, setChatLocked] = useState(false); // Chat Pro 미구독 → 페이월
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

  async function doCheckout(plan: "pro" | "chatpro") {
    setAlarm("결제창을 여는 중…");
    const r = await startCheckout(plan);
    if (r.ok) {
      await refresh(); // 이용권 반영
      setAlarm(plan === "chatpro" ? "Chat Pro 결제 완료! 수달이랑 대화해봐요 💬" : "Pro 수달 결제 완료! 👑");
    } else if (r.error === "not_configured")
      setAlarm("결제가 아직 설정되지 않았어요 (관리자 PortOne 키 등록 필요)");
    else if (r.error === "demo")
      setAlarm("데모 모드에선 결제를 쓸 수 없어요. 로그인 후 이용해주세요.");
    else if (r.error === "cancelled" || r.error === "no_session")
      setAlarm(r.error === "no_session" ? "로그인 후 이용해주세요." : "결제를 취소했어요.");
    else setAlarm("결제에 실패했어요. 잠시 후 다시 시도해주세요.");
  }

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

  /* ---------------- 수달이 LLM ---------------- */
  async function openChat() {
    // 챗봇은 Chat Pro 전용 — 미구독이면 페이월
    if (!state?.isChatPro) {
      setChatLocked(true);
      return;
    }
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

  /* ---------------- 세션 컨트롤 ---------------- */
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
    setContHarmful(0);
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
            onCheckout={doCheckout}
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

        {chatLocked && (
          <ChatProPaywall
            onSubscribe={() => {
              setChatLocked(false);
              doCheckout("chatpro");
            }}
            onClose={() => setChatLocked(false)}
          />
        )}

        <BottomNav tab={tab} setTab={setTab} />
      </div>
    </OpenChat.Provider>
  );
}
