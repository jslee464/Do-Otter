"use client";
/* =====================================================================
 *  세션 완료 / 페널티 오버레이
 * ===================================================================== */
import { IMG, fmtDur, type SessionOutcome } from "../shared";

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
