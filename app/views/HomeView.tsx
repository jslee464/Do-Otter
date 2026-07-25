"use client";
/* =====================================================================
 *  홈 / 공부 타이머 뷰  — 담당: 메인·타이머
 * ===================================================================== */
import { fmt, TIME_OPTIONS, type LV, type Phase } from "../shared";
import { TopBar, OtterAvatar } from "../components/ui";
import { HARMFUL } from "../../lib/logic";
import type { UserState } from "../../lib/backend";

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
  const running = p.phase === "running";
  const active = p.phase === "running" || p.phase === "paused";
  const otter = p.harmfulActive
    ? "otter_astonished.png"
    : running
    ? "otter_study.png"
    : "otter_default1.png";
  const remain =
    p.targetMin > 0 ? Math.max(0, p.targetMin * 60 - p.studySec) : null;
  const bubbleText = p.tapLine
    ? p.tapLine
    : p.harmfulActive
    ? HARMFUL.strong
    : p.bubble;

  return (
    <div className="view">
      <TopBar state={p.state} lv={p.lv} />

      <div className="avatar-wrap">
        <OtterAvatar img={otter} equipped={p.equipped} onClick={p.onTapOtter}>
          <div className="speech">{bubbleText}</div>
        </OtterAvatar>
      </div>
      <div className="tap-hint">수달이를 톡 건드려봐! 🫧</div>

      <div className="timer">{fmt(p.studySec)}</div>
      <div className="mode-tag">
        {running && !p.harmfulActive && "STUDY MODE · 집중하는 중"}
        {running && p.harmfulActive && "⚠️ 딴짓 중 · 순공시간이 줄고 있어요"}
        {p.phase === "paused" && "일시정지"}
        {p.phase === "idle" && " "}
        {p.phase === "selecting" && "공부 시간을 선택하세요"}
      </div>

      {p.phase === "selecting" && (
        <div className="time-select">
          {TIME_OPTIONS.map((t) => (
            <button key={t.label} className="time-chip" onClick={() => p.onSelect(t.min)}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {active && remain !== null && (
        <div className="target-line">목표 {p.targetMin}분 · 남은 시간 {fmt(remain)}</div>
      )}

      <div className="controls">
        {p.phase === "idle" && (
          <button className="claybtn play" onClick={p.onPlay} aria-label="시작">
            ▶
          </button>
        )}
        {running && (
          <>
            <button className="claybtn small" onClick={p.onPause} aria-label="일시정지">
              ❚❚
            </button>
            <button
              className="claybtn small"
              onMouseDown={p.stopDown}
              onMouseUp={p.stopUp}
              onMouseLeave={p.stopUp}
              onTouchStart={p.stopDown}
              onTouchEnd={p.stopUp}
              aria-label="정지(길게)"
            >
              ■
            </button>
          </>
        )}
        {p.phase === "paused" && (
          <>
            <button className="claybtn small" onClick={p.onResume} aria-label="다시 시작">
              ▶
            </button>
            <button
              className="claybtn small"
              onMouseDown={p.stopDown}
              onMouseUp={p.stopUp}
              onMouseLeave={p.stopUp}
              onTouchStart={p.stopDown}
              onTouchEnd={p.stopUp}
              aria-label="정지(길게)"
            >
              ■
            </button>
          </>
        )}
      </div>

      {active && (
        <>
          <button
            className={`distract-btn ${p.harmfulActive ? "on" : ""}`}
            onClick={p.onToggleHarmful}
          >
            {p.harmfulActive ? "📚 공부로 돌아가기" : "📱 딴짓하기 (유해앱 열기)"}
          </button>
          <div className="hint-hold">■ 정지 버튼을 꾹 누르면 세션이 완료돼요</div>
        </>
      )}
    </div>
  );
}
