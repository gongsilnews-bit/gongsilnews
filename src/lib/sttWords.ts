// 받아쓰기 낱말장 — 대표님들이 고친 "잘못 들린 말 → 고친 말"을 모으고, 모두에게 쓸 규칙을 고른다 (회의 2026-10-18 3-18)
//  모두에게: 서로 다른 회원 SHARE_MIN 명 이상이 올렸거나 최고관리자가 승인한 것 (거절한 것은 빼고)
//  표(supabase/migrations/20261018_stt_word_fixes.sql)가 아직 없으면 빈 목록으로 동작한다
import { createClient } from "@supabase/supabase-js";

export const SHARE_MIN = 3;

const admin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

export type SttPair = { wrong: string; right: string; context?: string };
export type SttRow = { wrong: string; right: string; members: number; lastAt: string; context: string; status: "approved" | "rejected" | "" };

const clean = (s: unknown, max: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** 모은 것 전체 (낱말 쌍마다 올린 회원 수) — 최고관리자 화면·공용 규칙 계산용 */
export async function sttRows(): Promise<SttRow[]> {
  const db = admin();
  const [{ data: fixes, error }, { data: rules }] = await Promise.all([
    db.from("stt_word_fixes").select("wrong, fixed, member_id, context, created_at").order("created_at", { ascending: false }).limit(20000),
    db.from("stt_word_rules").select("wrong, fixed, status"),
  ]);
  if (error) return []; // 표가 아직 없음
  const st = new Map((rules || []).map((r) => [`${r.wrong}\n${r.fixed}`, r.status as "approved" | "rejected"]));
  const map = new Map<string, { wrong: string; right: string; m: Set<string>; lastAt: string; context: string }>();
  for (const f of fixes || []) {
    const k = `${f.wrong}\n${f.fixed}`;
    const g = map.get(k) || { wrong: f.wrong, right: f.fixed, m: new Set<string>(), lastAt: f.created_at, context: f.context || "" };
    g.m.add(f.member_id);
    map.set(k, g);
  }
  // 최고관리자가 직접 넣은(승인) 것은 올린 회원이 없어도 보인다
  for (const r of rules || []) {
    const k = `${r.wrong}\n${r.fixed}`;
    if (!map.has(k)) map.set(k, { wrong: r.wrong, right: r.fixed, m: new Set(), lastAt: "", context: "" });
  }
  return [...map.entries()]
    .map(([k, g]) => ({ wrong: g.wrong, right: g.right, members: g.m.size, lastAt: g.lastAt, context: g.context, status: (st.get(k) || "") as SttRow["status"] }))
    .sort((a, b) => b.members - a.members || (b.lastAt > a.lastAt ? 1 : -1));
}

/** 모든 대표님 앱이 받아 가는 공용 규칙 */
export async function sharedRules(): Promise<{ wrong: string; right: string }[]> {
  return (await sttRows()).filter((r) => r.status === "approved" || (r.status !== "rejected" && r.members >= SHARE_MIN)).map(({ wrong, right }) => ({ wrong, right }));
}

/** 대표님이 올린 고침 (회원마다 같은 쌍은 한 번) */
export async function addFixes(memberId: string, pairs: SttPair[]) {
  const rows = (pairs || [])
    .map((p) => ({ wrong: clean(p.wrong, 40), fixed: clean(p.right, 40), context: clean(p.context, 80) || null, member_id: memberId }))
    .filter((p) => p.wrong.length >= 2 && p.fixed && p.wrong !== p.fixed)
    .slice(0, 50);
  if (!rows.length) return 0;
  const { error } = await admin().from("stt_word_fixes").upsert(rows, { onConflict: "member_id,wrong,fixed", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
  return rows.length;
}

/** 최고관리자 — 승인·거절·되돌리기(null). 직접 넣기도 승인으로 */
export async function decideRule(wrong: string, right: string, status: "approved" | "rejected" | null, by: string) {
  const w = clean(wrong, 40);
  const r = clean(right, 40);
  if (w.length < 2 || !r || w === r) throw new Error("잘못 들린 말(2글자 이상)과 고칠 말을 넣어 주세요.");
  const db = admin();
  if (status === null) {
    const { error } = await db.from("stt_word_rules").delete().eq("wrong", w).eq("fixed", r);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await db.from("stt_word_rules").upsert({ wrong: w, fixed: r, status, decided_by: by, decided_at: new Date().toISOString() }, { onConflict: "wrong,fixed" });
  if (error) throw new Error(error.message);
}
