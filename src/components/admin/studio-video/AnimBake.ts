// 굽기 전에 — 사진 올리기·스티커의 애니메이션을 칸(1/30초)마다 투명 PNG 로 그려 앱에 넘긴다 (2026-10-19, 회의 3-28 ①)
//  미리보기(Player.tsx lookOf → animCss)와 같은 계산(timeline.animAt)·같은 자리(render.js overlayImage)라 완성 영상 = 미리보기.
//  ffmpeg 만으로는 칸마다 크기를 바꿀 수 없어서, 움직이는 동안의 그림을 여기서 그리고 앱(render.js)은 그 그림을 그대로 얹는다.
//  화면 글자·메인자막 애니메이션은 앱이 자막 엔진으로 칸마다 그린다 (render.js animTextEvents).
import type { Layer, Project, VideoBridge } from "./types";
import { animAt, animOf, clipOrder, cropOf, flatten, imgRect, layerAtTime, layerSpan, layersAt, type FlatItem } from "./timeline";
import { drawTemplate, isMotionStyle, tplFonts } from "./Templates";

const FPS = 30;
const RATIOS: Record<string, [number, number]> = { "16:9": [1920, 1080], "9:16": [1080, 1920], "1:1": [1080, 1080], "4:5": [1080, 1350], "4:3": [1440, 1080] };

/** 굽기와 같은 클립 목록 (고른 클립·이 씬만이면 그것만, 시각은 0부터 다시) — render.js render() 와 같다 */
function itemsFor(p: Project, o: { scope?: string; sceneId?: string; clipIds?: string[] }): FlatItem[] {
  let { items } = flatten(p);
  if (o.scope === "scene" && o.sceneId) {
    const sc = p.scenes.find((s) => s.id === o.sceneId);
    const ids = new Set((sc ? sc.clips : []).map((c) => c.id));
    items = items.filter((x) => ids.has(x.clip.id));
  } else if (o.scope === "selected" && o.clipIds?.length) {
    const ids = new Set(o.clipIds);
    items = items.filter((x) => ids.has(x.clip.id));
  }
  let acc = 0;
  return items.map((x) => {
    const y = { ...x, start: acc };
    acc += x.dur;
    return y;
  });
}

function loadImg(url: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => res(im);
    im.onerror = () => rej(new Error("그림을 읽지 못했어요"));
    im.src = url;
  });
}

/**
 * 애니메이션이 있는 사진·스티커 레이어마다 클립별로 칸 그림을 만들어 두고, 굽기에 넘길 프로젝트 사본(layers[].bake)을 돌려준다.
 *  옛 앱(animFrames 없음)이거나 그리다 실패하면 그 레이어는 그대로(움직임 없이) 굽는다.
 */
