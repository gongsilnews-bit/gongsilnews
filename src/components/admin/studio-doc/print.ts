// 문서편집 — 내보내기: 쪽 그림(PNG·JPG, 쪽마다 · 한 장으로 이어 붙이기), PDF(앱: 글자 그대로 / 웹: 그림 PDF), 인쇄용 HTML
import { toCanvas, getFontEmbedCSS } from "html-to-image";

export type Geom = { pageW: number; pageH: number; gap: number; pages: number; wMm: number; hMm: number };

/** 쪽마다 캔버스 — ratio 1 = 96dpi(보통), 3.125 = 300dpi(고화질)
 *  화면의 종이 묶음(.gsd-stack)을 복사해 숨은 곳에 두고, 쪽 하나 크기 창으로 그 쪽 자리만 찍는다 (캔버스 크기 한계를 넘지 않게) */
export async function capturePages(stack: HTMLElement, g: Geom, ratio = 1, only?: number[]): Promise<HTMLCanvasElement[]> {
  const host = document.createElement("div");
  // 화면 밖(left 음수)에 두면 html-to-image 가 빈 그림을 만든다 — 제자리에 두고 투명 · 맨 뒤로 숨긴다
  host.style.cssText = `position:fixed;left:0;top:0;width:${g.pageW}px;height:${g.pageH}px;overflow:hidden;background:#fff;pointer-events:none;z-index:-1;opacity:0`;
  const clone = stack.cloneNode(true) as HTMLElement;
  clone.classList.add("gsd-capturing");
  clone.querySelectorAll(".gsd-noprint").forEach((e) => e.remove());
  clone.querySelectorAll(".gsd-find, .gsd-find-cur").forEach((e) => e.classList.remove("gsd-find", "gsd-find-cur"));
  clone.style.transform = "none";
  clone.style.position = "absolute";
  clone.style.left = "0";
  clone.style.margin = "0";
  host.appendChild(clone);
  // .gsd-body .ProseMirror 꾸밈이 그대로 먹게 편집기 뿌리 안에 둔다
  (stack.closest(".gsd-root") || document.body).appendChild(host);
  try {
    let fontEmbedCSS: string | undefined;
    try { fontEmbedCSS = await getFontEmbedCSS(clone); } catch { fontEmbedCSS = undefined; }
    const out: HTMLCanvasElement[] = [];
    for (let i = 0; i < g.pages; i++) {
      if (only && !only.includes(i)) continue;
      clone.style.top = `${-i * (g.pageH + g.gap)}px`;
      const c = await toCanvas(host, { pixelRatio: ratio, backgroundColor: "#ffffff", width: g.pageW, height: g.pageH, fontEmbedCSS, style: { opacity: "1" } });
      out.push(c);
    }
    return out;
  } finally {
    host.remove();
  }
}

/** 쪽 그림들을 위아래로 이어 한 장으로 (쪽 사이 띄움 gapPx) */
export function stitch(cs: HTMLCanvasElement[], gapPx = 0, bg = "#ffffff"): HTMLCanvasElement {
  const w = Math.max(...cs.map((c) => c.width));
  const h = cs.reduce((s, c) => s + c.height, 0) + gapPx * Math.max(0, cs.length - 1);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = Math.min(h, 65000); // 캔버스 한계
  const x = out.getContext("2d")!;
  x.fillStyle = bg;
  x.fillRect(0, 0, out.width, out.height);
  let y = 0;
  for (const c of cs) { x.drawImage(c, 0, y); y += c.height + gapPx; }
  return out;
}

export const canvasBytes = (c: HTMLCanvasElement, type: "png" | "jpg", q = 0.92) =>
  new Promise<Uint8Array>((res, rej) => c.toBlob(async (b) => (b ? res(new Uint8Array(await b.arrayBuffer())) : rej(new Error("그림을 만들지 못했어요"))), type === "png" ? "image/png" : "image/jpeg", q));

