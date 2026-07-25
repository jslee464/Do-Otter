"use client";
/* =====================================================================
 *  수달이 (커스텀) 뷰  — 담당: 캐릭터·커스텀
 * ===================================================================== */
import { type LV } from "../shared";
import { TopBar, OtterAvatar } from "../components/ui";
import { OTTER_ITEMS, type OtterItem } from "../../lib/logic";
import type { UserState } from "../../lib/backend";

export default function CharacterView({
  state,
  lv,
  onBuy,
  onEquip,
}: {
  state: UserState;
  lv: LV;
  onBuy: (i: OtterItem) => void;
  onEquip: (i: OtterItem) => void;
}) {
  return (
    <div className="view">
      <TopBar state={state} lv={lv} />

      {/* 미리보기 */}
      <div className="custom-preview">
        <OtterAvatar img="otter_default1.png" equipped={state.equippedItems} />
      </div>
      <div className="char-name">{state.username}</div>
      <div className="char-sub">
        Lv.{lv.level} · 🔥{state.streak}일 연속 · 🏅{state.unlocked.length}개 업적
      </div>

      <div className="section-title">
        수달 커스텀 <span className="count-chip">보유 {state.ownedItems.length}개</span>
      </div>
      <div className="shop-grid">
        {OTTER_ITEMS.map((it) => {
          const owned = state.ownedItems.includes(it.id);
          const equipped = state.equippedItems.includes(it.id);
          const canBuy = state.shells >= it.price;
          return (
            <div key={it.id} className={`shop-item ${equipped ? "equipped" : ""}`}>
              <div className={`grade-tag g-${it.grade}`}>{it.grade}</div>
              <div className="emoji">{it.emoji}</div>
              <div className="name">{it.name}</div>
              {!owned ? (
                <button
                  className={`shop-btn buy ${canBuy ? "" : "off"}`}
                  onClick={() => onBuy(it)}
                >
                  🐚 {it.price}
                </button>
              ) : (
                <button
                  className={`shop-btn ${equipped ? "on" : "equip"}`}
                  onClick={() => onEquip(it)}
                >
                  {equipped ? "착용중 ✓" : "착용"}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="custom-hint">
        아이템을 사면 자동으로 착용돼요. 같은 부위는 하나만 착용할 수 있어요.
      </div>
    </div>
  );
}
