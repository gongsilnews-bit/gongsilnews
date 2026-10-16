"use client";

// 오른쪽 칸 — 자료 고르기(내 자료·공실 사진·무료 자료·AI 그림·자료 창고) · AI 목소리 · 자막 서식 · 화면 비율 · 배경 음악
import React, { useEffect, useRef, useState } from "react";
import type { Layer, LibItem, Project, Ratio, Fill, StockItem, Settings } from "./types";
import { DRAG_MEDIA, RATIO_LABEL, errText, videoBridge, fmtTime } from "./types";
import { STUDIO_VOICES } from "@/lib/studio-video/voices";
import { MUSIC_LIBRARY, MUSIC_MOODS } from "@/lib/reels/music-catalog";
import { listMyStudioVacancies } from "@/app/actions/studio";
import { useStudioImager } from "@/components/admin/sections/useStudioWriter";
import { Btn, C, FONT, Hint, Icon, Toggle, input, label } from "./ui";
import { ColorPick, FontPick } from "./Pickers";
import { DEFAULT_FONT } from "@/lib/studio-video/fonts";

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

  const grid = (list: (LibItem | StockItem)[], onClick: (x: LibItem | StockItem) => void) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "10px 14px" }}>
      {list.map((it) => {
        const on = picked && "ready" in it && picked.id === it.id;
        const dur = "duration" in it && it.duration ? it.duration : 0;
        return (
          <React.Fragment key={it.id}>
          <button type="button" onClick={() => { if ("ready" in it) setInlineId(it.id); onClick(it); }} onMouseEnter={(e) => setHover({ item: it, y: (e.currentTarget as HTMLElement).getBoundingClientRect().top })} onMouseLeave={() => setHover(null)}
            draggable title="눌러서 고르기 · 클립 목록이나 미리보기로 끌어다 놓기"
            onDragStart={(e) => {
              setHover(null);
              e.dataTransfer.setData(DRAG_MEDIA, JSON.stringify("ready" in it ? { lib: it } : { stock: it }));
              e.dataTransfer.effectAllowed = "copy";
            }}
            style={{ position: "relative", aspectRatio: "16 / 10", padding: 0, borderRadius: 4, overflow: "hidden", border: `2px solid ${on ? C.accent : "transparent"}`, background: "#000", cursor: "pointer" }}>
            {it.thumb ? <img src={it.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <span style={{ color: C.dim, fontSize: 12 }}>준비 중</span>}
            {it.kind === "video" && <span style={{ position: "absolute", left: 6, bottom: 5, fontSize: 12, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.6)", padding: "1px 5px", borderRadius: 3 }}>{dur ? fmtTime(dur, false) : "영상"}</span>}
            {"fav" in it && it.fav && <span style={{ position: "absolute", right: 5, top: 4, color: "#fff" }}><Icon name="star" size={15} /></span>}
          </button>
          {/* 고른 자료가 있는 줄 바로 아래에 단추 (두 칸 줄이라 줄 끝에서) */}
          {inlinePick && (() => {
            const pi = list.findIndex((x) => x.id === inlinePick.id);
            const i = list.indexOf(it);
            return pi >= 0 && (i === Math.min(list.length - 1, pi - (pi % 2) + 1)) ? (
              <div ref={(el) => el?.scrollIntoView({ block: "nearest", behavior: "smooth" })}
                style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 6, padding: 10, borderRadius: 6, border: `1px solid ${C.accent}`, background: C.panel2 }}>
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
      <div style={{ width: "100%", fontSize: 13.5, color: C.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>고른 자료: {picked.name}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {overlay ? (
            <Btn primary small onClick={() => act("overlay")} disabled={picked.kind !== "image"}><Icon name="image" size={16} />{picked.kind === "image" ? "화면 위에 올리기" : "사진만 올릴 수 있어요"}</Btn>
          ) : (
            <>
              {canReplace && <Btn primary small onClick={() => act("replace")}><Icon name="image" size={16} />고른 클립 화면 바꾸기</Btn>}
              <Btn small onClick={() => act("insert")}><Icon name="plus" size={16} />{canReplace ? "고른 클립 뒤에 넣기" : "끝에 넣기"}</Btn>
            </>
          )}
          {"fav" in picked && (
            <Btn small onClick={async () => { await b?.lib.fav(picked.id, !picked.fav); setPicked({ ...picked, fav: !picked.fav }); load(); }}><Icon name="star" size={16} />{picked.fav ? "즐겨찾기 빼기" : "즐겨찾기"}</Btn>
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
            </div>
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
export function VoicePanel({ project, targetCount, onApply, onClose }: { project: Project; targetCount: number; onApply: (o: { id: string; speed: number; volume: number; scope: "all" | "selected" }) => Promise<void> | void; onClose: () => void }) {
  const b = videoBridge();
  const cur = project.settings.voice;
  const [id, setId] = useState(cur.id);
  const [speed, setSpeed] = useState(cur.speed || 1);
  const [volume, setVolume] = useState(cur.volume ?? 1);
  const [g, setG] = useState<"all" | "여성" | "남성">("all");
  const [rec, setRec] = useState(true);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const audio = useRef<HTMLAudioElement | null>(null);
  const list = STUDIO_VOICES.filter((v) => (g === "all" || v.gender === g) && (!rec || v.recommended));
  const sample = project.scenes.flatMap((sc) => sc.clips).find((c) => c.type === "voice" && c.text)?.text.slice(0, 60) || "안녕하세요. 공실뉴스입니다. 오늘 소개할 매물을 함께 보시죠.";
  const preview = async (vid: string) => {
    if (!b) return;
    setBusy(vid);
    setMsg("");
    try {
      const r = await b.voice(project.dir, sample, vid);
      audio.current?.pause();
      const a = new Audio(r.url);
      a.playbackRate = speed;
      a.volume = Math.min(1, volume);
      audio.current = a;
      a.play().catch(() => {});
    } catch (e) {
      setMsg(errText(e));
    }
    setBusy("");
  };
  useEffect(() => () => audio.current?.pause(), []);
  return (
    <Side title="AI 목소리 설정" onClose={onClose}
      footer={
        <>
          {targetCount > 0 && <Btn primary small onClick={() => onApply({ id, speed, volume, scope: "selected" })}><Icon name="check" size={16} />고른 클립 {targetCount}개에만</Btn>}
          <Btn primary={targetCount === 0} small onClick={() => onApply({ id, speed, volume, scope: "all" })}><Icon name="check" size={16} />모든 클립에 쓰기</Btn>
        </>
      }>
      <div style={{ padding: "12px 14px 0", display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button type="button" onClick={() => setRec(!rec)} style={chip(rec)}>추천</button>
        {(["all", "여성", "남성"] as const).map((k) => <button key={k} type="button" onClick={() => setG(k)} style={chip(g === k)}>{k === "all" ? "전체" : k}</button>)}
      </div>
      {msg && <div style={{ padding: "10px 14px 0", fontSize: 14, color: C.danger }}>{msg}</div>}
      <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
        {list.map((v) => (
          <div key={v.id} onClick={() => setId(v.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 6, border: `1px solid ${id === v.id ? C.accent : C.line}`, background: id === v.id ? C.accentDim : C.card, cursor: "pointer" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15.5, fontWeight: 800 }}>{v.name} <span style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>· {v.gender}</span></div>
              <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>{v.tags.map((t) => `#${t}`).join(" ")}</div>
            </div>
            <Btn small onClick={() => preview(v.id)} disabled={busy === v.id}>{busy === v.id ? "만드는 중…" : <><Icon name="play" size={14} />미리듣기</>}</Btn>
          </div>
        ))}
      </div>
      <div style={{ padding: "6px 14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ ...label, display: "flex" }}><span style={{ flex: 1 }}>빠르기</span><span>{speed.toFixed(1)}배</span></div>
          <input type="range" min={0.7} max={1.6} step={0.1} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} style={{ width: "100%", accentColor: C.accent }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: C.dim }}><span>느리게</span><span>보통</span><span>빠르게</span></div>
        </div>
        <div>
          <div style={{ ...label, display: "flex" }}><span style={{ flex: 1 }}>목소리 크기</span><span>{Math.round(volume * 100)}%</span></div>
          <input type="range" min={0.3} max={2} step={0.1} value={volume} onChange={(e) => setVolume(Number(e.target.value))} style={{ width: "100%", accentColor: C.accent }} />
        </div>
      </div>
    </Side>
  );
}

/* ── 자막 서식 ── */
export function SubtitlePanel({ settings, onChange, onClose }: { settings: Settings; onChange: (patch: Partial<Settings["subtitle"]>) => void; onClose: () => void }) {
  const s = settings.subtitle;
  const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: `1px solid ${C.line}` };
  return (
    <Side title="자막 서식" onClose={onClose}>
      <div style={row}><span style={{ ...label, flex: 1 }}>자막 보이기</span><Toggle on={s.on} onChange={(v) => onChange({ on: v })} /></div>
      <div style={{ ...row, flexWrap: "wrap" }}>
        <span style={{ ...label, width: "100%" }}>위치</span>
        {([["top", "상단"], ["middle", "중단"], ["middle-low", "중하단"], ["bottom", "하단"]] as const).map(([k, l]) => <button key={k} type="button" onClick={() => onChange({ position: k })} style={chip(s.position === k)}>{l}</button>)}
      </div>
      <div style={{ ...row, flexWrap: "wrap" }}>
        <span style={{ ...label, width: "100%" }}>길이</span>
        <button type="button" onClick={() => onChange({ length: "long" })} style={chip(s.length === "long")}>길게 (문장 그대로)</button>
        <button type="button" onClick={() => onChange({ length: "short" })} style={chip(s.length === "short")}>짧게 (말하는 대로)</button>
      </div>
      <div style={{ ...row, flexDirection: "column", alignItems: "stretch" }}>
        <div style={{ ...label, display: "flex" }}><span style={{ flex: 1 }}>글자 크기</span><span>{s.size}%</span></div>
        <input type="range" min={60} max={170} step={5} value={s.size} onChange={(e) => onChange({ size: Number(e.target.value) })} style={{ width: "100%", accentColor: C.accent }} />
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
