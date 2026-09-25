/**
 * 기사 사진 모자이크 공통 유틸 (PC·모바일 기사작성 공용)
 */

export type MosaicRect = { left: number; top: number; width: number; height: number };

/** 캔버스의 지정 영역(원본 픽셀 기준)을 모자이크 처리한다. 블록 크기는 영역 크기의 1/16. */
export function pixelateCanvasRegion(canvas: HTMLCanvasElement, rect: MosaicRect): boolean {
  const context = canvas.getContext("2d");
  if (!context) return false;

  const sourceX = Math.max(0, Math.round(rect.left));
  const sourceY = Math.max(0, Math.round(rect.top));
  const sourceWidth = Math.min(canvas.width - sourceX, Math.round(rect.width));
  const sourceHeight = Math.min(canvas.height - sourceY, Math.round(rect.height));
  if (sourceWidth <= 0 || sourceHeight <= 0) return false;

  const mosaicWidth = Math.max(2, Math.round(sourceWidth / 16));
  const mosaicHeight = Math.max(2, Math.round(sourceHeight / 16));
  const mosaicCanvas = document.createElement("canvas");
  mosaicCanvas.width = mosaicWidth;
  mosaicCanvas.height = mosaicHeight;
  const mosaicContext = mosaicCanvas.getContext("2d");
  if (!mosaicContext) return false;
  mosaicContext.imageSmoothingEnabled = false;
  mosaicContext.drawImage(canvas, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, mosaicWidth, mosaicHeight);
  context.imageSmoothingEnabled = false;
  context.drawImage(mosaicCanvas, 0, 0, mosaicWidth, mosaicHeight, sourceX, sourceY, sourceWidth, sourceHeight);
  return true;
}

/**
 * 편집 가능한(캔버스가 오염되지 않는) 이미지를 불러온다.
 * blob:/data: 주소는 그대로, 그 외(업로드된 사진·외부 언론사 사진)는 로그인 전용 서버 통로로 받아온다.
 */
export async function loadEditableImage(src: string): Promise<HTMLImageElement> {
  let objectUrl: string | null = null;
  let imageSrc = src;
  if (!src.startsWith("blob:") && !src.startsWith("data:")) {
    const absolute = new URL(src, window.location.href).toString();
    const res = await fetch(`/api/article-photo-source?url=${encodeURIComponent(absolute)}`);
    if (!res.ok) {
      const message = await res.text().catch(() => "");
      throw new Error(message || "사진을 불러오지 못했습니다.");
    }
    objectUrl = URL.createObjectURL(await res.blob());
    imageSrc = objectUrl;
  }

  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("사진을 열 수 없습니다."));
      image.src = imageSrc;
    });
  } finally {
    // 이미지가 디코딩된 뒤에는 캔버스에 그리므로 임시 주소는 바로 해제한다
    if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl!), 0);
  }
}

/** 캔버스를 WebP 파일로 변환한다. */
export async function canvasToWebpFile(canvas: HTMLCanvasElement, baseName: string): Promise<File> {
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", 0.92));
  if (!blob) throw new Error("사진을 저장하지 못했습니다.");
  const name = (baseName.replace(/\.[^/.]+$/, "") || "photo") + "_mosaic.webp";
  return new File([blob], name, { type: "image/webp" });
}
