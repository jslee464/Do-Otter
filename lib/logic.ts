/* =====================================================================
 *  Do-Otter · 게임 로직 (엑셀 블루프린트 그대로)
 *  - 조개_경험치설계 / 레벨테이블 / 업적리스트 / 일정_말풍선대사
 *  - 개발_핵심로직함수 시트의 함수들을 웹으로 이식
 * ===================================================================== */

/* ---------- EXP / 레벨 ---------- */
// 레벨 n → n+1 로 가기 위해 필요한 EXP = round(60 × 1.15^(n-1))
export function reqForLevel(n: number): number {
  return Math.round(60 * Math.pow(1.15, n - 1));
}

export type LevelState = { level: number; currentExp: number; nextReq: number };

export function levelState(totalExp: number): LevelState {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalExp));
  while (remaining >= reqForLevel(level) && level < 200) {
    remaining -= reqForLevel(level);
    level += 1;
  }
  return { level, currentExp: remaining, nextReq: reqForLevel(level) };
}

/* ---------- 순공시간 / 품질 / EXP (조개_경험치설계) ---------- */
export function qualityMultiplier(ratio: number): number {
  if (ratio >= 0.95) return 1.2; // 완벽 집중 보너스
  if (ratio >= 0.8) return 1.0; // 기준치
  if (ratio >= 0.5) return 0.8; // 페널티
  return 0.6; // 강한 페널티
}

export type SessionResult = {
  totalSec: number;
  harmfulSec: number;
  effectiveSec: number; // 순공시간 = total - harmful
  qualityRatio: number; // 0~1
  expEarned: number;
};

export function calcSession(totalSec: number, harmfulSec: number): SessionResult {
  const effectiveSec = Math.max(0, totalSec - harmfulSec);
  const qualityRatio = totalSec > 0 ? effectiveSec / totalSec : 0;
  const baseExp = (effectiveSec / 60) * 1; // 순공(분) × 1
  const expEarned = Math.round(baseExp * qualityMultiplier(qualityRatio));
  return { totalSec, harmfulSec, effectiveSec, qualityRatio, expEarned };
}

/* ---------- 조개 보상 상수 (조개_경험치설계) ---------- */
export const SHELL = {
  adWatch: 20, // 광고 1회 (일 5회 한도)
  adDailyLimit: 5,
  dailyGoal: 15, // 데일리 목표 100%
  levelUpPerLevel: 10, // 레벨업 시 레벨×10
};

export function levelUpShells(fromLevel: number, toLevel: number): number {
  let s = 0;
  for (let l = fromLevel + 1; l <= toLevel; l++) s += l * SHELL.levelUpPerLevel;
  return s;
}

/* ---------- D-day 티어 (getUrgencyTier / calcDday) ---------- */
export type Tier = "여유" | "주의" | "긴급" | "당일" | "지남";

export function calcDday(eventISO: string, todayISO?: string): number {
  const a = new Date(eventISO + "T00:00:00");
  const t = todayISO ? new Date(todayISO + "T00:00:00") : startOfToday();
  return Math.round((a.getTime() - t.getTime()) / 86400000);
}
export function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}
export function getUrgencyTier(dday: number): Tier {
  if (dday < 0) return "지남";
  if (dday === 0) return "당일";
  if (dday <= 3) return "긴급";
  if (dday <= 7) return "주의";
  return "여유";
}

