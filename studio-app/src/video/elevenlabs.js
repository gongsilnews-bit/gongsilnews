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

/** 성우 목록 권한이 없을 때 쓰는 일레븐랩스 기본(공개) 성우 — 다국어 모델이라 한국어도 읽는다 */
const DEFAULT_VOICES = [
  ["21m00Tcm4TlvDq8ikWAM", "Rachel", "female"], ["EXAVITQu4vr4xnSDxMaL", "Sarah", "female"], ["MF3mGyEYCl7XYWbV9V6O", "Elli", "female"], ["AZnzlk1XvdvUeBnXmlld", "Domi", "female"],
  ["pNInz6obpgDQGcFmaJgB", "Adam", "male"], ["ErXwobaYiN019PkySvjV", "Antoni", "male"], ["TxGEqnHWrfWFTfGW9XjX", "Josh", "male"], ["VR6AewLTigWG4xSOukaG", "Arnold", "male"], ["yoZ06aMxZJJ28mfd3POQ", "Sam", "male"],
].map(([id, name, gender]) => ({ id: PRE + id, name, gender, age: "", useCases: ["기본 성우"], preview: "", emotions: [], type: "premade", korean: false }));

function status() {
  const k = key();
  const o = read();
  return { has: Boolean(k), masked: masked(k), count: (o.voices || []).length, at: o.at || 0 };
}
async function setKey(k) {
  const kk = String(k || "").trim();
  if (!kk) throw new Error("키를 넣어 주세요.");
  // 성우 목록 읽기 권한이 없는 키도 연결 — 일레븐랩스 기본 성우로 (말하기만 되면 쓸 수 있다, 2026-10-23 사장님: 안 박혀)
  let voices;
  try {
    voices = await fetchVoices(kk);
  } catch (e) {
    if (!/권한이 모자라요/.test(String(e && e.message))) throw e;
    voices = DEFAULT_VOICES;
    log.warn("[일레븐랩스] 성우 목록 권한이 없는 키 — 기본 성우로 연결");
  }
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
/**
 * 세부 설정 (2026-10-20 사장님: "일레븐랩스 세부 설정 싹 다") — 말투 자리에 "x:" + JSON 으로 온다 (말투처럼 캐시 열쇠에 들어가서 바꾸면 새로 만든다)
 *  { m: "v2"|"v3"|"flash", st: 안정감, si: 닮은 정도, sy: 표현 과장, sp: 빠르기 0.7~1.2, bo: 스피커 부스트 }
 *  v3 는 감정 태그([신나게]·[속삭이며]…)를 읽고, 안정감은 0 · 0.5 · 1 세 가지만 받는다
 */
const MODELS = { v2: "eleven_multilingual_v2", v3: "eleven_v3", flash: "eleven_flash_v2_5" };
const custom = (e) => {
  if (!String(e || "").startsWith("x:")) return null;
  try { return JSON.parse(String(e).slice(2)); } catch { return null; }
};
/** 감정 태그 — 한글로 쓰면 일레븐랩스 영어 태그로 (v3), 다른 모델·성우는 태그를 빼고 읽는다 */
const TAGS = { 신나게: "excited", 속삭이며: "whispers", 웃으며: "laughs", 한숨: "sighs", "궁금한 듯": "curious", 소리치며: "shouts", 장난스럽게: "mischievously", 울먹이며: "crying", 비꼬듯: "sarcastic", 헛기침: "clears throat", 차분하게: "calm", 진지하게: "serious" };
const tagsToEn = (t) => String(t).replace(/\[([^\]]{1,20})\]/g, (m, k) => `[${TAGS[k.trim()] || k.trim()}]`);
const stripTags = (t) => String(t).replace(/\[[^\]]{1,20}\]\s*/g, "").trim();
/** 문장 하나 → out (wav 24kHz — 모든 요금제에서 된다) */
async function say(text, out, { voiceId, emotion = "normal", prev = "", next = "" } = {}) {
  const k = key();
  if (!k) throw new Error("일레븐랩스 키가 없어요. AI 목소리 › 일레븐랩스에서 키를 넣어 주세요.");
  const id = String(voiceId).replace(/^el_/, "");
  const r = await fetch(`${API}/v1/text-to-speech/${encodeURIComponent(id)}?output_format=wav_24000`, {
    method: "POST",
    headers: { "xi-api-key": k, "Content-Type": "application/json" },
    body: JSON.stringify((() => {
      const cu = custom(emotion);
      const m = (cu && MODELS[cu.m]) || MODEL;
      const v3 = m === MODELS.v3;
      const num = (v, d) => (Number.isFinite(Number(v)) ? Math.max(0, Math.min(1, Number(v))) : d);
      const vs = cu
        ? {
            stability: v3 ? [0, 0.5, 1].reduce((a, b) => (Math.abs(b - num(cu.st, 0.5)) < Math.abs(a - num(cu.st, 0.5)) ? b : a)) : num(cu.st, 0.5),
            similarity_boost: num(cu.si, 0.75),
            style: num(cu.sy, 0),
            use_speaker_boost: cu.bo !== false,
            ...(Number(cu.sp) && Math.abs(Number(cu.sp) - 1) > 0.001 ? { speed: Math.max(0.7, Math.min(1.2, Number(cu.sp))) } : {}),
          }
        : { ...(STYLE[emotion] || STYLE.normal), use_speaker_boost: true };
      return {
        text: v3 ? tagsToEn(text) : stripTags(text),
        model_id: m,
        voice_settings: vs,
        // 앞뒤 문장 (말투 이어지게) — v3 는 받지 않는다
        ...(!v3 && prev ? { previous_text: stripTags(prev).slice(0, 1000) } : {}),
        ...(!v3 && next ? { next_text: stripTags(next).slice(0, 1000) } : {}),
      };
    })()),
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

module.exports = { status, setKey, clear, voices, say, MODEL, TAGS, stripTags };
