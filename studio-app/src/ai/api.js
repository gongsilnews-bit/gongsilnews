// 내 API 키로 — 회원이 자기 ChatGPT(OpenAI)·Claude(Anthropic)·Gemini(Google) API 키를 넣으면 창을 띄우지 않고 바로 주고받는다
// (2026-10-18 회의 결정, 2026-10-19 만듦 — docs/2026-10-18_studio_ai_settings_meeting.md 3-1~3-5)
//  - 키는 이 PC 에만 (윈도우 보안 저장소로 잠가서 userData/ai-keys.json). 공실뉴스 서버로 보내지 않는다
//  - 쓴 만큼 회원 카드로 AI 회사에 직접 결제된다
//  - 수정 요청: API 에는 "대화 창 주소"가 없으므로 대화 내용을 PC 에 저장해 두고(userData/ai-api-chats) 이어서 보낸다.
//    대화 주소 대신 "gsapi://chatgpt/<id>" 를 돌려준다 (ai/index.js providerOfUrl 이 알아본다)
//  - 모델은 키로 볼 수 있는 모델 목록에서 가장 새것을 골라 하루 동안 기억한다 (AI 회사가 새 모델을 내도 앱을 고치지 않게)
const { app, safeStorage } = require("electron");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const log = require("electron-log/main");

const NAME = { chatgpt: "ChatGPT", claude: "Claude", gemini: "Gemini" };
const OPENAI = "https://api.openai.com/v1";
const ANTHROPIC = "https://api.anthropic.com/v1";
const GOOGLE = "https://generativelanguage.googleapis.com/v1beta";

const store = () => path.join(app.getPath("userData"), "ai-keys.json");
const chatDir = () => path.join(app.getPath("userData"), "ai-api-chats");
function read() {
  try {
    return JSON.parse(fs.readFileSync(store(), "utf8")) || {};
  } catch {
    return {};
  }
}
function write(o) {
  fs.mkdirSync(path.dirname(store()), { recursive: true });
  fs.writeFileSync(store(), JSON.stringify(o));
}
function keyOf(id) {
  const o = read()[id];
  if (!o || !o.key) return "";
  try {
    return o.enc && safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(Buffer.from(o.key, "base64")) : String(o.key);
  } catch {
    return "";
  }
}
const masked = (k) => (k ? `${k.slice(0, 5)}…${k.slice(-4)}` : "");

/** 이 AI 키 상태 { has, masked, model, imageModel } */
function status(id) {
  const k = keyOf(id);
  const o = read()[id] || {};
  return { has: Boolean(k), masked: masked(k), model: o.model || "", imageModel: o.imageModel || "" };
}

/* ── 오류를 쉬운 말로 ── */
function errOf(id, status, body) {
  const e = body && (body.error || body);
  const msg = String((e && (e.message || e.type)) || "").slice(0, 160);
  const n = NAME[id];
  if (status === 401 || status === 403 || /api key not valid|invalid.*key|incorrect api key|authentication/i.test(msg))
    return /verif/i.test(msg) ? `${n}: 이 기능은 조직 인증이 필요해요. ${n} 사이트 설정에서 인증(Verify Organization)을 해 주세요.` : `${n} API 키가 맞지 않아요. 키를 다시 확인해 주세요.`;
  if (status === 429 || /quota|rate limit|credit|billing|insufficient/i.test(msg))
    return /quota|credit|billing|insufficient/i.test(msg) ? `${n} 사용 한도(충전 금액)가 모자라요. ${n} 결제 화면에서 충전·한도를 확인해 주세요.` : `${n}에 요청이 몰렸어요. 잠시 뒤 다시 해 주세요.`;
  if (status === 529 || status === 503) return `${n} 서버가 바빠요. 잠시 뒤 다시 해 주세요.`;
  return `${n} 오류 (${status})${msg ? `: ${msg}` : ""}`;
}
async function call(id, url, init, timeoutMs = 5 * 60 * 1000) {
  let r;
  try {
    r = await fetch(url, { ...init, signal: AbortSignal.any([AbortSignal.timeout(timeoutMs), require("../ai-busy").signal()]) }); // [중지]로도 끊는다
  } catch (e) {
    if (require("../ai-busy").isStopped()) throw require("../ai-busy").stopError();
    if (e && (e.name === "TimeoutError" || e.name === "AbortError")) throw new Error(`${NAME[id]} 답을 ${Math.round(timeoutMs / 60000)}분 안에 받지 못했어요. 다시 해 주세요.`);
    throw new Error(`${NAME[id]}에 연결하지 못했어요. 인터넷을 확인해 주세요.`);
  }
  const body = await r.json().catch(() => null);
  if (!r.ok) throw new Error(errOf(id, r.status, body));
  return body;
}
const head = (id, k) =>
  id === "chatgpt" ? { Authorization: `Bearer ${k}`, "Content-Type": "application/json" }
  : id === "claude" ? { "x-api-key": k, "anthropic-version": "2023-06-01", "Content-Type": "application/json" }
  : { "x-goog-api-key": k, "Content-Type": "application/json" };

