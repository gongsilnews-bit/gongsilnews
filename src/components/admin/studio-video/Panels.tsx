"use client";

// 오른쪽 칸 — 자료 고르기(내 자료·공실 사진·무료 자료·AI 그림·자료 창고) · AI 목소리 · 자막 서식 · 화면 비율 · 배경 음악
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Asset, Layer, LibItem, Project, Ratio, Fill, StockItem, Settings } from "./types";
import { AiImagesTab } from "./AiImages";
import { DRAG_MEDIA, RATIO_LABEL, autoSubPosition, errText, videoBridge, fmtTime } from "./types";
import { STUDIO_VOICES, VOICE_MOODS, voicePhoto, findVoice, MY_VOICE_ID, isTypecast, isEleven } from "@/lib/studio-video/voices";
import { ElevenMark, ElevenTab, FavStar, TypecastMark, TypecastTab, useVoiceFavs } from "./TypecastVoices";
import { MyVoicePane } from "./MyVoice";
import { MUSIC_LIBRARY, MUSIC_MOODS } from "@/lib/reels/music-catalog";
import { listMyStudioVacancies } from "@/app/actions/studio";
import { useStudioImager } from "@/components/admin/sections/useStudioWriter";
import { Btn, C, FONT, Hint, Icon, Toggle, input, label } from "./ui";
import { type SubLook } from "./SubPresets";
import { TextTabs } from "./TextTabs";
import type { AnimBodyProps } from "./Anim";

