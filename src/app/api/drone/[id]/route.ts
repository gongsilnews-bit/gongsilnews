import { NextResponse, type NextRequest } from "next/server";
import { r2Ready, r2Url } from "@/lib/r2";

/**
 * 기사 속 공실뉴스 드론 영상 — 영상은 R2 에서 브라우저로 바로 간다 (2026-11-09 사장님: "vercel 이 아니라 r2 에서 바로")
 *  이 주소는 영상 데이터를 보내지 않는다. 잠깐 열리는 R2 주소로 넘겨 주기(302)만 한다 → Vercel 전송량 0, R2 는 전송 요금 없음
 *  GET /api/drone/{id}          → drone/{id}.mp4
 *  GET /api/drone/{id}?thumb=1  → drone/thumbs/{id}.jpg (기사 속 첫 화면)
 *  기사는 누구나 읽으므로 로그인은 보지 않는다. 대신 다른 사이트가 퍼 가지 못하게 우리 사이트에서 연 것만 넘겨 준다.
 */
const OK_HOST = /(^|\.)gongsilnews\.com$|^localhost$|^127\.0\.0\.1$|\.vercel\.app$/i;

function fromOurSite(req: NextRequest): boolean {
  const ref = req.headers.get("referer");
  if (!ref) return true; // 주소창에 바로 치거나 앱·일부 브라우저는 보내지 않는다 — 막으면 정상 독자도 막힌다
  try { return OK_HOST.test(new URL(ref).hostname); } catch { return false; }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
  const id = (raw || "").replace(/[^\w-]/g, "");
  if (!id || !r2Ready()) return new NextResponse("not found", { status: 404 });
  if (!fromOurSite(req)) return new NextResponse("forbidden", { status: 403 });
  const thumb = req.nextUrl.searchParams.get("thumb") === "1";
  const url = r2Url(thumb ? `drone/thumbs/${id}.jpg` : `drone/${id}.mp4`);
  // R2 주소는 6시간 열린다 — 넘겨 주기는 30분만 기억하게 해서 늘 열린 주소로 간다
  return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "private, max-age=1800" } });
}
