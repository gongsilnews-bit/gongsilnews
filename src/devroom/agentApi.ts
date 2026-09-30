import { timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";

/**
 * 사장님 PC의 Runner만 부르는 API(/api/devroom/tasks...)의 공통 부분.
 * 로그인 세션이 아니라 DEVROOM_AGENT_TOKEN 으로 확인한다.
 */

export function agentDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) },
  });
}

/** Authorization: Bearer <DEVROOM_AGENT_TOKEN> 이 맞으면 true. 토큰을 설정하지 않았으면 항상 거부한다. */
export function isAgentRequest(request: Request): boolean {
  const expected = process.env.DEVROOM_AGENT_TOKEN || "";
  if (expected.length < 32) return false;
  const given = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
