"use client";
/* =====================================================================
 *  공용 타입 · 헬퍼 · 컨텍스트 (모든 뷰가 함께 사용)
 *  ⚠️ 여러 명이 함께 쓰는 파일 — 시그니처 변경 시 팀에 공유하세요.
 * ===================================================================== */
import { createContext } from "react";
import { calcDday, levelState, type Achievement } from "../lib/logic";
import type { ScheduleEvent, SessionLog, UserState } from "../lib/backend";
import type { OtterContext } from "../lib/llm";

export const IMG = "/images";

export type Tab = "impact" | "character" | "stats" | "home" | "calendar" | "settings";
export type Phase = "idle" | "selecting" | "running" | "paused";
export type LV = { level: number; currentExp: number; nextReq: number };
export type SessionOutcome = {
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

// TopBar에서 채팅 열기 위한 context (프롭 드릴링 방지)
export const OpenChat = createContext<() => void>(() => {});

/* ---------- date/time helpers ---------- */
export const pad = (n: number) => n.toString().padStart(2, "0");
export function fmt(sec: number) {
  return `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;
}
export function fmtDur(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분 ${sec % 60}초`;
  return `${sec}초`;
}
export function dstr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function todayStr() {
  return dstr(new Date());
}

export const TIME_OPTIONS = [
  { label: "10분", min: 10 },
  { label: "25분", min: 25 },
  { label: "45분", min: 45 },
  { label: "60분", min: 60 },
];

// Supabase 통계/일정 → LLM 컨텍스트
export function buildContext(
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
  const upcoming = withDday
    .filter((s) => s.dday >= 0)
    .sort((a, b) => a.dday - b.dday);
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