// 성우 얼굴 동그라미 — public/studio-voices/{id}.webp, 없으면 이름 첫 글자
export function VoiceFace({ id, name, size = 52 }: { id: string; name: string; size?: number }) {
  const [bad, setBad] = useState(false);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, overflow: "hidden", background: C.line, border: `1px solid ${C.line2}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: 800, color: C.sub }}>
      {bad ? name.slice(0, 1) : <img src={voicePhoto(id)} alt={name} onError={() => setBad(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
    </div>
  );
}

export function Side({ title, onClose, children, footer, titleExtra }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; /** 제목 오른쪽 작은 단추들 */ titleExtra?: React.ReactNode }) {
  return (
    <aside style={{ width: 380, flexShrink: 0, display: "flex", flexDirection: "column", background: C.panel, borderLeft: `1px solid ${C.line}`, fontFamily: FONT, color: C.text, minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: `1px solid ${C.line}` }}>
        <span style={{ flex: titleExtra ? undefined : 1, fontSize: 17, fontWeight: 800, whiteSpace: "nowrap" }}>{title}</span>
        {titleExtra && <span style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "flex-end", gap: 4, marginRight: 8 }}>{titleExtra}</span>}
        <button type="button" onClick={onClose} title="닫기" style={{ border: 0, background: "transparent", color: C.sub, cursor: "pointer" }}>
          <Icon name="close" size={22} />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>{children}</div>
      {footer && <div style={{ padding: 12, borderTop: `1px solid ${C.line}`, display: "flex", gap: 8, flexWrap: "wrap" }}>{footer}</div>}
    </aside>
  );
}

const tabBtn = (on: boolean): React.CSSProperties => ({ flex: 1, height: 38, border: 0, borderBottom: `2px solid ${on ? C.text : "transparent"}`, background: "transparent", color: on ? C.text : C.sub, fontSize: 14.5, fontWeight: 800, fontFamily: FONT, cursor: "pointer" });
const chip = (on: boolean): React.CSSProperties => ({ height: 32, padding: "0 12px", borderRadius: 5, border: `1px solid ${on ? C.text : C.line2}`, background: on ? C.text : "transparent", color: on ? C.bg : C.sub, fontSize: 13.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" });

/* ── 자료 고르기 ── */
export type LibPickAction = "replace" | "insert" | "overlay";
/** 클립 글에서 찾기 낱말 — 조사·어미를 떼고 2글자 이상 (브루처럼 단추로) */
const JOSA = /(으로써|으로|에서|에게|까지|부터|이라고|이라|이며|이고|입니다|였다|이었다|했다|된다|됐다|한다|하는|하며|으며|은|는|이|가|을|를|에|의|로|와|과|도|만)$/;
export function keywordsOf(text: string): string[] {
  const out: string[] = [];
  for (const raw of String(text || "").replace(/[.,?!()"'“”‘’·%~…[\]]/g, " ").split(/\s+/)) {
    const w = raw.replace(JOSA, "");
    if (w.length >= 2 && !out.includes(w)) out.push(w);
  }
  return out.slice(0, 10);
}

export function LibraryPanel({ project, canReplace, onPick, onClose, initialTab = "mine", overlay = false, target, aiClips, pro }: { project: Project; canReplace: boolean; onPick: (item: LibItem, action: LibPickAction) => Promise<void> | void; onClose: () => void; initialTab?: string; overlay?: boolean; /** 고른 클립 — 무료 자료에서 [교체할 이미지]·찾기 낱말 */ target?: { thumb: string; text: string } | null; /** 타임라인 편집 (캡컷처럼) — 썸네일 ＋ 단추로 넣기, 넣기 단추·크게 보기 없음 */ pro?: { onPlus: (item: LibItem) => void | Promise<void> }; /** [AI 그림] 탭 — 클립별 AI 그림 (편집 화면에서만) */ aiClips?: { selected: string[]; ensureAsset: (item: LibItem) => Promise<Asset>; apply: (fn: (p: Project) => void) => void } }) {
  const b = videoBridge();
  const [tab, setTab] = useState(initialTab);
  const [kind, setKind] = useState<"all" | "image" | "video">("all");
  const [fav, setFav] = useState(false);
  const [rec, setRec] = useState(false); // [녹화] — 녹화한 영상만 (2026-10-20 사장님)
  // 고르기 — 여러 개 골라 목록에서 빼기 (PC 파일은 그대로, 다시 불러오면 다시 보인다)
  const [selMode, setSelMode] = useState(false);
  const [chk, setChk] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<LibItem[] | null>(null);
  const [picked, setPicked] = useState<LibItem | null>(null);
  const [inlineId, setInlineId] = useState(""); // 목록에서 눌러 고른 자료 — 단추를 그 바로 아래에
  const [hover, setHover] = useState<{ item: LibItem | StockItem; y: number } | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  // 공실 사진
  const [vacs, setVacs] = useState<{ id: string; label: string }[] | null>(null);
  const [vac, setVac] = useState(project.vacancyId || "");
  // 무료 자료
  const [stockQ, setStockQ] = useState("");
  const [stockType, setStockType] = useState<"all" | "photo" | "video">("all");
  const [stock, setStock] = useState<StockItem[] | null>(null);
  const [replaceOn, setReplaceOn] = useState(true); // [교체할 이미지] — 켜져 있으면 누르면 바로 바꾸기 (브루처럼)
  const chips = useMemo(() => keywordsOf(target?.text || ""), [target?.text]);
  // AI 그림
  const [aiPrompt, setAiPrompt] = useState("");
  const imgAi = useStudioImager();

  const load = async () => {
    if (!b) return;
    setItems(null);
    try {
      setItems(await b.lib.list({ kind, fav, q, source: tab === "vacancy" ? "vacancy" : tab === "ai" ? "ai" : rec ? "record" : "" }));
    } catch (e) {
      setMsg(errText(e));
      setItems([]);
    }
  };
  useEffect(() => {
    if (tab === "mine" || tab === "ai") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, kind, fav, rec]);
  useEffect(() => {
    if (tab !== "vacancy" || vacs) return;
    listMyStudioVacancies().then((r) => setVacs(r.success ? r.data.map((v) => ({ id: v.id, label: `[${v.trade_type || "-"}] ${v.building_name || v.property_type || "공실"} · ${v.address} · 사진 ${v.photoCount}장` })) : [])).catch(() => setVacs([]));
  }, [tab, vacs]);
  useEffect(() => {
    if (tab !== "vacancy" || !vac || !b) return;
    setBusy("공실 사진을 PC로 받는 중…");
    setItems(null);
    b.vacancy(vac).then((r) => setItems(r.photos)).catch((e) => { setMsg(errText(e)); setItems([]); }).finally(() => setBusy(""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, vac]);

  const fromPc = async () => {
    if (!b) return;
    const added = await b.lib.pick();
    if (added.length) {
      setTab("mine");
      await load();
      setPicked(added[0]);
    }
  };
  const searchStock = async (word?: string, type = stockType) => {
    const qq = (word ?? stockQ).trim();
    if (!b || !qq) return;
    if (word !== undefined) setStockQ(word);
    setBusy("찾는 중…");
    setStock(null);
    setMsg("");
    const orient = project.ratio === "9:16" || project.ratio === "4:5" ? "portrait" : project.ratio === "1:1" ? "square" : "landscape";
    try {
      // 전체 = 사진·영상을 함께 찾아 번갈아
      const kinds: ("photo" | "video")[] = type === "all" ? ["video", "photo"] : [type];
      const rs = await Promise.all(kinds.map((k) => b.stock.search(qq, k, orient)));
      const bad = rs.find((r) => !r.success);
      const lists = rs.filter((r) => r.success).map((r) => r.items || []);
      const mixed: StockItem[] = [];
      for (let i = 0; i < Math.max(0, ...lists.map((l) => l.length)); i++) for (const l of lists) if (l[i]) mixed.push(l[i]);
      if (!mixed.length && bad) setMsg(bad.error || "찾지 못했어요.");
      setStock(mixed);
    } catch (e) {
      setMsg(errText(e));
      setStock([]);
    }
    setBusy("");
  };
  // 무료 자료를 열면 고른 클립 글의 첫 낱말로 바로 찾는다
  const lastAuto = useRef("");
  useEffect(() => {
    if (tab !== "free" || !chips.length || lastAuto.current === (target?.text || "")) return;
    lastAuto.current = target?.text || "";
    void searchStock(chips[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, chips]);
  const getStock = async (s: StockItem) => {
    if (!b) return;
    setBusy("무료 자료를 PC로 받는 중…");
    try {
      const it = await b.stock.get(project.dir, s);
      // [교체할 이미지]가 켜져 있으면 바로 바꾼다
      if (target && replaceOn && canReplace && !overlay) {
        setBusy("화면을 바꾸는 중…");
        await onPick(it, "replace");
      } else setPicked(it);
    } catch (e) {
      setMsg(errText(e));
    }
    setBusy("");
  };
  // 무료 자료 즐겨찾기 — ★ 누르면 PC로 받아 [내 자료]에 담고 즐겨찾기 (무료 자료 id → 내 자료 id 를 이 PC 에 기억)
  const FAV_KEY = "gsv-stock-fav";
  const [stockFav, setStockFav] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem(FAV_KEY) || "{}");
    } catch {
      return {};
    }
  });
  const saveFav = (m: Record<string, string>) => {
    setStockFav(m);
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(m));
    } catch {}
  };
  const toggleStockFav = async (s: StockItem) => {
    if (!b) return;
    const libId = stockFav[s.id];
    try {
      if (libId) {
        await b.lib.fav(libId, false);
        const m = { ...stockFav };
        delete m[s.id];
        saveFav(m);
        setMsg("");
        return;
      }
      setBusy("즐겨찾기에 담는 중… (PC로 받아요)");
      // 프로젝트 작업 폴더가 아니라 [문서\공실뉴스 스튜디오\영상\받은 자료]에 — 프로젝트를 지워도 남게
      const it = await b.stock.get("", s);
      await b.lib.fav(it.id, true);
      saveFav({ ...stockFav, [s.id]: it.id });
    } catch (e) {
      setMsg(errText(e));
    }
    setBusy("");
  };
  /** ⬇ PC에 받기 — [문서\공실뉴스 스튜디오\영상\받은 자료]에 받고 탐색기로 보여 준다 */
  const saveStock = async (s: StockItem) => {
    if (!b) return;
    setBusy("PC로 받는 중…");
    try {
      const it = await b.stock.get("", s);
      setMsg("");
      if (it.path) b.showFile(it.path);
    } catch (e) {
      setMsg(errText(e));
    }
    setBusy("");
  };
  // 무료 자료 — 원래 비율 그대로 두 줄 벽돌 쌓기 (브루처럼), 영상은 길이
  const masonry = (list: StockItem[]) => (
    <div style={{ columnCount: 2, columnGap: 8, padding: "10px 14px" }}>
      {list.map((it) => (
        <button key={it.id} type="button" onClick={() => getStock(it)} draggable title={target && replaceOn ? "눌러서 바로 교체 · 클립으로 끌어다 놓기" : "눌러서 고르기 · 클립으로 끌어다 놓기"}
          onMouseEnter={(e) => setHover({ item: it, y: (e.currentTarget as HTMLElement).getBoundingClientRect().top })} onMouseLeave={() => setHover(null)}
          onDragStart={(e) => {
            setHover(null);
            e.dataTransfer.setData(DRAG_MEDIA, JSON.stringify({ stock: it }));
            e.dataTransfer.effectAllowed = "copy";
          }}
          style={{ position: "relative", display: "block", width: "100%", marginBottom: 8, breakInside: "avoid", aspectRatio: it.width && it.height ? `${it.width} / ${it.height}` : "16 / 10", padding: 0, border: 0, borderRadius: 4, overflow: "hidden", background: "#000", cursor: "pointer" }}>
          {it.thumb && <img src={it.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
          {it.kind === "video" && <span style={{ position: "absolute", left: 6, bottom: 5, fontSize: 12, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.6)", padding: "1px 5px", borderRadius: 3 }}>{it.duration ? fmtTime(it.duration, false) : "영상"}</span>}
          {pro && plusBtn(it)}
          <span role="button" title="PC에 받기 (문서\공실뉴스 스튜디오\영상\받은 자료)" draggable={false}
            onClick={(e) => { e.stopPropagation(); void saveStock(it); }}
            style={{ position: "absolute", right: 34, top: 4, width: 26, height: 26, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)", color: "#fff", cursor: "pointer" }}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
          </span>
          <span role="button" title={stockFav[it.id] ? "즐겨찾기 빼기" : "즐겨찾기 (PC로 받아 [내 자료]에 담아요)"} draggable={false}
            onClick={(e) => { e.stopPropagation(); void toggleStockFav(it); }}
            style={{ position: "absolute", right: 4, top: 4, width: 26, height: 26, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)", color: stockFav[it.id] ? "#FACC15" : "#fff", cursor: "pointer" }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill={stockFav[it.id] ? "#FACC15" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round"><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z" /></svg>
          </span>
        </button>
      ))}
    </div>
  );
  const drawAi = async () => {
    if (!b || !aiPrompt.trim()) return;
    setBusy(`${imgAi}가 그림을 그리는 중… (1~2분)`);
    setMsg("");
    try {
      const it = await b.ai.image(project.dir, aiPrompt.trim());
      setPicked(it);
      await load();
    } catch (e) {
      setMsg(errText(e));
    }
    setBusy("");
  };
  const act = async (action: LibPickAction) => {
    if (!picked) return;
    setBusy(action === "replace" ? "화면을 바꾸는 중…" : action === "overlay" ? "올리는 중…" : "넣는 중…");
    try {
      await onPick(picked, action);
      setPicked(null);
    } catch (e) {
      setMsg(errText(e));
    }
    setBusy("");
  };

  const picking = selMode && tab === "mine"; // 고르기는 [내 자료]에서만
  // 목록에서 빼기 (PC 파일은 그대로) — 그림 위 ✕ · Del 키 · [고르기] 여러 개
  const drop = async (ids: string[]) => {
    if (!b || !ids.length) return;
    try {
      for (const id of ids) await b.lib.remove(id);
    } catch (e) {
      setMsg(errText(e));
    }
    setHover(null);
    if (picked && ids.includes(picked.id)) setPicked(null);
    setChk((v) => v.filter((x) => !ids.includes(x)));
    load();
  };
  useEffect(() => {
    if (tab !== "mine" || !picked) return;
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== "Delete" || t?.closest?.("input, textarea, [contenteditable]")) return;
      e.preventDefault();
      e.stopPropagation();
      void drop([picked.id]);
    };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  });
  /** 타임라인 편집 — 썸네일 오른쪽 아래 ＋ (캡컷처럼): 재생 막대 자리에 넣기 */
  const plusBtn = (it: LibItem | StockItem) => (
    <span role="button" title="타임라인 재생 막대 자리에 넣기 (끌어서 원하는 트랙에 놓아도 돼요)" draggable={false}
      onClick={async (e) => {
        e.stopPropagation();
        if (!pro || !b) return;
        try {
          if ("ready" in it) await pro.onPlus(it);
          else {
            setBusy("무료 자료를 PC로 받는 중…");
            const got = await b.stock.get(project.dir, it);
            setBusy("");
            await pro.onPlus(got);
          }
        } catch (er) {
          setBusy("");
          setMsg(errText(er));
        }
      }}
      style={{ position: "absolute", right: 5, bottom: 5, zIndex: 2, width: 26, height: 26, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", background: C.accent, color: "#fff", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,.5)" }}>
      <Icon name="plus" size={16} stroke={2.4} />
    </span>
  );
  const grid = (list: (LibItem | StockItem)[], onClick: (x: LibItem | StockItem) => void) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "10px 14px" }}>
      {list.map((it) => {
        const on = picked && "ready" in it && picked.id === it.id;
        const dur = "duration" in it && it.duration ? it.duration : 0;
        return (
          <React.Fragment key={it.id}>
          <button type="button" onClick={() => {
            if (picking && "ready" in it) return setChk((v) => (v.includes(it.id) ? v.filter((x) => x !== it.id) : [...v, it.id]));
            if ("ready" in it) setInlineId(it.id);
            onClick(it);
          }} onMouseEnter={(e) => setHover({ item: it, y: (e.currentTarget as HTMLElement).getBoundingClientRect().top })} onMouseLeave={() => setHover(null)}
            draggable title="눌러서 고르기 · 클립 목록이나 미리보기로 끌어다 놓기"
            onDragStart={(e) => {
              setHover(null);
              e.dataTransfer.setData(DRAG_MEDIA, JSON.stringify("ready" in it ? { lib: it } : { stock: it }));
              e.dataTransfer.effectAllowed = "copy";
            }}
            style={{ position: "relative", aspectRatio: "16 / 10", padding: 0, borderRadius: 4, overflow: "hidden", border: `2px solid ${(picking ? chk.includes(it.id) : on) ? C.accent : "transparent"}`, background: "#000", cursor: "pointer" }}>
            {picking && "ready" in it && (
              <span style={{ position: "absolute", left: 5, top: 5, zIndex: 1, width: 22, height: 22, borderRadius: 4, border: `2px solid ${chk.includes(it.id) ? C.accent : "#fff"}`, background: chk.includes(it.id) ? C.accent : "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                {chk.includes(it.id) && <Icon name="check" size={15} stroke={2.6} />}
              </span>
            )}
            {it.thumb ? <img src={it.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <span style={{ color: C.dim, fontSize: 12 }}>준비 중</span>}
            {/* 마우스를 올리면 왼쪽 위 ✕ — 목록에서 빼기 */}
            {tab === "mine" && !picking && "ready" in it && hover?.item.id === it.id && (
              <span role="button" title="목록에서 빼기 (PC 파일은 그대로)" draggable={false}
                onClick={(e) => { e.stopPropagation(); void drop([it.id]); }}
                style={{ position: "absolute", left: 4, top: 4, zIndex: 1, width: 26, height: 26, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", color: "#fff", cursor: "pointer" }}>
                <Icon name="close" size={15} stroke={2.2} />
              </span>
            )}
            {it.kind === "video" && <span style={{ position: "absolute", left: 6, bottom: 5, fontSize: 12, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.6)", padding: "1px 5px", borderRadius: 3 }}>{dur ? fmtTime(dur, false) : "영상"}</span>}
            {pro && plusBtn(it)}
            {"fav" in it && (
              <span role="button" title={it.fav ? "즐겨찾기 빼기" : "즐겨찾기"} draggable={false}
                onClick={async (e) => {
                  e.stopPropagation();
                  const fav = !it.fav;
                  await b?.lib.fav(it.id, fav);
                  if (picked && picked.id === it.id) setPicked({ ...picked, fav });
                  load();
                }}
                style={{ position: "absolute", right: 4, top: 4, width: 26, height: 26, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)", color: it.fav ? "#FACC15" : "#fff", cursor: "pointer" }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill={it.fav ? "#FACC15" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round"><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z" /></svg>
              </span>
            )}
          </button>
          {/* 고른 자료가 있는 줄 바로 아래에 단추 (두 칸 줄이라 줄 끝에서) */}
          {inlinePick && (() => {
            const pi = list.findIndex((x) => x.id === inlinePick.id);
            const i = list.indexOf(it);
            return pi >= 0 && (i === Math.min(list.length - 1, pi - (pi % 2) + 1)) ? (
              <div ref={(el) => el?.scrollIntoView({ block: "nearest", behavior: "smooth" })}
                style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 6, padding: 8, borderRadius: 6, border: `1px solid ${C.accent}`, background: C.panel2 }}>
                {pickActions}
              </div>
            ) : null;
          })()}
          </React.Fragment>
        );
      })}
    </div>
  );

  const pickActions = picked && (
    <>
      <div style={{ display: "flex", gap: 6 }}>
          {overlay ? (
            <Btn primary small onClick={() => act("overlay")} disabled={picked.kind !== "image"}><Icon name="image" size={16} />{picked.kind === "image" ? "화면 위에 올리기" : "사진만 올릴 수 있어요"}</Btn>
          ) : (
            <>
              {canReplace && <Btn primary small onClick={() => act("replace")} title="고른 클립의 화면을 이 자료로 바꿔요" style={{ flex: 1, justifyContent: "center" }}><Icon name="image" size={16} />화면 바꾸기</Btn>}
              <Btn small onClick={() => act("insert")} title={canReplace ? "고른 클립 뒤에 새 클립으로 넣어요" : "맨 끝에 새 클립으로 넣어요"} style={{ flex: 1, justifyContent: "center" }}><Icon name="plus" size={16} />{canReplace ? "뒤에 넣기" : "끝에 넣기"}</Btn>
            </>
          )}
      </div>
    </>
  );
  // 목록에서 고른 자료면 단추를 그 아래에, 무료 자료·AI 그림처럼 목록 밖이면 맨 아래에
  const inlinePick = picked && inlineId === picked.id && !pro ? picked : null;
  const footer = pro ? (
    <span style={{ fontSize: 14, color: C.sub }}>＋ 를 누르면 재생 막대 자리에, 끌어서 놓으면 그 트랙·시각에 들어가요.</span>
  ) : (
    <>
      {picked && !inlinePick ? (
        pickActions
      ) : picked ? (
        <span style={{ fontSize: 14, color: C.sub }}>고른 자료 바로 아래 단추를 눌러 주세요.</span>
      ) : (
        <span style={{ fontSize: 14, color: C.sub }}>사진이나 영상을 눌러 고르세요.</span>
      )}
    </>
  );

  const hovered = hover && !pro && (
    <div style={{ position: "fixed", right: 400, top: Math.max(80, Math.min(hover.y - 60, (typeof window !== "undefined" ? window.innerHeight : 900) - 320)), width: 460, background: "#000", border: `1px solid ${C.line2}`, borderRadius: 6, overflow: "hidden", zIndex: 50, pointerEvents: "none" }}>
      {hover.item.kind === "video" && "url" in hover.item && (hover.item as LibItem).ready !== undefined ? (
        <video src={(hover.item as LibItem).url} autoPlay muted loop playsInline style={{ width: "100%", display: "block", maxHeight: 300, objectFit: "contain" }} />
      ) : (
        <img src={hover.item.thumb} alt="" style={{ width: "100%", display: "block", maxHeight: 300, objectFit: "contain" }} />
      )}
    </div>
  );

  return (
    <Side title="사진 · 영상 고르기" onClose={onClose} footer={footer}>
      {hovered}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.line}` }}>
        {[["mine", "내 자료"], ["vacancy", "공실 사진"], ["free", "무료 자료"], ["ai", "AI 그림"], ["store", "자료 창고"]].map(([k, l]) => (
          <button key={k} type="button" onClick={() => { setTab(k); setMsg(""); }} style={tabBtn(tab === k)}>{l}</button>
        ))}
      </div>
      {busy && <div style={{ padding: "10px 14px", fontSize: 14, color: C.sub }}>{busy}</div>}
      {msg && <div style={{ padding: "10px 14px", fontSize: 14, color: C.danger, lineHeight: 1.5 }}>{msg}</div>}

      {tab === "mine" && (
        <>
          <div style={{ padding: "12px 14px 0" }}>
            <Btn primary onClick={fromPc} style={{ width: "100%" }}><Icon name="plus" size={18} />PC에서 불러오기</Btn>
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              {(["all", "image", "video"] as const).map((k) => <button key={k} type="button" onClick={() => setKind(k)} style={chip(kind === k)}>{k === "all" ? "전체" : k === "image" ? "사진" : "영상"}</button>)}
              <button type="button" onClick={() => setFav(!fav)} style={chip(fav)}>즐겨찾기</button>
              <button type="button" onClick={() => setRec(!rec)} style={chip(rec)} title="강의·화면·카메라로 녹화한 영상만 (공실뉴스 스튜디오\녹화영상)">녹화</button>
              <span style={{ flex: 1 }} />
              <button type="button" onClick={() => { setSelMode(!selMode); setChk([]); setPicked(null); }} style={chip(selMode)} title="여러 개 골라 목록에서 빼기">{selMode ? "고르기 끝" : "고르기"}</button>
            </div>
            {selMode && items && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, padding: "8px 10px", borderRadius: 6, background: C.card, border: `1px solid ${C.line2}` }}>
                <button type="button" onClick={() => setChk(chk.length === items.length ? [] : items.map((x) => x.id))} style={chip(items.length > 0 && chk.length === items.length)}>
                  {items.length > 0 && chk.length === items.length ? "모두 풀기" : "모두 선택"}
                </button>
                <span style={{ flex: 1, fontSize: 13.5, color: C.sub }}>{chk.length}개 고름</span>
                <Btn small danger disabled={!chk.length} title="창의 목록에서만 빼요. PC 파일은 지우지 않아요 (다시 불러오면 다시 보여요)"
                  onClick={() => void drop(chk)}>
                  <Icon name="trash" size={15} />목록에서 빼기
                </Btn>
              </div>
            )}
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="파일 이름으로 찾기" style={{ ...input, height: 36, fontSize: 14 }} />
              <Btn small onClick={load}><Icon name="search" size={16} /></Btn>
            </div>
            <div style={{ fontSize: 12.5, color: C.dim, marginTop: 8, lineHeight: 1.5 }}>공실뉴스 스튜디오로 만든 사진·영상과 불러온 파일이 자동으로 모여요.</div>
          </div>
          {items === null ? <div style={{ padding: 20, color: C.sub, fontSize: 14 }}>불러오는 중…</div> : items.length ? grid(items, (x) => setPicked(x as LibItem)) : <div style={{ padding: 20, color: C.sub, fontSize: 14 }}>아직 자료가 없어요. [PC에서 불러오기]를 눌러 주세요.</div>}
        </>
      )}

      {tab === "vacancy" && (
        <div>
          <div style={{ padding: "12px 14px 0" }}>
            <select value={vac} onChange={(e) => setVac(e.target.value)} style={{ ...input, fontSize: 14 }}>
              <option value="">{vacs === null ? "내 공실 불러오는 중…" : `공실을 고르세요 (${vacs.length}개)`}</option>
              {(vacs || []).map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          </div>
          {vac && items && grid(items, (x) => setPicked(x as LibItem))}
        </div>
      )}

      {tab === "free" && (
        <div>
          {/* 교체할 이미지 — 고른 클립 화면. 켜져 있으면 누르면 바로 교체 */}
          {target && canReplace && !overlay && replaceOn && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(14,116,144,0.25)", borderBottom: `1px solid ${C.line}` }}>
              <span style={{ fontSize: 14.5, fontWeight: 800 }}>교체할 이미지</span>
              <span style={{ width: 40, height: 28, borderRadius: 3, overflow: "hidden", background: "#000", border: `1px solid ${C.line2}` }}>{target.thumb && <img src={target.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}</span>
              <span style={{ flex: 1 }} />
              <button type="button" onClick={() => setReplaceOn(false)} style={{ border: 0, background: "transparent", color: "#22d3ee", fontSize: 14, fontWeight: 800, fontFamily: FONT, cursor: "pointer" }}>해제</button>
            </div>
          )}
          {target && canReplace && !overlay && !replaceOn && (
            <div style={{ padding: "8px 14px 0" }}><button type="button" onClick={() => setReplaceOn(true)} style={{ border: 0, background: "transparent", color: C.sub, fontSize: 13, fontFamily: FONT, cursor: "pointer", padding: 0 }}>↺ 고른 클립 화면을 바로 교체하기</button></div>
          )}
          <div style={{ padding: "12px 14px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 10px", borderRadius: 8, border: "1px solid #22d3ee", background: C.bg }}>
              <Icon name="search" size={17} />
              <input value={stockQ} onChange={(e) => setStockQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchStock()} placeholder="예: 서울 아파트, 거실"
                style={{ flex: 1, minWidth: 0, border: 0, outline: "none", background: "transparent", color: C.text, fontSize: 15, fontFamily: FONT }} />
              {stockQ && <button type="button" onClick={() => { setStockQ(""); setStock(null); }} title="지우기" style={{ width: 22, height: 22, borderRadius: 11, border: 0, background: C.sub, color: C.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}><Icon name="close" size={13} stroke={2.6} /></button>}
            </div>
            {chips.length > 0 && (
              <div style={{ display: "flex", gap: 6, marginTop: 10, overflowX: "auto", paddingBottom: 2 }}>
                {chips.map((w) => <button key={w} type="button" onClick={() => searchStock(w)} style={{ ...chip(stockQ === w), height: 30, borderRadius: 15, flexShrink: 0, fontSize: 13 }}>{w}</button>)}
              </div>
            )}
          </div>
          <div style={{ display: "flex", borderBottom: `1px solid ${C.line}`, marginTop: 8 }}>
            {(["all", "photo", "video"] as const).map((k) => <button key={k} type="button" onClick={() => { setStockType(k); if (stockQ.trim()) void searchStock(undefined, k); }} style={tabBtn(stockType === k)}>{k === "all" ? "전체" : k === "photo" ? "이미지" : "비디오"}</button>)}
          </div>
          {stock && (stock.length ? masonry(stock) : !msg && !busy && <div style={{ padding: "16px 14px", color: C.sub, fontSize: 14 }}>찾은 자료가 없어요.</div>)}
          <div style={{ fontSize: 12, color: C.dim, padding: "6px 14px 12px" }}>Pexels · Pixabay 무료 자료 (상업 이용 가능). 고르면 PC로 받아 둬요. ⬇ 는 PC [문서\공실뉴스 스튜디오\영상\받은 자료]에 받기, ★ 즐겨찾기는 [내 자료 → 즐겨찾기]에 모여요.</div>
        </div>
      )}

      {tab === "ai" && aiClips && <AiImagesTab project={project} selected={aiClips.selected} ensureAsset={aiClips.ensureAsset} apply={aiClips.apply} />}
      {tab === "ai" && (
        <details open={!aiClips} style={{ padding: "12px 14px 0" }}>
          {aiClips && <summary style={{ fontSize: 14, fontWeight: 800, cursor: "pointer", color: C.sub, marginBottom: 8 }}>한 장만 직접 그리기 · 그린 그림 보기</summary>}
          <div style={label}>그릴 장면</div>
          <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={4} placeholder="예: 해 질 녘 강남 오피스텔 건물 정면, 실제 사진처럼"
            style={{ ...input, height: "auto", padding: 10, marginTop: 6, resize: "vertical", lineHeight: 1.5 }} />
          <Btn primary onClick={drawAi} disabled={!aiPrompt.trim() || Boolean(busy)} style={{ width: "100%", marginTop: 8 }}><Icon name="image" size={18} />{imgAi}로 그리기</Btn>
          <div style={{ fontSize: 12.5, color: C.dim, marginTop: 8 }}>[내 AI 연결]에서 고른 이미지 AI가 그려요. 1~2분 걸려요.</div>
          {items && items.length > 0 && <div style={{ margin: "8px -14px 0" }}><div style={{ ...label, padding: "8px 14px 0", fontSize: 14 }}>그린 그림</div>{grid(items, (x) => setPicked(x as LibItem))}</div>}
        </details>
      )}

      {tab === "store" && (
        <div style={{ padding: 16 }}>
          <Hint>공실뉴스 자료 창고(드론·역세권 거리 영상 등)는 준비 중이에요. 열리면 여기서 바로 고를 수 있어요.</Hint>
        </div>
      )}
    </Side>
  );
}

