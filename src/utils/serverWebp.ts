/**
 * 서버에서 올리는 사진은 무조건 WebP (2026-11-10 사장님: "사진은 무조건 사진 WebP")
 *  - 사진(jpg·png·heic 등)이면 가로 최대 1920px · 화질 82 로 줄여 WebP 로 바꾸고, 저장 경로 끝도 .webp 로
 *  - 이미 WebP 이거나 사진이 아니면(PDF·영상·GIF·SVG 등) 그대로
 *  - 바꾸다 실패하면 원본 그대로 올린다 (올리기 자체를 막지 않는다)
 */
export async function webpForUpload(file: File | Blob, path: string, o: { maxWidth?: number; quality?: number } = {}): Promise<{ body: File | Blob | Buffer; path: string; contentType: string }> {
  const type = String(file.type || "").toLowerCase();
  const keep = { body: file, path, contentType: type || "application/octet-stream" };
  if (!type.startsWith("image/") || type === "image/webp" || type === "image/gif" || type.includes("svg")) return keep;
  try {
    const sharp = (await import("sharp")).default;
    const buf = Buffer.from(await file.arrayBuffer());
    const out = await sharp(buf, { failOn: "none" }).rotate().resize({ width: o.maxWidth ?? 1920, withoutEnlargement: true }).webp({ quality: o.quality ?? 82 }).toBuffer();
    const next = /\.[a-z0-9]{2,5}$/i.test(path) ? path.replace(/\.[a-z0-9]{2,5}$/i, ".webp") : `${path}.webp`;
    return { body: out, path: next, contentType: "image/webp" };
  } catch {
    return keep;
  }
}
