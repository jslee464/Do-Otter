"use client";
/* =====================================================================
 *  세션 완료 / 페널티 오버레이
 * ===================================================================== */
import Image from "next/image";
import { IMG, fmtDur, type SessionOutcome } from "../shared";
import { RiverScene } from "./product";

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
      <RiverScene
        stage="restored"
        className="complete-river"
        imageSrc="/images/river/focus-complete-bright.png"
        imageAlt="밝아진 Otti의 집 앞에서 집중 완료를 기뻐하는 Otti"
      />
      <div className="complete-copy">
        <span className="complete-kicker">집중 완료</span>
        <h2>집중한 만큼 강물이 다시 흐르기 시작했어요.</h2>
        <p>쓰레기가 줄고, 물결과 Otti의 집 주변이 한층 밝아졌어요.</p>
      </div>
      <div className="complete-result">
        <span>순공 {fmtDur(o.effectiveSec)}</span>
        <span>집중 품질 {Math.round(o.qualityRatio * 100)}%</span>
        {leveled && (
          <span>Lv.{o.oldLevel} → Lv.{o.newLevel}</span>
        )}
        {o.shellsGained > 0 && <span>조개 +{o.shellsGained}</span>}
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
      <button className="continue" onClick={onClose}>확인</button>
    </div>
  );
}

export function OopsOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay oops">
      <h2>Oops!</h2>
      <Image className="otterbig" src={`${IMG}/otter_astonished.png`} alt="oops" width={512} height={512} />
      <div className="pts-pill">
        <span className="minus">유해앱 30분</span>
        <span className="minus">순공 감소</span>
      </div>
      <div className="msg">
        나쁜 앱 사용시간 30min
        <br />
        Otti가 놀랐어요 · 기록에 남았어요
      </div>
      <button className="continue" onClick={onClose}>계속</button>
    </div>
  );
}
