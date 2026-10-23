"use client";

// 오른쪽 위 요소 단추로 여는 넣기 칸 (회의 3-29, 2026-10-19)
//  텍스트 — 기본 글자 / 꾸민 글자(사전 설정 스타일) / 내 사전설정을 누르면 그 모양으로 바로 넣기 (캡컷 텍스트처럼)
//  효과음 — 눌러서 듣고 [넣기] = 고른 클립(단어를 골랐으면 그 단어) 시작에 한 번
import React, { useEffect, useRef, useState } from "react";
import { errText, videoBridge, type LayerAnim, type LibItem } from "./types";
import { SFX_LIST } from "./timeline";
import { Btn, C, FONT, Icon, input } from "./ui";
import { Side } from "./Panels";
import { LookTile, SubPresetGrid, loadMyPresets, type TextLook } from "./SubPresets";
import { VarietyGrid } from "./Variety";
import { tplAnim } from "./templateAnims";

export function TextInsertPanel({ onAdd, onClose }: { onAdd: (look: TextLook, anim?: LayerAnim) => void; onClose: () => void; onTemplates?: () => void }) {
  // 글자 칸과 같은 순서 (2026-10-20 사장님): 기본 글자 → 내 설정(모양) → 템플릿(모양 + 움직임: 꾸민 글자 · 예능 자막 · 내 템플릿)
  const [my] = useState(() => loadMyPresets());
  const [t, setT] = useState<"deco" | "variety" | "mine">("deco");
  const mySet = my.filter((x) => !x.anim);
  const myTpl = my.filter((x) => x.anim);
  const head: React.CSSProperties = { fontSize: 14, fontWeight: 800, margin: "16px 0 8px" };
  const tiles = (list: typeof my) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
      {list.map((pr) => (
        <div key={pr.id}>
          <LookTile look={pr.look} big title={`${pr.name} — 누르면 이 모양으로 넣기`} onClick={() => onAdd(pr.look, pr.anim)} />
          <div style={{ fontSize: 12, color: C.sub, marginTop: 4, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pr.anim ? "▶ " : ""}{pr.name}</div>
        </div>
      ))}
    </div>
  );
  return (
    <Side title="텍스트" onClose={onClose}>
      <div style={{ padding: "12px 16px 20px" }}>
        <Btn primary onClick={() => onAdd({})} style={{ width: "100%", justifyContent: "center" }}><Icon name="plus" size={16} />기본 글자 넣기</Btn>
        <div style={{ fontSize: 12.5, color: C.dim, marginTop: 8, lineHeight: 1.5 }}>고른 클립(없으면 지금 클립)에 들어가요. 단어를 고르고 넣으면 그 말 할 때만. 글은 미리보기에서 두 번 눌러 고쳐요.</div>
        {mySet.length > 0 && (
          <>
            <div style={head}>내 설정 <span style={{ fontSize: 12, color: C.dim, fontWeight: 600 }}>· 모양만</span></div>
            {tiles(mySet)}
          </>
        )}
        <div style={head}>템플릿 <span style={{ fontSize: 12, color: C.dim, fontWeight: 600 }}>· 모양 + 움직임, 누르면 바로 넣기</span></div>
        <div style={{ display: "flex", borderRadius: 7, background: C.card, padding: 3, marginBottom: 8 }}>
          {([["deco", "꾸민 글자"], ["variety", "예능 자막"], ["mine", "내 템플릿"]] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setT(k)}
              style={{ flex: 1, height: 30, border: 0, borderRadius: 5, background: t === k ? C.panel2 : "transparent", color: t === k ? C.text : C.sub, fontSize: 13.5, fontWeight: 800, fontFamily: FONT, cursor: "pointer" }}>
              {l}{k === "mine" && myTpl.length ? ` ${myTpl.length}` : ""}
            </button>
          ))}
        </div>
        {t === "deco" && <SubPresetGrid value={{}} onPick={(look, m) => onAdd(look, tplAnim(m.group, m.index))} />}
        {t === "variety" && <div style={{ margin: "0 -16px" }}><VarietyGrid value={{}} onPick={(look, m) => onAdd(look, tplAnim(m.group, m.index))} /></div>}
        {t === "mine" && (myTpl.length ? tiles(myTpl) : <div style={{ fontSize: 13.5, color: C.sub, lineHeight: 1.7 }}>아직 저장한 템플릿이 없어요. 글자를 넣고 [애니메이션]을 입힌 뒤 [템플릿 › 내 템플릿]에서 저장하세요.</div>)}
      </div>
    </Side>
  );
}

