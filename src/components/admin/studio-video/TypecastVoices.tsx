"use client";

// AI 목소리 창 › [타입캐스트] · [일레븐랩스] 탭 — 회원 자기 키로 그 회사 성우를 쓴다 (2026-10-19 사장님: 자기 키 방식)
//  키가 없으면: 받는 법 + 키 넣는 칸 (키는 이 PC 에만, 공실뉴스 서버로 보내지 않음)
//  키가 있으면: 성우 카드 (이름 · 성별 · 나이 · 쓰임새 · ▶ 견본 · #타입캐스트API) + 감정(말투)
import React, { useEffect, useRef, useState } from "react";
import type { TypecastVoice } from "./types";
import { errText, videoBridge } from "./types";
import { addExtraVoices } from "@/lib/studio-video/voices";
import { Btn, C, FONT, Icon, input } from "./ui";
import { ElevenDetail } from "./ElevenDetail";

export const TC_EMOTIONS: [string, string][] = [
  ["smart", "스마트 (추천)"], ["normal", "보통"], ["happy", "기쁨"], ["sad", "슬픔"], ["angry", "화남"], ["whisper", "속삭임"], ["toneup", "톤 업"], ["tonedown", "톤 다운"],
];
/* ── 목소리 즐겨찾기 — 이 PC 에 (Gemini · 타입캐스트 · 일레븐랩스 · 내 목소리 모두, 2026-10-19 사장님) ── */
const FAV_KEY = "gsv-voice-fav";
const readFav = (): string[] => {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch { return []; }
};
export function useVoiceFavs(): [string[], (id: string) => void] {
  const [favs, setFavs] = useState<string[]>(readFav);
  useEffect(() => {
    const on = () => setFavs(readFav());
    window.addEventListener("gsv-voice-fav", on);
    return () => window.removeEventListener("gsv-voice-fav", on);
  }, []);
  const toggle = (id: string) => {
    const cur = readFav();
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur];
    try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch {}
    window.dispatchEvent(new Event("gsv-voice-fav"));
  };
  return [favs, toggle];
}
/** 카드 오른쪽 위 ☆ 단추 */
export function FavStar({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onToggle(); }} title={on ? "즐겨찾기 빼기" : "즐겨찾기"}
      style={{ width: 32, height: 32, flexShrink: 0, border: 0, borderRadius: 6, background: "transparent", color: on ? "#facc15" : C.dim, fontSize: 20, lineHeight: 1, cursor: "pointer" }}>{on ? "★" : "☆"}</button>
  );
}

export const EL_EMOTIONS: [string, string][] = [["normal", "보통"], ["calm", "차분하게"], ["lively", "생생하게"]];
const GENDER: Record<string, string> = { female: "여성", male: "남성" };
const AGE: Record<string, string> = { child: "어린이", teenager: "10대", young_adult: "청년", middle_age: "중년", elder: "노년" };
const nice = (map: Record<string, string>, v: string) => map[String(v).toLowerCase()] || v;

/** 일레븐랩스 표시 */
export function ElevenMark({ size = 14 }: { size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: 3, background: "#111", border: "1px solid #555", color: "#fff", fontSize: size * 0.55, fontWeight: 900, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: FONT, letterSpacing: -0.5 }}>11</span>
  );
}

/** 타입캐스트 표시 */
export function TypecastMark({ size = 14 }: { size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: 3, background: "#6C5CE7", color: "#fff", fontSize: size * 0.7, fontWeight: 900, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: FONT }}>T</span>
  );
}

