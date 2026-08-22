"use client";

import Image from "next/image";

export type RiverStage = "blocked" | "arrived" | "restored";

const RIVER_LABELS: Record<RiverStage, string> = {
  blocked: "알림과 방해 요소로 막힌 가상 강",
  arrived: "막힌 강을 청소하러 온 Otti",
  restored: "집중 뒤 다시 맑게 흐르는 가상 강",
};

export function RiverScene({
  stage,
  className = "",
  mirrored = false,
  imageSrc,
  imageAlt,
  children,
}: {
  stage: RiverStage;
  className?: string;
  mirrored?: boolean;
  imageSrc?: string;
  imageAlt?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`river-scene river-${stage} ${mirrored ? "river-mirrored" : ""} ${className}`}
      role="img"
      aria-label={imageAlt ?? RIVER_LABELS[stage]}
    >
      {imageSrc ? (
        <Image
          className="river-photo"
          src={imageSrc}
          alt=""
          fill
          sizes="(max-width: 480px) calc(100vw - 32px), 366px"
          priority
        />
      ) : (
        <div className="river-art" />
      )}
      {children}
    </div>
  );
}

export function DurationPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (minutes: number) => void;
  disabled?: boolean;
}) {
  const setMinutes = (minutes: number) => onChange(Math.min(180, Math.max(5, minutes)));

  return (
    <div className="duration-picker" aria-label="집중 시간 설정">
      <div className="duration-adjust">
        <button type="button" onClick={() => setMinutes(value - 5)} disabled={disabled || value <= 5}>
          −5분
        </button>
        <strong aria-live="polite">{value}분</strong>
        <button type="button" onClick={() => setMinutes(value + 5)} disabled={disabled || value >= 180}>
          +5분
        </button>
      </div>
      <div className="duration-quick" aria-label="빠른 시간 선택">
        {[10, 25, 45, 60].map((minutes) => (
          <button
            type="button"
            key={minutes}
            className={value === minutes ? "on" : ""}
            onClick={() => setMinutes(minutes)}
            disabled={disabled}
          >
            {minutes}분
          </button>
        ))}
      </div>
    </div>
  );
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`product-switch ${checked ? "on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

export function CampaignStatusCard() {
  const rows = [
    ["파트너", "확정 전"],
    ["캠페인 기간", "협의 전"],
    ["집중 시간 전환 기준", "검증·확정 전"],
    ["누적 참여", "연동 전"],
    ["실제 전달 결과", "연동 전"],
  ];

  return (
    <section className="campaign-card" aria-labelledby="campaign-title">
      <div className="campaign-head">
        <div>
          <span className="campaign-eyebrow">수해복구 캠페인</span>
          <h2 id="campaign-title">캠페인 준비 중</h2>
        </div>
        <span className="campaign-status">준비 중</span>
      </div>
      <p>
        검증된 파트너와 전환 기준이 확정된 뒤에만 실제 지원 내역을 연결합니다.
      </p>
      <dl>
        {rows.map(([term, value]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
