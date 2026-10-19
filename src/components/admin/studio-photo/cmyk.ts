// 이미지 편집 — CMYK(인쇄용) 모드 (회의 2026-10-19)
//  - 문서 그림은 RGB 로 그리고, 인쇄용 파일을 만들 때 CMYK 로 바꾼다
//  - 인쇄 색 미리보기: 바꾼 CMYK 를 실제 잉크 색으로 다시 칠해 본다 (형광·쨍한 색은 칙칙하게 → 인쇄로 안 나오는 색을 미리 안다)
//  - 인쇄용 파일: PDF(CMYK) · TIFF(CMYK) — 재단 여백(가장자리 늘림)을 넣을 수 있다
//  ※ 아직 인쇄소 표준 색 기준(ICC)을 쓰지 않은 간단한 계산이다 — 거래 인쇄소의 기준이 정해지면 그 기준으로 바꾼다

export type Cmyk = { c: number; m: number; y: number; k: number }; // 0~1

/** RGB(0~255) → CMYK(0~1) — 검정은 K 로 (C·M·Y 중 가장 작은 것이 0) */
export function rgbToCmyk(r: number, g: number, b: number): Cmyk {
  const R = r / 255, G = g / 255, B = b / 255;
  const k = 1 - Math.max(R, G, B);
  if (k >= 0.9999) return { c: 0, m: 0, y: 0, k: 1 };
  return { c: (1 - R - k) / (1 - k), m: (1 - G - k) / (1 - k), y: (1 - B - k) / (1 - k), k };
}
/** CMYK → RGB (위의 거꾸로 — 입력한 CMYK 가 그대로 돌아오게) */
export function cmykToRgb({ c, m, y, k }: Cmyk) {
  return { r: Math.round(255 * (1 - c) * (1 - k)), g: Math.round(255 * (1 - m) * (1 - k)), b: Math.round(255 * (1 - y) * (1 - k)) };
}

