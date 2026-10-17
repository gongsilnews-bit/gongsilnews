// 공실 스튜디오 AI 목소리 설정 — 성우 30명 미리 듣기 음성을 한 번 녹음해 public/studio-voices/{id}.mp3 로 둔다.
// 카드의 ▷ 는 이 파일을 바로 틀어서 기다림·비용이 없다. 문장을 바꾸면 그 성우만 다시: node scripts/record-studio-voice-samples.mjs Kore Charon
// 필요: .env.local 의 GEMINI_API_KEY, PATH 의 ffmpeg
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
const OUT = path.join(ROOT, "public", "studio-voices");
const env = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
const KEY = (env.match(/^GEMINI_API_KEY\s*=\s*"?([^"\r\n]+)"?/m) || [])[1];
if (!KEY) throw new Error("GEMINI_API_KEY 가 .env.local 에 없습니다");
const MODELS = ["gemini-3.8-flash-tts", "gemini-3.1-flash-tts-preview"]; // src/lib/reels/gemini.ts 와 같게

// 성우마다 한 문장 — 부동산 대표님께 힘이 되는 말, 또는 공실뉴스 스튜디오 소개
export const SAMPLES = {
  Kore: "안녕하세요, 공실뉴스 스튜디오입니다. 매물 소개 영상, 이제 글만 쓰시면 AI가 만들어 드립니다.",
  Aoede: "대표님, 오늘도 좋은 하루 보내세요! 좋은 매물은 좋은 사람에게 꼭 찾아옵니다.",
  Leda: "영상 만들기 어렵다고요? 공실뉴스 스튜디오면 클릭 몇 번이면 끝이에요!",
  Zephyr: "한 번의 계약 뒤에는 수많은 발걸음이 있습니다. 대표님의 그 발걸음을 응원합니다.",
  Sulafat: "오늘 하루도 정말 수고 많으셨어요. 대표님의 성실함은 언젠가 꼭 보답받습니다.",
  Achernar: "매물의 가치를 가장 아름답게 보여 주는 방법, 공실뉴스 스튜디오가 함께합니다.",
  Charon: "전국 11만 부동산 대표님, 공실뉴스 스튜디오가 여러분의 매물을 영상으로 알리겠습니다.",
  Sadaltager: "고객은 사진보다 영상을 더 오래 봅니다. 공실뉴스 스튜디오로 매물 영상을 시작해 보세요.",
  Puck: "대표님, 힘내십시오! 오늘 보여 드린 한 집이 내일의 계약이 됩니다!",
  Achird: "바쁘시죠? 영상은 저희가 만들게요. 대표님은 손님만 만나세요.",
  Algieba: "급할수록 돌아가라는 말이 있습니다. 차분하게 쌓은 신뢰가 결국 큰 계약으로 돌아옵니다.",
  Fenrir: "자, 오늘도 계약 가 봅시다! 공실뉴스 스튜디오와 함께라면 문제없습니다!",
  Callirrhoe: "천천히 가도 괜찮아요. 멈추지만 않으면, 대표님은 이미 잘하고 계신 겁니다.",
  Autonoe: "새로운 한 주가 시작됐어요. 대표님 사무실에 좋은 소식만 가득하길 바랄게요!",
  Despina: "글로 쓰고, 목소리를 고르고, 영상으로 완성합니다. 공실뉴스 스튜디오.",
  Erinome: "좋은 중개는 좋은 설명에서 시작됩니다. 대표님의 설명을 영상으로 담아 보세요.",
  Laomedeia: "오늘도 반짝반짝! 대표님의 매물, 영상으로 더 빛나게 만들어 드릴게요!",
  Gacrux: "오래 걸어온 길에는 이유가 있습니다. 대표님이 지켜 온 신뢰가 가장 큰 재산입니다.",
  Pulcherrima: "기회는 준비된 사람에게 옵니다. 지금 바로 대표님의 매물을 영상으로 알리세요.",
  Vindemiatrix: "대표님, 오늘 하루도 정말 고생 많으셨어요. 따뜻한 차 한잔하시면서 쉬어 가세요.",
  Orus: "흔들리지 않는 나무는 없습니다. 그래도 뿌리가 깊으면 다시 일어섭니다. 대표님, 힘내십시오.",
  Enceladus: "조용히, 그리고 꾸준히. 대표님의 하루하루가 모여 큰 결실이 됩니다.",
  Iapetus: "매물 사진만으로는 부족합니다. 공실뉴스 스튜디오로 움직이는 매물 소개를 만들어 보세요.",
  Umbriel: "부동산은 결국 사람의 일입니다. 오늘 만난 손님 한 분 한 분이 대표님의 내일입니다.",
  Algenib: "포기하지 않는 사람이 결국 이깁니다. 대표님, 오늘도 끝까지 갑시다.",
  Rasalgethi: "공실뉴스 스튜디오 사용법을 안내해 드리겠습니다. 먼저, 만들 방법을 고르세요.",
  Alnilam: "망설이는 순간 기회는 지나갑니다. 지금 시작하십시오. 공실뉴스 스튜디오.",
  Schedar: "매물을 등록하고, 대본을 고르면, 영상이 만들어집니다. 어렵지 않습니다.",
  Zubenelgenubi: "아이고 대표님, 오늘도 애쓰셨습니다. 내일은 더 좋은 손님 오실 겁니다.",
  Sadachbia: "요즘 손님들은 영상으로 집을 봅니다. 대표님도 공실뉴스 스튜디오로 시작해 보세요!",
};

async function tts(text, voice) {
  let last;
  for (const model of MODELS) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
      }),
    });
    const j = await r.json().catch(() => ({}));
    const part = j?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (part) return { pcm: Buffer.from(part.inlineData.data, "base64"), rate: Number((part.inlineData.mimeType.match(/rate=(\d+)/) || [])[1] || 24000) };
    last = j?.error?.message || r.status;
  }
  throw new Error(`${voice}: ${last}`);
}

const only = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
for (const [voice, text] of Object.entries(SAMPLES)) {
  if (only.length && !only.includes(voice)) continue;
  const raw = path.join(OUT, `${voice.toLowerCase()}.pcm`);
  const { pcm, rate } = await tts(text, voice);
  fs.writeFileSync(raw, pcm);
  // 앞뒤 잡음·무음 자르고 (앞 틱·끝 찌직), 짧게 페이드, mp3 로
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "s16le", "-ar", String(rate), "-ac", "1", "-i", raw,
    "-af", "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,afade=t=in:d=0.03",
    "-codec:a", "libmp3lame", "-b:a", "64k", path.join(OUT, `${voice.toLowerCase()}.mp3`)]);
  fs.unlinkSync(raw);
  console.log("ok", voice);
}
