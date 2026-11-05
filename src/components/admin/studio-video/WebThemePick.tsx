"use client";

/**
 * 쇼츠 만들기 › ② 테마 (2026-11-05 사장님: "테마를 고르면 자막부터 음악·성우까지 · 디테일은 본인이 · 직관적으로")
 *  위: 테마 칸 (공실 첫 사진 위에 그 테마 제목·자막을 얹은 작은 세로 화면) — 기본 5 + 내 테마 3
 *  아래: 지금 정해진 성우 · 자막 · 음악 세 줄, 줄마다 [바꾸기]. 바꾸면 "내가 고침" → [내 테마로 저장]
 */
import React, { useEffect, useRef, useState } from "react";
import type { TypecastVoice } from "./types";
import { C, FONT, Icon } from "./ui";
import { fontCss } from "@/lib/studio-video/fonts";
import { loadFont } from "./Pickers";
import { BASIC_GROUPS, SubPresetGrid } from "./SubPresets";
import { VoiceAvatar, koVoice } from "./voiceKo";
import { MY_THEME_SLOTS, SHORTS_MUSIC, SHORTS_THEMES, loadBaseThemes, loadMyThemes, saveMyThemes, type ShortsTheme } from "./webThemes";

/** 웹 AI 목소리 빠르기 — 1.25배가 처음 값 (2026-11-05 사장님) */
const VOICE_RATE = 1.25;
const fontsOf = (t: ShortsTheme) => [t.sub.font, t.title.font, t.office.font].filter(Boolean) as string[];

