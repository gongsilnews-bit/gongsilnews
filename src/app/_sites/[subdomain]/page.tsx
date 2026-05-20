import { Metadata } from "next";
import { getHomepageSettingsBySubdomain } from "@/app/actions/homepage";
import SubdomainClient from "./SubdomainClient";

interface PageProps {
  params: Promise<{ subdomain: string }>;
}

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

  return <SubdomainClient initialData={res.data} />;
}
