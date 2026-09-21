import { getHomepageSettingsBySubdomain } from "@/app/actions/homepage";
import { getArticleDetail } from "@/app/actions/article";
import IntakeArticleClient from "./IntakeArticleClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ subdomain: string; article_id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { article_id } = await params;
  const res = await getArticleDetail(article_id, true);
  if (res.success && res.data) {
    return { title: res.data.title, description: res.data.subtitle || undefined };
  }
  return { title: "기사" };
}

/**
 * 중개사 서브도메인 안에서 보는 기사.
 *
 * 포털의 /news/[article_id] 로 보내면 그 화면에 다른 중개사 기사와 광고가 붙는다.
 * 어렵게 데려온 방문자를 경쟁자에게 넘겨주는 셈이라, 기사 내용은 그대로 두고
 * 틀만 중개사 것으로 입혀 자기 주소 안에서 읽게 한다.
 */
export default async function SubdomainArticlePage({ params }: PageProps) {
  const { subdomain, article_id } = await params;

  const [siteRes, artRes] = await Promise.all([
    getHomepageSettingsBySubdomain(subdomain),
    getArticleDetail(article_id, true),
  ]);

  if (!siteRes.success || !siteRes.data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontFamily: "sans-serif" }}>
        페이지를 찾을 수 없습니다.
      </div>
    );
  }

  const article = artRes.success ? artRes.data : null;

  // 남의 기사를 자기 주소로 띄우지 못하게 막는다
  if (article && article.author_id !== siteRes.data.member?.id) {
    return (
      <IntakeArticleClient
        subdomain={subdomain}
        settings={siteRes.data.settings}
        member={siteRes.data.member}
        companyProfile={siteRes.data.companyProfile}
        article={null}
      />
    );
  }

  return (
    <IntakeArticleClient
      subdomain={subdomain}
      settings={siteRes.data.settings}
      member={siteRes.data.member}
      companyProfile={siteRes.data.companyProfile}
      article={article}
    />
  );
}
