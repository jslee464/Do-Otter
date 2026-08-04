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
  gcal: { connected: boolean; configured: boolean; busy: boolean };
  onConnect: () => void;
  onSync: () => void;
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
      </div>

      {/* 구글 캘린더 연동 */}
      <div className="section-title">구글 캘린더</div>
      <div className="card gcal-card-row">
        <div className="gcal-ico">📅</div>
        <div className="gcal-txt">
          <div className="gcal-t">Google Calendar</div>
          <div className="gcal-d">
            {!p.gcal.configured
              ? "설정이 필요해요 (관리자 키 등록 전)"
              : p.gcal.connected
              ? "연동됨 · 시험·과제 일정을 가져와요"
              : "연동하면 구글 일정을 자동으로 불러와요"}
          </div>
        </div>
        {p.gcal.connected ? (
          <button className="gcal-btn sync" onClick={p.onSync} disabled={p.gcal.busy}>
            {p.gcal.busy ? "동기화 중…" : "동기화"}
          </button>
        ) : (
          <button
            className="gcal-btn"
            onClick={p.onConnect}
            disabled={p.gcal.busy || !p.gcal.configured}
          >
            {p.gcal.busy ? "…" : "연동하기"}
          </button>
        )}
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

      {/* 월간 달력 — 날짜를 누르면 그날 일정 */}
      <MonthCalendar schedules={p.schedules} />
    </div>
  );
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const WD = ["일", "월", "화", "수", "목", "금", "토"];

function MonthCalendar({ schedules }: { schedules: ScheduleEvent[] }) {
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string>(todayStr());

  const base = new Date();
  const view = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const year = view.getFullYear();
  const month = view.getMonth(); // 0-11
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dstr = (d: number) => `${year}-${pad2(month + 1)}-${pad2(d)}`;

  const byDate = new Map<string, ScheduleEvent[]>();
  for (const s of schedules) {
    if (!byDate.has(s.eventDate)) byDate.set(s.eventDate, []);
    byDate.get(s.eventDate)!.push(s);
  }

  const today = todayStr();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dayList = byDate.get(selected) ?? [];
  const dday = (iso: string) => {
    const diff = Math.round(
      (new Date(iso + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) /
        86400000
    );
    return diff === 0 ? "D-DAY" : diff > 0 ? `D-${diff}` : "지남";
  };

  return (
    <>
      <div className="section-title">달력</div>
      <div className="card">
        <div className="mcal-head">
          <button className="mcal-nav" onClick={() => setOffset(offset - 1)} aria-label="이전 달">
            ‹
          </button>
          <div className="mcal-title">
            {year}년 {month + 1}월
          </div>
          <button className="mcal-nav" onClick={() => setOffset(offset + 1)} aria-label="다음 달">
            ›
          </button>
        </div>
        <div className="mcal-grid">
          {WD.map((w, i) => (
            <div key={w} className={`mcal-dow ${i === 0 ? "sun" : i === 6 ? "sat" : ""}`}>
              {w}
            </div>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <div key={i} className="mcal-cell empty" />;
            const ds = dstr(d);
            const wd = (firstWeekday + d - 1) % 7;
            return (
              <button
                key={i}
                className={`mcal-cell ${ds === today ? "today" : ""} ${
                  ds === selected ? "sel" : ""
                } ${wd === 0 ? "sun" : wd === 6 ? "sat" : ""}`}
                onClick={() => setSelected(ds)}
              >
                {d}
                {byDate.has(ds) && <span className="mcal-dot" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="mcal-daytitle">
          {selected.replace(/-/g, ". ")} 일정
        </div>
        {dayList.length === 0 && <div className="empty-line">이 날은 일정이 없어요</div>}
        {dayList.map((s) => (
          <div key={s.id} className="day-item">
            <span className="day-src">{s.source === "googleCalendar" ? "📅" : "✏️"}</span>
            <span className="day-title">{s.title}</span>
            <span className="day-dday">{dday(s.eventDate)}</span>
          </div>
        ))}
      </div>
    </>
  );
}
