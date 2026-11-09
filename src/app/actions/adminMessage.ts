"use server";

/**
 * 최고관리자 → 회원 문자 (2026-11-09, docs/2026-11-09_superadmin_page_plan.md ③ 회원에게 연락)
 *  - 받는 사람: 회원 등급 · 가입일 · 만료 예정 · (광고면) 수신 동의한 회원만 · 휴대폰 번호 있는 회원만
 *  - 광고 문자: 맨 앞 "(광고)공실뉴스" · 끝에 수신거부 방법 · 밤 9시 ~ 아침 8시(한국 시간) 발송 막음
 *  - 정보성 문자(만료·공지·새 기능): 수신 동의 없이 보낼 수 있다
 *  - 보낸 결과는 message_logs 에 남긴다 (표가 아직 없으면 보내기는 되고 기록만 건너뜀)
 *  전화번호는 화면에서 받지 않고 서버가 회원 id 로 다시 읽는다 (화면 값을 믿지 않는다)
 */

import { createClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/utils/supabase/server";
import { isAdminRole } from "@/utils/permissionCheck";
import { memberTier, type Tier } from "@/utils/tier";
import { sendPpurioSmsBulk, ppurioMessageType } from "@/utils/ppurio";

function adminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireAdmin(): Promise<string | null> {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return null;
  const { data: me } = await adminDb().from("members").select("role").eq("id", user.id).maybeSingle();
  return isAdminRole(me?.role) ? user.id : null;
}

export type AudienceTier = "all" | "user" | "free" | "pro" | "biz";
export type AudienceFilter = {
  tier: AudienceTier;
  /** 가입일 시작·끝 (YYYY-MM-DD, 한국 날짜) */
  joinedFrom?: string;
  joinedTo?: string;
  /** 공실뉴스부동산 이용 기간이 30일 안에 끝나는 회원만 */
  expiringSoon?: boolean;
  /** 광고 문자 — 수신 동의한 회원만 */
  isAd: boolean;
};
export type AudienceMember = { id: string; name: string; phoneTail: string; tier: Tier };

const PHONE_OK = (p?: string | null) => /^01\d{8,9}$/.test((p || "").replace(/[^0-9]/g, ""));

type Row = {
  id: string; name: string | null; phone: string | null; role: string | null; plan_type: string | null;
  plan_end_date: string | null; studio_end_date: string | null; created_at: string | null; is_deleted: boolean | null;
  marketing_sms?: boolean | null;
};

/** 회원 읽기 — marketing_sms 칸이 아직 없으면 그 칸 없이 다시 읽고 consentMissing 을 알린다 */
async function loadMembers(): Promise<{ rows: Row[]; consentMissing: boolean; error?: string }> {
  const db = adminDb();
  const base = "id, name, phone, role, plan_type, plan_end_date, studio_end_date, created_at, is_deleted";
  const all: Row[] = [];
  let consentMissing = false;
  for (let from = 0; ; from += 1000) {
    const read = (cols: string) => db.from("members").select(cols).range(from, from + 999) as unknown as Promise<{ data: unknown[] | null; error: { message: string } | null }>;
    let res = await read(consentMissing ? base : `${base}, marketing_sms`);
    if (res.error && !consentMissing && /marketing_sms/.test(res.error.message)) {
      consentMissing = true;
      res = await read(base);
    }
    if (res.error) return { rows: [], consentMissing, error: res.error.message };
    const page = (res.data || []) as unknown as Row[];
    all.push(...page);
    if (page.length < 1000) break;
  }
  return { rows: all, consentMissing };
}

function pick(rows: Row[], f: AudienceFilter, consentMissing: boolean): Row[] {
  const now = Date.now();
  const kstDay = (iso: string) => new Date(new Date(iso).getTime() + 9 * 3600_000).toISOString().slice(0, 10);
  return rows.filter((m) => {
    if (m.is_deleted) return false;
    if (!PHONE_OK(m.phone)) return false;
    const t = memberTier(m);
    if (t === "admin") return false;
    if (f.tier !== "all" && t !== f.tier) return false;
    if (f.joinedFrom || f.joinedTo) {
      if (!m.created_at) return false;
      const d = kstDay(m.created_at);
      if (f.joinedFrom && d < f.joinedFrom) return false;
      if (f.joinedTo && d > f.joinedTo) return false;
    }
    if (f.expiringSoon) {
      if (!m.studio_end_date) return false;
      const end = new Date(m.studio_end_date).getTime();
      if (!(end >= now && end <= now + 30 * 86400_000)) return false;
    }
    if (f.isAd) {
      if (consentMissing) return false; // 동의 칸이 없으면 광고 대상 없음
      if (m.marketing_sms !== true) return false;
    }
    return true;
  });
}

/** 받는 사람 미리 보기 */
export async function adminFindRecipients(f: AudienceFilter): Promise<{ success: boolean; members: AudienceMember[]; consentMissing: boolean; error?: string }> {
  if (!(await requireAdmin())) return { success: false, members: [], consentMissing: false, error: "관리자만 쓸 수 있어요." };
  const { rows, consentMissing, error } = await loadMembers();
  if (error) return { success: false, members: [], consentMissing, error };
  const members = pick(rows, f, consentMissing).map((m) => ({
    id: m.id, name: m.name || "(이름 없음)", phoneTail: (m.phone || "").replace(/[^0-9]/g, "").slice(-4), tier: memberTier(m),
  }));
  return { success: true, members, consentMissing };
}

/** 한국 시간 밤 9시 ~ 아침 8시 */
function isNightKst(d = new Date()): boolean {
  const h = (d.getUTCHours() + 9) % 24;
  return h >= 21 || h < 8;
}

/** 광고 문자 모양 — 맨 앞 (광고)공실뉴스 · 끝에 수신거부 방법 */
function adFormat(content: string): string {
  const from = (process.env.PPURIO_FROM || "").replace(/[^0-9]/g, "");
  const body = content.trim().replace(/^\(광고\)\s*(공실뉴스)?\s*/, "");
  const optOut = `수신거부: 공실뉴스 [정보설정]에서 문자 받기 끄기${from ? ` 또는 ${from} 로 연락` : ""}`;
  return `(광고)공실뉴스\n${body}\n\n${optOut}`;
}

/** 보내기 전에 실제로 나갈 글 (화면 미리 보기용) */
export async function adminPreviewMessage(content: string, isAd: boolean): Promise<{ text: string; type: "SMS" | "LMS" }> {
  const text = isAd ? adFormat(content) : content.trim();
  return { text, type: ppurioMessageType(text) };
}

export type SendResult = { success: boolean; accepted: number; failed: number; total: number; error?: string; warning?: string };

/** 회원 id 로 보내기 — 서버가 조건을 다시 확인한다 */
export async function adminSendMemberSms(input: { memberIds: string[]; content: string; subject?: string; isAd: boolean }): Promise<SendResult> {
  const adminId = await requireAdmin();
  if (!adminId) return { success: false, accepted: 0, failed: 0, total: 0, error: "관리자만 쓸 수 있어요." };
  const content = (input.content || "").trim();
  if (!content) return { success: false, accepted: 0, failed: 0, total: 0, error: "보낼 내용을 써 주세요." };
  const ids = Array.from(new Set(input.memberIds || []));
  if (!ids.length) return { success: false, accepted: 0, failed: 0, total: 0, error: "받는 사람을 골라 주세요." };
  if (input.isAd && isNightKst()) {
    return { success: false, accepted: 0, failed: 0, total: ids.length, error: "광고 문자는 밤 9시부터 아침 8시까지 보낼 수 없어요 (법)." };
  }

  const { rows, consentMissing, error } = await loadMembers();
  if (error) return { success: false, accepted: 0, failed: 0, total: ids.length, error };
  const idSet = new Set(ids);
  // 고른 회원 가운데 지금도 조건에 맞는 사람만 (탈퇴·번호 없음·광고 미동의는 뺀다)
  const ok = pick(rows.filter((r) => idSet.has(r.id)), { tier: "all", isAd: input.isAd }, consentMissing);
  const skipped = ids.length - ok.length;
  if (!ok.length) {
    return {
      success: false, accepted: 0, failed: 0, total: ids.length,
      error: input.isAd ? (consentMissing ? "아직 문자 수신 동의 칸이 없어 광고 문자를 보낼 수 없어요." : "고른 회원 중 문자 수신에 동의한 사람이 없어요.") : "보낼 수 있는 휴대폰 번호가 없어요.",
    };
  }

  const text = input.isAd ? adFormat(content) : content;
  const res = await sendPpurioSmsBulk({ targets: ok.map((m) => ({ to: m.phone || "", name: m.name || "" })), content: text, subject: input.subject });
  const failed = res.failed + skipped;

  // 기록 — 표가 없으면 건너뛰고 알린다
  let warning: string | undefined;
  const log = await adminDb().from("message_logs").insert({
    sent_by: adminId,
    channel: "sms",
    is_ad: input.isAd,
    subject: input.subject || null,
    content: text,
    recipient_count: ids.length,
    success_count: res.accepted,
    fail_count: failed,
    recipients: ok.map((m) => ({ id: m.id, name: m.name, phone_tail: (m.phone || "").replace(/[^0-9]/g, "").slice(-4) })),
    status: res.accepted === 0 ? "failed" : failed > 0 ? "partial" : "sent",
  });
  if (log.error) warning = "보낸 기록 표(message_logs)가 아직 없어 기록은 남기지 못했어요.";
  if (skipped > 0) warning = [warning, `${skipped}명은 번호가 없거나 수신 동의가 없어 뺐어요.`].filter(Boolean).join(" ");

  return { success: res.success, accepted: res.accepted, failed, total: ids.length, error: res.error, warning };
}

export type MessageLog = {
  id: string; created_at: string; is_ad: boolean; subject: string | null; content: string;
  recipient_count: number; success_count: number; fail_count: number; status: string;
};

/** 보낸 기록 (최근 순) */
export async function adminGetMessageLogs(limit = 50): Promise<{ success: boolean; logs: MessageLog[]; missingTable?: boolean; error?: string }> {
  if (!(await requireAdmin())) return { success: false, logs: [], error: "관리자만 쓸 수 있어요." };
  const { data, error } = await adminDb()
    .from("message_logs")
    .select("id, created_at, is_ad, subject, content, recipient_count, success_count, fail_count, status")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { success: false, logs: [], missingTable: /message_logs|relation|schema cache/i.test(error.message), error: error.message };
  return { success: true, logs: (data || []) as MessageLog[] };
}
