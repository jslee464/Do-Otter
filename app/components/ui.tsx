"use client";
/* =====================================================================
 *  공용 UI 컴포넌트 (StatusBar / TopBar / OtterAvatar / BottomNav)
 *  ⚠️ 여러 뷰가 함께 사용 — 변경 시 팀에 공유하세요.
 * ===================================================================== */
import Image from "next/image";
import { useContext } from "react";
import { IMG, OpenChat, type LV, type Tab } from "../shared";
import { itemById, SLOT_POS } from "../../lib/logic";
import type { UserState } from "../../lib/backend";

export function StatusBar() {
  return (
    <div className="statusbar">
      <span>9:41</span>
      <svg className="system-status-icons" viewBox="0 0 58 16" fill="none" aria-hidden="true">
        <path d="M2 14v-4M6 14V7M10 14V4M14 14V1" />
        <path d="M21 6.5a10 10 0 0 1 14 0M24 9.5a6 6 0 0 1 8 0M27 12.3a2 2 0 0 1 2 0" />
        <rect x="41" y="3" width="14" height="9" rx="2" />
        <path d="M57 6v3" />
        <rect className="system-battery-fill" x="43" y="5" width="10" height="5" rx="1" />
      </svg>
    </div>
  );
}

export function TopBar({ state, lv }: { state: UserState; lv: LV }) {
  const openChat = useContext(OpenChat);
  const xp = `${Math.round((lv.currentExp / lv.nextReq) * 100)}%`;
  return (
    <>
      <div className="topbar">
        <div className="shell-pill">
          <span className="shell">🐚</span>
          {state.shells.toLocaleString()}
        </div>
        <button className="bell" aria-label="알림">
          🔔
        </button>
      </div>
      <div className="level-row">
        <div className="level-pill">
          <span className="level-badge">Lv.{lv.level}</span>
          <div className="level-track">
            <div className="level-fill" style={{ ["--xp" as string]: xp }} />
          </div>
        </div>
        <button className="otter-chat-btn" onClick={openChat} aria-label="Otti와 채팅">
          <span className="otter-chat-face">Otti</span>
          <span className="chat-dot" />
        </button>
      </div>
      <div className="exp-caption">
        EXP {lv.currentExp} / {lv.nextReq}
      </div>
    </>
  );
}

export function OtterAvatar({
  img,
  equipped,
  children,
  onClick,
}: {
  img: string;
  equipped: string[];
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  const photoClass = img.startsWith("character_")
    ? `avatar-photo avatar-photo-${img.replace("character_", "").split(".")[0]}`
    : undefined;
  const avatarVariant = img.startsWith("character_")
    ? `avatar-${img.replace("character_", "").split(".")[0]}`
    : "";

  return (
    <div
      className={`avatar ${avatarVariant} ${onClick ? "tappable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      {children}
      <Image
        className={photoClass}
        src={`${IMG}/${img}`}
        alt="otter"
        width={512}
        height={512}
      />
      {equipped.map((id) => {
        const it = itemById(id);
        if (!it) return null;
        const pos = SLOT_POS[it.slot];
        return (
          <span
            key={id}
            className="otter-item"
            style={{ top: pos.top, left: pos.left, fontSize: pos.size }}
          >
            {it.emoji}
          </span>
        );
      })}
    </div>
  );
}

export type NavIconKind = Exclude<Tab, "customize">;

export function NavIcon({ kind, active = false }: { kind: NavIconKind; active?: boolean }) {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {kind === "impact" && (
        <>
          <path d="M15.8 3.6a8.7 8.7 0 1 0 5 14.7 7.5 7.5 0 0 1-5-14.7Z" />
          <path d="m18.7 3 .45 1.15 1.15.45-1.15.45-.45 1.15-.45-1.15-1.15-.45 1.15-.45L18.7 3ZM7.2 5.8l.3.75.75.3-.75.3-.3.75-.3-.75-.75-.3.75-.3.3-.75Z" />
        </>
      )}
      {kind === "stats" && (
        <>
          <rect x="4" y="3" width="16" height="18" rx="3" />
          <path d="M8 16v-4M12 16V8M16 16v-6" />
        </>
      )}
      {kind === "home" && (
        active ? (
          <path className="nav-icon-fill" d="M2.8 10.5 12 2.7l9.2 7.8a1.4 1.4 0 0 1 .5 1.1v8.2a1.5 1.5 0 0 1-1.5 1.5h-5.1v-6.2H8.9v6.2H3.8a1.5 1.5 0 0 1-1.5-1.5v-8.2c0-.4.2-.8.5-1.1Z" />
        ) : (
          <>
            <path d="m3 10.5 9-7.6 9 7.6" />
            <path d="M4.2 9.6v10.2h5.2v-6h5.2v6h5.2V9.6" />
          </>
        )
      )}
      {kind === "calendar" && (
        <>
          <rect x="3.5" y="5" width="17" height="16" rx="3" />
          <path d="M7.5 2.8v4.4M16.5 2.8v4.4M3.5 9.5h17" />
        </>
      )}
      {kind === "settings" && (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.1 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2.3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.1 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8.5 4.1a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2.3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.1a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 8.5c.14.38.36.72.66 1 .3.26.7.4 1.1.4h.09a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
        </>
      )}
    </svg>
  );
}

export function BottomNav({
  tab,
  setTab,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
}) {
  const items: { key: NavIconKind; label: string }[] = [
    { key: "impact", label: "영향" },
    { key: "stats", label: "기록" },
    { key: "home", label: "홈" },
    { key: "calendar", label: "일정" },
    { key: "settings", label: "설정" },
  ];
  return (
    <div className="nav">
      {items.map((it) => (
        <button
          key={it.key}
          className={`nav-btn ${tab === it.key ? "active" : ""}`}
          onClick={() => setTab(it.key)}
          aria-label={it.label}
        >
          <NavIcon kind={it.key} active={tab === it.key} />
          <span className="nlabel">{it.label}</span>
        </button>
      ))}
    </div>
  );
}
