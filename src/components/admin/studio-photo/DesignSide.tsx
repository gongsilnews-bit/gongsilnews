"use client";

// 이미지 편집 — 오른쪽 [디자인 템플릿] 칸 (영상 편집기 템플릿 127종을 레이어로) · [내 템플릿] (내가 저장한 디자인)
import React, { useEffect, useState } from "react";
import { Btn, C, FONT } from "@/components/admin/studio-video/ui";
import { Side } from "@/components/admin/studio-video/Panels";
import { TEMPLATES, TPL_CATS, TPL_PREFIX, drawTemplate, tplFonts } from "@/components/admin/studio-video/Templates";

const thumbCache = new Map<string, string>();
function thumbOfTpl(id: string) {
  let t = thumbCache.get(id);
  if (t) return t;
  const c = drawTemplate(TPL_PREFIX + id, "", undefined);
  const k = Math.min(1, 240 / c.width, 120 / c.height);
  const o = document.createElement("canvas");
  o.width = Math.max(1, Math.round(c.width * k));
  o.height = Math.max(1, Math.round(c.height * k));
  o.getContext("2d")!.drawImage(c, 0, 0, o.width, o.height);
  t = o.toDataURL("image/png");
  thumbCache.set(id, t);
  return t;
}

export type MyTpl = { file: string; name: string; thumb: string; w: number; h: number; at: number };

export function DesignSide({ onPick, onClose, mine, onMine, onMineRemove, onSaveMine }: {
  onPick: (id: string) => Promise<void> | void;
  onClose: () => void;
  mine: MyTpl[] | null;
  onMine: (t: MyTpl) => void;
  onMineRemove: (t: MyTpl) => void;
  onSaveMine: () => void;
}) {
  const [cat, setCat] = useState<string>("내 템플릿");
  const [ready, setReady] = useState(false);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const items = TEMPLATES.filter((t) => t.cat === cat);
  useEffect(() => { void tplFonts().then(() => setReady(true)); }, []);
  useEffect(() => {
    if (!ready || cat === "내 템플릿") return;
    let live = true;
    (async () => {
      for (const t of items) {
        await new Promise((r) => setTimeout(r, 0)); // 하나씩 (화면이 멈추지 않게)
        if (!live) return;
        const u = (() => { try { return thumbOfTpl(t.id); } catch { return ""; } })();
        setThumbs((o) => ({ ...o, [t.id]: u }));
      }
    })();
    return () => { live = false; };
  }, [cat, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  const chip = (id: string) => (
    <button key={id} type="button" onClick={() => setCat(id)}
      style={{ height: 28, padding: "0 10px", borderRadius: 14, border: `1px solid ${cat === id ? C.text : C.line2}`, background: cat === id ? C.text : "transparent", color: cat === id ? C.bg : C.sub, fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>{id}</button>
  );
  return (
    <Side title="디자인 템플릿" onClose={onClose}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "12px 16px", borderBottom: `1px solid ${C.line}` }}>
        {chip("내 템플릿")}
        {TPL_CATS.map((c) => chip(c.id))}
      </div>
      {cat === "내 템플릿" ? (
        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <Btn small primary onClick={onSaveMine}>지금 디자인을 내 템플릿으로 저장</Btn>
          <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.6 }}>레이어마다 [칸](제목·가격·배경 사진…)을 정해 두면, 다른 공실을 가져올 때 그 칸만 바뀌어 들어가요. 칸은 레이어를 고르고 레이어 칸 위의 [칸] 에서 정해요.</div>
          {mine === null ? <div style={{ color: C.sub, fontSize: 13 }}>불러오는 중…</div> : !mine.length ? <div style={{ color: C.sub, fontSize: 13 }}>아직 저장한 템플릿이 없어요.</div> : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {mine.map((t) => (
                <div key={t.file} style={{ position: "relative" }}>
                  <button type="button" onClick={() => onMine(t)} title={`${t.name} — 새 문서로 열기`}
                    style={{ width: "100%", padding: 0, borderRadius: 8, border: `1px solid ${C.line}`, background: C.card, cursor: "pointer", overflow: "hidden", textAlign: "left", fontFamily: FONT }}>
                    <div style={{ height: 90, display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1d24" }}>
                      {t.thumb ? <img src={t.thumb} alt="" style={{ maxWidth: "100%", maxHeight: "100%" }} /> : null}
                    </div>
                    <div style={{ padding: "6px 8px", fontSize: 12.5, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                  </button>
                  <button type="button" title="내 템플릿에서 삭제 (목록에서만 빠지고 파일은 남아요)" onClick={() => onMineRemove(t)}
                    style={{ position: "absolute", right: 4, top: 4, width: 20, height: 20, borderRadius: 10, border: 0, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 11, cursor: "pointer", padding: 0 }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div style={{ padding: "8px 16px 0", fontSize: 12.5, color: C.dim }}>누르면 판·장식은 그림 레이어로, 글은 고칠 수 있는 글자 레이어로 들어가요.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "10px 16px 16px" }}>
            {items.map((t) => (
              <button key={t.id} type="button" title={t.label} onClick={() => void onPick(t.id)}
                style={{ height: 92, padding: 6, borderRadius: 8, border: `1px solid ${C.line}`, background: "repeating-conic-gradient(#2a2f3a 0% 25%, #222630 0% 50%) 50% / 16px 16px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                {thumbs[t.id] ? <img src={thumbs[t.id]} alt="" style={{ maxWidth: "100%", maxHeight: 62, objectFit: "contain" }} /> : <span style={{ color: C.sub, fontSize: 12 }}>…</span>}
                <span style={{ fontSize: 11.5, color: "#e5e7eb", fontFamily: FONT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{t.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </Side>
  );
}
