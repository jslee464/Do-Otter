"use client";

import { useContext, useState } from "react";
import { fmt, OpenChat, type LV, type Phase } from "../shared";
import type { UserState } from "../../lib/backend";
import riverBefore from "../../집중 전 막힌 강.png";
import riverFocus from "../../집중중.png";

type OttiMenuIconKind = "study" | "health" | "plan";

function OttiMenuIcon({ kind }: { kind: OttiMenuIconKind }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {kind === "study" && (
        <>
          <path d="M3.5 5.2c2.9-.9 5.4-.3 8.5 1.7v12c-3.1-2-5.6-2.6-8.5-1.7v-12Z" />
          <path d="M20.5 5.2c-2.9-.9-5.4-.3-8.5 1.7v12c3.1-2 5.6-2.6 8.5-1.7v-12Z" />
          <path d="M12 6.9v12" />
        </>
      )}
      {kind === "health" && (
        <>
          <path d="M12 20S4 15.3 4 9.2A4.3 4.3 0 0 1 11.5 6l.5.7.5-.7A4.3 4.3 0 0 1 20 9.2C20 15.3 12 20 12 20Z" />
          <path d="M6.7 12h2.2l1.2-2.8 2 5.5 1.4-3 1 1.3h2.8" />
        </>
      )}
      {kind === "plan" && (
        <>
          <path d="M8.2 4.5H6.5A1.5 1.5 0 0 0 5 6v14h14V6a1.5 1.5 0 0 0-1.5-1.5h-1.7" />
          <path d="M9 3h6v3H9z" />
          <path d="m8 10 1.2 1.2L11 9.4M13 10h3M8 15l1.2 1.2L11 14.4M13 15h3" />
        </>
      )}
    </svg>
  );
}

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
          <b>{fmt(remain)}</b>
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
          <b>{String(minutes).padStart(2, "0")}:00</b>
          <div><button onClick={() => setMinutes(Math.max(5, minutes - 5))}>−5분</button><button onClick={() => setMinutes(minutes + 5)}>+5분</button></div>
        </div>
        <div className="minute-picks">
          {[10, 25, 45, 60].map((m) => (
            <button key={m} className={minutes === m ? "on" : ""} onClick={() => setMinutes(m)}>{m}분</button>
          ))}
        </div>
        <input aria-label="집중할 일" placeholder="예: 발표 자료 정리" />
        <button className="hf-primary" onClick={() => p.onSelect(minutes)}>집중 시작</button>
      </section>

      <section className="otti-menu">
        <span>집중이 막힐 때</span>
        <h2>Otti에게 물어보기</h2>
        <button onClick={openChat}><i className="otti-menu-icon study"><OttiMenuIcon kind="study" /></i><b>공부법 상담<small>암기·복습·집중 전략</small></b><em>›</em></button>
        <button onClick={openChat}><i className="otti-menu-icon health"><OttiMenuIcon kind="health" /></i><b>건강 정보 상담<small>수면·피로·생활 습관</small></b><em>›</em></button>
        <button onClick={openChat}><i className="otti-menu-icon plan"><OttiMenuIcon kind="plan" /></i><b>오늘 계획<small>할 일을 작은 단계로 나누기</small></b><em>›</em></button>
        <button className="ask-input" onClick={openChat}>Otti에게 물어보세요. <em>➤</em></button>
        <p>ⓘ 건강 정보는 진료를 대신하지 않아요.</p>
      </section>
    </div>
  );
}