/* ── AI 목소리 ── */
/** 앱의 [AI 설정] — 키 상태 읽기·창 열기 (웹 브라우저에서는 없음) */
type StudioAi = { list: () => Promise<{ id: string; keyHas?: boolean }[]>; onWriterChanged?: (fn: () => void) => () => void; open?: () => void };
function studioAi(): StudioAi | null {
  if (typeof window === "undefined") return null;
  const g = (window as unknown as { gongsilStudio?: { ai?: StudioAi; openAiConnect?: () => void } }).gongsilStudio;
  return g?.ai ? { ...g.ai, open: g.openAiConnect } : null;
}

export function VoicePanel({ project, initial, pickLabel, targetCount, wordCount = 0, onApply, onClose, gap, onGap, startMe }: { /** 처음부터 [내 목소리] 탭 (AI 목소리 › AI 내 목소리 만들기) */ startMe?: boolean; /** 문장 사이 쉼 (초) — 편집 화면에서만 */ gap?: number; onGap?: (g: number) => void; project?: Project; /** 텍스트로 만들기처럼 프로젝트가 아직 없을 때 */ initial?: { id: string; speed?: number; volume?: number; emotion?: string }; /** 있으면 아래 단추 하나만 (예: "이 목소리로") */ pickLabel?: string; targetCount: number; /** 고른 단어 수 (AI 목소리 클립) — 있으면 [고른 단어만] */ wordCount?: number; onApply: (o: { id: string; speed: number; volume: number; scope: "all" | "selected" | "words"; emotion?: string }) => Promise<void> | void; onClose: () => void }) {
  const cur = initial ?? project?.settings.voice ?? { id: "Charon", speed: 1, volume: 1 };
  const [id, setId] = useState(cur.id);
  const [speed, setSpeed] = useState(cur.speed || 1);
  const [volume, setVolume] = useState(cur.volume ?? 1);
  const [g, setG] = useState<"all" | "여성" | "남성">("all");
  const [rec, setRec] = useState(false); // 예전 [추천] 탭 — 이제 [제미나이] 하나라 늘 모두
  const [meTab, setMeTab] = useState(Boolean(startMe) || cur.id === MY_VOICE_ID); // [내 목소리] 탭
  const [tcTab, setTcTab] = useState(!startMe && isTypecast(cur.id)); // [타입캐스트] 탭 (회원 자기 키)
  const [elTab, setElTab] = useState(!startMe && isEleven(cur.id)); // [일레븐랩스] 탭 (회원 자기 키)
  const [favs, toggleFav] = useVoiceFavs();
  const [favTab, setFavTab] = useState(false); // [★ 즐겨찾기] 탭
  // 제미나이 성우 = 회원 Gemini API 키 ([AI 설정], 이 PC). null = 아직 모름·앱이 아님 (2026-10-19 사장님: 공실뉴스 서버 Gemini 안 씀)
  const [gemKey, setGemKey] = useState<boolean | null>(null);
  useEffect(() => {
    const ai = studioAi();
    if (!ai?.list) return;
    const load = () => ai.list().then((l) => setGemKey(Boolean(l.find((x) => x.id === "gemini")?.keyHas))).catch(() => {});
    load();
    return ai.onWriterChanged?.(load); // [AI 설정]에서 키를 넣으면 바로
  }, []);
  const [emotion, setEmotion] = useState<string>((cur as { emotion?: string }).emotion || "smart"); // 타입캐스트 말투
  const [age, setAge] = useState("");
  const [mood, setMood] = useState("");
  const [msg, setMsg] = useState("");
  const audio = useRef<HTMLAudioElement | null>(null);
  const list = STUDIO_VOICES.filter((v) => (g === "all" || v.gender === g) && (!age || v.age === age) && (!mood || v.mood === mood) && (!rec || v.recommended));
  // 미리 듣기는 미리 녹음해 둔 파일만 — 새로 만들면 공실뉴스 API 비용이 나가서 [내 대본으로 듣기]는 없앴다 (2026-10-17)
  useEffect(() => () => audio.current?.pause(), []);
  // 카드 ▷ — 미리 녹음해 둔 성우 음성 (public/studio-voices/{id}.mp3) 을 바로 튼다. 다시 누르면 멈춤
  const [playing, setPlaying] = useState("");
  const sampleOf = (vid: string) => voicePhoto(vid).replace(/\.webp$/, ".mp3");
  const playSample = (vid: string) => {
    audio.current?.pause();
    if (playing === vid) return setPlaying("");
    const a = new Audio(sampleOf(vid));
    a.playbackRate = speed;
    a.volume = Math.min(1, volume);
    a.onended = () => setPlaying("");
    a.onerror = () => { setPlaying(""); setMsg("이 목소리는 들어 볼 녹음이 아직 없어요."); };
    audio.current = a;
    setPlaying(vid);
    a.play().catch(() => setPlaying(""));
  };
  // 브루처럼 — 오른쪽 칸이 아니라 화면 가운데 큰 창 (왼쪽 거르기 · 가운데 성우 카드 · 아래 볼륨·빠르기). 글자는 크고 또렷하게
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const pick = findVoice(id);
  const fchip = (on: boolean): React.CSSProperties => ({ height: 36, padding: "0 14px", borderRadius: 18, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent", color: on ? C.text : C.sub, fontSize: 15, fontWeight: 700, fontFamily: FONT, cursor: "pointer" });
  const tab = (on: boolean): React.CSSProperties => ({ height: 46, padding: "0 4px", border: 0, borderBottom: `3px solid ${on ? C.accent : "transparent"}`, background: "transparent", color: on ? C.text : C.sub, fontSize: 17, fontWeight: 800, fontFamily: FONT, cursor: "pointer" });
  const head: React.CSSProperties = { fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 8 };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 5100, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(1000px, calc(100vw - 32px))", height: "min(760px, calc(100vh - 32px))", display: "flex", flexDirection: "column", background: C.panel, border: `1px solid ${C.line2}`, borderRadius: 10, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", color: C.text }}>
        {/* 제목 */}
        <div style={{ display: "flex", alignItems: "center", padding: "18px 22px 12px" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 23, fontWeight: 800 }}>AI 목소리 설정</span>
          </div>
          <button type="button" onClick={onClose} title="닫기 (Esc)" style={{ width: 40, height: 40, border: 0, background: "transparent", color: C.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={26} /></button>
        </div>
        <div style={{ flex: 1, minHeight: 0, margin: "0 22px", border: `1px solid ${C.line2}`, borderRadius: 8, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* 위 탭 */}
          <div style={{ display: "flex", gap: 22, padding: "0 18px", borderBottom: `1px solid ${C.line2}` }}>
            {/* 내 목소리 — 맨 앞 (2026-10-19 사장님) */}
            <button type="button" onClick={() => { setMeTab(true); setTcTab(false); setElTab(false); setFavTab(false); }} style={tab(meTab)}>내 목소리</button>
            <button type="button" onClick={() => { setFavTab(true); setMeTab(false); setTcTab(false); setElTab(false); }} style={{ ...tab(favTab), color: favTab ? C.text : "#facc15" }}>★ 즐겨찾기{favs.length ? ` ${favs.length}` : ""}</button>
            {/* 제미나이 성우 — [추천]·[전체]를 하나로 (2026-10-19 사장님) */}
            <button type="button" onClick={() => { setRec(false); setMeTab(false); setTcTab(false); setElTab(false); setFavTab(false); }} style={{ ...tab(!meTab && !tcTab && !elTab && !favTab), display: "inline-flex", alignItems: "center", gap: 6 }}><GeminiMark size={16} />제미나이</button>
            {/* 타입캐스트 · 일레븐랩스 — 회원 자기 키 (2026-10-19 사장님) */}
            <button type="button" onClick={() => { setTcTab(true); setMeTab(false); setElTab(false); setFavTab(false); }} style={{ ...tab(tcTab), display: "inline-flex", alignItems: "center", gap: 6 }}><TypecastMark size={16} />타입캐스트</button>
            <button type="button" onClick={() => { setElTab(true); setMeTab(false); setTcTab(false); setFavTab(false); }} style={{ ...tab(elTab), display: "inline-flex", alignItems: "center", gap: 6 }}><ElevenMark size={16} />일레븐랩스</button>
          </div>
          {meTab && <MyVoicePane selected={id === MY_VOICE_ID} onPick={() => setId(MY_VOICE_ID)} />}
          {tcTab && <TypecastTab id={id} onPick={setId} emotion={emotion} onEmotion={setEmotion} />}
          {elTab && <ElevenTab id={id} onPick={setId} emotion={emotion} onEmotion={setEmotion} />}
          {favTab && (
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10, alignContent: "start" }}>
              {!favs.length && <div style={{ gridColumn: "1 / -1", fontSize: 15, color: C.sub, lineHeight: 1.7, padding: "10px 0" }}>아직 즐겨찾은 목소리가 없어요. 성우 카드의 ☆ 를 누르면 여기 모여요.</div>}
              {favs.map((fid) => {
                const v = findVoice(fid);
                const tcV = isTypecast(fid), elV = isEleven(fid), mine = fid === MY_VOICE_ID;
                const stock = STUDIO_VOICES.find((x) => x.id === fid);
                return (
                  <div key={fid} onClick={() => setId(fid)} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 8, border: `${id === fid ? 2 : 1}px solid ${id === fid ? C.accent : C.line2}`, background: id === fid ? C.accentDim : C.card, cursor: "pointer" }}>
                    {stock ? <VoiceFace id={fid} name={stock.name} size={56} /> : <div style={{ width: 56, height: 56, borderRadius: "50%", flexShrink: 0, background: "#3b3363", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800 }}>{(v?.name || "?").slice(0, 1)}</div>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 17, fontWeight: 800 }}>{v?.name || "목소리"}</div>
                      <div style={{ fontSize: 13, color: C.sub, marginTop: 3 }}>{stock ? `${stock.gender} · ${stock.age} · ${stock.kind}` : v?.kind || ""}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4, fontSize: 13, fontWeight: 700, color: tcV ? "#b4a7ff" : elV ? "#e5e7eb" : mine ? "#6ee7b7" : "#8ab4ff" }}>
                        {tcV ? <><TypecastMark size={13} />#타입캐스트API</> : elV ? <><ElevenMark size={13} />#일레븐랩스API</> : mine ? "#내목소리 (PC, 무료)" : <><GeminiMark size={13} />#제미나이API</>}
                      </div>
                    </div>
                    <FavStar on onToggle={() => toggleFav(fid)} />
                    {stock && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); setId(fid); playSample(fid); }} title={playing === fid ? "멈추기" : "목소리 들어 보기"}
                        style={{ width: 40, height: 40, flexShrink: 0, borderRadius: "50%", border: `1px solid ${playing === fid ? C.accent : C.line2}`, background: playing === fid ? C.accent : "transparent", color: C.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {playing === fid ? <span style={{ width: 11, height: 11, background: "#fff", borderRadius: 2 }} /> : <Icon name="play" size={16} />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ flex: 1, minHeight: 0, display: meTab || tcTab || elTab || favTab ? "none" : "flex" }}>
            {/* 왼쪽 거르기 */}
            <div style={{ width: 200, flexShrink: 0, padding: 16, borderRight: `1px solid ${C.line2}`, overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
                <span style={{ flex: 1, fontSize: 16, fontWeight: 800 }}>거르기</span>
                <button type="button" onClick={() => { setG("all"); setAge(""); setMood(""); }} style={{ border: 0, background: "transparent", color: C.sub, fontSize: 14, fontFamily: FONT, cursor: "pointer" }}>처음대로</button>
              </div>
              <div style={head}>성별</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
                {(["all", "여성", "남성"] as const).map((k) => <button key={k} type="button" onClick={() => setG(k)} style={fchip(g === k)}>{k === "all" ? "모두" : k}</button>)}
              </div>
              <div style={head}>나이</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["", "20대", "30대", "40대", "50대", "60대"].map((k) => <button key={k || "all"} type="button" onClick={() => setAge(k)} style={fchip(age === k)}>{k || "모두"}</button>)}
              </div>
              <div style={{ ...head, marginTop: 20 }}>분위기</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["", ...VOICE_MOODS].map((k) => <button key={k || "all"} type="button" onClick={() => setMood(k)} style={fchip(mood === k)}>{k || "모두"}</button>)}
              </div>
            </div>
            {/* 성우 카드 */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
              {/* 제미나이 성우는 Gemini API 로 만든다 — 이 칸에만 안내 (2026-10-19 사장님) */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px 8px", fontSize: 15, color: C.sub }}>
                <span>성우 <b style={{ color: C.text }}>{list.length}</b>명</span>
                <span title="제미나이 성우 목소리는 Google Gemini API로 만들어요."
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 28, padding: "0 10px", borderRadius: 14, border: `1px solid ${C.line2}`, background: C.card, fontSize: 13, fontWeight: 700, color: C.text }}>
                  <GeminiMark size={15} />Gemini API 필요
                </span>
                {gemKey === true && <span style={{ fontSize: 13.5, fontWeight: 700, color: "#6ee7b7" }}>● 내 Gemini API 키 연결됨</span>}
                {gemKey === false && (
                  <>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: C.danger }}>Gemini API 키를 넣어야 쓸 수 있어요</span>
                    <button type="button" onClick={() => studioAi()?.open?.()}
                      style={{ height: 30, padding: "0 12px", borderRadius: 6, border: 0, background: C.accent, color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>AI 설정 열기</button>
                  </>
                )}
              </div>
              {msg && <div style={{ padding: "0 16px 8px", fontSize: 15, color: C.danger }}>{msg}</div>}
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 16px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12, alignContent: "start" }}>
                {list.length === 0 && <div style={{ fontSize: 15, color: C.sub, padding: "20px 0" }}>맞는 성우가 없어요. 거르기를 바꿔 보세요.</div>}
                {list.map((v) => (
                  <div key={v.id} onClick={() => setId(v.id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, borderRadius: 8, border: `${id === v.id ? 2 : 1}px solid ${id === v.id ? C.accent : C.line2}`, background: id === v.id ? C.accentDim : C.card, cursor: "pointer" }}>
                    <VoiceFace id={v.id} name={v.name} size={80} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 19, fontWeight: 800 }}>{v.name}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.sub, border: `1px solid ${C.line2}`, borderRadius: 4, padding: "1px 6px" }}>{v.gender} · {v.age} · {v.mood}</span>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginTop: 5 }}>{v.kind}</div>
                      <div style={{ fontSize: 14, color: C.sub, marginTop: 3, lineHeight: 1.45 }}>{v.tags.map((t) => `#${t}`).join("  ")}</div>
                      {/* AI 성우 — Gemini API 로 만든다 (2026-10-19 사장님) */}
                      <div title="이 목소리는 Google Gemini API로 만들어요" style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4, fontSize: 13, fontWeight: 700, color: "#8ab4ff" }}>
                        <GeminiMark size={14} />#제미나이API
                      </div>
                    </div>
                    <FavStar on={favs.includes(v.id)} onToggle={() => toggleFav(v.id)} />
                    <button type="button" onClick={(e) => { e.stopPropagation(); setId(v.id); playSample(v.id); }} title={playing === v.id ? "멈추기" : "목소리 들어 보기"}
                      style={{ width: 42, height: 42, flexShrink: 0, borderRadius: "50%", border: `1px solid ${playing === v.id ? C.accent : C.line2}`, background: playing === v.id ? C.accent : "transparent", color: C.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {playing === v.id ? <span style={{ width: 12, height: 12, background: "#fff", borderRadius: 2 }} /> : <Icon name="play" size={17} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* 아래 — 고른 성우 · 목소리 크기 · 빠르기 */}
          <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "12px 18px", borderTop: `1px solid ${C.line2}`, flexWrap: "wrap" }}>
            <span style={{ height: 38, padding: "0 16px", borderRadius: 5, background: C.card, border: `1px solid ${C.line2}`, display: "inline-flex", alignItems: "center", fontSize: 16, fontWeight: 800 }}>{pick ? `${pick.name} · ${pick.kind}` : "목소리"}</span>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, color: C.text }}>
              목소리 크기 <input type="range" min={0.3} max={2} step={0.1} value={volume} onChange={(e) => setVolume(Number(e.target.value))} style={{ width: 120, accentColor: C.accent }} />
              <span style={{ minWidth: 44 }}>{Math.round(volume * 100)}%</span>
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, color: C.text }}>
              빠르기 <input type="range" min={0.7} max={1.6} step={0.1} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} style={{ width: 120, accentColor: C.accent }} />
              <span style={{ minWidth: 40 }}>{speed.toFixed(1)}배</span>
            </label>
            <button type="button" onClick={() => { setSpeed(1); setVolume(1); }} style={{ border: 0, background: "transparent", color: C.sub, fontSize: 14, fontFamily: FONT, cursor: "pointer" }}>처음대로</button>
            {onGap && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 15, fontWeight: 700, color: C.text }} title="AI 목소리 클립과 클립 사이 쉬는 시간 (모든 클립)">
                문장 사이 쉼
                {([[0.1, "짧게"], [0.2, "보통"], [0.4, "길게"]] as const).map(([g, l]) => (
                  <button key={g} type="button" onClick={() => onGap(g)} style={{ height: 30, padding: "0 10px", borderRadius: 15, border: `1px solid ${Math.abs((gap ?? 0.2) - g) < 0.01 ? C.accent : C.line2}`, background: Math.abs((gap ?? 0.2) - g) < 0.01 ? C.accentDim : "transparent", color: C.text, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>{l} {g}초</button>
                ))}
              </span>
            )}
            <span style={{ flex: 1 }} />
          </div>
        </div>
        {/* 넣기 */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "16px 22px 18px" }}>
          {/* 단어를 골랐으면 — 클립은 그대로, 고른 단어만 새 목소리로 (소리 안에서 잇는다) */}
          {pickLabel && <Btn primary onClick={() => onApply({ id, speed, volume, emotion: isTypecast(id) || isEleven(id) ? emotion : undefined, scope: "all" })}><Icon name="check" size={17} />{pickLabel}</Btn>}
          {!pickLabel && wordCount > 0 && <Btn primary onClick={() => onApply({ id, speed, volume, emotion: isTypecast(id) || isEleven(id) ? emotion : undefined, scope: "words" })} title="클립은 그대로 두고, 고른 단어만 이 목소리로 바꿔요"><Icon name="check" size={17} />고른 단어만 ({wordCount}개)</Btn>}
          {!pickLabel && targetCount > 0 && <Btn primary={wordCount === 0} onClick={() => onApply({ id, speed, volume, emotion: isTypecast(id) || isEleven(id) ? emotion : undefined, scope: "selected" })}><Icon name="check" size={17} />고른 클립 {targetCount}개에만</Btn>}
          {!pickLabel && <Btn primary={targetCount === 0 && wordCount === 0} onClick={() => onApply({ id, speed, volume, emotion: isTypecast(id) || isEleven(id) ? emotion : undefined, scope: "all" })}><Icon name="check" size={17} />모든 클립에 쓰기</Btn>}
        </div>
      </div>
    </div>
  );
}

