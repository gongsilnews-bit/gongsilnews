/**
 * 클라이언트 사이드에서 Supabase Storage에 직접 파일을 업로드하는 유틸리티
 * 서버(Vercel)를 경유하지 않으므로 업로드 속도가 대폭 향상됩니다.
 * 
 * 기존 서버 액션 uploadArticleMedia, uploadVacancyPhoto 를 대체합니다.
 */

import { createClient } from "@/utils/supabase/client";

/** 브라우저에서 바로 올리는 사진도 무조건 WebP (2026-11-10 사장님) — 가로 최대 1920px · 화질 0.82. 사진이 아니거나 이미 WebP·GIF·SVG 면 그대로 */
async function toWebpFile(file: File): Promise<File> {
  const type = (file.type || "").toLowerCase();
  if (!type.startsWith("image/") || type === "image/webp" || type === "image/gif" || type.includes("svg")) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1920 / bmp.width);
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/webp", 0.82));
    if (!blob || blob.type !== "image/webp") return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch { return file; }
}
const webpPath = (p: string, f: File) => (f.type === "image/webp" && !/\.webp$/i.test(p) ? p.replace(/\.[a-z0-9]{2,5}$/i, "") + ".webp" : p);

/**
 * 기사 미디어를 Supabase Storage에 직접 업로드
 * @returns { success, url } 또는 { success: false, error }
 */
export async function uploadArticleMediaDirect(
  file: File,
  articleId: string,
  options?: { mediaType?: string; sortOrder?: number; caption?: string }
) {
  const supabase = createClient();
  
  try {
    file = await toWebpFile(file);
    const ext = file.name.split(".").pop() || "webp";
    const path = `articles/${articleId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // 1. Storage에 직접 업로드 (Vercel 서버 경유 X)
    const { error: uploadError } = await supabase.storage
      .from("article-media")
      .upload(path, file, { upsert: true });

    if (uploadError) return { success: false, error: uploadError.message };

    // 2. Public URL 획득
    const { data: urlData } = supabase.storage
      .from("article-media")
      .getPublicUrl(path);

    // 3. DB에 메타데이터 삽입 (article_media 테이블)
    const { error: dbError } = await supabase.from("article_media").insert({
      article_id: articleId,
      media_type: options?.mediaType || "PHOTO",
      url: urlData.publicUrl,
      filename: file.name,
      caption: options?.caption || null,
      sort_order: options?.sortOrder || 0,
      file_size: file.size,
    });

    if (dbError) {
      console.warn("DB insert 경고 (RLS 등):", dbError.message);
      // DB insert가 실패해도 URL은 이미 획득 → URL만 반환 (서버 액션에서 DB 저장 가능)
    }

    return { success: true, url: urlData.publicUrl };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 공실 사진을 Supabase Storage에 직접 업로드
 * @returns { success, url } 또는 { success: false, error }
 */
export async function uploadVacancyPhotoDirect(file: File, storagePath: string) {
  const supabase = createClient();

  try {
    file = await toWebpFile(file);
    storagePath = webpPath(storagePath, file);
    // 1. Storage에 직접 업로드
    const { error } = await supabase.storage
      .from("vacancy_images")
      .upload(storagePath, file, { upsert: true });

    if (error) return { success: false, error: error.message };

    // 2. Public URL 획득
    const { data: urlData } = supabase.storage
      .from("vacancy_images")
      .getPublicUrl(storagePath);

    return { success: true, url: urlData.publicUrl };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
