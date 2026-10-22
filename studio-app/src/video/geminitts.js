// 제미나이 성우 — 회원 자기 Gemini API 키로 이 PC 에서 바로 만든다 (2026-10-19 사장님: "공실뉴스 서버 제미나이 API 는 이제 쓰지 말아")
//  - 키는 [AI 설정] › Gemini › API 키 (ai/api.js, 이 PC 에만). 공실뉴스 서버를 거치지 않는다
//  - 소리 다듬기는 예전 서버(src/lib/reels/gemini.ts synthesize)와 같다: 끝 "찌직"·앞 "틱" 잘라 내기 → 앞뒤 무음 정리 → 10ms 페이드
const fs = require("fs");
const path = require("path");
const log = require("electron-log/main");
const api = require("../ai/api");

const API = "https://generativelanguage.googleapis.com/v1beta/models";
const NEED_KEY = "제미나이 성우는 Gemini API 키가 필요해요. 앱 메뉴 [AI 설정] › Gemini 줄 [API 키로]에서 키를 넣어 주세요.";

const has = () => api.status("gemini").has;

async function say(text, out, { voiceId } = {}) {
  const key = api.keyOf("gemini");
  if (!key) throw new Error(NEED_KEY);
  await require("../ai/usage").guard("gemini"); // 이번 달 API 한도 (켠 회원만)
  const { ttsModel } = await api.models("gemini");
  const models = [...new Set([ttsModel, "gemini-2.5-flash-preview-tts"].filter(Boolean))];
  let last = "";
  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      let res, json;
      try {
        res = await fetch(`${API}/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            contents: [{ parts: [{ text: String(text) }] }],
            generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: String(voiceId) } } } },
          }),
          signal: AbortSignal.timeout(60000),
        });
        json = await res.json().catch(() => ({}));
      } catch (e) {
        last = e && e.name === "TimeoutError" ? "응답 시간 초과" : "연결 실패";
        if (attempt < 2) await new Promise((r) => setTimeout(r, attempt ? 5000 : 2000));
        continue;
      }
      if (res.ok) {
        const part = ((json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) || []).find((p) => p.inlineData);
        if (!part) throw new Error("제미나이 성우 소리를 받지 못했어요. 다시 해 주세요.");
        const rate = Number((String(part.inlineData.mimeType).match(/rate=(\d+)/) || [])[1] || 24000);
        const pcm = fadeEdges(trimSilence(cutEdgeNoise(Buffer.from(part.inlineData.data, "base64"))));
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, pcmToWav(pcm, rate));
        log.info(`[제미나이 성우] ${voiceId} ${model} ${(pcm.length / 2 / rate).toFixed(1)}초`);
        // 사용 내역 (2026-10-21) — 답 안의 사용량으로 예상 금액
        const um = json.usageMetadata || {};
        require("../ai/usage").record({ provider: "gemini", feature: "제미나이 성우", model, inTok: um.promptTokenCount, outTok: um.candidatesTokenCount, seconds: +(pcm.length / 2 / rate).toFixed(1) });
        return out;
      }
      const msg = String((json && json.error && json.error.message) || res.status);
      if (res.status === 400 && /api key/i.test(msg)) throw new Error("Gemini API 키가 맞지 않아요. [AI 설정]에서 키를 확인해 주세요.");
      if (res.status === 401 || res.status === 403) throw new Error("Gemini API 키가 맞지 않거나 권한이 없어요. [AI 설정]에서 키를 확인해 주세요.");
      last = `${model}: ${msg.slice(0, 120)}`;
      if (res.status === 429 && /quota|billing|exceeded/i.test(msg) && attempt === 2) throw new Error("Gemini 사용 한도를 넘었어요. Google AI Studio 에서 요금제·한도를 확인해 주세요.");
      if (res.status !== 429 && res.status !== 503 && res.status !== 500) break; // 혼잡이 아니면 다음 모델로
      if (attempt < 2) await new Promise((r) => setTimeout(r, attempt ? 5000 : 2000));
    }
  }
  throw new Error(`제미나이 성우를 만들지 못했어요 (${last}). 잠시 뒤 다시 해 주세요.`);
}

// 성우 음성 맨 끝에 0.12초쯤 "찌직" 잡음, 맨 앞에 "틱" 소리가 붙어 온다(2026-10-06 실측). 무음 바깥쪽 짧은(0.4초 이하) 소리 덩어리는 잘라 낸다
function cutEdgeNoise(pcm) {
  const W = 240; // 10ms
  const n = Math.floor(pcm.length / 2 / W);
  const loud = Array.from({ length: n }, (_, k) => {
    let sum = 0;
    for (let j = 0; j < W; j++) sum += pcm.readInt16LE((k * W + j) * 2) ** 2;
    return Math.sqrt(sum / W) > 300;
  });
  const MAX = 40, GAP = 3;
  let start = 0, end = n;
  let k = 0;
  while (k < n && loud[k]) k++;
  if (k > 0 && k <= MAX && loud.slice(k, k + GAP).every((v) => !v)) start = k;
  k = n - 1;
  while (k >= 0 && loud[k]) k--;
  if (n - 1 - k > 0 && n - 1 - k <= MAX && loud.slice(Math.max(0, k - GAP + 1), k + 1).every((v) => !v)) end = k + 1;
  return pcm.subarray(start * W * 2, end * W * 2);
}
function fadeEdges(pcm) {
  const out = Buffer.from(pcm);
  const n = out.length / 2;
  const F = Math.min(240, Math.floor(n / 2));
  for (let i = 0; i < F; i++) {
    const g = i / F;
    out.writeInt16LE(Math.round(out.readInt16LE(i * 2) * g), i * 2);
    out.writeInt16LE(Math.round(out.readInt16LE((n - 1 - i) * 2) * g), (n - 1 - i) * 2);
  }
  return out;
}
function trimSilence(pcm, threshold = 400) {
  const n = pcm.length / 2;
  let start = 0;
  let end = n - 1;
  while (start < n && Math.abs(pcm.readInt16LE(start * 2)) < threshold) start++;
  while (end > start && Math.abs(pcm.readInt16LE(end * 2)) < threshold) end--;
  const pad = 1920; // 0.08초 여유 (내 목소리와 같게, 2026-10-20)
  return pcm.subarray(Math.max(0, start - pad) * 2, Math.min(n, end + pad) * 2);
}
function pcmToWav(pcm, rate) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

module.exports = { say, has, NEED_KEY };
