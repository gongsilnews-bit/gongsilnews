import NewsReadContent from "@/components/NewsReadContent";
import { loadSubdomainArticle } from "../loadArticle";
import SubdomainArticleBar from "./SubdomainArticleBar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{ subdomain: string; article_id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { subdomain, article_id } = await params;
  const { article } = await loadSubdomainArticle(subdomain, article_id);
  if (article) return { title: article.title, description: article.subtitle || undefined };
  return { title: "기사" };
}

/**
 * 중개사 서브도메인에서 새 창으로 읽는 기사.
 *
 * 화면은 포털 기사 화면(NewsReadContent)을 그대로 쓴다. 본문 서식·사진 확대·
 * 글자 크기·공유·댓글까지 이미 다듬어 둔 것이 전부 딸려오고, 포털에서 고치면
 * 여기도 같이 고쳐진다.
 *
 * 다른 점은 두 가지다. 주소창에 중개사 자기 도메인이 남고, 옆에 깔리는 기사
 * 목록이 포털 전체가 아니라 이 중개사가 쓴 기사다.
 */
export default async function SubdomainArticlePage({ params }: PageProps) {
  const { subdomain, article_id } = await params;
  const { site, article, authorRole, authorEmail, attachedVacancy } =
    await loadSubdomainArticle(subdomain, article_id);

  if (!site) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontFamily: "sans-serif" }}>
        페이지를 찾을 수 없습니다.
      </div>
    );
  }

  if (!article) {
    return (
      <div style={{ fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
        <SubdomainArticleBar subdomain={subdomain} settings={site.settings} member={site.member} companyProfile={site.companyProfile} />
        <div style={{ padding: "100px 20px", textAlign: "center", color: "#94a3b8" }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>📄</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#475569", marginBottom: 8 }}>기사를 찾을 수 없습니다.</div>
          <div style={{ fontSize: 14 }}>삭제되었거나 존재하지 않는 기사입니다.</div>
        </div>
      </div>
    );
  }

  // 퍼 나른 링크가 포털이 아니라 이 중개사에게 사람을 보내도록, 공유 주소를 중개사 것으로 준다.
  // 로컬에서 보든 어디서 보든 공유는 실제 서비스 주소여야 하므로 여기서 직접 만든다.
  const officeName =
    site.settings?.site_title ||
    site.companyProfile?.name ||
    site.companyProfile?.company_name ||
    site.member?.name ||
    "부동산";
  const shareUrl = `https://${subdomain}.gongsilnews.com/news/${article.article_no || article.id}`;

  return (
    <div className="subdomain-article-view mobile-news-detail-wrapper">
      <SubdomainArticleBar subdomain={subdomain} settings={site.settings} member={site.member} companyProfile={site.companyProfile} />
      <NewsReadContent
        article={article}
        popularArticles={[]}
        showPopularNews={false}
        shareUrl={shareUrl}
        shareSiteName={officeName}
        compactArticleLayout
        hideSidebar
        showBookmark={false}
        showEngagement={false}
        showAuthorAd={false}
        initialAuthorRole={authorRole}
        initialAuthorEmail={authorEmail}
        initialAttachedVacancy={attachedVacancy}
      />
    </div>
  );
}