/* ── 모델 고르기 — 키로 볼 수 있는 목록에서 가장 새것 ── */
const ver = (s) => String(s || "0").split(".").map(Number);
const newer = (a, b) => {
  const x = ver(a), y = ver(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
};
function best(ids, re) {
  let pick = "", v = "";
  for (const id of ids) {
    const m = String(id).match(re);
    if (m && (!pick || newer(m[1], v))) { pick = id; v = m[1]; }
  }
  return pick;
}
async function listModels(id, k) {
  if (id === "chatgpt") {
    const b = await call(id, `${OPENAI}/models`, { headers: head(id, k) }, 30000);
    const ids = (b.data || []).map((x) => x.id);
    return { model: best(ids, /^gpt-(\d+(?:\.\d+)?)$/) || "gpt-4o", imageModel: best(ids, /^gpt-image-(\d+(?:\.\d+)?)$/) || "gpt-image-1" };
  }
  if (id === "claude") {
    const b = await call(id, `${ANTHROPIC}/models?limit=100`, { headers: head(id, k) }, 30000);
    const ids = (b.data || []).map((x) => x.id); // 새것이 먼저 온다
    return { model: ids.find((x) => /sonnet/.test(x)) || ids[0] || "claude-sonnet-4-5", imageModel: "" };
  }
  const b = await call(id, `${GOOGLE}/models?pageSize=1000`, { headers: head(id, k) }, 30000);
  const gen = (b.models || []).filter((x) => (x.supportedGenerationMethods || []).includes("generateContent")).map((x) => String(x.name).replace(/^models\//, ""));
  // 정식판·미리보기판 중 버전이 높은 것 (2026-10-21: 2.5-pro 가 목록엔 있는데 새 사용자에겐 404 — 3.1-pro-preview 를 쓰라고 했다)
  const verOf = (x) => (String(x).match(/^gemini-(\d+(?:\.\d+)?)/) || [])[1] || "0";
  const proS = best(gen, /^gemini-(\d+(?:\.\d+)?)-pro$/), proP = best(gen, /^gemini-(\d+(?:\.\d+)?)-pro-preview(?:-[\d-]+)?$/);
  const pro = proS && proP ? (newer(verOf(proP), verOf(proS)) ? proP : proS) : proS || proP;
  // 글쓰기는 Flash (2026-10-23 사장님: Pro 는 생각이 길어 2분 넘게 걸림) — 정식판·미리보기판 중 새것, 없으면 Pro
  const flS = best(gen, /^gemini-(\d+(?:\.\d+)?)-flash$/), flP = best(gen, /^gemini-(\d+(?:\.\d+)?)-flash-preview(?:-[\d-]+)?$/);
  const flash = flS && flP ? (newer(verOf(flP), verOf(flS)) ? flP : flS) : flS || flP;
  const model = flash || pro || "gemini-2.5-flash";
  const imageModel = best(gen, /^gemini-(\d+(?:\.\d+)?)-(?:pro|flash)-image(?:-preview)?$/) || "gemini-2.5-flash-image";
  // 성우(말소리) 모델 — 제미나이 성우 (video/geminitts.js)
  const ttsRe = (k) => new RegExp(`^gemini-(\\d+(?:\\.\\d+)?)-${k}(?:-preview)?-tts(?:-preview)?(?:-[\\d-]+)?$`);
  const ttsModel = best(gen, ttsRe("flash")) || best(gen, ttsRe("pro")) || "gemini-2.5-flash-preview-tts";
  return { model, imageModel, ttsModel };
}
async function models(id) {
  const k = keyOf(id);
  if (!k) throw new Error(`${NAME[id]} API 키가 없어요. [AI 설정]에서 키를 넣어 주세요.`);
  const all = read();
  const o = all[id] || {};
  if (o.model && (id !== "gemini" || (o.ttsModel && !/-pro/.test(o.model))) && Date.now() - (o.at || 0) < 24 * 3600e3) return o; // 예전에 Pro 로 기억했으면 다시 고른다
  try {
    const m = await listModels(id, k);
    all[id] = { ...o, ...m, at: Date.now() };
    write(all);
    return all[id];
  } catch (e) {
    if (o.model) return o;
    throw e;
  }
}

/** [키 확인]·등록 — 모델 목록을 한 번 불러 맞는 키인지 본다 */
async function setKey(id, key) {
  if (!NAME[id]) throw new Error("알 수 없는 AI입니다.");
  const k = String(key || "").trim();
  if (!k) throw new Error("키를 넣어 주세요.");
  const m = await listModels(id, k);
  const enc = safeStorage.isEncryptionAvailable();
  const all = read();
  all[id] = { key: enc ? safeStorage.encryptString(k).toString("base64") : k, enc, ...m, at: Date.now() };
  write(all);
  log.info(`[AI 키] ${NAME[id]} 키 등록 · 글 ${m.model}${m.imageModel ? ` · 그림 ${m.imageModel}` : ""}`);
  return status(id);
}
async function test(id) {
  const k = keyOf(id);
  if (!k) throw new Error(`${NAME[id]} API 키가 없어요.`);
  const m = await listModels(id, k);
  const all = read();
  all[id] = { ...(all[id] || {}), ...m, at: Date.now() };
  write(all);
  return status(id);
}
function clear(id) {
  const all = read();
  delete all[id];
  write(all);
  log.info(`[AI 키] ${NAME[id]} 키 지움`);
  return status(id);
}

/* ── 대화 저장 (수정 요청 이어 쓰기) ── */
const chatUrlOf = (id, cid) => `gsapi://${id}/${cid}`;
const chatIdOf = (url) => (String(url || "").match(/^gsapi:\/\/(\w+)\/([\w-]+)$/) || []).slice(1);
function loadChat(url) {
  const [id, cid] = chatIdOf(url);
  if (!cid) return null;
  try {
    return { id, cid, ...JSON.parse(fs.readFileSync(path.join(chatDir(), `${cid}.json`), "utf8")) };
  } catch {
    return null;
  }
}
function saveChat(id, cid, messages) {
  fs.mkdirSync(chatDir(), { recursive: true });
  fs.writeFileSync(path.join(chatDir(), `${cid}.json`), JSON.stringify({ provider: id, at: new Date().toISOString(), messages }));
  return chatUrlOf(id, cid);
}

/* 사진 파일 → { mime, b64 } */
function imageOf(file) {
  const ext = path.extname(file).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : ext === ".gif" ? "image/gif" : "image/jpeg";
  return { mime, b64: fs.readFileSync(file).toString("base64"), name: path.basename(file) };
}

/* ── 글쓰기 ── */
// API 사용 내역 (ai/usage.js, 2026-10-21 사장님) — 마지막 답의 사용량. ask·askImage 가 기능 이름과 함께 기록한다
let lastUse = null;
const useOf = (model, inTok, outTok) => { lastUse = { model: String(model || ""), inTok: Number(inTok) || 0, outTok: Number(outTok) || 0 }; };
const usage = () => require("./usage");

async function chat(id, messages, imgs) {
  const k = keyOf(id);
  const { model } = await models(id);
  const last = messages.length - 1;
  if (id === "chatgpt") {
    const b = await call(id, `${OPENAI}/chat/completions`, {
      method: "POST",
      headers: head(id, k),
      body: JSON.stringify({
        model,
        messages: messages.map((m, i) => ({
          role: m.role,
          content: i === last && imgs.length ? [{ type: "text", text: m.text }, ...imgs.map((x) => ({ type: "image_url", image_url: { url: `data:${x.mime};base64,${x.b64}` } }))] : m.text,
        })),
      }),
    });
    useOf(model, b.usage && b.usage.prompt_tokens, b.usage && b.usage.completion_tokens);
    return String((b.choices && b.choices[0] && b.choices[0].message && b.choices[0].message.content) || "");
  }
  if (id === "claude") {
    const b = await call(id, `${ANTHROPIC}/messages`, {
      method: "POST",
      headers: head(id, k),
      body: JSON.stringify({
        model,
        max_tokens: 32000, // 한 번에 쓰기(기사·블로그·SNS·대본)도 잘리지 않게
        messages: messages.map((m, i) => ({
          role: m.role,
          content: i === last && imgs.length ? [...imgs.map((x) => ({ type: "image", source: { type: "base64", media_type: x.mime, data: x.b64 } })), { type: "text", text: m.text }] : m.text,
        })),
      }),
    });
    useOf(model, b.usage && b.usage.input_tokens, b.usage && b.usage.output_tokens);
    return (b.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
  }
  const gcall = (mdl) =>
    call(id, `${GOOGLE}/models/${mdl}:generateContent`, {
      method: "POST",
      headers: head(id, k),
      body: JSON.stringify({
        contents: messages.map((m, i) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.text }, ...(i === last ? imgs.map((x) => ({ inline_data: { mime_type: x.mime, data: x.b64 } })) : [])],
        })),
      }),
    });
  // 모델이 닫혔으면(404 · "no longer available") — Google 이 알려 준 모델(없으면 목록에서 새로)로 바꿔 한 번 더, 키 설정에도 저장 (2026-10-21)
  let b;
  try {
    b = await gcall(model);
  } catch (e) {
    const msg = String((e && e.message) || "");
    if (!/\(404\)|no longer available|not found/i.test(msg)) throw e;
    let next = (msg.match(/models\/(gemini-[a-z0-9.-]+)/i) || [])[1] || "";
    if (next === model) next = "";
    if (!next) {
      const m = await listModels(id, k).catch(() => null);
      next = m && m.model !== model ? m.model : "";
    }
    if (!next) throw e;
    log.warn(`[AI 키] Gemini 모델 ${model} 이 닫혀 ${next} 로 바꿔요`);
    const all = read();
    all[id] = { ...(all[id] || {}), model: next, at: Date.now() };
    write(all);
    b = await gcall(next);
  }
  const um = b.usageMetadata || {};
  useOf(b.modelVersion || read()[id]?.model || model, um.promptTokenCount, (um.candidatesTokenCount || 0) + (um.thoughtsTokenCount || 0));
  const c = b.candidates && b.candidates[0];
  const text = ((c && c.content && c.content.parts) || []).filter((p) => p.text && !p.thought).map((p) => p.text).join("");
  if (!text && c && c.finishReason && c.finishReason !== "STOP") throw new Error(`Gemini가 답을 멈췄어요 (${c.finishReason}). 내용을 조금 바꿔 다시 해 주세요.`);
  return text;
}

