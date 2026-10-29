import { NextResponse, type NextRequest } from "next/server";
import { getExtensionMember } from "@/utils/extensionMember";
import { savePromoFor, PROMO_CHANNELS, type PromoChannel } from "@/utils/vacancyPromos";
import { saveArticlePromoFor } from "@/utils/articlePromos";
import { createClient } from "@supabase/supabase-js";

const adminDb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

/**
 * 인스타그램·페이스북 지운 글 확인 (2026-10-29 사장님) — 로그인 없이는 서버가 못 보니 도우미 확장이 평소 크롬에서 연다
 *  GET → { urls } 확인할 내 링크 · POST { gone: url } → 그 링크 연결을 푼다 (본인 것만)
 */
export async function GET(req: NextRequest) {
  const member = await getExtensionMember(req);
  if (!member) return NextResponse.json({ success: false, urls: [] }, { status: 401 });
  const db = adminDb();
  const CH = ["instagram", "facebook", "threads"]; // 스레드도 — 로그인 없이는 늘 같은 화면 (2026-10-29)
  const [{ data: v }, { data: a }] = await Promise.all([
    db.from("vacancy_promos").select("url").eq("owner_id", member.id).in("channel", CH),
    db.from("article_promos").select("url").eq("owner_id", member.id).in("channel", CH),
  ]);
  const urls = [...new Set([...(v || []), ...(a || [])].map((r) => String(r.url)).filter((u) => /^https:\/\/www\.(instagram|facebook|threads)\.(com|net)\//.test(u)))];
  return NextResponse.json({ success: true, urls });
}

/**
 * 공실 홍보현황 — 회원이 발행한 글 주소 (2026-10-27)
 *  POST { vacancyId, channel, url } → 앱이 도우미(크롬 확장)에게서 받은 주소를 "연결됨"으로 저장
 *  POST { articleNo, channel, url } → 홈 "내 기사"로 쓴 글이면 기사 홍보현황에 (2026-10-28)
 * 로그인 쿠키(앱 창)로 회원을 확인한다.
 */
export async function POST(req: NextRequest) {
  const member = await getExtensionMember(req);
  if (!member) return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (typeof body?.gone === "string" && /^https:\/\/www\.(instagram|facebook|threads)\.(com|net)\//.test(body.gone)) {
    const db = adminDb();
    const [{ data: v }, { data: a }] = await Promise.all([
      db.from("vacancy_promos").delete().eq("owner_id", member.id).eq("url", body.gone).select("id"),
      db.from("article_promos").delete().eq("owner_id", member.id).eq("url", body.gone).select("id"),
    ]);
    return NextResponse.json({ success: true, removed: (v || []).length + (a || []).length });
  }
  const channel = body?.channel as PromoChannel;
  const articleNo = typeof body?.articleNo === "string" && /^\d+$/.test(body.articleNo) ? body.articleNo : "";
  if ((typeof body?.vacancyId !== "string" && !articleNo) || !PROMO_CHANNELS.includes(channel) || typeof body?.url !== "string" || !body.url.trim()) {
    return NextResponse.json({ success: false, error: "잘못된 요청입니다." }, { status: 400 });
  }
  const r = articleNo
    ? await saveArticlePromoFor(member.id, { no: articleNo }, channel, body.url, "helper")
    : await savePromoFor(member.id, body.vacancyId, channel, body.url, "helper");
  return NextResponse.json(r, { status: r.success ? 200 : 400 });
}
