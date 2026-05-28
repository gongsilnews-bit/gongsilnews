"use client";

import { useLayoutEffect } from "react";
import Link from "next/link";
import BannerSlot from "@/components/BannerSlot";

interface CategoryNewsGridProps {
  allNewsArticles?: any[];
  mapArticles?: any[];
  issueRightBanners?: any[];
  middleIssueBanners?: any[];
}

export default function CategoryNewsGrid({ allNewsArticles = [], mapArticles = [], issueRightBanners, middleIssueBanners }: CategoryNewsGridProps) {
  // PC 홈 스크롤 복원: 기사 클릭 후 뒤로가기 시 보던 위치로 즉시 복원 (깜빡임 제거)
  useLayoutEffect(() => {
    const savedScroll = sessionStorage.getItem('pc_home_scroll');
    if (savedScroll) {
      const scrollY = parseInt(savedScroll, 10);
      sessionStorage.removeItem('pc_home_scroll');
      window.scrollTo(0, scrollY);
      const origScrollTo = window.scrollTo;
      (window as any).scrollTo = function(...args: any[]) {
        let targetY: number | undefined;
        if (typeof args[0] === 'number') targetY = args[1] as number;
        else if (args[0] && typeof args[0] === 'object') targetY = (args[0] as ScrollToOptions).top;
        if (targetY === 0) return;
        return origScrollTo.apply(window, args as any);
      };
      setTimeout(() => { (window as any).scrollTo = origScrollTo; }, 300);
    }
  }, []);

  const saveScroll = () => sessionStorage.setItem('pc_home_scroll', window.scrollY.toString());
  // JS에서 새 카테고리별 분류
  const marketingArts = allNewsArticles.filter(a => a.section1 === "AI마케팅").slice(0, 2);
  const economyArts = allNewsArticles.filter(a => a.section1 === "부동산·경제").slice(0, 2);
  const lawArts = allNewsArticles.filter(a => a.section1 === "부동산·경제" && a.section2 === "법률/세무 지식").slice(0, 2);
  const lifeArts = allNewsArticles.filter(a => a.section1 === "라이프·오피니언").slice(0, 2);
  const gongsilArts = allNewsArticles.filter(a => a.section1 === "공실뉴스").slice(0, 3);

  // 날짜 포맷팅
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  // 본문에서 텍스트만 추출 (기사 복사 시 딸려온 팝업 X버튼 등 제거)
  const stripHtml = (html: string) => {
    if (!html) return "";
    let text = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    // 맨 앞에 X나 × 기호가 오고 그 뒤에 바로 한글이나 괄호가 오면 삭제 (광고창 닫기 버튼 찌꺼기)
    text = text.replace(/^(?:X|×|✕)(?=[가-힣\[\(])/i, "").trim();
    return text;
  };

  // YouTube 추출 유틸리티
  const extractYoutubeIdInfo = (article: any) => {
    // 1순위: 명시적 유튜브 URL
    if (article.youtube_url) {
      const match = article.youtube_url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/);
      if (match) return { id: match[1], hasVideo: true };
    }
    // 2순위: 본문(content) 내장 iframe 또는 링크
    if (article.content) {
      const match = article.content.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/);
      if (match) return { id: match[1], hasVideo: true };
    }
    return { id: null, hasVideo: false };
  };

  const getThumbnailSrc = (article: any, ytInfo: { id: string | null; hasVideo: boolean }) => {
    if (article.thumbnail_url) return article.thumbnail_url;
    if (ytInfo.id) return `https://img.youtube.com/vi/${ytInfo.id}/hqdefault.jpg`;
    return "https://via.placeholder.com/300x200?text=No+Image";
  };

  // 공통 기사 렌더링 함수 (2단 리스트용)

  // 공통 기사 렌더링 함수 (2단 리스트용)
  const renderArticleList = (articles: any[]) => {
    if (articles.length === 0) {
      return <div style={{ padding: "40px 0", color: "#999", fontSize: 14 }}>등록된 기사가 없습니다.</div>;
    }
    return articles.map((item, i) => {
      const ytInfo = extractYoutubeIdInfo(item);
      const thumbSrc = getThumbnailSrc(item, ytInfo);
      return (
        <Link key={i} href={`/news/${item.article_no || item.id}`} onClick={saveScroll} style={{ textDecoration: "none", color: "inherit", display: "block", marginBottom: 24 }}>
          <div className="hi-item" style={{ alignItems: "flex-start", display: "flex", gap: "20px" }}>
            <div className="hi-img" style={{ position: "relative", width: "160px", height: "100px", flexShrink: 0 }}>
              <img src={thumbSrc !== "https://via.placeholder.com/300x200?text=No+Image" ? thumbSrc : "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=600&h=337"} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 4 }} />
              {ytInfo.hasVideo && (
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 32, height: 32, background: "rgba(0,0,0,0.5)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="white" style={{ marginLeft: 2 }}><path d="M8 5v14l11-7z"/></svg>
                </div>
              )}
            </div>
            <div className="hi-txt" style={{ flex: 1, display: "flex", flexDirection: "column", height: "100px", overflow: "hidden" }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.2 }}>{item.title}</h3>
              <p style={{ margin: 0, fontSize: "14px", color: "#666", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4, height: "2.8em" }}>{item.subtitle || ""}</p>
              <div style={{ fontSize: "12px", color: "#999", marginTop: "auto" }}>{formatDate(item.published_at || item.created_at)} · {item.author_name || "공실뉴스"}</div>
            </div>
          </div>
        </Link>
      );
    });
  };

  return (
    <>
      <style>{`
        .video-grid { display: flex; gap: 20px; }
        .vid-item { flex: 1; display: flex; flex-direction: column; cursor: pointer; transition: transform 0.2s; text-decoration: none; color: inherit; }
        .vid-item:hover { transform: translateY(-3px); }
        .vid-thumb { position: relative; width: 100%; padding-bottom: 56.25%; background: #000; border-radius: 8px; overflow: hidden; margin-bottom: 12px; }
        .vid-thumb img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; objectFit: cover; opacity: 0.8; transition: opacity 0.2s; }
        .vid-item:hover .vid-thumb img { opacity: 1; }
        .vid-title { font-size: 16px; font-weight: 700; line-height: 1.4; color: #111; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
      
      {/* 5. AI마케팅 */}
      <div className="mt-50 mb-50">
        <div className="sec-title-wrap">
          <Link href="/news_marketing" style={{ textDecoration: "none" }}><h2 className="sec-title">AI마케팅 &gt;</h2></Link>
        </div>
        <div className="hot-issue-wrap">
          <div className="hi-left">
            <div className="hi-list">
              {renderArticleList(marketingArts)}
            </div>
          </div>
          <div className="hi-right">
            <BannerSlot placement="MAIN_ISSUE_RIGHT" initialBanners={issueRightBanners} />
          </div>
        </div>
      </div>



      {/* 6. Video News: 공실뉴스 — 블랙 배경 */}
      <div className="video-dark-bg" style={{ background: "#111", margin: "0 -9999px", padding: "40px 9999px 48px", position: "relative" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="sec-title-wrap">
            <Link href="/news_gongsil" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}><svg width="28" height="20" viewBox="0 0 28 20" fill="none"><rect width="28" height="20" rx="4" fill="#FF0000"/><path d="M11 5.5L19.5 10L11 14.5V5.5Z" fill="white"/></svg><h2 className="sec-title" style={{ color: "#fff", margin: 0 }}>공실뉴스 &gt;</h2></Link>
          </div>
          <div className="video-grid">
            {gongsilArts.length > 0 ? (
              gongsilArts.map((item, i) => {
                const ytInfo = extractYoutubeIdInfo(item);
                const thumbSrc = getThumbnailSrc(item, ytInfo);
                return (
                  <Link key={i} href={`/news/${item.article_no || item.id}`} className="vid-item" onClick={saveScroll}>
                    <div className="vid-thumb">
                      <img src={thumbSrc !== "https://via.placeholder.com/300x200?text=No+Image" ? thumbSrc : "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=600&h=337"} alt={item.title} />
                      <div className="vid-play"></div>
                    </div>
                    <div className="vid-title" style={{ color: "#fff" }}>{item.title}</div>
                  </Link>
                );
              })
            ) : (
              <div style={{ color: "#666", padding: "40px 0", width: "100%", textAlign: "center" }}>등록된 공실뉴스 기사가 없습니다.</div>
            )}
          </div>
        </div>
      </div>

      {/* 7. 부동산·경제 (정책/동향 + 법률/세무) */}
      <div className="mt-50 mb-50">
        <div className="hot-issue-wrap" style={{ gap: 40 }}>
          <div className="hi-left" style={{ flex: 1, minWidth: 0, width: "calc(50% - 20px)" }}>
            <div className="sec-title-wrap">
              <Link href="/news_politics" style={{ textDecoration: "none" }}><h2 className="sec-title">부동산·경제 &gt;</h2></Link>
            </div>
            <div className="hi-list">
              {renderArticleList(economyArts)}
            </div>
          </div>
          <div className="hi-left" style={{ flex: 1, minWidth: 0, width: "calc(50% - 20px)" }}>
            <div className="sec-title-wrap">
              <Link href="/news_politics" style={{ textDecoration: "none" }}><h2 className="sec-title">법률/세무 지식 &gt;</h2></Link>
            </div>
            <div className="hi-list">
              {renderArticleList(lawArts)}
            </div>
          </div>
        </div>
      </div>

      {/* 8. 라이프·오피니언 */}
      <div className="mt-50 mb-50">
        <div className="sec-title-wrap">
          <Link href="/news_etc" style={{ textDecoration: "none" }}><h2 className="sec-title">라이프·오피니언 &gt;</h2></Link>
        </div>
        <div className="hot-issue-wrap">
          <div className="hi-left">
            <div className="hi-list">
              {renderArticleList(lifeArts)}
            </div>
          </div>
          <div className="hi-right">
            <BannerSlot placement="MAIN_MIDDLE_ISSUE" initialBanners={middleIssueBanners} />
          </div>
        </div>
      </div>
    </>
  );
}