type Prov = "tc" | "el";
const INFO: Record<Prov, { name: string; Mark: (p: { size?: number }) => React.ReactElement; keyUrl: string; tag: string; emotions: [string, string][]; about: React.ReactNode; steps: React.ReactNode; note: string; color: string }> = {
  tc: {
    name: "타입캐스트", Mark: TypecastMark, keyUrl: "https://studio.typecast.ai/developers/api", tag: "#타입캐스트API", emotions: TC_EMOTIONS, color: "#b4a7ff",
    about: <>타입캐스트는 한국어가 자연스러운 AI 성우예요. <b style={{ color: C.text }}>내 타입캐스트 API 키</b>를 넣으면 여기서 바로 쓸 수 있어요.<br />요금(크레딧)은 내 타입캐스트 요금제에서 빠져요. 무료 요금제로도 시작할 수 있어요.</>,
    steps: <>① 아래 [키 받으러 가기]를 눌러 타입캐스트에 로그인<br />② API 콘솔에서 새 키 만들기 → 키 복사<br />③ 아래 칸에 붙여 넣고 [연결하기]<br /><span style={{ color: C.dim, fontSize: 13 }}>웹 스튜디오 요금제와 API 요금제는 따로예요. API 요금제(무료 포함)가 있어야 해요.</span></>,
    note: "상업적 사용 조건은 내 타입캐스트 요금제를 따라요.",
  },
  el: {
    name: "일레븐랩스", Mark: ElevenMark, keyUrl: "https://elevenlabs.io/app/settings/api-keys", tag: "#일레븐랩스API", emotions: EL_EMOTIONS, color: "#e5e7eb",
    about: <>일레븐랩스는 목소리 품질이 뛰어난 AI 성우예요. <b style={{ color: C.text }}>내 일레븐랩스 API 키</b>를 넣으면 내 계정의 목소리를 여기서 쓸 수 있어요.<br />한국어 목소리는 일레븐랩스 [보이스 라이브러리]에서 찾아 <b style={{ color: C.text }}>내 목소리에 추가</b>하면 여기 나와요.</>,
    steps: <>① 아래 [키 받으러 가기]를 눌러 일레븐랩스에 로그인<br />② API Keys에서 새 키 만들기 — 권한: <b>Text to Speech</b>, <b>Voices 읽기</b> 켜기 → 키 복사<br />③ 아래 칸에 붙여 넣고 [연결하기]<br /><span style={{ color: C.dim, fontSize: 13 }}>무료 요금제는 상업적 사용이 제한돼요 (일레븐랩스 약관을 확인해 주세요).</span></>,
    note: "상업적 사용 조건은 내 일레븐랩스 요금제를 따라요.",
  },
};

export function TypecastTab(p: { id: string; onPick: (id: string) => void; emotion: string; onEmotion: (e: string) => void }) {
  return <ProviderTab provider="tc" {...p} />;
}
export function ElevenTab(p: { id: string; onPick: (id: string) => void; emotion: string; onEmotion: (e: string) => void }) {
  return <ProviderTab provider="el" {...p} />;
}

