"use server";

/**
 * 최고관리자 → 고객관리 (2026-11-25, docs/2026-11-25_crm_contacts_plan.md)
 *  - 사람 카드(crm_contacts) · 꼬리표 · 있었던 일 · 캠페인 · 사람마다 다른 짧은 링크
 *  - 문자는 sms_status = '보냄가능' 인 사람에게만 나간다 (서버가 다시 확인)
 *  - 보낸 뒤: 연속 무반응 +1 → 3번째면 90일 쉬는중 (crm_mark_sent) · 링크 누름·답장·전화면 0 (crm_mark_reaction)
 *  - 공실뉴스 회원과 자동 연결: 화면을 열 때마다 가입·등급·만기를 맞춘다 (syncMembers)
 *  전화번호 전체는 카드를 열 때만 내려 준다. 목록은 010-****-1234
 */

import { createClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/utils/supabase/server";
import { isAdminRole } from "@/utils/permissionCheck";
import { memberTier, TIER_NAME } from "@/utils/tier";
import { sendPpurioSmsBulk, ppurioMessageType } from "@/utils/ppurio";

function adminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
type Db = ReturnType<typeof adminDb>;

async function requireAdmin(): Promise<string | null> {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return null;
  const { data: me } = await adminDb().from("members").select("role").eq("id", user.id).maybeSingle();
  return isAdminRole(me?.role) ? user.id : null;
}

export type CrmStatus = "보냄가능" | "확인전" | "보내지않음" | "수신거부" | "쉬는중" | "번호오류";
// "use server" 파일은 함수만 내보낼 수 있어 화면용 목록은 CrmSection 에 따로 둔다
const CRM_STATUSES: CrmStatus[] = ["보냄가능", "쉬는중", "확인전", "보내지않음", "수신거부", "번호오류"];

const isMissing = (msg?: string) => !!msg && /crm_|relation|schema cache|does not exist/i.test(msg);
const normPhone = (p?: string | null) => {
  let d = String(p || "").replace(/\D/g, "");
  if (d.startsWith("82")) d = "0" + d.slice(2);
  return /^01[016789]\d{7,8}$/.test(d) ? d : null;
};
/** 그룹(꼬리표) 이름 — "/" 로 폴더를 나눈다 (예: 내그룹/VIP · 뿌리오/강남구/개포1동) */
function cleanTag(s: string): string {
  return s.split("/").map((x) => x.trim().replace(/\s+/g, "_")).filter(Boolean).join("/").slice(0, 60);
}
const mask = (p: string) => (p.length === 11 ? `${p.slice(0, 3)}-****-${p.slice(7)}` : `${p.slice(0, 3)}-***-${p.slice(-4)}`);
const fmtPhone = (p: string) => (p.length === 11 ? `${p.slice(0, 3)}-${p.slice(3, 7)}-${p.slice(7)}` : `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}`);

/* ── 공실뉴스 회원과 맞추기 ── */
async function syncMembers(db: Db): Promise<void> {
  const { data: members } = await db.from("members").select("id, phone, role, plan_type, plan_end_date, studio_end_date, marketing_sms, is_deleted");
  const list = (members || [])
    .filter((m) => !m.is_deleted)
    .map((m) => ({ ...m, p: normPhone(m.phone), tier: memberTier(m) }))
    .filter((m) => m.p && m.tier !== "admin");
  if (!list.length) return;
  const phones = list.map((m) => m.p!) as string[];
  const found: Record<string, { id: number; member_id: string | null; member_grade: string | null; paid_until: string | null; sms_status: string }> = {};
  for (let i = 0; i < phones.length; i += 500) {
    const { data } = await db.from("crm_contacts").select("id, phone, member_id, member_grade, paid_until, sms_status").in("phone", phones.slice(i, i + 500));
    for (const c of data || []) found[c.phone] = c;
  }
  for (const m of list) {
    const grade = TIER_NAME[m.tier];
    const paid = m.tier === "pro" && m.studio_end_date ? String(m.studio_end_date).slice(0, 10) : null;
    const c = found[m.p!];
    const consentUp = m.marketing_sms === true;
    if (!c) {
      const { data: ins } = await db.from("crm_contacts")
        .insert({ phone: m.p, member_id: m.id, member_grade: grade, paid_until: paid, sms_status: "보냄가능" }) // 2026-11-25 사장님: 문자는 다 보냄가능
        .select("id").single();
      if (ins) {
        await db.from("crm_contact_tags").upsert({ contact_id: ins.id, tag: "공실뉴스가입" }, { ignoreDuplicates: true });
        await db.from("crm_contact_events").insert({ contact_id: ins.id, kind: "가입", detail: grade });
      }
      continue;
    }
    const patch: Record<string, unknown> = {};
    if (c.member_id !== m.id) patch.member_id = m.id;
    if (c.member_grade !== grade) patch.member_grade = grade;
    if ((c.paid_until || null) !== paid) patch.paid_until = paid;
    if (consentUp && (c.sms_status === "보내지않음" || c.sms_status === "확인전")) patch.sms_status = "보냄가능";
    if (!Object.keys(patch).length) continue;
    await db.from("crm_contacts").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", c.id);
    if (c.member_id !== m.id) {
      await db.from("crm_contact_tags").upsert({ contact_id: c.id, tag: "공실뉴스가입" }, { ignoreDuplicates: true });
      await db.from("crm_contact_events").insert({ contact_id: c.id, kind: "가입", detail: grade });
    } else if (c.member_grade !== grade) {
      await db.from("crm_contact_events").insert({ contact_id: c.id, kind: m.tier === "pro" ? "결제" : "등급바뀜", detail: `${c.member_grade || "-"} → ${grade}` });
    }
  }
}

/* ── 맨 위 숫자 ── */
export type CrmOverview = {
  success: boolean; missingTable?: boolean; error?: string;
  total: number; status: Record<string, number>; tags: { tag: string; n: number }[]; sido: { sido: string; n: number }[];
  grades: Record<string, number>;
  /** 왼쪽 [지역] 폴더 (20261125_crm_2.sql 뒤에) */
  regions: { sido: string; sigungu: string; dong: string; n: number }[];
  /** 왼쪽 [공실뉴스 회원] 폴더 — 가입 안 함 포함 */
  members: { grade: string; n: number }[];
};
export async function adminCrmOverview(): Promise<CrmOverview> {
  const empty = { total: 0, status: {}, tags: [], sido: [], grades: {}, regions: [], members: [] };
  if (!(await requireAdmin())) return { success: false, error: "관리자만 쓸 수 있어요.", ...empty };
  const db = adminDb();
  // head 요청은 표가 없어도 오류를 돌려주지 않아 한 줄을 실제로 읽어 본다
  const probe = await db.from("crm_contacts").select("id").limit(1);
  if (probe.error) return { success: false, missingTable: isMissing(probe.error.message), error: probe.error.message, ...empty };
  await db.rpc("crm_wake_rested");
  await syncMembers(db);
  const [st, tg, sd, gr, rg, mc] = await Promise.all([
    db.from("crm_status_counts").select("sms_status, n"),
    db.from("crm_tag_counts").select("tag, n").order("n", { ascending: false }),
    db.from("crm_sido_counts").select("sido, n").order("n", { ascending: false }),
    db.from("crm_contacts").select("member_grade").not("member_grade", "is", null),
    // 지역 줄이 수천 개라 1,000줄씩 끝까지 읽는다 (한 번에 1,000줄까지만 와서 숫자가 작게 보이던 것)
    (async () => {
      const out: unknown[] = [];
      for (let from = 0; from < 50000; from += 1000) {
        const { data, error } = await db.from("crm_region_counts").select("sido, sigungu, dong, n").order("sido").order("sigungu").order("dong").range(from, from + 999);
        if (error) return { data: out, error };
        out.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      return { data: out, error: null };
    })(),
    db.from("crm_member_counts").select("grade, n"),
  ]);
  const status: Record<string, number> = {};
  let total = 0;
  for (const r of st.data || []) { status[r.sms_status] = r.n; total += r.n; }
  const grades: Record<string, number> = {};
  for (const r of gr.data || []) grades[r.member_grade as string] = (grades[r.member_grade as string] || 0) + 1;
  return {
    success: true, total, status, grades,
    tags: (tg.data || []) as { tag: string; n: number }[],
    sido: (sd.data || []) as { sido: string; n: number }[],
    regions: (rg.data || []) as { sido: string; sigungu: string; dong: string; n: number }[],
    members: (mc.data || []) as { grade: string; n: number }[],
  };
}

/* ── 고르기 조건 (목록·보내기 같이 씀) ── */
export type CrmFilter = {
  tags?: string[];
  sido?: string;
  status?: CrmStatus | "";
  q?: string;
  member?: "" | "member" | "nonmember" | "pro";
  /** 공실뉴스 등급 하나 (왼쪽 [공실뉴스 회원] 폴더) — "가입 안 함" 이면 가입 안 한 사람 */
  grade?: string;
  /** 최근 N일 안에 보낸 사람 빼기 */
  excludeSentDays?: number;
  /** 시군구 (sido 와 같이) */
  sigungu?: string;
  /** 동 (sigungu 와 같이) */
  dong?: string;
  /** 고른 사람만 (선택 주소 문자발송) */
  ids?: number[];
  /** 문자 보낼 사람만 — 수신거부·번호오류만 뺀다 (2026-11-25 사장님: 수신거부 빼고 다 보냄) */
  sendable?: boolean;
  /** 검색 칸: 전체 · 상호 · 대표자 · 휴대폰 · 주소 */
  field?: "" | "office" | "name" | "phone" | "address";
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilter(query: any, f: CrmFilter) {
  if (f.tags?.length) query = query.in("crm_contact_tags.tag", f.tags);
  if (f.sido) query = f.sido === "(모름)" ? query.is("sido", null) : query.eq("sido", f.sido);
  if (f.status) query = query.eq("sms_status", f.status);
  if (f.sendable) query = query.not("sms_status", "in", "(수신거부,번호오류)");
  if (f.member === "member") query = query.not("member_id", "is", null);
  if (f.member === "nonmember") query = query.is("member_id", null);
  if (f.member === "pro") query = query.eq("member_grade", TIER_NAME.pro);
  if (f.grade) query = f.grade === "가입 안 함" ? query.is("member_grade", null) : query.eq("member_grade", f.grade);
  if (f.sigungu) query = f.sigungu === "(모름)" ? query.is("sigungu", null) : query.eq("sigungu", f.sigungu);
  if (f.dong) query = f.dong === "(모름)" ? query.is("dong", null) : query.eq("dong", f.dong);
  if (f.ids?.length) query = query.in("id", f.ids.slice(0, 5000));
  if (f.excludeSentDays && f.excludeSentDays > 0) {
    const d = new Date(Date.now() - f.excludeSentDays * 86400_000).toISOString();
    query = query.or(`last_sent_at.is.null,last_sent_at.lt.${d}`);
  }
  const q = (f.q || "").trim();
  if (q) {
    const digits = q.replace(/\D/g, "");
    const s = q.replace(/[%,()]/g, "");
    if (f.field === "phone" || (!f.field && digits.length >= 4 && digits.length === q.replace(/[\s-]/g, "").length)) query = query.like("phone", `%${digits}%`);
    else if (f.field === "office") query = query.ilike("office_name", `%${s}%`);
    else if (f.field === "name") query = query.ilike("name", `%${s}%`);
    else if (f.field === "address") query = query.ilike("address", `%${s}%`);
    else query = query.or(`name.ilike.%${s}%,office_name.ilike.%${s}%,address.ilike.%${s}%,memo.ilike.%${s}%`);
  }
  return query;
}
const COLS = "id, phone, name, office_name, sido, sigungu, sms_status, member_grade, last_sent_at, last_reaction_at, no_reply_streak, memo";

export type CrmRow = {
  id: number; phone: string; phoneMasked: string; name: string | null; office_name: string | null; sido: string | null; sigungu: string | null;
  sms_status: CrmStatus; member_grade: string | null; last_sent_at: string | null; last_reaction_at: string | null; no_reply_streak: number;
  memo: string | null; tags: string[];
};

/* ── 목록 ── */
export async function adminCrmList(f: CrmFilter, page = 0, size = 50, sort: "recent" | "old" | "office" = "recent"): Promise<{ success: boolean; rows: CrmRow[]; total: number; error?: string }> {
  if (!(await requireAdmin())) return { success: false, rows: [], total: 0, error: "관리자만 쓸 수 있어요." };
  const db = adminDb();
  let query = db.from("crm_contacts").select(f.tags?.length ? `${COLS}, crm_contact_tags!inner(tag)` : COLS, { count: "exact" });
  query = applyFilter(query, f);
  query = sort === "office" ? query.order("office_name", { ascending: true, nullsFirst: false }).order("id") : query.order("id", { ascending: sort === "old" });
  query = query.range(page * size, page * size + size - 1);
  const { data, count, error } = await query;
  if (error) return { success: false, rows: [], total: 0, error: error.message };
  const list = (data || []) as unknown as (Omit<CrmRow, "phoneMasked" | "tags">)[];
  const ids = list.map((r) => r.id);
  const tagMap: Record<number, string[]> = {};
  if (ids.length) {
    const { data: tg } = await db.from("crm_contact_tags").select("contact_id, tag").in("contact_id", ids);
    for (const t of tg || []) (tagMap[t.contact_id] ||= []).push(t.tag);
  }
  const rows: CrmRow[] = list.map((r) => ({
    id: r.id, phone: fmtPhone(r.phone), phoneMasked: mask(r.phone), name: r.name, office_name: r.office_name, sido: r.sido, sigungu: r.sigungu,
    sms_status: r.sms_status, member_grade: r.member_grade, last_sent_at: r.last_sent_at, last_reaction_at: r.last_reaction_at,
    no_reply_streak: r.no_reply_streak, memo: r.memo, tags: (tagMap[r.id] || []).sort(),
  }));
  return { success: true, rows, total: count || 0 };
}

/* ── 여러 명 한꺼번에 (뿌리오 주소록처럼) ── */
export async function adminCrmBulk(ids: number[], action: "addTag" | "removeTag" | "status" | "delete", value?: string): Promise<{ success: boolean; done: number; error?: string }> {
  const adminId = await requireAdmin();
  if (!adminId) return { success: false, done: 0, error: "관리자만 쓸 수 있어요." };
  const list = Array.from(new Set(ids)).filter((n) => Number.isFinite(n));
  if (!list.length) return { success: false, done: 0, error: "주소를 골라 주세요." };
  const db = adminDb();
  for (let i = 0; i < list.length; i += 500) {
    const part = list.slice(i, i + 500);
    let error: { message: string } | null = null;
    if (action === "addTag" || action === "removeTag") {
      const t = cleanTag(value || "");
      if (!t) return { success: false, done: 0, error: "그룹 이름을 써 주세요." };
      ({ error } = action === "addTag"
        ? await db.from("crm_contact_tags").upsert(part.map((contact_id) => ({ contact_id, tag: t })), { ignoreDuplicates: true })
        : await db.from("crm_contact_tags").delete().in("contact_id", part).eq("tag", t));
    } else if (action === "status") {
      const s = value as CrmStatus;
      if (!CRM_STATUSES.includes(s)) return { success: false, done: 0, error: "문자 상태를 골라 주세요." };
      const upd: Record<string, unknown> = { sms_status: s, updated_at: new Date().toISOString() };
      if (s === "보냄가능") { upd.no_reply_streak = 0; upd.rest_until = null; }
      if (s === "쉬는중") upd.rest_until = new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10);
      ({ error } = await db.from("crm_contacts").update(upd).in("id", part));
      if (!error) await db.from("crm_contact_events").insert(part.map((contact_id) => ({ contact_id, kind: s === "수신거부" ? "수신거부" : "상태바뀜", detail: `→ ${s} (한꺼번에)`, created_by: adminId })));
    } else if (action === "delete") {
      ({ error } = await db.from("crm_contacts").delete().in("id", part));
    }
    if (error) return { success: false, done: i, error: error.message };
  }
  return { success: true, done: list.length };
}

/* ── 그룹(꼬리표) 이름 바꾸기 · 지우기 — 사람은 그대로, 그룹만 ── */
export async function adminCrmRenameTag(oldTag: string, newTag: string): Promise<{ success: boolean; error?: string }> {
  if (!(await requireAdmin())) return { success: false, error: "관리자만 쓸 수 있어요." };
  const t = cleanTag(newTag);
  if (!t) return { success: false, error: "새 이름을 써 주세요." };
  const { error } = await adminDb().rpc("crm_rename_tag", { p_old: oldTag, p_new: t });
  return error ? { success: false, error: /crm_rename_tag/.test(error.message) ? "20261125_crm_2.sql 을 먼저 실행해 주세요." : error.message } : { success: true };
}
export async function adminCrmDeleteTag(tag: string): Promise<{ success: boolean; error?: string }> {
  if (!(await requireAdmin())) return { success: false, error: "관리자만 쓸 수 있어요." };
  const db = adminDb();
  // 폴더(이름/…)를 지우면 그 아래 그룹도 같이
  const a = await db.from("crm_contact_tags").delete().eq("tag", tag);
  if (a.error) return { success: false, error: a.error.message };
  const b = await db.from("crm_contact_tags").delete().like("tag", `${tag.replace(/[%_]/g, (m) => `\\${m}`)}/%`);
  return b.error ? { success: false, error: b.error.message } : { success: true };
}

/* ── 엑셀(CSV)로 내려받기 — 지금 고른 조건 그대로 ── */
export async function adminCrmExport(f: CrmFilter): Promise<{ success: boolean; csv?: string; count?: number; error?: string }> {
  const adminId = await requireAdmin();
  if (!adminId) return { success: false, error: "관리자만 쓸 수 있어요." };
  const db = adminDb();
  const cols = "id, phone, office_name, name, sido, sigungu, address, fax, tel, email, sms_status, member_grade, paid_until, no_reply_streak, last_sent_at, last_reaction_at, memo";
  type R = Record<string, string | number | null>;
  const rows: R[] = [];
  for (let from = 0; ; from += 1000) {
    let q = db.from("crm_contacts").select(f.tags?.length ? `${cols}, crm_contact_tags!inner(tag)` : cols);
    q = applyFilter(q, f).order("id").range(from, from + 999);
    const { data, error } = await q;
    if (error) return { success: false, error: error.message };
    rows.push(...((data || []) as unknown as R[]));
    if (!data || data.length < 1000) break;
  }
  const tagMap: Record<number, string[]> = {};
  const ids = rows.map((r) => r.id as number);
  for (let i = 0; i < ids.length; i += 1000) {
    const { data } = await db.from("crm_contact_tags").select("contact_id, tag").in("contact_id", ids.slice(i, i + 1000));
    for (const t of data || []) (tagMap[t.contact_id] ||= []).push(t.tag);
  }
  const esc = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const head = ["번호", "상호", "대표자", "휴대폰", "일반전화", "팩스", "이메일", "시도", "시군구", "주소", "그룹", "문자 상태", "공실뉴스 등급", "유료 만기", "연속 무반응", "마지막 보냄", "마지막 반응", "메모"];
  const lines = [head.join(",")];
  for (const r of rows) {
    lines.push([r.id, r.office_name, r.name, fmtPhone(String(r.phone)), r.tel, r.fax, r.email, r.sido, r.sigungu, r.address,
      (tagMap[r.id as number] || []).sort().join(" | "), r.sms_status, r.member_grade, String(r.paid_until || "").slice(0, 10), r.no_reply_streak,
      String(r.last_sent_at || "").slice(0, 10), String(r.last_reaction_at || "").slice(0, 10), r.memo].map(esc).join(","));
  }
  return { success: true, csv: "﻿" + lines.join("\r\n"), count: rows.length };
}

/* ── 카드 하나 ── */
export type CrmEvent = { id: number; kind: string; detail: string | null; created_at: string; campaign_id: number | null; campaign_name?: string | null };
export type CrmCard = {
  id: number; phone: string; name: string | null; office_name: string | null; sido: string | null; sigungu: string | null; address: string | null;
  sms_status: CrmStatus; rest_until: string | null; no_reply_streak: number; member_grade: string | null; paid_until: string | null;
  last_sent_at: string | null; last_reaction_at: string | null; memo: string | null; created_at: string; tags: string[]; events: CrmEvent[];
};
export async function adminCrmGetContact(id: number): Promise<{ success: boolean; card?: CrmCard; error?: string }> {
  if (!(await requireAdmin())) return { success: false, error: "관리자만 쓸 수 있어요." };
  const db = adminDb();
  const { data: c, error } = await db.from("crm_contacts").select("*").eq("id", id).maybeSingle();
  if (error || !c) return { success: false, error: error?.message || "카드를 찾지 못했어요." };
  const [tg, ev] = await Promise.all([
    db.from("crm_contact_tags").select("tag").eq("contact_id", id),
    db.from("crm_contact_events").select("id, kind, detail, created_at, campaign_id").eq("contact_id", id).order("created_at", { ascending: false }).limit(200),
  ]);
  const events = (ev.data || []) as CrmEvent[];
  const campIds = Array.from(new Set(events.map((e) => e.campaign_id).filter(Boolean))) as number[];
  if (campIds.length) {
    const { data: cs } = await db.from("crm_campaigns").select("id, name").in("id", campIds);
    const nm = Object.fromEntries((cs || []).map((x) => [x.id, x.name]));
    for (const e of events) if (e.campaign_id) e.campaign_name = nm[e.campaign_id] || null;
  }
  return {
    success: true,
    card: { ...(c as Omit<CrmCard, "tags" | "events" | "phone">), phone: fmtPhone(c.phone), tags: (tg.data || []).map((t) => t.tag).sort(), events },
  };
}

/* ── 카드 고치기 ── */
export async function adminCrmUpdateContact(id: number, patch: {
  sms_status?: CrmStatus; memo?: string; name?: string; office_name?: string; phone?: string; fax?: string; tel?: string; email?: string; address?: string; sido?: string; sigungu?: string;
}): Promise<{ success: boolean; error?: string }> {
  const adminId = await requireAdmin();
  if (!adminId) return { success: false, error: "관리자만 쓸 수 있어요." };
  const db = adminDb();
  const { data: old } = await db.from("crm_contacts").select("sms_status").eq("id", id).maybeSingle();
  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const v = (s: string, n: number) => s.trim().slice(0, n) || null;
  if (patch.memo !== undefined) upd.memo = patch.memo.slice(0, 2000) || null;
  if (patch.name !== undefined) upd.name = v(patch.name, 50);
  if (patch.office_name !== undefined) upd.office_name = v(patch.office_name, 100);
  if (patch.fax !== undefined) upd.fax = v(patch.fax, 30);
  if (patch.tel !== undefined) upd.tel = v(patch.tel, 30);
  if (patch.email !== undefined) upd.email = v(patch.email, 100);
  if (patch.address !== undefined) upd.address = v(patch.address, 200);
  if (patch.sido !== undefined) upd.sido = v(patch.sido, 20);
  if (patch.sigungu !== undefined) upd.sigungu = v(patch.sigungu, 40);
  if (patch.phone !== undefined) {
    const p = normPhone(patch.phone);
    if (!p) return { success: false, error: "휴대폰 번호를 확인해 주세요." };
    const { data: dup } = await db.from("crm_contacts").select("id").eq("phone", p).neq("id", id).maybeSingle();
    if (dup) return { success: false, error: "같은 휴대폰 번호가 이미 다른 주소에 있어요." };
    upd.phone = p;
  }
  if (patch.sms_status && CRM_STATUSES.includes(patch.sms_status)) {
    upd.sms_status = patch.sms_status;
    if (patch.sms_status === "보냄가능") { upd.no_reply_streak = 0; upd.rest_until = null; }
    if (patch.sms_status === "쉬는중") upd.rest_until = new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10);
  }
  const { error } = await db.from("crm_contacts").update(upd).eq("id", id);
  if (error) return { success: false, error: error.message };
  if (patch.sms_status && old && old.sms_status !== patch.sms_status) {
    await db.from("crm_contact_events").insert({
      contact_id: id, kind: patch.sms_status === "수신거부" ? "수신거부" : "상태바뀜", detail: `${old.sms_status} → ${patch.sms_status}`, created_by: adminId,
    });
  }
  return { success: true };
}

export async function adminCrmSetTag(id: number, tag: string, add: boolean): Promise<{ success: boolean; error?: string }> {
  if (!(await requireAdmin())) return { success: false, error: "관리자만 쓸 수 있어요." };
  const t = add ? cleanTag(tag) : tag;
  if (!t) return { success: false, error: "그룹 이름을 써 주세요." };
  const db = adminDb();
  const { error } = add
    ? await db.from("crm_contact_tags").upsert({ contact_id: id, tag: t }, { ignoreDuplicates: true })
    : await db.from("crm_contact_tags").delete().eq("contact_id", id).eq("tag", t);
  return error ? { success: false, error: error.message } : { success: true };
}

/** 손으로 적는 일 — 답장·전화는 반응(연속 무반응 0), 메모는 기록만 */
export async function adminCrmAddEvent(id: number, kind: "답장" | "전화" | "메모", detail: string): Promise<{ success: boolean; error?: string }> {
  const adminId = await requireAdmin();
  if (!adminId) return { success: false, error: "관리자만 쓸 수 있어요." };
  const db = adminDb();
  const text = detail.trim().slice(0, 2000);
  if (kind === "메모") {
    if (!text) return { success: false, error: "내용을 써 주세요." };
    const { error } = await db.from("crm_contact_events").insert({ contact_id: id, kind, detail: text, created_by: adminId });
    return error ? { success: false, error: error.message } : { success: true };
  }
  const { error } = await db.rpc("crm_mark_reaction", { p_contact: id, p_kind: kind, p_campaign: null, p_detail: text || null });
  return error ? { success: false, error: error.message } : { success: true };
}

/** 주소 넣기 (한 사람) — 뿌리오 [주소추가] */
export async function adminCrmAddContact(input: {
  phone: string; name?: string; office_name?: string; fax?: string; tel?: string; email?: string; address?: string; memo?: string; tags?: string[]; sms_status?: CrmStatus;
}): Promise<{ success: boolean; id?: number; error?: string }> {
  const adminId = await requireAdmin();
  if (!adminId) return { success: false, error: "관리자만 쓸 수 있어요." };
  const phone = normPhone(input.phone);
  if (!phone) return { success: false, error: "휴대폰 번호를 확인해 주세요." };
  const db = adminDb();
  const { data: ex } = await db.from("crm_contacts").select("id").eq("phone", phone).maybeSingle();
  if (ex) {
    // 이미 있는 번호면 그룹만 더 붙인다
    const tags = (input.tags || []).map(cleanTag).filter(Boolean);
    if (tags.length) await db.from("crm_contact_tags").upsert(tags.map((tag) => ({ contact_id: ex.id, tag })), { ignoreDuplicates: true });
    return { success: false, id: ex.id, error: tags.length ? "이미 있는 번호라 그룹에만 넣었어요." : "이미 있는 번호예요. 상세보기에서 고쳐 주세요." };
  }
  const v = (s?: string, n = 200) => s?.trim().slice(0, n) || null;
  const row: Record<string, unknown> = {
    phone, name: v(input.name, 50), office_name: v(input.office_name, 100), address: v(input.address), memo: v(input.memo, 2000),
    sms_status: input.sms_status && CRM_STATUSES.includes(input.sms_status) ? input.sms_status : "보냄가능",
  };
  const extra = { fax: v(input.fax, 30), tel: v(input.tel, 30), email: v(input.email, 100) };
  let res = await db.from("crm_contacts").insert({ ...row, ...extra }).select("id").single();
  if (res.error && /fax|tel|email/.test(res.error.message)) res = await db.from("crm_contacts").insert(row).select("id").single(); // 20261125_crm_2.sql 전
  if (res.error || !res.data) return { success: false, error: res.error?.message || "넣지 못했어요." };
  const id = res.data.id as number;
  const tags = (input.tags || []).map(cleanTag).filter(Boolean);
  if (tags.length) await db.from("crm_contact_tags").insert(tags.map((tag) => ({ contact_id: id, tag })));
  await db.from("crm_contact_events").insert({ contact_id: id, kind: "가져옴", detail: "직접 넣음", created_by: adminId });
  return { success: true, id };
}

/** 번호 여러 개 붙여넣기 — 없는 번호는 새로 넣고(그룹·보냄가능), 있는 번호는 그룹만 붙인다. 문자 보내기 [직접입력] · 주소록 [여러 번호 넣기] */
export async function adminCrmAddNumbers(text: string, tag: string): Promise<{ success: boolean; ids: number[]; added: number; existed: number; bad: number; error?: string }> {
  const adminId = await requireAdmin();
  if (!adminId) return { success: false, ids: [], added: 0, existed: 0, bad: 0, error: "관리자만 쓸 수 있어요." };
  const parts = text.split(/[\n,;\t]+/).map((s) => s.trim()).filter(Boolean);
  const phones = Array.from(new Set(parts.map((p) => normPhone(p)).filter(Boolean))) as string[];
  const bad = parts.length - parts.filter((p) => normPhone(p)).length;
  if (!phones.length) return { success: false, ids: [], added: 0, existed: 0, bad, error: "휴대폰 번호가 없어요." };
  if (phones.length > 10000) return { success: false, ids: [], added: 0, existed: 0, bad, error: "한 번에 1만 개까지 넣을 수 있어요." };
  const db = adminDb();
  const found: Record<string, number> = {};
  for (let i = 0; i < phones.length; i += 500) {
    const { data } = await db.from("crm_contacts").select("id, phone").in("phone", phones.slice(i, i + 500));
    for (const r of data || []) found[r.phone] = r.id;
  }
  const fresh = phones.filter((p) => !found[p]);
  for (let i = 0; i < fresh.length; i += 500) {
    const { data, error } = await db.from("crm_contacts").insert(fresh.slice(i, i + 500).map((phone) => ({ phone, sms_status: "보냄가능" }))).select("id, phone");
    if (error) return { success: false, ids: [], added: 0, existed: 0, bad, error: error.message };
    for (const r of data || []) found[r.phone] = r.id;
    await db.from("crm_contact_events").insert((data || []).map((r) => ({ contact_id: r.id, kind: "가져옴", detail: "번호 붙여넣기", created_by: adminId })));
  }
  const ids = phones.map((p) => found[p]).filter(Boolean);
  const t = cleanTag(tag);
  if (t) for (let i = 0; i < ids.length; i += 500) {
    await db.from("crm_contact_tags").upsert(ids.slice(i, i + 500).map((contact_id) => ({ contact_id, tag: t })), { ignoreDuplicates: true });
  }
  return { success: true, ids, added: fresh.length, existed: phones.length - fresh.length, bad };
}

/** 테스트 발송 — 내 번호로 한 통 (기록·캠페인 없이). 링크 자리에는 예시 주소 */
export async function adminCrmTestSend(input: { to: string; content: string; subject?: string; link?: string; isAd: boolean }): Promise<{ success: boolean; error?: string }> {
  if (!(await requireAdmin())) return { success: false, error: "관리자만 쓸 수 있어요." };
  const to = normPhone(input.to);
  if (!to) return { success: false, error: "받을 휴대폰 번호를 확인해 주세요." };
  if (!input.content.trim()) return { success: false, error: "내용을 써 주세요." };
  const link = (input.link || "").trim();
  const text = (input.isAd ? crmAdFormat(input.content, !!link) : input.content.trim()).replace(LINK_SLOT, link ? (/^https?:/i.test(link) ? link : `https://${link}`) : "");
  const r = await sendPpurioSmsBulk({ targets: [{ to }], content: `[테스트] ${text}`, subject: input.subject });
  return r.accepted > 0 ? { success: true } : { success: false, error: r.error || "보내지 못했어요." };
}

/* ── 문자 보내기 ── */
const LINK_SLOT = "[*1*]";
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://gongsilnews.com").replace(/\/$/, "");

/** 광고 문자 모양 — 맨 앞 (광고)공실뉴스 · 끝에 무료 수신거부 */
function crmAdFormat(content: string, withLink: boolean): string {
  const body = content.trim().replace(/^\(광고\)\s*(공실뉴스)?\s*/, "");
  const link = withLink ? (body.includes("{링크}") ? "" : `\n${LINK_SLOT}`) : "";
  const text = withLink ? body.replace("{링크}", LINK_SLOT) : body.replace(/\{링크\}/g, "").trim();
  const free = (process.env.CRM_OPTOUT_080 || "").trim();
  const from = (process.env.PPURIO_FROM || "").replace(/[^0-9]/g, "").replace(/^(\d{4})(\d{4})$/, "$1-$2");
  const optOut = free ? `무료수신거부 ${free}` : `수신거부: ${from || "공실뉴스"} 로 "거부"`;
  return `(광고)공실뉴스\n${text}${link}\n\n${optOut}`;
}

export async function adminCrmPreview(content: string, link: string): Promise<{ text: string; type: "SMS" | "LMS"; noFree080: boolean }> {
  const withLink = !!link.trim();
  const raw = crmAdFormat(content, withLink);
  const text = raw.replace(LINK_SLOT, `${SITE}/api/r/a1b2c3`);
  return { text, type: ppurioMessageType(text), noFree080: !(process.env.CRM_OPTOUT_080 || "").trim() };
}

/** 보낼 사람 수 (보냄가능만) */
export async function adminCrmCountTargets(f: CrmFilter): Promise<{ success: boolean; count: number; error?: string }> {
  if (!(await requireAdmin())) return { success: false, count: 0, error: "관리자만 쓸 수 있어요." };
  const db = adminDb();
  await db.rpc("crm_wake_rested");
  let query = db.from("crm_contacts").select(f.tags?.length ? "id, crm_contact_tags!inner(tag)" : "id", { count: "exact", head: true });
  query = applyFilter(query, { ...f, status: "", sendable: true });
  const { count, error } = await query;
  return error ? { success: false, count: 0, error: error.message } : { success: true, count: count || 0 };
}

function isNightKst(d = new Date()): boolean {
  const h = (d.getUTCHours() + 9) % 24;
  return h >= 21 || h < 8;
}
const code = () => {
  const a = "abcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 7; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
};

export type CrmSendResult = { success: boolean; campaignId?: number; accepted: number; total: number; error?: string; warning?: string };

type Target = { id: number; phone: string; name: string | null; member_id: string | null };

/** 받는사람 묶음 여러 개 → 보냄가능인 사람 (겹치는 번호는 한 번) */
async function collectTargets(db: Db, filters: CrmFilter[], opts: { excludeSentDays?: number; excludeMemberIds?: string[]; cap?: number } = {}): Promise<{ list: Target[]; error?: string }> {
  // 고른 사람(ids) 이 많으면 1,000명씩 나눠 묻는다
  const parts: CrmFilter[] = [];
  for (const f of filters) {
    if (f.ids && f.ids.length > 1000) for (let i = 0; i < f.ids.length; i += 1000) parts.push({ ...f, ids: f.ids.slice(i, i + 1000) });
    else parts.push(f);
  }
  const seen = new Map<number, Target>();
  const skipMembers = new Set(opts.excludeMemberIds || []);
  const cap = opts.cap && opts.cap > 0 ? opts.cap : Infinity;
  for (const f of parts) {
    for (let from = 0; seen.size < cap; from += 1000) {
      let q = db.from("crm_contacts").select(f.tags?.length ? "id, phone, name, member_id, crm_contact_tags!inner(tag)" : "id, phone, name, member_id");
      q = applyFilter(q, { ...f, status: "", sendable: true, excludeSentDays: opts.excludeSentDays }).order("id").range(from, from + 999);
      const { data, error } = await q;
      if (error) return { list: [], error: error.message };
      const page = (data || []) as unknown as Target[];
      for (const r of page) if (!seen.has(r.id) && !(r.member_id && skipMembers.has(r.member_id))) seen.set(r.id, r);
      if (page.length < 1000) break;
    }
    if (seen.size >= cap) break;
  }
  const list = Array.from(seen.values());
  if (list.length > cap) list.length = cap;
  return { list };
}

/** 받는사람 칸 전체 수 (겹치는 번호 한 번) */
export async function adminCrmCountUnion(filters: CrmFilter[], excludeSentDays?: number, excludeMemberIds?: string[]): Promise<{ success: boolean; count: number; error?: string }> {
  if (!(await requireAdmin())) return { success: false, count: 0, error: "관리자만 쓸 수 있어요." };
  if (!filters.length) return { success: true, count: 0 };
  const db = adminDb();
  await db.rpc("crm_wake_rested");
  const r = await collectTargets(db, filters, { excludeSentDays, excludeMemberIds });
  return r.error ? { success: false, count: 0, error: r.error } : { success: true, count: r.list.length };
}

export async function adminCrmSend(input: {
  filters: CrmFilter[]; content: string; subject?: string; campaignName: string; link?: string; limit?: number;
  excludeSentDays?: number; excludeMemberIds?: string[]; labels?: string[];
}): Promise<CrmSendResult> {
  const adminId = await requireAdmin();
  if (!adminId) return { success: false, accepted: 0, total: 0, error: "관리자만 쓸 수 있어요." };
  const content = (input.content || "").trim();
  if (!content) return { success: false, accepted: 0, total: 0, error: "보낼 내용을 써 주세요." };
  if (!input.filters?.length) return { success: false, accepted: 0, total: 0, error: "받는사람을 담아 주세요." };
  if (isNightKst()) return { success: false, accepted: 0, total: 0, error: "광고 문자는 밤 9시부터 아침 8시까지 보낼 수 없어요 (법)." };
  let link = (input.link || "").trim();
  if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;

  const db = adminDb();
  await db.rpc("crm_wake_rested");

  // 받는 사람 — 서버가 조건을 다시 적용 (보냄가능만 · 겹치는 번호 한 번)
  const got = await collectTargets(db, input.filters, { excludeSentDays: input.excludeSentDays, excludeMemberIds: input.excludeMemberIds, cap: input.limit });
  if (got.error) return { success: false, accepted: 0, total: 0, error: got.error };
  const targets = got.list;
  if (!targets.length) return { success: false, accepted: 0, total: 0, error: "보낼 수 있는 사람이 없어요 (수신거부한 사람은 빠져요)." };

  const text = crmAdFormat(content, !!link);
  const { data: camp, error: cErr } = await db.from("crm_campaigns").insert({
    name: input.campaignName.trim().slice(0, 100) || `문자 ${new Date().toISOString().slice(0, 10)}`,
    content: text, filter: { groups: input.labels || [], link: link || null }, created_by: adminId,
  }).select("id").single();
  if (cErr || !camp) return { success: false, accepted: 0, total: targets.length, error: cErr?.message || "캠페인을 만들지 못했어요." };

  // 사람마다 짧은 링크 — 누르면 /api/r/<code> 가 기록하고 원래 주소로 (?ref=crm-<캠페인>)
  const linkOf: Record<number, string> = {};
  if (link) {
    const rows = targets.map((t) => { const c = code(); linkOf[t.id] = c; return { code: c, contact_id: t.id, campaign_id: camp.id, url: link }; });
    for (let i = 0; i < rows.length; i += 1000) {
      const { error } = await db.from("crm_links").insert(rows.slice(i, i + 1000));
      if (error) return { success: false, accepted: 0, total: targets.length, error: `링크를 만들지 못했어요: ${error.message}` };
    }
  }

  const res = await sendPpurioSmsBulk({
    targets: targets.map((t) => ({ to: t.phone, name: t.name || "", ...(link ? { changeWord: { var1: `${SITE}/api/r/${linkOf[t.id]}` } } : {}) })),
    content: text, subject: input.subject,
  });
  const okSet = new Set(res.acceptedTo || []);
  const sentIds = targets.filter((t) => okSet.has(t.phone)).map((t) => t.id);
  for (let i = 0; i < sentIds.length; i += 1000) {
    await db.rpc("crm_mark_sent", { p_ids: sentIds.slice(i, i + 1000), p_campaign: camp.id });
  }
  await db.from("crm_campaigns").update({ sent_count: sentIds.length }).eq("id", camp.id);

  let warning: string | undefined;
  const log = await db.from("message_logs").insert({
    sent_by: adminId, channel: "sms", is_ad: true, subject: input.subject || null, content: text,
    recipient_count: targets.length, success_count: res.accepted, fail_count: targets.length - res.accepted,
    recipients: [], status: res.accepted === 0 ? "failed" : res.accepted < targets.length ? "partial" : "sent",
  }).select("id").single();
  if (log.data) await db.from("crm_campaigns").update({ message_log_id: log.data.id }).eq("id", camp.id);
  if (!(process.env.CRM_OPTOUT_080 || "").trim()) warning = "080 무료 수신거부 번호가 아직 없어 발신번호로 거부를 받게 했어요.";

  return { success: res.accepted > 0, campaignId: camp.id, accepted: res.accepted, total: targets.length, error: res.error, warning };
}

/* ── 저장 문자 (DB — 어느 PC 에서나 같이 보임) ── */
export type CrmTemplate = { id: number; title: string; content: string; link: string | null; used_count: number; last_used_at: string | null; updated_at: string };
export async function adminCrmTemplates(): Promise<{ success: boolean; list: CrmTemplate[]; error?: string }> {
  if (!(await requireAdmin())) return { success: false, list: [], error: "관리자만 쓸 수 있어요." };
  const { data, error } = await adminDb().from("crm_templates").select("id, title, content, link, used_count, last_used_at, updated_at").order("updated_at", { ascending: false });
  return error ? { success: false, list: [], error: error.message } : { success: true, list: (data || []) as CrmTemplate[] };
}
export async function adminCrmSaveTemplate(input: { id?: number; title: string; content: string; link?: string }): Promise<{ success: boolean; id?: number; error?: string }> {
  const adminId = await requireAdmin();
  if (!adminId) return { success: false, error: "관리자만 쓸 수 있어요." };
  const row = { title: input.title.trim().slice(0, 100) || "저장한 문자", content: input.content.trim(), link: input.link?.trim() || null, updated_at: new Date().toISOString() };
  if (!row.content) return { success: false, error: "내용을 써 주세요." };
  const db = adminDb();
  const res = input.id
    ? await db.from("crm_templates").update(row).eq("id", input.id).select("id").single()
    : await db.from("crm_templates").insert({ ...row, created_by: adminId }).select("id").single();
  return res.error ? { success: false, error: res.error.message } : { success: true, id: res.data.id };
}
export async function adminCrmDeleteTemplate(id: number): Promise<{ success: boolean; error?: string }> {
  if (!(await requireAdmin())) return { success: false, error: "관리자만 쓸 수 있어요." };
  const { error } = await adminDb().from("crm_templates").delete().eq("id", id);
  return error ? { success: false, error: error.message } : { success: true };
}
/** 보낼 때 쓴 저장 문자 — 쓴 횟수 +1 */
export async function adminCrmTemplateUsed(id: number): Promise<void> {
  if (!(await requireAdmin())) return;
  const db = adminDb();
  const { data } = await db.from("crm_templates").select("used_count").eq("id", id).maybeSingle();
  if (data) await db.from("crm_templates").update({ used_count: (data.used_count || 0) + 1, last_used_at: new Date().toISOString() }).eq("id", id);
}

/* ── 캠페인 결과 ── */
export type CrmCampaign = { id: number; name: string; content: string | null; created_at: string; sent_count: number; click_count: number; signup_count: number; resting_count: number; filter: { link?: string | null } | null; message_log_id: string | null };

/** 보낸 기록(message_logs) 에 붙은 캠페인 반응 — 문자·카톡 보내기 [보낸 문자·반응] */
export async function adminCrmStatsByLogs(logIds: string[]): Promise<Record<string, CrmCampaign>> {
  if (!(await requireAdmin()) || !logIds.length) return {};
  const { data, error } = await adminDb().from("crm_campaign_stats").select("*").in("message_log_id", logIds);
  if (error) return {};
  return Object.fromEntries((data as CrmCampaign[]).map((c) => [c.message_log_id as string, c]));
}
export async function adminCrmCampaigns(): Promise<{ success: boolean; list: CrmCampaign[]; error?: string }> {
  if (!(await requireAdmin())) return { success: false, list: [], error: "관리자만 쓸 수 있어요." };
  const { data, error } = await adminDb().from("crm_campaign_stats").select("*").order("created_at", { ascending: false }).limit(100);
  return error ? { success: false, list: [], error: error.message } : { success: true, list: (data || []) as CrmCampaign[] };
}
