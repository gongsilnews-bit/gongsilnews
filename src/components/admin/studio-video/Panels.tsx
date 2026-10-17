"use client";

// 오른쪽 칸 — 자료 고르기(내 자료·공실 사진·무료 자료·AI 그림·자료 창고) · AI 목소리 · 자막 서식 · 화면 비율 · 배경 음악
import React, { useEffect, useRef, useState } from "react";
import type { Layer, LibItem, Project, Ratio, Fill, StockItem, Settings } from "./types";
import { DRAG_MEDIA, RATIO_LABEL, errText, videoBridge, fmtTime } from "./types";
import { STUDIO_VOICES, VOICE_MOODS, voicePhoto } from "@/lib/studio-video/voices";
import { MUSIC_LIBRARY, MUSIC_MOODS } from "@/lib/reels/music-catalog";
import { listMyStudioVacancies } from "@/app/actions/studio";
import { useStudioImager } from "@/components/admin/sections/useStudioWriter";
import { Btn, C, FONT, Hint, Icon, Toggle, input, label } from "./ui";
import { ColorPick, FontPick } from "./Pickers";
import { DEFAULT_FONT } from "@/lib/studio-video/fonts";

// 성우 얼굴 동그라미 — public/studio-voices/{id}.webp, 없으면 이름 첫 글자
export function VoiceFace({ id, name, size = 52 }: { id: string; name: string; size?: number }) {
  const [bad, setBad] = useState(false);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, overflow: "hidden", background: C.line, border: `1px solid ${C.line2}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: 800, color: C.sub }}>
      {bad ? name.slice(0, 1) : <img src={voicePhoto(id)} alt={name} onError={() => setBad(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
    </div>
  );
}

export function Side({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <aside style={{ width: 380, flexShrink: 0, display: "flex", flexDirection: "column", background: C.panel, borderLeft: `1px solid ${C.line}`, fontFamily: FONT, color: C.text, minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: `1px solid ${C.line}` }}>
        <span style={{ flex: 1, fontSize: 17, fontWeight: 800 }}>{title}</span>
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
export function LibraryPanel({ project, canReplace, onPick, onClose, initialTab = "mine", overlay = false }: { project: Project; canReplace: boolean; onPick: (item: LibItem, action: LibPickAction) => Promise<void> | void; onClose: () => void; initialTab?: string; overlay?: boolean }) {
  const b = videoBridge();
  const [tab, setTab] = useState(initialTab);
  const [kind, setKind] = useState<"all" | "image" | "video">("all");
  const [fav, setFav] = useState(false);
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
  const [stockType, setStockType] = useState<"photo" | "video">("video");
  const [stock, setStock] = useState<StockItem[] | null>(null);
  // AI 그림
  const [aiPrompt, setAiPrompt] = useState("");
  const imgAi = useStudioImager();

  const load = async () => {
    if (!b) return;
    setItems(null);
    try {
      setItems(await b.lib.list({ kind, fav, q, source: tab === "vacancy" ? "vacancy" : tab === "ai" ? "ai" : "" }));
    } catch (e) {
      setMsg(errText(e));
      setItems([]);
    }
  };
  useEffect(() => {
    if (tab === "mine" || tab === "ai") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, kind, fav]);
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
  const searchStock = async () => {
    if (!b || !stockQ.trim()) return;
    setBusy("찾는 중…");
    setStock(null);
    setMsg("");
    const orient = project.ratio === "9:16" || project.ratio === "4:5" ? "portrait" : project.ratio === "1:1" ? "square" : "landscape";
    try {
      const r = await b.stock.search(stockQ.trim(), stockType, orient);
      if (!r.success) {
        setMsg(r.error || "찾지 못했어요.");
        setStock([]);
      } else setStock(r.items || []);
    } catch (e) {
      setMsg(errText(e));
      setStock([]);
    }
    setBusy("");
  };
  const getStock = async (s: StockItem) => {
    if (!b) return;
    setBusy("무료 자료를 PC로 받는 중…");
    try {
      const it = await b.stock.get(project.dir, s);
      setPicked(it);
    } catch (e) {
      setMsg(errText(e));
    }
    setBusy("");
  };
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
  const inlinePick = picked && inlineId === picked.id ? picked : null;
  const footer = (
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

  const hovered = hover && (
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
        <div style={{ padding: "12px 14px 0" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {(["video", "photo"] as const).map((k) => <button key={k} type="button" onClick={() => setStockType(k)} style={chip(stockType === k)}>{k === "video" ? "영상" : "사진"}</button>)}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={stockQ} onChange={(e) => setStockQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchStock()} placeholder="예: 서울 아파트, apartment" style={{ ...input, height: 38, fontSize: 14 }} />
            <Btn small onClick={searchStock}><Icon name="search" size={16} />찾기</Btn>
          </div>
          <div style={{ fontSize: 12.5, color: C.dim, marginTop: 8 }}>Pexels · Pixabay 무료 자료 (상업 이용 가능). 고르면 PC로 받아 둬요.</div>
          {stock && (stock.length ? <div style={{ margin: "0 -14px" }}>{grid(stock, (x) => getStock(x as StockItem))}</div> : !msg && <div style={{ padding: "16px 0", color: C.sub, fontSize: 14 }}>찾은 자료가 없어요.</div>)}
        </div>
      )}

      {tab === "ai" && (
        <div style={{ padding: "12px 14px 0" }}>
          <div style={label}>그릴 장면</div>
          <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={4} placeholder="예: 해 질 녘 강남 오피스텔 건물 정면, 실제 사진처럼"
            style={{ ...input, height: "auto", padding: 10, marginTop: 6, resize: "vertical", lineHeight: 1.5 }} />
          <Btn primary onClick={drawAi} disabled={!aiPrompt.trim() || Boolean(busy)} style={{ width: "100%", marginTop: 8 }}><Icon name="image" size={18} />{imgAi}로 그리기</Btn>
          <div style={{ fontSize: 12.5, color: C.dim, marginTop: 8 }}>[내 AI 연결]에서 고른 이미지 AI가 그려요. 1~2분 걸려요.</div>
          {items && items.length > 0 && <div style={{ margin: "8px -14px 0" }}><div style={{ ...label, padding: "8px 14px 0", fontSize: 14 }}>그린 그림</div>{grid(items, (x) => setPicked(x as LibItem))}</div>}
        </div>
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
export function VoicePanel({ project, initial, pickLabel, targetCount, wordCount = 0, onApply, onClose }: { project?: Project; /** 텍스트로 만들기처럼 프로젝트가 아직 없을 때 */ initial?: { id: string; speed?: number; volume?: number }; /** 있으면 아래 단추 하나만 (예: "이 목소리로") */ pickLabel?: string; targetCount: number; /** 고른 단어 수 (AI 목소리 클립) — 있으면 [고른 단어만] */ wordCount?: number; onApply: (o: { id: string; speed: number; volume: number; scope: "all" | "selected" | "words" }) => Promise<void> | void; onClose: () => void }) {
  const cur = initial ?? project?.settings.voice ?? { id: "Charon", speed: 1, volume: 1 };
  const [id, setId] = useState(cur.id);
  const [speed, setSpeed] = useState(cur.speed || 1);
  const [volume, setVolume] = useState(cur.volume ?? 1);
  const [g, setG] = useState<"all" | "여성" | "남성">("all");
  const [rec, setRec] = useState(true);
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
  const pick = STUDIO_VOICES.find((v) => v.id === id);
  const fchip = (on: boolean): React.CSSProperties => ({ height: 36, padding: "0 14px", borderRadius: 18, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent", color: on ? C.text : C.sub, fontSize: 15, fontWeight: 700, fontFamily: FONT, cursor: "pointer" });
  const tab = (on: boolean): React.CSSProperties => ({ height: 46, padding: "0 4px", border: 0, borderBottom: `3px solid ${on ? C.accent : "transparent"}`, background: "transparent", color: on ? C.text : C.sub, fontSize: 17, fontWeight: 800, fontFamily: FONT, cursor: "pointer" });
  const head: React.CSSProperties = { fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 8 };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 5100, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(1000px, calc(100vw - 32px))", height: "min(760px, calc(100vh - 32px))", display: "flex", flexDirection: "column", background: C.panel, border: `1px solid ${C.line2}`, borderRadius: 10, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", color: C.text }}>
        {/* 제목 */}
        <div style={{ display: "flex", alignItems: "center", padding: "18px 22px 12px" }}>
          <div style={{ flex: 1, fontSize: 23, fontWeight: 800 }}>AI 목소리 설정</div>
          <button type="button" onClick={onClose} title="닫기 (Esc)" style={{ width: 40, height: 40, border: 0, background: "transparent", color: C.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={26} /></button>
        </div>
        <div style={{ flex: 1, minHeight: 0, margin: "0 22px", border: `1px solid ${C.line2}`, borderRadius: 8, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* 위 탭 */}
          <div style={{ display: "flex", gap: 22, padding: "0 18px", borderBottom: `1px solid ${C.line2}` }}>
            <button type="button" onClick={() => setRec(true)} style={tab(rec)}>추천</button>
            <button type="button" onClick={() => setRec(false)} style={tab(!rec)}>전체</button>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
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
              <div style={{ padding: "12px 16px 8px", fontSize: 15, color: C.sub }}>성우 <b style={{ color: C.text }}>{list.length}</b>명</div>
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
                    </div>
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
            <span style={{ flex: 1 }} />
          </div>
        </div>
        {/* 넣기 */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "16px 22px 18px" }}>
          {/* 단어를 골랐으면 — 클립은 그대로, 고른 단어만 새 목소리로 (소리 안에서 잇는다) */}
          {pickLabel && <Btn primary onClick={() => onApply({ id, speed, volume, scope: "all" })}><Icon name="check" size={17} />{pickLabel}</Btn>}
          {!pickLabel && wordCount > 0 && <Btn primary onClick={() => onApply({ id, speed, volume, scope: "words" })} title="클립은 그대로 두고, 고른 단어만 이 목소리로 바꿔요"><Icon name="check" size={17} />고른 단어만 ({wordCount}개)</Btn>}
          {!pickLabel && targetCount > 0 && <Btn primary={wordCount === 0} onClick={() => onApply({ id, speed, volume, scope: "selected" })}><Icon name="check" size={17} />고른 클립 {targetCount}개에만</Btn>}
          {!pickLabel && <Btn primary={targetCount === 0 && wordCount === 0} onClick={() => onApply({ id, speed, volume, scope: "all" })}><Icon name="check" size={17} />모든 클립에 쓰기</Btn>}
        </div>
      </div>
    </div>
  );
}

/* ── 메인자막 (자막 서식) ── */
export function SubtitlePanel({ settings, onChange, onClose, clip, onSubText, range, onAnim }: {
  settings: Settings;
  onAnim?: () => void; // 메인자막 애니메이션 칸
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
  useEffect(() => setDraft(clip?.text || ""), [clip?.id, clip?.text]);
  const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: `1px solid ${C.line}` };
  return (
    <Side title="메인자막" onClose={onClose}>
      {onAnim && (
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.line}` }}>
          <Btn small onClick={onAnim} style={{ width: "100%" }}><Icon name="transition" size={15} />애니메이션{s.anim ? " · 들어감" : ""}</Btn>
        </div>
      )}
      {range && (
        <div style={{ ...row, flexDirection: "column", alignItems: "stretch", gap: 8, background: range.mode === "sel" ? C.accentDim : undefined }}>
          <span style={label}>적용 범위</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={() => range.onMode("all")} style={{ ...chip(range.mode === "all"), flex: 1 }}>전체 클립</button>
            <button type="button" onClick={() => range.onMode("sel")} disabled={!range.selCount} title={range.selCount ? "" : "클립을 먼저 골라 주세요 (카드 왼쪽 네모 칸)"}
              style={{ ...chip(range.mode === "sel"), flex: 1, opacity: range.selCount ? 1 : 0.4, cursor: range.selCount ? "pointer" : "default" }}>고른 클립만{range.selCount ? ` (${range.selCount}개)` : ""}</button>
          </div>
          <span style={{ fontSize: 12.5, color: range.mode === "sel" ? C.text : C.dim, lineHeight: 1.5 }}>
            {range.mode === "sel" ? `아래에서 바꾸는 서식은 고른 클립 ${range.selCount}개에만 들어가요. 미리보기에서 끌어 옮기는 것도요.` : "아래에서 바꾸는 서식은 영상 전체 자막에 들어가요."}
            {range.own > 0 && range.mode === "all" ? ` 따로 바꾼 클립 ${range.own}개는 바꾼 항목만 그대로예요.` : ""}
          </span>
          {range.mode === "sel" && <div><Btn small onClick={range.onReset}><Icon name="undo" size={15} />전체 서식으로 되돌리기</Btn></div>}
        </div>
      )}
      {clip && onSubText && (
        <div style={{ ...row, flexDirection: "column", alignItems: "stretch", gap: 8 }}>
          <span style={label}>이 클립 자막 <span style={{ color: C.sub, fontWeight: 600 }}>· 클립 {clip.n}</span></span>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onSubText(clip.id, draft); } }}
            style={{ ...input, height: "auto", padding: 10, lineHeight: 1.5, resize: "vertical", fontSize: 15 }} />
          <div style={{ display: "flex", gap: 6 }}>
            <Btn small primary onClick={() => onSubText(clip.id, draft)} disabled={draft === clip.text}>자막 바꾸기</Btn>
            {clip.custom && <Btn small onClick={() => onSubText(clip.id, null)}>말한 그대로</Btn>}
          </div>
          <span style={{ fontSize: 12.5, color: C.dim }}>엔터로 줄을 나누면 그대로 두 줄이 돼요. 목소리는 그대로예요.</span>
        </div>
      )}
      <div style={row}><span style={{ ...label, flex: 1 }}>자막 보이기</span><Toggle on={s.on} onChange={(v) => onChange({ on: v })} /></div>
      <div style={{ ...row, flexWrap: "wrap" }}>
        <span style={{ ...label, width: "100%" }}>위치</span>
        {([["top", "상단"], ["middle", "중단"], ["middle-low", "중하단"], ["bottom", "하단"]] as const).map(([k, l]) => <button key={k} type="button" onClick={() => onChange({ position: k, x: undefined, y: undefined })} style={chip(typeof s.x !== "number" && s.position === k)}>{l}</button>)}
        {typeof s.x === "number" && <button type="button" style={chip(true)}>옮긴 자리</button>}
        <span style={{ width: "100%", fontSize: 12.5, color: C.dim }}>미리보기에서 자막을 끌어 옮기고, 양옆 손잡이로 줄 너비를 바꿀 수 있어요.</span>
      </div>
      <div style={{ ...row, flexDirection: "column", alignItems: "stretch" }}>
        <div style={{ ...label, display: "flex" }}><span style={{ flex: 1 }}>글자 크기</span><span>{s.size}%</span></div>
        <input type="range" min={40} max={260} step={5} value={s.size} onChange={(e) => onChange({ size: Number(e.target.value) })} style={{ width: "100%", accentColor: C.accent }} />
      </div>
      <div style={{ ...row, flexDirection: "column", alignItems: "stretch" }}>
        <div style={{ ...label, display: "flex" }}><span style={{ flex: 1 }}>행간 (줄 사이)</span><span>{Math.round(((s.leading ?? 1.25) / 1.25) * 100)}%</span></div>
        <input type="range" min={0.9} max={2.5} step={0.05} value={s.leading ?? 1.25} onChange={(e) => onChange({ leading: Math.abs(Number(e.target.value) - 1.25) < 0.001 ? undefined : Number(e.target.value) })} style={{ width: "100%", accentColor: C.accent }} />
        <div style={{ display: "flex", gap: 6, marginTop: 6, marginBottom: 14 }}>
          {[[1, "좁게"], [1.25, "기본"], [1.6, "넓게"], [2, "더 넓게"]].map(([v, t]) => (
            <button key={String(v)} type="button" onClick={() => onChange({ leading: v === 1.25 ? undefined : (v as number) })} style={{ ...chip(Math.abs((s.leading ?? 1.25) - (v as number)) < 0.001), flex: 1, padding: 0 }}>{t}</button>
          ))}
        </div>
        <div style={{ ...label, display: "flex" }}><span style={{ flex: 1 }}>자간 (글자 사이)</span><span>{Math.round((s.spacing ?? 0) * 100)}%</span></div>
        <input type="range" min={-0.1} max={0.5} step={0.01} value={s.spacing ?? 0} onChange={(e) => onChange({ spacing: Number(e.target.value) || undefined })} style={{ width: "100%", accentColor: C.accent }} />
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          {[[-0.05, "좁게"], [0, "기본"], [0.1, "넓게"], [0.2, "더 넓게"]].map(([v, t]) => (
            <button key={String(v)} type="button" onClick={() => onChange({ spacing: (v as number) || undefined })} style={{ ...chip(Math.abs((s.spacing ?? 0) - (v as number)) < 0.001), flex: 1, padding: 0 }}>{t}</button>
          ))}
        </div>
      </div>
      <div style={{ ...row, flexDirection: "column", alignItems: "stretch" }}><span style={label}>글꼴</span><FontPick value={s.font} onChange={(f) => onChange({ font: f })} /></div>
      <div style={{ ...row, flexDirection: "column", alignItems: "stretch" }}><span style={label}>글자 색</span><ColorPick value={s.color} onChange={(c) => onChange({ color: c })} /></div>
      <div style={{ ...row, flexDirection: "column", alignItems: "stretch" }}><span style={label}>테두리 색</span><ColorPick value={s.outline || "#000000"} onChange={(c) => onChange({ outline: c })} /></div>
      <div style={{ ...row, flexDirection: "column", alignItems: "stretch" }}>
        <div style={{ ...label, display: "flex" }}><span style={{ flex: 1 }}>테두리 두께</span><span>{s.outlineWidth}</span></div>
        <input type="range" min={0} max={8} step={1} value={s.outlineWidth} onChange={(e) => onChange({ outlineWidth: Number(e.target.value) })} style={{ width: "100%", accentColor: C.accent }} />
      </div>
      <div style={row}><span style={{ ...label, flex: 1 }}>글자 뒤 상자</span><Toggle on={s.bg} onChange={(v) => onChange({ bg: v })} /></div>
      {s.bg && (
        <>
          <div style={{ ...row, flexDirection: "column", alignItems: "stretch" }}><span style={label}>상자 색</span><ColorPick value={s.bgColor || "#000000"} onChange={(c) => onChange({ bgColor: c })} /></div>
          <div style={{ ...row, flexDirection: "column", alignItems: "stretch" }}>
            <div style={{ ...label, display: "flex" }}><span style={{ flex: 1 }}>상자 진하기</span><span>{Math.round((s.bgOpacity ?? 0.62) * 100)}%</span></div>
            <input type="range" min={0.1} max={1} step={0.05} value={s.bgOpacity ?? 0.62} onChange={(e) => onChange({ bgOpacity: Number(e.target.value) })} style={{ width: "100%", accentColor: C.accent }} />
          </div>
        </>
      )}
      {(!s.font || s.font === DEFAULT_FONT) && <div style={row}><span style={{ ...label, flex: 1 }}>굵게</span><Toggle on={s.bold} onChange={(v) => onChange({ bold: v })} /></div>}
    </Side>
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
export function MusicPanel({ project, current, rangeText, onPick, onClose }: { project: Project; current: Layer | null; rangeText: string; onPick: (m: { file: string; url: string; name: string }) => void; onClose: () => void }) {
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
    <Side title={current ? "음악 바꾸기" : "배경 음악 넣기"} onClose={onClose}>
      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.line}`, fontSize: 14.5, lineHeight: 1.6 }}>
        {current ? <>지금 음악: <b>{current.name || "음악"}</b><br />아래에서 고르면 이 음악이 바뀌어요.</> : <>아래에서 고르면 <b>{rangeText}</b>에 음악이 깔려요.</>}
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
