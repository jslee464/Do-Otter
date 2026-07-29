/* =====================================================================
 *  서버 전용 Supabase 헬퍼 (API 라우트에서만 import)
 *  - supabaseAdmin(): service_role 키로 RLS 우회 (웹훅/OAuth 콜백용)
 *  - getUserId(req): 클라이언트가 보낸 Supabase JWT 검증 → user id
 *  ⚠️ SUPABASE_SERVICE_ROLE_KEY 는 서버 전용 비밀키. 절대 클라이언트 노출 금지.
 * ===================================================================== */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function supabaseAdmin(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export async function getUserId(req: Request): Promise<string | null> {
  const authz = req.headers.get("authorization") || "";
  const token = authz.replace(/^Bearer\s+/i, "");
  if (!token || !url || !anonKey) return null;
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data } = await client.auth.getUser(token);
  return data.user?.id ?? null;
}

// 요청에서 앱의 기준 URL 도출 (redirect_uri 일관성용)
export function baseUrl(req: Request): string {
  const host =
    req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
