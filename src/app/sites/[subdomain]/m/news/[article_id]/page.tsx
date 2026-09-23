import NewsReadContent from "@/components/NewsReadContent";
import { loadSubdomainArticle } from "../../../news/loadArticle";
import SubdomainArticleBar from "../../../news/[article_id]/SubdomainArticleBar";
import { pickTheme } from "../../../theme";
import { VIEW_TRANSITION_CSS, HERO_SHOT_CSS } from "../../../viewTransition";

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
 * 폰에서 읽는 기사.
 *
 * NewsReadContent 는 주소가 /m 으로 시작하면 스스로 모바일 서식으로 그린다.
 * 그래서 PC 쪽과 같은 것을 주소만 달리해 올린다.
 */
export default async function SubdomainMobileArticlePage({ params }: PageProps) {
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
        <div style={{ padding: "80px 20px", textAlign: "center", color: "#94a3b8" }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>📄</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#475569", marginBottom: 8 }}>기사를 찾을 수 없습니다.</div>
          <div style={{ fontSize: 13.5 }}>삭제되었거나 존재하지 않는 기사입니다.</div>
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
  const theme = pickTheme(site.settings?.intake?.theme_color);

  return (
    // 폰에서는 상호 띠를 얹지 않는다. 주소창에 이미 중개사 도메인이 보이고,
    // 좁은 화면에서 한 줄이라도 기사에 내주는 편이 낫다. 대신 카테고리 줄 앞에
    // 뒤로가기를 넣고, 이 상자째로 옆으로 밀어내며 목록으로 돌아간다.
    <div id="gs-article-slide" className="subdomain-article-view mobile-news-detail-wrapper">
      {/*
        말머리 색만 중개사 테마로 덮는다. 포털에서는 공실뉴스 남색이지만
        여기는 중개사 자기 페이지다 — 머리글·버튼과 색이 따로 놀면 남의 것을
        퍼온 화면처럼 보인다. 전역 CSS 는 건드리지 않고 이 화면 안에서만 덮는다.
      */}
      <style>{`.subdomain-article-view .detail-breadcrumb { color: ${theme.primary}; }` + VIEW_TRANSITION_CSS + HERO_SHOT_CSS}</style>
      <NewsReadContent
        article={article}
        popularArticles={[]}
        showPopularNews={false}
        shareUrl={shareUrl}
        shareSiteName={officeName}
        compactArticleLayout
        hideSidebar
        showBack
        showBookmark={false}
        showAuthorLinks={false}
        copyrightName={officeName}
        copyOnlyShare
        showEngagement={false}
        showAuthorAd={false}
        initialAuthorRole={authorRole}
        initialAuthorEmail={authorEmail}
        initialAttachedVacancy={attachedVacancy}
      />
    </div>
  );
}