/**
 * 계정 방식 ask 와 같은 모양 — 답 글을 돌려준다.
 * chatUrl(gsapi://…) 이 있으면 그 대화에 이어 보낸다. 대화를 못 찾으면 fallbackPrompt 로 새로.
 */
async function ask(id, prompt, { onProgress = () => {}, isComplete = () => true, onChat = () => {}, chatUrl = "", fallbackPrompt = "", files = [], feature = "", wait = "" } = {}) {
  await usage().guard(id); // 이번 달 한도를 넘었으면 묻기 (켠 회원만)
  const chatRec = async (msgs, im) => {
    lastUse = null;
    const t = await chat(id, msgs, im);
    if (lastUse) usage().record({ provider: id, feature: feature || "글쓰기", ...lastUse });
    return t;
  };
  const prev = chatUrl ? loadChat(chatUrl) : null;
  let messages;
  if (prev && prev.id === id && Array.isArray(prev.messages)) messages = [...prev.messages, { role: "user", text: prompt }];
  else {
    if (chatUrl && !fallbackPrompt) throw new Error(`처음 쓴 대화를 찾지 못했습니다. [다시 쓰기]를 해 주세요.`);
    messages = [{ role: "user", text: chatUrl ? fallbackPrompt : prompt }];
  }
  const imgs = files.filter((f) => f && fs.existsSync(f)).map(imageOf);
  onProgress(`${NAME[id]} API로 ${prev ? "고치는" : "쓰는"} 중… (보통 ${wait || "30초~1분"})`);
  const t0 = Date.now();
  let text = await chatRec(messages, imgs);
  // 덜 끝난 답이면 한 번 더 (드물게 JSON 이 잘리는 경우)
  if (!isComplete(text)) {
    log.warn(`[AI 키] ${NAME[id]} 답이 덜 끝남 — 한 번 더`);
    text = await chatRec(messages, imgs);
    if (!isComplete(text)) throw new Error(`${NAME[id]} 답이 중간에 끊겼어요. 다시 해 주세요.`);
  }
  log.info(`[AI 키] ${NAME[id]} 글 받음 ${Math.round((Date.now() - t0) / 1000)}초 (${text.length}자)`);
  const cid = prev && prev.id === id ? prev.cid : crypto.randomUUID();
  try {
    onChat(saveChat(id, cid, [...messages, { role: "assistant", text }]));
  } catch {}
  return text;
}

