"use client";

import { useContext, useState } from "react";
import { fmtFocusRunning, fmtFocusSetup, OpenChat, type LV, type Phase } from "../shared";
import type { UserState } from "../../lib/backend";
import riverBefore from "../../집중 전 막힌 강.png";
import riverFocus from "../../집중중.png";

export default function HomeView(p: {
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
  const [minutes, setMinutes] = useState(25);
  const openChat = useContext(OpenChat);
  const active = p.phase === "running" || p.phase === "paused";
  const totalFocusSeconds = Math.max(1, (p.targetMin || minutes) * 60);
  const remain = Math.max(0, totalFocusSeconds - p.studySec);
  const focusProgress = Math.min(1, Math.max(0, p.studySec / totalFocusSeconds));
  const focusProgressAngle = `${focusProgress * 360}deg`;
  const setFocusMinutes = (nextMinutes: number) =>
    setMinutes(Math.min(720, Math.max(0, Math.round(nextMinutes))));

  if (active) {
    return (
      <div className="view hf-home hf-focus">
        <div className="focus-kicker">≋ &nbsp; Otti와 함께 청소 중</div>
        <h1>집중이 물길을 열고 있어요.</h1>
        <div
          className={`focus-orbit ${p.phase === "paused" ? "paused" : ""}`}
          style={{ ["--focus-progress-angle" as string]: focusProgressAngle }}
          role="progressbar"
          aria-label="집중 진행률"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(focusProgress * 100)}
        >
          <img src={riverFocus.src} alt="강을 청소하는 Otti" />
          <span className="focus-progress" />
        </div>
        <div className="focus-remaining">
          <span>남은 시간</span>
          <b>{fmtFocusRunning(remain)}</b>
        </div>
        <div className="focus-controls">
          <button onClick={p.phase === "paused" ? p.onResume : p.onPause}>
            {p.phase === "paused" ? "▶ 계속" : "Ⅱ 일시정지"}
          </button>
          <button
            className="end"
            onMouseDown={p.stopDown}
            onMouseUp={p.stopUp}
            onMouseLeave={p.stopUp}
            onTouchStart={p.stopDown}
            onTouchEnd={p.stopUp}
          >
            ■ 종료
          </button>
        </div>
        <div className="focus-note">
          <span className="focus-note-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 2.5S5.5 10.1 5.5 15a6.5 6.5 0 0 0 13 0C18.5 10.1 12 2.5 12 2.5Z" />
              <path d="M9 16.2c.3 1.5 1.4 2.4 3 2.7" />
            </svg>
          </span>
          <p>맑아지는 물길처럼,<br />지금의 집중이 더 큰 변화를 만들 거예요.</p>
        </div>
        <button className="intervention-test" onClick={p.onToggleHarmful}>
          방해 앱 화면 미리보기
        </button>
      </div>
    );
  }

  return (
    <div className="view hf-home hf-setup">
      <header className="home-heading">
        <div>
          <span>Otti와 오늘의 집중</span>
          <h1>오늘은 강을 얼마나<br />회복시켜볼까요?</h1>
        </div>
        <button onClick={p.onTapOtter} aria-label="Otti에게 한마디 듣기">
          <img src="/images/do-otter_face_2048.png" alt="Otti" />
        </button>
      </header>

      <button className="focus-tip" onClick={p.onTapOtter}>
        <img src="/images/do-otter_pointing_2048.png" alt="" />
        <b>{minutes}분 집중하면<br />강이 한 칸 더 맑아져요.</b>
      </button>
      {p.tapLine && <div className="tap-line">{p.tapLine}</div>}

      <div className="river-preview">
        <img src={riverBefore.src} alt="회복을 기다리는 Otti의 강" />
      </div>

      <section className="timer-setup-card">
        <div className="timer-caption">집중 시간</div>
        <div className="timer-editor">
          <b>{fmtFocusSetup(minutes)}</b>
          <button type="button" onClick={() => setFocusMinutes(0)}>
            초기화
          </button>
        </div>
        <div className="duration-manual" aria-label="집중 시간 직접 입력">
          <label>
            <span>시</span>
            <input
              type="number"
              min={0}
              max={12}
              value={Math.floor(minutes / 60)}
              onChange={(event) =>
                setFocusMinutes(Number(event.target.value || 0) * 60 + (minutes % 60))
              }
            />
          </label>
          <label>
            <span>분</span>
            <input
              type="number"
              min={0}
              max={59}
              value={minutes % 60}
              onChange={(event) =>
                setFocusMinutes(Math.floor(minutes / 60) * 60 + Number(event.target.value || 0))
              }
            />
          </label>
        </div>
        <div className="minute-picks">
          {[5, 10, 30, 60].map((m) => (
            <button type="button" key={m} onClick={() => setFocusMinutes(minutes + m)}>
              +{m}분
            </button>
          ))}
        </div>
        <input aria-label="집중할 일" placeholder="예: 발표 자료 정리" />
        <button className="hf-primary" onClick={() => p.onSelect(minutes)} disabled={minutes <= 0}>
          집중 시작
        </button>
      </section>

      <section className="otti-menu">
        <span>집중이 막힐 때</span>
        <h2>Otti 챗봇</h2>
        <button className="otti-chat-shortcut" onClick={openChat}>
          <img src="/images/otter-chat-face.png" alt="" />
          <b>
            Otti에게 물어보기
            <small>공부법, 컨디션, 오늘 계획을 한 곳에서 상담해요.</small>
          </b>
          <em>›</em>
        </button>
        <p>ⓘ 건강 정보는 진료를 대신하지 않아요.</p>
      </section>
    </div>
  );
}
