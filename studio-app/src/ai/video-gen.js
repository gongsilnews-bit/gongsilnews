// AI 영상 — 회원 본인 Gemini API 키로 Gemini Omni Flash (2026-10-21 사장님: 영상도 가능하게, 클립마다 하나씩)
//  Veo 3.1 미리보기 모델은 2026-10-22 종료 → Google 이 권하는 gemini-omni-1.1-flash (ai.google.dev/gemini-api/docs/omni)
//  POST v1beta/interactions — input: 글 또는 [그림, 글] (그림 → 영상: 그 클립 그림을 첫 장면으로)
//  response_format: { type: "video", aspect_ratio: "9:16" | "16:9", resolution: "720p" }
//  요금: 유료 등급 키만 (무료 없음), 720p 초당 약 $0.10 — 만들어진 영상만 (2026-10-21 Google 가격표)
const fs = require("fs");
const path = require("path");
const api = require("./api");
const busy = require("../ai-busy");

const GOOGLE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "gemini-omni-1.1-flash";
const PRICE_NOTE = "720p 초당 약 $0.10 (만들어진 영상만 요금)";

const errText = (status, body) => {
  const e = body && (body.error || body);
  const msg = String((e && (e.message || e.status)) || "").slice(0, 200);
  if (status === 401 || status === 403 || /api key not valid|invalid.*key/i.test(msg)) return "Gemini API 키가 맞지 않아요. [AI 설정]에서 키를 확인해 주세요.";
  if (status === 429 || /quota|billing|free tier|paid/i.test(msg))
    return /free|paid|billing/i.test(msg) ? "AI 영상은 Gemini 유료 등급 키에서만 돼요. Google AI Studio에서 결제(유료 등급)를 켜 주세요." : "Gemini 사용 한도가 찼어요. 잠시 뒤 다시 해 주세요.";
  if (status === 404) return `Gemini 영상 모델(${MODEL})을 찾지 못했어요. 앱을 최신 버전으로 업데이트해 주세요.`;
  if (status === 503 || status === 529) return "Gemini 서버가 바빠요. 잠시 뒤 다시 해 주세요.";
  if (/minor|person|people|safety|blocked/i.test(msg)) return `이 그림·설명으로는 영상을 만들 수 없대요 (Gemini 안전 기준): ${msg}`;
  return `Gemini 영상 오류 (${status})${msg ? `: ${msg}` : ""}`;
};

/** 요청 — [중지]·시간 초과로 끊긴다 */
async function req(url, init, key, ms = 8 * 60 * 1000) {
  let r;
  try {
    r = await fetch(url, { ...init, headers: { "x-goog-api-key": key, ...(init && init.headers) }, signal: AbortSignal.any([AbortSignal.timeout(ms), busy.signal()]) });
  } catch (e) {
    if (busy.isStopped()) throw busy.stopError();
    if (e && e.name === "TimeoutError") throw new Error(`Gemini 영상을 ${Math.round(ms / 60000)}분 안에 받지 못했어요. 다시 해 주세요.`);
    throw new Error("Gemini에 연결하지 못했어요. 인터넷을 확인해 주세요.");
  }
  return r;
}
async function json(url, init, key, ms) {
  const r = await req(url, init, key, ms);
  const body = await r.json().catch(() => null);
  if (!r.ok) throw new Error(errText(r.status, body));
  return body;
}

/** 답 안에서 영상 찾기 — { data } (base64) 또는 { uri } (응답 모양이 조금 달라도 찾게 전체를 훑는다) */
function findVideo(o, depth = 0) {
  if (!o || typeof o !== "object" || depth > 12) return null;
  const mt = String(o.mime_type || o.mimeType || "");
  if ((mt.startsWith("video/") || o.type === "video") && (o.data || o.uri)) return { data: o.data || "", uri: o.uri || "" };
  for (const v of Array.isArray(o) ? o : Object.values(o)) {
    const f = findVideo(v, depth + 1);
    if (f) return f;
  }
  return null;
}

/** 답 안의 사용량 — usage / usageMetadata (이름이 조금 달라도) */
function findUsage(o, depth = 0) {
  if (!o || typeof o !== "object" || depth > 8) return { found: false, inTok: 0, outTok: 0 };
  for (const k of ["usage", "usageMetadata", "usage_metadata"]) {
    const u = o[k];
    if (u && typeof u === "object") {
      const inTok = Number(u.input_tokens ?? u.total_input_tokens ?? u.promptTokenCount ?? u.prompt_tokens) || 0;
      const outTok = Number(u.output_tokens ?? u.total_output_tokens ?? u.candidatesTokenCount ?? u.completion_tokens) || 0;
      if (inTok || outTok) return { found: true, inTok, outTok };
    }
  }
  for (const v of Array.isArray(o) ? o : Object.values(o)) {
    if (v && typeof v === "object") {
      const r = findUsage(v, depth + 1);
      if (r.found) return r;
    }
  }
  return { found: false, inTok: 0, outTok: 0 };
}