/* ── 그림 ── */
async function askImage(id, prompt, { onProgress = () => {}, files = [], ratio = "", feature = "" } = {}) {
  await usage().guard(id);
  lastUse = null;
  if (id === "claude") throw new Error("Claude 는 그림을 그리지 못해요. [AI 설정]에서 그림 AI 를 ChatGPT 나 Gemini 로 골라 주세요.");
  const k = keyOf(id);
  const { imageModel } = await models(id);
  const imgs = files.filter((f) => f && fs.existsSync(f)).map(imageOf);
  onProgress(`${NAME[id]} API로 그림을 그리는 중… (보통 30초~1분)`);
  const t0 = Date.now();
  let out = "";
  if (id === "chatgpt") {
    let b;
    if (imgs.length) {
      // 사진을 고쳐 그리기 (인테리어·리모델링 시뮬레이션)
      const fd = new FormData();
      fd.append("model", imageModel);
      fd.append("prompt", prompt);
      for (const x of imgs) fd.append("image[]", new Blob([Buffer.from(x.b64, "base64")], { type: x.mime }), x.name);
      b = await call(id, `${OPENAI}/images/edits`, { method: "POST", headers: { Authorization: `Bearer ${k}` }, body: fd });
    } else {
      // 비율 — 가로·세로·정사각 중 가까운 것
      const size = /^(9:16|4:5|3:4|2:3)$/.test(ratio) ? "1024x1536" : /^(16:9|4:3|3:2|21:9)$/.test(ratio) ? "1536x1024" : ratio === "1:1" ? "1024x1024" : "auto";
      b = await call(id, `${OPENAI}/images/generations`, { method: "POST", headers: head(id, k), body: JSON.stringify({ model: imageModel, prompt, n: 1, size }) });
    }
    useOf(imageModel, b.usage && b.usage.input_tokens, b.usage && b.usage.output_tokens);
    const d = b.data && b.data[0];
    if (d && d.b64_json) out = `data:image/png;base64,${d.b64_json}`;
    else if (d && d.url) {
      const r = await fetch(d.url);
      out = `data:image/png;base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
    }
  } else {
    const b = await call(id, `${GOOGLE}/models/${imageModel}:generateContent`, {
      method: "POST",
      headers: head(id, k),
      body: JSON.stringify({
        contents: [{ role: "user", parts: [...imgs.map((x) => ({ inline_data: { mime_type: x.mime, data: x.b64 } })), { text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"], ...(/^(1:1|2:3|3:2|3:4|4:3|4:5|5:4|9:16|16:9|21:9)$/.test(ratio) ? { imageConfig: { aspectRatio: ratio } } : {}) },
      }),
    });
    const gm = b.usageMetadata || {};
    useOf(imageModel, gm.promptTokenCount, (gm.candidatesTokenCount || 0) + (gm.thoughtsTokenCount || 0));
    const parts = (b.candidates && b.candidates[0] && b.candidates[0].content && b.candidates[0].content.parts) || [];
    const img = parts.find((p) => p.inlineData || p.inline_data);
    if (img) {
      const d = img.inlineData || img.inline_data;
      out = `data:${d.mimeType || d.mime_type || "image/png"};base64,${d.data}`;
    } else {
      const why = parts.map((p) => p.text || "").join(" ").trim().slice(0, 100);
      throw new Error(`Gemini가 그림을 그리지 않고 끝났어요.${why ? ` (Gemini: ${why})` : ""}`);
    }
  }
  if (!out) throw new Error(`${NAME[id]} 그림을 받지 못했어요.`);
  log.info(`[AI 키] ${NAME[id]} 그림 받음 ${Math.round((Date.now() - t0) / 1000)}초`);
  usage().record({ provider: id, feature: feature || "이미지", ...(lastUse || { model: imageModel }), images: 1 });
  return out;
}

module.exports = { status, setKey, test, clear, ask, askImage, keyOf, models, isApiChat: (url) => /^gsapi:\/\//.test(String(url || "")), providerOfChat: (url) => chatIdOf(url)[0] || "" };
