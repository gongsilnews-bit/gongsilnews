import { createHash, createHmac } from "crypto";

/**
 * Cloudflare R2 (공실뉴스 자료 보관함, 2026-10-28) — 보관함은 비공개. 서버가 잠깐만 쓸 수 있는 주소(서명 주소)를 만들어 준다.
 *  키: R2_ACCOUNT_ID · R2_ACCESS_KEY_ID · R2_SECRET_ACCESS_KEY · R2_BUCKET (.env.local · Vercel)
 *  S3 서명 v4 쿼리 방식 — 라이브러리 없이 (GET 만)
 */
export const r2Ready = () => Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET);

const hmac = (k: Buffer | string, s: string) => createHmac("sha256", k).update(s, "utf8").digest();
const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

/** key(보관함 안 경로) → 서명 주소. expires 초 (기본 6시간, 최대 7일) */
export function r2Url(key: string, expires = 6 * 3600): string {
  const acc = process.env.R2_ACCOUNT_ID!, id = process.env.R2_ACCESS_KEY_ID!, secret = process.env.R2_SECRET_ACCESS_KEY!, bucket = process.env.R2_BUCKET!;
  const host = `${acc}.r2.cloudflarestorage.com`;
  const path = `/${bucket}/${key.split("/").map(enc).join("/")}`;
  // 같은 시간대(1시간 단위)면 같은 주소 — 미리보기 그림이 브라우저 캐시에 남게
  const now = new Date(Math.floor(Date.now() / 3600000) * 3600000);
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const day = amzDate.slice(0, 8);
  const scope = `${day}/auto/s3/aws4_request`;
  const q: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${id}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(Math.min(604800, expires + 3600)),
    "X-Amz-SignedHeaders": "host",
  };
  const qs = Object.keys(q).sort().map((k) => `${enc(k)}=${enc(q[k])}`).join("&");
  const canonical = ["GET", path, qs, `host:${host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, createHash("sha256").update(canonical, "utf8").digest("hex")].join("\n");
  const kSign = hmac(hmac(hmac(hmac(`AWS4${secret}`, day), "auto"), "s3"), "aws4_request");
  const sig = createHmac("sha256", kSign).update(toSign, "utf8").digest("hex");
  return `https://${host}${path}?${qs}&X-Amz-Signature=${sig}`;
}

/** 보관함의 JSON 하나 읽기 (목록 파일 등) — 서버에서만 */
export async function r2Json<T>(key: string): Promise<T | null> {
  if (!r2Ready()) return null;
  const r = await fetch(r2Url(key, 600), { cache: "no-store" });
  if (!r.ok) return null;
  return (await r.json().catch(() => null)) as T | null;
}