export async function bakeAnim(p: Project, o: { scope?: string; sceneId?: string; clipIds?: string[] }, b: VideoBridge, onProgress: (text: string, frac: number) => void): Promise<Project> {
  if (!b.animFrames) return p;
  const [W, H] = RATIOS[p.ratio] || RATIOS["16:9"];
  const items = itemsFor(p, o);
  const order = clipOrder(p);
  const out: Project = structuredClone(p);
  // 움직이는 템플릿(경로·카운트다운·슬롯머신 …)은 애니메이션이 없어도 칸마다 다시 그린다
  const motion = (l: Layer) => Boolean(l.stk && isMotionStyle(l.stk.style));
  // 키프레임 (2026-10-20) — 자리·크기·돌림·진하기가 칸마다 바뀌어서 같이 그린다 (채우기 사진은 키프레임 없음)
  const keyed = (l: Layer) => Boolean(l.kf?.length) && l.fit !== "cover" && l.fit !== "contain";
  const layers = (out.layers || []).filter((l) => l.type === "image" && !l.off && l.asset && p.assets[l.asset]?.kind === "image" && (animOf(p, l) || motion(l) || keyed(l)));
  if (layers.some(motion)) await tplFonts();
  // 할 일 (레이어 × 클립)
  const jobs: { l: Layer; it: FlatItem; a: number; b: number; s0: number; s1: number }[] = [];
  for (const it of items) {
    const here = new Set(layersAt(p, it.clip.id, order).map((x) => x.id));
    for (const l of layers) {
      if (!here.has(l.id)) continue;
      const sp = layerSpan(p, l, items, it.clip.id, p.settings, order);
      if (!sp) continue;
      const s0 = Math.max(0, sp.a), s1 = Math.min(it.dur, sp.b);
      if (s1 - s0 > 0.01) jobs.push({ l, it, a: sp.a, b: sp.b, s0, s1 });
    }
  }
  if (!jobs.length) return p;
  const imgs = new Map<string, HTMLImageElement>();
  let done = 0;
  for (const j of jobs) {
    done++;
    onProgress(`그래픽·사진 움직임을 그리는 중… (${done}/${jobs.length})`, 0);
    const l = j.l;
    const a = p.assets[l.asset!];
    try {
      let img = imgs.get(a.id);
      if (!img) {
        img = await loadImg(a.url);
        imgs.set(a.id, img);
      }
      const an = animOf(p, l) || { dur: 0.5 };
      const n = Math.max(1, Math.ceil((j.s1 - j.s0) * FPS));
      // 자리 — render.js overlayImage·미리보기 Player 와 같은 계산 (채우기면 화면 전체)
      const full = l.fit === "cover" || l.fit === "contain";
      let pw = W, ph = H, x0 = 0, y0 = 0;
      if (!full) {
        const r0 = imgRect(l, a, W, H);
        pw = Math.max(8, Math.round(r0.width / 2) * 2);
        ph = a.width && a.height ? Math.round((pw * a.height) / a.width / 2) * 2 : pw;
        x0 = Math.round(r0.left + (r0.width - pw) / 2);
        y0 = Math.round(r0.top + (r0.height - ph) / 2);
      }
      const looks = Array.from({ length: n }, (_, k) => {
        const tt = j.s0 + k / FPS;
        const r = animAt(an, tt, j.a, j.b);
        if (keyed(l)) {
          // 그 시각 모습 (미리보기 layerAtTime·imgRect 와 같다) → 처음 자리에서 옮김·크기·돌림·진하기
          const L = layerAtTime(l, tt - j.a);
          const rr = imgRect(L, a, W, H);
          r.dx += (rr.left + rr.width / 2 - (x0 + pw / 2)) / W;
          r.dy += (rr.top + rr.height / 2 - (y0 + ph / 2)) / H;
          r.sc *= rr.width / Math.max(1, pw);
          r.rot += (Number(L.rot) || 0) - (Number(l.rot) || 0);
          r.op *= (L.opacity ?? 1) / Math.max(0.01, l.opacity ?? 1);
        }
        return r;
      });
      const mo = motion(l);
      if (!mo && looks.every((r) => r.op === 1 && r.sc === 1 && r.sx === 1 && r.rot === 0 && r.dx === 0 && r.dy === 0)) continue; // 이 클립에선 안 움직인다 (돌린 것은 굽기가 그대로 돌린다)
      // 움직이는 동안 차지하는 넓이 (모든 칸을 합친 상자, 화면 안으로)
      let minX = W, minY = H, maxX = 0, maxY = 0;
      for (const r of looks) {
        if (r.op <= 0.004) continue;
        const cx = x0 + pw / 2 + r.dx * W, cy = y0 + ph / 2 + r.dy * H;
        const hw = (pw / 2) * Math.abs(r.sc * r.sx), hh = (ph / 2) * Math.abs(r.sc);
        const t = ((r.rot + (Number(l.rot) || 0)) * Math.PI) / 180, c = Math.abs(Math.cos(t)), s = Math.abs(Math.sin(t));
        const ex = hw * c + hh * s, ey = hw * s + hh * c;
        minX = Math.min(minX, cx - ex); maxX = Math.max(maxX, cx + ex);
        minY = Math.min(minY, cy - ey); maxY = Math.max(maxY, cy + ey);
      }
      const bx = Math.max(0, Math.floor(minX)), by = Math.max(0, Math.floor(minY));
      const bw = Math.max(2, Math.min(W, Math.ceil(maxX)) - bx), bh = Math.max(2, Math.min(H, Math.ceil(maxY)) - by);
      if (maxX <= minX || maxY <= minY) continue;
      const cv = document.createElement("canvas");
      cv.width = bw;
      cv.height = bh;
      const g = cv.getContext("2d")!;
      g.imageSmoothingQuality = "high";
      const op0 = Math.max(0.05, Math.min(1, l.opacity ?? 1));
      const key = `${l.id}_${j.it.clip.id}`.replace(/[^A-Za-z0-9_-]/g, "");
      let dir = "";
      let batch: string[] = [];
      let sent = 0;
      for (let k = 0; k < n; k++) {
        const r = looks[k];
        g.clearRect(0, 0, bw, bh);
        if (r.op > 0.004 && r.sc > 0.004) {
          g.save();
          g.globalAlpha = op0 * Math.min(1, r.op);
          g.translate(x0 + pw / 2 + r.dx * W - bx, y0 + ph / 2 + r.dy * H - by);
          g.rotate(((r.rot + (Number(l.rot) || 0)) * Math.PI) / 180);
          g.scale(r.sc * r.sx * (l.flipX ? -1 : 1), r.sc * (l.flipY ? -1 : 1));
          if (full) {
            // 채우기 — 화면 크기 칸 안에 비율 유지(맞추기) / 잘라서(채우기)
            const kk = l.fit === "cover" ? Math.max(W / img.width, H / img.height) : Math.min(W / img.width, H / img.height);
            g.beginPath();
            g.rect(-W / 2, -H / 2, W, H);
            g.clip();
            g.drawImage(img, (-img.width * kk) / 2, (-img.height * kk) / 2, img.width * kk, img.height * kk);
          } else {
            const src: CanvasImageSource & { width: number; height: number } = mo ? drawTemplate(l.stk!.style, l.stk!.text, l.stk!.color, Math.max(0, j.s0 + k / FPS - j.a)) : img;
            const cr = cropOf(l.crop); // 자르기 — 원본 가장자리 (미리보기 clip-path·굽기 crop 과 같은 값)
            if (cr) g.drawImage(src, src.width * cr.l, src.height * cr.t, src.width * (1 - cr.l - cr.r), src.height * (1 - cr.t - cr.b), -pw / 2 + pw * cr.l, -ph / 2 + ph * cr.t, pw * (1 - cr.l - cr.r), ph * (1 - cr.t - cr.b));
            else g.drawImage(src, -pw / 2, -ph / 2, pw, ph);
          }
          g.restore();
        }
        batch.push(cv.toDataURL("image/png"));
        if (batch.length >= 24 || k === n - 1) {
          dir = await b.animFrames(p.dir, key, sent, batch);
          sent += batch.length;
          batch = [];
        }
      }
      const L = (out.layers || []).find((x) => x.id === l.id);
      if (L && dir) L.bake = { ...(L.bake || {}), [j.it.clip.id]: { dir, s0: j.s0, n, x: bx, y: by } };
    } catch {
      // 이 레이어는 움직임 없이 그대로
    }
  }
  return out;
}
