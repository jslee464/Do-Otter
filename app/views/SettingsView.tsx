"use client";

import { useEffect, useState, type ReactNode } from "react";
import { type LV } from "../shared";
import {
  backendMode,
  getBlockedApps,
  saveBlockedApps,
  type BlockedApp,
  type UserState,
} from "../../lib/backend";
import instagramIcon from "../../01_instagram_pixel_kitsch_v2.png";
import youtubeIcon from "../../02_youtube_pixel_kitsch_v2.png";
import tiktokIcon from "../../03_tiktok_pixel_kitsch_v2.png";
import xIcon from "../../06_x_pixel_kitsch_v2.png";

export default function SettingsView(p: {
  state: UserState;
  lv: LV;
  onAd: () => void;
  onCustomize: () => void;
  onImpact: () => void;
  onCheckout: (plan: "pro" | "chatpro") => void;
  onSignOut: () => void;
  dark: boolean;
  onDarkChange: (value: boolean) => void;
}) {
  const [block, setBlock] = useState(true);
  const [location, setLocation] = useState(true);
  const [notificationTiming, setNotificationTiming] = useState("자동");
  const [editingApps, setEditingApps] = useState(false);
  const [showCustomizeNotice, setShowCustomizeNotice] = useState(false);
  const [showTimingSheet, setShowTimingSheet] = useState(false);

  if (editingApps) {
    return <BlockedAppsSelection onClose={() => setEditingApps(false)} />;
  }

  return (
    <div className="view hf-settings">
      <header><h1>설정</h1><div><button onClick={p.onAd}>🐚 {p.state.shells}</button><button>🔔</button></div></header>
      <div className="settings-list">
        <SettingRow icon="🚫" title="방해 앱 차단" value={block ? "사용 중" : "꺼짐"} onClick={() => setBlock(!block)} />
        <SettingRow icon="⏰" title="유해 앱 알림 시점" value={notificationTiming} onClick={() => setShowTimingSheet(true)} />
        <SettingRow icon="▦" title="방해 앱 다시 선택" value="" onClick={() => setEditingApps(true)} />
        <SettingRow icon="💬" title="Otti 말투" value="응원형" />
        <SettingRow icon={<SettingsFeatureIcon kind="river" />} iconClass="setting-icon-blue" title="내가 선택한 강" value="홍제천" onClick={p.onImpact} />
        <SettingRow icon={<SettingsFeatureIcon kind="location" />} iconClass="setting-icon-blue" title="위치 기반 추천" value={location ? "사용 중" : "꺼짐"} onClick={() => setLocation(!location)} />
        <SettingRow icon="👑" title="Pro 수달" value={p.state.isPro ? "이용 중" : "구독하기"} onClick={() => {
          if (!p.state.isPro) p.onCheckout("pro");
        }} />
        <SettingRow icon="💬" title="수달 Chat Pro" value={p.state.isChatPro ? "이용 중" : "구독하기"} onClick={() => {
          if (!p.state.isChatPro) p.onCheckout("chatpro");
        }} />
      </div>

      <div className="settings-meta">
        <button onClick={() => setShowCustomizeNotice(true)}>Otti 꾸미기</button>
        <span>{backendMode === "supabase" ? "계정 연결됨" : `데모 · Lv.${p.lv.level}`}</span>
        <button onClick={p.onSignOut}>로그아웃</button>
      </div>

      {showCustomizeNotice && (
        <div className="settings-customize-overlay" role="dialog" aria-modal="true" aria-labelledby="customize-notice-title">
          <section className="settings-customize-banner">
            <div>
              <h2 id="customize-notice-title">아직 준비 중이에요!</h2>
              <p>조금만 기다려 주세요.</p>
            </div>
            <button onClick={() => setShowCustomizeNotice(false)}>설정으로 돌아가기</button>
          </section>
        </div>
      )}

      {showTimingSheet && (
        <div className="settings-customize-overlay" role="dialog" aria-modal="true" aria-labelledby="timing-sheet-title">
          <section className="settings-timing-sheet">
            <div>
              <h2 id="timing-sheet-title">유해 앱 알림 시점</h2>
              <p>집중 중 방해 앱을 연 뒤 언제 알려줄지 선택해요.</p>
            </div>
            <div className="timing-options">
              {["자동", "10분", "20분", "30분"].map((option) => (
                <button
                  key={option}
                  className={notificationTiming === option ? "on" : ""}
                  onClick={() => {
                    setNotificationTiming(option);
                    setShowTimingSheet(false);
                  }}
                >
                  <span>{option}</span>
                  {notificationTiming === option && <i>✓</i>}
                </button>
              ))}
            </div>
            <button className="timing-cancel" onClick={() => setShowTimingSheet(false)}>설정으로 돌아가기</button>
          </section>
        </div>
      )}
    </div>
  );
}

