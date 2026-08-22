"use client";
/* =====================================================================
 *  기록 / 통계 뷰  — 담당: 기록·통계
 * ===================================================================== */
import Image from "next/image";
import { useMemo, useState } from "react";
import { IMG, dstr, fmtDur, type LV } from "../shared";
import { TopBar } from "../components/ui";
import { ACHIEVEMENTS, aiComment, type Achievement } from "../../lib/logic";
import type { SessionLog, UserState } from "../../lib/backend";

export default function StatsView({
  state,
  lv,
  logs,
}: {
  state: UserState;
  lv: LV;
  logs: SessionLog[];
}) {
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
    <div className="view stats-view">
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

      {/* 누적 기록 */}
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
      <div className="section-title">Otti AI 코멘트</div>
      <div className="ai-card">
        <Image src={`${IMG}/otter_study.png`} width={54} height={54} alt="" />
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
