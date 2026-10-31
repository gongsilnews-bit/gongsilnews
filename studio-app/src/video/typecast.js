// 타입캐스트 성우 — 회원이 자기 API 키를 넣어 쓴다 (2026-10-19 사장님 결정: 자기 키 방식)
//  - 키는 이 PC 에만 (윈도우 보안 저장소로 잠가서 userData/typecast.json). 공실뉴스 서버로 보내지 않는다
//  - 목소리 만들기는 이 앱이 타입캐스트에 바로 요청한다. 요금(크레딧)은 회원이 타입캐스트에 직접
//  - API: https://typecast.ai/docs (POST /v1/text-to-speech · GET /v3/voices, 머리글 X-API-KEY)
const { app, safeStorage } = require("electron");
const fs = require("fs");
const path = require("path");
const log = require("electron-log/main");

const API = "https://api.typecast.ai";
const MODEL = "ssfm-v30"; // 추천 모델 — 한국어 · 감정(스마트·프리셋)
const store = () => path.join(app.getPath("userData"), "typecast.json");

function read() {
  try {
    return JSON.parse(fs.readFileSync(store(), "utf8"));
  } catch {
    return {};
  }
}
function write(o) {
  fs.mkdirSync(path.dirname(store()), { recursive: true });
  fs.writeFileSync(store(), JSON.stringify(o));
}
function key() {
  const o = read();
  if (!o.key) return "";
  try {
    return o.enc && safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(Buffer.from(o.key, "base64")) : String(o.key);
  } catch {
    return "";
  }
}
const masked = (k) => (k ? `${k.slice(0, 4)}…${k.slice(-4)}` : "");

/** 타입캐스트 오류 → 쉬운 말 */
function errOf(status, body) {
  if (status === 401 || status === 403) return "타입캐스트 키가 맞지 않아요. 키를 다시 확인해 주세요.";
  if (status === 402) return "타입캐스트 크레딧이 모자라요. 타입캐스트에서 요금제를 확인해 주세요.";
  if (status === 429) return "타입캐스트에 요청이 몰렸어요. 잠시 뒤 다시 해 주세요.";
  const m = body && (body.message || (typeof body.detail === "string" ? body.detail : ""));
  return `타입캐스트 오류 (${status})${m ? `: ${m}` : ""}`;
}

/** 성우 목록 → 화면에 쓰기 좋게 */
function shape(list) {
  return (Array.isArray(list) ? list : []).map((v) => {
    const nm = v.voice_name;
    const name = typeof nm === "string" ? nm : (nm && (nm.kor || nm.ko || nm.eng || nm.en)) || v.voice_id;
    const m30 = (v.models || []).find((m) => m.version === MODEL) || (v.models || [])[0];
    return {
      id: String(v.voice_id),
      name: String(name),
      gender: v.gender || "",
      age: v.age || "",
      useCases: Array.isArray(v.use_cases) ? v.use_cases : [],
      preview: v.preview_url || "",
      emotions: (m30 && m30.emotions) || [],
      type: v.voice_type || "",
    };
  });
}
async function fetchVoices(k) {
  const r = await fetch(`${API}/v3/voices?model=${MODEL}`, { headers: { "X-API-KEY": k } });
  const body = await r.json().catch(() => null);
  if (!r.ok) throw new Error(errOf(r.status, body));
  return shape(Array.isArray(body) ? body : body && (body.voices || body.result || body.data));
}

/** 지금 상태 — 키가 있나 · 가린 키 · 성우 수 */
function status() {
  const k = key();
  const o = read();
  return { has: Boolean(k), masked: masked(k), count: (o.voices || []).length, at: o.at || 0 };
}
/** 키 넣기 — 성우 목록을 받아 보며 키가 맞는지 확인하고, 맞으면 잠가서 저장 */
async function setKey(k) {
  const kk = String(k || "").trim();
  if (!kk) throw new Error("키를 넣어 주세요.");
  const voices = await fetchVoices(kk);
  const enc = safeStorage.isEncryptionAvailable();
  write({ key: enc ? safeStorage.encryptString(kk).toString("base64") : kk, enc, voices, at: Date.now() });
  log.info(`[타입캐스트] 키 연결 · 성우 ${voices.length}명`);
  return status();
}
function clear() {
  try { fs.rmSync(store(), { force: true }); } catch {}
  return status();
}
/** 성우 목록 (하루에 한 번 새로) */
async function voices(refresh = false) {
  const o = read();
  const k = key();
  if (!k) return [];
  if (!refresh && o.voices && Date.now() - (o.at || 0) < 24 * 3600e3) return o.voices;
  try {
    const v = await fetchVoices(k);
    write({ ...o, voices: v, at: Date.now() });
    return v;
  } catch (e) {
    if (o.voices) return o.voices; // 연결이 잠깐 안 되면 받아 둔 목록
    throw e;
  }
}

/**
 * 문장 하나를 그 성우로 → out (wav). emotion: "smart"(기본, 앞뒤 문장에 맞춰 말투) 또는 프리셋 (normal·happy·sad·angry·whisper·toneup·tonedown)
 */
async function say(text, out, { voiceId, emotion = "smart", intensity = 1, prev = "", next = "" } = {}) {
  const k = key();
  if (!k) throw new Error("타입캐스트 키가 없어요. AI 목소리 › 타입캐스트에서 키를 넣어 주세요.");
  const prompt = emotion === "smart"
    ? { emotion_type: "smart", ...(prev ? { previous_text: String(prev).slice(0, 2000) } : {}), ...(next ? { next_text: String(next).slice(0, 2000) } : {}) }
    : { emotion_type: "preset", emotion_preset: emotion, emotion_intensity: Math.max(0, Math.min(2, Number(intensity) || 1)) };
  // 몰리면 기다렸다 다시 — 크레딧 부족·키 오류는 바로 멈춘다 (voice-retry.js, 2026-10-31)
  const buf = await require("./voice-retry").fetchAudio("타입캐스트", `${API}/v1/text-to-speech`, {
    method: "POST",
    headers: { "X-API-KEY": k, "Content-Type": "application/json" },
    body: JSON.stringify({ text: String(text).slice(0, 2000), model: MODEL, voice_id: voiceId, language: "kor", prompt, output: { audio_format: "wav" } }),
  }, { errOf, fatal: (status, body) => (status === 429 || status >= 500 ? "" : errOf(status, body)) });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
  return out;
}

module.exports = { status, setKey, clear, voices, say, MODEL };
