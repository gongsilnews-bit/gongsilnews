"use client";

// 완성 영상 SNS 올리기 — 반자동 (2026-10-21 사장님, docs/2026-10-21_studio_sns_upload_plan.md)
//  [내보내기] 완료 → [유튜브에 올리기] [인스타그램에 올리기] → 이 창
//  AI 가 제목·설명(캡션)·해시태그 초안 → 회원이 고침 → [크롬에서 채우기] (파일 첨부·글 채우기) → 회원이 [게시]
//  중개사무소 정보·매물 링크·문의 줄은 앱이 붙인다 (글 끝)
import React, { Suspense, lazy, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { PhotoEmbed } from "@/components/admin/studio-photo/PhotoStudio";
import type { PostChannel, PostDraft, Project } from "./types";
import { errText, videoBridge } from "./types";
import { listMyStudioVacancies } from "@/app/actions/studio";
import { getMyArticleCards } from "@/app/actions/myArticles";
import { getMyVacancyPromos } from "@/app/actions/vacancyPromos";
import { clipText } from "./timeline";
import { Btn, C, FONT, Icon, Modal, Working, input, label } from "./ui";
import { loadImg, thumbDoc, thumbFonts, thumbLayouts, thumbPng, thumbPreview } from "./thumbRender";

const PhotoStudio = lazy(() => import("@/components/admin/studio-photo/PhotoStudio"));

/** 채널 픽토그램 — 유튜브(빨간 재생 단추) · 인스타그램(카메라) · 스레드(@) · 페이스북(f) (2026-10-21·28 사장님) */
export function ChannelMark({ ch, size = 18 }: { ch: PostChannel; size?: number }) {
  if (ch === "threads" || ch === "facebook")
    return (
      <span aria-hidden style={{ width: size, height: size, borderRadius: size * 0.28, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: ch === "threads" ? "#111" : "#1877f2", color: "#fff", fontWeight: 900, fontSize: size * 0.72, fontFamily: "Arial, sans-serif", lineHeight: 1 }}>{ch === "threads" ? "@" : "f"}</span>
    );
  if (ch === "youtube")
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
        <rect x="1.5" y="5" width="21" height="14" rx="4" fill="#FF0033" />
        <path d="M10 9v6l5.2-3z" fill="#fff" />
      </svg>
    );
  const id = "igm" + size;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#FEDA75" /><stop offset="0.35" stopColor="#FA7E1E" /><stop offset="0.6" stopColor="#D62976" /><stop offset="1" stopColor="#4F5BD5" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="6" fill={`url(#${id})`} />
      <rect x="6.5" y="6.5" width="11" height="11" rx="5.5" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="#fff" />
    </svg>
  );
}

// 같은 영상 파일이면 앱을 켠 동안 초안·썸네일을 기억 (창을 닫았다 열어도 다시 쓰지 않게)
const memo = new Map<string, { draft?: PostDraft; thumbs?: Thumb[] }>();
type Thumb = { at: number; plain: { file: string; url: string }; title: { file: string; url: string } | null };
type Vis = "public" | "unlisted" | "private";