/* ---------- 일정 말풍선 대사 20종 (일정_말풍선대사 시트) ---------- */
type Bubble = { tier: string; tpl: string };
export const BUBBLES: Bubble[] = [
  { tier: "여유", tpl: "오늘은 {name}이(가) 있어요!" },
  { tier: "여유", tpl: "{name}까지 D-{n}이에요. 아직 여유 있어요~" },
  { tier: "여유", tpl: "{name}, 아직 {n}일 남았지만 미리 준비하면 든든해요" },
  { tier: "주의", tpl: "{name}까지 이제 D-{n}! 슬슬 시동 걸어볼까요?" },
  { tier: "주의", tpl: "{n}일 뒤에 {name}이 있어요. 오늘부터 조금씩 해볼까요?" },
  { tier: "주의", tpl: "{name} 준비는 잘 되고 있나요? D-{n}이에요" },
  { tier: "긴급", tpl: "{name}까지 D-{n}! 이제 진짜 시작해야 해요" },
  { tier: "긴급", tpl: "{n}일 남았어요, {name}... 지금부터가 진짜 승부예요!" },
  { tier: "긴급", tpl: "헉, {name}이 코앞이에요! D-{n}" },
  { tier: "당일", tpl: "오늘이에요! {name} 화이팅! 그동안 준비한 거 다 보여줘요" },
  { tier: "당일", tpl: "드디어 {name} 당일이네요. 떨지 말고 다녀와요!" },
  { tier: "지남", tpl: "{name} 잘 끝났나요? 수고했어요!" },
  { tier: "일정없음", tpl: "오늘은 등록된 일정이 없어요. 그래도 공부 한 번 해볼까요?" },
  { tier: "일정없음", tpl: "특별한 일정은 없지만, 꾸준함이 제일 무서운 거 알죠?" },
];

// tier + 이벤트로 말풍선 하나 선택 (최근 노출 제외는 seed로 근사)
export function pickBubble(
  tier: string,
  name: string,
  n: number,
  seed = 0
): string {
  const pool = BUBBLES.filter((b) => b.tier === tier);
  if (pool.length === 0) return `${name}까지 D-${n}이에요`;
  const b = pool[Math.abs(seed) % pool.length];
  return b.tpl.replace(/\{name\}/g, name).replace(/\{n\}/g, String(n));
}

/* ---------- 유해앱 알람 티어 (Phase 2-1) ---------- */
export const HARMFUL = {
  mildAtSec: 10, // 데모: 10초 사용 시 마일드 알람 (실제 10분)
  strongAtSec: 20, // 데모: 20초 사용 시 강력 알람 (실제 20분)
  mild: "조금만 봐~ 🥺",
  strong: "이제 그만 봐! 😾",
  praise: "잘~~했어!! 다시 집중이야 🦦",
};

/* ---------- 업적 24종 (업적리스트 시트) ---------- */
export type Tier2 = "소형" | "중형" | "대형" | "히든" | "칭호";
export type AchCtx = {
  sessionCount: number;
  effectiveMinTotal: number; // 누적 순공(분)
  harmfulFreeSessions: number;
  streak: number;
  level: number;
  shellsEarnedTotal: number;
  lastStartHour: number; // 0~23
  lastSessionEffectiveSec: number;
  dailyGoalMet: boolean;
  weekendStreak: boolean;
};
export type Achievement = {
  num: number;
  id: string;
  name: string;
  cond: string;
  category: string;
  reward: number;
  tier: Tier2;
  test: (c: AchCtx) => boolean;
};

