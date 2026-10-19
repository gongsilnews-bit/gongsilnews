// 일레븐랩스 성우 — 회원이 자기 API 키를 넣어 쓴다 (2026-10-19 사장님 결정: 자기 키 방식, 타입캐스트 다음)
//  - 키는 이 PC 에만 (윈도우 보안 저장소로 잠가서 userData/elevenlabs.json). 공실뉴스 서버로 보내지 않는다
//  - 목소리는 회원 일레븐랩스 계정의 [내 목소리] 목록 (기본 성우 + 보이스 라이브러리에서 추가한 것)
//  - 우리 프로젝트에서는 성우 id 앞에 "el_" 를 붙여 구분한다 (타입캐스트는 원래 "tc_")
//  - API: https://elevenlabs.io/docs (POST /v1/text-to-speech/{voice_id} · GET /v2/voices, 머리글 xi-api-key)
const { app, safeStorage } = require("electron");
const fs = require("fs");
const path = require("path");
const log = require("electron-log/main");

const API = "https://api.elevenlabs.io";
const MODEL = "eleven_multilingual_v2"; // 한국어를 읽는 다국어 모델
const PRE = "el_";
const store = () => path.join(app.getPath("userData"), "elevenlabs.json");

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

function errOf(status, body) {
  const d = body && body.detail;
  const msg = (d && (d.message || (typeof d === "string" ? d : ""))) || (body && body.message) || "";
  if (status === 401) return /permission|missing/i.test(msg) ? "일레븐랩스 키에 권한이 모자라요. 키를 만들 때 Text to Speech · Voices 읽기 권한을 켜 주세요." : "일레븐랩스 키가 맞지 않아요. 키를 다시 확인해 주세요.";
  if (status === 402 || /quota|credits/i.test(msg)) return "일레븐랩스 크레딧이 모자라요. 일레븐랩스에서 요금제를 확인해 주세요.";
  if (status === 429) return "일레븐랩스에 요청이 몰렸어요. 잠시 뒤 다시 해 주세요.";
  return `일레븐랩스 오류 (${status})${msg ? `: ${msg}` : ""}`;
}

function shape(list) {
  return (Array.isArray(list) ? list : []).map((v) => {
    const lb = v.labels || {};
    const langs = (v.verified_languages || []).map((x) => x.language).filter(Boolean);
    return {
      id: PRE + String(v.voice_id),
      name: String(v.name || v.voice_id),
      gender: lb.gender || "",
      age: lb.age || "",
      useCases: [lb.use_case, lb.descriptive, lb.accent].filter(Boolean),
      preview: v.preview_url || "",
      emotions: [],
      type: v.category || "",
      korean: langs.includes("ko") || /korean/i.test(`${lb.language || ""} ${lb.accent || ""}`),
    };
  });
}
async function fetchVoices(k) {
  const out = [];
  let token = "";
  for (let i = 0; i < 5; i++) {
    const u = `${API}/v2/voices?page_size=100${token ? `&next_page_token=${encodeURIComponent(token)}` : ""}`;
    const r = await fetch(u, { headers: { "xi-api-key": k } });
    const body = await r.json().catch(() => null);
    if (!r.ok) throw new Error(errOf(r.status, body));
    out.push(...shape(body && body.voices));
    if (!body || !body.has_more || !body.next_page_token) break;
    token = body.next_page_token;
  }
  // 한국어로 확인된 목소리를 앞에
  return out.sort((a, b) => Number(b.korean) - Number(a.korean));
}

function status() {
  const k = key();
  const o = read();
  return { has: Boolean(k), masked: masked(k), count: (o.voices || []).length, at: o.at || 0 };
}
async function setKey(k) {
  const kk = String(k || "").trim();
  if (!kk) throw new Error("키를 넣어 주세요.");
  const voices = await fetchVoices(kk);
  const enc = safeStorage.isEncryptionAvailable();
  write({ key: enc ? safeStorage.encryptString(kk).toString("base64") : kk, enc, voices, at: Date.now() });
  log.info(`[일레븐랩스] 키 연결 · 성우 ${voices.length}명`);
  return status();
}
function clear() {
  try { fs.rmSync(store(), { force: true }); } catch {}
  return status();
}
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
    if (o.voices) return o.voices;
    throw e;
  }
}

/** 말투 → 목소리 설정 (일레븐랩스는 감정 이름 대신 안정감·표현 세기로) */
const STYLE = {
  normal: { stability: 0.5, similarity_boost: 0.75, style: 0 },
  calm: { stability: 0.75, similarity_boost: 0.75, style: 0 },
  lively: { stability: 0.3, similarity_boost: 0.75, style: 0.35 },
};
/** 문장 하나 → out (wav 24kHz — 모든 요금제에서 된다) */
async function say(text, out, { voiceId, emotion = "normal", prev = "", next = "" } = {}) {
  const k = key();
  if (!k) throw new Error("일레븐랩스 키가 없어요. AI 목소리 › 일레븐랩스에서 키를 넣어 주세요.");
  const id = String(voiceId).replace(/^el_/, "");
  const r = await fetch(`${API}/v1/text-to-speech/${encodeURIComponent(id)}?output_format=wav_24000`, {
    method: "POST",
    headers: { "xi-api-key": k, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: String(text),
      model_id: MODEL,
      voice_settings: { ...(STYLE[emotion] || STYLE.normal), use_speaker_boost: true },
      ...(prev ? { previous_text: String(prev).slice(0, 1000) } : {}),
      ...(next ? { next_text: String(next).slice(0, 1000) } : {}),
    }),
  });
  if (!r.ok) {
    const body = await r.json().catch(() => null);
    throw new Error(errOf(r.status, body));
  }
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 100) throw new Error("일레븐랩스에서 소리를 받지 못했어요.");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
  return out;
}

module.exports = { status, setKey, clear, voices, say, MODEL };
