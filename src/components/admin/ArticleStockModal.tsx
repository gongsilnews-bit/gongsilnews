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

export default function ArticleStockModal({ onClose, onPick }: { onClose: () => void; onPick: (p: StockPick) => void | Promise<void> }) {
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
  const pickDrone = async (it: Item) => {
    const id = it.id.replace(/^gongsil-d-/, "");
    await onPick({ kind: "drone", id, caption: `영상: 공실뉴스 드론 · ${it.credit.replace(/^드론 · /, "")}` });
    onClose();
  };

  const tabBtn = (on: boolean): React.CSSProperties => ({ flex: 1, height: 40, border: "none", borderBottom: `3px solid ${on ? NAVY : "transparent"}`, background: "none", fontSize: 14.5, fontWeight: on ? 800 : 600, color: on ? NAVY : "#6b7280", cursor: "pointer", fontFamily: "inherit" });
  const list = tab === "image" ? items : droneShown;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 860, maxWidth: "100%", height: "82vh", background: "#fff", borderRadius: 10, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#111827" }}>오픈자료</div>
          <button type="button" onClick={onClose} style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: "#6b7280" }}>✕</button>
        </div>
        <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb" }}>
          <button type="button" style={tabBtn(tab === "image")} onClick={() => setTab("image")}>이미지 (Pixabay)</button>
          <button type="button" style={tabBtn(tab === "drone")} onClick={() => setTab("drone")}>
            공실뉴스 드론<span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: PRO_ORANGE, marginLeft: 3, verticalAlign: "top" }} />
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
            : "고르면 기사에 드론 영상이 들어가요. 독자가 재생을 누를 때만 영상을 받아요."}
        </div>
      </div>
    </div>
  );
}
