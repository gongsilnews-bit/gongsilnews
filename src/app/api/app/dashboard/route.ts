// 안드로이드 앱 대시보드 (2026-11-17: MY 탭이 사이트 /m/admin/dashboard 를 띄우면 로그인이 안 넘어가 앱 화면으로 옮김)
//  사이트 모바일 /m/admin/dashboard 가 쓰는 같은 서버 함수를 그대로 부른다 → 같은 숫자·같은 목록
//  누가 부르는지는 앱이 보낸 로그인 토큰으로 정한다. 다른 회원 자료(전체 숫자·최근 가입 회원)는 최고관리자만 본다.
//
//  POST { action: "dash.get", refresh? } → { role, agencyStatus, rejectReason, stats, recentVacancies, recentMembers, recentArticles, recentComments }
//    role: "admin" | "realtor" | "user" (사이트와 같은 규칙 — 부동산은 사무소 승인(APPROVED)까지 된 회원만)
import { NextRequest, NextResponse } from "next/server";
import { adminGetDashboardData, memberGetDashboardData } from "@/app/admin/actions";
import { no, whoAmI } from "../auth";

const ok = (data: Record<string, unknown> = {}) => NextResponse.json({ success: true, ...data });

export async function POST(req: NextRequest) {
  const me = await whoAmI(req);
  if (!me) return no("로그인이 필요합니다.", 401);
  const body = await req.json().catch(() => null);
  const action = String(body?.action || "");
  const uid = me.user.id;

  if (action === "dash.get") {
    // 사이트 화면과 같이 — 최고관리자가 아니면 내 사무소 승인 상태를 같이 본다
    let role: "admin" | "realtor" | "user" = "user";
    let agencyStatus: string | null = null;
    let rejectReason: string | null = null;
    if (me.isAdmin) {
      role = "admin";
    } else {
      const { data: agency } = await me.db.from("agencies").select("status, reject_reason").eq("owner_id", uid).maybeSingle();
      if (agency) {
        agencyStatus = agency.status || null;
        rejectReason = agency.reject_reason || null;
        const r = String(me.member.role || "").toUpperCase();
        if (["REALTOR", "부동산회원"].includes(r) && agency.status === "APPROVED") role = "realtor";
      }
    }

    if (role === "admin") {
      const res: any = await adminGetDashboardData({ noCache: !!body?.refresh });
      if (!res.success) return no(res.error || "대시보드를 불러오지 못했습니다.", 500);
      return ok({
        role, agencyStatus, rejectReason,
        stats: {
          vacanciesCount: res.stats?.vacanciesCount || 0,
          membersCount: res.stats?.membersCount || 0,
          articlesCount: res.stats?.articlesCount || 0,
          commentsCount: res.stats?.commentsCount || 0,
        },
        recentVacancies: res.recentVacancies || [],
        recentMembers: res.recentMembers || [],
        recentArticles: [],
        recentComments: res.recentComments || [],
      });
    }

    // 회원은 본인 것만 — 번호는 토큰에서 꺼낸 내 번호만 쓴다 (앱이 보낸 번호는 받지 않음)
    const res: any = await memberGetDashboardData(uid);
    if (!res.success) return no(res.error || "대시보드를 불러오지 못했습니다.", 500);
    return ok({
      role, agencyStatus, rejectReason,
      stats: {
        vacanciesCount: res.stats?.vacanciesCount || 0,
        membersCount: 0,
        articlesCount: res.stats?.articlesCount || 0,
        commentsCount: res.stats?.commentsCount || 0,
      },
      recentVacancies: res.recentVacancies || [],
      recentMembers: [],
      recentArticles: res.recentArticles || [],
      recentComments: res.recentComments || [],
    });
  }

  return no("알 수 없는 요청입니다.");
}
