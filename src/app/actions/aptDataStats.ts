"use server";

/**
 * AI 비서실 — 실거래·단지 정보 수집 현황 (2026-11-09 사장님: "온비드 동기화 에이전트와 같이 하단에 볼 수 있게")
 *  apt_complexes 의 실제 값만 센다. 못 읽은 칸은 null → 화면에서 "–"
 */
import { createClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/utils/supabase/server";
import { isAdminRole } from "@/utils/permissionCheck";

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

async function requireAdmin() {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return false;
  const { data: member } = await db().from("members").select("role").eq("id", user.id).maybeSingle();
  return isAdminRole(member?.role);
}

export type AptKindStat = { kind: "apt" | "offi" | "villa"; total: number | null; households: number | null; waiting: number | null };
export type AptDayStat = { day: string; updated: number | null; newTrades: number | null; infoTried: number | null };
export type AptDataStats = { kinds: AptKindStat[]; days: AptDayStat[]; latestTrade: string | null; lastUpdated: string | null };

export async function getAptDataStats(): Promise<{ success: true; data: AptDataStats } | { success: false; error: string }> {
  if (!(await requireAdmin())) return { success: false, error: "최고관리자만 볼 수 있어요." };
  const s = db();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const count = async (f: (q: any) => any): Promise<number | null> => {
    const { count: c, error } = await f(s.from("apt_complexes").select("id", { count: "exact", head: true }));
    return error ? null : c ?? 0;
  };
  const kinds = await Promise.all((["apt", "offi", "villa"] as const).map(async (kind) => {
    const [total, households, waiting] = await Promise.all([
      count((q) => q.eq("kind", kind)),
      count((q) => q.eq("kind", kind).not("info->>households", "is", null)),
      count((q) => q.eq("kind", kind).not("bcode", "is", null).is("info_tried_at", null)),
    ]);
    return { kind, total, households, waiting };
  }));
  // 최근 7일 (한국 날짜)
  const KST = 9 * 3600_000;
  const today = new Date(Date.now() + KST).toISOString().slice(0, 10);
  const days = await Promise.all(Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.parse(`${today}T00:00:00Z`) - i * 86400_000).toISOString().slice(0, 10);
    const a = new Date(Date.parse(`${d}T00:00:00Z`) - KST).toISOString();
    const b = new Date(Date.parse(a) + 86400_000).toISOString();
    return Promise.all([
      count((q) => q.gte("updated_at", a).lt("updated_at", b)),
      count((q) => q.gte("new_at", a).lt("new_at", b)),
      count((q) => q.gte("info_tried_at", a).lt("info_tried_at", b)),
    ]).then(([updated, newTrades, infoTried]) => ({ day: d, updated, newTrades, infoTried }));
  }));
  const [{ data: lt }, { data: lu }] = await Promise.all([
    s.from("apt_complexes").select("rep_date").not("rep_date", "is", null).order("rep_date", { ascending: false }).limit(1),
    s.from("apt_complexes").select("updated_at").order("updated_at", { ascending: false }).limit(1),
  ]);
  return { success: true, data: { kinds, days, latestTrade: lt?.[0]?.rep_date ?? null, lastUpdated: lu?.[0]?.updated_at ?? null } };
}
