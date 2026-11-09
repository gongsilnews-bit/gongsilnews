"use server";

/**
 * 최고관리자 홈 — 가입 현황 · 가입 경로 · 처리할 일 · 전체 합계 (2026-11-09 사장님 회의, docs/2026-11-09_superadmin_page_plan.md ① 총괄)
 * 숫자는 DB 실제 값만. 못 읽은 칸은 null → 화면에서 "–"
 */
import { createClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/utils/supabase/server";
import { isAdminRole } from "@/utils/permissionCheck";
import { memberTier } from "@/utils/tier";

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireAdmin() {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return false;
  const { data: member } = await getAdminClient().from("members").select("role").eq("id", user.id).maybeSingle();
  return isAdminRole(member?.role);
}

/** 한국 시간 날짜 (YYYY-MM-DD) */
const KST = 9 * 60 * 60 * 1000;
const kstDay = (t: string | number | Date) => new Date(new Date(t).getTime() + KST).toISOString().slice(0, 10);

export type AdminHomeData = {
  signups: { today: number; week: number; month: number; daily: { day: string; count: number }[] } | null;
  tiers: { user: number; free: number; pro: number; biz: number } | null;
  expiringSoon: number | null;
  refs: { ref: string; count: number }[] | null; // null = signup_ref 칸이 아직 없음
  todo: {
    memberPending: number | null;
    newsrealtyPending: number | null;
    paymentReview: number | null;
    articlePending: number | null;
    articleRejected: number | null;
    inquiryOpen: number | null;
    aptReports: number | null;
  };
  totals: { vacancies: number | null; articles: number | null; members: number | null; inquiries: number | null };
};

export async function getAdminHome(): Promise<{ success: true; data: AdminHomeData } | { success: false; error: string }> {
  if (!(await requireAdmin())) return { success: false, error: "권한이 없습니다" };
  const db = getAdminClient();

  const countOf = async (q: PromiseLike<{ count: number | null; error: unknown }>) => {
    try {
      const { count, error } = await q;
      return error ? null : count ?? 0;
    } catch {
      return null;
    }
  };

  const [membersRes, refsRes, agenciesRes, bizRes] = await Promise.all([
    db.from("members").select("id, role, created_at, studio_end_date, is_deleted").limit(100000),
    db.from("members").select("signup_ref, created_at").not("signup_ref", "is", null).limit(100000),
    db.from("agencies").select("owner_id, status").limit(100000),
    db.from("business_profiles").select("user_id, status").limit(100000),
  ]);

  const now = Date.now();
  const today = kstDay(now);
  const monthKey = today.slice(0, 7);
  // 이번 주 = 한국 시간 월요일부터
  const kstNow = new Date(now + KST);
  const dow = (kstNow.getUTCDay() + 6) % 7; // 월=0
  const weekStart = kstDay(now - dow * 86400000);

  let signups: AdminHomeData["signups"] = null;
  let tiers: AdminHomeData["tiers"] = null;
  let expiringSoon: number | null = null;
  let memberPending: number | null = null;
  let membersTotal: number | null = null;

  if (!membersRes.error && membersRes.data) {
    const rows = membersRes.data.filter((m) => !m.is_deleted);
    membersTotal = rows.length;
    const days = rows.map((m) => (m.created_at ? kstDay(m.created_at) : ""));
    const daily: { day: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = kstDay(now - i * 86400000);
      daily.push({ day: d, count: days.filter((x) => x === d).length });
    }
    signups = {
      today: days.filter((d) => d === today).length,
      week: days.filter((d) => d && d >= weekStart && d <= today).length,
      month: days.filter((d) => d.startsWith(monthKey)).length,
      daily,
    };

    const t = { user: 0, free: 0, pro: 0, biz: 0 };
    let exp = 0;
    const in30 = kstDay(now + 30 * 86400000);
    for (const m of rows) {
      const tier = memberTier(m);
      if (tier === "admin") continue;
      t[tier]++;
      if (tier === "pro" && m.studio_end_date) {
        const end = String(m.studio_end_date).slice(0, 10);
        if (end >= today && end <= in30) exp++;
      }
    }
    tiers = t;
    expiringSoon = exp;

    // 회원 승인 대기 — MemberSection 판정과 같게: 중개사 서류가 있으면 그 상태, 없으면 사업자 서류 상태
    if (!agenciesRes.error && !bizRes.error) {
      const ag = new Map((agenciesRes.data || []).map((a) => [a.owner_id, a.status]));
      const bz = new Map((bizRes.data || []).map((b) => [b.user_id, b.status]));
      memberPending = rows.filter((m) => {
        if (m.role === "ADMIN") return false;
        const st = ag.has(m.id) ? ag.get(m.id) : bz.has(m.id) ? bz.get(m.id) : null;
        if (st == null) return false;
        return st !== "APPROVED" && st !== "REJECTED";
      }).length;
    }
  }

  let refs: AdminHomeData["refs"] = null;
  if (!refsRes.error && refsRes.data) {
    const map = new Map<string, number>();
    for (const r of refsRes.data) {
      if (!r.signup_ref || !r.created_at || !kstDay(r.created_at).startsWith(monthKey)) continue;
      map.set(r.signup_ref, (map.get(r.signup_ref) || 0) + 1);
    }
    refs = [...map.entries()].map(([ref, count]) => ({ ref, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }

  const [newsrealtyPending, paymentReview, articlePending, articleRejected, siteInqOpen, boardInqOpen, aptReports, vacancies, articles, siteInqAll, boardInqAll] = await Promise.all([
    // 공실뉴스부동산 가입 신청 — 처리 안 끝난 것 (신규·연락완료·진행중)
    countOf(db.from("newsrealty_applications").select("id", { count: "exact", head: true }).in("status", ["신규", "연락완료", "진행중"])),
    // 스마트스토어 주문 — 회원 연결·확인이 필요한 것 (SmartstoreOrdersPanel 과 같은 판정)
    countOf(db.from("smartstore_orders").select("product_order_id", { count: "exact", head: true }).in("status", ["needs_review", "revoke_review"])),
    countOf(db.from("articles").select("id", { count: "exact", head: true }).eq("status", "PENDING").eq("is_deleted", false)),
    countOf(db.from("articles").select("id", { count: "exact", head: true }).eq("status", "REJECTED").eq("is_deleted", false)),
    countOf(db.from("site_inquiries").select("id", { count: "exact", head: true }).eq("status", "신규")),
    countOf(db.from("board_posts").select("id", { count: "exact", head: true }).eq("board_id", "inquiry").eq("is_deleted", false).is("answered_at", null)),
    countOf(db.from("apt_info_reports").select("id", { count: "exact", head: true }).eq("status", "pending")),
    countOf(db.from("vacancies").select("id", { count: "exact", head: true })),
    countOf(db.from("articles").select("id", { count: "exact", head: true }).eq("is_deleted", false)),
    countOf(db.from("site_inquiries").select("id", { count: "exact", head: true })),
    countOf(db.from("board_posts").select("id", { count: "exact", head: true }).eq("board_id", "inquiry").eq("is_deleted", false)),
  ]);

  const sum = (a: number | null, b: number | null) => (a == null && b == null ? null : (a || 0) + (b || 0));

  return {
    success: true,
    data: {
      signups,
      tiers,
      expiringSoon,
      refs,
      todo: {
        memberPending,
        newsrealtyPending,
        paymentReview,
        articlePending,
        articleRejected,
        inquiryOpen: sum(siteInqOpen, boardInqOpen),
        aptReports,
      },
      totals: { vacancies, articles, members: membersTotal, inquiries: sum(siteInqAll, boardInqAll) },
    },
  };
}
