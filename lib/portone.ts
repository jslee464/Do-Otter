/* =====================================================================
 *  PortOne(아임포트) V2 — 서버 검증 (API 라우트에서만 import)
 *  ⚠️ PORTONE_V2_API_SECRET 은 서버 전용 비밀.
 *     STORE_ID / CHANNEL_KEY 는 NEXT_PUBLIC (클라이언트 결제창에 필요, 공개 가능).
 *  프로토타입: 정기결제(빌링키) 대신 '30일 이용권' 단건결제로 구현.
 * ===================================================================== */
const V2_SECRET = process.env.PORTONE_V2_API_SECRET;
export const PORTONE_STORE_ID = process.env.NEXT_PUBLIC_PORTONE_STORE_ID || "";
export const PORTONE_CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY || "";
export const PORTONE_CONFIGURED = Boolean(
  PORTONE_STORE_ID && PORTONE_CHANNEL_KEY && V2_SECRET
);

export type Plan = "pro" | "chatpro";
export const PLANS: Record<Plan, { amount: number; orderName: string; days: number }> = {
  chatpro: { amount: 2900, orderName: "Pro 수달 30일 이용권", days: 30 },
  pro: { amount: 4900, orderName: "Pro 수달 30일 이용권", days: 30 },
};

// PortOne 서버 API 로 결제 단건 조회
export async function getPayment(paymentId: string): Promise<any | null> {
  if (!V2_SECRET) return null;
  const res = await fetch(
    `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
    { headers: { Authorization: `PortOne ${V2_SECRET}` } }
  );
  if (!res.ok) return null;
  return res.json();
}