function SettingsFeatureIcon({ kind }: { kind: "river" | "location" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {kind === "river" ? (
        <>
          <path d="M3 7.5c2.2 0 2.2 1.8 4.5 1.8S9.8 7.5 12 7.5s2.2 1.8 4.5 1.8S18.8 7.5 21 7.5" />
          <path d="M3 12c2.2 0 2.2 1.8 4.5 1.8S9.8 12 12 12s2.2 1.8 4.5 1.8S18.8 12 21 12" />
          <path d="M3 16.5c2.2 0 2.2 1.8 4.5 1.8s2.3-1.8 4.5-1.8 2.2 1.8 4.5 1.8 2.3-1.8 4.5-1.8" />
        </>
      ) : (
        <>
          <path d="M12 21s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z" />
          <circle cx="12" cy="9" r="2.5" />
        </>
      )}
    </svg>
  );
}

function SettingRow({ icon, iconClass = "", title, value, onClick }: { icon: ReactNode; iconClass?: string; title: string; value: string; onClick?: () => void }) {
  return (
    <button className="setting-row" onClick={onClick}>
      <span className={iconClass}>{icon}</span><b>{title}</b>{value && <em>{value}</em>}<i>›</i>
    </button>
  );
}

const SETTINGS_APPS: BlockedApp[] = [
  { key: "instagram", name: "Instagram" },
  { key: "youtube", name: "YouTube" },
  { key: "tiktok", name: "TikTok" },
  { key: "x", name: "X" },
];

const SETTINGS_APP_ICONS: Record<string, string> = {
  instagram: instagramIcon.src,
  youtube: youtubeIcon.src,
  tiktok: tiktokIcon.src,
  x: xIcon.src,
};

function BlockedAppsSelection({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(["instagram", "youtube", "tiktok", "x"])
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getBlockedApps().then((apps) => {
      if (active && apps.length) setSelected(new Set(apps.map((app) => app.key)));
    });
    return () => {
      active = false;
    };
  }, []);

  function toggle(key: string) {
    const next = new Set(selected);
    next.has(key) ? next.delete(key) : next.add(key);
    setSelected(next);
  }

  async function save() {
    setBusy(true);
    setError("");
    const result = await saveBlockedApps(
      SETTINGS_APPS.filter((app) => selected.has(app.key))
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "앱 선택을 저장하지 못했어요.");
      return;
    }
    onClose();
  }

  return (
    <div className="view blocked-apps-view">
      <div className="apps-heading">
        <img src="/images/do-otter_face_2048.png" alt="Otti" />
        <div className="ob-title">집중할 때<br />잠시 멀리할 앱을 골라주세요.</div>
      </div>
      <div className="ob-sub">
        추천 앱은 미리 선택했어요.<br />설정에서 언제든 변경할 수 있어요.
      </div>
      <div className="app-list">
        {SETTINGS_APPS.map((app, index) => (
          <button
            type="button"
            key={app.key}
            className={`app-row ${selected.has(app.key) ? "on" : ""}`}
            onClick={() => toggle(app.key)}
            aria-pressed={selected.has(app.key)}
          >
            <span className="aemoji"><img src={SETTINGS_APP_ICONS[app.key]} alt="" /></span>
            <span className="aname">{app.name}</span>
            {index < 3 && <span className="recommend">추천</span>}
            <span className="app-switch" aria-hidden="true"><i /></span>
          </button>
        ))}
        <div className="app-row add-more">
          <span className="aemoji">＋</span>
          <span className="aname">직접 추가</span>
          <span className="app-switch" aria-hidden="true"><i /></span>
        </div>
      </div>
      <div className="blocked-app-actions">
        {error && <p className="blocked-app-error">{error}</p>}
        <button className="hf-primary" onClick={save} disabled={busy}>
          {busy ? "저장 중…" : `${selected.size}개 앱 선택 완료`}
        </button>
        <button className="blocked-app-cancel" onClick={onClose}>설정으로 돌아가기</button>
      </div>
    </div>
  );
}
