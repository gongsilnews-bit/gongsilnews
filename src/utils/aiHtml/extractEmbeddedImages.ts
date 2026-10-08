// AI가 "파일 하나로" 만든 HTML은 사진이 글자(base64)로 통째 들어 있어 수십 MB가 된다.
// 브라우저에서 그 사진들을 찾아 WebP로 압축·업로드하고, 사진 자리를 올라간 주소로 바꾼다.
import { convertToWebp } from "@/utils/convertToWebp";

// 이보다 작은 사진(아이콘 등)은 그대로 둔다 — 올리는 시간이 더 아깝다
const MIN_INLINE_CHARS = 8_000;
const PARALLEL = 3;

const DATA_IMAGE = /data:image\/(png|jpe?g|webp|gif|avif|bmp);base64,[A-Za-z0-9+/=\s]+/gi;

export function hasEmbeddedImages(html: string): boolean {
  DATA_IMAGE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = DATA_IMAGE.exec(html))) {
    if (m[0].length >= MIN_INLINE_CHARS) return true;
  }
  return false;
}

export async function extractEmbeddedImages(
  html: string,
  upload: (file: File) => Promise<string | null>,
  onProgress?: (done: number, total: number) => void,
): Promise<{ html: string; uploaded: number; failed: number }> {
  // 같은 사진(반복되는 로고 등)은 한 번만 올린다
  const uris = new Set<string>();
  DATA_IMAGE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = DATA_IMAGE.exec(html))) {
    if (m[0].length >= MIN_INLINE_CHARS) uris.add(m[0]);
  }
  const list = [...uris];
  const urls = new Map<string, string>();
  let done = 0;
  let failed = 0;
  onProgress?.(0, list.length);

  let next = 0;
  const worker = async () => {
    while (next < list.length) {
      const uri = list[next++];
      try {
        const url = await upload(await toCompressedFile(uri, urls.size + failed));
        if (url) urls.set(uri, url);
        else failed++;
      } catch {
        failed++;
      }
      onProgress?.(++done, list.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL, list.length) }, worker));

  let out = html;
  for (const [uri, url] of urls) out = out.split(uri).join(url);
  return { html: out, uploaded: urls.size, failed };
}

async function toCompressedFile(dataUri: string, index: number): Promise<File> {
  const blob = await (await fetch(dataUri.replace(/\s+/g, ""))).blob();
  const type = blob.type || "image/png";
  const ext = type.split("/")[1]?.replace("jpeg", "jpg") || "png";
  const file = new File([blob], `html-image-${index + 1}.${ext}`, { type });
  // 움직이는 GIF는 압축하면 멈추므로 그대로 올린다
  if (type === "image/gif") return file;
  const webp = await convertToWebp(file);
  // 이미 작은 WebP라 오히려 커졌다면 원본을 쓴다
  return webp.size < file.size ? webp : file;
}
