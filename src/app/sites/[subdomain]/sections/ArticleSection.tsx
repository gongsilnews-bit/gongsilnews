"use client";

import React from "react";
import SectionTitle from "./SectionTitle";
import type { Theme } from "../theme";

interface Props {
  officeName: string;
  theme: Theme;
  articles: any[];
  /** 새 창 주소를 만든다. 로컬·미리보기에서는 /sites/{주소} 가 앞에 붙는다 */
  hrefFor: (path: string) => string;
}

/** 2026-09-21T11:30 → "2026.09.21 11:30" */
function pressDate(v?: string): string {
  if (!v) return "";
  const d = v.slice(0, 10).replace(/-/g, ".");
  const t = v.slice(11, 16);
  return t ? `${d} ${t}` : d;
}

/**
 * 기사 · 칼럼.
 *
 * 공실뉴스 기사 목록과 같은 모양으로 깐다 — 왼쪽 사진, 오른쪽 제목·요약·출처.
 * 중개사가 쓴 글이 신문 기사와 같은 꼴로 보여야 "광고 글"이 아니라 "취재한 사람"으로
 * 읽힌다. 카드로 만들면 아래 매물 카드와 섞여서 둘 다 흐려진다.
 *
 * 본문은 새 창으로 넘긴다. 이 탭에는 접수 폼이 그대로 남는다. 링크는 포털이 아니라
 * 이 서브도메인 안이다 — 포털 기사 화면에는 다른 중개사의 기사와 광고가 붙어 있다.
 */
export default function ArticleSection({ officeName, theme, articles, hrefFor }: Props) {
  /**
   * 매물과 같은 방식으로 새 창에 띄운다. 기사는 읽는 물건이라 창을 좀 더 넓게 잡는다.
   * 폰에는 팝업 창이 없으므로 모바일 서식(/m)으로 보낸다.
   */
  const open = (a: any) => {
    const key = a.article_no || a.id;
    const isPhone = typeof window !== "undefined" && window.innerWidth < 821;
    if (isPhone) {
      window.open(hrefFor(`/m/news/${key}`), "_blank", "noopener,noreferrer");
      return;
    }
    const popupW = Math.min(1180, Math.max(900, window.screen.width - 260));
    const popupH = Math.max(700, window.screen.height - 160);
    const left = Math.max(20, Math.round((window.screen.width - popupW) / 2));
    const features = `width=${popupW},height=${popupH},left=${left},top=50,resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no,location=no`;
    window.open(hrefFor(`/news/${key}`), `gongsil_article_popup_${key}`, features);
  };

  return (
    <section id="article" style={{ background: "#fff", padding: "56px 0 60px", scrollMarginTop: 54 }}>
      <SectionTitle theme={theme} label="COLUMN" title="기사 · 칼럼" desc={`${officeName}가 직접 쓴 글입니다`} />

      <div style={{ maxWidth: 940, margin: "0 auto", padding: "0 16px" }}>
        {articles.map((a, i) => (
          <article
            key={a.id}
            onClick={() => open(a)}
            className="gs-article-row"
            style={{
              display: "flex",
              gap: 14,
              padding: "18px 0",
              borderTop: i === 0 ? "1px solid #eaeef2" : "none",
              borderBottom: "1px solid #eaeef2",
              cursor: "pointer",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                flex: "0 0 auto",
                width: "clamp(112px, 20vw, 190px)",
                aspectRatio: "4/3",
                borderRadius: 2,
                overflow: "hidden",
                background: "#f1f3f5",
              }}
            >
              {a.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#c3ccd5", fontSize: 12, fontWeight: 800 }}>
                  공실뉴스
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h3
                style={{
                  margin: "0 0 7px 0",
                  fontSize: 16.5,
                  fontWeight: 800,
                  color: "#16202b",
                  lineHeight: 1.45,
                  letterSpacing: "-0.5px",
                  wordBreak: "keep-all",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {a.title}
              </h3>

              {a.subtitle && (
                <p
                  style={{
                    margin: "0 0 9px 0",
                    fontSize: 13.5,
                    color: "#6b7684",
                    lineHeight: 1.6,
                    wordBreak: "keep-all",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {a.subtitle}
                </p>
              )}

              <p style={{ margin: 0, fontSize: 12.5, color: "#a3adb8", fontWeight: 600 }}>
                <span style={{ color: theme.primary, fontWeight: 800 }}>
                  [공실뉴스{a.section1 ? ` > ${a.section1}` : ""}]
                </span>{" "}
                {pressDate(a.published_at || a.created_at)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
