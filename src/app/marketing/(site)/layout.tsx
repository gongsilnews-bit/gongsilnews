import StudioFooter from "@/components/studio-site/StudioFooter";

// 공실마케팅 소개 페이지들 (/studio, /studio/feature …) — 위 남색 줄 + 자기 메뉴 줄 + 공실마케팅 풋터 (2026-10-26)
// /studio/connect · /studio/callback(앱 연결 화면)은 이 묶음 밖이라 풋터가 붙지 않는다
export default function StudioSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minWidth: "1200px" }}>
      {children}
      <StudioFooter />
    </div>
  );
}
