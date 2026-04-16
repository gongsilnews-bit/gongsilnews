import Link from "next/link";
import { getArticles } from "@/app/actions/article";

export default async function NoticeBoardGroup() {
  // IT, 스포츠, 인물 3가지 섹션 가져오기
  const [itRes, sportsRes, peopleRes] = await Promise.all([
    getArticles({ status: "APPROVED", section1: "뉴스/칼럼", section2: "IT·가전·가구", limit: 10 }),
    getArticles({ status: "APPROVED", section1: "뉴스/칼럼", section2: "스포츠·연예·Car", limit: 10 }),
    getArticles({ status: "APPROVED", section1: "뉴스/칼럼", section2: "인물·미션·기타", limit: 10 }),
  ]);

  const rawArts = [
    ...(itRes.success ? itRes.data || [] : []),
    ...(sportsRes.success ? sportsRes.data || [] : []),
    ...(peopleRes.success ? peopleRes.data || [] : []),
  ];

  // 최신순 정렬
  rawArts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const stripHtml = (html: string) => {
    if (!html) return "";
    let text = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    text = text.replace(/^(?:X|×|✕)(?=[가-힣\[\(])/i, "").trim();
    return text;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  const extractYoutubeIdInfo = (article: any) => {
    if (article.youtube_url) {
      const match = article.youtube_url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/);
      if (match) return { id: match[1], hasVideo: true };
    }
    return { id: null, hasVideo: false };
  };

  const getThumbnailSrc = (article: any, ytInfo: { id: string | null; hasVideo: boolean }) => {
    if (article.thumbnail_url) return article.thumbnail_url;
    if (ytInfo.id) return `https://img.youtube.com/vi/${ytInfo.id}/hqdefault.jpg`;
    return "https://via.placeholder.com/300x200?text=No+Image";
  };

  // 사진/영상 있는 기사만 추출하여 2개 표시
  const etcArts = rawArts.filter((a: any) => a.thumbnail_url || extractYoutubeIdInfo(a).hasVideo).slice(0, 2);

  return (
    <div className="mt-50 mb-50">
      <div className="hot-issue-wrap">
        <div className="hi-left">
          <div className="sec-title-wrap">
            <Link href="/news_etc" style={{ textDecoration: "none" }}><h2 className="sec-title">기타 &gt;</h2></Link>
          </div>
          <div className="hi-list">
            {etcArts.length > 0 ? etcArts.map((item, i) => {
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
                      <p style={{ margin: 0, fontSize: "14px", color: "#666", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4, height: "2.8em" }}>{item.subtitle || ""}</p>
                      <div style={{ fontSize: "12px", color: "#999", marginTop: "auto" }}>{formatDate(item.published_at || item.created_at)} · {item.author_name || "공실뉴스"}</div>
                    </div>
                  </div>
                </Link>
              );
            }) : (
              <div style={{ padding: "40px 0", color: "#999", fontSize: 14 }}>등록된 기사가 없습니다.</div>
            )}
          </div>
        </div>
        <div className="hi-right" style={{ position: "relative", marginTop: 52 }}>
          <div className="box-placeholder" style={{ background: "#f9f9fb", border: "1px solid #e0e0e0", borderRadius: 12, height: "auto", minHeight: 220, alignItems: "flex-start", padding: 25 }}>
            <div style={{ width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #1a4282", paddingBottom: 12, marginBottom: 15 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1a4282", margin: 0 }}>공지사항</h3>
                <a href="#" style={{ fontSize: 12, color: "#666", textDecoration: "none" }}>더보기 &gt;</a>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12, fontSize: 13, color: "#444" }}>
                {[
                  { text: "• 신규가입자 무료 1개월 연장 이벤트", date: "04.01" },
                  { text: "• 개인정보처리방침 개정 사전 안내", date: "03.28" },
                  { text: "• 공실뉴스 모바일 앱 업데이트 출시", date: "03.20" },
                  { text: "• 서비스 정기 점검 안내 (금일 자정)", date: "03.15" },
                ].map((item, i) => (
                  <li key={i} style={{ display: "flex", justifyContent: "space-between", cursor: "pointer" }}>
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "70%" }}>{item.text}</span>
                    <span style={{ color: "#999", fontSize: 11 }}>{item.date}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
