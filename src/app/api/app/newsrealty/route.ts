// 안드로이드 앱 공실뉴스부동산 신청 (2026-11-18 사장님: 소개·신청을 앱 화면으로, 네이버 결제는 빼고 신청만)
//  저장은 사이트 신청 화면과 같은 submitNewsrealtyApplication → 관리자 [승인·결제 › 공실뉴스부동산 가입]에 그대로 들어온다
//  구글 플레이 결제 규칙 때문에 앱에서는 가격·결제 안내를 하지 않는다 — 이용 안내는 담당자가 따로
//
//  POST { action: "get" }    → 내 기존 신청(있으면 상태) · 신청서에 채울 내 정보(이름·연락처·이메일·사무소)
//  POST { action: "submit", name, phone, email, agencyName, agreeTerms, agreeArticle }
import { NextRequest, NextResponse } from "next/server";
import { checkExistingNewsrealtyApplication, submitNewsrealtyApplication } from "@/app/actions/newsrealtyApply";
import { no, whoAmI } from "../auth";

const ok = (data: Record<string, unknown> = {}) => NextResponse.json({ success: true, ...data });
const str = (v: unknown, max = 120) => String(v ?? "").trim().slice(0, max);
// 사이트 신청 화면(StudioApplyView ARTICLE_TERMS_VERSION)과 같은 이름 — 약관을 바꾸면 둘 다
const ARTICLE_TERMS_VERSION = "기사작성약관 2026-11-06";

export async function POST(req: NextRequest) {
  const me = await whoAmI(req);
  if (!me) return no("로그인이 필요합니다.", 401);
  const uid = me.user.id;
  const body = await req.json().catch(() => null);
  const action = String(body?.action || "");

  if (action === "get") {
    const [{ data: m }, { data: a }, existing] = await Promise.all([
      me.db.from("members").select("name, phone, email, plan_type").eq("id", uid).maybeSingle(),
      me.db.from("agencies").select("name").eq("owner_id", uid).maybeSingle(),
      checkExistingNewsrealtyApplication(uid),
    ]);
    const app = existing.exists && existing.application ? existing.application as { status?: string; created_at?: string } : null;
    return ok({
      me: { name: m?.name || "", phone: m?.phone || "", email: m?.email || me.user.email || "", agencyName: a?.name || "", plan: m?.plan_type || "" },
      application: app ? { status: app.status || "신규", created_at: app.created_at || null } : null,
    });
  }

  if (action === "submit") {
    const name = str(body?.name, 40);
    const phone = str(body?.phone, 20);
    const email = str(body?.email, 120);
    const agencyName = str(body?.agencyName, 80);
    if (!name) return no("신청자 성함을 입력해 주세요.");
    if (!phone) return no("연락처를 입력해 주세요.");
    if (!email) return no("E-mail을 입력해 주세요.");
    if (!agencyName) return no("중개사무소 이름을 입력해 주세요.");
    if (!body?.agreeTerms) return no("회원가입 약관에 동의해 주세요.");
    if (!body?.agreeArticle) return no("기사 작성 약관을 읽고 동의해 주세요.");
    const at = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
    const res = await submitNewsrealtyApplication({
      memberId: uid,
      name, phone, email, agencyName,
      interests: ["로컬기자", "부동산중개"],
      memo: `[앱 신청] 신청자: ${name} / 연락처: ${phone} / 이메일: ${email} / 중개사무소: ${agencyName} / ${ARTICLE_TERMS_VERSION} 동의 ${at}`,
    });
    if (!res.success) return NextResponse.json({ success: false, error: res.message || "신청하지 못했습니다.", alreadyApplied: !!(res as { alreadyApplied?: boolean }).alreadyApplied }, { status: 400 });
    return ok({ smsSent: !!(res as { smsSent?: boolean }).smsSent });
  }

  return no("알 수 없는 요청입니다.");
}