export const ACHIEVEMENTS: Achievement[] = [
  { num: 1, id: "first_step", name: "첫 발걸음", cond: "첫 공부 세션 완료", category: "시작", reward: 30, tier: "소형", test: (c) => c.sessionCount >= 1 },
  { num: 2, id: "passion", name: "열정 Otti", cond: "누적 10세션 완료", category: "횟수", reward: 50, tier: "소형", test: (c) => c.sessionCount >= 10 },
  { num: 3, id: "veteran", name: "백전노장", cond: "누적 50세션 완료", category: "횟수", reward: 100, tier: "중형", test: (c) => c.sessionCount >= 50 },
  { num: 4, id: "session_master", name: "세션 마스터", cond: "누적 100세션 완료", category: "횟수", reward: 200, tier: "대형", test: (c) => c.sessionCount >= 100 },
  { num: 5, id: "first_hour", name: "첫 시간의 기록", cond: "누적 순공시간 1시간", category: "누적시간", reward: 30, tier: "소형", test: (c) => c.effectiveMinTotal >= 60 },
  { num: 6, id: "time_traveler", name: "시간 여행자", cond: "누적 순공시간 10시간", category: "누적시간", reward: 100, tier: "중형", test: (c) => c.effectiveMinTotal >= 600 },
  { num: 7, id: "immersion", name: "몰입의 달인", cond: "누적 순공시간 50시간", category: "누적시간", reward: 200, tier: "대형", test: (c) => c.effectiveMinTotal >= 3000 },
  { num: 8, id: "focus_master", name: "집중력 마스터", cond: "누적 순공시간 100시간", category: "누적시간", reward: 300, tier: "대형", test: (c) => c.effectiveMinTotal >= 6000 },
  { num: 9, id: "legend_500", name: "500시간 전설", cond: "누적 순공시간 500시간", category: "누적시간", reward: 500, tier: "히든", test: (c) => c.effectiveMinTotal >= 30000 },
  { num: 10, id: "temptation", name: "유혹을 이겨낸 자", cond: "세션 1회 동안 유해앱 0회", category: "유해앱회피", reward: 30, tier: "소형", test: (c) => c.harmfulFreeSessions >= 1 },
  { num: 11, id: "iron_wall", name: "철벽 방어", cond: "유해앱 무사용 세션 10회", category: "유해앱회피", reward: 100, tier: "중형", test: (c) => c.harmfulFreeSessions >= 10 },
  { num: 12, id: "steel_will", name: "강철 의지", cond: "유해앱 무사용 세션 50회", category: "유해앱회피", reward: 300, tier: "대형", test: (c) => c.harmfulFreeSessions >= 50 },
  { num: 13, id: "promise_3", name: "3일의 약속", cond: "3일 연속 공부", category: "연속기록", reward: 50, tier: "소형", test: (c) => c.streak >= 3 },
  { num: 14, id: "week_challenge", name: "일주일 챌린지", cond: "7일 연속 스트릭", category: "연속기록", reward: 150, tier: "중형", test: (c) => c.streak >= 7 },
  { num: 15, id: "month_miracle", name: "한 달의 기적", cond: "30일 연속 스트릭", category: "연속기록", reward: 400, tier: "대형", test: (c) => c.streak >= 30 },
  { num: 16, id: "dawn_otter", name: "새벽형 Otti", cond: "06:00 이전 세션 시작", category: "특수", reward: 50, tier: "소형", test: (c) => c.lastStartHour < 6 },
  { num: 17, id: "owl_otter", name: "올빼미 Otti", cond: "00:00~04:00 세션 시작", category: "특수", reward: 50, tier: "소형", test: (c) => c.lastStartHour >= 0 && c.lastStartHour < 4 },
  { num: 18, id: "weekend_warrior", name: "주말 전사", cond: "토·일 이틀 연속 공부", category: "특수", reward: 50, tier: "소형", test: (c) => c.weekendStreak },
  { num: 19, id: "marathoner", name: "마라토너", cond: "단일 세션 3시간 이상", category: "특수", reward: 80, tier: "중형", test: (c) => c.lastSessionEffectiveSec >= 10800 },
  { num: 20, id: "perfect_day", name: "완벽한 하루", cond: "하루 목표 100% 달성", category: "목표달성", reward: 50, tier: "소형", test: (c) => c.dailyGoalMet },
  { num: 21, id: "dday_guardian", name: "D-day 수호자", cond: "등록 일정 D-3부터 매일 공부", category: "일정연계", reward: 100, tier: "중형", test: () => false },
  { num: 22, id: "level_10", name: "레벨 10 달성", cond: "Otti Lv.10 도달", category: "레벨", reward: 100, tier: "중형", test: (c) => c.level >= 10 },
  { num: 23, id: "level_20", name: "레벨 20 달성", cond: "Otti Lv.20 도달", category: "레벨", reward: 250, tier: "대형", test: (c) => c.level >= 20 },
  { num: 24, id: "shell_rich", name: "조개 부자", cond: "누적 조개 1,000개", category: "재화", reward: 0, tier: "칭호", test: (c) => c.shellsEarnedTotal >= 1000 },
];