/* ── 메인자막 (자막 서식) ── */
export function SubtitlePanel({ settings, onChange, onPreset, onClose, clip, onSubText, range, anim, pxPer100, ratio, kfEl }: {
  /** 이 클립 메인자막 키프레임 칸 (2026-10-20) */
  kfEl?: React.ReactNode;
  settings: Settings;
  /** 영상 비율 — 위치 [자동] */
  ratio?: Ratio;
  /** 글자 크기 100% = 완성 영상 몇 px (영상 짧은 변 × 0.062) */
  pxPer100?: number;
  /** 사전 설정 스타일 — 클립마다 따로 바꾼 모양까지 덮어 그 모양 그대로 */
  onPreset?: (look: SubLook) => void;
  /** [애니메이션] 탭 (인·아웃·반복) */
  anim: AnimBodyProps;
  onChange: (patch: Partial<Settings["subtitle"]>) => void;
  onClose: () => void;
  /** 이 클립 자막 글 — 고르거나 재생 중인 클립 */
  clip?: { id: string; n: number; text: string; custom: boolean } | null;
  onSubText?: (clipId: string, text: string | null) => void;
  /** 적용 범위 — all: 전체 클립 / sel: 고른 클립만 (selCount 개). style = 지금 보여 줄 서식 */
  range?: { mode: "all" | "sel"; selCount: number; own: number; style: Settings["subtitle"]; onMode: (m: "all" | "sel") => void; onReset: () => void };
}) {
  const s = range ? range.style : settings.subtitle;
  const [draft, setDraft] = useState(clip?.text || "");
  const subFocus = useRef(false); // 쓰는 중에는 바뀐 자막(띄어쓰기 정리)으로 칸을 덮지 않는다 — 끝 띄어쓰기·엔터가 지워지지 않게
  useEffect(() => { if (!subFocus.current) setDraft(clip?.text || ""); }, [clip?.id, clip?.text]);
  // 이 클립 자막 — 쓰는 대로 바로 (멈추고 0.5초 뒤, 칸을 벗어나면 바로). [자막 바꾸기] 단추 없음 (2026-10-19 사장님)
  const subTimer = useRef<number | undefined>(undefined);
  const commitSub = (id: string, was: string, t: string) => {
    window.clearTimeout(subTimer.current);
    if (onSubText && t !== was) onSubText(id, t);
  };
  const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: `1px solid ${C.line}` };
  // 글자 칸 탭 (회의 3-28) — [텍스트 › 기본] 맨 위에 적용 범위·이 클립 자막·보이기·위치, 그 아래 모양은 TextTabs 가 그린다
  const top = (
    <>
      {!(clip && onSubText) && <div style={row}><span style={{ ...label, flex: 1 }}>자막 보이기</span><Toggle on={s.on} onChange={(v) => onChange({ on: v })} /></div>}
      {clip && onSubText && (
        <div style={{ ...row, flexDirection: "column", alignItems: "stretch", gap: 8 }}>
          {/* 자막 보이기 — 이 클립 자막 오른쪽 (2026-10-19 사장님) */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ ...label, flex: 1 }}>이 클립 자막 <span style={{ color: C.sub, fontWeight: 600 }}>· 클립 {clip.n}</span></span>
            <span style={{ fontSize: 13, color: C.sub, fontWeight: 700 }}>자막 보이기</span>
            <Toggle on={s.on} onChange={(v) => onChange({ on: v })} />
          </div>
          <textarea value={draft} rows={3}
            onChange={(e) => {
              const t = e.target.value;
              setDraft(t);
              window.clearTimeout(subTimer.current);
              const id = clip.id, was = clip.text;
              subTimer.current = window.setTimeout(() => commitSub(id, was, t), 500);
            }}
            onFocus={() => { subFocus.current = true; }}
            onBlur={() => { subFocus.current = false; commitSub(clip.id, clip.text, draft); }}
            style={{ ...input, height: "auto", padding: 10, lineHeight: 1.5, resize: "vertical", fontSize: 15 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ flex: 1 }} />
            {clip.custom && <Btn small onClick={() => { window.clearTimeout(subTimer.current); onSubText(clip.id, null); }}>말한 그대로</Btn>}
          </div>
        </div>
      )}
      {kfEl}
    </>
  );
  // 위치 — [기본]에서 색상 아래, 문자 간격 위 (2026-10-19 사장님)
  const posEl = (
    <>
      {/* 위치 — [자동]이 기본(접힘). 누르면 자동이 꺼지고 [상단][중단][중하단][하단]이 펼쳐진다 (2026-10-19 사장님) */}
      {(() => {
        const auto = s.posAuto === true && typeof s.x !== "number";
        return (
          <div style={{ ...row, flexDirection: "column", alignItems: "stretch", gap: auto ? 0 : 8 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ ...label, flex: 1 }}>위치</span>
              <button type="button"
                onClick={() => (auto ? onChange({ posAuto: false }) : onChange({ posAuto: true, position: autoSubPosition(ratio), x: undefined, y: undefined }))}
                title={auto ? "자동 — 영상 비율에 맞춰 (누르면 직접 고르기)" : "눌러서 자동으로 (세로 영상 = 중하단, 가로·정사각 = 하단)"}
                style={{ height: 28, padding: "0 12px", borderRadius: 5, border: `1px solid ${auto ? C.text : C.line2}`, background: auto ? C.text : "transparent", color: auto ? C.bg : C.sub, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>자동</button>
            </div>
            {!auto && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {([["top", "상단"], ["middle-high", "중상단"], ["middle", "중단"], ["middle-low", "중하단"], ["bottom", "하단"]] as const).map(([k, l]) => (
                  <button key={k} type="button" onClick={() => onChange({ position: k, x: undefined, y: undefined, posAuto: false })} style={chip(typeof s.x !== "number" && s.position === k)}>{l}</button>
                ))}
                {typeof s.x === "number" && <button type="button" style={chip(true)}>옮긴 자리</button>}
              </div>
            )}
          </div>
        );
      })()}
    </>
  );
  return (
    <TextTabs title="메인자막" kind="sub" onClose={onClose} basicTop={top} anim={anim} posEl={posEl}
      footerTop={range && (() => {
        // 적용 범위 — 맨 아래 고정 줄 [전체 적용][선택 클립 적용][↺] (2026-10-19 사장님)
        const b = (icon: string, on: boolean, ok: boolean, text: string, title: string, go: () => void) => (
          <button type="button" onClick={go} disabled={!ok} title={title}
            style={{ height: 40, padding: "0 12px", display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 6, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accent : "transparent", color: on ? "#fff" : ok ? C.text : C.dim, opacity: ok ? 1 : 0.45, fontSize: 14, fontWeight: 800, fontFamily: FONT, cursor: ok ? "pointer" : "default", whiteSpace: "nowrap" }}>
            <Icon name={icon} size={16} />{text}
          </button>
        );
        return (
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            {b("applyAll", range.mode === "all", true, "전체 클립 적용", `바꾸는 서식·애니메이션을 영상 전체 자막에${range.own > 0 ? ` (따로 바꾼 클립 ${range.own}개는 바꾼 항목만 그대로)` : ""}`, () => range.onMode("all"))}
            {b("applySel", range.mode === "sel", range.selCount > 0, `선택 클립 적용 (${range.selCount})`, range.selCount ? `고른 클립 ${range.selCount}개에만` : "클립을 먼저 골라 주세요 (카드 왼쪽 네모 칸)", () => range.onMode("sel"))}
            <button type="button" onClick={range.onReset} disabled={range.mode !== "sel"} title="고른 클립을 전체 서식으로 (되돌리기)"
              style={{ width: 40, height: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: `1px solid ${C.line2}`, background: "transparent", color: range.mode === "sel" ? C.text : C.dim, opacity: range.mode === "sel" ? 1 : 0.45, cursor: range.mode === "sel" ? "pointer" : "default", padding: 0 }}>
              <Icon name="undo" size={16} />
            </button>
          </div>
        );
      })()} pxPer100={pxPer100}
      look={s} onLook={(patch) => onChange(patch as Partial<Settings["subtitle"]>)} onPresetLook={(look) => (onPreset ? onPreset(look) : onChange({ ...look, on: true }))} />
  );
}

