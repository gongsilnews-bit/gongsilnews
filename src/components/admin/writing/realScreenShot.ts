"use client";

import { helper } from "@/components/admin/studio-web/core";

/**
 * 기사쓰기 단지 분석 — 실제 화면을 그대로 여러 장 찍는다 (2026-11-09 사장님: 캡처가 부자연스러움 → 지도·공실뉴스가 다 보이게 → 다양하게 다 찍기)
 *  ① 우리동네부동산 단지 화면 (/gongsil?apt=) — 공실뉴스 머리줄 · 단지 시세 창 · 가격 지도
 *  ⑤ ①에서 왼쪽 단지 시세 창만 잘라 크게 (따로 찍지 않음)
 *  ② 단지 쪽을 보는 로드뷰 (/apt-capture?part=street)
 *  ③ 스카이뷰 단지 전경 (part=sky)
 *  ④ 넓은 지도 — 역·학교·큰길 (part=wide)
 *  찍기: 도우미(크롬 확장 4.1.3+)가 있으면 자동, 없으면 [이 화면 찍기] 한 번 → 크롬 탭 공유를 끝까지 이어 쓴다
 *  순서는 [무엇을 중심으로]에 따라 (맨 앞이 대표 사진). 예전 html-to-image 다시 그리기는 글자가 어긋나고 지도를 못 그려 어색했다
 */
export type RealShot = { url: string; thumb: string; caption: string };
export type ShotFocus = "all" | "complex" | "price" | "region";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 도우미에 "이 탭 찍기" — 도우미가 둘 깔려 있으면(웹스토어 예전 판 + 새 판) 둘 다 대답한다.
 *  예전 판은 찍기를 몰라 곧바로 실패로 답하므로, 실패가 먼저 와도 2.5초 더 기다려 성공한 답을 쓴다 */
function askCapture(): Promise<{ ok?: boolean; dataUrl?: string; error?: string } | null> {
  return new Promise((resolve) => {
    const id = `${Date.now()}-${Math.random()}`;
    let fail: { ok?: boolean; error?: string } | null = null;
    let grace: ReturnType<typeof setTimeout> | null = null;
    const done = (v: { ok?: boolean; dataUrl?: string; error?: string } | null) => { clearTimeout(t); if (grace) clearTimeout(grace); window.removeEventListener("message", on); resolve(v); };
    const t = setTimeout(() => done(fail), 12000);
    const on = (e: MessageEvent) => {
      if (e.source !== window || !e.data || e.data.gsHelperRes !== true || e.data.id !== id) return;
      const r = e.data.res;
      if (r?.ok && r.dataUrl) return done(r);
      if (!fail || r?.error) fail = r || fail;
      if (!grace) grace = setTimeout(() => done(fail), 2500);
    };
    window.addEventListener("message", on);
    window.postMessage({ gsHelperReq: true, id, msg: { op: "captureTab" } }, location.origin);
  });
}

/** 찍는 도구 — 도우미 또는 크롬 탭 공유(한 번 허락하면 끝까지 이어 쓴다) */
type Snapper = { snap: () => Promise<Blob | null>; close: () => void };

async function helperSnapper(): Promise<{ s: Snapper | null; why: string }> {
  const ping = await helper({ op: "ping" }, 1500);
  if (!ping?.ok) return { s: null, why: "도우미(크롬 확장)가 이 탭에 연결되지 않았어요" };
  const ver = String(ping.version || "");
  const first = await askCapture();
  if (!first?.ok || !first.dataUrl) {
    const why = first == null ? `도우미 ${ver}가 대답하지 않았어요 (4.1.3 이상이면 자동으로 찍어요)` : `도우미 ${ver}: ${first.error || "찍지 못했어요"}`;
    console.warn("[단지 화면 찍기]", why, first);
    return { s: null, why };
  }
  // 첫 장은 이미 찍었다 — 그 사진을 먼저 돌려준다
  let pending: string | null = first.dataUrl;
  return {
    why: "",
    s: {
      snap: async () => {
        const url = pending || (await askCapture())?.dataUrl || null;
        pending = null;
        return url ? (await fetch(url)).blob() : null;
      },
      close: () => {},
    },
  };
}

