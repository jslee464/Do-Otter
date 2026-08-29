"use client";
/* =====================================================================
 *  세션 완료 / 페널티 오버레이
 * ===================================================================== */
import Image from "next/image";
import { IMG, fmtDur, type SessionOutcome } from "../shared";
import blockedRiver from "../../집중 전 막힌 강.png";
import { StatusBar } from "./ui";

export function CongratsOverlay({
  o,
  onClose,
}: {
  o: SessionOutcome;
  onClose: () => void;
}) {
  const leveled = o.newLevel > o.oldLevel;
  return (
    <div className="overlay congrats hf-congrats">
      <StatusBar />
      <div className="complete-badge">집중 완료</div>
      <h2>{leveled ? "레벨 업까지,\n정말 잘했어요!" : "집중해 줘서\n고마워요!"}</h2>
      <img className="complete-scene" src={`${IMG}/focus-complete-river.png`} alt="맑아진 강에서 기뻐하는 Otti" />
      <div className="complete-reward-card">
        <span className="complete-shell" aria-hidden="true">🐚</span>
        <div>
          <span>완료한 집중 시간</span>
          <strong>+{fmtDur(o.effectiveSec)}</strong>
          <small>
            집중 품질 {Math.round(o.qualityRatio * 100)}%
            <i aria-hidden="true">·</i>
            조개 +{Math.max(o.shellsGained, o.expEarned)}
          </small>
        </div>
      </div>
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

export type InterventionMode = "sheet";

export function InterventionOverlay({
  onReturn,
  onContinue,
}: {
  mode: InterventionMode;
  onReturn: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="intervention-sheet-wrap">
      <div className="fake-instagram" aria-hidden="true">
        <div className="fake-instagram-bar"><b>Instagram⌄</b><span>♡　◉</span></div>
        <div className="fake-stories">
          {["내 스토리", "minjii", "travel_jiwoo", "hye0n_7"].map((name, index) => (
            <span key={name}><i className={`story-${index}`} /><small>{name}</small></span>
          ))}
        </div>
        <div className="fake-profile"><i>☕</i><b>cafe.slowmoment</b><span>•••</span></div>
        <div className="fake-feed" />
      </div>
      <div className="intervention-sheet">
        <button className="intervention-close" onClick={onContinue} aria-label="경고 닫기">×</button>
        <div className="intervention-sheet-otter">
          <img src={`${IMG}/otter_intervention_peek.png`} alt="걱정하며 고개를 내민 Otti" />
        </div>
        <span className="intervention-usage">Instagram · 10분 사용</span>
        <h2>잠깐,<br />지금 집중 중이에요</h2>
        <p>예정한 시간을 넘겼어요.<br />지금 돌아가면 집중 흐름을 지킬 수 있어요.</p>
        <div className="intervention-river-scene" aria-hidden="true">
          <img src={blockedRiver.src} alt="" />
        </div>
        <div className="intervention-actions">
          <button className="intervention-return" onClick={onReturn}>집중으로 돌아가기</button>
          <button className="intervention-more" onClick={onContinue}>5분만 더 보기</button>
          <small>🔒 앱 내용은 확인하지 않아요.</small>
        </div>
      </div>
    </div>
  );
}