/* 인쇄 색 미리보기 — 잉크가 빛을 거르는 정도로 (종이 흰색 위에 C·M·Y·K 잉크를 겹친다) */
const INK = { c: [0, 160, 233], m: [228, 0, 127], y: [255, 241, 0], k: [35, 24, 21] };
export function proofRgb(r: number, g: number, b: number): [number, number, number] {
  const x = rgbToCmyk(r, g, b);
  const out: [number, number, number] = [255, 255, 255];
  for (let ch = 0; ch < 3; ch++) {
    let t = 1;
    t *= 1 - x.c * (1 - INK.c[ch] / 255);
    t *= 1 - x.m * (1 - INK.m[ch] / 255);
    t *= 1 - x.y * (1 - INK.y[ch] / 255);
    t *= 1 - x.k * (1 - INK.k[ch] / 255);
    out[ch] = Math.round(255 * t);
  }
  return out;
}
/** 인쇄로 그대로 안 나오는 색인가 (미리보기 색과 많이 다르면) */
export function outOfGamut(r: number, g: number, b: number) {
  const [pr, pg, pb] = proofRgb(r, g, b);
  return Math.hypot(pr - r, pg - g, pb - b) > 60;
}
// 빠르게 — 채널마다 6비트(64단계) 표
let LUT: Uint8Array | null = null;
function lut() {
  if (LUT) return LUT;
  LUT = new Uint8Array(64 * 64 * 64 * 3);
  for (let r = 0; r < 64; r++) for (let g = 0; g < 64; g++) for (let b = 0; b < 64; b++) {
    const p = proofRgb((r * 255) / 63, (g * 255) / 63, (b * 255) / 63);
    const i = ((r * 64 + g) * 64 + b) * 3;
    LUT[i] = p[0]; LUT[i + 1] = p[1]; LUT[i + 2] = p[2];
  }
  return LUT;
}
/** 그림을 인쇄 색으로 (작게 줄인 화면용 그림에) */
export function proofCanvas(src: HTMLCanvasElement, maxSide: number) {
  const k = Math.min(1, maxSide / Math.max(src.width, src.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(src.width * k));
  c.height = Math.max(1, Math.round(src.height * k));
  const g = c.getContext("2d")!;
  g.imageSmoothingQuality = "high";
  g.drawImage(src, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height);
  const T = lut();
  for (let i = 0; i < d.data.length; i += 4) {
    const j = (((d.data[i] >> 2) * 64 + (d.data[i + 1] >> 2)) * 64 + (d.data[i + 2] >> 2)) * 3;
    d.data[i] = T[j]; d.data[i + 1] = T[j + 1]; d.data[i + 2] = T[j + 2];
  }
  g.putImageData(d, 0, 0);
  return c;
}

/* ── 인쇄용 파일 ── */
/** 재단 여백 — 가장자리 픽셀을 늘려 사방에 bleed 픽셀만큼 (흰 바탕 위에) */
export function withBleed(src: HTMLCanvasElement, bleed: number) {
  const W = src.width + bleed * 2, H = src.height + bleed * 2;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, W, H);
  if (bleed > 0) {
    const w = src.width, h = src.height, b = bleed;
    // 네 변 · 네 모서리
    g.drawImage(src, 0, 0, w, 1, b, 0, w, b);
    g.drawImage(src, 0, h - 1, w, 1, b, h + b, w, b);
    g.drawImage(src, 0, 0, 1, h, 0, b, b, h);
    g.drawImage(src, w - 1, 0, 1, h, w + b, b, b, h);
    g.drawImage(src, 0, 0, 1, 1, 0, 0, b, b);
    g.drawImage(src, w - 1, 0, 1, 1, w + b, 0, b, b);
    g.drawImage(src, 0, h - 1, 1, 1, 0, h + b, b, b);
    g.drawImage(src, w - 1, h - 1, 1, 1, w + b, h + b, b, b);
  }
  g.drawImage(src, bleed, bleed);
  return c;
}
/** 그림 → CMYK 바이트 (한 픽셀 4바이트, 0=잉크 없음 ~ 255=가득). 투명은 흰 종이 */
function cmykBytes(c: HTMLCanvasElement) {
  const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
  const out = new Uint8Array(c.width * c.height * 4);
  for (let i = 0, o = 0; i < d.length; i += 4, o += 4) {
    const a = d[i + 3] / 255;
    const r = 255 - (255 - d[i]) * a, g = 255 - (255 - d[i + 1]) * a, b = 255 - (255 - d[i + 2]) * a;
    const x = rgbToCmyk(r, g, b);
    out[o] = Math.round(x.c * 255); out[o + 1] = Math.round(x.m * 255); out[o + 2] = Math.round(x.y * 255); out[o + 3] = Math.round(x.k * 255);
  }
  return out;
}
async function deflate(bytes: Uint8Array) {
  const cs = new CompressionStream("deflate"); // zlib 형식 — PDF FlateDecode · TIFF 압축 8 과 같다
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(cs);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
const enc = new TextEncoder();

/** 인쇄용 PDF (CMYK, 한 장) — 재단선 상자(TrimBox)·여백 상자(BleedBox) 포함 */
export async function cmykPdf(src: HTMLCanvasElement, ppi: number, bleedMm: number) {
  const bleed = Math.round((bleedMm / 25.4) * ppi);
  const c = withBleed(src, bleed);
  const data = await deflate(cmykBytes(c));
  const pt = (px: number) => (px / ppi) * 72;
  const PW = pt(c.width), PH = pt(c.height), b = pt(bleed);
  const f = (n: number) => n.toFixed(3);
  const objs: (string | Uint8Array)[][] = [];
  objs.push(["<< /Type /Catalog /Pages 2 0 R >>"]);
  objs.push(["<< /Type /Pages /Kids [3 0 R] /Count 1 >>"]);
  objs.push([`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(PW)} ${f(PH)}] /BleedBox [0 0 ${f(PW)} ${f(PH)}] /TrimBox [${f(b)} ${f(b)} ${f(PW - b)} ${f(PH - b)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`]);
  objs.push([`<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceCMYK /BitsPerComponent 8 /Filter /FlateDecode /Length ${data.length} >>\nstream\n`, data, "\nendstream"]);
  const content = `q ${f(PW)} 0 0 ${f(PH)} 0 0 cm /Im0 Do Q`;
  objs.push([`<< /Length ${content.length} >>\nstream\n${content}\nendstream`]);
  const parts: Uint8Array[] = [enc.encode("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")];
  let len = parts[0].length;
  const offs: number[] = [];
  objs.forEach((o, i) => {
    offs.push(len);
    const chunks = [enc.encode(`${i + 1} 0 obj\n`), ...o.map((x) => (typeof x === "string" ? enc.encode(x) : x)), enc.encode("\nendobj\n")];
    for (const ch of chunks) { parts.push(ch); len += ch.length; }
  });
  const xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${len}\n%%EOF\n`;
  parts.push(enc.encode(xref));
  return concat(parts);
}

/** 인쇄용 TIFF (CMYK, 압축) — 해상도(ppi) 포함 */
export async function cmykTiff(src: HTMLCanvasElement, ppi: number, bleedMm: number) {
  const bleed = Math.round((bleedMm / 25.4) * ppi);
  const c = withBleed(src, bleed);
  const data = await deflate(cmykBytes(c));
  // 머리 8 + 그림 + IFD
  const tags: [number, number, number, number][] = []; // [tag, type, count, value]
  const ifdOff = 8 + data.length + (data.length % 2);
  const nTags = 12;
  const extra = ifdOff + 2 + nTags * 12 + 4; // IFD 뒤 덧붙임 자리 (BitsPerSample 4개, 해상도 분수 2개)
  const bpsOff = extra, xresOff = extra + 8, yresOff = extra + 16;
  tags.push([256, 4, 1, c.width]); // ImageWidth
  tags.push([257, 4, 1, c.height]); // ImageLength
  tags.push([258, 3, 4, bpsOff]); // BitsPerSample 8,8,8,8
  tags.push([259, 3, 1, 8]); // Compression = Deflate (Adobe)
  tags.push([262, 3, 1, 5]); // Photometric = Separated (CMYK)
  tags.push([273, 4, 1, 8]); // StripOffsets
  tags.push([277, 3, 1, 4]); // SamplesPerPixel
  tags.push([278, 4, 1, c.height]); // RowsPerStrip
  tags.push([279, 4, 1, data.length]); // StripByteCounts
  tags.push([282, 5, 1, xresOff]); // XResolution
  tags.push([283, 5, 1, yresOff]); // YResolution
  tags.push([296, 3, 1, 2]); // ResolutionUnit = inch
  const buf = new Uint8Array(extra + 24);
  const dv = new DataView(buf.buffer);
  buf[0] = 0x49; buf[1] = 0x49; dv.setUint16(2, 42, true); dv.setUint32(4, ifdOff, true);
  buf.set(data, 8);
  dv.setUint16(ifdOff, nTags, true);
  tags.forEach(([tag, type, count, value], i) => {
    const o = ifdOff + 2 + i * 12;
    dv.setUint16(o, tag, true); dv.setUint16(o + 2, type, true); dv.setUint32(o + 4, count, true);
    if (type === 3 && count === 1) dv.setUint16(o + 8, value, true);
    else dv.setUint32(o + 8, value, true);
  });
  dv.setUint32(ifdOff + 2 + nTags * 12, 0, true);
  for (let i = 0; i < 4; i++) dv.setUint16(bpsOff + i * 2, 8, true);
  dv.setUint32(xresOff, Math.round(ppi), true); dv.setUint32(xresOff + 4, 1, true);
  dv.setUint32(yresOff, Math.round(ppi), true); dv.setUint32(yresOff + 4, 1, true);
  return buf;
}
function concat(parts: Uint8Array[]) {
  const n = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
