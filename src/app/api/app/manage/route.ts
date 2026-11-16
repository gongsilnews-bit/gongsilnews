// 안드로이드 앱 공실관리 · 기사관리 (2026-11-16 사장님: "모바일과 같은 디자인 스타일로 별도의 페이지로")
//  사이트 모바일 /m/admin/vacancy · /m/admin/article 이 쓰는 같은 서버 함수를 그대로 부른다 → 같은 자료·같은 규칙(광고 한도 등)
//  누가 부르는지는 앱이 보낸 로그인 토큰으로 정한다. 남의 공실·기사는 최고관리자만 다룬다.
//
//  POST { action: "vac.list", page }                 → 내 공실 30건씩
//  POST { action: "vac.status", id, status }          → 광고중(ACTIVE) ↔ 광고종료(STOPPED)
//  POST { action: "vac.delete", id }
//  POST { action: "art.list", page, filter, type, keyword, sort } → 관리자: 전체 기사(서버 페이징·건수) / 회원: 내 기사 전부
//  POST { action: "noti.list" | "noti.read" (id) | "noti.readAll" } → 알림
//  POST { action: "bm.cats" (type) | "sub.list" | "sub.toggle" (reporterId) } → 찜 폴더 · 구독 기자
//  POST { action: "art.approve" | "art.reject" | "art.request" | "art.flags" | "art.delete", id, ... }
import { NextRequest, NextResponse } from "next/server";
import { deleteVacancy, getVacancies, updateVacancyStatus } from "@/app/actions/vacancy";
import { adminUpdateArticleFlags, adminUpdateArticleStatus, deleteArticle, getArticles, getArticleTabCounts, getMyArticles } from "@/app/actions/article";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/app/actions/notification";
import { getBookmarkCategories } from "@/app/actions/bookmark";
import { getMySubscriptions, toggleSubscription } from "@/app/actions/subscription";
import { myArticle, myVacancy, no, whoAmI } from "../auth";

const ok = (data: Record<string, unknown> = {}) => NextResponse.json({ success: true, ...data });

// 모바일 기사관리 탭 이름 → 서버 status ("전체"는 거르지 않음)
const STATUS_PARAM: Record<string, string | undefined> = { 전체: undefined, 승인대기: "PENDING", 발행됨: "APPROVED", 예약됨: "SCHEDULED", 작성중: "DRAFT", 반려: "REJECTED" };
const PAGE = 30;

/** 공실 목록 한 줄 — 앱 카드에 그리는 칸만 */
function vacRow(v: any) {
  const photos = Array.isArray(v.vacancy_photos) ? [...v.vacancy_photos].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)) : [];
  return {
    id: v.id, vacancy_no: v.vacancy_no, status: v.status, trade_type: v.trade_type, property_type: v.property_type, sub_category: v.sub_category,
    deposit: v.deposit, monthly_rent: v.monthly_rent, sido: v.sido, sigungu: v.sigungu, dong: v.dong, detail_addr: v.detail_addr, building_name: v.building_name,
    apt_dong: v.apt_dong, hosu: v.hosu, room_count: v.room_count, exclusive_m2: v.exclusive_m2, supply_m2: v.supply_m2, current_floor: v.current_floor,
    client_name: v.client_name, client_phone: v.client_phone, created_at: v.created_at, exposure_type: v.exposure_type, photo: photos[0]?.url || null,
  };
}

