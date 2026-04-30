import { getArticleDetail, getArticles } from "@/app/actions/article";
import NewsReadContent from "@/components/NewsReadContent";
import Link from "next/link";

// 1시간 주기로 재생성 (ISR)
export const revalidate = 3600;
// 미리 구워지지 않은 경로도 동적으로 생성하도록 허용
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    // 가장 먼저 빌드되어야 할 기사들 (최근 기사 50개)
    const recentRes = await getArticles({ status: "APPROVED", limit: 50 });
    
    if (recentRes.success && recentRes.data) {
      // 숫자형 article_no를 우선 파라미터로 사용 (없으면 id)
      return recentRes.data.map((article: any) => ({
        article_id: (article.article_no || article.id).toString(),
      }));
    }
  } catch (error) {
    console.error("Failed to generate static params for articles", error);
  }
  return [];
}

const CATEGORIES = [
  { key: "home", label: "홈" },
  { key: "all", label: "전체뉴스" },
  { key: "부동산·주식·재테크", label: "부동산·재테크" },
  { key: "정치·경제·사회", label: "정치·경제" },
  { key: "세무·법률", label: "세무·법률" },
  { key: "여행·건강·생활", label: "여행·생활" },
  { key: "etc", label: "기타" },
];

export default async function MobileNewsReadPage({ params }: { params: Promise<{ article_id: string }> }) {
  const resolvedParams = await params;
  const articleId = typeof resolvedParams.article_id === "string" ? resolvedParams.article_id : null;

  // 서버에서 미리 데이터 가져오기 — 즉시 표시!
  let article = null;
  let popular: any[] = [];

  if (articleId) {
    const [articleRes, popularRes] = await Promise.all([
      getArticleDetail(articleId),
      getArticles({ status: "APPROVED", limit: 50 }),
    ]);

    if (articleRes.success && articleRes.data) {
      article = articleRes.data;
    }

    if (popularRes.success && popularRes.data) {
      popular = [...popularRes.data]
        .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        .slice(0, 5);
    }
  }

  // 기사 없음
  if (!article) {
    return (
      <div className="flex flex-col w-full bg-white min-h-screen">
        <main className="container px-4" style={{ padding: "100px 0", textAlign: "center", color: "#888" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>기사를 찾을 수 없습니다.</div>
          <div style={{ fontSize: 14, color: "#aaa", marginBottom: 24 }}>삭제되었거나 존재하지 않는 기사입니다.</div>
        </main>
      </div>
    );
  }

  // 모바일 전용 래퍼 클래스로 감싸주어 globals.css의 반응형 속성을 적용
  return (
    <div className="flex flex-col w-full bg-white min-h-screen mobile-news-detail-wrapper">
      {/* 카테고리 네비게이션 탭 */}
      <div
        className="hide-scrollbar"
        style={{
          display: "flex",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-x",
          backgroundColor: "#1a2e50",
          position: "fixed",
          top: "36px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "448px",
          zIndex: 40,
        }}
      >
        {CATEGORIES.map((cat) => {
          // 현재 기사의 카테고리와 일치하는지 확인
          const isActive = article.category === cat.key;
          const targetUrl = cat.key === "home" ? "/m" : `/m/news?tab=${cat.key}`;
          
          return (
            <Link
              key={cat.key}
              href={targetUrl}
              style={{
                flexShrink: 0,
                padding: "10px 16px",
                fontSize: "14px",
                fontWeight: isActive ? 800 : 500,
                color: isActive ? "#fff" : "rgba(255,255,255,0.6)",
                background: "none",
                textDecoration: "none",
                borderBottom: isActive ? "3px solid #ffffff" : "3px solid transparent",
                cursor: "pointer",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
                display: "inline-block",
              }}
            >
              {cat.label}
            </Link>
          );
        })}
      </div>
      <div style={{ height: "46px", flexShrink: 0 }}></div>

      <NewsReadContent article={article} popularArticles={popular} />
    </div>
  );
}