/** 그림 PDF (웹에서 — 앱이 아니면) : 쪽마다 JPG 한 장 */
export async function imagePdf(cs: HTMLCanvasElement[], wMm: number, hMm: number): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let len = 0;
  const push = (b: Uint8Array | string) => { const u = typeof b === "string" ? enc.encode(b) : b; parts.push(u); len += u.length; };
  const W = (wMm / 25.4) * 72, H = (hMm / 25.4) * 72;
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const n = cs.length;
  // 1 catalog · 2 pages · 그 다음 쪽마다 (쪽, 그림, 내용) 3개
  const obj = (id: number, body: string | Uint8Array[], after = "") => {
    offsets[id] = len;
    push(`${id} 0 obj\n`);
    if (typeof body === "string") push(body);
    else for (const b of body) push(b);
    push(`${after}\nendobj\n`);
  };
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, `<< /Type /Pages /Count ${n} /Kids [${cs.map((_, i) => `${3 + i * 3} 0 R`).join(" ")}] >>`);
  for (let i = 0; i < n; i++) {
    const jpg = await canvasBytes(cs[i], "jpg", 0.9);
    const pid = 3 + i * 3, iid = pid + 1, cid = pid + 2;
    obj(pid, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W.toFixed(2)} ${H.toFixed(2)}] /Resources << /XObject << /Im${i} ${iid} 0 R >> >> /Contents ${cid} 0 R >>`);
    obj(iid, [enc.encode(`<< /Type /XObject /Subtype /Image /Width ${cs[i].width} /Height ${cs[i].height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`), jpg], "\nendstream");
    const content = `q ${W.toFixed(2)} 0 0 ${H.toFixed(2)} 0 0 cm /Im${i} Do Q`;
    obj(cid, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  }
  const xref = len;
  const total = 3 + n * 3;
  push(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let i = 1; i < total; i++) push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/** 이 화면의 글꼴·편집기 꾸밈(CSS)을 모은다 (인쇄 창에 같이 넣는다) */
function pageCss(): string {
  let css = "";
  for (const sh of Array.from(document.styleSheets)) {
    try { for (const r of Array.from(sh.cssRules)) css += r.cssText + "\n"; } catch { /* 다른 곳 CSS 는 못 읽는다 */ }
  }
  return css;
}

/** 인쇄·PDF 용 HTML — 쪽마다 종이 한 장 크기 칸에, 화면과 똑같은 종이 묶음을 그 쪽 자리만큼 올려 보인다 (화면과 같은 쪽 나눔) */
export function printHtml(stack: HTMLElement, g: Geom, only?: number[]): string {
  const clone = stack.cloneNode(true) as HTMLElement;
  clone.classList.add("gsd-capturing");
  clone.querySelectorAll("[contenteditable]").forEach((e) => e.removeAttribute("contenteditable"));
  clone.querySelectorAll(".gsd-noprint, .ProseMirror-gapcursor, .gsd-find, .gsd-find-cur").forEach((e) => { if (e.classList.contains("gsd-noprint")) e.remove(); else e.classList.remove("gsd-find", "gsd-find-cur"); });
  clone.style.transform = "none";
  clone.style.margin = "0";
  const inner = clone.outerHTML;
  const pages = Array.from({ length: g.pages }, (_, i) => i).filter((i) => !only || only.includes(i));
  const body = pages.map((i) => `<div class="pp"><div class="pin" style="top:${-i * (g.pageH + g.gap)}px">${inner}</div></div>`).join("");
  const base = typeof location !== "undefined" ? `<base href="${location.origin}/">` : "";
  return `<!doctype html><html><head><meta charset="utf-8">${base}<style>${pageCss()}</style><style>
@page{size:${g.wMm}mm ${g.hMm}mm;margin:0}
html,body{margin:0;padding:0;background:#fff}
.pp{position:relative;width:${g.wMm}mm;height:${g.hMm}mm;overflow:hidden;page-break-after:always;break-after:page}
.pp:last-child{page-break-after:auto;break-after:auto}
.pin{position:absolute;left:0;width:${g.pageW}px}
.gsd-sheet{box-shadow:none!important}
</style></head><body>${body}</body></html>`;
}

/** 웹(앱이 아닐 때) 인쇄 — 숨은 틀에 띄워 브라우저 인쇄 창 */
export function browserPrint(html: string) {
  const f = document.createElement("iframe");
  f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(f);
  const d = f.contentDocument!;
  d.open(); d.write(html); d.close();
  const go = () => { f.contentWindow?.focus(); f.contentWindow?.print(); setTimeout(() => f.remove(), 2000); };
  if (d.readyState === "complete") setTimeout(go, 300); else f.onload = () => setTimeout(go, 300);
}

export function download(bytes: Uint8Array | string, name: string, type = "application/octet-stream") {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
