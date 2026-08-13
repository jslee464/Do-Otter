"use client";
/* =====================================================================
 *  수달이 (커스텀) 뷰  — 담당: 캐릭터·커스텀
 * ===================================================================== */
import { type LV } from "../shared";
import { TopBar, OtterAvatar } from "../components/ui";
import { OTTER_ITEMS, type OtterItem } from "../../lib/logic";
import type { UserState } from "../../lib/backend";

const GRADE_ORDER: Record<OtterItem["grade"], number> = {
  common: 0,
  rare: 1,
  epic: 2,
};

function ItemIcon({ item }: { item: OtterItem }) {
  if (item.id !== "glasses") return <>{item.emoji}</>;

  return (
    <svg
      className="clear-glasses-icon"
      viewBox="0 0 72 44"
      role="img"
      aria-label="투명 렌즈 공부 안경"
    >
      <path d="M5 14 1 10M67 14l4-4M28 19c4-4 12-4 16 0" />
      <rect x="5" y="11" width="24" height="22" rx="9" />
      <rect x="43" y="11" width="24" height="22" rx="9" />
      <path className="lens-shine" d="m10 17 6-3M48 17l6-3" />
    </svg>
  );
}

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
  const sortedItems = [...OTTER_ITEMS].sort(
    (a, b) => GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade] || a.price - b.price,
  );

  const confirmReplacement = (item: OtterItem) => {
    const hasItemInSameSlot = state.equippedItems.some(
      (id) => id !== item.id && OTTER_ITEMS.find((owned) => owned.id === id)?.slot === item.slot,
    );

    return (
      !hasItemInSameSlot ||
      window.confirm("같은 부위에 이미 아이템을 착용하고 있어요. 변경하시겠습니까?")
    );
  };

  return (
    <div className="view">
      <TopBar state={state} lv={lv} />

      {/* 미리보기 */}
      <div className="custom-preview">
        <OtterAvatar img="character_fish.jpg" equipped={state.equippedItems} />
      </div>
      <div className="char-name">{state.username}</div>
      <div className="char-sub">{state.streak}일 연속 집중 중이에요!</div>

      <div className="section-title">
        수달 커스텀 <span className="count-chip">보유 {state.ownedItems.length}개</span>
      </div>
      <div className="shop-grid">
        {sortedItems.map((it) => {
          const owned = state.ownedItems.includes(it.id);
          const equipped = state.equippedItems.includes(it.id);
          const canBuy = state.shells >= it.price;
          return (
            <div key={it.id} className={`shop-item ${equipped ? "equipped" : ""}`}>
              <div className={`grade-tag g-${it.grade}`}>{it.grade}</div>
              <div className="emoji"><ItemIcon item={it} /></div>
              <div className="name">{it.name}</div>
              {!owned ? (
                <button
                  className={`shop-btn buy ${canBuy ? "" : "off"}`}
                  onClick={() => (!canBuy || confirmReplacement(it)) && onBuy(it)}
                >
                  🐚 {it.price}
                </button>
              ) : (
                <button
                  className={`shop-btn ${equipped ? "on" : "equip"}`}
                  onClick={() => (equipped || confirmReplacement(it)) && onEquip(it)}
                >
                  {equipped ? "착용중 ✓" : "착용"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
