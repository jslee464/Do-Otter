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
  gcalConnectUrl,
  gcalStatus,
  gcalSync,
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
import { CongratsOverlay, OopsOverlay } from "./components/Overlays";
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
  const [chatMsgs, setChatMsgs] = useState<ChatRow[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [tapLine, setTapLine] = useState<string | null>(null);
  const [tapBusy, setTapBusy] = useState(false);

  // 구글 캘린더
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalConfigured, setGcalConfigured] = useState(false);
  const [gcalBusy, setGcalBusy] = useState(false);

  async function refresh() {
    setState(await loadState());
    setSchedules(await getSchedules());
    setLogs(await getSessionLogs());
  }
  useEffect(() => {
    refresh();
    // 구글 캘린더 상태 확인 + OAuth 복귀 처리
    (async () => {
      const st = await gcalStatus();
      setGcalConnected(st.connected);
      setGcalConfigured(st.configured);
      const params = new URLSearchParams(window.location.search);
      const g = params.get("gcal");
      if (g) {
        window.history.replaceState({}, "", window.location.pathname);
        if (g === "connected") {
          setGcalConnected(true);
          setAlarm("구글 캘린더 연동 완료! 일정을 가져올게요 📅");
          await doGcalSync();
        } else if (g === "error") {
          setAlarm("구글 캘린더 연동에 실패했어요. 다시 시도해줄래요?");
        } else if (g === "noretoken") {
          setAlarm("이미 연동된 계정이에요. 구글 계정 설정에서 권한을 해제 후 다시 시도해주세요.");
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connectGcal() {
    setGcalBusy(true);
    const r = await gcalConnectUrl();
    setGcalBusy(false);
    if (r.ok && r.url) window.location.href = r.url;
    else if (r.error === "not_configured")
      setAlarm("구글 캘린더가 아직 설정되지 않았어요 (관리자 키 등록 필요)");
    else setAlarm("연동을 시작할 수 없어요. 로그인 상태를 확인해주세요.");
  }
  async function doGcalSync() {
    setGcalBusy(true);
    const r = await gcalSync();
    if (r.ok) {
      setSchedules(await getSchedules());
      setAlarm(`구글 일정 ${r.count}개를 가져왔어요 📅`);
    } else if (r.error === "not_connected") {
      setAlarm("먼저 구글 캘린더를 연동해주세요.");
    } else {
      setAlarm("동기화에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
    setGcalBusy(false);
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
            gcal={{ connected: gcalConnected, configured: gcalConfigured, busy: gcalBusy }}
            onConnect={connectGcal}
            onSync={doGcalSync}
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
