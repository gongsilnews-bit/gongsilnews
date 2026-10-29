import { NextResponse, type NextRequest } from "next/server";

/**
 * 회원 홈페이지로 넘겨주는 길 (2026-10-29) — /go/{주소}/{경로} → https://{주소}.gongsilnews.com/{경로}
 * 카카오톡 공유는 카카오에 등록한 도메인(www.gongsilnews.com)으로만 링크를 보내 준다.
 * 회원마다 다른 홈페이지 주소(happy.gongsilnews.com)는 등록할 수 없어서, 공유 링크는 이 길을 거친다.
 * 우리 하위 주소로만 넘긴다 (아무 사이트로나 보내는 길이 되지 않게).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ sub: string; path?: string[] }> }) {
  const { sub, path = [] } = await params;
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(sub) || ["www", "admin", "api"].includes(sub.toLowerCase())) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  const rest = path.map((p) => encodeURIComponent(decodeURIComponent(p))).join("/");
  const target = new URL(`https://${sub.toLowerCase()}.gongsilnews.com/${rest}`);
  target.search = req.nextUrl.search;
  target.hash = "";
  return NextResponse.redirect(target, 302);
}
