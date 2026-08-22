"use client";

import type { UserState } from "../../lib/backend";
import type { LV } from "../shared";
import { CampaignStatusCard, RiverScene } from "../components/product";
import { TopBar } from "../components/ui";

const VIRTUAL_RIVER_GOAL_MIN = 600;

export default function ImpactView({ state, lv }: { state: UserState; lv: LV }) {
  const focusedMinutes = Math.floor(state.effectiveSeconds / 60);
  const progress = Math.min(100, Math.round((focusedMinutes / VIRTUAL_RIVER_GOAL_MIN) * 100));
  const restored = progress >= 100;

  return (
    <div className="view impact-view">
      <TopBar state={state} lv={lv} />

      <header className="impact-title">
        <span>내 집중이 만든 변화</span>
        <h1>가상 강 회복</h1>
        <p>
          집중 기록이 쌓일수록 앱 속 강의 쓰레기가 줄고 물길이
          <br />
          맑아져요.
        </p>
      </header>

      <section className="virtual-river-card" aria-labelledby="virtual-river-title">
        <RiverScene
          stage={focusedMinutes > 0 ? "restored" : "blocked"}
          className="impact-river"
          imageSrc="/images/river/impact-40.png"
          imageAlt="Otti가 청소해 40% 회복된 강"
        />
        <div className="virtual-river-copy">
          <div className="virtual-river-heading">
            <div>
              <h2 id="virtual-river-title">강 회복 진행도</h2>
            </div>
            <strong className={restored ? "complete" : ""}>{progress}%</strong>
          </div>
          <div
            className={`river-progress ${restored ? "complete" : ""}`}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="virtual-river-meta">
            <span>누적 집중 {focusedMinutes.toLocaleString()}분</span>
            <span>가상 목표 {VIRTUAL_RIVER_GOAL_MIN}분</span>
          </div>
        </div>
      </section>

      <CampaignStatusCard />

      <p className="impact-trust-note">
        현재 화면은 가상 강 회복만 보여줍니다. 실제 후원·기부 금액이나 전달 실적은 표시하지 않습니다.
      </p>
    </div>
  );
}
