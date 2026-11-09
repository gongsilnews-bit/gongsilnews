"use client";

import React, { useEffect, useMemo, useState } from "react";
import { canUseDroneInArticle } from "@/app/actions/articleStock";
import { PRO_ORANGE } from "@/utils/tier";

/**
 * 기사쓰기 라이브러리 [오픈자료] (2026-11-09 사장님)
 *  - 이미지: Pixabay — 고르면 브라우저가 한 번 받아 WebP 로 줄여 기사에 넣는다 (Pixabay 주소를 걸어 두지 않음: 24시간 뒤 깨지고 규칙 위반)
 *  - 공실뉴스 드론: 기사에는 /api/drone/{id} 를 넣는다 → 재생할 때 R2 에서 바로 (Vercel 은 넘겨 주기만)
 *  검색은 쇼츠릴스studio 오픈자료와 같은 서버(/api/studio/video/stock)
 */
export type StockPick =
  | { kind: "image"; file: File; caption: string }
  | { kind: "drone"; id: string; caption: string };

type Item = { id: string; kind: "image" | "video"; thumb: string; url: string; width: number; height: number; duration?: number; credit: string; source: string };

const NAVY = "#1e3a6e";

/** imagesOnly: 사진 칸(뉴스칼럼·공실 분석)처럼 이미지만 받는 곳 — 드론 탭을 숨긴다 */
export default function ArticleStockModal({ onClose, onPick, imagesOnly = false }: { onClose: () => void; onPick: (p: StockPick) => void | Promise<void>; imagesOnly?: boolean }) {
  const [tab, setTab] = useState<"image" | "drone">("image");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[] | null>(null);
  const [drones, setDrones] = useState<Item[] | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [droneOk, setDroneOk] = useState<boolean | null>(null);

  useEffect(() => { void canUseDroneInArticle().then(setDroneOk).catch(() => setDroneOk(false)); }, []);

  const searchImages = async (word: string) => {
    setBusy("찾는 중…"); setMsg(""); setItems(null);
    try {
      const sp = new URLSearchParams({ q: word.trim() || "아파트 인테리어", type: "photo", orientation: "landscape" });
      const j = await fetch(`/api/studio/video/stock?${sp}`, { credentials: "include" }).then((r) => r.json());
      if (!j.success) setMsg(j.error || "오픈자료를 불러오지 못했어요.");
      setItems(((j.items || []) as Item[]).filter((x) => x.kind === "image" && x.source !== "공실뉴스"));
    } catch { setMsg("오픈자료를 불러오지 못했어요. 잠시 뒤 다시 찾아 주세요."); setItems([]); }
    setBusy("");
  };
  const loadDrones = async () => {
    if (drones) return;
    setBusy("불러오는 중…"); setMsg("");
    try {
      const j = await fetch(`/api/studio/video/stock?type=drone&q=`, { credentials: "include" }).then((r) => r.json());
      if (!j.success) setMsg(j.error || "드론 영상을 불러오지 못했어요.");
      setDrones((j.items || []) as Item[]);
    } catch { setMsg("드론 영상을 불러오지 못했어요."); setDrones([]); }
    setBusy("");
  };
  useEffect(() => { void searchImages(""); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (tab === "drone" && droneOk) void loadDrones(); }, [tab, droneOk]); // eslint-disable-line react-hooks/exhaustive-deps

  const droneShown = useMemo(() => {
    const words = q.trim().split(/\s+/).filter((w) => w && w !== "드론");
    return (drones || []).filter((d) => words.every((w) => d.credit.replace(/\s+/g, "").includes(w)));
  }, [drones, q]);

  const pickImage = async (it: Item) => {
    setBusy("사진을 받는 중…"); setMsg("");
    try {
      const blob = await fetch(it.url).then((r) => (r.ok ? r.blob() : null));
      if (!blob || !blob.size) throw new Error();
      const file = new File([blob], `pixabay-${it.id}.${(blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg")}`, { type: blob.type || "image/jpeg" });
      await onPick({ kind: "image", file, caption: "사진: Pixabay" });
      onClose();
    } catch { setMsg("사진을 받지 못했어요. 다른 사진을 골라 주세요."); }
    setBusy("");
  };
  // 사진 칸(블로그·SNS)에서는 드론 영상의 한 장면을 사진으로 (2026-11-09 사장님) — 장면 고르기 창을 연다
  const [frameOf, setFrameOf] = useState<Item | null>(null);
  const pickDrone = async (it: Item) => {
    if (imagesOnly) { setFrameOf(it); return; }
    const id = it.id.replace(/^gongsil-d-/, "");
    await onPick({ kind: "drone", id, caption: `영상: 공실뉴스 드론 · ${it.credit.replace(/^드론 · /, "")}` });
    onClose();
  };

  const tabBtn = (on: boolean): React.CSSProperties => ({ flex: 1, height: 40, border: "none", borderBottom: `3px solid ${on ? NAVY : "transparent"}`, background: "none", fontSize: 14.5, fontWeight: on ? 800 : 600, color: on ? NAVY : "#6b7280", cursor: "pointer", fontFamily: "inherit" });
  const list = tab === "image" ? items : droneShown;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 10003, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 860, maxWidth: "100%", height: "82vh", background: "#fff", borderRadius: 10, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#111827" }}>오픈자료</div>
          <button type="button" onClick={onClose} style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: "#6b7280" }}>✕</button>
        </div>
        <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb" }}>
          <button type="button" style={tabBtn(tab === "image")} onClick={() => setTab("image")}>이미지 (Pixabay)</button>
          <button type="button" style={tabBtn(tab === "drone")} onClick={() => setTab("drone")}>
            공실뉴스 드론{imagesOnly ? " (장면 사진)" : ""}<span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: PRO_ORANGE, marginLeft: 3, verticalAlign: "top" }} />
          </button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (tab === "image") void searchImages(q); }} style={{ display: "flex", gap: 8, padding: "12px 20px" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === "image" ? "예: 서울 아파트, 거실" : "예: 강남, 잠실 (동네·장소 이름)"}
            style={{ flex: 1, height: 40, padding: "0 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, fontFamily: "inherit", outline: "none" }} />
          {tab === "image" && <button type="submit" style={{ height: 40, padding: "0 18px", border: "none", borderRadius: 6, background: NAVY, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>찾기</button>}
        </form>
        {msg && <div style={{ padding: "0 20px 8px", color: "#dc2626", fontSize: 13.5 }}>{msg}</div>}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 20px 16px" }}>
          {tab === "drone" && droneOk === false ? (
            <div style={{ padding: "60px 20px", textAlign: "center", color: "#4b5563", fontSize: 15, lineHeight: 1.7 }}>
              공실뉴스 드론 영상은 <b style={{ color: PRO_ORANGE }}>공실뉴스부동산</b>만 쓸 수 있어요.
            </div>
          ) : busy ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: "#6b7280" }}>{busy}</div>
          ) : list && list.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: "#6b7280" }}>찾은 자료가 없어요.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
              {(list || []).map((it) => (
                <button key={it.id} type="button" onClick={() => void (tab === "image" ? pickImage(it) : pickDrone(it))} title={it.credit}
                  style={{ position: "relative", padding: 0, border: "1px solid #e5e7eb", borderRadius: 6, overflow: "hidden", background: "#f3f4f6", cursor: "pointer", aspectRatio: "16 / 10" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {it.thumb && <img src={it.thumb} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                  <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "4px 6px", background: "linear-gradient(transparent, rgba(0,0,0,0.6))", color: "#fff", fontSize: 11.5, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {tab === "drone" ? `▶ ${it.credit.replace(/^드론 · /, "")}${it.duration ? ` · ${Math.round(it.duration)}초` : ""}` : it.credit}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding: "10px 20px", borderTop: "1px solid #e5e7eb", fontSize: 12.5, color: "#6b7280", lineHeight: 1.6 }}>
          {tab === "image"
            ? "고르면 사진을 받아 기사에 넣어요. 저장할 때 내 사진으로 올라가고 포토DB에도 남아요."
            : imagesOnly ? "드론 영상을 고르고 원하는 장면에서 [이 장면 넣기]를 누르면 공실뉴스 로고가 든 사진으로 들어가요."
            : "고르면 기사에 드론 영상이 들어가요. 독자가 재생을 누를 때만 영상을 받아요."}
        </div>
      </div>
      {frameOf && <DroneFramePicker item={frameOf} onBack={() => setFrameOf(null)}
        onDone={async (file) => { await onPick({ kind: "image", file, caption: `사진: 공실뉴스 드론 · ${frameOf.credit.replace(/^드론 · /, "")}` }); onClose(); }} />}
    </div>
  );
}

/** 드론 영상에서 장면 하나를 사진으로 — 기사 속 드론처럼 가운데 공실뉴스 로고 25% (2026-11-09 사장님)
 *  R2 가 우리 사이트에 CORS 를 열어 두어서 crossOrigin 으로 받아 캔버스에 그릴 수 있다 */
function DroneFramePicker({ item, onBack, onDone }: { item: Item; onBack: () => void; onDone: (f: File) => Promise<void> }) {
  const ref = React.useRef<HTMLVideoElement>(null);
  const [dur, setDur] = useState(0);
  const [t, setT] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const id = item.id.replace(/^gongsil-d-/, "");
  const grab = async () => {
    const v = ref.current;
    if (!v || !v.videoWidth) return;
    setBusy(true); setErr("");
    try {
      const W = v.videoWidth, H = v.videoHeight;
      const c = document.createElement("canvas");
      c.width = W; c.height = H;
      const g = c.getContext("2d")!;
      g.drawImage(v, 0, 0, W, H);
      // 로고 — 기사 속 드론과 같은 모양 (동그란 로고 + "공실뉴스", 25%)
      const logo = await new Promise<HTMLImageElement | null>((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = "/new_logo.png"; });
      const L = Math.max(36, Math.min(W * 0.13, 400));
      const fs = Math.round(Math.max(18, Math.min(W * 0.06, 220)));
      g.font = `900 ${fs}px Pretendard, "Malgun Gothic", sans-serif`;
      const tw = g.measureText("공실뉴스").width, gap = L * 0.12;
      const x0 = (W - (L + gap + tw)) / 2, cy = H / 2;
      g.globalAlpha = 0.25;
      if (logo) { g.save(); g.beginPath(); g.arc(x0 + L / 2, cy, L / 2, 0, Math.PI * 2); g.clip(); g.drawImage(logo, x0, cy - L / 2, L, L); g.restore(); }
      g.fillStyle = "#fff"; g.textBaseline = "middle"; g.shadowColor = "rgba(0,0,0,0.6)"; g.shadowBlur = fs * 0.1;
      g.fillText("공실뉴스", x0 + L + gap, cy);
      g.globalAlpha = 1;
      const blob = await new Promise<Blob | null>((ok) => c.toBlob((b) => ok(b), "image/jpeg", 0.92));
      if (!blob) throw new Error();
      await onDone(new File([blob], `drone-${id}-${Math.round(t)}s.jpg`, { type: "image/jpeg" }));
    } catch { setErr("장면을 사진으로 뜨지 못했어요. 다시 눌러 주세요."); }
    setBusy(false);
  };
  return (
    <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: 760, maxWidth: "100%", background: "#fff", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 15.5, fontWeight: 800, color: "#111827" }}>장면 고르기 · {item.credit.replace(/^드론 · /, "")}</div>
          <button type="button" onClick={onBack} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "#6b7280" }}>✕</button>
        </div>
        <div style={{ position: "relative", background: "#000" }}>
          <video ref={ref} src={`/api/drone/${id}`} crossOrigin="anonymous" muted playsInline preload="auto" controls={false}
            onLoadedMetadata={(e) => { const d = e.currentTarget.duration || 0; setDur(d); const mid = d / 2; e.currentTarget.currentTime = mid; setT(mid); }}
            onContextMenu={(e) => e.preventDefault()} style={{ width: "100%", display: "block", maxHeight: "52vh" }} />
          <div aria-hidden style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, pointerEvents: "none", opacity: 0.25 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/new_logo.png" alt="" style={{ width: "13%", aspectRatio: "1", borderRadius: "50%", objectFit: "cover" }} />
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 32 }}>공실뉴스</span>
          </div>
        </div>
        <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <input type="range" min={0} max={Math.max(0.1, dur - 0.05)} step={0.05} value={t} disabled={!dur}
            onChange={(e) => { const v = Number(e.target.value); setT(v); if (ref.current) ref.current.currentTime = v; }} style={{ flex: 1 }} />
          <span style={{ fontSize: 12.5, color: "#6b7280", width: 70, textAlign: "right" }}>{t.toFixed(1)} / {dur.toFixed(0)}초</span>
          <button type="button" disabled={!dur || busy} onClick={() => void grab()}
            style={{ height: 38, padding: "0 16px", border: "none", borderRadius: 6, background: NAVY, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>{busy ? "넣는 중…" : "이 장면 넣기"}</button>
        </div>
        {err && <div style={{ padding: "0 16px 12px", color: "#dc2626", fontSize: 13 }}>{err}</div>}
      </div>
    </div>
  );
}