/** 테마 미리보기 — 작은 세로 화면 */
function Mini({ t, photo, place, sample, w }: { t: ShortsTheme; photo: string; place: string; sample: string; w: number }) {
  const h = Math.round((w * 16) / 9);
    const sub = t.sub;
  const fs = Math.max(9, Math.round(w * 0.105));
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: 8, overflow: "hidden", background: photo ? `#222 url("${photo}") center/cover` : "linear-gradient(160deg,#4b5675,#1f2433)" }}>
      <div style={{ position: "absolute", left: "50%", top: "8%", transform: "translateX(-50%)", maxWidth: "88%", padding: "2px 6px", borderRadius: 3, background: t.title.boxColor, color: t.title.color, fontFamily: fontCss(t.title.font), fontWeight: 800, fontSize: Math.max(7, Math.round(w * 0.075)), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{place}</div>
      <div style={{ position: "absolute", left: "6%", right: "6%", top: "66%", textAlign: "center", lineHeight: 1.25 }}>
        <span style={{ fontFamily: fontCss(sub.font), fontWeight: sub.bold === false ? 500 : 800, fontSize: fs, color: sub.color || "#fff", padding: sub.bg ? "1px 5px" : 0, borderRadius: 3,
          background: sub.bg ? hexA(sub.bgColor || "#000", sub.bgOpacity ?? 0.62) : undefined, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone", ...stroke(sub, fs) }}>{sample}</span>
      </div>
    </div>
  );
}
/** 작은 견본용 테두리·그림자 — 글자 뒤로 (paint-order) 얇게 */
function stroke(sub: ShortsTheme["sub"], fs: number): React.CSSProperties {
  const ow = sub.bg ? 0 : Number(sub.outlineWidth ?? 3);
  const sh = !sub.bg && Number(sub.shadow) > 0 ? `${Math.max(1, fs * 0.08)}px ${Math.max(1, fs * 0.08)}px 0 ${sub.shadowColor || "#000"}` : undefined;
  return { ...(ow > 0 ? { WebkitTextStroke: `${Math.min(3, Math.max(0.8, ow * fs * 0.035))}px ${sub.outline || "#000"}`, paintOrder: "stroke fill" } : {}), textShadow: sh };
}
function hexA(hex: string, a: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export default function WebThemePick({ theme, onTheme, photo, place, sample, voices, voiceId, voiceOn, onVoiceOn, onPickVoice, disabled }: {
  theme: ShortsTheme;
  onTheme: (t: ShortsTheme, fromTile: boolean) => void;
  photo: string;
  place: string;
  sample: string;
  voices: TypecastVoice[] | null;
  voiceId: string;
  voiceOn: boolean;
  onVoiceOn: (on: boolean) => void;
  onPickVoice: () => void;
  disabled?: boolean;
}) {
  const [mine, setMine] = useState<(ShortsTheme | null)[]>(() => Array.from({ length: MY_THEME_SLOTS }, () => null));
  const [base, setBase] = useState(theme.id); // 고른 칸 (고치면 theme 만 바뀌고 base 는 그대로)
  const [open, setOpen] = useState<"" | "sub" | "music" | "save">("");
  const [playing, setPlaying] = useState("");
  const au = useRef<HTMLAudioElement | null>(null);
  const [bases, setBases] = useState<ShortsTheme[]>(SHORTS_THEMES); // 최고관리자가 바꾼 기본 테마가 있으면 그것
  useEffect(() => { setMine(loadMyThemes()); void loadBaseThemes().then(setBases); }, []);
  useEffect(() => { if (theme.id) setBase(theme.id); }, [theme.id]); // 지난번 테마(내 테마 포함)로 열 때
  useEffect(() => { [...bases, ...mine.filter(Boolean)].flatMap((t) => fontsOf(t as ShortsTheme)).forEach((f) => loadFont(f).catch(() => {})); }, [mine, bases]);
  useEffect(() => () => au.current?.pause(), []);

  const play = (url: string, rate = 1) => {
    au.current?.pause();
    if (playing === url) { setPlaying(""); return; }
    const a = new Audio(url);
    a.volume = rate === 1 ? 0.6 : 1;
    a.playbackRate = rate;
    a.onended = () => setPlaying("");
    void a.play().catch(() => setPlaying(""));
    au.current = a;
    setPlaying(url);
  };
  const tiles = [...bases, ...mine];
  const baseT = tiles.find((t) => t && t.id === base) as ShortsTheme | undefined;
  const changed = Boolean(baseT) && JSON.stringify({ ...baseT, id: "", name: "", mine: false }) !== JSON.stringify({ ...theme, id: "", name: "", mine: false });
  const v = (voices || []).find((x) => x.id === voiceId);
  const pick = (t: ShortsTheme) => { setBase(t.id); setOpen(""); onTheme(t, true); };
  const saveTo = (i: number) => {
    const t: ShortsTheme = { ...theme, voice: voiceOn && voiceId ? voiceId : theme.voice, id: `my${i + 1}-${Date.now().toString(36)}`, name: `내 테마 ${i + 1}`, mine: true };
    const next = mine.slice();
    next[i] = t;
    setMine(next);
    saveMyThemes(next);
    setBase(t.id);
    setOpen("");
    onTheme(t, false);
  };
  const remove = (i: number) => {
    if (!window.confirm(`내 테마 ${i + 1}을(를) 지울까요?`)) return;
    const next = mine.slice();
    next[i] = null;
    setMine(next);
    saveMyThemes(next);
    if (base === mine[i]?.id) pick(bases[0]);
  };

  const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderTop: `1px solid ${C.line2}` };
  const label: React.CSSProperties = { width: 54, flexShrink: 0, fontSize: 13.5, fontWeight: 800, color: C.sub, display: "flex", alignItems: "center", gap: 5 };
  const change = (on: boolean): React.CSSProperties => ({ marginLeft: "auto", height: 32, padding: "0 12px", borderRadius: 6, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent", color: on ? C.text : C.sub, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" });
  const W = 132; // 테마 칸 폭 (2026-11-05 사장님: "테마 너무 작아 · 크게") — 기본 5개 한 줄, 내 테마 3개 아랫줄

  return (
    <div style={{ fontFamily: FONT }}>
      {/* 테마 칸 — 누르면 성우·자막·음악까지 한 번에 */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${SHORTS_THEMES.length}, ${W}px)`, columnGap: 12, rowGap: 10, justifyContent: "space-between", paddingBottom: 4 }}>
        {tiles.flatMap((t, i) => [
          i === SHORTS_THEMES.length ? <div key="myhead" style={{ gridColumn: "1 / -1", fontSize: 13.5, fontWeight: 800, color: C.sub, marginTop: 6 }}>내 테마 <span style={{ fontWeight: 600, color: C.dim, fontSize: 12.5 }}>— 아래에서 고친 뒤 [내 테마로 저장] (3개까지)</span></div> : null,
          (() => {
          if (!t) {
            const n = i - SHORTS_THEMES.length + 1;
            return (
              <div key={`empty${i}`} title="아래에서 성우·자막·음악을 바꾼 뒤 [내 테마로 저장]을 누르면 여기에 들어가요" style={{ width: W }}>
                <div style={{ width: W, height: mine.some(Boolean) ? Math.round((W * 16) / 9) : 84, borderRadius: 8, border: `1.5px dashed ${C.line2}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, color: C.dim, fontSize: 11.5, textAlign: "center", lineHeight: 1.4 }}>
                  <Icon name="plus" size={22} />비어 있음
                </div>
                <div style={{ fontSize: 12, color: C.dim, textAlign: "center", marginTop: 5 }}>내 테마 {n}</div>
              </div>
            );
          }
          const on = base === t.id;
          return (
            <div key={t.id} style={{ width: W, position: "relative" }}>
              <button type="button" disabled={disabled} onClick={() => pick(t)} title={`${t.name} — 누르면 성우·자막·음악까지 이 테마로`}
                style={{ display: "block", padding: 0, border: `2.5px solid ${on ? C.accent : "transparent"}`, borderRadius: 10, background: "transparent", cursor: "pointer" }}>
                <Mini t={t} photo={photo} place={place} sample={sample} w={W - 5} />
              </button>
              {on && <span style={{ position: "absolute", left: 8, top: 8, width: 24, height: 24, borderRadius: 12, background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={13} /></span>}
              <button type="button" onClick={() => play(t.music)} title={`음악 듣기 — ${t.musicName}`}
                style={{ position: "absolute", right: 8, top: 8, width: 28, height: 28, borderRadius: 14, border: 0, background: "rgba(0,0,0,0.55)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                {playing === t.music ? <span style={{ width: 7, height: 7, background: "#fff" }} /> : <Icon name="play" size={11} />}
              </button>
              {t.mine && <button type="button" onClick={() => remove(i - SHORTS_THEMES.length)} title="내 테마 지우기"
                style={{ position: "absolute", right: 6, bottom: 30, width: 20, height: 20, borderRadius: 10, border: 0, background: "rgba(0,0,0,0.55)", color: "#fff", cursor: "pointer", fontSize: 12, lineHeight: "20px", padding: 0 }}>×</button>}
              <div style={{ fontSize: 13.5, fontWeight: on ? 800 : 600, color: on ? C.text : C.sub, textAlign: "center", marginTop: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
            </div>
          );
          })(),
        ])}
      </div>

      {/* 고른 테마의 세부 — 줄마다 [바꾸기] */}
      <div style={{ marginTop: 12, borderRadius: 8, border: `1px solid ${C.line2}`, background: C.card }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px" }}>
          <b style={{ fontSize: 14.5 }}>{theme.name}</b>
          {changed && <span style={{ fontSize: 12, fontWeight: 800, color: "#F59E0B", border: "1px solid #F59E0B", borderRadius: 4, padding: "0 5px" }}>내가 고침</span>}
          <span style={{ fontSize: 12.5, color: C.dim }}>세부는 아래에서 바꿀 수 있어요</span>
          <button type="button" disabled={disabled} onClick={() => setOpen(open === "save" ? "" : "save")} style={{ ...change(open === "save"), color: C.accent, borderColor: C.accent }}>내 테마로 저장</button>
        </div>
        {open === "save" && (
          <div style={{ display: "flex", gap: 8, padding: "0 12px 12px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: C.sub }}>어느 칸에 저장할까요?</span>
            {mine.map((m, i) => <button key={i} type="button" onClick={() => { if (!m || window.confirm(`내 테마 ${i + 1}을(를) 지금 모양으로 바꿀까요?`)) saveTo(i); }} style={change(false)}>내 테마 {i + 1}{m ? " (바꾸기)" : ""}</button>)}
          </div>
        )}

        {/* 성우 */}
        <div style={row}>
          <span style={label}><Icon name="voice" size={15} />성우</span>
          {voiceOn ? (v ? <><VoiceAvatar seed={v.id} gender={v.gender} age={v.age} name={koVoice(v.name).name} size={34} /><span style={{ fontSize: 14 }}><b>{koVoice(v.name).name}</b><span style={{ color: C.sub, fontSize: 12.5, marginLeft: 6 }}>{koVoice(v.name).desc}</span></span>
              {v.preview && <button type="button" onClick={() => play(v.preview, VOICE_RATE)} title="성우 목소리 미리 듣기 (1.25배)" style={{ height: 28, padding: "0 10px", borderRadius: 14, border: `1px solid ${playing === v.preview ? C.accent : C.line2}`, background: playing === v.preview ? C.accent : "transparent", color: C.text, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, fontFamily: FONT }}>
                {playing === v.preview ? <span style={{ width: 8, height: 8, background: "#fff" }} /> : <Icon name="play" size={12} />}미리 듣기</button>}
              <span style={{ fontSize: 12, color: C.dim }}>빠르기 1.25배</span></>
            : <span style={{ fontSize: 13.5, color: C.dim }}>{voices === null ? "성우 불러오는 중…" : "성우를 골라 주세요"}</span>)
            : <span style={{ fontSize: 13.5, color: C.sub }}>목소리 없이 — 자막과 음악만</span>}
          <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button type="button" disabled={disabled} onClick={() => onVoiceOn(!voiceOn)} style={{ ...change(!voiceOn), marginLeft: 0 }}>{voiceOn ? "목소리 없이" : "목소리 넣기"}</button>
            {voiceOn && <button type="button" disabled={disabled || !voices?.length} onClick={onPickVoice} style={{ ...change(false), marginLeft: 0 }}>바꾸기</button>}
          </span>
        </div>

        {/* 자막 */}
        <div style={row}>
          <span style={label}><Icon name="text" size={15} />자막</span>
          <span style={{ padding: "3px 10px", borderRadius: 4, background: theme.sub.bg ? hexA(theme.sub.bgColor || "#000", theme.sub.bgOpacity ?? 0.62) : "#3a3f4b", fontFamily: fontCss(theme.sub.font), fontWeight: 800, fontSize: 16, color: theme.sub.color || "#fff", ...stroke(theme.sub, 16) }}>바로 입주 가능해요</span>
          <button type="button" disabled={disabled} onClick={() => setOpen(open === "sub" ? "" : "sub")} style={change(open === "sub")}>{open === "sub" ? "닫기" : "바꾸기"}</button>
        </div>
        {open === "sub" && (
          <div style={{ padding: "4px 12px 12px", maxHeight: 260, overflowY: "auto" }}>
            <SubPresetGrid value={theme.sub} groups={BASIC_GROUPS} sample="바로 입주" onPick={(look) => onTheme({ ...theme, sub: { ...look } }, false)} />
          </div>
        )}

        {/* 음악 */}
        <div style={row}>
          <span style={label}><Icon name="music" size={15} />음악</span>
          <span style={{ fontSize: 14 }}>{theme.musicName || "없음"}</span>
          {theme.music && <button type="button" onClick={() => play(theme.music)} title="듣기" style={{ width: 28, height: 28, borderRadius: 14, border: `1px solid ${C.line2}`, background: playing === theme.music ? C.accent : "transparent", color: C.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
            {playing === theme.music ? <span style={{ width: 8, height: 8, background: "#fff" }} /> : <Icon name="play" size={12} />}</button>}
          <button type="button" disabled={disabled} onClick={() => setOpen(open === "music" ? "" : "music")} style={change(open === "music")}>{open === "music" ? "닫기" : "바꾸기"}</button>
        </div>
        {open === "music" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, padding: "4px 12px 12px" }}>
            {[...SHORTS_MUSIC, { url: "", name: "음악 없이" }].map((m) => {
              const on = theme.music === m.url;
              return (
                <div key={m.url || "none"} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent" }}>
                  {m.url ? <button type="button" onClick={() => play(m.url)} title="듣기" style={{ width: 26, height: 26, flexShrink: 0, borderRadius: 13, border: `1px solid ${C.line2}`, background: playing === m.url ? C.accent : "transparent", color: C.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                    {playing === m.url ? <span style={{ width: 7, height: 7, background: "#fff" }} /> : <Icon name="play" size={11} />}</button> : <span style={{ width: 26 }} />}
                  <button type="button" onClick={() => onTheme({ ...theme, music: m.url, musicName: m.url ? m.name : "" }, false)} style={{ flex: 1, textAlign: "left", border: 0, background: "transparent", color: on ? C.text : C.sub, fontWeight: on ? 800 : 600, fontSize: 13.5, fontFamily: FONT, cursor: "pointer" }}>{m.name}</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
