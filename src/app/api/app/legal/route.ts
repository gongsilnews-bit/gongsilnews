// 앱 이용약관 · 개인정보처리방침 (2026-11-18 사장님: 누르면 앱 화면으로)
//  약관 글은 사이트 화면(/m/terms · /com/privacy.html)에만 적혀 있다 — 그 화면을 그대로 읽어 제목·문단·목록으로 나눠 준다
//  그래서 사이트 약관을 고치면 앱도 저절로 같아진다 (글을 두 곳에 두지 않음)
//  GET ?doc=terms | privacy → { title, blocks: [{ t: "h1"|"chapter"|"h2"|"h3"|"p"|"li", text }] }
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 3600;

const PAGES: Record<string, { path: string; title: string }> = {
  terms: { path: "/m/terms", title: "이용약관" },
  privacy: { path: "/com/privacy.html", title: "개인정보처리방침" },
};

const decode = (s: string) => s
  .replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")
  .replace(/&quot;/g, "\"").replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
  .replace(/[ \t]+/g, " ").replace(/\n /g, "\n").trim();

export async function GET(req: NextRequest) {
  const doc = PAGES[req.nextUrl.searchParams.get("doc") || ""];
  if (!doc) return NextResponse.json({ success: false, error: "알 수 없는 문서입니다." }, { status: 400 });
  const r = await fetch(new URL(doc.path, req.nextUrl.origin), { next: { revalidate: 3600 } }).catch(() => null);
  if (!r?.ok) return NextResponse.json({ success: false, error: "약관을 불러오지 못했습니다." }, { status: 502 });
  let html = await r.text();
  // 본문만 — 사이트 머리줄(뒤로가기·제목)과 스크립트는 뺀다
  html = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<header[\s\S]*?<\/header>/gi, "");
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || html;
  const blocks: { t: string; text: string }[] = [];
  const re = /<(h1|h2|h3|p|li)\b[^>]*>([\s\S]*?)<\/\1>|<div\b[^>]*>(제\s*\d+\s*장[^<]*)<\/div>/gi;
  for (let m: RegExpExecArray | null; (m = re.exec(body)); ) {
    const t = m[3] ? "chapter" : m[1].toLowerCase();
    const text = decode(m[3] || m[2]);
    if (!text) continue;
    const prev = blocks[blocks.length - 1];
    if (prev && prev.text === text) continue;
    blocks.push({ t, text });
  }
  return NextResponse.json({ success: true, title: doc.title, blocks }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
