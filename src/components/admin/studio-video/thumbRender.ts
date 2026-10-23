// 유튜브 썸네일 그리기 — 이미지 편집의 유튜브 썸네일 틀(영상 꾸미기 5. 썸네일과 같은 것)로 (2026-10-22 사장님: SNS 올리기 썸네일이 구리다)
import { CAT_SIZES, LAYOUTS, buildLayout, contentFor, layoutFonts, previewOf, type Layout } from "@/components/admin/studio-photo/layouts";
import { composite, type Doc } from "@/components/admin/studio-photo/model";
import { loadFont } from "./Pickers";
import { thumbLines } from "./WizardDeco";

export const THUMB_SIZE = CAT_SIZES.youtube[0];
export const thumbLayouts = (): Layout[] => LAYOUTS.filter((l) => l.cats.includes("youtube") && l.aspect.includes("wide") && !l.sizes);

export const loadImg = (src: string) => new Promise<HTMLCanvasElement | null>((res) => {
  if (!src) return res(null);
  const im = new Image();
  im.crossOrigin = "anonymous";
  im.onload = () => { try { const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext("2d")!.drawImage(im, 0, 0); c.toDataURL(); res(c); } catch { res(null); } };
  im.onerror = () => res(null);
  im.src = src;
});

const contentOf = (title: string, badge = "") => { const [t1, t2] = thumbLines(title); return { title: t1, sub: t2, badge, agency: "", label: "" }; };
export async function thumbFonts(list: Layout[]) {
  await Promise.all([...new Set(list.flatMap(layoutFonts))].map((f) => loadFont(f).catch(() => {})));
}
/** 작은 미리보기 (data URL) */
export const thumbPreview = (l: Layout, bg: HTMLCanvasElement, title: string, badge = "", w = 320) => previewOf(l, THUMB_SIZE, contentOf(title, badge), bg, w);
/** 1280×720 PNG 바이트 */
export async function thumbPng(l: Layout, bg: HTMLCanvasElement, title: string, badge = ""): Promise<Uint8Array> {
  await thumbFonts([l]);
  const d = { id: "thumb", name: "thumb", psd: { width: THUMB_SIZE.w, height: THUMB_SIZE.h, children: [] }, mode: "rgb", dirty: false, pristine: false } as unknown as Doc;
  d.psd.children = buildLayout(d, l, contentFor(l, contentOf(title, badge)), bg, false);
  const c = composite(d);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
  if (!blob) throw new Error("썸네일을 그리지 못했어요");
  return new Uint8Array(await blob.arrayBuffer());
}

/** 이미지 편집에서 고칠 썸네일 문서 (레이어: 사진 · 제목 · 딱지 …) */
export async function thumbDoc(l: Layout, bg: HTMLCanvasElement, title: string, badge = ""): Promise<Doc> {
  await thumbFonts([l]);
  const d = { id: `thumb_${Date.now().toString(36)}`, name: "썸네일", psd: { width: THUMB_SIZE.w, height: THUMB_SIZE.h, children: [] }, mode: "rgb", dirty: false, pristine: false } as unknown as Doc;
  d.psd.children = buildLayout(d, l, contentFor(l, contentOf(title, badge)), bg, false);
  return d;
}
