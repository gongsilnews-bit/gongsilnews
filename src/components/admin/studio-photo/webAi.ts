/**
 * 포토studio AI 문구 — 웹판 (2026-11-06 사장님: "AI로 채우기 작동이 안 되네, AI 작동이 되게 해줘")
 *  앱(studio-app/src/photo/ipc.js photo:ai-design · photo:ai-text)과 같은 질문을 회원 본인 AI(ChatGPT·Gemini, 새 탭)로 묻는다.
 *  서버 AI 키는 쓰지 않는다 (회원 글쓰기에 서버 API 금지). 숫자·주소·연락처는 AI 가 쓰지 않고 화면이 자료 그대로 넣는다.
 */
import { webAsk } from "@/components/admin/studio-web/ai-ask";

const objOf = (t: string) => {
  const m = /\{[\s\S]*\}/.exec(String(t || "").replace(/```(?:json)?/gi, ""));
  if (!m) return null;
  try { return JSON.parse(m[0].replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, "$1")); } catch { return null; }
};
const clean = (v: unknown, n: number) => String(v || "").replace(/\s+/g, " ").trim().slice(0, n);

export async function webAiDesign(o: { kind: string; facts: string; size: string; request?: string }) {
  const isNews = o.kind === "article";
  const prompt = [
    `당신은 이 동네를 잘 아는 지역 부동산 전문가가 쓰는 ${isNews ? "뉴스 카드" : "매물 홍보 이미지"}의 카피라이터이자 아트 디렉터입니다.`,
    `아래 ${isNews ? "기사" : "공실(매물)"} 자료를 읽고, ${o.size || "SNS"}용 이미지에 들어갈 문구와 배경 장면을 정해 주세요.`,
    isNews ? "사실만 짧게. 과장·추측 금지." : "객관적인 보도 톤으로 \"이런 매물이 나왔다\"는 느낌. 과장 광고 문구(최고, 무조건, 대박 등) 금지.",
    "중요: 가격·보증금·월세·면적·층수·주소·전화번호 같은 숫자와 정보는 문구에 절대 쓰지 마세요 (화면에서 자료 그대로 따로 넣습니다). 자료에 없는 내용도 지어내지 마세요.",
    o.request ? `회원 요청: ${String(o.request).slice(0, 400)}` : "",
    "",
    "[자료]",
    String(o.facts || "").slice(0, 6000),
    "",
    "설명 없이 JSON 하나로만 답하세요:",
    '{"title":"제목 (한국어 6~16자)","sub":"부제 (한국어 10~28자, 없으면 빈칸)","badge":"강조 딱지 2~5자 (예: 신규 매물, 역세권, 단독 — 자료에 근거가 있을 때만, 없으면 빈칸)",',
    ' "scene":"English description of a background image for this design — the place/mood only, NO text, NO letters, NO numbers, NO logos, leave calm empty space for headline",',
    ' "retouch":"English instruction to gently improve the real listing photo — only sky, lighting, color, tidiness. Never change the building, rooms, layout or furniture."}',
  ].filter((x) => x !== "").join("\n");
  return webAsk(prompt, "이미지 문구를 쓰고 있습니다", async (text) => {
    const j = objOf(text);
    if (!j || typeof j.title !== "string") throw new Error("AI 답을 읽지 못했어요. 답이 다 나온 뒤 [복사]해 주세요.");
    return { title: clean(j.title, 40), sub: clean(j.sub, 60), badge: clean(j.badge, 12), scene: clean(j.scene, 800), retouch: clean(j.retouch, 400) };
  });
}

export async function webAiText(o: { text: string; request?: string }) {
  const req = String(o.request || "").slice(0, 300) || "더 읽기 좋게 다듬어 주세요";
  const prompt = [
    "당신은 이 동네를 잘 아는 지역 부동산 전문가가 쓰는 이미지의 카피라이터입니다.",
    "아래 [글]은 이미지(썸네일·카드·전단) 위에 들어가는 글자 한 덩어리입니다. 회원 요청대로 고쳐 주세요.",
    "규칙: 가격·보증금·월세·면적·층수·주소·전화번호 같은 숫자와 정보는 새로 만들거나 바꾸지 마세요 (글에 있던 것은 그대로 둡니다). 글에 없는 사실도 지어내지 마세요. 과장 광고 문구(최고, 무조건, 대박 등) 금지.",
    "줄바꿈이 있으면 비슷한 줄 수로. 이미지 글이니 짧게.",
    `회원 요청: ${req}`,
    "",
    "[글]",
    String(o.text || "").slice(0, 600),
    "",
    '고친 글만 JSON 으로 답하세요: {"text":"고친 글"}',
  ].join("\n");
  return webAsk(prompt, "글자를 고치고 있습니다", async (text) => {
    const j = objOf(text);
    if (!j || typeof j.text !== "string" || !j.text.trim()) throw new Error("AI 답을 읽지 못했어요. 답이 다 나온 뒤 [복사]해 주세요.");
    return { text: String(j.text).trim().slice(0, 600) };
  });
}
