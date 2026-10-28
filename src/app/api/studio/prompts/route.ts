import { NextResponse, type NextRequest } from "next/server";
import { getExtensionMember } from "@/utils/extensionMember";
import { STUDIO_EXT_FILES, STUDIO_EXT_VERSION } from "./bundle.generated";

/**
 * 공실마케팅 앱의 글쓰기 설정 (크롬 확장 프롬프트·해석·채우기 파일) — 2026-10-15 보안 결정
 *
 * 설치 파일(EXE)에는 프롬프트를 넣지 않는다. 앱은 로그인한 뒤 이 주소에서 받아 메모리에만 둔다.
 *  - 로그인한 회원만 (앱 창의 로그인 쿠키)
 *  - 스튜디오 앱에서만 (User-Agent 의 GongsilStudio/ 표시)
 *  - 저장하지 않게 no-store
 * 파일 묶음은 studio-app/scripts/sync-ext.mjs 가 만든다 (bundle.generated.ts).
 */
export async function GET(req: NextRequest) {
  const ua = req.headers.get("user-agent") || "";
  if (!/GongsilStudio\//.test(ua)) {
    return NextResponse.json({ success: false, error: "공실마케팅 앱에서만 쓸 수 있습니다." }, { status: 403 });
  }
  const member = await getExtensionMember(req);
  if (!member) return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
  return NextResponse.json(
    { success: true, version: STUDIO_EXT_VERSION, files: STUDIO_EXT_FILES },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
