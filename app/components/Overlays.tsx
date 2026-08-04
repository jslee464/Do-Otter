"use client";
/* =====================================================================
 *  세션 완료 / 페널티 오버레이 · Chat Pro 페이월
 * ===================================================================== */
import { IMG, fmtDur, type SessionOutcome } from "../shared";

// 챗봇(수달이 대화)은 Chat Pro 전용 — 미구독자에게 보이는 페이월
export function ChatProPaywall({
  onSubscribe,
  onClose,
}: {
  onSubscribe: () => void;
  onClose: () => void;
}) {
  return (
    <div className="overlay paywall">
      <button className="paywall-x" onClick={onClose} aria-label="닫기">
        ✕
      </button>
      <div className="paywall-badge">💬 Chat Pro 전용</div>
      <img className="otterbig" src={`${IMG}/otter_study.png`} alt="수달이" />
      <h2>수달이와 대화하기</h2>
      <div className="msg">
        수달이랑 1:1로 공부 고민을 나누고
        <br />
        내 데이터 기반 맞춤 조언을 받아보세요.
      </div>
      <ul className="paywall-benefits">
        <li>무제한 대화</li>
        <li>공부·방해앱 데이터 기반 코칭</li>
        <li>D-day·일정 연계 조언</li>
      </ul>
      <button className="continue" onClick={onSubscribe}>
        Chat Pro 구독하기
      </button>
      <button className="paywall-later" onClick={onClose}>
        나중에 할게요
      </button>
    </div>
  );
}

export function CongratsOverlay({
  o,
  onClose,
}: {
  o: SessionOutcome;
  onClose: () => void;
}) {
  const leveled = o.newLevel > o.oldLevel;
  return (
    <div className="overlay congrats">
      <h2>{leveled ? "LEVEL UP! 🎉" : "Congratulations!"}</h2>
      <img className="otterbig" src={`${IMG}/otter_cheer.png`} alt="cheer" />
      <div className="pts-pill">
        <span className="plus">+{o.expEarned} EXP</span>
        {o.shellsGained > 0 && <span className="plus">+{o.shellsGained} 🐚</span>}
      </div>
      <div className="msg">
        순공 {fmtDur(o.effectiveSec)} · 품질 {Math.round(o.qualityRatio * 100)}%
        {leveled && (
          <>
            <br />
            <b>Lv.{o.oldLevel} → Lv.{o.newLevel}!</b>
          </>
        )}
        {o.goalReached && (
          <>
            <br />
            🎯 오늘 목표 달성!
          </>
        )}
      </div>
      {o.achievements.length > 0 && (
        <div className="ach-earned">
          {o.achievements.map((a) => (
            <div key={a.id} className="ach-earned-row">
              🏅 <b>{a.name}</b> 달성 {a.reward > 0 && `(+${a.reward}🐚)`}
            </div>
          ))}
        </div>
      )}
      <button className="continue" onClick={onClose}>계속</button>
    </div>
  );
}

export function OopsOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay oops">
      <h2>Oops!</h2>
      <img className="otterbig" src={`${IMG}/otter_astonished.png`} alt="oops" />
      <div className="pts-pill">
        <span className="minus">유해앱 30분</span>
        <span className="minus">순공 감소</span>
      </div>
      <div className="msg">
        나쁜 앱 사용시간 30min
        <br />
        수달이가 화났어요 · 기록에 남았어요
      </div>
      <button className="continue" onClick={onClose}>계속</button>
    </div>
  );
}
