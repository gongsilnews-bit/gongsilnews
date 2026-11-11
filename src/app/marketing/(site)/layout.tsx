import StudioFooter from "@/components/studio-site/StudioFooter";

// 공실마케팅 소개 페이지들 (/studio, /studio/feature 등) — 남색 줄 + 자기 메뉴 줄 + 공실마케팅 푸터 (2026-10-26)
// /studio/connect · /studio/callback(앱 연결 화면)은 이 묶음 밖이라 푸터가 붙지 않는다
// PC 는 최소 1200px 그대로, 폰(860px 이하)에서는 화면 너비대로 (2026-11-11 — 폰에서 신청 화면이 작게 보이지 않게)
export default function StudioSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="studio-site-wrap">
      <style>{`.studio-site-wrap{min-width:1200px}@media (max-width:860px){.studio-site-wrap{min-width:0;overflow-x:hidden}}`}</style>
      {children}
      <StudioFooter />
    </div>
  );
}
