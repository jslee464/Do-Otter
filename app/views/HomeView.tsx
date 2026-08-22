"use client";

import { fmt, type LV, type Phase } from "../shared";
import { DurationPicker, RiverScene } from "../components/product";
import { TopBar } from "../components/ui";
import type { UserState } from "../../lib/backend";

export default function HomeView(p: {
  state: UserState;
  lv: LV;
  phase: Phase;
  studySec: number;
  targetMin: number;
  goalName: string;
  onGoalNameChange: (value: string) => void;
  onDurationChange: (minutes: number) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
}) {
  const active = p.phase === "running" || p.phase === "paused";
  const remainingSec = active
    ? Math.max(0, p.targetMin * 60 - p.studySec)
    : p.targetMin * 60;

  return (
    <div className={`view home-view home-${p.phase}`}>
      <TopBar state={p.state} lv={p.lv} />

      <header className="home-intro">
        <span>
          {active ? "Otti와 함께 청소 중" : "알림과 방해 요소가 물길을 막고 있어요"}
        </span>
        <h1>{active ? "집중이 물길을 열고 있어요" : "오늘은 강을 얼마나 회복시켜볼까요?"}</h1>
      </header>

      <RiverScene
        stage={active ? "arrived" : "blocked"}
        mirrored={active}
        className="home-river"
        imageSrc={active ? "/images/river/focus-in-progress.png" : "/images/river/home-blocked.png"}
        imageAlt={active ? "Otti가 강을 청소하며 집중 중인 장면" : "집중 전, 알림과 방해 요소로 막힌 강"}
      />

      <section className="focus-card" aria-label="집중 타이머">
        <div className="focus-card-head">
          <span>{active ? "남은 시간" : "집중 시간"}</span>
          {active && (
            <span className="focus-status">
              {p.phase === "paused" ? "일시정지" : "진행 중"}
            </span>
          )}
        </div>
        <div className="focus-time" aria-live="polite">{fmt(remainingSec)}</div>

        {!active ? (
          <>
            <DurationPicker value={p.targetMin} onChange={p.onDurationChange} />
            <label className="goal-field">
              <span>목표명 <small>선택</small></span>
              <input
                value={p.goalName}
                onChange={(event) => p.onGoalNameChange(event.target.value)}
                placeholder="예: 발표 자료 정리"
                maxLength={40}
              />
            </label>
            <button className="focus-primary" type="button" onClick={p.onStart}>
              집중 시작
            </button>
          </>
        ) : (
          <>
            {p.goalName && <div className="active-goal">목표 · {p.goalName}</div>}
            <div className="focus-controls">
              {p.phase === "paused" ? (
                <button type="button" className="focus-secondary" onClick={p.onResume}>
                  계속
                </button>
              ) : (
                <button type="button" className="focus-secondary" onClick={p.onPause}>
                  일시정지
                </button>
              )}
              <button type="button" className="focus-end" onClick={p.onFinish}>
                종료
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
