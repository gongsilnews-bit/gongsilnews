import { NextResponse } from "next/server";
import REGCODES from "@/data/regcodes.json";

// 시/도 · 시/군/구 · 읍/면/동 목록 (2026-10-28)
// 예전엔 남의 무료 서버(grpc-proxy-server…/v1/regcodes)에서 받았는데 그 서버가 없어져(404) 주소 고르기가 "로딩중..."에 멈췄다.
// 같은 물음 모양(regcode_pattern=11*00000&is_ignore_zero=true)·같은 답 모양({ regcodes: [{ code, name }] })으로 우리 쪽에서 답한다.
// 자료는 src/data/regcodes.json — vworld 행정구역 자료(LT_C_ADSIDO_INFO·LT_C_ADSIGG_INFO·LT_C_ADEMD_INFO)에서 받아 둔 것 ([코드 10자리, 전체 이름])
const ROWS = REGCODES as [string, string][];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pattern = searchParams.get("regcode_pattern") || "";
  const ignoreZero = searchParams.get("is_ignore_zero") === "true";
  const star = pattern.indexOf("*");
  const prefix = star < 0 ? pattern : pattern.slice(0, star);
  const suffix = star < 0 ? "" : pattern.slice(star + 1);
  const self = prefix.padEnd(10, "0"); // is_ignore_zero — 묻는 지역 자기 자신(뒤가 모두 0)은 뺀다

  const regcodes = ROWS
    .filter(([code]) => code.startsWith(prefix) && code.endsWith(suffix) && code.length >= prefix.length + suffix.length && !(ignoreZero && code === self))
    .map(([code, name]) => ({ code, name }));
  return NextResponse.json({ regcodes }, { headers: { "Cache-Control": "public, max-age=86400" } });
}
