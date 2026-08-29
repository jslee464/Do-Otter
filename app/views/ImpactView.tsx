"use client";

import { useEffect, useState } from "react";
import type { UserState } from "../../lib/backend";
import riverBefore from "../../집중 전 막힌 강.png";
import riverBright from "../../밝은 집중 완료 장면.png";
import riverMapArt from "../../river_brainstorm.jpg";

type ImpactStep = "consent" | "map" | "detail" | "progress";

export default function ImpactView({ state }: { state: UserState }) {
  const [step, setStep] = useState<ImpactStep>("consent");
  const [river, setRiver] = useState("홍제천");
  const [showRestoreNotice, setShowRestoreNotice] = useState(false);

  useEffect(() => {
    const screen = Number(window.location.hash.replace("#screen-", ""));
    if (screen === 24) setStep("map");
    if (screen === 25) setStep("detail");
    if (screen === 26) setStep("progress");
  }, []);

  const focusedMin = Math.max(240, Math.round(state.effectiveSeconds / 60));
  const progress = Math.min(100, Math.round((focusedMin / 600) * 100));

  if (step === "consent") {
    return (
      <div className="view hf-impact impact-consent">
        <span className="blue-kicker">내 주변 강 찾기</span>
        <h1>가까운 하천을<br />추천하려면<br />위치가 필요해요.</h1>
        <p>수달과 함께 더 가까운 강을<br />발견해 보세요.</p>
        <div className="location-scene"><img src={riverBright.src} alt="도심을 흐르는 맑은 강과 Otti" /></div>
        <div className="privacy-card">
          <b>▣ &nbsp; 수달 위치 정보 원칙</b>
          <ul><li>사용자의 위치는 하천 추천에만 사용돼요.</li><li>정확한 위치는 저장하지 않아요.</li><li>언제든지 설정에서 변경할 수 있어요.</li></ul>
        </div>
        <button className="hf-primary" onClick={() => setStep("map")}>현재 위치로 추천받기</button>
        <button className="hf-outline" onClick={() => setStep("map")}>지역 직접 선택</button>
      </div>
    );
  }

  if (step === "map") {
    return (
      <div className="view hf-impact impact-map">
        <h1>내가 회복할 강 선택하기</h1>
        <p>현재 위치에서 가까운 하천을 추천했어요.</p>
        <div className="map-visual" aria-label="주변 하천 지도">
          <span className="you" />
          <i className="pin p1">≋</i><i className="pin p2">≋</i><i className="pin p3">≋</i>
        </div>
        <div className="river-list">
          {[["홍제천", "1.2km"], ["한강", "3.8km"], ["안양천", "8.4km"]].map(([name, distance]) => (
            <button key={name} className={river === name ? "on" : ""} onClick={() => setRiver(name)}>
              <b>{name}</b><span>{distance}</span>{river === name && <i>✓</i>}
            </button>
          ))}
        </div>
        <div className="otter-zone"><span>≋</span><div><b>수달 출현 확인 구간</b><small>수달이 최근 관찰된 구간을 표시했어요.</small></div></div>
        <p className="privacy-line">▣ 정확한 서식 위치는 보호를 위해 공개하지 않아요.</p>
        <button className="hf-primary" onClick={() => setShowRestoreNotice(true)}>이 강을 회복하기</button>
        {showRestoreNotice && (
          <div className="impact-coming-soon-overlay" role="dialog" aria-modal="true" aria-labelledby="impact-coming-soon-title">
            <section className="impact-coming-soon-banner">
              <div>
                <h2 id="impact-coming-soon-title">아직 준비 중이에요!</h2>
                <p>조금만 기다려 주세요.</p>
              </div>
              <button onClick={() => setShowRestoreNotice(false)}>이전으로 돌아가기</button>
            </section>
          </div>
        )}
      </div>
    );
  }

  if (step === "detail") {
    return (
      <div className="view hf-impact impact-detail">
        <span className="blue-kicker">내가 선택한 강</span>
        <h1>{river}</h1>
        <p>도심을 흐르는 한강 지류</p>
        <img className="detail-map" src={riverMapArt.src} alt={`${river} 권역 지도`} />
        <div className="habitat-card">
          <div><span>≋</span><b>수달이 사는 강 권역</b></div>
          <small>정확한 서식 좌표는 표시하지 않아요.</small>
          <img src={riverBright.src} alt="수달 서식 강 풍경" />
          <div className="river-goal"><b>{focusedMin}분 <small>/ 600분</small></b><span><i style={{ width: `${progress}%` }} /></span><em>🦦</em></div>
        </div>
        <button className="hf-primary" onClick={() => setStep("progress")}>복구 진행 보기</button>
      </div>
    );
  }

  return (
    <div className="view hf-impact impact-progress">
      <span className="blue-kicker">내 집중이 만든 변화</span>
      <h1>{river} 가상 회복</h1>
      <p>집중 기록이 쌓일수록 앱 속 강이<br />맑아져요.</p>
      <div className="before-after">
        <img src={riverBefore.src} alt="회복 전 강" />
        <img src="/images/river_recovery_40.png" alt="회복 중인 강" />
        <span>➜</span>
      </div>
      <div className="progress-card">
        <div><b>강 회복 진행도</b><strong>{progress}%</strong></div>
        <span className="impact-track"><i style={{ width: `${progress}%` }} /></span>
        <div className="progress-labels"><span><b>{focusedMin}분</b><small>누적 집중 시간</small></span><span><b>600분</b><small>가상 목표 시간</small></span></div>
      </div>
    </div>
  );
}
