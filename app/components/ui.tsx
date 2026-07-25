"use client";
/* =====================================================================
 *  공용 UI 컴포넌트 (StatusBar / TopBar / OtterAvatar / BottomNav)
 *  ⚠️ 여러 뷰가 함께 사용 — 변경 시 팀에 공유하세요.
 * ===================================================================== */
import { useContext } from "react";
import { IMG, OpenChat, type LV, type Tab } from "../shared";
import { itemById, SLOT_POS } from "../../lib/logic";
import type { UserState } from "../../lib/backend";

export function StatusBar() {
  return (
    <div className="statusbar">
      <span>9:41</span>
      <span className="sb-icons">
        <span>􀙇</span>
        <span>􀛨</span>
        <span>􀛧</span>
      </span>
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
        <button className="otter-chat-btn" onClick={openChat} aria-label="수달이와 채팅">
          <img src={`${IMG}/face_happy.png`} alt="수달이" />
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
  return (
    <div
      className={`avatar ${onClick ? "tappable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      {children}
      <img src={`${IMG}/${img}`} alt="otter" />
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

export function BottomNav({
  tab,
  setTab,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
}) {
  const items: { key: Tab; icon: string; label: string }[] = [
    { key: "character", icon: "🦦", label: "수달이" },
    { key: "stats", icon: "📊", label: "기록" },
    { key: "home", icon: "🏠", label: "홈" },
    { key: "calendar", icon: "📖", label: "일정" },
    { key: "settings", icon: "⚙️", label: "설정" },
  ];
  return (
    <div className="nav">
      {items.map((it) => (
        <button
          key={it.key}
          className={`nav-btn ${tab === it.key ? "active" : ""}`}
          onClick={() => setTab(it.key)}
        >
          <span>{it.icon}</span>
          <span className="nlabel">{it.label}</span>
        </button>
      ))}
    </div>
  );
}
