import { Metadata } from "next";
import { notFound } from "next/navigation";
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
      /*
       * 바탕화면에 깔릴 때 쓸 앱 정보. 중개사마다 이름과 아이콘이 다르므로
       * manifest 도 이 주소 아래에서 따로 만들어 준다.
       */
      manifest: "/manifest.webmanifest",
      appleWebApp: { capable: true, title, statusBarStyle: "default" },
      icons: {
        icon: [{ url: "/icon/192", sizes: "192x192", type: "image/png" }],
        apple: [{ url: "/icon/192", sizes: "192x192" }],
      },
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
    // 없는 주소는 404 로 답해야 한다. notFound() 를 부르면 not-found.tsx 가
    // 404 상태로 그려진다 — 여기서 JSX 를 돌려주면 200 이라 검색엔진이
    // "페이지를 찾을 수 없습니다"를 멀쩡한 페이지로 색인한다.
    if ((res as any).reason !== "paused") notFound();

    // 닫힌 홈페이지. 결제가 끊긴 중개사의 고객이 "찾을 수 없습니다"를 보면
    // 폐업한 줄 안다. 검색엔진에 돌려줄 503 은 미들웨어가 맡고, 이 화면은
    // 미들웨어가 못 걸러낸 자리(로컬·미리보기)를 위한 그물이다.
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f6f8fa", fontFamily: "'Pretendard Variable', -apple-system, sans-serif", padding: 24, textAlign: "center" }}>
        <div style={{ maxWidth: 420, width: "100%", background: "#fff", border: "1px solid #e8ecf0", borderRadius: 12, padding: "44px 26px", boxShadow: "0 1px 3px rgba(16,24,40,.08)" }}>
          <h1 style={{ fontSize: 21, fontWeight: 800, color: "#16202b", margin: "0 0 14px 0", letterSpacing: "-0.5px" }}>
            일시적으로 중단된 페이지입니다
          </h1>
          <p style={{ fontSize: 15, color: "#6b7684", lineHeight: 1.75, margin: "0 0 26px 0", wordBreak: "keep-all" }}>
            이용이 잠시 중지되어 지금은 열 수 없습니다. 곧 다시 열릴 예정입니다.
          </p>
          <a href="https://gongsilnews.com" style={{ display: "inline-block", padding: "13px 24px", background: "#16202b", color: "#fff", borderRadius: 8, fontSize: 15, fontWeight: 800, textDecoration: "none" }}>
            공실뉴스로 가기
          </a>
        </div>
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
