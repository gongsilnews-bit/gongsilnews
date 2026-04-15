import Link from "next/link";
import { getArticles } from "@/app/actions/article";

export default async function CategoryNewsGrid() {
  // 섹션별 기사 가져오기 (최신순 2개씩)
  const [financeRes, mapRes, politicsRes, lawRes, lifeRes, itRes, sportsRes, peopleRes] = await Promise.all([
    getArticles({ status: "APPROVED", section1: "뉴스/칼럼", section2: "부동산·주식·재테크", limit: 10 }),
    getArticles({ status: "APPROVED", section1: "우리동네부동산", limit: 30 }),
    getArticles({ status: "APPROVED", section1: "뉴스/칼럼", section2: "정치·경제·사회", limit: 10 }),
    getArticles({ status: "APPROVED", section1: "뉴스/칼럼", section2: "세무·법률", limit: 10 }),
    getArticles({ status: "APPROVED", section1: "뉴스/칼럼", section2: "여행·건강·생활", limit: 10 }),
    getArticles({ status: "APPROVED", section1: "뉴스/칼럼", section2: "IT·가전·가구", limit: 10 }),
    getArticles({ status: "APPROVED", section1: "뉴스/칼럼", section2: "스포츠·연예·Car", limit: 10 }),
    getArticles({ status: "APPROVED", section1: "뉴스/칼럼", section2: "인물·미션·기타", limit: 10 }),
  ]);

  const rawFinanceArts = financeRes.success ? financeRes.data || [] : [];
  const rawMapArts = mapRes.success ? mapRes.data || [] : [];
  const rawPoliticsArts = politicsRes.success ? politicsRes.data || [] : [];
  const rawLawArts = lawRes.success ? lawRes.data || [] : [];
  const rawLifeArts = lifeRes.success ? lifeRes.data || [] : [];
  
  const rawEtcArts = [
    ...(itRes.success ? itRes.data || [] : []),
    ...(sportsRes.success ? sportsRes.data || [] : []),
    ...(peopleRes.success ? peopleRes.data || [] : []),
  ];
  rawEtcArts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
    if (article.youtube_url) {
      const match = article.youtube_url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/);
      if (match) return { id: match[1], hasVideo: true };
    }
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

  // 필터링 적용 (사진이나 동영상이 있는 기사만)
  const filterMedia = (arts: any[]) => arts.filter(a => a.thumbnail_url || extractYoutubeIdInfo(a).hasVideo).slice(0, 2);

  const financeArts = filterMedia(rawFinanceArts);
  const politicsArts = filterMedia(rawPoliticsArts);
  const lawArts = filterMedia(rawLawArts);
  const lifeArts = filterMedia(rawLifeArts);
  const etcArts = filterMedia(rawEtcArts);
  
  // 공통 기사 렌더링 함수 (2단 리스트용) 전에 mapArts 필터링
  const mapArts = rawMapArts.filter((item: any) => extractYoutubeIdInfo(item).hasVideo).slice(0, 3);

  // 공통 기사 렌더링 함수 (2단 리스트용)
  const renderArticleList = (articles: any[]) => {
    if (articles.length === 0) {
      return <div style={{ padding: "40px 0", color: "#999", fontSize: 14 }}>등록된 기사가 없습니다.</div>;
    }
    return articles.map((item, i) => {
      const ytInfo = extractYoutubeIdInfo(item);
      const thumbSrc = getThumbnailSrc(item, ytInfo);
      return (
        <Link key={i} href={`/news/${item.article_no || item.id}`} style={{ textDecoration: "none", color: "inherit", display: "block", marginBottom: 24 }}>
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
              <p style={{ margin: 0, fontSize: "14px", color: "#666", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4, height: "2.8em" }}>{stripHtml(item.content || "")}</p>
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
        .vid-play { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 48px; height: 48px; background: rgba(0,0,0,0.6); borderRadius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; z-index: 2; pointer-events: none; }
        .vid-play svg { margin-left: 4px; }
        .vid-title { font-size: 16px; font-weight: 700; line-height: 1.4; color: #111; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
      
      {/* 5. Hot Issue: 부동산·주식·재테크 */}
      <div className="mt-50 mb-50">
        <div className="sec-title-wrap">
          <Link href="/news_finance" style={{ textDecoration: "none" }}><h2 className="sec-title">부동산·주식·재테크 &gt;</h2></Link>
        </div>
        <div className="hot-issue-wrap">
          <div className="hi-left">
            <div className="hi-list">
              {renderArticleList(financeArts)}
            </div>
          </div>
          <div className="hi-right">
            <div className="box-placeholder">
              <span style={{ color: "#999" }}>광고 또는 비디오 박스 영역</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Video News: 우리동네부동산 */}
      <div className="video-wrap mb-50">
        <div className="sec-title-wrap">
          <Link href="/news_map" style={{ textDecoration: "none" }}><h2 className="sec-title">우리동네부동산 &gt;</h2></Link>
        </div>
        <div className="video-grid">
          {mapArts.length > 0 ? (
            mapArts.map((item, i) => {
              const ytInfo = extractYoutubeIdInfo(item);
              const thumbSrc = getThumbnailSrc(item, ytInfo);
              return (
                <Link key={i} href={`/news/${item.article_no || item.id}`} className="vid-item">
                  <div className="vid-thumb">
                    <img src={thumbSrc !== "https://via.placeholder.com/300x200?text=No+Image" ? thumbSrc : "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=600&h=337"} alt={item.title} />
                    <div className="vid-play">
                       <svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </div>
                  <div className="vid-title">{item.title}</div>
                </Link>
              );
            })
          ) : (
            <div style={{ color: "#999", padding: "40px 0", width: "100%", textAlign: "center" }}>등록된 우리동네 기사가 없습니다.</div>
          )}
        </div>
      </div>

      {/* 7-2. 정치·경제·사회 + 세무·법률 (2단 병렬 한 칸씩 당김) */}
      <div className="mt-50 mb-50">
        <div className="hot-issue-wrap" style={{ gap: 40 }}>
          <div className="hi-left" style={{ flex: 1, minWidth: 0, width: "calc(50% - 20px)" }}>
            <div className="sec-title-wrap">
              <Link href="/news_politics" style={{ textDecoration: "none" }}><h2 className="sec-title">정치·경제·사회 &gt;</h2></Link>
            </div>
            <div className="hi-list">
              {renderArticleList(politicsArts)}
            </div>
          </div>
          <div className="hi-left" style={{ flex: 1, minWidth: 0, width: "calc(50% - 20px)" }}>
            <div className="sec-title-wrap">
              <Link href="/news_law" style={{ textDecoration: "none" }}><h2 className="sec-title">세무·법률 &gt;</h2></Link>
            </div>
            <div className="hi-list">
              {renderArticleList(lawArts)}
            </div>
          </div>
        </div>
      </div>

      {/* 7-3. 여행·건강·생활 + 기타 (2단 병렬 한 칸씩 당김) */}
      <div className="mt-50 mb-50">
        <div className="hot-issue-wrap" style={{ gap: 40 }}>
          <div className="hi-left" style={{ flex: 1, minWidth: 0, width: "calc(50% - 20px)" }}>
            <div className="sec-title-wrap">
               <Link href="/news_life" style={{ textDecoration: "none" }}><h2 className="sec-title">여행·건강·생활 &gt;</h2></Link>
            </div>
            <div className="hi-list">
              {renderArticleList(lifeArts)}
            </div>
          </div>
          <div className="hi-left" style={{ flex: 1, minWidth: 0, width: "calc(50% - 20px)" }}>
            <div className="sec-title-wrap">
               <Link href="/news_etc" style={{ textDecoration: "none" }}><h2 className="sec-title">기타 &gt;</h2></Link>
            </div>
            <div className="hi-list">
              {renderArticleList(etcArts)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
