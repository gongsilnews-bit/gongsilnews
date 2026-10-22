// 이미지 편집 — GIF 만들기 (웹용으로 저장). 브라우저에는 GIF 저장이 없어서 직접: 256색 고르기 → (번짐 섞기) → LZW 압축
// 색 고르기는 많이 쓰인 색에서 출발해 몇 번 다듬는다 (k-평균). 반투명은 128 기준으로 투명/불투명

/** 그림 → GIF 바이트 */
export function encodeGif(c: HTMLCanvasElement, dither = true): Uint8Array {
  const W = c.width, H = c.height;
  const d = c.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, W, H).data;
  let hasAlpha = false;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 128) { hasAlpha = true; break; }
  const pal = palette(d, hasAlpha ? 255 : 256);
  const idx = mapPixels(d, W, H, pal, dither, hasAlpha);
  const out: number[] = [];
  const u16 = (v: number) => out.push(v & 255, (v >> 8) & 255);
  // 머리
  for (const ch of "GIF89a") out.push(ch.charCodeAt(0));
  u16(W); u16(H);
  out.push(0xf7, 0, 0); // 전역 색표 256색
  for (let i = 0; i < 256; i++) { const p = pal[i] || [0, 0, 0]; out.push(p[0], p[1], p[2]); }
  if (hasAlpha) out.push(0x21, 0xf9, 4, 0x01, 0, 0, 255, 0); // 투명 = 255번
  out.push(0x2c, 0, 0, 0, 0); u16(W); u16(H); out.push(0);
  // 그림 (LZW)
  out.push(8);
  const data = lzw(idx, 8);
  for (let i = 0; i < data.length; i += 255) {
    const n = Math.min(255, data.length - i);
    out.push(n);
    for (let j = 0; j < n; j++) out.push(data[i + j]);
  }
  out.push(0, 0x3b);
  return Uint8Array.from(out);
}

function palette(d: Uint8ClampedArray, n: number): number[][] {
  // 15비트로 묶어 세고, 많이 쓰인 순으로 시작점 → k-평균 몇 번
  const cnt = new Map<number, { n: number; r: number; g: number; b: number }>();
  const step = Math.max(1, Math.floor(d.length / 4 / 200000)) * 4;
  for (let i = 0; i < d.length; i += step) {
    if (d[i + 3] < 128) continue;
    const k = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
    const e = cnt.get(k);
    if (e) { e.n++; e.r += d[i]; e.g += d[i + 1]; e.b += d[i + 2]; } else cnt.set(k, { n: 1, r: d[i], g: d[i + 1], b: d[i + 2] });
  }
  const buckets = [...cnt.values()].map((e) => ({ n: e.n, c: [e.r / e.n, e.g / e.n, e.b / e.n] }));
  if (buckets.length <= n) return buckets.map((b) => b.c.map(Math.round));
  buckets.sort((a, b) => b.n - a.n);
  // 시작점: 많이 쓰인 색 중 서로 너무 가깝지 않은 것
  const cent: number[][] = [];
  for (const b of buckets) {
    if (cent.length >= n) break;
    if (cent.every((c) => (c[0] - b.c[0]) ** 2 + (c[1] - b.c[1]) ** 2 + (c[2] - b.c[2]) ** 2 > 200)) cent.push([...b.c]);
  }
  for (const b of buckets) { if (cent.length >= n) break; cent.push([...b.c]); }
  for (let it = 0; it < 4; it++) {
    const acc = cent.map(() => [0, 0, 0, 0]);
    for (const b of buckets) {
      let best = 0, bd = Infinity;
      for (let j = 0; j < cent.length; j++) {
        const c = cent[j], dd = (c[0] - b.c[0]) ** 2 + (c[1] - b.c[1]) ** 2 + (c[2] - b.c[2]) ** 2;
        if (dd < bd) { bd = dd; best = j; }
      }
      const a = acc[best];
      a[0] += b.c[0] * b.n; a[1] += b.c[1] * b.n; a[2] += b.c[2] * b.n; a[3] += b.n;
    }
    acc.forEach((a, j) => { if (a[3]) cent[j] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]; });
  }
  return cent.map((c) => c.map((v) => Math.max(0, Math.min(255, Math.round(v)))));
}

function mapPixels(d: Uint8ClampedArray, W: number, H: number, pal: number[][], dither: boolean, alpha: boolean) {
  const idx = new Uint8Array(W * H);
  const cache = new Int16Array(32768).fill(-1);
  const near = (r: number, g: number, b: number) => {
    const k = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    if (cache[k] >= 0) return cache[k];
    let best = 0, bd = Infinity;
    for (let j = 0; j < pal.length; j++) {
      const p = pal[j], dd = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2;
      if (dd < bd) { bd = dd; best = j; }
    }
    cache[k] = best;
    return best;
  };
  const err = dither ? new Float32Array(W * H * 3) : null;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x, i = p * 4;
    if (alpha && d[i + 3] < 128) { idx[p] = 255; continue; }
    let r = d[i], g = d[i + 1], b = d[i + 2];
    if (err) { r = Math.max(0, Math.min(255, r + err[p * 3])); g = Math.max(0, Math.min(255, g + err[p * 3 + 1])); b = Math.max(0, Math.min(255, b + err[p * 3 + 2])); }
    const j = near(r, g, b);
    idx[p] = j;
    if (err) {
      // 플로이드-스타인버그 — 남은 차이를 옆·아래로
      const er = r - pal[j][0], eg = g - pal[j][1], eb = b - pal[j][2];
      const add = (q: number, f: number) => { err[q * 3] += er * f; err[q * 3 + 1] += eg * f; err[q * 3 + 2] += eb * f; };
      if (x + 1 < W) add(p + 1, 7 / 16);
      if (y + 1 < H) { if (x > 0) add(p + W - 1, 3 / 16); add(p + W, 5 / 16); if (x + 1 < W) add(p + W + 1, 1 / 16); }
    }
  }
  return idx;
}

function lzw(idx: Uint8Array, minSize: number) {
  const clear = 1 << minSize, eoi = clear + 1;
  const out: number[] = [];
  let cur = 0, bits = 0, size = minSize + 1;
  const emit = (code: number) => {
    cur |= code << bits;
    bits += size;
    while (bits >= 8) { out.push(cur & 255); cur >>>= 8; bits -= 8; }
  };
  let dict = new Map<number, number>();
  let next = eoi + 1;
  emit(clear);
  let w = idx[0];
  for (let i = 1; i < idx.length; i++) {
    const k = idx[i];
    const key = (w << 8) | k;
    const hit = dict.get(key);
    if (hit !== undefined) { w = hit; continue; }
    emit(w);
    if (next < 4096) {
      dict.set(key, next++);
      if (next > 1 << size && size < 12) size++; // 풀 때 한 박자 늦게 느는 것에 맞춘다
    } else {
      emit(clear);
      dict = new Map();
      next = eoi + 1;
      size = minSize + 1;
    }
    w = k;
  }
  emit(w);
  emit(eoi);
  if (bits > 0) out.push(cur & 255);
  return out;
}
