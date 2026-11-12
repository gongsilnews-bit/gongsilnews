"use client";
/**
 * 웹 동영상studio AI 목소리 — 회원 본인 키 (타입캐스트·일레븐랩스) · 내 목소리 녹음 (2026-11-05 사장님)
 *  - 키는 이 브라우저(localStorage)에만. 공실뉴스 서버로 보내지 않는다 — 브라우저가 그 회사에 바로 요청 (둘 다 CORS 허용 확인)
 *  - 요금(크레딧)은 회원이 그 회사에. 공실뉴스 비용 0
 *  - 만든 목소리는 이 브라우저 안(IndexedDB, webBridge 자료)에 wav 로
 *  앱(studio-app/src/video/typecast.js · elevenlabs.js)과 같은 요청 · 같은 성우 id (tc_ · el_)
 */
import type { TypecastVoice } from "./types";
import { koReadNumbers } from "@/lib/studio-video/koNumber";

const TC_API = "https://api.typecast.ai";
const TC_MODEL = "ssfm-v30";
const EL_API = "https://api.elevenlabs.io";
const EL_MODEL = "eleven_multilingual_v2";
const EL_STYLE: Record<string, { stability: number; similarity_boost: number; style: number }> = {
  // 안정도를 올림 (2026-11-09 사장님: "성우의 말이 씹히는 경우") — 0.5 에서 같은 문장 3번 중 1번 "거래됐던"을 "거래되어 했던"으로 뭉갰다.
  //  0.75 로 5번 모두 정확 (Whisper 받아쓰기로 확인). 밝게도 0.3 → 0.55
  normal: { stability: 0.75, similarity_boost: 0.75, style: 0 },
  calm: { stability: 0.85, similarity_boost: 0.75, style: 0 },
  lively: { stability: 0.55, similarity_boost: 0.75, style: 0.25 },
};

type Kind = "typecast" | "eleven";
const KEY = (k: Kind) => `gs-web-voice-${k}`;
type Saved = { key: string; voices: TypecastVoice[]; at: number };
const read = (k: Kind): Saved | null => { try { return JSON.parse(localStorage.getItem(KEY(k)) || "null"); } catch { return null; } };
const write = (k: Kind, v: Saved | null) => { try { if (v) localStorage.setItem(KEY(k), JSON.stringify(v)); else localStorage.removeItem(KEY(k)); } catch { /* */ } };
const masked = (s: string) => (s ? `${s.slice(0, 4)}…${s.slice(-4)}` : "");
const status = (k: Kind) => { const o = read(k); return { has: Boolean(o?.key), masked: masked(o?.key || ""), count: o?.voices?.length || 0, at: o?.at || 0 }; };

/* ── 타입캐스트 ── */
function tcErr(st: number, body: any) {
  if (st === 401 || st === 403) return "타입캐스트 키가 맞지 않아요. 키를 다시 확인해 주세요.";
  if (st === 402) return "타입캐스트 크레딧이 모자라요. 타입캐스트에서 요금제를 확인해 주세요.";
  if (st === 429) return "타입캐스트에 요청이 몰렸어요. 잠시 뒤 다시 해 주세요.";
  const m = body && (body.message || (typeof body.detail === "string" ? body.detail : ""));
  return `타입캐스트 오류 (${st})${m ? `: ${m}` : ""}`;
}
async function tcVoices(key: string): Promise<TypecastVoice[]> {
  const r = await fetch(`${TC_API}/v3/voices?model=${TC_MODEL}`, { headers: { "X-API-KEY": key } });
  const body = await r.json().catch(() => null);
  if (!r.ok) throw new Error(tcErr(r.status, body));
  const list = Array.isArray(body) ? body : body && (body.voices || body.result || body.data);
  return (Array.isArray(list) ? list : []).map((v: any) => {
    const nm = v.voice_name;
    const name = typeof nm === "string" ? nm : (nm && (nm.kor || nm.ko || nm.eng || nm.en)) || v.voice_id;
    const m30 = (v.models || []).find((m: any) => m.version === TC_MODEL) || (v.models || [])[0];
    return { id: String(v.voice_id), name: String(name), gender: v.gender || "", age: v.age || "", useCases: Array.isArray(v.use_cases) ? v.use_cases : [], preview: v.preview_url || "", emotions: (m30 && m30.emotions) || [], type: v.voice_type || "" } as unknown as TypecastVoice;
  });
}
async function tcSay(text: string, voiceId: string, emotion = "smart", prev = "", next = ""): Promise<Blob> {
  const key = read("typecast")?.key;
  if (!key) throw new Error("타입캐스트 키가 없어요. AI 목소리 › 타입캐스트에서 내 키를 넣어 주세요.");
  // 성우에게만 숫자를 한글로 — 587건 → 오백팔십칠 건. 자막은 그대로 (일레븐랩스 서버와 같은 규칙, 2026-11-12 사장님)
  const prompt = emotion === "smart"
    ? { emotion_type: "smart", ...(prev ? { previous_text: koReadNumbers(prev).slice(0, 2000) } : {}), ...(next ? { next_text: koReadNumbers(next).slice(0, 2000) } : {}) }
    : { emotion_type: "preset", emotion_preset: emotion, emotion_intensity: 1 };
  const r = await fetch(`${TC_API}/v1/text-to-speech`, {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({ text: koReadNumbers(text).slice(0, 2000), model: TC_MODEL, voice_id: voiceId, language: "kor", prompt, output: { audio_format: "wav" } }),
  });
  if (!r.ok) throw new Error(tcErr(r.status, await r.json().catch(() => null)));
  return r.blob();
}