async function shareSnapper(): Promise<Snapper | null> {
  const md = navigator.mediaDevices as MediaDevices & { getDisplayMedia?: (o: unknown) => Promise<MediaStream> };
  if (!md?.getDisplayMedia) return null;
  try {
    const stream = await md.getDisplayMedia({ video: { displaySurface: "browser" }, audio: false, preferCurrentTab: true, selfBrowserSurface: "include", surfaceSwitching: "exclude" });
    const video = document.createElement("video");
    video.muted = true;
    video.srcObject = stream;
    await video.play();
    await sleep(700); // 공유 확인 창이 사라진 뒤의 화면
    return {
      snap: async () => {
        await sleep(200);
        const c = document.createElement("canvas");
        c.width = video.videoWidth;
        c.height = video.videoHeight;
        c.getContext("2d")?.drawImage(video, 0, 0);
        return new Promise<Blob | null>((ok) => c.toBlob((b) => ok(b), "image/jpeg", 0.92));
      },
      close: () => stream.getTracks().forEach((t) => t.stop()),
    };
  } catch {
    return null; // [취소]를 눌렀다
  }
}

/** 큰 사진에서 한 부분(화면 좌표)만 잘라 낸다 — 찍은 사진 크기 / 창 크기 비율로 */
async function crop(blob: Blob, r: { x: number; y: number; w: number; h: number }): Promise<Blob | null> {
  const img = await createImageBitmap(blob);
  const k = img.width / window.innerWidth;
  const c = document.createElement("canvas");
  c.width = Math.round(r.w * k);
  c.height = Math.round(r.h * k);
  c.getContext("2d")?.drawImage(img, Math.round(r.x * k), Math.round(r.y * k), c.width, c.height, 0, 0, c.width, c.height);
  return new Promise((ok) => c.toBlob((b) => ok(b), "image/jpeg", 0.92));
}

/** 우리동네부동산 화면에서 왼쪽 단지 시세 창의 자리 — 단지 이름이 든 칸에서 위로 올라가며 폭 360~520 · 높이 60% 넘는 칸 */
function panelRect(doc: Document, name: string): { x: number; y: number; w: number; h: number } | null {
  const all = Array.from(doc.querySelectorAll<HTMLElement>("h1,h2,h3,div,span")).filter((e) => e.childElementCount === 0 && (e.textContent || "").includes(name));
  for (const e of all) {
    let p: HTMLElement | null = e;
    while (p && p !== doc.body) {
      const b = p.getBoundingClientRect();
      if (b.width >= 360 && b.width <= 520 && b.height >= window.innerHeight * 0.6 && b.left < 40) return { x: b.left, y: b.top, w: b.width, h: Math.min(b.height, window.innerHeight - b.top) };
      p = p.parentElement;
    }
  }
  return null;
}

const ORDER: Record<ShotFocus, string[]> = {
  all: ["screen", "street", "sky", "wide", "panel"],
  price: ["screen", "panel", "street", "sky", "wide"],
  complex: ["sky", "street", "screen", "panel", "wide"],
  region: ["wide", "sky", "street", "screen", "panel"],
};