function ProviderTab({ provider, id, onPick, emotion, onEmotion }: { provider: Prov; id: string; onPick: (id: string) => void; emotion: string; onEmotion: (e: string) => void }) {
  const b = videoBridge();
  const tc = provider === "tc" ? b?.typecast : b?.eleven;
  const info = INFO[provider];
  const { Mark } = info;
  // 이 회사에 없는 말투면 그 회사 기본으로
  useEffect(() => {
    if (!info.emotions.some(([k]) => k === emotion) && !(provider === "el" && emotion.startsWith("x:"))) onEmotion(info.emotions[0][0]); // x: = 일레븐랩스 세부 설정
  }, [provider]); // eslint-disable-line react-hooks/exhaustive-deps
  const [st, setSt] = useState<{ has: boolean; masked: string; count: number } | null>(null);
  const [list, setList] = useState<TypecastVoice[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [g, setG] = useState("");
  const [q, setQ] = useState("");
  const [editKey, setEditKey] = useState(false);
  const [playing, setPlaying] = useState("");
  const audio = useRef<HTMLAudioElement | null>(null);
  const [favs, toggleFav] = useVoiceFavs();

  const load = async (refresh = false) => {
    if (!tc) return;
    const s = await tc.status();
    setSt(s);
    if (s.has) {
      const v = await tc.voices(refresh);
      setList(v);
      addExtraVoices(v.map((x) => ({ id: x.id, name: x.name, kind: `${info.name} 성우` })));
    }
  };
  useEffect(() => {
    load().catch((e) => setErr(errText(e)));
    return () => audio.current?.pause();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const connect = async () => {
    if (!tc) return;
    setErr("");
    setBusy("키를 확인하는 중…");
    try {
      await tc.setKey(draft.trim());
      setDraft("");
      setEditKey(false);
      await load(true);
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy("");
    }
  };
  const play = (v: TypecastVoice) => {
    audio.current?.pause();
    if (playing === v.id) return setPlaying("");
    if (!v.preview) return setErr("이 성우는 견본이 없어요.");
    const a = new Audio(v.preview);
    a.onended = () => setPlaying("");
    a.onerror = () => { setPlaying(""); setErr("견본을 틀지 못했어요."); };
    audio.current = a;
    setPlaying(v.id);
    a.play().catch(() => setPlaying(""));
  };

  if (!tc) {
    return <div style={{ padding: 24, fontSize: 15, color: C.sub, lineHeight: 1.7 }}>{info.name} 성우는 공실뉴스 스튜디오 앱을 새 버전으로 업데이트하면 쓸 수 있어요.</div>;
  }
  const chip = (on: boolean): React.CSSProperties => ({ height: 34, padding: "0 14px", borderRadius: 17, border: `1px solid ${on ? C.accent : C.line2}`, background: on ? C.accentDim : "transparent", color: on ? C.text : C.sub, fontSize: 14, fontWeight: 700, fontFamily: FONT, cursor: "pointer" });

  // 키 넣기 (처음 · 키 바꾸기)
  if (st && (!st.has || editKey)) {
    return (
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "22px 26px", display: "flex", flexDirection: "column", gap: 16, fontFamily: FONT }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 20, fontWeight: 800 }}><Mark size={22} />{info.name} 성우 연결</div>
        <div style={{ fontSize: 15, color: C.sub, lineHeight: 1.75 }}>{info.about}</div>
        <div style={{ padding: "14px 16px", borderRadius: 8, background: C.card, border: `1px solid ${C.line2}`, fontSize: 14.5, lineHeight: 1.9 }}>
          <b>키 받는 법</b><br />
          {info.steps}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={() => window.open(info.keyUrl, "_blank")}><Icon name="export" size={15} />키 받으러 가기</Btn>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="password" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`${info.name} API 키 붙여 넣기`} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter" && draft.trim()) void connect(); }}
            style={{ ...input, flex: 1, border: `2px solid ${C.accent}` }} autoFocus />
          <Btn primary disabled={!draft.trim() || Boolean(busy)} onClick={() => void connect()}>{busy ? "확인 중…" : "연결하기"}</Btn>
          {editKey && <Btn onClick={() => { setEditKey(false); setDraft(""); }}>그만</Btn>}
        </div>
        <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.6 }}>키는 이 PC 에만 잠가서 저장해요. 공실뉴스 서버로 보내지 않아요. {info.note}</div>
        {err && <div style={{ fontSize: 14.5, color: C.danger }}>{err}</div>}
      </div>
    );
  }
  if (!st) return <div style={{ padding: 24, color: C.sub }}>불러오는 중…</div>;

  const shown = list.filter((v) => (!g || String(v.gender).toLowerCase() === g) && (!q || v.name.includes(q) || v.useCases.join(" ").toLowerCase().includes(q.toLowerCase())));
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", fontFamily: FONT }}>
      {/* 연결 상태 · 감정 · 거르기 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${C.line2}`, flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 800, color: "#6ee7b7" }}><Mark />{info.name} 연결됨</span>
        <span style={{ fontSize: 13, color: C.dim }}>키 {st.masked}</span>
        <Btn small onClick={() => setEditKey(true)}>키 바꾸기</Btn>
        <Btn small onClick={async () => { await tc.clear(); setList([]); await load(); }}>연결 끊기</Btn>
        <Btn small onClick={() => { setBusy("목록 새로 받는 중…"); load(true).catch((e) => setErr(errText(e))).finally(() => setBusy("")); }}>{busy || "목록 새로"}</Btn>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px 0", flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, fontWeight: 800, marginRight: 4 }}>말투</span>
        {info.emotions.map(([k, t]) => <button key={k} type="button" onClick={() => onEmotion(k)} style={chip(emotion === k)} title={k === "smart" ? "앞뒤 문장을 보고 알아서 말투를 맞춰요" : undefined}>{t}</button>)}
        {provider === "el" && emotion.startsWith("x:") && <span style={{ ...chip(true), display: "inline-flex", alignItems: "center" }}>세부 설정</span>}
      </div>
      {provider === "el" && <ElevenDetail voiceId={id} emotion={emotion} onEmotion={onEmotion} />}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", flexWrap: "wrap" }}>
        {[["", "모두"], ["female", "여성"], ["male", "남성"]].map(([k, t]) => <button key={k} type="button" onClick={() => setG(k)} style={chip(g === k)}>{t}</button>)}
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.stopPropagation()} placeholder="이름·쓰임새로 찾기" style={{ ...input, height: 34, width: 200, marginLeft: "auto", fontSize: 14 }} />
      </div>
      {err && <div style={{ padding: "0 16px 6px", fontSize: 14, color: C.danger }}>{err}</div>}
      <div style={{ padding: "0 16px 6px", fontSize: 14, color: C.sub }}>성우 <b style={{ color: C.text }}>{shown.length}</b>명</div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 16px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10, alignContent: "start" }}>
        {shown.map((v) => (
          <div key={v.id} onClick={() => onPick(v.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 8, border: `${id === v.id ? 2 : 1}px solid ${id === v.id ? C.accent : C.line2}`, background: id === v.id ? C.accentDim : C.card, cursor: "pointer" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", flexShrink: 0, background: "#3b3363", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800 }}>{v.name.slice(0, 1)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 17, fontWeight: 800 }}>{v.name}</span>
                {v.korean && <span style={{ fontSize: 12, fontWeight: 800, color: "#6ee7b7", border: "1px solid #2f6b55", borderRadius: 4, padding: "0 5px" }}>한국어</span>}
                {(v.gender || v.age) && <span style={{ fontSize: 12.5, fontWeight: 700, color: C.sub, border: `1px solid ${C.line2}`, borderRadius: 4, padding: "1px 6px" }}>{[nice(GENDER, v.gender), nice(AGE, v.age)].filter(Boolean).join(" · ")}</span>}
              </div>
              {v.useCases.length > 0 && <div style={{ fontSize: 13, color: C.sub, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.useCases.slice(0, 4).map((t) => `#${t}`).join("  ")}</div>}
              <div title={`이 목소리는 내 ${info.name} API 키로 만들어요`} style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4, fontSize: 13, fontWeight: 700, color: info.color }}><Mark size={13} />{info.tag}</div>
            </div>
            <FavStar on={favs.includes(v.id)} onToggle={() => toggleFav(v.id)} />
            <button type="button" onClick={(e) => { e.stopPropagation(); onPick(v.id); play(v); }} title={playing === v.id ? "멈추기" : "견본 듣기"}
              style={{ width: 40, height: 40, flexShrink: 0, borderRadius: "50%", border: `1px solid ${playing === v.id ? C.accent : C.line2}`, background: playing === v.id ? C.accent : "transparent", color: C.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {playing === v.id ? <span style={{ width: 11, height: 11, background: "#fff", borderRadius: 2 }} /> : <Icon name="play" size={16} />}
            </button>
          </div>
        ))}
        {!shown.length && <div style={{ fontSize: 14.5, color: C.sub, padding: "16px 0" }}>{list.length ? "맞는 성우가 없어요." : provider === "el" ? "내 일레븐랩스 목소리가 없어요. 일레븐랩스 보이스 라이브러리에서 목소리를 추가한 뒤 [목록 새로]를 눌러 보세요." : "성우 목록이 비어 있어요. [목록 새로]를 눌러 보세요."}</div>}
      </div>
    </div>
  );
}
