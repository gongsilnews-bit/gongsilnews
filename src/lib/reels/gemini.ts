import { getGeminiApiKey } from "@/lib/agents/core";
import { logAiUsage } from "@/lib/agents/logger";

const API = "https://generativelanguage.googleapis.com/v1beta/models";
// 혼잡(429/503)이면 잠시 후 재시도하고, 그래도 안 되면 다음 모델로 넘어간다
export const TEXT_MODELS = ["gemini-3.6-flash", "gemini-3.8-flash", "gemini-3.5-flash"];
export const TTS_MODELS = ["gemini-3.8-flash-tts", "gemini-3.1-flash-tts-preview"];

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
type ResponsePart = { text?: string; inlineData?: { mimeType: string; data: string } };

// 혼잡할 때 응답이 몇 분씩 붙잡힌 적이 있어(2026-10-06 초안 338초) 요청마다 시간 제한을 둔다
const REQUEST_TIMEOUT_MS = 30_000;

async function generate(models: string[], parts: Part[], generationConfig: Record<string, unknown>) {
  const key = await getGeminiApiKey();
  let lastError = "";
  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`${API}/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({ contents: [{ parts }], generationConfig }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok) return { json, model };
        lastError = `${model}: ${json?.error?.message || res.status}`;
        if (res.status !== 429 && res.status !== 503 && res.status !== 500) break; // 혼잡이 아니면 다음 모델로
      } catch (e) {
        lastError = `${model}: ${e instanceof Error && e.name === "TimeoutError" ? "응답 시간 초과" : String(e)}`;
      }
      // 혼잡은 보통 몇 초~십여 초면 풀린다: 2초 → 5초 → 다음 모델 (2026-10-06 혼잡으로 실패한 뒤 늘림)
      if (attempt < 2) await new Promise((r) => setTimeout(r, attempt === 0 ? 2000 : 5000));
    }
  }
  throw new Error(`Gemini 호출 실패 (${lastError})`);
}

/** JSON 응답을 받는 텍스트(+이미지/오디오) 호출 */
export async function geminiJson<T>(parts: Part[], summary: string): Promise<T> {
  const { json, model: TEXT_MODEL } = await generate(TEXT_MODELS, parts, { responseMimeType: "application/json", temperature: 0.4 });
  const text = json?.candidates?.[0]?.content?.parts?.map((p: ResponsePart) => p.text || "").join("") || "";
  const usage = json?.usageMetadata || {};
  logAiUsage({ channelId: "reels", summary, model: TEXT_MODEL, inputTokens: usage.promptTokenCount, outputTokens: usage.candidatesTokenCount }).catch(() => {});
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Gemini 응답을 해석하지 못했습니다: ${text.slice(0, 200)}`);
  }
}

export async function imagePart(url: string): Promise<Part> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`사진을 불러오지 못했습니다: ${url}`);
  const mimeType = res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  return { inlineData: { mimeType, data: Buffer.from(await res.arrayBuffer()).toString("base64") } };
}

/**
 * 성우 녹음. 대본만 보낸다 — 말투 지시문을 같이 넣으면 한/영 모두 지시문까지 소리 내어 읽었다(2026-10-06 실측).
 * 반환: 앞뒤 무음을 잘라낸 24kHz 16bit mono WAV.
 */
export async function synthesize(text: string, voice: string): Promise<{ wav: Buffer; duration: number }> {
  const { json, model: TTS_MODEL } = await generate(TTS_MODELS, [{ text }], {
    responseModalities: ["AUDIO"],
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
  });
  const part = json?.candidates?.[0]?.content?.parts?.find((p: ResponsePart) => p.inlineData);
  if (!part) throw new Error("성우 음성을 받지 못했습니다.");
  const rate = Number((part.inlineData.mimeType.match(/rate=(\d+)/) || [])[1] || 24000);
  const pcm = fadeEdges(trimSilence(cutEdgeNoise(Buffer.from(part.inlineData.data, "base64"))));
  logAiUsage({ channelId: "reels", summary: `[릴스 성우] ${text.slice(0, 30)}`, model: TTS_MODEL, inputTokens: json?.usageMetadata?.promptTokenCount, outputTokens: json?.usageMetadata?.candidatesTokenCount }).catch(() => {});
  return { wav: pcmToWav(pcm, rate), duration: pcm.length / 2 / rate };
}

/** 성우가 대본대로 읽었는지 들어 보고 판단 (숫자가 들어간 장면만 검사) */
export async function verifySpeech(wav: Buffer, expected: string): Promise<{ match: boolean; heard: string }> {
  return geminiJson<{ match: boolean; heard: string }>(
    [
      { inlineData: { mimeType: "audio/wav", data: wav.toString("base64") } },
      {
        text:
          `이 음성을 한국어로 그대로 받아 적고, 아래 대본과 뜻이 같은지 판단해 주세요. ` +
          `특히 숫자(금액, 매물번호, 평수, 층)가 하나라도 다르게 들리면 match 는 false 입니다. ` +
          `JSON 으로만 답하세요: {"heard": "받아 적은 문장", "match": true|false}\n대본: ${expected}`,
      },
    ],
    `[릴스 성우 검사] ${expected.slice(0, 30)}`,
  );
}

// 성우 음성 맨 끝에 0.12초쯤 "찌직" 잡음, 맨 앞에 "틱" 소리가 붙어 온다(2026-10-06 실측, 모든 파일).
// 무음 구간 바깥쪽에 붙은 짧은(0.4초 이하) 소리 덩어리는 말이 아니라 잡음으로 보고 잘라 낸다.
function cutEdgeNoise(pcm: Buffer): Buffer {
  const W = 240; // 10ms
  const n = Math.floor(pcm.length / 2 / W);
  const loud = Array.from({ length: n }, (_, k) => {
    let sum = 0;
    for (let j = 0; j < W; j++) sum += pcm.readInt16LE((k * W + j) * 2) ** 2;
    return Math.sqrt(sum / W) > 300;
  });
  const MAX = 40, GAP = 3; // 잡음 최대 0.4초, 앞뒤 무음 최소 30ms
  let start = 0, end = n;
  let k = 0;
  while (k < n && loud[k]) k++;
  if (k > 0 && k <= MAX && loud.slice(k, k + GAP).every((v) => !v)) start = k;
  k = n - 1;
  while (k >= 0 && loud[k]) k--;
  if (n - 1 - k > 0 && n - 1 - k <= MAX && loud.slice(Math.max(0, k - GAP + 1), k + 1).every((v) => !v)) end = k + 1;
  return pcm.subarray(start * W * 2, end * W * 2);
}

// 잘린 자리에서 "틱" 소리가 나지 않도록 앞뒤 10ms 페이드
function fadeEdges(pcm: Buffer): Buffer {
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

function trimSilence(pcm: Buffer, threshold = 400): Buffer {
  const n = pcm.length / 2;
  let start = 0;
  let end = n - 1;
  while (start < n && Math.abs(pcm.readInt16LE(start * 2)) < threshold) start++;
  while (end > start && Math.abs(pcm.readInt16LE(end * 2)) < threshold) end--;
  const pad = 2400; // 0.1초 여유
  return pcm.subarray(Math.max(0, start - pad) * 2, Math.min(n, end + pad) * 2);
}

function pcmToWav(pcm: Buffer, rate: number): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