export async function captureComplexScreens(complex: { id: string; name: string }, focus: ShotFocus, onStatus?: (t: string) => void): Promise<RealShot[]> {
  const cover = document.createElement("div");
  cover.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:#fff";
  const frame = document.createElement("iframe");
  frame.style.cssText = "width:100%;height:100%;border:0;display:block";
  cover.appendChild(frame);
  document.body.appendChild(cover);
  const id = encodeURIComponent(complex.id), nm = complex.name;
  const got: Record<string, RealShot> = {};
  const keep = (key: string, blob: Blob | null, caption: string) => { if (blob) { const url = URL.createObjectURL(blob); got[key] = { url, thumb: url, caption }; } };
  let snapper: Snapper | null = null;

  /** 띄우고 다 뜰 때까지 — ready(doc) 가 참이 되거나 최대 ms */
  const open = async (src: string, ready: (d: Document) => boolean, ms: number, settle: number) => {
    frame.src = src;
    await new Promise<void>((ok) => { frame.onload = () => ok(); setTimeout(ok, 20000); });
    for (let t = 0; t < ms; t += 250) {
      const d = frame.contentDocument;
      if (d && ready(d)) break;
      await sleep(250);
    }
    const d = frame.contentDocument;
    const st = d?.createElement("style");
    if (st && d) { st.textContent = "[data-gs-cap-launcher]{display:none!important}"; d.head.appendChild(st); } // 우리동네부동산 [화면캡처] 단추는 찍히지 않게
    await sleep(settle);
  };

  try {
    // ① 우리동네부동산 단지 화면
    onStatus?.("① 우리동네부동산 단지 화면을 여는 중…");
    await open(`/gongsil?apt=${id}`, (d) => Boolean(d.body?.innerText.includes(nm)), 20000, 3500);
    onStatus?.("① 단지 화면을 찍는 중…");
    const h = await helperSnapper();
    snapper = h.s;
    if (!snapper) {
      // 도우미가 없으면 크롬 탭 공유 — 크롬은 방금 누른 뒤에만 물을 수 있어서 단추를 누르게 한다 (한 번 허락하면 나머지도 이어서 찍는다)
      const why = document.createElement("div");
      why.textContent = `자동으로 찍지 못한 이유: ${h.why}`;
      why.style.cssText = "position:absolute;left:50%;bottom:92px;transform:translateX(-50%);padding:6px 12px;border-radius:6px;background:rgba(17,24,39,.85);color:#fde68a;font-size:13px;font-weight:700;white-space:nowrap";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "📸 이 화면 찍기 — 크롬이 물으면 [공유]를 눌러 주세요 (사진 5장을 차례로 찍어요)";
      btn.style.cssText = "position:absolute;left:50%;bottom:32px;transform:translateX(-50%);padding:14px 26px;border:0;border-radius:10px;background:#1e3a6e;color:#fff;font-size:16px;font-weight:800;box-shadow:0 6px 20px rgba(0,0,0,.35);cursor:pointer;font-family:inherit";
      const skip = document.createElement("button");
      skip.type = "button";
      skip.textContent = "건너뛰기";
      skip.style.cssText = "position:absolute;right:20px;bottom:36px;padding:10px 16px;border:1px solid #d1d5db;border-radius:8px;background:#fff;color:#374151;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit";
      cover.append(why, btn, skip);
      snapper = await new Promise<Snapper | null>((ok) => {
        skip.onclick = () => ok(null);
        btn.onclick = () => { why.remove(); btn.remove(); skip.remove(); void shareSnapper().then(ok); };
      });
      why.remove(); btn.remove(); skip.remove();
      if (!snapper) return [];
    }
    const screen = await snapper.snap();
    keep("screen", screen, `[우리동네부동산] ${nm} 단지 시세와 주변 지도 (자료: 공실뉴스 · 국토교통부 실거래가 · 카카오맵)`);
    // ⑤ 왼쪽 단지 시세 창만 잘라 크게
    const r = frame.contentDocument ? panelRect(frame.contentDocument, nm) : null;
    if (screen && r) keep("panel", await crop(screen, r).catch(() => null), `[시세] ${nm} 최근 실거래 시세 흐름과 거래 내역 (자료: 국토교통부 실거래가 · 공실뉴스)`);

    // ② 단지 쪽 로드뷰
    onStatus?.("② 단지 쪽 로드뷰를 찍는 중…");
    await open(`/apt-capture/${id}?part=street`, (d) => Boolean(d.querySelector('[data-roadview-status="ready"],[data-roadview-status="failed"]')), 15000, 800);
    if (frame.contentDocument?.querySelector('[data-roadview-status="ready"]')) keep("street", await snapper.snap(), `[현장 로드뷰] ${nm} 진입로 주변 (사진: 카카오맵 로드뷰)`);

    // ③ 스카이뷰 단지 전경
    onStatus?.("③ 스카이뷰(위성) 단지 전경을 찍는 중…");
    await open(`/apt-capture/${id}?part=sky`, (d) => Boolean(d.querySelector('[data-map-ready="1"]')), 12000, 1500);
    keep("sky", await snapper.snap(), `[스카이뷰] ${nm} 단지 전경 (사진: 카카오맵 스카이뷰)`);

    // ④ 넓은 지도 — 역·학교·큰길
    onStatus?.("④ 주변 지도(역·학교)를 찍는 중…");
    await open(`/apt-capture/${id}?part=wide`, (d) => Boolean(d.querySelector('[data-map-ready="1"]')), 12000, 1500);
    keep("wide", await snapper.snap(), `[위치] ${nm} 주변 역·학교·큰길 (지도: 카카오맵)`);

    return ORDER[focus].map((k) => got[k]).filter(Boolean);
  } finally {
    snapper?.close();
    cover.remove();
  }
}
