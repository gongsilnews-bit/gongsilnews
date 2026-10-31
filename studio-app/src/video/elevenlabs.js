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
  // 몰리면 기다렸다 다시 — 크레딧 부족·키 오류는 바로 멈춘다 (voice-retry.js, 2026-10-31)
  const buf = await require("./voice-retry").fetchAudio("일레븐랩스", `${API}/v1/text-to-speech/${encodeURIComponent(id)}?output_format=wav_24000`, {
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
  }, {
    errOf,
    fatal: (status, body) => (status === 429 || status >= 500 ? (/quota|credits/i.test(JSON.stringify(body || "")) ? errOf(402, body) : "") : errOf(status, body)),
  });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
  return out;
}

/**
 * 인기 한국어 성우 넣기 (2026-10-30 사장님: 보이스 라이브러리에서 찾기 어렵다 — 인기순 30명을 알아서)
 *  보이스 라이브러리(공개 성우)에서 한국어를 사용량 많은 순으로 찾아, 내 목소리 목록에 없는 것만 추가한다.
 *  요금제마다 넣을 수 있는 목소리 수가 정해져 있어서, 자리가 차면 거기서 멈추고 몇 명 넣었는지 알려 준다.
 */
async function addPopularKo(n = 30) {
  const k = key();
  if (!k) throw new Error("일레븐랩스 키를 먼저 넣어 주세요");
  const mine = await fetchVoices(k).catch(() => []);
  const have = new Set(mine.map((v) => String(v.id).replace(PRE, "")));
  const haveName = new Set(mine.map((v) => String(v.name).toLowerCase()));
  const picks = [];
  for (let page = 0; page < 6 && picks.length < n; page++) {
    const u = `${API}/v1/shared-voices?page_size=100&page=${page}&language=ko&sort=usage_character_count_1y`;
    const r = await fetch(u, { headers: { "xi-api-key": k } });
    const body = await r.json().catch(() => null);
    if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? "일레븐랩스 키에 '보이스 라이브러리 보기' 권한이 없어요. 일레븐랩스 › API 키에서 이 키의 Voices 권한을 '쓰기(Write)'로 바꾼 뒤 다시 눌러 주세요." : errOf(r.status, body));
    const list = (body && body.voices) || [];
    for (const v of list) {
      if (picks.length >= n) break;
      if (have.has(v.voice_id) || haveName.has(String(v.name).toLowerCase())) continue;
      picks.push(v);
    }
    if (!body || !body.has_more) break;
  }
  let added = 0, stop = "";
  const names = [];
  for (const v of picks) {
    const r = await fetch(`${API}/v1/voices/add/${encodeURIComponent(v.public_owner_id)}/${encodeURIComponent(v.voice_id)}`, {
      method: "POST", headers: { "xi-api-key": k, "Content-Type": "application/json" }, body: JSON.stringify({ new_name: v.name }),
    });
    const body = await r.json().catch(() => null);
    if (!r.ok) {
      const msg = JSON.stringify(body || {});
      stop = /limit|maximum|slots|quota/i.test(msg) ? "요금제의 목소리 자리가 다 찼어요. 안 쓰는 목소리를 일레븐랩스에서 지우면 더 넣을 수 있어요."
        : r.status === 401 || r.status === 403 ? "일레븐랩스 키에 '목소리 추가' 권한이 없어요. 일레븐랩스 › API 키에서 이 키의 Voices 권한을 '쓰기(Write)'로 바꾼 뒤 다시 눌러 주세요."
        : errOf(r.status, body);
      log.warn("[일레븐랩스] 성우 추가 멈춤", v.name, r.status, msg.slice(0, 200));
      break;
    }
    added++;
    names.push(v.name);
  }
  if (added) await voices(true).catch(() => {});
  return { added, found: picks.length, names, stop };
}

/**
 * 한국어 인기 순위 50 (2026-10-30 사장님: 순위대로 보여 주고 다 넣기) — json2video.com 한국어 AI 목소리 순위(일레븐랩스 사용량 순)에서 가져옴.
 *  [voice_id, 이름, 성별]. 순위가 바뀌면 이 목록만 고친다
 */
