"use client";

import { IMG } from "../shared";

export default function ProAd({
  onClose,
  onHideWeek,
  onOpenPro,
}: {
  onClose: () => void;
  onHideWeek: () => void;
  onOpenPro: () => void;
}) {
  return (
    <div className="pro-ad-overlay" role="dialog" aria-modal="true" aria-labelledby="pro-ad-title">
      <div className="pro-ad-card">
        <button className="pro-ad-close" onClick={onClose} aria-label="Pro 수달 광고 닫기">
          ×
        </button>
        <div className="pro-ad-crown" aria-hidden="true">👑</div>
        <div className="pro-ad-label">DO-OTTER PRO</div>
        <img className="pro-ad-character" src={`${IMG}/character_finger.jpg`} alt="Pro 수달" />
        <h2 id="pro-ad-title">Pro 수달과 더 깊게 집중해요</h2>
        <p>광고 없이 공부하고 특별한 커스텀 아이템도 만나보세요.</p>
        <button className="pro-ad-primary" onClick={onOpenPro}>Pro 수달 알아보기</button>
        <button className="pro-ad-snooze" onClick={onHideWeek}>일주일간 다시보지 않기</button>
      </div>
    </div>
  );
}