export async function POST(req: NextRequest) {
  const me = await whoAmI(req);
  if (!me) return no("로그인이 필요합니다.", 401);
  const body = await req.json().catch(() => null);
  const action = String(body?.action || "");
  const id = String(body?.id || "");
  const uid = me.user.id;

  // ── 알림 (사이트 모바일 /m/notifications 와 같은 함수 — 내 알림 + 최고관리자는 관리자 알림) ──
  if (action === "noti.list") {
    const res = await getNotifications({ userId: uid, isAdmin: me.isAdmin, limit: 50 });
    return res.success ? ok({ data: res.data, unread: res.unread }) : no(res.error || "알림을 불러오지 못했습니다.", 500);
  }
  if (action === "noti.read") {
    if (!id) return no("알림 번호가 없습니다.");
    const { data: n } = await me.db.from("notifications").select("recipient_id, recipient_role").eq("id", id).maybeSingle();
    if (!n || !(n.recipient_id === uid || (me.isAdmin && n.recipient_role === "ADMIN"))) return no("내 알림이 아닙니다.", 403);
    const res = await markNotificationRead(id);
    return res.success ? ok() : no(res.error || "읽음 처리하지 못했습니다.", 500);
  }
  if (action === "noti.readAll") {
    const res = await markAllNotificationsRead({ userId: uid, isAdmin: me.isAdmin });
    return res.success ? ok() : no(res.error || "읽음 처리하지 못했습니다.", 500);
  }

  // ── 찜 폴더 · 구독 기자 (사이트 모바일 찜·구독 화면과 같은 함수) ──
  if (action === "bm.cats") {
    const type = body.type === "VACANCY" ? "VACANCY" : "ARTICLE";
    const res = await getBookmarkCategories(uid, type);
    return ok({ data: res.success ? res.categories || [] : [] });
  }
  if (action === "sub.list") {
    const res = await getMySubscriptions(uid);
    return res.success ? ok({ data: res.reporters }) : no("구독 기자를 불러오지 못했습니다.", 500);
  }
  if (action === "sub.toggle") {
    const reporterId = String(body.reporterId || "");
    if (!reporterId) return no("기자 번호가 없습니다.");
    const res = await toggleSubscription(reporterId, uid);
    return res.success ? ok({ subscribed: (res as { subscribed?: boolean }).subscribed }) : no((res as { error?: string }).error || "구독을 바꾸지 못했습니다.", 500);
  }

  // ── 공실관리 ──
  if (action === "vac.list") {
    const page = Math.max(1, Number(body.page) || 1);
    const res = await getVacancies({ ownerId: uid, excludeOnbid: true, page, limit: PAGE });
    if (!res.success) return no((res as { error?: string }).error || "공실을 불러오지 못했습니다.", 500);
    const list = Array.isArray(res.data) ? res.data : [];
    return ok({ data: list.map(vacRow), count: (res as { count?: number }).count || 0, me: { name: me.member.name, phone: me.member.phone, isAdmin: me.isAdmin, isRealtor: me.isRealtor } });
  }
  if (action === "vac.status" || action === "vac.delete") {
    if (!id) return no("공실 번호가 없습니다.");
    if (!(await myVacancy(me.db, id, uid, me.isAdmin))) return no("내 공실이 아닙니다.", 403);
    if (action === "vac.delete") {
      const res = await deleteVacancy(id);
      return res.success ? ok() : no(res.error || "삭제하지 못했습니다.", 500);
    }
    const status = body.status === "ACTIVE" ? "ACTIVE" : body.status === "STOPPED" ? "STOPPED" : "";
    if (!status) return no("바꿀 상태가 맞지 않습니다.");
    const res = await updateVacancyStatus(id, status);
    return res.success ? ok() : no(res.error || "상태를 바꾸지 못했습니다.", 400);
  }

  // ── 기사관리 ──
  if (action === "art.list") {
    if (!me.isAdmin) {
      const res = await getMyArticles(uid);
      if (!res.success) return no((res as { error?: string }).error || "기사를 불러오지 못했습니다.", 500);
      return ok({ data: (res as { data?: unknown[] }).data || [], isAdmin: false });
    }
    const page = Math.max(1, Number(body.page) || 1);
    const params: Record<string, unknown> = { page, limit: PAGE, orderBy: ["published_at", "updated_at", "created_at"].includes(body.sort) ? body.sort : "published_at", slim: true, noCache: true };
    const status = STATUS_PARAM[String(body.filter || "전체")];
    if (status) params.status = status;
    const kw = String(body.keyword || "").trim();
    if (kw) params.searchKeyword = kw;
    if (body.type === "헤드라인") params.is_headline = true;
    else if (body.type === "중요") params.is_important = true;
    else if (body.type === "일반기사") { params.is_headline = false; params.is_important = false; }
    const [list, counts] = await Promise.all([
      getArticles(params as Parameters<typeof getArticles>[0]),
      page === 1 ? getArticleTabCounts({ status: params.status as string | undefined, searchKeyword: params.searchKeyword as string | undefined }) : Promise.resolve(null),
    ]);
    if (!list.success) return no((list as { error?: string }).error || "기사를 불러오지 못했습니다.", 500);
    return ok({ data: (list as { data?: unknown[] }).data || [], count: (list as { count?: number }).count || 0, counts: counts && counts.success ? counts.data : null, isAdmin: true });
  }

  if (action.startsWith("art.")) {
    if (!id) return no("기사 번호가 없습니다.");
    if (!(await myArticle(me.db, id, uid, me.isAdmin))) return no("내 기사가 아닙니다.", 403);
    const adminOnly = ["art.approve", "art.reject", "art.flags"];
    if (adminOnly.includes(action) && !me.isAdmin) return no("최고관리자만 할 수 있습니다.", 403);

    if (action === "art.approve") {
      const res = await adminUpdateArticleStatus([id], "APPROVED");
      return res.success ? ok() : no(res.error || "승인하지 못했습니다.", 500);
    }
    if (action === "art.reject") {
      const reason = String(body.reason || "").trim();
      if (!reason) return no("반려 사유를 넣어 주세요.");
      const res = await adminUpdateArticleStatus([id], "REJECTED", reason);
      return res.success ? ok() : no(res.error || "반려하지 못했습니다.", 500);
    }
    if (action === "art.request") {
      const { data: a } = await me.db.from("articles").select("status").eq("id", id).maybeSingle();
      if (!a || (a.status !== "DRAFT" && a.status !== "REJECTED")) return no("작성중 또는 반려된 기사만 승인신청할 수 있습니다.");
      const res = await adminUpdateArticleStatus([id], "PENDING");
      if (!res.success) return no(res.error || "승인신청하지 못했습니다.", 500);
      // 사이트 모바일과 같이 AI 검토를 뒤에서 돌린다
      fetch(`${req.nextUrl.origin}/api/agents/article-review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ articleIds: [id] }) }).catch(() => {});
      return ok();
    }
    if (action === "art.flags") {
      const res = await adminUpdateArticleFlags(id, !!body.important, !!body.headline);
      return res.success ? ok() : no(res.error || "기사 구분을 바꾸지 못했습니다.", 500);
    }
    if (action === "art.delete") {
      const res = await deleteArticle(id);
      return res.success ? ok() : no(res.error || "삭제하지 못했습니다.", 500);
    }
  }

  return no("모르는 요청입니다.");
}