const RANK_KO = [
  ["ZJCNdZEjYwkOElxugmW2", "Chang wook", "male"],
  ["PDoCXqBQFGsvfO0hNkEs", "Chris", "male"],
  ["uyVNoMrnUku1dZyVEXwD", "Anna Kim", "female"],
  ["m3gJBS8OofDJfycyA2Ip", "Taehyung", "male"],
  ["z6Kj0hecH20CdetSElRT", "Jennie", "female"],
  ["jB1Cifc2UQbq1gR3wnb0", "Bin", "male"],
  ["4JJwo477JUAx3HV0T7n7", "Yohan Koo", "male"],
  ["1W00IGEmNmwmsDeYy7ag", "KKC", "male"],
  ["AW5wrnG1jVizOYY7R1Oo", "JiYoung", "female"],
  ["ksaI0TCD9BstzEzlxj4q", "Seulki", "female"],
  ["8jHHF8rMqMlg8if2mOUe", "Han", "female"],
  ["YBRudLRm83BV5Mazcr42", "Jason", "male"],
  ["s07IwTCOrCDCaETjUVjx", "Hyun Bin", "male"],
  ["WqVy7827vjE2r3jWvbnP", "Soo hyun", "male"],
  ["CxErO97xpQgQXYmapDKX", "Theo", "male"],
  ["8MwPLtBplylvbrksiBOC", "Chungman", "female"],
  ["FQ3MuLxZh0jHcZmA5vW1", "Do Hyeon", "male"],
  ["iWLjl1zCuqXRkW6494ve", "Jisoo", "female"],
  ["4p0HBzAAGyju0nYfNntV", "Sunny", "female"],
  ["ETPP7D0aZVdEj12Aa7ho", "Selly Han", "female"],
  ["v1jVu1Ky28piIPEJqRrm", "KKC RADIO", "male"],
  ["RU7aSi6lT4uQBXMLgDxK", "TeddyNote", "male"],
  ["nbrxrAz3eYm9NgojrmFK", "Min-joon", "male"],
  ["sf8Bpb1IU97NI9BHSMRf", "Rosa Oh", "female"],
  ["BbsagRO6ohd8MKPS2Ob0", "Jin Geon Song", "male"],
  ["7Nah3cbXKVmGX7gQUuwz", "Joon Park", "male"],
  ["mYk0rAapHek2oTw18z8x", "Salang", "female"],
  ["Lb7qkOn5hF8p7qfCDH8q", "Annie", "female"],
  ["KlstlYt9VVf3zgie2Oht", "Sola", "female"],
  ["pb3lVZVjdFWbkhPKlelB", "Harry Kim", "male"],
  ["K3qo7ugXmpT87FDhLBbN", "Gale", "male"],
  ["WzMnDIgiICcj1oXbUBO0", "샘호트만", "male"],
  ["0mlAtfsvMzFpppUuNWkV", "승현", "male"],
  ["QPFsEL6IBxlT15xfiD6C", "Hana Lee", "female"],
  ["bciERhbhQhAIWwvnQA7H", "Seongmin Yoo", "male"],
  ["Ir7oQcBXWiq4oFGROCfj", "taemin", "male"],
  ["ZNSVYmudV9pOqphY0x8C", "Choi", "male"],
  ["3MTvEr8xCMCC2mL9ujrI", "June", "male"],
  ["1KNqBv4TutQtzSIACsMC", "Harry", "male"],
  ["0oqpliV6dVSr9XomngOW", "Jini", "female"],
  ["U1cJYS4EdbaHmfR7YzHd", "Minho", "male"],
  ["zgDzx5jLLCqEp6Fl7Kl7", "Hanna", "female"],
  ["ZZ4xhVcc83kZBfNIlIIz", "Man Bo", "male"],
  ["MpbDJfQJUYUnp0i1QvOZ", "Hunmin", "male"],
  ["tIXHSlSWOafJawXSV1g4", "Miso Choi", "female"],
  ["fLvpMIGwcTmxzsUF4z1U", "Harry", "male"],
  ["hWXqitL3DEOLD49pgNWR", "Ruach", "female"],
  ["OEaq3WGNtNvFJ5co9mJE", "SangHo", "male"],
  ["F7wT70V3u09d2rY9pNa6", "Yura", "female"],
  ["BaW4Cx7nYOh1XNVQBrK2", "Sejoin", "male"],
];
const libInfo = (v) => ({ owner: v.public_owner_id, preview: v.preview_url || "", age: v.age || "" });
/** 순위 목록 + 견본 소리 · 내 목록에 있는지 — 라이브러리에서 voice_id 로 찾아 둔다 (하루 저장) */
async function rankedKo(refresh = false) {
  const k = key();
  if (!k) return [];
  const o = read();
  let lib = o.rankLib && !refresh && Date.now() - (o.rankAt || 0) < 24 * 3600e3 ? o.rankLib : null;
  if (!lib) {
    lib = {};
    const want = new Set(RANK_KO.map((x) => x[0]));
    try {
      for (let page = 0; page < 4; page++) {
        const r = await fetch(`${API}/v1/shared-voices?page_size=100&page=${page}&language=ko&sort=usage_character_count_1y`, { headers: { "xi-api-key": k } });
        const body = await r.json().catch(() => null);
        if (!r.ok) break;
        for (const v of (body && body.voices) || []) if (want.has(v.voice_id)) lib[v.voice_id] = libInfo(v);
        if (!body || !body.has_more || Object.keys(lib).length >= want.size) break;
      }
      // 못 찾은 것은 이름으로 한 번 더
      for (const [id, name] of RANK_KO) {
        if (lib[id]) continue;
        const r = await fetch(`${API}/v1/shared-voices?page_size=30&search=${encodeURIComponent(name)}`, { headers: { "xi-api-key": k } });
        const body = await r.json().catch(() => null);
        const v = r.ok && body && (body.voices || []).find((x) => x.voice_id === id);
        if (v) lib[id] = libInfo(v);
      }
    } catch (e) {
      log.warn("[일레븐랩스] 순위 성우 찾기", e && e.message);
    }
    write({ ...read(), rankLib: lib, rankAt: Date.now() });
  }
  const mine = new Set((read().voices || []).map((v) => String(v.id).replace(PRE, "")));
  return RANK_KO.map(([id, name, gender], i) => ({ rank: i + 1, id: PRE + id, name, gender, age: (lib[id] && lib[id].age) || "", preview: (lib[id] && lib[id].preview) || "", mine: mine.has(id), found: Boolean(lib[id]) }));
}
/** 순위 성우 넣기 — ids 를 주면 그것만, 없으면 아직 없는 것 모두 (순위 순서대로) */
async function addRanked(ids) {
  const k = key();
  if (!k) throw new Error("일레븐랩스 키를 먼저 넣어 주세요");
  const list = await rankedKo();
  const lib = read().rankLib || {};
  const todo = list.filter((x) => !x.mine && (!ids || ids.includes(x.id)));
  let added = 0, stop = "";
  for (const x of todo) {
    const vid = x.id.replace(PRE, ""), L = lib[vid];
    if (!L || !L.owner) continue;
    const r = await fetch(`${API}/v1/voices/add/${encodeURIComponent(L.owner)}/${encodeURIComponent(vid)}`, {
      method: "POST", headers: { "xi-api-key": k, "Content-Type": "application/json" }, body: JSON.stringify({ new_name: x.name }),
    });
    const body = await r.json().catch(() => null);
    if (!r.ok) {
      const msg = JSON.stringify(body || {});
      stop = /limit|maximum|slots|quota/i.test(msg) ? "요금제의 목소리 자리가 다 찼어요. 안 쓰는 목소리를 일레븐랩스에서 지우면 더 넣을 수 있어요."
        : r.status === 401 || r.status === 403 ? "일레븐랩스 키에 목소리 추가 권한이 없어요. 일레븐랩스 › API 키에서 이 키의 Voices 권한을 쓰기(Write)로 바꾼 뒤 다시 눌러 주세요."
        : errOf(r.status, body);
      log.warn("[일레븐랩스] 순위 성우 넣기 멈춤", x.name, r.status, msg.slice(0, 200));
      break;
    }
    added++;
  }
  if (added) await voices(true).catch(() => {});
  return { added, todo: todo.length, stop };
}

module.exports = { status, setKey, clear, voices, say, addPopularKo, rankedKo, addRanked, MODEL, TAGS, stripTags };
