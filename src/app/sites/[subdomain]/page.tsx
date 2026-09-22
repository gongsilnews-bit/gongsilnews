import { Metadata } from "next";
import { getHomepageSettingsBySubdomain } from "@/app/actions/homepage";
import { getVacanciesByOwnerId } from "@/app/actions/vacancy";
import { getMyArticles } from "@/app/actions/article";
import SiteClient from "./SiteClient";

interface PageProps {
  params: Promise<{ subdomain: string }>;
}

/** 홈페이지에 싣는 매물·기사 수. 더 걸면 폰에서 옆으로 미는 손만 아프다 */
const MAX_VACANCIES = 12;
const MAX_ARTICLES = 4;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { subdomain } = await params;
  const res = await getHomepageSettingsBySubdomain(subdomain);
  if (res.success && res.data) {
    const title = res.data.settings.site_title || `${res.data.companyProfile?.name || res.data.companyProfile?.company_name || '부동산'} - 공실뉴스`;
    const desc = res.data.settings.company_intro || `${res.data.companyProfile?.name || res.data.companyProfile?.company_name || '부동산'}의 프리미엄 홈페이지입니다.`;
    return {
      title,
      description: desc,
      openGraph: {
        title,
        description: desc,
        images: res.data.settings.logo_url ? [res.data.settings.logo_url] : [],
      },
    };
  }
  return {
    title: "프리미엄 홈페이지 - 공실뉴스",
  };
}

export default async function SubdomainPage({ params }: PageProps) {
  const { subdomain } = await params;
  const res = await getHomepageSettingsBySubdomain(subdomain);

  if (!res.success || !res.data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "sans-serif", padding: 24, textAlign: "center" }}>
        <h1 style={{ fontSize: 48, marginBottom: 16 }}>🌐</h1>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "#1e293b", marginBottom: 12 }}>페이지를 찾을 수 없습니다</h2>
        <p style={{ fontSize: 16, color: "#64748b", marginBottom: 24 }}>{res.error || "존재하지 않거나 비활성화된 홈페이지입니다."}</p>
        <a href="http://gongsilnews.com" style={{ padding: "12px 24px", background: "#2563eb", color: "#fff", borderRadius: 8, fontWeight: 700, textDecoration: "none" }}>
          공실뉴스 홈으로 이동
        </a>
      </div>
    );
  }

  const ownerId = res.data.member.id;

  // 매물과 기사는 이미 공실등록·기사작성에 들어있는 것을 그대로 쓴다.
  // 홈페이지 때문에 같은 내용을 두 번 입력하게 만들면 두 곳 다 관리가 안 된다.
  // 한쪽이 실패해도 페이지는 떠야 하므로 각각 받아서 비워 둔다.
  const [vacRes, artRes] = await Promise.all([
    getVacanciesByOwnerId(ownerId),
    getMyArticles(ownerId),
  ]);

  const vacancies = vacRes.success && vacRes.data ? (vacRes.data as any[]).slice(0, MAX_VACANCIES) : [];
  // getMyArticles 는 임시저장·반려까지 주므로 승인된 것만 거른다.
  const articles = artRes.success && artRes.data
    ? (artRes.data as any[]).filter((a) => a.status === "APPROVED").slice(0, MAX_ARTICLES)
    : [];

  return (
    <SiteClient
      subdomain={subdomain}
      settings={res.data.settings}
      member={res.data.member}
      companyProfile={res.data.companyProfile}
      vacancies={vacancies}
      articles={articles}
    />
  );
}
