import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import StudioSiteHeader from "@/components/studio-site/StudioSiteHeader";
import { createClient } from "@/utils/supabase/server";
import { isAdminRole } from "@/utils/permissionCheck";
import { incrementBoardView } from "@/app/actions/board";
import { GUIDE_BOARD, postYoutube } from "@/components/studio-site/guideUtil";

export const dynamic = "force-dynamic";

/** 사용법 영상 한 편 (/studio/guide/[id]) — 제목 · 조회수 · 유튜브 영상 · 설명 (2026-10-26, 브루 튜토리얼 보기처럼 깔끔하게) */
export default async function StudioGuideRead({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: p } = await supabase.from("board_posts").select("*").eq("id", id).maybeSingle();
  if (!p || p.board_id !== GUIDE_BOARD) notFound();
  void incrementBoardView(id);
  const { data: { user } } = await supabase.auth.getUser();
  let admin = false;
  if (user) {
    const { data: m } = await supabase.from("members").select("role").eq("id", user.id).maybeSingle();
    admin = isAdminRole(m?.role);
  }
  const yt = postYoutube(p);
  // 본문은 유튜브 주소만 있는 경우가 많아서, 주소는 빼고 남은 글만 보여 준다
  const text = String(p.content || "")
    .replace(/<br\s*\/?>|<\/p>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/https?:\/\/\S*youtu\S*/g, "").replace(/&nbsp;/g, " ").replace(/\n{3,}/g, "\n\n").trim();

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "'Pretendard Variable','Pretendard',-apple-system,sans-serif", color: "#111827" }}>
      <StudioSiteHeader />
      <main style={{ maxWidth: 1260, margin: "0 auto", padding: "28px 24px 96px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 12px" }}>{p.title}</h1>
        <div style={{ display: "flex", gap: 10, fontSize: 13, color: "#6b7280", paddingBottom: 20, borderBottom: "1px solid #e5e7eb" }}>
          <Link href="/studio/guide" style={{ color: "#6b7280", textDecoration: "none" }}>사용법 배우기</Link>
          {p.category && <span>{p.category}</span>}
          <span>조회수 {((p.view_count || 0) + 1).toLocaleString()}</span>
          {admin && <Link href={`/board_write?board_id=${GUIDE_BOARD}&id=${p.id}`} style={{ marginLeft: "auto", color: "#e8890c", fontWeight: 700, textDecoration: "none" }}>수정</Link>}
        </div>

        {yt ? (
          <div style={{ maxWidth: 860, margin: "40px auto 0", aspectRatio: "16 / 9" }}>
            <iframe src={`https://www.youtube.com/embed/${yt}`} title={p.title} style={{ width: "100%", height: "100%", border: 0 }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        ) : (
          <div style={{ maxWidth: 860, margin: "40px auto 0", padding: "80px 0", textAlign: "center", color: "#94a3b8", background: "#f8fafc", borderRadius: 12 }}>영상 주소가 아직 없어요</div>
        )}

        {text && <div style={{ maxWidth: 860, margin: "32px auto 0", fontSize: 16, lineHeight: 1.8, color: "#374151", whiteSpace: "pre-line" }}>{text}</div>}

        <div style={{ maxWidth: 860, margin: "48px auto 0", textAlign: "center" }}>
          <Link href="/studio/guide" style={{ display: "inline-block", padding: "10px 22px", border: "1px solid #d1d5db", borderRadius: 8, color: "#374151", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>목록으로</Link>
        </div>
      </main>
    </div>
  );
}
