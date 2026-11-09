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
/** 하루 회차 기록 합계 — 크론이 agent_chats(apt_sync_log)에 남긴 것 (2026-11-09부터) */
export type AptRoundDay = { day: string; total: number; ok: number; failed: { name: string; why: string }[]; checked: number; changed: number; fresh: number; rounds: number };
export type AptDataStats = { kinds: AptKindStat[]; days: AptDayStat[]; rounds: AptRoundDay[]; latestTrade: string | null; lastUpdated: string | null };

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
  // 회차 기록 — 하루에 두 바퀴. 한 번이라도 받은 묶음은 완료, 끝내 못 받은 묶음만 실패로
  const { LAWD_NAMES } = await import("@/utils/aptMap");
  const KIND_KO: Record<string, string> = { apt: "아파트", offi: "오피스텔", villa: "빌라" };
  const { data: logs } = await s.from("agent_chats").select("content, created_at").eq("channel_id", "apt_sync_log")
    .gte("created_at", new Date(Date.parse(`${today}T00:00:00Z`) - KST - 6 * 86400_000).toISOString()).order("created_at", { ascending: true }).limit(2000);
  type J = { l: string; k: string; c: number | null; w: number | null; f: number | null; e?: string; s?: number };
  const byDay = new Map<string, { total: number; rounds: number; jobs: Map<string, { ok: boolean; c: number; why: string }>; changed: number; fresh: number }>();
  for (const row of logs || []) {
    let v: { total?: number; manual?: boolean; jobs?: J[] };
    try { v = JSON.parse(row.content); } catch { continue; }
    if (v.manual) continue;
    const day = new Date(Date.parse(row.created_at) + KST).toISOString().slice(0, 10);
    const D = byDay.get(day) || { total: 0, rounds: 0, jobs: new Map(), changed: 0, fresh: 0 };
    D.total = Math.max(D.total, Number(v.total) || 0);
    D.rounds++;
    for (const j of v.jobs || []) {
      const key = `${j.l}:${j.k}`;
      const prev = D.jobs.get(key);
      const ok = !j.e && !j.s && j.c != null;
      if (ok) { D.changed += j.w || 0; D.fresh += j.f || 0; }
      if (!prev || (ok && !prev.ok) || (ok && prev.ok && (j.c || 0) > prev.c)) D.jobs.set(key, { ok, c: ok ? j.c || 0 : 0, why: ok ? "" : j.e || "시간 부족" });
      else if (!ok && !prev.ok) prev.why = j.e || prev.why;
    }
    byDay.set(day, D);
  }
  const rounds: AptRoundDay[] = [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([day, D]) => {
    const list = [...D.jobs.entries()];
    return {
      day, total: D.total, rounds: D.rounds,
      ok: list.filter(([, x]) => x.ok).length,
      failed: list.filter(([, x]) => !x.ok).map(([key, x]) => { const [l, k] = key.split(":"); return { name: `${LAWD_NAMES[l] || l} ${KIND_KO[k] || k}`, why: x.why }; }),
      checked: list.reduce((t, [, x]) => t + x.c, 0), changed: D.changed, fresh: D.fresh,
    };
  });
  return { success: true, data: { kinds, days, rounds, latestTrade: lt?.[0]?.rep_date ?? null, lastUpdated: lu?.[0]?.updated_at ?? null } };
}
