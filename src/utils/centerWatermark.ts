"use client";

/* ──────────────────────────────────────────────
   공실 사진 가운데 복사방지 로고 (사진 파일에 직접 새김)
   - company: 우리 사무소 상호명 글자
   - logo: 공실뉴스 로고 (/logo.png — 흰 테두리 검정 글자라 밝은/어두운 사진 모두 보임)
   ────────────────────────────────────────────── */

export type WatermarkKind = "company" | "logo";

export interface WatermarkChoice {
  on: boolean;
  kind: WatermarkKind;
}

export const DEFAULT_WATERMARK_CHOICE: WatermarkChoice = { on: true, kind: "company" };

const STORAGE_KEY = "gongsil-vacancy-watermark";

/** 지난번 고른 설정 (브라우저마다 기억) */
export function loadWatermarkChoice(): WatermarkChoice {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WATERMARK_CHOICE;
    const parsed = JSON.parse(raw);
    return {
      on: typeof parsed?.on === "boolean" ? parsed.on : DEFAULT_WATERMARK_CHOICE.on,
      kind: parsed?.kind === "logo" ? "logo" : "company",
    };
  } catch {
    return DEFAULT_WATERMARK_CHOICE;
  }
}

export function saveWatermarkChoice(choice: WatermarkChoice) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
  } catch {}
}

const WATERMARK_ALPHA = 0.38;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 사진 가운데에 로고를 새긴 새 파일을 돌려준다.
 * 상호명이 비어 있으면 공실뉴스 로고로 넣는다. 실패하면 원본 그대로 돌려준다.
 */
export async function applyCenterWatermark(file: File, kind: WatermarkKind, companyName = ""): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0);

    const w = canvas.width;
    const h = canvas.height;
    const name = companyName.trim();

    ctx.save();
    ctx.globalAlpha = WATERMARK_ALPHA;
    if (kind === "company" && name) {
      // 사진 폭의 45% 안에 들어가게 글자 크기를 맞춘다
      let fontSize = Math.round(Math.min(w, h) * 0.12);
      const setFont = () => { ctx.font = `800 ${fontSize}px 'Pretendard Variable', 'Pretendard', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif`; };
      setFont();
      const maxWidth = w * 0.45;
      while (ctx.measureText(name).width > maxWidth && fontSize > 12) {
        fontSize -= 2;
        setFont();
      }
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(2, fontSize * 0.14);
      ctx.strokeStyle = "#000";
      ctx.strokeText(name, w / 2, h / 2);
      ctx.fillStyle = "#fff";
      ctx.fillText(name, w / 2, h / 2);
    } else {
      const logo = await loadImage("/logo.png");
      const logoWidth = w * 0.28;
      const logoHeight = (logo.naturalHeight / logo.naturalWidth) * logoWidth;
      ctx.drawImage(logo, (w - logoWidth) / 2, (h - logoHeight) / 2, logoWidth, logoHeight);
    }
    ctx.restore();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
    if (!blob) return file;
    const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
    return new File([blob], newName, { type: "image/webp" });
  } catch (err) {
    console.error("복사방지 로고 넣기 실패:", err);
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}