export function checkAchievements(ctx: AchCtx, unlocked: string[]): Achievement[] {
  const have = new Set(unlocked);
  return ACHIEVEMENTS.filter((a) => !have.has(a.id) && a.test(ctx));
}

/* ---------- AI 코멘트 (v1 규칙 기반, Phase 2-2) ---------- */
export function aiComment(args: {
  todayEffectiveMin: number;
  goalMin: number;
  streak: number;
  harmfulMinToday: number;
}): string {
  const { todayEffectiveMin, goalMin, streak, harmfulMinToday } = args;
  if (todayEffectiveMin === 0)
    return "오늘은 아직 공부 기록이 없어요. 딱 20분만 같이 시작해볼까요? 🦦";
  if (todayEffectiveMin >= goalMin)
    return `오늘 목표 ${goalMin}분을 넘겼어요! 완벽한 하루예요 🎉 이 페이스면 금방 레벨업!`;
  if (harmfulMinToday > todayEffectiveMin * 0.3)
    return "유해앱 사용이 조금 많았어요. 다음 세션엔 폰을 뒤집어두는 건 어때요? 🙈";
  if (streak >= 3)
    return `${streak}일 연속 공부 중이에요! 꾸준함이 최고의 무기예요 💪`;
  return `좋은 시작이에요! 목표까지 ${goalMin - todayEffectiveMin}분 남았어요.`;
}

/* ---------- 수달 커스텀 아이템 (Phase 2-4 수달 커스텀 설정) ---------- */
export type ItemSlot = "head" | "face" | "neck" | "sideL" | "sideR";
export type ItemCategory = "안경" | "소품" | "모자" | "목걸이";
export type OtterItem = {
  id: string;
  name: string;
  emoji: string;
  price: number; // 조개
  slot: ItemSlot;
  category: ItemCategory;
  grade: "common" | "rare" | "epic";
};

export const OTTER_ITEMS: OtterItem[] = [
  { id: "cocoa", name: "따뜻한 코코아", emoji: "☕", price: 50, slot: "sideR", category: "소품", grade: "common" },
  { id: "glasses", name: "공부 안경", emoji: "👓", price: 60, slot: "face", category: "안경", grade: "common" },
  { id: "scarf", name: "포근 목도리", emoji: "🧣", price: 70, slot: "neck", category: "목걸이", grade: "common" },
  { id: "headphone", name: "집중 헤드폰", emoji: "🎧", price: 80, slot: "head", category: "모자", grade: "common" },
  { id: "fish", name: "생선", emoji: "🐟", price: 140, slot: "sideR", category: "소품", grade: "rare" },
  { id: "monocle", name: "돋보기 안경", emoji: "🧐", price: 150, slot: "face", category: "안경", grade: "rare" },
  { id: "cap", name: "학사모", emoji: "🎓", price: 180, slot: "head", category: "모자", grade: "rare" },
  { id: "medal", name: "메달", emoji: "🏅", price: 200, slot: "neck", category: "목걸이", grade: "rare" },
  { id: "books", name: "책", emoji: "📖", price: 260, slot: "sideL", category: "소품", grade: "epic" },
  { id: "sunglasses", name: "선글라스", emoji: "🕶️", price: 280, slot: "face", category: "안경", grade: "epic" },
  { id: "emerald-necklace", name: "에메랄드 목걸이", emoji: "💚", price: 420, slot: "neck", category: "목걸이", grade: "epic" },
  { id: "crown", name: "왕관", emoji: "👑", price: 500, slot: "head", category: "모자", grade: "epic" },
];

// 아바타(250px 원) 위 오버레이 위치
export const SLOT_POS: Record<ItemSlot, { top: string; left: string; size: number }> = {
  head: { top: "29%", left: "50%", size: 46 },
  face: { top: "46%", left: "52%", size: 32 },
  neck: { top: "64%", left: "50%", size: 34 },
  sideL: { top: "64%", left: "18%", size: 34 },
  sideR: { top: "60%", left: "82%", size: 30 },
};

export function itemById(id: string): OtterItem | undefined {
  return OTTER_ITEMS.find((i) => i.id === id);
}
