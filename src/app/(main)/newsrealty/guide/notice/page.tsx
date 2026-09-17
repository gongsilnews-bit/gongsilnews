"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import NewsrealtyHeader from "@/components/newsrealty/NewsrealtyHeader";
import GuideTabs from "@/components/newsrealty/GuideTabs";
import { getBoardPosts } from "@/app/actions/board";

type NoticeRow = {
  id: string;
  title: string;
  tag: string;
  date: string;
};

/** 제목 앞 [카테고리] 뱃지를 분리한다 (게시판 글쓰기가 붙이는 규칙) */
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

export default function GuideNoticePage() {
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [loading, setLoading] = useState(true);

  // 공지사항 게시판(notice)을 그대로 읽는다. 관리자가 게시판에 올리면 여기에도 바로 반영된다.
  useEffect(() => {
    void getBoardPosts("notice").then(res => {
      if (res.success && res.data) {
        setNotices(
          res.data.map((p: { id: string; title: string; created_at: string }) => {
            const { tag, clean } = splitTag(p.title);
            return { id: p.id, title: clean, tag, date: formatDate(p.created_at) };
          })
        );
      }
      setLoading(false);
    });
  }, []);

  return (
    <div style={{ backgroundColor: "#ffffff", color: "#1e293b", minHeight: "100vh", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* ━━━ GNB 헤더 ━━━ */}
      <NewsrealtyHeader />

      {/* ━━━ 4분할 탭 ━━━ */}
      <GuideTabs activeTab="notice" />

      {/* ━━━ 본문 영역 ━━━ */}
      <main style={{ maxWidth: "960px", margin: "0 auto 100px", padding: "0 20px" }}>
        {/* 타이틀 */}
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#111827", margin: "0 0 6px 0", letterSpacing: "-0.5px" }}>
            공지사항
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
            공실뉴스부동산의 새로운 소식과 주요 정책 변경 사항을 전해드립니다.
          </p>
        </div>

        {/* 목록 */}
        <div style={{ borderTop: "2px solid #111827" }}>
          {loading ? (
            <div style={{ padding: "60px 20px", textAlign: "center", color: "#94a3b8", fontSize: "14.5px" }}>
              불러오는 중...
            </div>
          ) : notices.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center", color: "#94a3b8", fontSize: "14.5px" }}>
              등록된 공지사항이 없습니다.
            </div>
          ) : (
            notices.map(item => (
              <Link
                key={item.id}
                href={`/newsrealty/guide/notice/${item.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "20px 8px",
                  borderBottom: "1px solid #e5e7eb",
                  textDecoration: "none",
                  color: "inherit",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#fafafa"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <span style={{ flexShrink: 0, fontSize: "14px", fontWeight: 800, color: "#ff8e15" }}>
                  [{item.tag}]
                </span>
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "#111827",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.title}
                </span>
                <span style={{ flexShrink: 0, fontSize: "13.5px", color: "#94a3b8" }}>{item.date}</span>
              </Link>
            ))
          )}
        </div>
      </main>

      {/* ━━━ 푸터 ━━━ */}
      <footer style={{ backgroundColor: "#0f172a", borderTop: "1px solid #1e293b", padding: "30px 20px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
        © {new Date().getFullYear()} 공실뉴스부동산. All rights reserved. 대표전화 1555-5343
      </footer>
    </div>
  );
}