// lines — 대본 줄을 따로 줄 때 (뉴스·SNS발행 › 내 영상 홍보: 편집 작업 없이 파일만, 2026-10-29)
export function PostDialog({ project, file, seconds, channel: ch0, onClose, lines: linesIn, tone, onFilled }: { project: Project; file: string; seconds: number; channel: PostChannel; onClose: () => void; lines?: string[]; tone?: string; /** 채우기가 끝났을 때 (내 영상 홍보 목록 기록) */ onFilled?: (ch: PostChannel) => void }) {
  const b = videoBridge();
  const post = b?.post;
  const m = memo.get(file) || {};
  const [ch, setCh] = useState<PostChannel>(ch0);
  const [draft, setDraft] = useState<PostDraft | null>(m.draft || null);
  const [ytTitle, setYtTitle] = useState(m.draft?.youtube.title || "");
  const [ytText, setYtText] = useState(m.draft?.youtube.text || "");
  const [igText, setIgText] = useState(m.draft?.instagram.text || "");
  const [fbText, setFbText] = useState(m.draft?.facebook?.text || m.draft?.youtube.text || "");
  const [thText, setThText] = useState(m.draft?.threads?.text || m.draft?.instagram.text || "");
  const [vis, setVis] = useState<Vis>("public");
  const [thumbs, setThumbs] = useState<Thumb[] | null>(m.thumbs || null);
  const [useTitle, setUseTitle] = useState(true);
  const [thumbI, setThumbI] = useState(0); // -1 = 내가 고른 그림
  const [mine, setMine] = useState<{ file: string; url: string } | null>(null); // 썸네일 직접 올리기 (2026-10-21 사장님)
  // 썸네일 디자인 — 영상 꾸미기에서 고른 틀로 시작, 다른 틀도 고르기 (2026-10-22 사장님)
  const layouts = React.useMemo(() => thumbLayouts(), []);
  const savedThumb = (project.settings as unknown as { thumb?: { layout: string; title: string } }).thumb;
  const [layoutId, setLayoutId] = useState(() => (savedThumb?.layout && layouts.some((l) => l.id === savedThumb.layout) ? savedThumb.layout : layouts[0]?.id || ""));
  const [thumbText, setThumbText] = useState(savedThumb?.title || "");
  const [bgs, setBgs] = useState<(HTMLCanvasElement | null)[]>([]);
  const [pvBg, setPvBg] = useState<string[]>([]); // 고른 틀 × 장면들
  const [pvLay, setPvLay] = useState<Record<string, string>>({}); // 고른 장면 × 틀 전부
  // 썸네일 고치기 — 이미지 편집기를 꽉 차게 띄운다 (레이어째 고치고 [이 썸네일 쓰기])
  const [editor, setEditor] = useState<PhotoEmbed | null>(null);
  const [minePsd, setMinePsd] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [login, setLogin] = useState<"" | "need" | "open">("");
  const [done, setDone] = useState<{ ch: PostChannel; partial?: string; thumb?: string; vis?: string } | null>(null);
  const [note, setNote] = useState("");
  // 홍보현황 — 올린 주소를 붙일 공실·기사 (2026-10-28). 영상에 공실(또는 내 기사 칼럼)이 붙어 있으면 그것, 없으면 회원이 고른다
  //  linkTo: "" = 안 붙임 · "v:공실id" · "a:기사번호"
  const [linkTo, setLinkTo] = useState("");
  const [myVacs, setMyVacs] = useState<{ id: string; label: string }[] | null>(null);
  const [myArts, setMyArts] = useState<{ no: string; label: string }[] | null>(null);
  useEffect(() => {
    if (project.vacancyId) return;
    const sq = (t: string) => t.replace(/[\s\[\]()「」"'·,.]/g, "");
    const nm = sq(project.name);
    void Promise.all([
      listMyStudioVacancies().then((r) => (r.success ? r.data : [])).catch(() => []),
      getMyArticleCards().then((r) => (r.success ? r.data : [])).catch(() => []),
    ]).then(([vs, as]) => {
      const vList = (vs as { id: string; vacancy_no?: number | null; building_name?: string | null; property_type?: string | null; dong?: string | null }[]).map((v) =>
        ({ id: v.id, name: v.building_name || "", no: v.vacancy_no ? String(v.vacancy_no) : "", label: `${v.vacancy_no ? `${v.vacancy_no} · ` : ""}${[v.dong, v.building_name || v.property_type].filter(Boolean).join(" ")}` }));
      const aList = (as as { no: string; title: string }[]).map((a) => ({ no: a.no, title: a.title, label: `${a.no} · ${a.title}` }));
      setMyVacs(vList);
      setMyArts(aList);
      // 영상 이름으로 미리 골라 둔다 (하나만 맞을 때) — 공실은 건물 이름·광고번호, 기사는 제목 앞부분
      const vHit = vList.filter((v) => (v.name && nm.includes(sq(v.name))) || (v.no && nm.includes(v.no)));
      const aHit = aList.filter((a) => sq(a.title).length >= 8 && nm.includes(sq(a.title).slice(0, 12)));
      const pick = aHit.length === 1 && !vHit.length ? `a:${aHit[0].no}` : vHit.length === 1 && !aHit.length ? `v:${vHit[0].id}` : "";
      if (pick) setLinkTo((cur) => cur || pick);
    });
  }, [project.vacancyId]); // eslint-disable-line react-hooks/exhaustive-deps
  const shorts = project.ratio === "9:16" || project.ratio === "1:1";
  const lines = linesIn || project.scenes.flatMap((s) => s.clips).map((c) => clipText(c)).filter((t) => t.trim());
  // AI 그림이 들어간 영상 — 채널의 AI 표시를 켜도록 알린다
  const aiCount = project.scenes.flatMap((s) => s.clips).filter((c) => {
    const a = c.visual ? project.assets[c.visual.asset] : null;
    return a && (a.source === "ai" || /^AI그림_/.test(a.name || ""));
  }).length;

  const listen = () => b?.onProgress((t) => setBusy(t)) || (() => {});
  const writeDraft = async () => {
    if (!post) return;
    setErr("");
    setBusy("글 AI가 쓰는 중…");
    const off = listen();
    try {
      // 이미 올린 채널 (홍보현황 ✓) — 그 채널 글은 "이번엔 영상으로" 후속 글로 (2026-10-28 사장님)
      const vid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(project.vacancyId || "") ? project.vacancyId : linkTo.startsWith("v:") ? linkTo.slice(2) : "";
      const artNo = linkTo.startsWith("a:") ? linkTo.slice(2) : "";
      const posted = vid
        ? await getMyVacancyPromos().then((r) => Object.keys(r.promos[vid]?.links || {})).catch(() => [] as string[])
        : artNo
          ? await getMyArticleCards().then((r) => Object.keys(r.data.find((a) => a.no === artNo)?.links || {})).catch(() => [] as string[])
          : [];
      const d = await post.draft({ title: project.name, lines, vacancyId: vid || project.vacancyId, ratio: project.ratio, seconds, posted, tone });
      setDraft(d);
      setYtTitle(d.youtube.title);
      setYtText(d.youtube.text);
      setIgText(d.instagram.text);
      setFbText(d.facebook?.text || d.youtube.text);
      setThText(d.threads?.text || d.instagram.text);
      memo.set(file, { ...(memo.get(file) || {}), draft: d });
    } catch (e) {
      setErr(errText(e));
    } finally {
      off();
      setBusy("");
    }
  };
  const makeThumbs = async (title: string) => {
    if (!post) return;
    setBusy("썸네일 만드는 중…");
    const off = listen();
    try {
      const t = await post.thumbs({ file, title, duration: seconds });
      setThumbs(t);
      setThumbI(0);
      memo.set(file, { ...(memo.get(file) || {}), thumbs: t });
    } catch (e) {
      setErr(errText(e));
    } finally {
      off();
      setBusy("");
    }
  };
  // 처음 열면 — 글 초안부터 (그다음 유튜브 일반 영상이면 썸네일)
  useEffect(() => {
    if (!draft) void writeDraft();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (draft && ch === "youtube" && !shorts && !thumbs && !busy) void makeThumbs(ytTitle);
  }, [draft, ch]); // eslint-disable-line react-hooks/exhaustive-deps

  // 장면 그림 받아 두기 → 미리보기 그리기
  useEffect(() => {
    if (!thumbs) return;
    let live = true;
    Promise.all(thumbs.map((t) => loadImg(t.plain.url))).then((c) => { if (live) setBgs(c); });
    return () => { live = false; };
  }, [thumbs]);
  const tTitle = thumbText || ytTitle;
  useEffect(() => {
    if (!bgs.length || !useTitle) return;
    let live = true;
    const tm = setTimeout(async () => {
      await thumbFonts(layouts);
      const l = layouts.find((x) => x.id === layoutId);
      if (l && live) setPvBg(bgs.map((bg) => (bg ? thumbPreview(l, bg, tTitle, "", 360) : "")));
      const bg = bgs[Math.max(0, thumbI)] || bgs[0];
      if (!bg) return;
      const o: Record<string, string> = {};
      for (const x of layouts) {
        if (!live) return;
        await new Promise((r) => setTimeout(r, 0));
        try { o[x.id] = thumbPreview(x, bg, tTitle, "", 220); } catch {}
        if (live) setPvLay({ ...o });
      }
    }, 200);
    return () => { live = false; clearTimeout(tm); };
  }, [bgs, layoutId, tTitle, thumbI, useTitle, layouts]);

  const text = ch === "youtube" ? ytText : ch === "facebook" ? fbText : ch === "threads" ? thText : igText;
  const setText = (v: string) => (ch === "youtube" ? setYtText(v) : ch === "facebook" ? setFbText(v) : ch === "threads" ? setThText(v) : setIgText(v));
  const plainFile = thumbs && thumbs[thumbI] ? thumbs[thumbI].plain.file : undefined;
  /** 올릴 썸네일 파일 — 내 그림 · 장면만 · 고른 틀로 그린 1280×720 PNG(임시 파일) */
  const thumbFileFor = async (): Promise<string | undefined> => {
    if (shorts) return undefined;
    if (thumbI === -1 && mine) return mine.file;
    if (!useTitle) return plainFile;
    const l = layouts.find((x) => x.id === layoutId), bg = bgs[thumbI];
    const tw = (window as unknown as { gongsilStudio?: { photo?: { tempWrite?: (o: { bytes: Uint8Array; ext?: string }) => Promise<{ path?: string }> } } }).gongsilStudio?.photo?.tempWrite;
    if (!l || !bg || !tw) return plainFile;
    const r = await tw({ bytes: await thumbPng(l, bg, tTitle), ext: "png" });
    return r.path || plainFile;
  };
  const fill = async () => {
    if (!post) return;
    setErr("");
    setDone(null);
    setBusy("크롬을 여는 중…");
    const off = listen();
    try {
      const thumbFile = ch === "youtube" ? await thumbFileFor() : undefined;
      const r = await post.fill({ channel: ch, file, title: ytTitle, text, visibility: ch === "youtube" ? vis : undefined, thumb: thumbFile,
        vacancyId: project.vacancyId || (linkTo.startsWith("v:") ? linkTo.slice(2) : undefined), articleNo: linkTo.startsWith("a:") ? linkTo.slice(2) : undefined,
        posts: ch === "threads" ? text.split(/\n\n―――\n\n/).map((x) => x.trim()).filter(Boolean) : undefined }); // 스레드 — 이어 쓰는 글
      setDone({ ch, partial: r.partial, thumb: r.thumb, vis: r.vis });
      onFilled?.(ch);
      try {
        const log = JSON.parse(localStorage.getItem("gsv:postLog") || "[]");
        localStorage.setItem("gsv:postLog", JSON.stringify([{ at: Date.now(), ch, file, title: ch === "youtube" ? ytTitle : "" }, ...log].slice(0, 200)));
      } catch {}
    } catch (e) {
      const msg = errText(e);
      if (msg.startsWith("LOGIN:")) setLogin("need");
      setErr(msg.replace(/^LOGIN:\s*/, ""));
    } finally {
      off();
      setBusy("");
    }
  };
  type PhotoB = { read?: (f: string) => Promise<{ bytes?: Uint8Array; error?: string }>; save?: (o: { file?: string; name: string; ext: "psd"; bytes: Uint8Array }) => Promise<{ path?: string; error?: string }> };
  const photoB = (): PhotoB | null => (window as unknown as { gongsilStudio?: { photo?: PhotoB } }).gongsilStudio?.photo ?? null;
  const openEditor = async () => {
    setErr("");
    try {
      const title = tTitle;
      let doc;
      if (thumbI === -1 && minePsd && photoB()?.read) {
        // 전에 고친 썸네일 — PSD 레이어 그대로 다시
        const r = await photoB()!.read!(minePsd);
        if (!r.bytes) throw new Error(r.error || "썸네일 PSD 를 열지 못했어요");
        const { openPsdBytes } = await import("@/components/admin/studio-photo/model");
        doc = openPsdBytes("썸네일.psd", r.bytes, minePsd);
      } else {
        const l = layouts.find((x) => x.id === layoutId), bg = bgs[Math.max(0, thumbI)] || bgs[0];
        if (!l || !bg) throw new Error("장면을 아직 못 뽑았어요. 잠시 뒤 다시 눌러 주세요.");
        doc = await thumbDoc(l, bg, title);
      }
      setEditor({
        doc, title: "썸네일 고치기",
        onUse: async (png, psd) => {
          if (!b?.lib.saveImage) throw new Error("스튜디오 앱에서만 저장돼요");
          const dataUrl = `data:image/png;base64,${btoa(Array.from(png, (c) => String.fromCharCode(c)).join(""))}`;
          const nm = `썸네일_${(title || "영상").replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 24)}`;
          const item = await b.lib.saveImage(`${project.dir}\\썸네일`, dataUrl, nm);
          if (!item?.path) throw new Error("썸네일을 저장하지 못했어요");
          const psdPath = item.path.replace(/\.png$/i, ".psd");
          await photoB()?.save?.({ file: psdPath, name: nm, ext: "psd", bytes: psd });
          setMine({ file: item.path, url: item.url });
          setMinePsd(psdPath);
          setThumbI(-1);
          setEditor(null);
          setNote("고친 썸네일을 골랐어요 (영상 폴더 › 썸네일에 PNG·PSD)");
          setTimeout(() => setNote(""), 3000);
        },
        onCancel: () => setEditor(null),
      });
    } catch (e) {
      setErr(errText(e));
    }
  };
  /** PC에서 썸네일 그림 고르기 — JPG·PNG */
  const pickMine = async () => {
    if (!b) return;
    setErr("");
    try {
      const items = await b.lib.pick({ kinds: "media" });
      const img = items.find((x) => x.kind === "image" && x.path);
      if (!items.length) return;
      if (!img) return setErr("썸네일은 사진 파일(JPG·PNG)로 골라 주세요.");
      setMine({ file: img.path!, url: img.url });
      setThumbI(-1);
    } catch (e) {
      setErr(errText(e));
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ch === "youtube" ? `${ytTitle}\n\n${ytText}` : text);
      setNote("글을 복사했어요");
      setTimeout(() => setNote(""), 1800);
    } catch {}
  };
  const name = ch === "youtube" ? "유튜브" : ch === "threads" ? "스레드" : ch === "facebook" ? "페이스북" : "인스타그램";

  if (!post) {
    return (
      <Modal title="SNS에 올리기" onClose={onClose} width={560}>
        <div style={{ padding: 22, fontSize: 15, lineHeight: 1.7 }}>이 기능은 공실마케팅 앱 0.1.11부터 쓸 수 있어요. 앱을 새로 받아 주세요.</div>
      </Modal>
    );
  }
  // 썸네일 고치기 중 — 이미지 편집기만 보이게 (SNS 창이 위를 가리던 것, 2026-10-22)
  if (editor) {
    return typeof document !== "undefined" ? createPortal(
      <div style={{ position: "fixed", inset: 0, zIndex: 85, display: "flex", flexDirection: "column", background: C.bg }} onKeyDown={(e) => e.stopPropagation()}>
        <Suspense fallback={<div style={{ padding: 40, color: C.sub, fontFamily: FONT }}>이미지 편집을 여는 중…</div>}>
          <PhotoStudio menu={null} embed={editor} />
        </Suspense>
      </div>,
      document.body,
    ) : null;
  }
  const chip = (on: boolean): React.CSSProperties => ({ height: 32, padding: "0 12px", borderRadius: 5, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent", color: on ? C.text : C.sub, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" });
  return (
    <Modal title="SNS에 올리기" onClose={onClose} width={720}
      footer={<>
        <Btn onClick={copy}><Icon name="copy" size={15} />글 복사</Btn>
        <Btn onClick={() => b?.showFile(file)}><Icon name="folder" size={15} />영상 폴더</Btn>
        <Btn onClick={() => post.open(ch)}><Icon name="open" size={15} />{name} 열기</Btn>
        <span style={{ flex: 1 }} />
        {note && <span style={{ fontSize: 13, color: C.accent }}>{note}</span>}
        <Btn primary onClick={fill} disabled={Boolean(busy) || !draft}><Icon name="export" size={15} />크롬에서 채우기</Btn>
      </>}>
      <div style={{ display: "flex", borderBottom: `1px solid ${C.line}` }}>
        {([["youtube", shorts ? "유튜브 쇼츠" : "유튜브"], ["instagram", "인스타그램 릴스"], ["threads", "스레드"], ["facebook", "페이스북"]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => { setCh(k); setDone(null); setErr(""); setLogin(""); }}
            style={{ flex: 1, height: 42, border: 0, borderBottom: `2px solid ${ch === k ? C.accent : "transparent"}`, background: "transparent", color: ch === k ? C.text : C.sub, fontSize: 14.5, fontWeight: 800, fontFamily: FONT, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}><ChannelMark ch={k} />{l}</button>
        ))}
      </div>
      <div style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: 14, maxHeight: "62vh", overflowY: "auto" }}>
        {busy && <Working title={busy} detail="회원님 AI·크롬에서 하고 있어요." />}
        {!busy && draft && (
          <>
            {ch === "youtube" && (
              <div>
                <div style={{ ...label, marginBottom: 6, display: "flex" }}><span style={{ flex: 1 }}>제목</span><span style={{ color: ytTitle.length > 100 ? C.danger : C.dim, fontWeight: 600 }}>{ytTitle.length}/100</span></div>
                <input value={ytTitle} onChange={(e) => setYtTitle(e.target.value)} style={{ ...input, width: "100%", boxSizing: "border-box", height: 38, fontSize: 15 }} />
              </div>
            )}
            <div>
              <div style={{ ...label, marginBottom: 6 }}>{ch === "youtube" ? "설명" : "문구 (캡션)"} <span style={{ color: C.dim, fontWeight: 600, fontSize: 12.5 }}>· 끝의 매물 링크·문의 정보는 앱이 붙였어요{draft.tail.hasListing ? "" : " (아래에서 공실을 고르고 [글 다시 쓰기]를 누르면 붙어요)"}</span></div>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={11}
                style={{ ...input, width: "100%", boxSizing: "border-box", height: "auto", padding: 10, lineHeight: 1.6, resize: "vertical", fontSize: 14 }} />
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <Btn small onClick={writeDraft}><Icon name="ai" size={14} />글 다시 쓰기</Btn>
              </div>
            </div>
            {!project.vacancyId && (
              <div>
                <div style={{ ...label, marginBottom: 6 }}>어느 공실·기사 영상인가요? <span style={{ color: C.dim, fontWeight: 600, fontSize: 12.5 }}>· 고르면 올린 주소가 그 공실·기사 홍보현황에 ✓로 붙어요</span></div>
                <select value={linkTo} onChange={(e) => setLinkTo(e.target.value)} style={{ ...input, width: "100%", boxSizing: "border-box", border: "2px solid #3b82f6" }}>
                  <option value="">연결 안 함</option>
                  {!!myVacs?.length && <optgroup label="내 공실">{myVacs.map((v) => <option key={v.id} value={`v:${v.id}`}>{v.label}</option>)}</optgroup>}
                  {!!myArts?.length && <optgroup label="내 기사">{myArts.map((a) => <option key={a.no} value={`a:${a.no}`}>{a.label}</option>)}</optgroup>}
                </select>
              </div>
            )}
            {ch === "youtube" && (
              <div>
                <div style={{ ...label, marginBottom: 6 }}>공개 범위 <span style={{ color: C.dim, fontWeight: 600, fontSize: 12.5 }}>· 크롬에서 마지막 단계까지 가서 골라 둬요. [게시]는 직접</span></div>
                <div style={{ display: "flex", gap: 6 }}>
                  {([["public", "공개"], ["unlisted", "일부 공개"], ["private", "비공개"]] as const).map(([k, l]) => <button key={k} type="button" onClick={() => setVis(k)} style={chip(vis === k)}>{l}</button>)}
                </div>
                <div style={{ fontSize: 12.5, color: C.dim, marginTop: 6 }}>{shorts ? "세로·정사각 영상이라 유튜브에서 쇼츠로 올라가요." : "가로 영상이라 일반 영상으로 올라가요."}</div>
              </div>
            )}
            {ch === "youtube" && !shorts && (
              <div>
                <div style={{ ...label, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ flex: 1 }}>썸네일</span>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.sub, fontWeight: 600, cursor: "pointer" }}>
                    <input type="checkbox" checked={useTitle} onChange={(e) => setUseTitle(e.target.checked)} style={{ accentColor: C.accent }} />디자인 넣기
                  </label>
                  <Btn small onClick={() => makeThumbs(ytTitle)}>장면 다시 뽑기</Btn>
                  <Btn small primary onClick={() => void openEditor()} disabled={!bgs.length && !(thumbI === -1 && minePsd)}><Icon name="pen" size={14} />썸네일 고치기</Btn>
                  <Btn small primary onClick={pickMine}><Icon name="image" size={14} />PC에서 직접 고르기</Btn>
                </div>
                {useTitle && (
                  <input value={thumbText} onChange={(e) => setThumbText(e.target.value)} onKeyDown={(e) => e.stopPropagation()} placeholder={`썸네일 글 (비우면 영상 제목) — 낱말 반으로 나눠 큰 두 줄`}
                    style={{ ...input, height: 34, fontSize: 13.5, marginBottom: 8 }} />
                )}
                {thumbs || mine ? (
                  <>
                    <div style={{ fontSize: 12.5, color: C.sub, fontWeight: 700, margin: "2px 0 6px" }}>배경 장면</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                      {mine && (
                        <button type="button" onClick={() => setThumbI(-1)} title={mine.file} style={{ position: "relative", padding: 0, border: `2px solid ${thumbI === -1 ? C.accent : "transparent"}`, borderRadius: 6, overflow: "hidden", background: "#000", cursor: "pointer", aspectRatio: "16 / 9" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={mine.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          <span style={{ position: "absolute", left: 4, top: 4, padding: "1px 6px", borderRadius: 3, background: "rgba(0,0,0,.7)", color: "#fff", fontSize: 11.5, fontWeight: 700 }}>내 그림</span>
                        </button>
                      )}
                      {(thumbs || []).map((t, i) => {
                        const src = useTitle && pvBg[i] ? pvBg[i] : t.plain.url;
                        return (
                          <button key={i} type="button" onClick={() => setThumbI(i)} style={{ padding: 0, border: `2px solid ${thumbI === i ? C.accent : "transparent"}`, borderRadius: 6, overflow: "hidden", background: "#000", cursor: "pointer", aspectRatio: "16 / 9" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          </button>
                        );
                      })}
                    </div>
                    {useTitle && thumbI !== -1 && (
                      <>
                        <div style={{ fontSize: 12.5, color: C.sub, fontWeight: 700, margin: "12px 0 6px" }}>썸네일 디자인{savedThumb?.layout === layoutId && <span style={{ color: C.dim, fontWeight: 600 }}> · 영상 꾸미기에서 고른 것</span>}</div>
                        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6 }}>
                          {layouts.map((l) => (
                            <button key={l.id} type="button" onClick={() => setLayoutId(l.id)} title={l.name.replace(/^유튜브 — /, "")}
                              style={{ flex: "0 0 150px", padding: 3, borderRadius: 6, border: `2px solid ${layoutId === l.id ? C.accent : "transparent"}`, background: C.card, cursor: "pointer", color: C.text, fontFamily: FONT, display: "flex", flexDirection: "column", gap: 3 }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              {pvLay[l.id] ? <img src={pvLay[l.id]} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 4, display: "block" }} /> : <div style={{ width: "100%", aspectRatio: "16 / 9", background: C.bg, borderRadius: 4 }} />}
                              <span style={{ fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "left" }}>{l.name.replace(/^유튜브 — /, "")}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : <div style={{ fontSize: 13, color: C.dim }}>장면을 뽑지 못했어요. [장면 다시 뽑기]를 눌러 주세요.</div>}
                <div style={{ fontSize: 12.5, color: C.dim, marginTop: 6, lineHeight: 1.6 }}>
                  고른 그림을 크롬에서 썸네일로 넣어요. 직접 만든 그림은 [PC에서 직접 고르기]로 — 유튜브 권장 1280×720 (16:9), 2MB 이하 JPG·PNG. 직접 만든 썸네일은 <b>휴대폰 인증을 한 유튜브 채널</b>만 올릴 수 있어요.
                </div>
              </div>
            )}
            {ch === "instagram" && project.ratio === "16:9" && (
              <div style={{ fontSize: 13, color: "#facc15", lineHeight: 1.6 }}>가로(16:9) 영상이에요. 릴스는 세로 화면이라 위아래가 비어 보일 수 있어요. 위쪽 화면 비율을 [쇼츠·릴스 9:16]으로 바꿔 한 번 더 내보내면 꽉 차요.</div>
            )}
            {aiCount > 0 && (
              <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6, padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.line2}` }}>
                AI로 만든 그림이 {aiCount}곳에 들어 있어요. {ch === "youtube" ? "유튜브 세부정보의 \"변경되거나 합성된 콘텐츠\"를 [예]로 골라 주세요." : "인스타그램 고급 설정의 \"AI 정보\" 표시를 켜 주세요."}
              </div>
            )}
          </>
        )}
        {err && <div style={{ fontSize: 14, color: C.danger, lineHeight: 1.6 }}>{err}</div>}
        {login === "need" && (
          <div><Btn primary onClick={() => { void post.login(ch); setLogin("open"); }}>{name} 로그인</Btn></div>
        )}
        {login === "open" && (
          <div style={{ padding: "12px 14px", borderRadius: 8, border: `1px solid ${C.accent}`, background: C.accentDim, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ flex: 1, minWidth: 240, fontSize: 14, lineHeight: 1.6 }}>새로 뜬 &quot;공실마케팅&quot; 크롬 창에서 {name}에 로그인한 뒤 눌러 주세요. (평소 쓰시는 크롬 창이 아니에요)</span>
            <Btn primary onClick={() => { void post.finishLogin(); setLogin(""); setErr(""); }}>로그인 다 했어요</Btn>
          </div>
        )}
        {done && (
          <div style={{ padding: "12px 14px", borderRadius: 8, border: "1px solid #16a34a", background: "rgba(22,163,74,0.12)", fontSize: 14, lineHeight: 1.7 }}>
            {name} 올리기 화면에 영상과 글을 넣었어요. 크롬 창에서 내용을 확인하고 <b>{done.ch === "instagram" ? "[공유하기]" : "[게시]"}</b>를 직접 눌러 주세요. 올린 글 주소는 자동으로 연결되지만, 못 잡을 때도 있어요 — ✓ 가 안 붙으면 카드의 [링크체크]에서 주소를 붙여 넣어 주세요.
            {done.partial && <div style={{ color: "#facc15", marginTop: 4 }}>{done.partial}</div>}
            {done.ch === "youtube" && done.thumb === "verify" && (
              <div style={{ color: "#facc15", marginTop: 6 }}>
                썸네일은 넣지 못했어요 — 이 유튜브 채널은 <b>전화번호 인증</b>이 안 되어 있어서, 유튜브가 직접 만든 썸네일을 막아요. 한 번 인증하면 다음부터 자동으로 들어가요.
                <div style={{ marginTop: 6 }}><Btn small onClick={() => post.open("youtube", "verify")}>전화번호 인증하기</Btn></div>
              </div>
            )}
            {done.ch === "youtube" && done.thumb === "fail" && <div style={{ color: "#facc15", marginTop: 4 }}>썸네일은 넣지 못했어요. 크롬 창 썸네일 칸의 [파일 업로드]로 직접 넣어 주세요 (그림은 [영상 폴더]의 썸네일 폴더에 있어요).</div>}
            {done.ch === "youtube" && done.vis === "fail" && <div style={{ color: "#facc15", marginTop: 4 }}>공개 범위는 크롬에서 직접 골라 주세요.</div>}
          </div>
        )}
      </div>
    </Modal>
  );
}
