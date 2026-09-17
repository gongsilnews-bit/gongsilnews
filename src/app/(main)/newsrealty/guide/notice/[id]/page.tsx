"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import NewsrealtyHeader from "@/components/newsrealty/NewsrealtyHeader";
import GuideTabs from "@/components/newsrealty/GuideTabs";
import { getBoardPost, incrementBoardView } from "@/app/actions/board";

/**
 * 공실뉴스부동산 공지 상세
 *
 * 공용 /board_read 로 보내면 공실뉴스 본 사이트 헤더가 떠서 공실뉴스부동산
 * 안에 있다가 밖으로 나간 것처럼 보인다. 메인 헤더는 /newsrealty 경로에서
 * 스스로 숨으므로(Header.tsx), 이 경로에 상세를 두어 헤더·탭을 유지한다.
 */

type Attachment = { id: string; file_url: string; file_name: string; file_type?: string | null };
type Post = {
  id: string;
  title: string;
  content: string | null;
  author_name: string | null;
  created_at: string;
  view_count: number | null;
  board_attachments?: Attachment[];
};

function splitTag(title: string): { tag: string; clean: string } {
  const m = (title || "").match(/^\[([^\]]+)\]\s*/);
  if (!m) return { tag: "공지", clean: title || "" };
  return { tag: m[1], clean: (title || "").slice(m[0].length) };
}

const formatDate = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

export default function GuideNoticeDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void getBoardPost(id).then(res => {
      if (res.success && res.data) setPost(res.data as Post);
      setLoading(false);
    });
    void incrementBoardView(id);
  }, [id]);

  const { tag, clean } = splitTag(post?.title || "");
  const images = (post?.board_attachments || []).filter(a => (a.file_type || "").startsWith("image/"));
  const files = (post?.board_attachments || []).filter(a => !(a.file_type || "").startsWith("image/"));

  return (
    <div style={{ backgroundColor: "#ffffff", color: "#1e293b", minHeight: "100vh", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      <NewsrealtyHeader />
      <GuideTabs activeTab="notice" />

      <main style={{ maxWidth: "960px", margin: "0 auto 100px", padding: "0 20px" }}>
        {loading ? (
          <div style={{ padding: "80px 20px", textAlign: "center", color: "#94a3b8", fontSize: "14.5px" }}>불러오는 중...</div>
        ) : !post ? (
          <div style={{ padding: "80px 20px", textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "16px" }}>공지사항을 찾을 수 없습니다.</div>
            <Link href="/newsrealty/guide/notice" style={{ color: "#ff8e15", fontWeight: 700, textDecoration: "none" }}>
              목록으로 돌아가기
            </Link>
          </div>
        ) : (
          <>
            {/* 제목 영역 */}
            <div style={{ borderTop: "2px solid #111827", paddingTop: "28px", paddingBottom: "20px", borderBottom: "1px solid #e5e7eb" }}>
              <span style={{ display: "inline-block", fontSize: "13px", fontWeight: 800, color: "#ff8e15", marginBottom: "10px" }}>
                [{tag}]
              </span>
              <h1 style={{ fontSize: "23px", fontWeight: 800, color: "#111827", margin: "0 0 14px 0", lineHeight: 1.4, letterSpacing: "-0.5px" }}>
                {clean}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "13.5px", color: "#94a3b8" }}>
                <span style={{ fontWeight: 700, color: "#64748b" }}>{post.author_name || "공실뉴스부동산"}</span>
                <span>{formatDate(post.created_at)}</span>
                <span style={{ marginLeft: "auto" }}>조회 {post.view_count || 0}</span>
              </div>
            </div>

            {/* 본문 */}
            <div style={{ padding: "32px 4px 40px", fontSize: "15.5px", lineHeight: 1.85, color: "#334155", whiteSpace: "pre-wrap", minHeight: "160px" }}>
              {post.content || "내용이 없습니다."}
            </div>

            {/* 이미지 첨부 */}
            {images.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "32px" }}>
                {images.map(a => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={a.id} src={a.file_url} alt={a.file_name} style={{ maxWidth: "100%", borderRadius: "10px", border: "1px solid #e5e7eb" }} />
                ))}
              </div>
            )}

            {/* 파일 첨부 */}
            {files.length > 0 && (
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px 20px", marginBottom: "32px" }}>
                <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#1e293b", marginBottom: "10px" }}>
                  첨부파일 ({files.length}개)
                </div>
                {files.map(a => (
                  <a
                    key={a.id}
                    href={a.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "block", padding: "6px 0", fontSize: "14px", color: "#2563eb", textDecoration: "none" }}
                  >
                    {a.file_name}
                  </a>
                ))}
              </div>
            )}

            {/* 목록으로 */}
            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "24px", textAlign: "center" }}>
              <Link
                href="/newsrealty/guide/notice"
                style={{
                  display: "inline-block", padding: "12px 32px", backgroundColor: "#111827", color: "#ffffff",
                  fontSize: "14.5px", fontWeight: 700, borderRadius: "8px", textDecoration: "none",
                }}
              >
                목록으로
              </Link>
            </div>
          </>
        )}
      </main>

      <footer style={{ backgroundColor: "#0f172a", borderTop: "1px solid #1e293b", padding: "30px 20px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
        © {new Date().getFullYear()} 공실뉴스부동산. All rights reserved. 대표전화 1555-5343
      </footer>
    </div>
  );
}