/* ── 화면 비율 · 채우기 ── */
export function RatioPanel({ ratio, fill, onRatio, onFill, onClose }: { ratio: Ratio; fill: Fill; onRatio: (r: Ratio) => void; onFill: (f: Fill) => void; onClose: () => void }) {
  return (
    <Side title="화면 비율" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: 14 }}>
        {(Object.keys(RATIO_LABEL) as Ratio[]).map((r) => {
          const [w, h] = r.split(":").map(Number);
          const s = 30 / Math.max(w, h);
          return (
            <button key={r} type="button" onClick={() => onRatio(r)} style={{ height: 96, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 6, border: `1px solid ${ratio === r ? C.accent : C.line2}`, background: ratio === r ? C.accentDim : C.card, color: C.text, cursor: "pointer", fontFamily: FONT }}>
              <span style={{ width: w * s, height: h * s, border: `2px solid ${C.text}`, borderRadius: 2 }} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>{RATIO_LABEL[r]} ({r})</span>
            </button>
          );
        })}
      </div>
      <div style={{ padding: "4px 14px 14px" }}>
        <div style={label}>사진·영상 채우기</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          {([["cover", "꽉 채우기", "화면을 가득 채워요 (넘치는 곳은 잘려요)"], ["contain", "맞추기", "잘리지 않게 전체를 보여 줘요 (빈 곳은 검게)"], ["blur", "맞추고 흐린 배경", "전체를 보여 주고 빈 곳은 흐리게 채워요"]] as const).map(([k, l, d]) => (
            <button key={k} type="button" onClick={() => onFill(k)} style={{ textAlign: "left", padding: "10px 12px", borderRadius: 6, border: `1px solid ${fill === k ? C.accent : C.line2}`, background: fill === k ? C.accentDim : C.card, color: C.text, cursor: "pointer", fontFamily: FONT }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{l}</div>
              <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>{d}</div>
            </button>
          ))}
        </div>
      </div>
    </Side>
  );
}

