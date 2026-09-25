import { NextRequest, NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { createClient } from "@/utils/supabase/server";

/**
 * 기사 사진 모자이크 편집용 사진 받아오기 (로그인 사용자 전용)
 * 외부 언론사 사진·업로드된 사진을 같은 출처로 내려줘서 브라우저 캔버스로 편집할 수 있게 한다.
 */

const MAX_BYTES = 20 * 1024 * 1024;
const MAX_REDIRECTS = 3;

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const lower = address.toLowerCase();
    if (lower.startsWith("::ffff:")) return isPrivateAddress(lower.slice(7));
    return lower === "::1" || lower === "::" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80");
  }
  const [a, b] = address.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

async function assertPublicUrl(target: URL) {
  if (target.protocol !== "http:" && target.protocol !== "https:") throw new Error("지원하지 않는 주소입니다.");
  const host = target.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map(r => r.address);
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) throw new Error("허용되지 않는 주소입니다.");
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("로그인이 필요합니다.", { status: 401 });

  const raw = request.nextUrl.searchParams.get("url");
  if (!raw) return new NextResponse("사진 주소가 없습니다.", { status: 400 });

  try {
    let target = new URL(raw);
    let response: Response | null = null;
    // 리다이렉트도 한 단계씩 주소를 검사하며 따라간다
    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      await assertPublicUrl(target);
      response = await fetch(target, {
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          Referer: `${target.origin}/`,
        },
      });
      const location = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && location) {
        target = new URL(location, target);
        response = null;
        continue;
      }
      break;
    }

    if (!response) return new NextResponse("사진 주소가 너무 여러 번 이동했습니다.", { status: 502 });
    if (!response.ok) return new NextResponse(`사진을 받아오지 못했습니다. (${response.status})`, { status: 502 });

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return new NextResponse("사진 파일이 아닙니다.", { status: 415 });
    if (Number(response.headers.get("content-length") || 0) > MAX_BYTES) {
      return new NextResponse("사진 용량이 너무 큽니다.", { status: 413 });
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) return new NextResponse("사진 용량이 너무 큽니다.", { status: 413 });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return new NextResponse(err instanceof Error ? err.message : "사진을 받아오지 못했습니다.", { status: 502 });
  }
}
