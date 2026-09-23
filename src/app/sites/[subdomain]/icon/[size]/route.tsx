import { ImageResponse } from "next/og";
import { getHomepageSettingsBySubdomain } from "@/app/actions/homepage";
import { pickTheme } from "../../theme";

/**
 * 바탕화면에 깔릴 아이콘.
 *
 * 중개사가 로고를 올렸으면 그것을 쓰고, 없으면 테마색 바탕에 상호 첫 글자를
 * 그린다. 로고가 없다고 빈 네모를 깔면 손님 바탕화면에서 무슨 앱인지 알 수 없다.
 *
 * 안드로이드는 아이콘을 동그라미나 사각형으로 잘라내므로(maskable), 가장자리
 * 20% 는 잘려나갈 수 있다고 보고 안쪽에 그린다.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ subdomain: string; size: string }> }
) {
  const { subdomain, size } = await params;
  const px = size === "512" ? 512 : 192;

  const res = await getHomepageSettingsBySubdomain(subdomain);
  const settings: any = res.success ? res.data?.settings : null;
  const name =
    settings?.site_title ||
    (res.success && (res.data?.companyProfile?.name || res.data?.companyProfile?.company_name)) ||
    "부동산";
  const theme = pickTheme(settings?.intake?.theme_color);

  // 로고를 직접 받아와 심는다. 주소만 넘기면 그림 만드는 쪽에서 실패해도
  // 알 길이 없어 아이콘 전체가 깨진다.
  let logo: string | null = null;
  if (settings?.logo_url) {
    try {
      const r = await fetch(settings.logo_url, { cache: "no-store" });
      const type = r.headers.get("content-type") || "";
      const buf = await r.arrayBuffer();
      // SVG 는 그림 만드는 쪽이 못 읽는다. 너무 큰 파일도 거른다.
      if (r.ok && type.startsWith("image/") && !type.includes("svg") && buf.byteLength < 1_500_000) {
        logo = `data:${type};base64,${Buffer.from(buf).toString("base64")}`;
      }
    } catch {
      logo = null;
    }
  }

  const inner = Math.round(px * 0.62);

  return new ImageResponse(
    (
      <div
        style={{
          width: px,
          height: px,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: theme.primary,
        }}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" width={inner} height={inner} style={{ objectFit: "contain" }} />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: inner,
              height: inner,
              color: "#fff",
              fontSize: Math.round(px * 0.42),
              fontWeight: 800,
            }}
          >
            {name.trim().charAt(0) || "공"}
          </div>
        )}
      </div>
    ),
    { width: px, height: px }
  );
}
