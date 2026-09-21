"use client";

import React from "react";

/**
 * 중개사 서브도메인에서 읽는 기사 화면.
 *
 * 포털의 NewsReadContent 를 가져다 쓰지 않는다. 그 화면은 인기기사·관련기사를
 * 옆에 달고 있는데, 그게 곧 다른 중개사의 기사다. 여기서는 본문만 보여주고
 * 다시 접수로 돌려보낸다.
 */

const THEMES: Record<string, { primary: string; secondary: string; dark: string }> = {
  teal: { primary: "#00788c", secondary: "#00c6d7", dark: "#003845" },
  gold: { primary: "#bfa068", secondary: "#e6cc9f", dark: "#3e301b" },
  green: { primary: "#005f4d", secondary: "#4fb89e", dark: "#002820" },
  burgundy: { primary: "#7c1f2d", secondary: "#ff9ea7", dark: "#380d13" },
  orange: { primary: "#f27405", secondary: "#ffac63", dark: "#5e2609" },
};

interface Props {
  subdomain: string;
  settings: any;
  member: any;
  companyProfile: any;
  article: any;
}

export default function IntakeArticleClient({ settings, member, companyProfile, article }: Props) {
  const cfg = settings?.intake || {};
  const theme = THEMES[cfg.theme_color as string] || THEMES.teal;

  const officeName =
    settings?.site_title ||
    companyProfile?.name ||
    companyProfile?.company_name ||
    member?.name ||
    "부동산";

  const goIntake = () => {
    window.location.href = "/#intake";
  };

  return (
    <div style={{ fontFamily: "'Pretendard Variable', -apple-system, sans-serif", color: "#1e293b", background: "#fff", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── 상단 바 (접수장과 같은 틀) ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "#fff",
          borderBottom: "1px solid #eef1f4",
          padding: "0 20px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, textDecoration: "none" }}>
          {settings?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logo_url} alt={officeName} style={{ height: 30, objectFit: "contain" }} />
          ) : null}
          <span style={{ fontSize: 17, fontWeight: 800, color: theme.dark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {officeName}
          </span>
        </a>
        <button
          type="button"
          onClick={goIntake}
          style={{ padding: "8px 16px", background: theme.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: "pointer" }}
        >
          물건 접수
        </button>
      </header>

      {!article ? (
        <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 20px", textAlign: "center", color: "#64748b" }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>📄</div>
          <p style={{ fontSize: 17, fontWeight: 800, color: "#1e293b", margin: "0 0 8px 0" }}>기사를 찾을 수 없습니다</p>
          <p style={{ fontSize: 14.5, margin: "0 0 26px 0" }}>삭제되었거나 존재하지 않는 기사입니다.</p>
          <a href="/" style={{ padding: "13px 28px", background: theme.primary, color: "#fff", borderRadius: 10, fontSize: 15, fontWeight: 800, textDecoration: "none" }}>
            접수장으로 돌아가기
          </a>
        </main>
      ) : (
        <main style={{ flex: 1, maxWidth: 780, width: "100%", margin: "0 auto", padding: "48px 20px 0" }}>
          <p style={{ fontSize: 13.5, fontWeight: 800, color: theme.primary, margin: "0 0 12px 0", letterSpacing: "-0.2px" }}>
            {[article.section1, article.section2].filter(Boolean).join(" · ")}
          </p>

          <h1 style={{ fontSize: 31, fontWeight: 900, lineHeight: 1.45, letterSpacing: "-0.8px", color: "#0f172a", margin: "0 0 14px 0", wordBreak: "keep-all" }}>
            {article.title}
          </h1>

          {article.subtitle && (
            <p style={{ fontSize: 17, color: "#475569", lineHeight: 1.7, margin: "0 0 20px 0", wordBreak: "keep-all" }}>
              {article.subtitle}
            </p>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "#94a3b8", fontWeight: 600, paddingBottom: 22, borderBottom: "1px solid #eef1f4", marginBottom: 30 }}>
            <span style={{ fontWeight: 800, color: "#475569" }}>{article.author_name || officeName}</span>
            <span>·</span>
            <span>{(article.published_at || article.created_at || "").slice(0, 10).replace(/-/g, ".")}</span>
          </div>

          {article.thumbnail_url && !(article.content || "").includes(article.thumbnail_url) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={article.thumbnail_url} alt="" style={{ width: "100%", borderRadius: 12, marginBottom: 28 }} />
          )}

          <style>{`
            .intake-article-body { font-size: 17px; line-height: 1.85; color: #1f2937; word-break: keep-all; }
            .intake-article-body img { max-width: 100%; height: auto; border-radius: 10px; margin: 20px 0; }
            .intake-article-body p { margin: 0 0 18px 0; }
            .intake-article-body h2, .intake-article-body h3 { font-weight: 800; color: #0f172a; margin: 32px 0 12px; line-height: 1.5; }
            .intake-article-body a { color: ${theme.primary}; }
            .intake-article-body iframe { max-width: 100%; }
            .intake-article-body table { max-width: 100%; }
          `}</style>
          <div className="intake-article-body" dangerouslySetInnerHTML={{ __html: article.content || "" }} />

          {/* 기사를 다 읽은 사람을 다시 접수로 — 접수 경로가 하나 더 생긴다 */}
          <section style={{ margin: "56px 0 64px", background: theme.dark, borderRadius: 16, padding: "42px 28px", textAlign: "center", color: "#fff" }}>
            <p style={{ fontSize: 15.5, color: "rgba(255,255,255,0.75)", margin: "0 0 10px 0" }}>{officeName}</p>
            <h2 style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.5, margin: "0 0 24px 0", wordBreak: "keep-all" }}>
              내놓을 물건이 있으신가요?<br />
              <span style={{ color: theme.secondary }}>1분이면 접수 끝납니다</span>
            </h2>
            <button
              type="button"
              onClick={goIntake}
              style={{ padding: "16px 40px", background: theme.primary, color: "#fff", border: "none", borderRadius: 12, fontSize: 16.5, fontWeight: 800, cursor: "pointer", boxShadow: `0 10px 24px ${theme.primary}55` }}
            >
              물건 접수하기
            </button>
          </section>
        </main>
      )}

      <footer style={{ background: theme.dark, color: "rgba(255,255,255,0.55)", padding: "26px 20px", textAlign: "center", fontSize: 13, lineHeight: 1.8 }}>
        <div>{officeName}</div>
        <div>
          powered by{" "}
          <a href="https://www.gongsilnews.com" target="_blank" rel="noopener noreferrer" style={{ color: theme.secondary, textDecoration: "none" }}>
            공실뉴스
          </a>
        </div>
      </footer>
    </div>
  );
}
