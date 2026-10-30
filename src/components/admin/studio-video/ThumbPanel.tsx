"use client";

// 영상 편집 — 썸네일 만들기 (2026-10-22 사장님): 이미지 편집의 유튜브 썸네일 레이아웃을 그대로, 내 영상 첫 화면·제목으로
//  고르면 1280×720 PNG 를 만들어 [내 자료]에 저장한다. 레이어로 고치려면 이미지 편집에서 같은 틀을 열면 된다
import React, { useEffect, useMemo, useState } from "react";
import type { Project } from "./types";
import { videoBridge } from "./types";
import { Btn, C, FONT, input } from "./ui";
import { Side } from "./Panels";
import { loadFont } from "./Pickers";
import { CAT_SIZES, LAYOUTS, buildLayout, contentFor, layoutFonts, loadSampleBg, previewOf, type Layout } from "@/components/admin/studio-photo/layouts";
import { composite, type Doc } from "@/components/admin/studio-photo/model";
import { thumbLines } from "./WizardDeco";

const loadImg = (src: string) => new Promise<HTMLCanvasElement | null>((res) => {
  if (!src) return res(null);
  const im = new Image();
  im.crossOrigin = "anonymous";
  im.onload = () => { try { const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext("2d")!.drawImage(im, 0, 0); c.toDataURL(); res(c); } catch { res(null); } };
  im.onerror = () => res(null);
  im.src = src;
});

export function ThumbPanel({ project, onClose, say }: { project: Project; onClose: () => void; say: (t: string) => void }) {
  const b = videoBridge();
  const size = CAT_SIZES.youtube[0];
  const list = useMemo(() => LAYOUTS.filter((l) => l.cats.includes("youtube") && l.aspect.includes("wide") && !l.sizes), []);
  // 처음 제목 = 프로젝트에 기억해 둔 썸네일 제목 → 프로젝트 이름
  const saved = (project.settings as unknown as { thumb?: { layout: string; title: string } }).thumb;
  const [title, setTitle] = useState(saved?.title || project.name?.replace(/^\d{8}\s*/, "") || "");
  const [badge, setBadge] = useState("");
  const [pick, setPick] = useState(saved?.layout || list[0]?.id || "");
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  // 배경 — 첫 클립 화면 (없으면 예시 건물 사진)
  const firstAsset = useMemo(() => {
    for (const s of project.scenes) for (const c of s.clips) { const a = c.visual?.asset ? project.assets[c.visual.asset] : null; if (a) return a; }
    return null;
  }, [project]);
  const [bg, setBg] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    let live = true;
    (async () => {
      const mine = firstAsset ? await loadImg(firstAsset.kind === "image" ? firstAsset.url : firstAsset.thumb || "") : null;
      const c = mine || (await loadSampleBg("building"));
      if (live) setBg(c);
    })();
    return () => { live = false; };
  }, [firstAsset]);
  const content = () => { const [t1, t2] = thumbLines(title); return { title: t1, sub: t2, badge, agency: "", label: "" }; };
  useEffect(() => {
    if (!bg) return;
    let live = true;
    const t = setTimeout(async () => {
      await Promise.all([...new Set(list.flatMap(layoutFonts))].map((f) => loadFont(f).catch(() => {})));
      const out: Record<string, string> = {};
      for (const l of list) {
        if (!live) return;
        await new Promise((r) => setTimeout(r, 0));
        try { out[l.id] = previewOf(l, size, content(), bg, 320); } catch {}
        setThumbs({ ...out });
      }
    }, 250);
    return () => { live = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bg, title, badge]);

  const make = async () => {
    const l = list.find((x) => x.id === pick) as Layout | undefined;
    if (!l || !bg || !b?.lib.saveImage) return say("스튜디오 앱에서만 저장돼요");
    setBusy("썸네일을 만드는 중…");
    try {
      await Promise.all(layoutFonts(l).map((f) => loadFont(f).catch(() => {})));
      const d = { id: "thumb", name: "thumb", psd: { width: size.w, height: size.h, children: [] }, mode: "rgb", dirty: false, pristine: false } as unknown as Doc;
      d.psd.children = buildLayout(d, l, contentFor(l, content()), bg, false);
      const png = composite(d).toDataURL("image/png");
      const item = await b.lib.saveImage(project.dir, png, `썸네일_${(title || "영상").replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 24)}`);
      say(`썸네일을 만들었어요 — 내 자료 › 사진에 ${item.name}`);
      if (item.path && b.openPath) void b.openPath(item.path);
    } catch (e) {
      say(`썸네일을 만들지 못했어요: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy("");
    }
  };

  return (
    <Side title="썸네일" onClose={onClose}
      footer={<Btn primary onClick={() => void make()} disabled={Boolean(busy) || !pick} style={{ width: "100%" }}>{busy || "이 썸네일 만들기 (1280×720 PNG)"}</Btn>}>
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, borderBottom: `1px solid ${C.line}` }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.stopPropagation()} placeholder="썸네일 제목 — 낱말 반으로 나눠 큰 두 줄" style={{ ...input, height: 36, fontSize: 14 }} />
        <input value={badge} onChange={(e) => setBadge(e.target.value)} onKeyDown={(e) => e.stopPropagation()} placeholder="키워드 (선택 · 예: 신규 매물)" style={{ ...input, height: 32, fontSize: 13 }} />
        <div style={{ fontSize: 12, color: C.dim }}>배경은 첫 클립 화면이에요. 글자·사진을 하나씩 고치려면 이미지 편집 › 유튜브에서 같은 틀을 열어요.</div>
      </div>
      <div style={{ padding: "10px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {list.map((l) => (
          <button key={l.id} type="button" onClick={() => setPick(l.id)}
            style={{ display: "flex", flexDirection: "column", gap: 4, padding: 4, borderRadius: 6, border: `2px solid ${pick === l.id ? C.accent : "transparent"}`, background: C.card, cursor: "pointer", color: C.text, fontFamily: FONT }}>
            {thumbs[l.id] ? <img src={thumbs[l.id]} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 4 }} /> : <div style={{ width: "100%", aspectRatio: "16 / 9", background: C.bg, borderRadius: 4 }} />}
            <span style={{ fontSize: 11.5, fontWeight: 700, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name.replace(/^유튜브 — /, "")}</span>
          </button>
        ))}
      </div>
    </Side>
  );
}