/** uri 로 받기 — files/{id} 면 ACTIVE 될 때까지 기다렸다가 :download */
async function download(uri, key, onProgress) {
  const m = /\/files\/([^/:?]+)/.exec(uri);
  if (m) {
    for (let i = 0; i < 120; i++) {
      const f = await json(`${GOOGLE}/files/${m[1]}`, { method: "GET" }, key, 60 * 1000);
      if (!f.state || f.state === "ACTIVE") break;
      if (f.state === "FAILED") throw new Error("Gemini 영상 파일을 만들지 못했어요. 다시 해 주세요.");
      onProgress("영상 파일을 준비하는 중…");
      await new Promise((r) => setTimeout(r, 3000));
      if (busy.isStopped()) throw busy.stopError();
    }
    uri = `${GOOGLE}/files/${m[1]}:download?alt=media`;
  }
  const r = await req(uri, { method: "GET", redirect: "follow" }, key, 5 * 60 * 1000);
  if (!r.ok) throw new Error(errText(r.status, await r.json().catch(() => null)));
  return Buffer.from(await r.arrayBuffer());
}

/**
 * 영상 하나 — prompt(영어 장면 설명), image(첫 장면 그림 파일, 없으면 글로만), ratio(프로젝트 화면 비율)
 * 돌려주는 것: mp4 Buffer
 */
function make({ prompt, image = "", ratio = "16:9" }, onProgress = () => {}) {
  const key = api.keyOf("gemini");
  if (!key) throw new Error("AI 영상은 Gemini API 키로 만들어요. [AI 설정]에서 Gemini API 키를 넣어 주세요 (유료 등급 키).");
  const text = String(prompt || "").trim();
  if (!text) throw new Error("장면 설명이 비어 있어요.");
  const ar = ratio === "16:9" || ratio === "4:3" ? "16:9" : "9:16"; // 1:1·4:5 는 세로로 만들어 화면에서 잘라 쓴다
  const input = [];
  if (image && fs.existsSync(image)) {
    const ext = path.extname(image).toLowerCase();
    input.push({ type: "image", data: fs.readFileSync(image).toString("base64"), mime_type: ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg" });
  }
  const motion = `${text}\nCinematic, smooth natural camera motion. No on-screen text, no subtitles, no logos.`;
  input.push({ type: "text", text: motion });
  const body = {
    model: MODEL,
    input: input.length > 1 ? input : motion,
    response_format: { type: "video", aspect_ratio: ar, resolution: "720p" },
    ...(input.length > 1 ? { generation_config: { video_config: { task: "image_to_video" } } } : {}),
  };
  return busy.during(
    "Gemini가 영상을 만들고 있습니다",
    async () => {
      onProgress(`Gemini가 영상을 만드는 중… (보통 1~3분) · ${PRICE_NOTE}`);
      await require("./usage").guard("gemini"); // 이번 달 API 한도 (켠 회원만)
      const res = await json(`${GOOGLE}/interactions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, key);
      // 사용 내역 — 답 안의 사용량(토큰)으로 예상 금액 (못 찾으면 금액은 비움)
      const u = findUsage(res);
      require("./usage").record({ provider: "gemini", feature: "AI 동영상", model: MODEL, inTok: u.inTok, outTok: u.outTok, note: u.found ? "" : "사용량 정보 없음" });
      let v = findVideo(res);
      // 큰 영상은 uri 로만 올 때가 있다 — 같은 대화를 다시 읽으면 영상이 들어 있다 (Google 문서)
      if ((!v || (!v.data && !v.uri)) && res && res.id) v = findVideo(await json(`${GOOGLE}/interactions/${res.id}`, { method: "GET" }, key, 2 * 60 * 1000));
      if (!v) throw new Error("Gemini가 영상을 돌려주지 않았어요. 장면 설명을 바꿔 다시 해 주세요.");
      if (v.data) return Buffer.from(v.data, "base64");
      onProgress("영상을 받는 중…");
      return download(v.uri, key, onProgress);
    },
    `회원 Gemini API 키로 만들어요 · 보통 1~3분 · ${PRICE_NOTE}`,
  );
}

module.exports = { make, MODEL, PRICE_NOTE };
