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
  gcalConnectUrl,
  gcalStatus,
  gcalSync,
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
  ragMetadataFromApi,
  type RagMetadata,
} from "../lib/rag/api-types";
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
  OpenChat,
  todayStr,
  type Phase,
  type SessionOutcome,
  type Tab,
} from "./shared";
import { BottomNav, StatusBar } from "./components/ui";
import {
  ChatProPaywall,
  CongratsOverlay,
  InterventionOverlay,
  OopsOverlay,
  RewardedAdOverlay,
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
  const [showRewardedAd, setShowRewardedAd] = useState(false);
  const proAdChecked = useRef(false);

  // timer
  const [phase, setPhase] = useState<Phase>("idle");
  const [targetMin, setTargetMin] = useState(25);
  const [goalName, setGoalName] = useState("");
  const [studySec, setStudySec] = useState(0); // 총 타이머 시간
  const [harmfulSec, setHarmfulSec] = useState(0);
  const [stopSec, setStopSec] = useState(0);
  const [harmfulActive, setHarmfulActive] = useState(false);
  const [contHarmful, setContHarmful] = useState(0);
  const [harmfulEntryCount, setHarmfulEntryCount] = useState(0);
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
  const [intervention, setIntervention] = useState<{
    mode: InterventionMode;
    line?: string;
    rag?: RagMetadata;
  } | null>(null);
  const interventionRequestRef = useRef(0);
  const finishRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 수달이 LLM (챗봇 + 홈 터치 멘트)
  const [chatOpen, setChatOpen] = useState(false);
  const [chatLocked, setChatLocked] = useState(false); // Chat Pro 미구독 → 페이월
  const [chatMsgs, setChatMsgs] = useState<ChatRow[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [tapLine, setTapLine] = useState<string | null>(null);
  const [tapBusy, setTapBusy] = useState(false);

  // 구글 캘린더
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalConfigured, setGcalConfigured] = useState(false);
  const [gcalBusy, setGcalBusy] = useState(false);

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

  useEffect(() => {
    if (preview) return;
    void (async () => {
      const st = await gcalStatus();
      setGcalConnected(st.connected);
      setGcalConfigured(st.configured);

      const params = new URLSearchParams(window.location.search);
      const gcalResult = params.get("gcal");
      if (!gcalResult) return;

      window.history.replaceState({}, "", window.location.pathname);
      if (gcalResult === "connected") {
        setGcalConnected(true);
        setAlarm("구글 캘린더 연동 완료! 일정을 가져올게요 📅");
        await doGcalSync();
      } else if (gcalResult === "error") {
        setAlarm("구글 캘린더 연동에 실패했어요. 다시 시도해줄래요?");
      } else if (gcalResult === "noretoken") {
        setAlarm("이미 연동된 계정이에요. 구글 계정 설정에서 권한을 해제 후 다시 시도해주세요.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

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
    if (screen === 22) setIntervention({ mode: "sheet" });
  }, []);

  async function doCheckout(plan: "pro" | "chatpro") {
    setAlarm("결제창을 여는 중…");
    const r = await startCheckout(plan);
    if (r.ok) {
      await refresh(); // 이용권 반영
      if (plan === "chatpro") {
        setChatLocked(false);
        setChatOpen(true);
        setChatMsgs(await getChat());
      }
      setAlarm(plan === "chatpro" ? "Chat Pro 결제 완료! 수달이랑 대화해봐요 💬" : "Pro 수달 결제 완료! 👑");
    } else if (r.error === "not_configured")
      setAlarm("결제가 아직 설정되지 않았어요 (관리자 PortOne 키 등록 필요)");
    else if (r.error === "demo")
      setAlarm("데모 모드에선 결제를 쓸 수 없어요. 로그인 후 이용해주세요.");
    else if (r.error === "cancelled" || r.error === "no_session")
      setAlarm(r.error === "no_session" ? "로그인 후 이용해주세요." : "결제를 취소했어요.");
    else setAlarm("결제에 실패했어요. 잠시 후 다시 시도해주세요.");
  }

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

  // 유해앱 이탈 시간 → 검수된 상황 기반 개입
  useEffect(() => {
    if (!harmfulActive) return;
    if (contHarmful === HARMFUL.mildAtSec) {
      void requestSituation("A20", { 앱명: "방해 앱(웹 시뮬레이션)" }, HARMFUL.mild);
    } else if (contHarmful === HARMFUL.strongAtSec) {
      void requestSituation(
        "A21",
        { 앱명: "방해 앱(웹 시뮬레이션)", 과목: "하던 공부" },
        HARMFUL.strong
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contHarmful, harmfulActive]);

  // 공부 진행 이벤트 → 휴식/자세/장시간 학습 개입
  useEffect(() => {
    if (phase !== "running" || harmfulActive) return;
    const beforeTarget = targetMin === 0 || studySec < targetMin * 60;
    if (studySec === 120 * 60) {
      void requestSituation("A59");
    } else if (beforeTarget && studySec === 20 * 60) {
      void requestSituation("A6");
    } else if (beforeTarget && studySec === 35 * 60) {
      void requestSituation("A5");
    } else if (beforeTarget && studySec === 60 * 60) {
      void requestSituation("A7");
    } else if (targetMin > 0 && studySec === Math.floor((targetMin * 60) / 2)) {
      void requestSituation("A32", {
        "남은 시간": Math.ceil((targetMin * 60 - studySec) / 60),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studySec, phase, harmfulActive, targetMin]);

  // 일시정지가 길어지면 애매한 중단 상태를 해소하도록 안내한다.
  useEffect(() => {
    if (phase !== "paused") return;
    const id = setTimeout(() => void requestSituation("A10"), 5 * 60 * 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

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
        rag: ragMetadataFromApi(data, "chat"),
      };
      setChatMsgs((m) => [...m, reply]);
      addChat("assistant", reply.content, reply.rag);
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

  async function requestSituation(
    situationId: string,
    slots: Record<string, string | number> = {},
    optimisticLine?: string
  ) {
    if (!state) return;
    const requestId = ++interventionRequestRef.current;
    if (optimisticLine) {
      setIntervention({
        mode: "sheet",
        line: optimisticLine,
        rag: {
          channel: "event",
          situationId,
          evidenceIds: [],
          sources: [],
        },
      });
    }
    try {
      const res = await fetch("/api/situation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situationId,
          context: buildContext(state, logs, schedules),
          slots,
        }),
      });
      if (!res.ok) throw new Error(`SITUATION_${res.status}`);
      const data = await res.json();
      if (requestId !== interventionRequestRef.current) return;
      const line = typeof data.line === "string" ? data.line.trim() : "";
      if (!line) return;
      setIntervention({
        mode: "sheet",
        line,
        rag: ragMetadataFromApi(data, "event"),
      });
    } catch {
      // Optimistic fallback text stays visible when supplied.
    }
  }

  function closeIntervention() {
    interventionRequestRef.current += 1;
    setIntervention(null);
  }

  /* ---------------- 세션 컨트롤 ---------------- */
  function startSelecting() {
    setPhase("selecting");
  }
  function beginSession(min: number) {
    closeIntervention();
    setAlarm(null);
    setTargetMin(min);
    setStudySec(0);
    setHarmfulSec(0);
    setStopSec(0);
    setContHarmful(0);
    setHarmfulEntryCount(0);
    setHarmfulActive(false);
    setPhase("running");
    const firstSchedule = schedules
      .map((schedule) => ({ ...schedule, dday: calcDday(schedule.eventDate) }))
      .filter((schedule) => schedule.dday >= 0)
      .sort((a, b) => a.dday - b.dday)[0];
    void requestSituation("A4", {
      "목표 시간": min > 0 ? min : "자유",
      "할 일": firstSchedule?.title ?? (goalName || "지금 할 공부"),
    });
  }
  function toggleHarmful() {
    if (harmfulActive) {
      setHarmfulActive(false);
      setContHarmful(0);
      closeIntervention();
      setAlarm(HARMFUL.praise);
    } else {
      const nextEntryCount = harmfulEntryCount + 1;
      setHarmfulEntryCount(nextEntryCount);
      setAlarm(null);
      setHarmfulActive(true);
      setContHarmful(0);
      if (nextEntryCount >= 3) {
        void requestSituation(
          "A44",
          {
            앱명: "방해 앱(웹 시뮬레이션)",
            "진입 횟수": nextEntryCount,
          },
          HARMFUL.strong
        );
      } else {
        void requestSituation(
          "A19",
          { 앱명: "방해 앱(웹 시뮬레이션)", 과목: goalName || "하던 공부" },
          HARMFUL.mild
        );
      }
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

    const reachedTimer = targetMin > 0 && total >= targetMin * 60;
    if (reachedTimer) {
      void requestSituation("A8");
    } else if (targetMin > 0 && total < (targetMin * 60) / 2) {
      void requestSituation("A34", {
        "목표 시간": targetMin,
        "실제 시간": Math.max(1, Math.round(total / 60)),
      });
    }
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
  function watchAd() {
    if (!state) return;
    const today = todayStr();
    const watchedToday = state.adDate === today ? state.adWatchedToday : 0;
    if (watchedToday >= SHELL.adDailyLimit) {
      setAlarm("오늘 광고 조개는 다 받았어요 (일 5회)");
      return;
    }
    setShowRewardedAd(true);
  }

  async function claimAdReward() {
    if (!state) return;
    const next = { ...state };
    const today = todayStr();
    if (next.adDate !== today) {
      next.adDate = today;
      next.adWatchedToday = 0;
    }
    if (next.adWatchedToday >= SHELL.adDailyLimit) {
      setShowRewardedAd(false);
      setAlarm("오늘 광고 조개는 다 받았어요 (일 5회)");
      return;
    }
    next.adWatchedToday += 1;
    next.shells += SHELL.adWatch;
    next.shellsEarnedTotal += SHELL.adWatch;
    setState(next);
    await saveState(next);
    setShowRewardedAd(false);
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
            gcal={{ connected: gcalConnected, configured: gcalConfigured, busy: gcalBusy }}
            onConnect={connectGcal}
            onSync={doGcalSync}
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
            onCheckout={doCheckout}
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
        {showRewardedAd && (
          <RewardedAdOverlay
            reward={SHELL.adWatch}
            onClose={() => setShowRewardedAd(false)}
            onReward={claimAdReward}
          />
        )}
        {intervention && (
          <InterventionOverlay
            mode={intervention.mode}
            line={intervention.line}
            rag={intervention.rag}
            onReturn={() => {
              setHarmfulActive(false);
              setContHarmful(0);
              closeIntervention();
            }}
            onContinue={closeIntervention}
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
