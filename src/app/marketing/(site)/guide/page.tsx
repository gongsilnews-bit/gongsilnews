import React from "react";
import Link from "next/link";
import StudioSiteHeader from "@/components/studio-site/StudioSiteHeader";
import { createClient } from "@/utils/supabase/server";
import { isAdminRole } from "@/utils/permissionCheck";
import { GUIDE_BOARD, postYoutube } from "@/components/studio-site/guideUtil";

export const dynamic = "force-dynamic";
export const metadata = { title: "사용법 배우기 | 공실마케팅", description: "공실마케팅 사용법 영상" };

/**
 * 사용법 배우기 (/marketing/guide) — 브루 튜토리얼처럼 유튜브 영상 카드 4열 (2026-10-26 사장님)
 * 글은 게시판 studio_guide (글쓰기는 기존 /board_write, 최고관리자만). 썸네일은 유튜브 영상 그림.
 */
export default async function StudioGuidePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q || "").trim();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let admin = false;
  if (user) {
    const { data: m } = await supabase.from("members").select("role").eq("id", user.id).maybeSingle();
    admin = isAdminRole(m?.role);
  }
  let query = supabase.from("board_posts").select("id, title, youtube_url, content, thumbnail_url, created_at").eq("board_id", GUIDE_BOARD).order("created_at", { ascending: true });
  if (q) query = query.ilike("title", `%${q}%`);
  const { data } = await query;
  const posts = data || [];

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "'Pretendard Variable','Pretendard',-apple-system,sans-serif", color: "#111827" }}>
      <StudioSiteHeader />
      <main style={{ maxWidth: 1260, margin: "0 auto", padding: "28px 24px 96px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 22 }}>
          <h1 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>사용법 배우기 <span style={{ color: "#e8890c", fontWeight: 800 }}>{posts.length}</span></h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {admin && <Link href={`/board_write?board_id=${GUIDE_BOARD}`} style={{ padding: "8px 14px", borderRadius: 8, background: "#e8890c", color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>영상 올리기</Link>}
            <form action="/marketing/guide" style={{ display: "flex", alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 6, padding: "0 10px", height: 36 }}>
              <input name="q" defaultValue={q} placeholder="Search" style={{ border: 0, outline: "none", fontSize: 14, width: 180 }} />
              <button type="submit" aria-label="검색" style={{ background: "none", border: 0, cursor: "pointer", color: "#6b7280", display: "flex" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /></svg>
              </button>
            </form>
          </div>
        </div>

        {posts.length === 0 ? (
          <div style={{ padding: "100px 0", textAlign: "center", color: "#94a3b8", fontSize: 15 }}>{q ? "찾는 영상이 없어요." : "사용법 영상을 준비하고 있어요."}</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32 }}>
            {posts.map((p) => {
              const yt = postYoutube(p);
              const img = yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : p.thumbnail_url;
              return (
                <Link key={p.id} href={`/marketing/guide/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ aspectRatio: "16 / 9", background: img ? `#000 url(${img}) center / cover no-repeat` : "#f3f4f6" }} />
                  <div style={{ marginTop: 10, fontSize: 15, fontWeight: 600, lineHeight: 1.45 }}>{p.title}</div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