/* ── 배경 음악 ── */
export function MusicPanel({ project, current, rangeText, onPick, onClose, choose }: { project: Project; current: Layer | null; rangeText: string; onPick: (m: { file: string; url: string; name: string }) => void; onClose: () => void; /** 고르기만 (텍스트로 영상 — 프로젝트가 아직 없어 받지 않는다, 2026-10-20) */ choose?: (c: { kind: "lib" | "mine"; id: string; name: string }) => void }) {
  const b = videoBridge();
  const [tab, setTab] = useState<"lib" | "mine">(() => {
    try {
      return localStorage.getItem("gsv:musicTab") === "mine" ? "mine" : "lib";
    } catch {
      return "lib";
    }
  });
  const [mood, setMood] = useState<string>(MUSIC_MOODS[1]);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [listen, setListen] = useState("");
  const [mine, setMine] = useState<LibItem[] | null>(null);
  const [q, setQ] = useState("");
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => audio.current?.pause(), []);
  const switchTab = (t: "lib" | "mine") => {
    setTab(t);
    try {
      localStorage.setItem("gsv:musicTab", t);
    } catch {}
  };
  const loadMine = async () => {
    if (!b) return;
    try {
      setMine(await b.lib.list({ kind: "audio", q }));
    } catch (e) {
      setMsg(errText(e));
      setMine([]);
    }
  };
  useEffect(() => {
    if (tab === "mine") loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const play = (id: string, url: string) => {
    audio.current?.pause();
    if (listen === id) return setListen("");
    const a = new Audio(url);
    a.volume = 0.6;
    a.play().catch(() => {});
    a.onended = () => setListen("");
    audio.current = a;
    setListen(id);
  };
  const pickLib = async (id: string, name: string) => {
    if (choose) return choose({ kind: "lib", id, name });
    if (!b) return;
    setBusy(id);
    setMsg("");
    try {
      const r = await b.musicGet(project.dir, `bgm/lib/${id.slice(4)}.mp3`);
      onPick({ file: r.file, url: r.url, name });
    } catch (e) {
      setMsg(errText(e));
    }
    setBusy("");
  };
  const pickMine = async (it: LibItem) => {
    if (choose) return choose({ kind: "mine", id: it.id, name: it.name });
    if (!b) return;
    setBusy(it.id);
    setMsg("");
    try {
      onPick(await b.musicUse(project.dir, it.id));
    } catch (e) {
      setMsg(errText(e));
    }
    setBusy("");
  };
  const fromPc = async () => {
    if (!b) return;
    const added = await b.lib.pick({ kinds: "audio" });
    if (added.length) {
      setQ("");
      await loadMine();
      setMsg(`${added.length}곡을 내 음악에 넣었어요`);
    }
  };
  const openFolder = async () => {
    if (!b) return;
    await b.openPath(await b.lib.musicFolder());
  };
  // 무료 음악 사이트에서 받기 — 사이트를 브라우저로 열고, 창으로 돌아오면 다운로드 폴더에서 방금 받은 곡을 찾아 [넣기]로 (2026-10-19 사장님)
  //  픽사베이·유튜브 곡은 앱 목록에 담아 나눠 주지 않는다 (약관) — 대표님이 직접 받아 쓰는 것만
  const [dlSince, setDlSince] = useState(0);
  const [dlNew, setDlNew] = useState<{ path: string; name: string }[]>([]);
  const [dlDone, setDlDone] = useState<string[]>([]);
  const openSite = (url: string) => {
    const g = (window as unknown as { gongsilStudio?: { openInBrowser?: (u: string) => void } }).gongsilStudio;
    if (g?.openInBrowser) g.openInBrowser(url);
    else window.open(url, "_blank");
    setDlSince(Date.now());
  };
  useEffect(() => {
    if (!dlSince || !b?.lib.downloadsAudio) return;
    const look = () => b.lib.downloadsAudio!(dlSince).then((l) => setDlNew(l)).catch(() => {});
    look();
    const t = window.setInterval(look, 3000);
    window.addEventListener("focus", look);
    return () => { window.clearInterval(t); window.removeEventListener("focus", look); };
  }, [dlSince, b]);
  const addDl = async (f: { path: string; name: string }) => {
    if (!b?.lib.addDownloads) return;
    setBusy(f.path);
    try {
      const added = await b.lib.addDownloads([f.path]);
      setDlDone((v) => [...v, f.path]);
      await loadMine();
      setMsg(added.length ? `"${f.name.replace(/\.[^.]+$/, "")}"을 내 음악에 넣었어요 — 아래에서 [고르기]` : "넣지 못했어요");
    } catch (e) {
      setMsg(errText(e));
    }
    setBusy("");
  };
  const row = (key: string, on: boolean, playBtn: React.ReactNode, body: React.ReactNode, right: React.ReactNode) => (
    <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 6, border: `1px solid ${on ? C.accent : C.line}`, background: C.card }}>
      {playBtn}
      {body}
      {right}
    </div>
  );
  const playBtn = (id: string, url: string) => (
    <button type="button" onClick={() => play(id, url)} title="미리듣기" style={{ width: 34, height: 34, flexShrink: 0, border: `1px solid ${C.line2}`, borderRadius: 5, background: "transparent", color: C.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon name={listen === id ? "pause" : "play"} size={15} />
    </button>
  );

  return (
    <Side title={choose ? "배경 음악 고르기" : current ? "음악 바꾸기" : "배경 음악 넣기"} onClose={onClose}>
      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.line}`, fontSize: 14.5, lineHeight: 1.6 }}>
        {choose ? <>{current ? <>지금 고른 곡: <b>{current.name}</b><br /></> : null}아래에서 고르면 이 영상의 배경 음악이 돼요.</> : current ? <>지금 음악: <b>{current.name || "음악"}</b><br />아래에서 고르면 이 음악이 바뀌어요.</> : <>아래에서 고르면 <b>{rangeText}</b>에 음악이 깔려요.</>}
      </div>
      <div style={{ display: "flex", borderBottom: `1px solid ${C.line}` }}>
        <button type="button" onClick={() => switchTab("lib")} style={tabBtn(tab === "lib")}>공실뉴스 음악</button>
        <button type="button" onClick={() => switchTab("mine")} style={tabBtn(tab === "mine")}>내 음악</button>
      </div>
      {msg && <div style={{ padding: "10px 14px 0", color: msg.includes("넣었어요") ? C.sub : C.danger, fontSize: 14 }}>{msg}</div>}

      {tab === "lib" ? (
        <>
          <div style={{ padding: "12px 14px 0", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {MUSIC_MOODS.map((md) => <button key={md} type="button" onClick={() => setMood(md)} style={chip(mood === md)}>{md}</button>)}
          </div>
          <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
            {MUSIC_LIBRARY.filter((t) => t.mood === mood).map((t) =>
              row(
                t.id,
                current?.name === t.label,
                playBtn(t.id, `/reels-assets/bgm/lib/${t.id.slice(4)}.mp3`),
                <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{t.label}</span>,
                <>
                  <span style={{ fontSize: 13, color: C.dim }}>{fmtTime(t.duration, false)}</span>
                  <Btn small primary={current?.name === t.label} onClick={() => pickLib(t.id, t.label)} disabled={busy === t.id}>{busy === t.id ? "받는 중…" : current?.name === t.label ? "고름" : "고르기"}</Btn>
                </>
              )
            )}
          </div>
          <div style={{ padding: "0 14px 16px", fontSize: 12.5, color: C.dim }}>공실뉴스 무료 음악 (상업 이용 가능 · CC0)</div>
        </>
      ) : (
        <>
          <div style={{ padding: "12px 14px 0", display: "flex", flexDirection: "column", gap: 8 }}>
            <Btn primary onClick={fromPc} style={{ width: "100%" }}><Icon name="plus" size={18} />PC에서 음악 불러오기</Btn>
            {/* 무료 음악 사이트 — 직접 받아서 넣기 */}
            <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.line2}`, background: C.card }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 8 }}>무료 음악 찾으러 가기</div>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn small onClick={() => openSite("https://pixabay.com/music/")} style={{ flex: 1, justifyContent: "center" }}>픽사베이 음악</Btn>
                <Btn small onClick={() => openSite("https://studio.youtube.com/channel/UC/music")} style={{ flex: 1, justifyContent: "center" }}>유튜브 오디오 보관함</Btn>
              </div>
              <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.6, marginTop: 8 }}>사이트에서 곡을 내려받고 이 창으로 돌아오면, 방금 받은 곡이 아래에 나와요. [넣기]를 누르면 내 음악에 들어가요.</div>
              {dlSince > 0 && (b?.lib.downloadsAudio ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {!dlNew.length && <div style={{ fontSize: 13, color: C.dim }}>받은 곡을 기다리는 중… (다운로드 폴더)</div>}
                  {dlNew.map((f) => {
                    const done = dlDone.includes(f.path);
                    return (
                      <div key={f.path} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
                        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 700 }} title={f.name}>♪ {f.name}</span>
                        <Btn small primary={!done} disabled={done || busy === f.path} onClick={() => addDl(f)}>{done ? "넣음" : busy === f.path ? "넣는 중…" : "넣기"}</Btn>
                      </div>
                    );
                  })}
                </div>
              ) : <div style={{ fontSize: 12.5, color: C.dim, marginTop: 6 }}>받은 곡은 위 [PC에서 음악 불러오기]로 다운로드 폴더에서 넣어 주세요.</div>)}
              <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.6, marginTop: 8 }}>픽사베이 곡 중 일부는 유튜브 저작권 알림이 올 수 있어요. 그럴 땐 받은 곡의 라이선스 문구로 이의 제기하면 돼요.</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadMine()} placeholder="음악 이름으로 찾기" style={{ ...input, height: 36, fontSize: 14 }} />
              <Btn small onClick={loadMine}><Icon name="search" size={16} /></Btn>
            </div>
          </div>
          <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
            {mine === null ? (
              <div style={{ color: C.sub, fontSize: 14, padding: 6 }}>불러오는 중…</div>
            ) : !mine.length ? (
              <div style={{ color: C.sub, fontSize: 14, padding: 6, lineHeight: 1.6 }}>{q ? "찾는 음악이 없어요." : "아직 내 음악이 없어요. 위 [PC에서 음악 불러오기]를 눌러 주세요."}</div>
            ) : (
              mine.map((it) => {
                const name = it.name.replace(/\.[^.]+$/, "");
                const on = current?.name === name;
                return row(
                  it.id,
                  on,
                  playBtn(it.id, it.url),
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={it.name}>{name}</span>,
                  <>
                    <span style={{ fontSize: 13, color: C.dim, flexShrink: 0 }}>{it.duration ? fmtTime(it.duration, false) : ""}</span>
                    <button type="button" title={it.fav ? "즐겨찾기 빼기" : "즐겨찾기"} onClick={async () => { await b?.lib.fav(it.id, !it.fav); loadMine(); }}
                      style={{ width: 30, height: 30, flexShrink: 0, border: 0, background: "transparent", color: it.fav ? C.text : C.dim, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="star" size={16} stroke={it.fav ? 2.4 : 1.6} />
                    </button>
                    <Btn small primary={on} onClick={() => pickMine(it)} disabled={busy === it.id}>{busy === it.id ? "넣는 중…" : on ? "고름" : "고르기"}</Btn>
                    <button type="button" title="목록에서 빼기 (PC 파일은 그대로)" onClick={async () => { await b?.lib.remove(it.id); loadMine(); }}
                      style={{ width: 28, height: 28, flexShrink: 0, border: 0, background: "transparent", color: C.dim, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="close" size={15} />
                    </button>
                  </>
                );
              })
            )}
          </div>
          <div style={{ padding: "0 14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            <Hint>문서\공실뉴스 스튜디오\음악 폴더에 넣은 음악도 저절로 여기에 나와요. 음악은 PC에만 있고 올리지 않아요.</Hint>
            <Btn small onClick={openFolder}><Icon name="folder" size={16} />음악 폴더 열기</Btn>
          </div>
        </>
      )}
    </Side>
  );
}

/** Gemini 표시 (AI 성우가 Gemini API 로 만들어진다는 안내용) */
function GeminiMark({ size = 16 }: { size?: number }) {
  const id = React.useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Gemini" style={{ flexShrink: 0 }}>
      <defs><linearGradient id={id} x1="0" y1="24" x2="24" y2="0"><stop offset="0" stopColor="#1C7DFF" /><stop offset="0.52" stopColor="#1C69FF" /><stop offset="1" stopColor="#F0DCD6" /></linearGradient></defs>
      <path d="M12 0C12 6.63 17.37 12 24 12C17.37 12 12 17.37 12 24C12 17.37 6.63 12 0 12C6.63 12 12 6.63 12 0Z" fill={`url(#${id})`} />
    </svg>
  );
}
