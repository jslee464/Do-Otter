"use client";
/* =====================================================================
 *  일정 뷰  — 담당: 일정·D-day
 * ===================================================================== */
import { useState } from "react";
import { todayStr, type LV } from "../shared";
import { TopBar } from "../components/ui";
import { calcDday, getUrgencyTier } from "../../lib/logic";
import type { ScheduleEvent, UserState } from "../../lib/backend";

export default function CalendarView(p: {
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
    <div className="view calendar-view">
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
