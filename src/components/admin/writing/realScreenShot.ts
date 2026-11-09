"use client";

import { helper } from "@/components/admin/studio-web/core";

/**
 * 기사쓰기 단지 분석 — 우리동네부동산 단지 화면을 "실제 화면 그대로" 찍는다 (2026-11-09 사장님: 캡처가 부자연스러움, 지도·공실뉴스가 다 보이게)
 *  1) 지금 창 전체를 덮는 칸에 /gongsil?apt={단지} 를 띄운다 (공실뉴스 머리줄 · 단지 시세 창 · 가격 지도)
 *  2) 도우미(크롬 확장 4.1.3+)가 있으면 그 탭을 바로 찍고, 없으면 크롬 탭 공유([공유] 한 번)로 찍는다
 *  3) 덮은 칸을 닫고 사진(blob 주소)을 돌려준다. 못 찍으면 null
 *  예전 방식(html-to-image 로 다시 그리기)은 글자가 어긋나고 지도를 못 그려 어색했다
 */
export type RealShot = { url: string; thumb: string; caption: string };

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

/** 도우미로 찍기 — 못 찍으면 이유(why)를 돌려준다 (화면에 보여 원인을 바로 알 수 있게) */
async function fromHelper(): Promise<{ blob: Blob | null; why: string }> {
  const ping = await helper({ op: "ping" }, 1500);
  if (!ping?.ok) return { blob: null, why: "도우미(크롬 확장)가 이 탭에 연결되지 않았어요" };
  const ver = String(ping.version || "");
  const r = await askCapture();
  if (r?.ok && r.dataUrl) return { blob: await (await fetch(r.dataUrl)).blob(), why: "" };
  const why = r == null ? `도우미 ${ver}가 대답하지 않았어요 (4.1.3 이상이면 자동으로 찍어요)` : `도우미 ${ver}: ${r.error || "찍지 못했어요"}`;
  console.warn("[단지 화면 찍기]", why, r);
  return { blob: null, why };
}

async function fromTabShare(): Promise<Blob | null> {
  const md = navigator.mediaDevices as MediaDevices & { getDisplayMedia?: (o: unknown) => Promise<MediaStream> };
  if (!md?.getDisplayMedia) return null;
  let stream: MediaStream | null = null;
  try {
    stream = await md.getDisplayMedia({ video: { displaySurface: "browser" }, audio: false, preferCurrentTab: true, selfBrowserSurface: "include", surfaceSwitching: "exclude" });
    const video = document.createElement("video");
    video.muted = true;
    video.srcObject = stream;
    await video.play();
    await sleep(700); // 공유 확인 창이 사라진 뒤의 화면
    const c = document.createElement("canvas");
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    c.getContext("2d")?.drawImage(video, 0, 0);
    return await new Promise<Blob | null>((ok) => c.toBlob((b) => ok(b), "image/jpeg", 0.92));
  } catch {
    return null; // [취소]를 눌렀다
  } finally {
    stream?.getTracks().forEach((t) => t.stop());
  }
}

export async function captureComplexScreen(complex: { id: string; name: string }, onStatus?: (t: string) => void): Promise<RealShot | null> {
  const cover = document.createElement("div");
  cover.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:#fff";
  const frame = document.createElement("iframe");
  frame.src = `/gongsil?apt=${encodeURIComponent(complex.id)}`;
  frame.style.cssText = "width:100%;height:100%;border:0;display:block";
  cover.appendChild(frame);
  document.body.appendChild(cover);
  try {
    onStatus?.("우리동네부동산 단지 화면을 여는 중…");
    await new Promise<void>((ok) => { frame.onload = () => ok(); setTimeout(ok, 20000); });
    // 단지 시세 창이 뜰 때까지 (단지 이름이 보이면) — 최대 20초
    for (let i = 0; i < 80; i++) {
      const doc = frame.contentDocument;
      if (doc?.body?.innerText.includes(complex.name)) break;
      await sleep(250);
    }
    // 우리동네부동산 [화면캡처] 단추는 찍히지 않게
    const st = frame.contentDocument?.createElement("style");
    if (st) { st.textContent = "[data-gs-cap-launcher]{display:none!important}"; frame.contentDocument?.head.appendChild(st); }
    await sleep(3500); // 지도 그림·가격 표시가 다 뜰 때까지
    onStatus?.("화면을 찍는 중…");
    const h = await fromHelper();
    let blob = h.blob;
    if (!blob) {
      // 도우미가 없으면 크롬 탭 공유 — 크롬은 방금 누른 뒤에만 물을 수 있어서 단추를 누르게 한다 (단추는 찍히기 전에 사라진다)
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "📸 이 화면 찍기 — 크롬이 물으면 [공유]를 눌러 주세요";
      btn.style.cssText = "position:absolute;left:50%;bottom:32px;transform:translateX(-50%);padding:14px 26px;border:0;border-radius:10px;background:#1e3a6e;color:#fff;font-size:16px;font-weight:800;box-shadow:0 6px 20px rgba(0,0,0,.35);cursor:pointer;font-family:inherit";
      const skip = document.createElement("button");
      skip.type = "button";
      skip.textContent = "건너뛰기";
      skip.style.cssText = "position:absolute;right:20px;bottom:36px;padding:10px 16px;border:1px solid #d1d5db;border-radius:8px;background:#fff;color:#374151;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit";
      const why = document.createElement("div");
      why.textContent = `자동으로 찍지 못한 이유: ${h.why}`;
      why.style.cssText = "position:absolute;left:50%;bottom:92px;transform:translateX(-50%);padding:6px 12px;border-radius:6px;background:rgba(17,24,39,.85);color:#fde68a;font-size:13px;font-weight:700;white-space:nowrap";
      cover.append(why, btn, skip);
      blob = await new Promise<Blob | null>((ok) => {
        skip.onclick = () => ok(null);
        btn.onclick = () => { why.remove(); btn.remove(); skip.remove(); void fromTabShare().then(ok); };
      });
      why.remove(); btn.remove(); skip.remove();
    }
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    return { url, thumb: url, caption: `[우리동네부동산] ${complex.name} 단지 시세와 주변 지도 (자료: 공실뉴스 · 국토교통부 실거래가 · 카카오맵)` };
  } finally {
    cover.remove();
  }
}