/* ── 일레븐랩스 ── */
function elErr(st: number, body: any) {
  const d = body && body.detail;
  const msg = (d && (d.message || (typeof d === "string" ? d : ""))) || (body && body.message) || "";
  if (st === 401) return /permission|missing/i.test(msg) ? "일레븐랩스 키에 권한이 모자라요. 키를 만들 때 Text to Speech · Voices 읽기 권한을 켜 주세요." : "일레븐랩스 키가 맞지 않아요. 키를 다시 확인해 주세요.";
  if (st === 402 || /quota|credits/i.test(msg)) return "일레븐랩스 크레딧이 모자라요. 일레븐랩스에서 요금제를 확인해 주세요.";
  if (st === 429) return "일레븐랩스에 요청이 몰렸어요. 잠시 뒤 다시 해 주세요.";
  return `일레븐랩스 오류 (${st})${msg ? `: ${msg}` : ""}`;
}
async function elVoices(key: string): Promise<TypecastVoice[]> {
  const out: TypecastVoice[] = [];
  let token = "";
  for (let i = 0; i < 5; i++) {
    const r = await fetch(`${EL_API}/v2/voices?page_size=100${token ? `&next_page_token=${encodeURIComponent(token)}` : ""}`, { headers: { "xi-api-key": key } });
    const body = await r.json().catch(() => null);
    if (!r.ok) throw new Error(elErr(r.status, body));
    for (const v of (body?.voices || []) as any[]) {
      const lb = v.labels || {};
      const langs = (v.verified_languages || []).map((x: any) => x.language).filter(Boolean);
      out.push({ id: `el_${v.voice_id}`, name: String(v.name || v.voice_id), gender: lb.gender || "", age: lb.age || "", useCases: [lb.use_case, lb.descriptive, lb.accent].filter(Boolean), preview: v.preview_url || "", emotions: [], type: v.category || "", korean: langs.includes("ko") || /korean/i.test(`${lb.language || ""} ${lb.accent || ""}`) } as unknown as TypecastVoice);
    }
    if (!body?.has_more || !body?.next_page_token) break;
    token = body.next_page_token;
  }
  return out.sort((a: any, b: any) => Number(b.korean) - Number(a.korean));
}
const stripTags = (t: string) => t.replace(/\[[^\]]{1,20}\]\s*/g, "").trim();
async function elSay(text: string, voiceId: string, emotion = "normal", prev = "", next = ""): Promise<Blob> {
  const key = read("eleven")?.key;
  if (!key) throw new Error("일레븐랩스 키가 없어요. AI 목소리 › 일레븐랩스에서 내 키를 넣어 주세요.");
  const r = await fetch(`${EL_API}/v1/text-to-speech/${encodeURIComponent(voiceId.replace(/^el_/, ""))}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ text: koReadNumbers(stripTags(text)), model_id: EL_MODEL, voice_settings: { ...(EL_STYLE[emotion] || EL_STYLE.normal), use_speaker_boost: true }, ...(prev ? { previous_text: koReadNumbers(stripTags(prev)).slice(0, 1000) } : {}), ...(next ? { next_text: koReadNumbers(stripTags(next)).slice(0, 1000) } : {}) }),
  });
  if (!r.ok) throw new Error(elErr(r.status, await r.json().catch(() => null)));
  return r.blob();
}

/** 키 관리 (편집기 [AI 목소리] 칸이 부른다 — 앱과 같은 모양) */
export function keyApi(kind: Kind) {
  const fetchList = kind === "typecast" ? tcVoices : elVoices;
  return {
    status: async () => status(kind),
    setKey: async (k: string) => {
      const kk = String(k || "").trim();
      if (!kk) throw new Error("키를 넣어 주세요.");
      const voices = await fetchList(kk);
      write(kind, { key: kk, voices, at: Date.now() });
      return status(kind);
    },
    clear: async () => { write(kind, null); return status(kind); },
    voices: async (refresh = false) => {
      const o = read(kind);
      if (!o?.key) return [] as TypecastVoice[];
      if (!refresh && o.voices?.length && Date.now() - o.at < 24 * 3600e3) return o.voices;
      try { const v = await fetchList(o.key); write(kind, { ...o, voices: v, at: Date.now() }); return v; } catch (e) { if (o.voices?.length) return o.voices; throw e; }
    },
  };
}

/* ── 일레븐랩스 — 공실뉴스 계정을 모든 회원이, 포인트로 (2026-11-05 사장님). 서버 /api/studio/video/eleven 이 키를 쥔다 ── */
export type VoiceFree = { limit: number; used: number; left: number } | null;
let elInfo: { voices: TypecastVoice[]; rate: number; balance: number; admin: boolean; free: VoiceFree; at: number } | null = null;
async function elServer(refresh = false, fresh = false) {
  if (!refresh && elInfo && Date.now() - elInfo.at < 5 * 60e3) return elInfo;
  const r = await fetch(`/api/studio/video/eleven${fresh ? "?fresh=1" : ""}`, { credentials: "include", cache: "no-store" }).then((x) => x.json()).catch(() => null);
  if (!r?.success) throw new Error(r?.error || "AI 목소리를 불러오지 못했어요.");
  elInfo = { voices: r.voices || [], rate: Number(r.rate) || 0, balance: Number(r.balance) || 0, admin: Boolean(r.admin), free: r.free || null, at: Date.now() };
  return elInfo;
}
/** 100자당 포인트 · 내 포인트 (화면 안내용) */
export const elPoints = async () => { const i = await elServer(true); return { rate: i.rate, balance: i.balance, admin: i.admin, free: i.free }; };
/** 포인트 안내 한 줄 — "1자 1P · 이번 달 목소리 전용 3,200P 남음 · 내 포인트 6,675P" */
export const pointsLine = (p: { rate: number; balance: number; free?: VoiceFree }) =>
  [p.rate === 100 ? "1자 1P" : `100자당 ${p.rate}P`, p.free ? `이번 달 목소리 전용 ${p.free.left.toLocaleString("ko-KR")}P 남음` : "", `내 포인트 ${p.balance.toLocaleString("ko-KR")}P`].filter(Boolean).join(" · ");
export function elevenApi() {
  const st = async () => { const i = await elServer().catch(() => null); return { has: Boolean(i), masked: "공실뉴스 계정 · 포인트", count: i?.voices.length || 0, at: i?.at || 0 }; };
  return {
    status: st,
    setKey: async () => { throw new Error("일레븐랩스는 공실뉴스 계정으로 쓰고 있어요. 키를 넣지 않아도 포인트로 쓸 수 있어요."); },
    clear: st,
    voices: async (refresh = false) => (await elServer(refresh, refresh)).voices,
    /** 한국어 인기 순위 50 (앱과 같은 순위·이름) — 회원에게는 공실뉴스 계정에 있는 성우만, 최고관리자에게는 없는 것도 [넣기]로 */
    ranked: async (refresh = false) => {
      const [i, r] = await Promise.all([elServer(), fetch(`/api/studio/video/eleven?ranked=1${refresh ? "&fresh=1" : ""}`, { credentials: "include", cache: "no-store" }).then((x) => x.json()).catch(() => null)]);
      const list: { rank: number; id: string; name: string; gender: string; age: string; preview: string; mine: boolean; found: boolean }[] = r?.success ? r.ranked : [];
      return i.admin ? list : list.filter((x) => x.mine);
    },
    addRanked: async (ids?: string[]) => {
      const r = await fetch("/api/studio/video/eleven", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ranked", ids }) }).then((x) => x.json());
      if (!r.success) throw new Error(r.error);
      elInfo = null;
      return { added: Number(r.added) || 0, todo: Number(r.todo) || 0, stop: String(r.stop || "") };
    },
    /** 최고관리자 — 한국어 인기 성우 50명을 공실뉴스 계정에 */
    addPopular: async (n = 50) => {
      const r = await fetch("/api/studio/video/eleven", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "popular", n }) }).then((x) => x.json());
      if (!r.success) throw new Error(r.error);
      elInfo = null;
      return { added: r.added, found: r.found, names: [] as string[], stop: r.stop || "" };
    },
  };
}
/* 포인트 기록 묶음 (2026-11-06 사장님: "1건으로 통합") — 한 번 만들기에 연달아 가는 문장들은 같은 묶음 번호.
   15초 넘게 쉬었다 다시 만들면 새 묶음. 장부는 문장마다 1줄, 포인트 화면이 같은 묶음을 1줄로 합쳐 보여 준다 */
//  새로 만들기와 수정(있던 목소리 고쳐 만들기)은 묶음을 따로 — 기록이 "AI 목소리" / "AI 목소리 수정" 으로 나뉜다
let elBatch: Record<"make" | "edit", { id: string; at: number }> = { make: { id: "", at: 0 }, edit: { id: "", at: 0 } };
function voiceBatch(k: "make" | "edit") {
  const b = elBatch[k];
  if (!b.id || Date.now() - b.at > 15e3) elBatch = { ...elBatch, [k]: { id: crypto.randomUUID(), at: 0 } };
  elBatch[k].at = Date.now();
  return elBatch[k].id;
}
async function elServerSay(text: string, voiceId: string, emotion = "normal", prev = "", next = "", edit = false): Promise<Blob> {
  const k = edit ? "edit" : "make";
  const batch = voiceBatch(k);
  const r = await fetch("/api/studio/video/eleven", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, voiceId, emotion, prev, next, batch, edit }) }).finally(() => { if (elBatch[k].id === batch) elBatch[k].at = Date.now(); });
  if (!r.ok) { const j = await r.json().catch(() => null); throw new Error(j?.error || `AI 목소리를 만들지 못했어요 (${r.status})`); }
  if (elInfo) {
    const left = r.headers.get("X-Points-Left");
    if (left !== null) elInfo.balance = Number(left);
    const fl = r.headers.get("X-Voice-Free-Left");
    if (fl !== null && elInfo.free) elInfo.free = { ...elInfo.free, left: Number(fl), used: elInfo.free.limit - Number(fl) };
  }
  return r.blob();
}

/** 문장 하나 → 소리 Blob (성우 id 앞글자로 회사를 고른다) */
export async function sayBlob(text: string, voiceId: string, o: { emotion?: string; prev?: string; next?: string; edit?: boolean } = {}): Promise<Blob> {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) throw new Error("읽을 문장이 없어요.");
  if (/^el_/.test(voiceId)) return elServerSay(t, voiceId, o.emotion || "normal", o.prev, o.next, Boolean(o.edit)); // 공실뉴스 계정 · 포인트
  if (/^tc_/.test(voiceId)) return tcSay(t, voiceId, o.emotion || "smart", o.prev, o.next);
  throw new Error("[AI 목소리]에서 AI 성우를 고르거나 내 목소리를 녹음해 주세요.");
}

/** 글을 고르게 나눈 단어 시간 (앱 project.js spreadWords 와 같음) */
export function spreadWords(text: string, dur: number) {
  const tokens = String(text).split(/\s+/).filter(Boolean);
  const total = tokens.reduce((a, w) => a + w.length + 0.6, 0) || 1;
  let t = 0;
  return tokens.map((w) => {
    const d = ((w.length + 0.6) / total) * dur;
    const r = { w, s: +t.toFixed(3), e: +(t + d).toFixed(3) };
    t += d;
    return r;
  });
}

/** 소리 길이 (초) */
export function audioDuration(url: string): Promise<number> {
  return new Promise((res) => {
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => res(Number.isFinite(a.duration) ? a.duration : 0);
    a.onerror = () => res(0);
    a.src = url;
  });
}
