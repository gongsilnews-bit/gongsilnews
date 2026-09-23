import { NextResponse } from "next/server";
import { getHomepageSettingsBySubdomain } from "@/app/actions/homepage";
import { pickTheme } from "../theme";

/**
 * 중개사별 앱 정보.
 *
 * 손님 폰 바탕화면에 '공실뉴스'가 아니라 '서초공인중개사 사무소'로 깔려야
 * 의미가 있다. 주소가 중개사마다 다르므로 이 파일도 중개사마다 달라진다.
 *
 * 미들웨어가 {아이디}.gongsilnews.com/manifest.webmanifest 를 여기로 보낸다.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;
  const res = await getHomepageSettingsBySubdomain(subdomain);

  const name =
    (res.success && res.data?.settings?.site_title) ||
    (res.success && (res.data?.companyProfile?.name || res.data?.companyProfile?.company_name)) ||
    "부동산";
  const theme = pickTheme(res.success ? res.data?.settings?.intake?.theme_color : undefined);

  return NextResponse.json(
    {
      name,
      // 바탕화면 아이콘 아래에 적히는 이름. 길면 잘리므로 짧게 자른다.
      short_name: name.length > 12 ? name.slice(0, 12) : name,
      description: `${name} 홈페이지`,
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      background_color: "#ffffff",
      theme_color: theme.primary,
      icons: [
        { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } }
  );
}