/** 효과음 넣기 — [공실뉴스 효과음] · [내 효과음] (배경 음악 칸과 같은 모양, 2026-10-21 사장님) */
export function SfxInsertPanel({ dir, onAdd, onClose }: { dir: string; onAdd: (id: string, label: string, volume: number, mine?: { file: string; url: string }) => void; onClose: () => void }) {
  const b = videoBridge();
  const [vol, setVol] = useState(0.8);
  const [tab, setTabS] = useState<"lib" | "mine">(() => { try { return localStorage.getItem("gsv:sfxTab") === "mine" ? "mine" : "lib"; } catch { return "lib"; } });
  const setTab = (t: "lib" | "mine") => { setTabS(t); try { localStorage.setItem("gsv:sfxTab", t); } catch {} };
  const [mine, setMine] = useState<LibItem[] | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [q, setQ] = useState("");
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => audio.current?.pause(), []);
  const playUrl = (url: string) => {
    try {
      audio.current?.pause();
      const au = new Audio(url);
      au.volume = Math.min(1, vol);
      audio.current = au;
      void au.play().catch(() => {});
    } catch {}
  };
  const loadMine = async () => {
    if (!b) return;
    try { setMine(await b.lib.list({ kind: "audio", source: "sfx", q })); } catch (e) { setMsg(errText(e)); setMine([]); }
  };
  useEffect(() => { if (tab === "mine") void loadMine(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  const fromPc = async () => {
    if (!b) return;
    const added = await b.lib.pick({ kinds: "audio", source: "sfx" });
    if (added.length) { setQ(""); await loadMine(); setMsg(`${added.length}개를 내 효과음에 넣었어요`); }
  };
  const putMine = async (it: LibItem) => {
    if (!b?.sfxUse) return setMsg("앱을 새로 받아야 쓸 수 있어요 (0.1.11부터)");
    setBusy(it.id);
    setMsg("");
    try {
      const r = await b.sfxUse(dir, it.id);
      onAdd("mine", r.name, vol, { file: r.file, url: r.url });
    } catch (e) { setMsg(errText(e)); }
    setBusy("");
  };
  // 무료 효과음 사이트에서 받기 — 배경 음악과 같이: 사이트를 열고, 돌아오면 다운로드 폴더에서 방금 받은 것을 [넣기]
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
      const added = await b.lib.addDownloads([f.path], "sfx");
      setDlDone((v) => [...v, f.path]);
      await loadMine();
      setMsg(added.length ? `"${f.name.replace(/\.[^.]+$/, "")}"을 내 효과음에 넣었어요 — 아래에서 [넣기]` : "넣지 못했어요");
    } catch (e) { setMsg(errText(e)); }
    setBusy("");
  };
  const tabBtn = (on: boolean): React.CSSProperties => ({ flex: 1, height: 38, border: 0, borderBottom: `2px solid ${on ? C.sel : "transparent"}`, background: "transparent", color: on ? C.text : C.sub, fontSize: 14.5, fontWeight: 800, fontFamily: FONT, cursor: "pointer" });
  const row = (key: string, url: string, name: string, onPut: () => void, putBusy = false) => (
    <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 7, background: C.card, border: `1px solid ${C.line}` }}>
      <button type="button" onClick={() => playUrl(url)} title="들어 보기"
        style={{ width: 32, height: 32, borderRadius: 16, border: 0, background: C.panel2, color: C.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name="play" size={15} />
      </button>
      <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, fontFamily: FONT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={name}>{name}</span>
      <Btn small onClick={onPut} disabled={putBusy}><Icon name="plus" size={14} />{putBusy ? "넣는 중…" : "넣기"}</Btn>
    </div>
  );
  return (
    <Side title="효과음" onClose={onClose}>
      <div style={{ display: "flex", borderBottom: `1px solid ${C.line}` }}>
        <button type="button" onClick={() => setTab("lib")} style={tabBtn(tab === "lib")}>공실뉴스 효과음</button>
        <button type="button" onClick={() => setTab("mine")} style={tabBtn(tab === "mine")}>내 효과음</button>
      </div>
      <div style={{ padding: "12px 16px 20px" }}>
        <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.5, marginBottom: 10 }}>▶ 로 들어 보고 [넣기]를 누르면 고른 클립(없으면 지금 클립)이 시작할 때 한 번 나와요. 단어를 고르고 넣으면 그 말 할 때.</div>
        {msg && <div style={{ marginBottom: 10, color: msg.includes("넣었어요") ? C.sub : C.danger, fontSize: 13.5 }}>{msg}</div>}
        {tab === "lib" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {SFX_LIST.map((x) => row(x.id, `/studio-sfx/${x.id}.mp3`, x.label, () => onAdd(x.id, x.label, vol)))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Btn primary onClick={fromPc} style={{ width: "100%" }}><Icon name="plus" size={18} />PC에서 효과음 불러오기</Btn>
            {/* 무료 효과음 사이트 — 직접 받아서 넣기 (배경 음악과 같은 방식) */}
            <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.line2}`, background: C.card }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 8 }}>무료 효과음 찾으러 가기</div>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn small onClick={() => openSite("https://pixabay.com/sound-effects/")} style={{ flex: 1, justifyContent: "center" }}>픽사베이 효과음</Btn>
                <Btn small onClick={() => openSite("https://studio.youtube.com/channel/UC/music")} style={{ flex: 1, justifyContent: "center" }}>유튜브 오디오 보관함</Btn>
              </div>
              <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.6, marginTop: 8 }}>사이트에서 효과음을 내려받고 이 창으로 돌아오면, 방금 받은 파일이 아래에 나와요. [넣기]를 누르면 내 효과음에 들어가요.</div>
              {dlSince > 0 && (b?.lib.downloadsAudio ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {!dlNew.length && <div style={{ fontSize: 13, color: C.dim }}>받은 파일을 기다리는 중… (다운로드 폴더)</div>}
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
              ) : <div style={{ fontSize: 12.5, color: C.dim, marginTop: 6 }}>받은 파일은 위 [PC에서 효과음 불러오기]로 다운로드 폴더에서 넣어 주세요.</div>)}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadMine()} placeholder="효과음 이름으로 찾기" style={{ ...input, height: 36, fontSize: 14 }} />
              <Btn small onClick={loadMine}><Icon name="search" size={16} /></Btn>
            </div>
            {mine === null ? (
              <div style={{ color: C.sub, fontSize: 14, padding: 6 }}>불러오는 중…</div>
            ) : !mine.length ? (
              <div style={{ color: C.sub, fontSize: 14, padding: 6, lineHeight: 1.6 }}>{q ? "찾는 효과음이 없어요." : "아직 내 효과음이 없어요. 위 [PC에서 효과음 불러오기]를 누르거나 무료 사이트에서 받아 주세요."}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {mine.map((it) => row(it.id, it.url, it.name.replace(/\.[^.]+$/, ""), () => putMine(it), busy === it.id))}
              </div>
            )}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
          <span style={{ fontSize: 13, color: C.sub, width: 64, flexShrink: 0 }}>소리 크기</span>
          <input type="range" min={0.1} max={1} step={0.05} value={vol} onChange={(e) => setVol(Number(e.target.value))} style={{ flex: 1, accentColor: C.accent }} />
          <span style={{ fontSize: 12.5, color: C.sub, width: 36, textAlign: "right" }}>{Math.round(vol * 100)}%</span>
        </div>
      </div>
    </Side>
  );
}
