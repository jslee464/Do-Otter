"use client";

import { useEffect, useMemo, useState } from "react";
import { dstr, type LV } from "../shared";
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
  const now = new Date();
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  const [sheet, setSheet] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("10:00");

  useEffect(() => {
    if (window.location.hash === "#screen-18") setSheet(true);
  }, []);

  const days = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1).getDay();
    const count = new Date(year, month + 1, 0).getDate();
    const prevCount = new Date(year, month, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      const raw = index - first + 1;
      if (raw < 1) return { day: prevCount + raw, offset: -1 };
      if (raw > count) return { day: raw - count, offset: 1 };
      return { day: raw, offset: 0 };
    });
  }, [cursor]);

  const selectedKey = dstr(selected);
  const selectedSchedules = p.schedules.filter((s) => s.eventDate === selectedKey);
  const monthHas = new Set(p.schedules.map((s) => s.eventDate));

  function pick(day: number, offset: number) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + offset, day);
    setSelected(next);
    if (offset) setCursor(new Date(next.getFullYear(), next.getMonth(), 1));
  }

  function add() {
    if (!title.trim()) return;
    p.onAdd(`${title.trim()} · ${time}`, selectedKey);
    setTitle("");
    setSheet(false);
  }

  return (
    <div className="view hf-calendar">
      <h1>일정</h1>
      <div className="calendar-head"><button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>‹</button><b>{cursor.getFullYear()}년 {cursor.getMonth() + 1}월</b><button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>›</button></div>
      <div className="weekdays">{["일", "월", "화", "수", "목", "금", "토"].map((d) => <span key={d}>{d}</span>)}</div>
      <div className="month-grid">
        {days.map(({ day, offset }, i) => {
          const date = new Date(cursor.getFullYear(), cursor.getMonth() + offset, day);
          const key = dstr(date);
          const on = key === selectedKey;
          const has = monthHas.has(key);
          return <button key={i} className={`${offset ? "muted" : ""} ${on ? "on" : ""}`} onClick={() => pick(day, offset)}><span>{day}</span>{has && <i />} </button>;
        })}
      </div>
      <section className="gcal-panel">
        <span className="gcal-panel-icon">📅</span>
        <div>
          <b>Google Calendar</b>
          <small>
            {!p.gcal.configured
              ? "관리자 키 등록 후 연동할 수 있어요"
              : p.gcal.connected
              ? "연동됨 · 구글 일정을 가져올 수 있어요"
              : "연동하면 구글 일정을 자동으로 불러와요"}
          </small>
        </div>
        {p.gcal.connected ? (
          <button onClick={p.onSync} disabled={p.gcal.busy}>
            {p.gcal.busy ? "동기화 중" : "동기화"}
          </button>
        ) : (
          <button onClick={p.onConnect} disabled={p.gcal.busy || !p.gcal.configured}>
            {p.gcal.busy ? "연결 중" : "연동"}
          </button>
        )}
      </section>
      <section className="day-schedule">
        <h2>{selected.getMonth() + 1}월 {selected.getDate()}일 일정</h2>
        {selectedSchedules.length === 0 ? (
          <div className="schedule-empty">오늘은 일정이 없어요</div>
        ) : selectedSchedules.map((s) => {
          const detail = scheduleDetail(s.title);
          return (
            <button key={s.id} aria-label={`${detail.title} 일정 삭제`} onClick={() => p.onDelete(s.id)}>
              <span className="schedule-pencil"><PencilIcon /></span>
              <b>{detail.title}</b>
              <em>
                {s.source === "googleCalendar" ? "Google · " : ""}
                {detail.time ? `${detail.time} · 삭제 ×` : "삭제 ×"}
              </em>
            </button>
          );
        })}
      </section>
      <button className="calendar-fab" onClick={() => setSheet(true)}>＋</button>

      {sheet && (
        <div className="schedule-sheet-backdrop" onClick={() => setSheet(false)}>
          <div className="schedule-sheet" onClick={(e) => e.stopPropagation()}>
            <header><b>{selected.getMonth() + 1}월 {selected.getDate()}일 일정 추가</b><button onClick={() => setSheet(false)}>×</button></header>
            <label>일정명<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 근골격계 복습" /></label>
            <label>시간<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
            <button className="hf-primary" onClick={add}>일정 추가</button>
          </div>
        </div>
      )}
    </div>
  );
}

function scheduleDetail(value: string) {
  const match = value.match(/^(.*?) · (\d{2}:\d{2})(?: · \d+분)?$/);
  return match ? { title: match[1], time: match[2] } : { title: value, time: "" };
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m4 20 4.2-1 10.6-10.6a2.2 2.2 0 0 0-3.2-3.2L5 15.8 4 20Z" />
      <path d="m13.9 6.9 3.2 3.2M4 20h4.2" />
    </svg>
  );
}
