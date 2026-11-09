"use client";

import { helper, helperOn } from "@/components/admin/studio-web/core";

/**
 * 기사쓰기 단지 분석 — 우리동네부동산 단지 화면을 "실제 화면 그대로" 찍는다 (2026-11-09 사장님: 캡처가 부자연스러움, 지도·공실뉴스가 다 보이게)
 *  1) 지금 창 전체를 덮는 칸에 /gongsil?apt={단지} 를 띄운다 (공실뉴스 머리줄 · 단지 시세 창 · 가격 지도)
 *  2) 도우미(크롬 확장 4.1.3+)가 있으면 그 탭을 바로 찍고, 없으면 크롬 탭 공유([공유] 한 번)로 찍는다
 *  3) 덮은 칸을 닫고 사진(blob 주소)을 돌려준다. 못 찍으면 null
 *  예전 방식(html-to-image 로 다시 그리기)은 글자가 어긋나고 지도를 못 그려 어색했다
 */
export type RealShot = { url: string; thumb: string; caption: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fromHelper(): Promise<Blob | null> {
  if (!(await helperOn())) return null;
  const r = await helper({ op: "captureTab" }, 10000);
  if (!r?.ok || !r.dataUrl) return null;
  return (await fetch(r.dataUrl)).blob();
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
    let blob = await fromHelper();
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
      cover.append(btn, skip);
      blob = await new Promise<Blob | null>((ok) => {
        skip.onclick = () => ok(null);
        btn.onclick = () => { btn.remove(); skip.remove(); void fromTabShare().then(ok); };
      });
      btn.remove(); skip.remove();
    }
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    return { url, thumb: url, caption: `[우리동네부동산] ${complex.name} 단지 시세와 주변 지도 (자료: 공실뉴스 · 국토교통부 실거래가 · 카카오맵)` };
  } finally {
    cover.remove();
  }
}
