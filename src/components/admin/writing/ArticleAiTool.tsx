"use client";
/**
 * 기사쓰기 왼쪽 "글쓰기 도구" (2026-11-03 사장님: 기존 기사초안작성기를 버리고 대본 작성 모양으로)
 *  ① 무엇으로 쓸까요 — 매물 소개 · 단지/시세 · 뉴스 기사 · 자유 주제 · 공실뉴스
 *  ② 재료 ③ 기사 스타일 ④ 문체·제목 ⑤ 분량 ⑥ 더 할 말 → [✨ AI 기사 초안 작성] → 가운데 기사 칸(제목·부제목·본문·키워드)에 채운다.
 *  AI 는 회원 본인 계정 (앱 gongsilStudio.write.ask, 서버 AI 안 씀). 숫자는 공실뉴스 데이터(재료)에 있는 것만.
 *  디자인은 대본 작성과 같은 톤 — 흰 바탕 · 옅은 회색 선 · 남색 하나 · 번호 단계.
 */
import React, { useEffect, useState } from "react";
import { openDocked, dockArea } from "../studio-web/ai-ask";
import { createPortal } from "react-dom";
import AiCopyGuide from "./AiCopyGuide";
import { InstallGuideModal, useStudioInstaller } from "@/components/admin/sections/StudioInstallGuide";
import { effectiveAi, useAiPick } from "@/components/admin/studio-video/AiPick";
import { writingAreaDongs, writingAreaFacts, writingArticleFacts, writingArticles, writingComplexFacts, writingFetchNews, writingMyVacancies, writingSearchComplexes, writingVacancyFacts } from "@/app/actions/writingFacts";
import { LAWD_NAMES } from "@/utils/aptMapShared";

/** photos — 공실뉴스 단지 화면 캡처 (시세·로드뷰·실거래, 2026-11-03 사장님). url 은 앱이 저장한 사진 주소 */
export type ArticleDraft = { title: string; subtitles: string[]; paragraphs: { heading?: string; text: string }[]; keywords: string[]; photos?: { url: string; caption: string; after: number }[] };
type News = { title: string; body: string; publisher?: string; url?: string; publishedAt?: string };
type Bridge = {
  write?: { ask: (prompt: string, opts?: { json?: boolean; busyLabel?: string; provider?: string; mode?: string }) => Promise<string>; onProgress: (fn: (t: string) => void) => () => void };
  video?: {
    capturePage?: (url: string, opts: { mode: "head" | "full" | "screen"; title?: string; credit?: string; max?: number; waitSel?: string; waitText?: string; settle?: number; crop?: string }) => Promise<{ url: string }[]>;
    /** 분석해 둔 공실 사진·화면을 원본 크기로 (analysis.json 순서 그대로) */
    vacancy?: (vacancyId: string) => Promise<{ photos: { url: string }[]; shots: { url: string }[] }>;
  };
  /** 뉴스·SNS자동화와 같은 공실 분석 — 공실열람 상세를 열어 등록 사진 + 공실열람 검증·지도·로드뷰 칸을 잘라 찍는다 */
  vacancy?: {
    analyze?: (vacancyId: string) => Promise<{ media: { kind: string; caption: string }[]; failures?: string[] }>;
    onProgress?: (fn: (t: string) => void) => () => void;
  };
  column?: { fetchNews: (url: string) => Promise<News>; openNews?: () => Promise<unknown>; grabNews?: () => Promise<News> };
};
const bridge = (): Bridge | null => (typeof window === "undefined" ? null : ((window as unknown as { gongsilStudio?: Bridge }).gongsilStudio ?? null));
export const articleToolReady = () => Boolean(bridge()?.write);

export const NAVY = "#1e3a6e";
const LINE = "#e5e7eb", SUB = "#6b7280", DIM = "#9ca3af", TEXT = "#1f2937";
type Src = "vacancy" | "market" | "news" | "topic" | "gongsil";
/** 웹에서 여는 AI — 회원 본인 계정 (2026-11-03) */
const WEB_AI = [
  { id: "chatgpt", name: "ChatGPT", url: "https://chatgpt.com/" },
  { id: "gemini", name: "Gemini", url: "https://gemini.google.com/app" },
  { id: "claude", name: "Claude", url: "https://claude.ai/new" },
];
// 단지/지역/시세 — 공실 홍보(공실뉴스)와 다른 실거래 시장 기사. 단지 하나 또는 지역(구·동) (2026-11-04 사장님)
const SRCS: [Src, string][] = [["vacancy", "매물 소개"], ["market", "단지/지역/시세"], ["news", "뉴스 기사"], ["topic", "자유 주제"], ["gongsil", "공실뉴스"]];
/* ── 어떤 이야기로 (2026-11-09 사장님: "글이 어색하지 않게, 기사 스타일·분류는 니가 알아서 나눠줘, 필요없는 건 지워") ──
   예전 [기사 스타일 6개]·[무엇을 중심으로 4개]·[제목 고르기]를 이것 하나로 합쳤다.
   재료마다 독자가 궁금한 이야기 하나를 고르면, 그 이야기의 문단 순서대로 쓴다 (한 방향으로 흐르게). 말투는 기사체 그대로 */
type Story = { id: string; name: string; desc: string; flow: string; title: string; heads?: boolean };
const STORIES: Partial<Record<Src, Story[]>> = {
  // 단지/지역/시세는 지금의 [무엇을 중심으로] 4개 그대로 (2026-11-09 사장님: "지금의 구분 형식은 나쁘지 않아") — 중심마다 문단 순서만 정했다
  market: [
    { id: "all", name: "종합", desc: "단지·시세·지역을 고르게", title: "가장 눈에 띄는 사실(신고가·최근 거래)을 앞세운 제목", flow: "① 최근 거래 — 신고가가 있으면 맨 앞에 ② 어떤 단지인가(준공·세대·주차) ③ 역·학교·장보기 같은 생활 여건 ④ 그래서 어떤 단지인지 한 문단으로 정리" },
    { id: "complex", name: "단지 정보", desc: "세대수·준공·주차 등 단지 특징", title: "단지의 특징(준공·규모)을 앞세운 제목", flow: "① 준공·세대·동·층 ② 주차·평형 구성 ③ 단지가 자리한 동네(역·학교 한두 문장) ④ 어떤 단지인지 정리. 가격 이야기는 쓰지 않는다" },
    { id: "price", name: "시세 정보", desc: "실거래 내역·가격 흐름", title: "최근 거래가(신고가면 신고가)를 앞세운 제목", flow: "① 최근 매매 — 신고가가 있으면 맨 앞에 ② 평형별 매매 흐름(꼭 필요한 것만) ③ 전세(있으면) ④ 가격 흐름 정리. 주변 시설 이야기는 쓰지 않는다" },
    { id: "region", name: "지역 정보", desc: "교통·편의시설·학교", title: "가까운 역·학교를 앞세운 제목", flow: "① 가장 가까운 역과 노선 ② 초·중·고와 어린이집 ③ 장보기·생활시설 ④ 그래서 어떤 생활이 가능한 곳인지 정리. 가격 이야기는 쓰지 않는다" },
  ],
  vacancy: [
    { id: "intro", name: "매물 소개", desc: "위치·평수·가격 차례로", title: "동네와 매물의 가장 큰 장점을 담은 제목", flow: "① 위치와 매물 종류 ② 평수·구조 ③ 건물·상태·옵션 ④ 가격(보증금·월세·관리비 한 번에) ⑤ 입주 시기" },
    { id: "fit", name: "이런 분께 추천", desc: "누구에게 맞는 집인지", title: "어떤 사람에게 맞는 집인지 담은 제목", flow: "① 이 매물이 맞는 사람(재료의 조건으로 뒷받침되는 것만) ② 그렇게 말하는 근거가 된 조건들 ③ 가격 ④ 입주 시기" },
    { id: "area", name: "동네와 함께", desc: "역·주변을 앞세워", title: "동네·역을 앞세운 제목", flow: "① 동네와 가까운 역·생활 여건(재료에 있는 것만) ② 매물 조건 ③ 가격 ④ 입주 시기" },
  ],
  // 뉴스 기사·공실뉴스·자유 주제는 지금 그대로 — 기사 스타일·제목 고르기 (2026-11-09 사장님: "뉴스기사 자유주제는 일단 놔두기")
};
const KINDS = [
  { id: "news", name: "뉴스기사형", prompt: "도입부터 결론까지 문단이 자연스럽게 이어지는 뉴스 기사. 매물 조건·지역·수요를 사실과 숫자로 기사 흐름 안에서 풀어 쓴다." },
  { id: "summary", name: "단락별 요약", prompt: "첫 문단에서 기사 전체를 요약하고, 이어서 핵심 내용을 소제목 단위로 나눠 독자가 빠르게 훑어볼 수 있게 쓴다.", heads: true },
  // 더 다양하게 (2026-11-03 사장님 "기사 스타일을 조금 더 다양하게, 지금은 딱 2개")
  { id: "data", name: "숫자로 보는", prompt: "재료의 숫자(가격·면적·거래 건수·기간)를 앞세운 데이터 브리핑 기사. 문단마다 핵심 숫자 하나를 중심에 두고, 숫자가 뜻하는 바를 짧게 풀어 쓴다. 재료에 없는 숫자는 쓰지 않는다.", heads: true },
  { id: "qa", name: "질문·답변(Q&A)", prompt: "독자가 궁금해할 질문을 소제목으로 세우고(예: \"지금 시세는 얼마인가?\"), 그 아래에 재료에 근거한 답을 쓴다. 질문은 4~6개.", heads: true },
  // 체크포인트는 뺌 — "확인할 점"을 쓰는 형식이라 가르치는 말 금지 원칙과 부딪침 (2026-11-06)
  { id: "compare", name: "비교 분석", prompt: "면적·시기·거래 유형(매매/전세)·주변과 비교하며 차이를 짚는 분석 기사. 비교 축마다 소제목을 두고 수치 차이를 분명하게 쓴다.", heads: true },
  { id: "column", name: "칼럼·해설", prompt: "현장 전문가가 쓰는 칼럼. 사실을 바탕으로 시장의 흐름과 의미를 해설하고, 마지막에 독자에게 줄 조언으로 맺는다. 근거 없는 전망·단정은 하지 않는다." },
  // 짧은 단신은 뺌 (2026-11-06 사장님: "단신은 없애고")
];
const TONES = [
  { id: "report", name: "보도형", desc: "사실 중심, 건조하게", prompt: "사실을 먼저, 건조하고 정확하게. 형용사·감탄 없이." },
  { id: "analysis", name: "해설형", desc: "의미까지 차분히", prompt: "사실을 전한 뒤 그 의미와 독자에게 주는 영향을 차분히 해설한다. 단정·전망 금지." },
  { id: "field", name: "현장 르포", desc: "와 있는 듯 생생하게", prompt: "장면이 그려지도록 구체적으로 쓴다. 단, 기자가 직접 가 보거나 걸어 본 것처럼 꾸미지 않고, 자료에 있는 거리·숫자·이름으로만 묘사한다." },
  { id: "quote", name: "인터뷰·인용형", desc: "말을 살려서", prompt: "자료에 있는 말·설명을 인용 형식으로 살린다. 자료에 없는 발언은 절대 지어내지 않는다." },
];
const HOOKS = [
  { id: "q", name: "질문", prompt: "제목은 독자가 답하고 싶은 질문형" },
  { id: "num", name: "숫자", prompt: "제목에 가장 눈에 띄는 숫자 하나 (자료에 있는 숫자만)" },
  { id: "twist", name: "반전", prompt: "제목은 예상을 뒤집는 한마디" },
  { id: "empathy", name: "공감", prompt: "제목은 독자의 고민을 짚는 공감형" },
];
const LENGTHS = [
  { id: "short", name: "짧게", chars: "700~1,000자" },
  { id: "normal", name: "보통", chars: "1,400~1,800자" },
  { id: "long", name: "길게", chars: "2,800~3,500자" },
];
type Focus = "all" | "complex" | "price" | "region";
const FOCUS: [Focus, string, string][] = [
  ["all", "종합", "단지·시세·지역을 고르게"],
  ["complex", "단지 정보", "세대수·준공·주차 등 단지 특징"],
  ["price", "시세 정보", "실거래 내역·가격 흐름"],
  ["region", "지역 정보", "교통·편의시설·학교"],
];
/** 단지/지역/시세 재료 줄 나누기 — 머리 줄([…])·"- 단지:"·"- 지역:"은 늘, 나머지는 중심에 맞는 줄만 */
function focusMats(text: string, f: Focus) {
  if (f === "all") return text;
  return text.split("\n").filter((l) => {
    if (!l.startsWith("- ") || /^- (단지|지역):/.test(l)) return true;
    const kind = /주변 시설/.test(l) ? "region" : /^- 단지 정보/.test(l) ? "complex" : "price";
    return kind === f;
  }).join("\n");
}
const FOCUS_SUBJECT: Record<Focus, string> = {
  all: "단지 특징 · 실거래 시세 · 주변 생활 여건을 고르게 다루는 종합 기사. 단지 → 시세 → 지역 순서로 문단을 나눠, 셋 다 비중 있게 쓴다",
  complex: "단지 정보 기사 — 세대수·준공 연도·동 수·층·주차·용적률 같은 단지의 특징이 중심. 가격 이야기는 쓰지 않는다",
  price: "시세 정보 기사 — 실거래 내역(면적·층·시기별 매매·전세, 최고·최저, 신고가)이 중심. 주변 시설 이야기는 쓰지 않는다",
  region: "지역 정보 기사 — 교통(역)·편의시설(마트·병원)·학교 같은 생활 여건이 중심. 역·학교·마트를 생활과 이어지게 묶어 쓰고, 가격 이야기는 쓰지 않는다",
};
const RULES = [
  "사실(숫자·가격·면적·주소·날짜·이름)은 [재료]에 있는 것만 쓴다. 재료에 없으면 쓰지 않는다 — 지어내지 않는다.",
  "AI 티 나는 말(다양한·최적의·완벽한·결론적으로·요약하자면·여러분)과 과장·단정·투자 권유('무조건 오른다' 등)를 쓰지 않는다.",
  "한 문장은 짧게, 쉬운 말로. 같은 말을 되풀이하지 않는다.",
  "개인정보(연락처·동호수·실명)를 넣지 않는다. 남의 기사 문장을 그대로 옮기지 않고 사실만 살려 새로 쓴다.",
  "단지·건물 이름은 브랜드와 동네를 띄어 쓰고, 영문 이름은 한글로.",
  "뉴스 기사는 객관적인 기사체로 쓰되 읽기 자연스럽게 쓴다(2026-11-09 사장님: 뉴스 기사는 객관적으로, 쇼츠·SNS는 부동산이 이야기하듯). 숫자 보고서처럼 한 문장에 숫자 하나씩 늘어놓지 말고, 관련 사실은 한 문장에 묶고, 문단은 [이야기]가 있으면 그 순서대로, 앞 문단과 물 흐르듯 이어지게 쓴다(이음말로 자연스럽게, 갑자기 다른 이야기로 튀지 않게).",
  "주변 시설은 거리 숫자를 그대로 쓰되 서로 빼서 차이를 계산하지 않는다('상도역이 530m 더 가깝다', '세 곳의 거리 차는 147m' 금지). '직선거리'·'보행거리'라는 말은 쓰지 않는다. 시설은 나열하기보다 생활과 이어지게 묶어 쓰되(예: '7호선 상도역과 신상도초등학교가 모두 단지에서 300m 안에 있다'), 자료에 없는 사실(걸어서 몇 분, 개발 계획, 시세 전망)과 주관적 평가는 쓰지 않는다.",
  "보고서·해석 말투를 쓰지 않는다 — '~가 드러난다', '~로 이어진다', '~로 구성됐다', '~수준이다', '~셈이다', '~가 뚜렷하다', '~로 보면', '숫자로 보면', '배치로 보면', '자료상', '제시된'. 사람이 말하듯 쓴다.",
  "단서·한계 문장('~로 묶기는 어렵다', '~판단할 수는 없다', '~설명하기는 어렵다', '~와는 다르다')은 숫자마다 붙이지 않는다. 오해를 막는 데 꼭 필요할 때 기사 전체에서 한 번만, 짧게.",
  "같은 뜻을 두 문장으로 나누지 않는다('20억8,000만원에 거래됐다. 종전 최고가를 넘었다' → '20억8,000만원에 거래되며 신고가를 기록했다'). 용적률·건폐율·소수점 비율처럼 사는 사람에게 와닿지 않는 숫자는 꼭 필요할 때만 쓴다.",
  "마지막 문단은 그래서 이 단지가 어떤 집인지 본문에서 확인한 사실로 짧게 정리한다.",
  "기사 전체에서 독자에게 하는 당부·훈계·요령을 쓰지 않는다(기사 형식이 '체크포인트'·'칼럼·해설'일 때 그 형식이 정한 자리만 예외) — '~할 필요가 있다', '구분해 볼 필요가 있다', '~봐야 한다', '~확인해야 한다', '~살펴볼 만하다', '~하는 편이 정확하다', '걸어 보라', '주의해야 한다' 같은 말 금지. 그 대신 전문가의 해석으로 쓴다 — 숫자를 비교해 무엇이 다른지, 그 차이가 무엇을 뜻하는지 단정 없이 짚는다(예: '같은 84㎡라도 4층과 12층 거래가 4,000만 원 벌어졌다', '전세가율은 ○%로 앞 기간보다 낮아졌다'). 문단은 사실·숫자·해석으로 끝낸다.",
  "기사 끝에 '본 기사(칼럼)는 ○○ 보도·자료를 바탕으로 작성했다' 같은 작성 경위 문장, 원문 언론사·포털 이름, 원문 게재 날짜·시각을 쓰지 않는다. 기사는 마지막 내용 문단으로 끝낸다.",
];

/** AI 답(JSON) 읽기 — 웹 창에서 복사한 답도 (```json 상자 · 둥근 따옴표 · 끝 쉼표 · 문자열 속 줄바꿈 · 앞뒤 설명을 견딘다, 2026-11-03 사장님) */
export function parseArticleDraft(raw: string): Omit<ArticleDraft, "photos"> | null {
  let t = String(raw || "").replace(/```(?:json)?/gi, "").replace(/\uFEFF/g, "");
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  t = t.slice(a, b + 1);
  const tries = [
    (x: string) => x,
    (x: string) => x.replace(/,\s*([}\]])/g, "$1"),
    (x: string) => x.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/,\s*([}\]])/g, "$1"),
    // 문자열 안의 진짜 줄바꿈 → \n (웹 화면에서 복사하면 생긴다)
    (x: string) => {
      let out = "", inStr = false, esc = false;
      for (const ch of x.replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, "$1")) {
        if (inStr) {
          if (esc) { esc = false; out += ch; continue; }
          if (ch === "\\") { esc = true; out += ch; continue; }
          if (ch === '"') { inStr = false; out += ch; continue; }
          if (ch === "\n" || ch === "\r") { out += ch === "\n" ? "\\n" : ""; continue; }
          out += ch;
        } else { if (ch === '"') inStr = true; out += ch; }
      }
      return out;
    },
  ];
  for (const f of tries) {
    try {
      const j = JSON.parse(f(t)) as Partial<ArticleDraft> & { paragraphs?: ({ heading?: string; text?: string } | string)[] };
      const paragraphs = (j.paragraphs || []).map((p) => (typeof p === "string" ? { heading: "", text: p } : { heading: String(p?.heading || "").trim(), text: String(p?.text || "").trim() })).filter((p) => p.text);
      if (!j.title || !paragraphs.length) continue;
      return { title: String(j.title).trim(), subtitles: (j.subtitles || []).map(String).filter(Boolean).slice(0, 3), paragraphs, keywords: (j.keywords || []).map(String).filter(Boolean).slice(0, 10) };
    } catch { /* 다음 방법 */ }
  }
  return null;
}

/** 작업 중 점점점 (2026-11-03 사장님: "작업시 흰색 점점점") */
function Dots({ color = "#fff" }: { color?: string }) {
  return (
    <span style={{ display: "inline-flex", gap: 4, marginLeft: 8, verticalAlign: "middle" }} aria-hidden>
      <style>{`@keyframes gsDot{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}`}</style>
      {[0, 1, 2].map((i) => <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: color, animation: `gsDot 1.2s ${i * 0.18}s infinite ease-in-out` }} />)}
    </span>
  );
}

/** 웹 — 앱의 "내 계정(무료·수동)" 안내 창과 같은 모양 (어두운 창 · 1·2 설명 · 단추 둘 · 걸린 시간 · Esc 로 멈춤) */
function WebAiOverlay({ name, msg, onReopen, onPaste, onStop }: { name: string; msg?: string; onReopen: () => void; onPaste: () => void; onStop: () => void }) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setSec((x) => x + 1), 1000);
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onStop(); };
    window.addEventListener("keydown", k);
    return () => { window.clearInterval(t); window.removeEventListener("keydown", k); };
  }, [onStop]);
  const gb: React.CSSProperties = { height: 34, padding: "0 12px", borderRadius: 6, border: "1px solid #475569", background: "#1e293b", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" };
  // 오른쪽 AI 창이 가운데 안내를 덮으니 그 왼쪽 빈 자리 가운데에 (2026-11-06 사장님: "가려짐") — 뉴스·SNS자동화 안내 창과 같은 셈
  const [dock] = useState(dockArea);
  const leftRoom = dock.x > 420 ? dock.x : 0;
  const boxW = leftRoom ? Math.min(600, leftRoom - 40) : 600;
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(10,14,20,.62)", display: "flex", alignItems: "center", justifyContent: leftRoom ? "flex-start" : "center", padding: 20, paddingLeft: leftRoom ? Math.max(20, (leftRoom - boxW) / 2) : 20 }}>
      <div style={{ position: "relative", width: boxW, maxWidth: "100%", background: "#16202b", color: "#e5e7eb", borderRadius: 14, padding: "26px 30px 20px", boxShadow: "0 20px 60px rgba(0,0,0,.35)", textAlign: "center" }}>
        <button type="button" onClick={onStop} title="멈추기 (Esc)" style={{ position: "absolute", top: 12, right: 14, border: 0, background: "none", color: "#cbd5e1", fontSize: 20, cursor: "pointer" }}>×</button>
        <div style={{ fontSize: 18.5, fontWeight: 800, color: "#fff", marginBottom: 14 }}>{name} 내 계정(무료·수동)으로 기사 초안을 쓰고 있습니다<Dots /></div>
        <div style={{ textAlign: "left", lineHeight: 1.75, fontSize: 14, maxWidth: 520, margin: "0 auto" }}>
          <b>1.</b> 질문을 복사해 두고 오른쪽 작은 창에 <b>{name}</b>을(를) 열었어요. 입력칸에 <b>붙여 넣기(Ctrl+V)</b> 하고 보내세요.<br />
          <b>2.</b> 답이 다 나오면 답 안의 <b>코드 상자 오른쪽 위 [복사]</b>를 누르고 이 창으로 돌아오세요 — 알아서 가져와요.
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
          <button type="button" onClick={onReopen} style={gb}>질문 다시 복사하고 {name} 열기</button>
          <button type="button" onClick={onPaste} style={gb}>복사한 답 가져오기</button>
        </div>
        {msg && <div style={{ marginTop: 10, color: "#fbbf24", fontSize: 13 }}>{msg}</div>}
        <div style={{ marginTop: 12, fontSize: 24, fontWeight: 800, color: "#60a5fa" }}>{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, "0")}</div>
        <div style={{ marginTop: 6, fontSize: 12, color: "#94a3b8" }}>급할 때는 오른쪽 위 × 나 Esc 키로 멈춰요</div>
      </div>
    </div>,
    document.body,
  );
}

/** 흰 막 위의 큰 점 세 개 — 뉴스·SNS자동화의 "분석·캡처 중" 과 같은 모양 */
function BigDots() {
  return (
    <span style={{ display: "inline-flex", gap: 7 }} aria-hidden>
      <style>{`@keyframes gsBigDot{0%,80%,100%{opacity:.3;transform:scale(.8)}40%{opacity:1;transform:scale(1.15)}}`}</style>
      {[0, 1, 2].map((i) => <span key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: NAVY, animation: `gsBigDot 1.2s ${i * 0.18}s infinite ease-in-out` }} />)}
    </span>
  );
}

export default function ArticleAiTool({ onDraft, hasContent, noVacancy = false, noGongsil = false }: { onDraft: (d: ArticleDraft) => void; hasContent: () => boolean; /** 자유 글쓰기 — 매물 소개·공실 고르기 없이 (2026-11-05 사장님) */ noVacancy?: boolean; /** 뉴스칼럼에서 온 기사쓰기 — 매물 소개·공실뉴스 없이 (2026-11-06 사장님) */ noGongsil?: boolean }) {
  const [src, setSrc] = useState<Src>(noVacancy || noGongsil ? "market" : "vacancy");
  useEffect(() => { if (noGongsil && (src === "vacancy" || src === "gongsil")) setSrc("market"); }, [noGongsil]); // eslint-disable-line react-hooks/exhaustive-deps
  // 어떤 이야기로 — 재료마다 따로 기억 (사장님이 고른 것이 있으면 그대로, 없으면 단지는 분석 뒤 어울리는 것으로)
  const [storyPick, setStoryPick] = useState<Record<string, string>>({});
  const [kind, setKind] = useState("news"); // 뉴스 기사·공실뉴스·자유 주제의 기사 스타일 (그대로)
  const [tone, setTone] = useState("");
  const [hook, setHook] = useState("");
  const [len, setLen] = useState("normal");
  const [more, setMore] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  // 재료
  const [vacs, setVacs] = useState<{ id: string; label: string }[] | null>(null);
  const [vacId, setVacId] = useState("");
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ id: string; label: string }[]>([]);
  const [pick, setPick] = useState<{ id: string; label: string } | null>(null);
  const [newsUrl, setNewsUrl] = useState("");
  // 가져온 뉴스 — [지금 보는 뉴스 가져오기] · 주소 [가져오기] (2026-11-03 사장님: 네이버에서 가져오고 지금 보는 뉴스도)
  const [news, setNews] = useState<News | null>(null);
  const [newsBusy, setNewsBusy] = useState(false);
  const takeNews = async (how: "url" | "grab") => {
    const c = bridge()?.column;
    setErr(""); setNewsBusy(true);
    try {
      // 웹 — 기사 주소를 서버가 읽어 온다 (2026-11-03 사장님: 웹도 앱과 같이)
      if (!c) {
        if (how === "grab") throw new Error("기사 주소를 붙여 넣고 [가져오기]를 눌러 주세요.");
        const r = await writingFetchNews(newsUrl.trim());
        if (!r.success) throw new Error(r.error);
        setNews(r.data); setNewsUrl(r.data.url);
        return;
      }
      const n = how === "grab" ? await c.grabNews!() : await c.fetchNews(newsUrl.trim());
      setNews(n);
      if (n.url) setNewsUrl(n.url);
    } catch (e) { setErr((e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, "")); }
    finally { setNewsBusy(false); }
  };
  const [topic, setTopic] = useState("");
  // 지역 시세 — 시군구·동·종류·기간 (고른 것은 기억)
  const [mkt, setMkt] = useState<"complex" | "area">("complex");
  // 무엇을 중심으로 (2026-11-06 사장님: 단지 정보 · 시세 정보 · 지역 정보 · 종합) — 고른 중심의 재료만 AI 에게 (섞이지 않게)
  const storyList = (STORIES[src] || []).filter((x) => !(src === "market" && mkt === "area" && x.id === "complex")); // 지역(구·동)은 단지 정보 없음
  const story: Story | null = storyList.find((x) => x.id === storyPick[src]) || storyList[0] || null; // 단지/지역/시세 · 매물 소개만
  const focus: Focus = src === "market" && story ? (story.id as Focus) : "all"; // 단지는 고른 중심(종합·단지·시세·지역) 그대로
  useEffect(() => { if (focus === "region" && len === "long") setLen("normal"); }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  const [lawd, setLawd] = useState("");
  const [dong, setDong] = useState("");
  const [dongs, setDongs] = useState<string[]>([]);
  const [kinds, setKinds] = useState<string[]>(["apt"]);
  const [months, setMonths] = useState(1);
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem("gs-area-pick") || "null");
      if (v?.lawd && LAWD_NAMES[v.lawd]) { setLawd(v.lawd); setDong(v.dong || ""); writingAreaDongs(v.lawd).then((r) => r.success && setDongs(r.data)).catch(() => {}); }
      if (Array.isArray(v?.kinds) && v.kinds.length) setKinds(v.kinds);
      if ([1, 3, 6, 12].includes(v?.months)) setMonths(v.months);
      if (v?.mkt === "area") setMkt("area");
    } catch { /* */ }
  }, []);
  useEffect(() => { try { localStorage.setItem("gs-area-pick", JSON.stringify({ mkt, lawd, dong, kinds, months })); } catch { /* */ } }, [mkt, lawd, dong, kinds, months]);
  const lawds = Object.entries(LAWD_NAMES).sort((a, b) => a[1].localeCompare(b[1], "ko"));

  useEffect(() => {
    if ((src === "vacancy") && vacs === null) writingMyVacancies().then((r) => { const l = r.success ? r.data : []; setVacs(l); })  // 저절로 첫 공실을 고르지 않는다 — 회원이 골라야 분석 (2026-11-03 사장님).catch(() => setVacs([]));
    if (src === "gongsil" && !found.length) writingArticles("").then((r) => r.success && setFound(r.data)).catch(() => {});
    setPick(null); setErr(""); if (src !== "gongsil") setFound([]);
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps

  // [공실열람에서 고르기] — 단지 창 [이 단지로 대본 쓰기]가 보내 주는 단지
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== "gs-apt-pick") return;
      setSrc("market");
      setTimeout(() => setPick({ id: String(e.data.id), label: `${e.data.name} · ${e.data.dong || ""}` }), 0);
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);
  const openGongsil = () => { window.open(`${window.location.origin}/gongsil?aptPick=article`, "gs-apt-pick", "width=1400,height=900"); };

  const search = async () => {
    setErr("");
    const r = src === "market" ? await writingSearchComplexes(q) : await writingArticles(q);
    if (!r.success) return setErr(r.error);
    setFound(r.data);
    if (!r.data.length) setErr("찾지 못했어요. 이름을 바꿔 보세요.");
  };

  /* ── ① 먼저 분석 (자료 모으기 · 공실뉴스 화면 캡처) → ② 확인 → ③ 쓰기 (2026-11-03 사장님: 한 번에 하니 버벅거림) ──
   *  공실·단지·기사를 고르면 저절로 분석한다. 분석해 둔 재료로 문체만 바꿔 여러 번 다시 쓸 수 있다 */
  type Shot = { url: string; thumb: string; caption: string };
  /** 실제 사진 = 등록 사진 · 로드뷰 — 분석이 끝났을 때 처음 대표로 앞에 세운다 (캡처 화면도 회원이 대표로 고를 수 있다) */
  const isReal = (x: Shot) => !x.caption.startsWith("[") || x.caption.startsWith("[현장 로드뷰]");
  const kindOf = (x: Shot) => (!x.caption.startsWith("[") ? "등록 사진" : x.caption.startsWith("[현장 로드뷰]") ? "로드뷰" : x.caption.startsWith("[공실열람") ? "공실열람" : x.caption.startsWith("[공실뉴스 실매물") || x.caption.startsWith("[공실열람 경매") || x.caption.startsWith("[공실열람 공매") ? "공실열람 검증" : x.caption.startsWith("[위치 지도]") ? "지도" : x.caption.startsWith("[실거래가]") ? "실거래가" : "화면");
  /** 맨 앞(대표)이 캡처 화면이면 첫 실제 사진을 앞으로 */
  const fixFront = (l: Shot[]) => {
    if (!l.length || isReal(l[0])) return l;
    const k = l.findIndex(isReal);
    return k < 0 ? l : [l[k], ...l.filter((_, j) => j !== k)];
  };
  type Analysis = { key: string; subject: string; /** 단지 이름·지역 이름 (단지/지역/시세) */ name?: string; mats: string[]; summary: string[]; complex: { id: string; name: string } | null; shots: Shot[] };
  const [ana, setAna] = useState<Analysis | null>(null);
  const [anaBusy, setAnaBusy] = useState("");
  const [capBusy, setCapBusy] = useState(false);
  const anaKey = src === "vacancy" ? `v:${vacId}` : src === "market" ? (mkt === "area" ? `a:${lawd}:${dong}:${[...kinds].sort().join(",")}:${months}` : `m:${pick?.id || ""}`) : src === "gongsil" ? `g:${pick?.id || ""}` : src === "news" ? `n:${news?.url || news?.title || ""}` : `t:${topic.trim()}`;
  const errOf = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, "");
  /** 웹 — 실제 화면 그대로 여러 장 (우리동네부동산 단지 화면 등 (공실뉴스 머리줄·단지 시세 창·가격 지도, 2026-11-09 사장님)
   *  예전엔 시세 그래프·실거래가를 그림으로 다시 그려 어색했다 (글자 어긋남·지도 없음) */
  const webShots = async (complex: { id: string; name: string }): Promise<Shot[]> => {
    // 다섯 장 — 단지 화면 · 시세 창 확대 · 로드뷰 · 스카이뷰 · 주변 지도. 순서는 [무엇을 중심으로]에 따라 (맨 앞이 대표)
    const { captureComplexScreens } = await import("./realScreenShot");
    return captureComplexScreens(complex, focus, (t) => setAnaBusy(t)).catch(() => []);
  };
  const capture = async (complex: { id: string; name: string }, only?: string[]) => {
    const cap = bridge()?.video?.capturePage;
    if (!cap) return webShots(complex);
    const out: Shot[] = [];
    // 공실 기사 사진(공실열람 검증·지도·로드뷰)과 같은 모양 — 공실열람 화면 · 로드뷰 · 실거래가 (2026-11-03 사장님)
    const o = window.location.origin, id = encodeURIComponent(complex.id);
    const SH = [
      { what: "공실열람 단지 시세 화면", title: complex.name, url: `${o}/gongsil?apt=${id}`, opt: { mode: "screen" as const, waitText: complex.name, settle: 3500, crop: "aptPanel" }, caption: `[공실열람 단지 시세] 공실뉴스 공실열람에서 본 '${complex.name}' 실거래 시세 (자료: 국토교통부 실거래가)` },
      { what: "지도", title: `지도 · ${complex.name}`, url: `${o}/apt-capture/${id}?part=map`, opt: { mode: "screen" as const, settle: 3000 }, caption: `[위치 지도] ${complex.name} 위치 및 주변 환경 (자료: 위치정보 지도)` },
      { what: "로드뷰", title: `로드뷰 · ${complex.name}`, url: `${o}/apt-capture/${id}?part=roadview`, opt: { mode: "screen" as const, waitSel: '[data-roadview-status="ready"]', settle: 3500 }, caption: `[현장 로드뷰] ${complex.name} 진입로 및 가로변 전경 (자료: 로드뷰)` },
      { what: "실거래가", title: `실거래가 · ${complex.name}`, url: `${o}/apt-capture/${id}?part=trades`, opt: { mode: "head" as const }, caption: `[실거래가] ${complex.name} 최근 실거래 내역 (자료: 국토교통부 실거래가)` },
    ];
    const list = only ? SH.filter((x) => only.includes(x.what)) : SH;
    for (const [n, sh] of list.entries()) {
      setAnaBusy(`${sh.what}을 캡처하는 중… (${n + 1}/${list.length})`);
      // 공실열람·지도·로드뷰는 화면 그대로 한 장 (자르지 않음), 로드뷰는 다 뜰 때까지 기다린다 (2026-11-03 사장님 "캡쳐가 온전하게")
      const l = await cap(sh.url, { ...sh.opt, title: sh.title, credit: "" }).catch(() => []);
      const it = l[0] as unknown as { url: string; thumb?: string } | undefined;
      if (it?.url) out.push({ url: it.url, thumb: it.thumb || it.url, caption: sh.caption });
    }
    return out;
  };
  const analyze = async () => {
    const key = anaKey;
    setErr(""); setDone(false); setAnaBusy("공실뉴스 자료를 모으는 중…");
    try {
      const mats: string[] = [], summary: string[] = [];
      let subject = "", name = "", complex: { id: string; name: string } | null = null;
      let regPhotos: Shot[] = [];
      let snsShots = false; // 매물 소개를 뉴스·SNS자동화 방식으로 찍었다 — 단지 화면은 실거래가만 더한다
      if (src === "vacancy") {
        const r = await writingVacancyFacts(vacId);
        if (!r.success) throw new Error(r.error);
        mats.push(r.data.text); subject = `${r.data.title} 매물 소개 기사`;
        summary.push(...r.data.text.split("\n").slice(1, 5).map((l) => l.replace(/^- /, "")));
        if (r.data.complexId) { const c = await writingComplexFacts(r.data.complexId); if (c.success) { mats.push(c.data.text); complex = { id: r.data.complexId, name: c.data.title }; } }
        // 이미 등록한 공실 사진 — 기사 사진 맨 앞에 (첫 장이 대표, 2026-11-03 사장님)
        const nm = r.data.title.replace(/^공실 \d+\s*/, "") || r.data.title;
        regPhotos = r.data.photos.map((url, i) => ({ url, thumb: url, caption: i === 0 ? `${nm} 현장 실물 전경 (자료: 공실뉴스)` : `${nm} 현장 실물 ${i + 1} (자료: 공실뉴스)` }));
        // 앱 — 뉴스·SNS자동화와 같은 분석: 공실열람 상세를 열어 등록 사진 + [공실열람 검증]·[지도]·[로드뷰] 칸을 잘라 찍는다
        const b = bridge();
        if (b?.vacancy?.analyze && b.video?.vacancy) {
          const off = b.vacancy.onProgress?.((t) => setAnaBusy(t)) || (() => {});
          try {
            const an = await b.vacancy.analyze(vacId);
            const got = await b.video.vacancy(vacId);
            const SCREEN = ["proof", "map", "roadview"];
            const caps = an.media.filter((m) => m.kind !== "ai");
            const photoCaps = caps.filter((m) => !SCREEN.includes(m.kind)), shotCaps = caps.filter((m) => SCREEN.includes(m.kind));
            const items = [
              ...got.photos.map((x, i) => ({ url: x.url, thumb: x.url, caption: photoCaps[i]?.caption || (i === 0 ? `${nm} 현장 실물 전경 (자료: 공실뉴스)` : `${nm} 현장 실물 ${i + 1} (자료: 공실뉴스)`) })),
              ...got.shots.map((x, i) => ({ url: x.url, thumb: x.url, caption: shotCaps[i]?.caption || nm })),
            ];
            if (items.length) { regPhotos = items; snsShots = true; }
          } catch { /* 앱 분석이 안 되면 등록 사진만 */ }
          finally { off(); }
        }
      } else if (src === "market" && mkt === "area") {
        setAnaBusy("이 지역 실거래를 모으는 중… (빌라가 많으면 20초쯤)");
        const r = await writingAreaFacts(lawd, dong, kinds, months);
        if (!r.success) throw new Error(r.error);
        const ft = r.data.text; // 거르지 않고 다 — 이야기에 맞게는 질문 만들 때 거른다
        mats.push(ft); complex = r.data.complex; name = r.data.title.replace(/ 실거래 현황$/, "");
        subject = `${r.data.title.replace(/ 실거래 현황$/, "")} 부동산 실거래 시장 기사 (최근 ${months === 12 ? "1년" : `${months}개월`} 흐름 · 앞 기간 비교 · 신고가 · 전세가율). 공실 매물 홍보 기사가 아니다`;
        summary.push(...ft.split("\n").slice(1, 5).map((l) => l.replace(/^- /, "")));
      } else if (src === "market") {
        const c = await writingComplexFacts(pick!.id);
        if (!c.success) throw new Error(c.error);
        const ft = c.data.text;
        mats.push(ft); subject = `${c.data.title} 실거래 시세 기사`; name = c.data.title; complex = { id: pick!.id, name: c.data.title };
        summary.push(...ft.split("\n").slice(1, 5).map((l) => l.replace(/^- /, "")));
      } else if (src === "gongsil") {
        const a = await writingArticleFacts(pick!.id);
        if (!a.success) throw new Error(a.error);
        mats.push(a.data.text); subject = `공실뉴스 기사「${a.data.title}」를 바탕으로 한 후속·해설 기사`; summary.push(a.data.title);
      } else if (src === "news") {
        const n = news!;
        mats.push(`[원문 뉴스 — ${n.publisher || "원문 기사"}${n.publishedAt ? `, ${n.publishedAt}` : ""}]\n- 제목: ${n.title}\n- 본문: ${String(n.body || "").slice(0, 4000)}`);
        // 출처·언론사·게재 시각 문장은 쓰지 않는다 (2026-11-03 사장님: "본 칼럼은 ○○에 ○시 게재된 … 바탕으로 작성했다" 같은 문장 나오면 안 됨)
        subject = `뉴스「${n.title}」의 사실을 바탕으로 새로 쓰는 기사. 원문 문장을 옮기지 않는다. "이 기사는 ○○ 보도를 바탕으로 작성했다", "○○에 따르면 ○일 ○시 게재" 처럼 원문 언론사·포털·게재 시각·작성 경위를 밝히는 문장은 절대 쓰지 않는다`;
        summary.push(n.title);
      } else subject = topic.trim();
      const base: Analysis = { key, subject, name, mats, summary, complex, shots: regPhotos };
      setAna(base);
      if (complex) { const shots = await capture(complex, snsShots ? ["실거래가"] : undefined); setAna((a) => (a && a.key === key ? { ...a, shots: fixFront([...regPhotos, ...shots]) } : a)); }
    } catch (e) { setErr(errOf(e)); setAna(null); }
    finally { setAnaBusy(""); }
  };
  const recapture = async () => {
    if (!ana?.complex) return;
    setCapBusy(true);
    // 매물 소개(뉴스·SNS자동화 방식으로 찍은 것)는 단지 실거래가만 다시 — 공실 화면은 [분석] 때 찍은 그대로
    const sns = ana.shots.some((x) => x.caption.startsWith("[공실뉴스 실매물"));
    const shots = await capture(ana.complex, sns ? ["실거래가"] : undefined);
    setAna((a) => (a ? { ...a, shots: fixFront([...a.shots.filter((x) => (sns ? !x.caption.startsWith("[실거래가]") : !x.caption.startsWith("["))), ...shots]) } : a)); // 등록 사진은 그대로, 캡처만 새로
    setAnaBusy(""); setCapBusy(false);
  };
  const canAna = src === "vacancy" ? Boolean(vacId) : src === "news" ? Boolean(news) : src === "market" && mkt === "area" ? Boolean(lawd && kinds.length) : src === "topic" ? false : Boolean(pick);
  // 고르면 저절로 분석 (자유 주제는 분석할 것이 없다)
  useEffect(() => {
    if (src === "topic") { setAna(null); return; }
    if (!canAna) { setAna(null); return; }
    if (ana?.key === anaKey) return;
    // 단지/지역/시세는 저절로 하지 않는다 — 단지·중심을 고르고 [분석하기] (2026-11-06 사장님)
    if (src === "market") { setAna(null); return; }
    void analyze();
  }, [anaKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const ready = src === "topic" ? Boolean(topic.trim()) : Boolean(ana && ana.key === anaKey) && !anaBusy;

  /* ── 쓸 AI (대본 작성과 같이 기억) · 질문 만들기 · 답 읽기 ── */
  const [aiSel, setAiSel, aiList] = useAiPick();
  const aiUse = effectiveAi(aiSel, aiList);
  const AI_ORDER = ["chatgpt", "gemini", "claude"];
  const aiOpts = aiList.filter((x) => x.canWrite && x.ready !== false).sort((x, y) => AI_ORDER.indexOf(x.id) - AI_ORDER.indexOf(y.id)).flatMap((x) => [
    { c: { provider: x.id, mode: "account" as const }, label: x.name, ok: Boolean(x.accountOk || x.method === "manual") },
    { c: { provider: x.id, mode: "api" as const }, label: `${x.name} API`, ok: Boolean(x.keyHas) },
  ]).filter((o) => o.ok || o.c.mode === "account");
  const aiDef = aiList.find((x) => x.isWriter);
  const [webAi, setWebAiState] = useState("chatgpt");
  useEffect(() => {
    const read = () => { try { const v = localStorage.getItem("gs-web-ai"); if (v) setWebAiState(v); } catch { /* */ } };
    read();
    window.addEventListener("gs-web-ai", read); // [AI 설정]에서 바꾸면 바로
    return () => window.removeEventListener("gs-web-ai", read);
  }, []);
  const setWebAi = (v: string) => { setWebAiState(v); try { localStorage.setItem("gs-web-ai", v); } catch { /* */ } };
  const [isApp, setIsApp] = useState(false);
  const installer = useStudioInstaller();
  const [installGuide, setInstallGuide] = useState(false);
  useEffect(() => { setIsApp(Boolean(bridge()?.write)); }, []);
  const aiCur = aiUse || (aiDef ? { provider: aiDef.id, mode: aiDef.mode === "api" ? "api" : "account" } : null);
  const curAnalysis = (): Analysis | null => (src === "topic" ? (topic.trim() ? { key: anaKey, subject: topic.trim(), mats: [], summary: [], complex: null, shots: [] } : null) : ana && ana.key === anaKey ? ana : null);
  // 단지/지역/시세 — 고른 중심으로 주제를 바꾼다 (지역 종합·시세는 원래 시장 기사 주제 그대로)
  const subjectOf = (a: Analysis) => {
    if (src !== "market" || !a.name) return a.subject;
    if (mkt === "area" && focus !== "region") return a.subject;
    return `${a.name}${mkt === "area" ? " (대표 단지 주변)" : ""} — ${FOCUS_SUBJECT[focus]}. 공실 매물 홍보 기사가 아니다`;
  };
  const buildPrompt = (a: Analysis) => {
    const k = KINDS.find((x) => x.id === kind)!, hk = HOOKS.find((x) => x.id === hook), ln = LENGTHS.find((x) => x.id === len)!;
    return [
      "당신은 이 동네에서 오래 일해 지역 시장을 잘 아는 지역 부동산 전문가다(글에 사무소·중개 이야기는 쓰지 않는다). 아래 자료로 기사 한 편을 쓴다. 전문가답게 숫자를 읽고 그 뜻을 자신 있게 짚되, 근거는 자료에 있는 것만 쓴다.",
      `[주제] ${subjectOf(a)}`,
      story
        ? `[이야기] ${story.name} — ${story.desc}. 문단 순서: ${story.flow}${story.heads ? " (문단마다 heading 에 소제목을 넣는다)" : " (heading 은 빈 글자로 둔다)"}`
        : `[기사 형식] ${k.name} — ${k.prompt}${"heads" in k && k.heads ? " (문단마다 heading 에 소제목을 넣는다)" : " (heading 은 빈 글자로 둔다)"}`,
      story ? `[제목] ${story.title}. 클릭하고 싶게, 과장 없이` : hk ? `[제목] ${hk.prompt}` : "[제목] 핵심을 담아 클릭하고 싶게, 과장 없이",
      `[분량] 본문 ${ln.chars}`,
      `[재료 — 사실은 여기 있는 것만]\n${a.mats.length ? a.mats.map((m) => (src === "market" ? focusMats(m, focus) : m)).join("\n\n") : "(자료 없음 — 일반적인 정보만, 숫자·이름을 지어내지 말 것)"}`,
      more.trim() ? `[요청 — 꼭 반영] ${more.trim()}` : "",
      `[규칙]\n${RULES.map((r, i) => `${i + 1}. ${r}`).join("\n")}`,
      "[쓰는 방법] 다 쓴 뒤 스스로 점검하고 고친 최종본만 낸다: 제목이 끌리는가 · 첫 문단에 핵심이 있는가 · 사실이 재료에 있는 것뿐인가 · 문장이 짧은가.",
      '[답 형식 — 설명 없이 JSON 하나만, ```json 상자에] {"title":"제목","subtitles":["부제 1","부제 2","부제 3"],"paragraphs":[{"heading":"소제목(기사 형식이 소제목을 쓰는 형식일 때만, 아니면 빈 글자)","text":"문단"}],"keywords":["키워드1","키워드2","키워드3","키워드4","키워드5"]}',
    ].filter(Boolean).join("\n\n");
  };
  /** AI 답 → 기사 칸 (사진은 분석해 둔 것) */
  const applyRaw = (raw: string, a: Analysis | null) => {
    const d = parseArticleDraft(raw);
    if (!d) throw new Error("AI 답을 읽지 못했어요. AI 창에서 답을 [복사]한 뒤 [📋 AI 답 붙여넣기]로 넣어 주세요.");
    const shots = a?.shots || [];
    const np = d.paragraphs.length;
    // 대표 사진(맨 앞, 실제 사진)은 본문 맨 앞에 — after 0 (2026-11-03 사장님 "대표사진은 기사 맨 앞에")
    const cover = shots.length ? shots[0] : null;
    const rest = cover ? shots.slice(1) : shots;
    const photos = [
      ...(cover ? [{ url: cover.url, caption: cover.caption, after: 0 }] : []),
      ...rest.map((x, i) => ({ url: x.url, caption: x.caption, after: Math.min(np, Math.floor((i * np) / Math.max(1, rest.length)) + 1) })),
    ];
    onDraft({ ...d, photos });
    setDone(true);
  };

  /* 웹 — 서버 AI 는 쓰지 않는다. 질문을 복사해 회원의 ChatGPT·Gemini·Claude 를 새 탭에 열고, 돌아오면 클립보드의 답을 읽는다 */
  const [webWait, setWebWait] = useState<{ prompt: string; a: Analysis } | null>(null);
  const webWaitRef = React.useRef(webWait);
  webWaitRef.current = webWait;
  const webTry = async (quiet: boolean) => {
    const w = webWaitRef.current;
    if (!w) return;
    let raw = "";
    try { raw = await navigator.clipboard.readText(); } catch { if (!quiet) setErr("클립보드를 읽지 못했어요. 브라우저가 묻는 [허용]을 누르거나 [AI 답 붙여넣기]를 눌러 주세요."); return; }
    if (!raw.trim() || raw.trim() === w.prompt.trim()) { if (!quiet) setNote("아직 질문이 복사돼 있어요. AI 답 아래 복사 단추를 누르고 돌아오세요."); return; }
    if (!parseArticleDraft(raw)) { if (!quiet) setNote("복사한 글이 기사 답 모양이 아니에요. 답이 다 나온 뒤 답 아래 복사 단추를 눌러 주세요."); return; }
    setWebWait(null); setBusy(""); setNote("");
    try { applyRaw(raw, w.a); } catch (e) { setErr(errOf(e)); }
  };
  useEffect(() => {
    if (!webWait) return;
    const on = () => { if (document.visibilityState === "visible") window.setTimeout(() => void webTry(true), 250); };
    window.addEventListener("focus", on);
    document.addEventListener("visibilitychange", on);
    return () => { window.removeEventListener("focus", on); document.removeEventListener("visibilitychange", on); };
  }, [webWait]); // eslint-disable-line react-hooks/exhaustive-deps

  const [guide, setGuide] = useState(false); // [? 쓰는 법]
  const webReopen = async () => {
    const w = webWaitRef.current;
    if (!w) return;
    const site = WEB_AI.find((x) => x.id === webAi) || WEB_AI[0];
    try { await navigator.clipboard.writeText(w.prompt); } catch { /* */ }
    openDocked(site.url, "gs-ai-window"); // 오른쪽에 작은 창으로 (2026-11-05 사장님: "우측에 작게 띄워줘")
    setNote("질문을 다시 복사했어요. 입력칸에 Ctrl+V 하고 보내세요.");
  };
  const write = async () => {
    const b = bridge();
    if (webWait) { setWebWait(null); setBusy(""); setNote(""); return; } // 그만두기
    if (!b?.write) {
      const a = curAnalysis();
      if (!a) return;
      if (hasContent() && !confirm("지금 쓴 제목·본문을 AI 초안으로 바꿀까요?")) return;
      const prompt = buildPrompt(a);
      const site = WEB_AI.find((x) => x.id === webAi) || WEB_AI[0];
      try { await navigator.clipboard.writeText(prompt); } catch { return setErr("질문을 복사하지 못했어요. [질문 복사]를 눌러 주세요."); }
      openDocked(site.url, "gs-ai-window"); // 큰 새 탭 대신 오른쪽 작은 창 (2026-11-05 사장님)
      setErr(""); setDone(false); setNote("");
      setWebWait({ prompt, a });
      setBusy(`${site.name} 답을 기다리는 중`);
      return;
    }
    const a = curAnalysis();
    if (!a) return;
    if (hasContent() && !confirm("지금 쓴 제목·본문을 AI 초안으로 바꿀까요?")) return;
    setErr(""); setDone(false); setBusy("AI가 기사 초안을 쓰는 중… (1~2분)");
    const off = b.write.onProgress((t) => setBusy(t));
    try {
      const raw = await b.write.ask(buildPrompt(a), { json: true, busyLabel: "기사 초안을 쓰고 있습니다", ...(aiUse ? { provider: aiUse.provider, mode: aiUse.mode } : {}) });
      applyRaw(raw, a);
    } catch (e) {
      setErr(errOf(e));
    } finally { off(); setBusy(""); }
  };
  /** [📋 질문 복사] — ChatGPT·Gemini 창에 직접 붙여 넣어 묻기 */
  const copyQuestion = async () => {
    const a = curAnalysis();
    if (!a) return setErr("먼저 재료를 고르고 분석이 끝나야 해요.");
    try { await navigator.clipboard.writeText(buildPrompt(a)); setErr(""); setDone(false); setNote("질문을 복사했어요. AI 창에 붙여 넣고, 답을 [복사]한 뒤 [📋 AI 답 붙여넣기]를 누르세요."); } catch { setErr("복사하지 못했어요."); }
  };
  /** [📋 AI 답 붙여넣기] — AI 창에서 [응답 복사]한 답을 그대로 */
  const pasteAnswer = async () => {
    try {
      const raw = await navigator.clipboard.readText();
      if (!raw.trim()) return setErr("복사한 AI 답이 없어요. AI 창에서 답을 [복사]해 주세요.");
      if (hasContent() && !confirm("지금 쓴 제목·본문을 붙여 넣은 답으로 바꿀까요?")) return;
      setErr(""); setNote("");
      applyRaw(raw, curAnalysis());
    } catch (e) { setErr(errOf(e)); }
  };
  const [note, setNote] = useState("");
  // 기사 본문 칸에 AI 답을 그냥 Ctrl+V 해도 (NewsWriteForm 이 알려 준다) — 분석해 둔 사진까지 함께
  const pasteRef = React.useRef<(raw: string) => void>(() => {});
  pasteRef.current = (raw) => { try { setErr(""); setNote(""); applyRaw(raw, curAnalysis()); } catch (e) { setErr(errOf(e)); } };
  useEffect(() => {
    const on = (e: Event) => pasteRef.current(String((e as CustomEvent).detail || ""));
    window.addEventListener("gs-article-paste", on);
    return () => window.removeEventListener("gs-article-paste", on);
  }, []);

  /** 사진 순서 바꾸기 — 맨 앞(대표)에는 실제 사진만 */
  const dragFrom = React.useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const moveShot = (from: number, to: number) => {
    if (!ana || from === to) return;
    const l = [...ana.shots];
    const [x] = l.splice(from, 1);
    l.splice(to, 0, x);
    setAna({ ...ana, shots: l });
  };
  const working = Boolean(anaBusy) || capBusy;
  const [zoom, setZoom] = useState<number | null>(null);
  useEffect(() => {
    if (zoom === null) return;
    const n = ana?.shots.length || 0;
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(null);
      else if (e.key === "ArrowRight" && n) setZoom((z) => (z === null ? z : (z + 1) % n));
      else if (e.key === "ArrowLeft" && n) setZoom((z) => (z === null ? z : (z - 1 + n) % n));
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [zoom, ana?.shots.length]);
  /** 분석 결과 — 숫자 몇 줄 · 사진 (끌어서 순서, 맨 앞이 대표) · [다시 캡처]. 작업 중엔 흰 막 + 점점점 (뉴스·SNS자동화와 같은 모양) */
  const anaBox = () => (src !== "topic") && (anaBusy || ana) ? (
    <div style={{ position: "relative", flexShrink: 0, marginTop: 10, border: `1px solid ${ana && !working ? NAVY : LINE}`, borderRadius: 6, background: "#f7f9fc", padding: "10px 12px", minHeight: working ? 120 : undefined }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 800, color: NAVY }}>
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
        분석 {working ? <span style={{ fontWeight: 600, color: SUB }}>· 하는 중</span> : <span style={{ fontWeight: 600, color: "#16a34a" }}>· 끝 — 확인하고 아래에서 쓰세요</span>}
      </div>
      {ana && ana.summary.length > 0 && <div style={{ marginTop: 6, fontSize: 12, color: SUB, lineHeight: 1.6 }}>{ana.summary.slice(0, 4).map((l, i) => <div key={i} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l}</div>)}</div>}
      {ana && (ana.complex || ana.shots.length > 0) && (
        <div style={{ marginTop: 9 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: TEXT }}>사진 · 화면</span>
            <span style={{ fontSize: 11.5, color: DIM }}>기사에 들어갈 순서 · {ana.shots.length}장</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
            {ana.shots.map((x, i) => {
              const cover = i === 0;
              return (
                <div key={x.url} draggable
                  onDragStart={(e) => { dragFrom.current = i; e.dataTransfer.effectAllowed = "move"; }}
                  onDragOver={(e) => { e.preventDefault(); if (dragOver !== i) setDragOver(i); }}
                  onDragLeave={() => setDragOver((v) => (v === i ? null : v))}
                  onDrop={(e) => { e.preventDefault(); const f = dragFrom.current; dragFrom.current = null; setDragOver(null); if (f !== null) moveShot(f, i); }}
                  onDragEnd={() => { dragFrom.current = null; setDragOver(null); }}
                  title={`${x.caption}\n끌어서 순서를 바꿔요`}
                  style={{ position: "relative", minWidth: 0, background: "#fff", borderRadius: 6, overflow: "hidden", cursor: "grab",
                    border: `${cover || dragOver === i ? 2 : 1}px solid ${dragOver === i ? "#2563eb" : cover ? NAVY : LINE}` }}>
                  <img src={x.thumb} alt="" draggable={false} onClick={() => setZoom(i)} title="눌러서 크게 보기" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block", cursor: "pointer" }} />
                  <span style={{ position: "absolute", left: 4, top: 4, padding: "2px 6px", borderRadius: 4, background: cover ? NAVY : "rgba(17,24,39,.72)", color: "#fff", fontSize: 10.5, fontWeight: 800, whiteSpace: "nowrap" }}>
                    {cover ? `대표 · ${kindOf(x)}` : kindOf(x)}
                  </span>
                  <button type="button" onClick={() => setAna((a) => (a ? { ...a, shots: fixFront(a.shots.filter((_, k) => k !== i)) } : a))} title="이 사진 빼기"
                    style={{ position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: "50%", border: 0, background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 11, cursor: "pointer", lineHeight: 1 }}>✕</button>
                  <div style={{ padding: "4px 6px 5px", fontSize: 10.5, color: SUB, lineHeight: 1.35, height: 30, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{x.caption}</div>
                  {!cover && (
                    <button type="button" onClick={() => moveShot(i, 0)} title="이 사진을 대표 사진으로 (기사 맨 앞)"
                      style={{ position: "absolute", right: 4, bottom: 38, height: 20, padding: "0 6px", borderRadius: 4, border: 0, background: "rgba(255,255,255,.92)", color: NAVY, fontSize: 10.5, fontWeight: 800, cursor: "pointer" }}>대표로</button>
                  )}
                </div>
              );
            })}
            {!ana.shots.length && !working && <div style={{ fontSize: 12, color: DIM }}>캡처한 사진이 없어요</div>}
          </div>
          {/* 웹 — 앱 설치 안내는 없앴다 (2026-11-04 사장님: 앱으로 이동시키지 않는다) */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7 }}>
            <span style={{ fontSize: 11.5, color: DIM, flex: 1, lineHeight: 1.45 }}>끌어서 순서를 바꿔요 · 맨 앞이 대표 사진 · 대표 사진은 기사 맨 앞에 들어가요</span>
            {ana.complex && <button type="button" onClick={() => void recapture()} disabled={working} style={{ ...btn, height: 26, padding: "0 8px", fontSize: 12 }}>↻ 다시 캡처</button>}
          </div>
        </div>
      )}
      {/* 크게 보기 — ← → 로 넘기고 Esc·바깥 누르면 닫힘 */}
      {zoom !== null && ana && ana.shots[zoom] && createPortal(
        // 이미지만 크게 — 아무 데나 누르거나 Esc 로 닫힘 (← → 로 넘기기) (2026-11-03 사장님 "그냥 이미지만 크게")
        <div onClick={() => setZoom(null)} style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(15,23,42,.82)", display: "flex", alignItems: "center", justifyContent: "center", padding: 40, cursor: "pointer" }}>
          <img src={ana.shots[zoom].url} alt="" style={{ maxWidth: "min(60vw, 960px)", maxHeight: "65vh", objectFit: "contain", borderRadius: 6, boxShadow: "0 20px 60px rgba(0,0,0,.4)" }} />
        </div>,
        document.body,
      )}
      {/* 작업 중 — 흰 막 + 점점점 (2026-11-03 사장님: 뉴스·SNS자동화처럼) */}
      {working && (
        <div style={{ position: "absolute", inset: 0, borderRadius: 6, background: "rgba(255,255,255,.86)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, zIndex: 2 }}>
          <BigDots />
          <div style={{ fontSize: 14, fontWeight: 800, color: NAVY }}>분석·캡처 중…</div>
          {anaBusy && <div style={{ fontSize: 12, color: SUB, textAlign: "center", padding: "0 12px" }}>{anaBusy}</div>}
        </div>
      )}
    </div>
  ) : null;

  /* ── 모양 — 대본 작성 톤 ── */
  const head = (n: number, t: React.ReactNode) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 800, color: TEXT, marginBottom: 8 }}>
      <span style={{ width: 20, height: 20, borderRadius: "50%", background: NAVY, color: "#fff", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</span>{t}
    </div>
  );
  const chip = (on: boolean): React.CSSProperties => ({ height: 32, padding: "0 11px", borderRadius: 5, border: `1px solid ${on ? NAVY : "#d9dde3"}`, background: on ? NAVY : "#fff", color: on ? "#fff" : "#374151", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" });
  const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", height: 38, padding: "0 11px", borderRadius: 5, border: "1px solid #d9dde3", background: "#fff", color: TEXT, fontSize: 13.5, fontFamily: "inherit" };
  const btn: React.CSSProperties = { height: 38, padding: "0 12px", borderRadius: 5, border: "1px solid #d9dde3", background: "#fff", color: TEXT, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" };
  const dim = (t: string) => <span style={{ fontWeight: 600, color: DIM, fontSize: 12.5 }}>{t}</span>;
  const list = (rows: { id: string; label: string }[]) => (
    <div style={{ maxHeight: 180, overflowY: "auto", border: `1px solid ${LINE}`, borderRadius: 5, marginTop: 6 }}>
      {rows.map((x) => (
        <button key={x.id} type="button" onClick={() => setPick(x)}
          style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", border: 0, borderBottom: `1px solid ${LINE}`, background: pick?.id === x.id ? "#eef2fb" : "#fff", color: TEXT, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>{x.label}</button>
      ))}
    </div>
  );
  let n = 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: "#fff", color: TEXT }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 18px", borderBottom: `1px solid ${LINE}` }}>
        <span style={{ fontSize: 15, fontWeight: 800 }}>✍ 글쓰기 도구</span>{dim(noVacancy ? "AI 글 초안" : "AI 기사 초안")}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div>{head(n++, "무엇으로 쓸까요")}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{SRCS.filter(([k]) => !((noVacancy || noGongsil) && k === "vacancy") && !(noGongsil && k === "gongsil")).map(([k, l]) => <button key={k} type="button" onClick={() => setSrc(k)} style={chip(src === k)}>{l}</button>)}</div>
        </div>
        <div>
          {src === "vacancy" && (<>{head(n++, "공실 고르기")}
            <select value={vacId} onChange={(e) => setVacId(e.target.value)} style={input}>
              {vacs === null ? <option>불러오는 중…</option> : vacs.length ? <><option value="">공실을 고르세요 ({vacs.length}개)</option>{vacs.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}</> : <option value="">광고 중인 내 공실이 없어요</option>}
            </select></>)}
          {src === "market" && (<>{head(n++, "단지 또는 지역")}
            <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
              {([["complex", "단지 하나"], ["area", "지역 (구·동)"]] as const).map(([k, l]) => <button key={k} type="button" onClick={() => setMkt(k)} style={chip(mkt === k)}>{l}</button>)}
            </div>
          </>)}
          {src === "market" && mkt === "area" && (<>
            <select value={lawd} onChange={async (e) => { setLawd(e.target.value); setDong(""); setDongs([]); const r = await writingAreaDongs(e.target.value); if (r.success) setDongs(r.data); }} style={input}>
              <option value="">시·군·구 고르기</option>
              {lawds.map(([k, nm]) => <option key={k} value={k}>{nm}</option>)}
            </select>
            <select value={dong} onChange={(e) => setDong(e.target.value)} disabled={!lawd} style={{ ...input, marginTop: 6 }}>
              <option value="">동 전체</option>
              {dongs.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
              {([["apt", "아파트"], ["offi", "오피스텔"], ["villa", "빌라"]] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setKinds((v) => (v.includes(k) ? (v.length > 1 ? v.filter((x) => x !== k) : v) : [...v, k]))} style={chip(kinds.includes(k))}>{l}</button>
              ))}
              <span style={{ flex: 1 }} />
              <select value={months} onChange={(e) => setMonths(Number(e.target.value))} style={{ ...input, width: 118, height: 34 }}>
                {[1, 3, 6, 12].map((m) => <option key={m} value={m}>{m === 12 ? "최근 1년" : `최근 ${m}개월`}</option>)}
              </select>
            </div>
            <div style={{ fontSize: 12, color: DIM, marginTop: 5 }}>국토교통부 실거래가 — 거래 건수·앞 기간 비교·신고가·전세가율·대표 단지 주변 시설이 재료로 들어가요</div>
          </>)}
          {src === "market" && mkt === "complex" && (<>
            <div style={{ display: "flex", gap: 5 }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void search(); }} placeholder="단지 이름 — 예: 아크로힐스논현" style={{ ...input, flex: 1 }} />
              <button type="button" onClick={() => void search()} disabled={q.trim().length < 2} style={btn}>찾기</button>
            </div>
            <button type="button" onClick={openGongsil} style={{ ...btn, marginTop: 6, height: 34 }}>📂 공실열람에서 단지 고르기</button>
            {found.length > 0 && !pick && list(found)}
            {pick && <div style={{ marginTop: 6, fontSize: 13, color: TEXT }}><b>{pick.label}</b> <button type="button" onClick={() => setPick(null)} style={{ border: 0, background: "none", color: SUB, cursor: "pointer" }}>바꾸기</button><div style={{ fontSize: 12, color: DIM }}>국토교통부 실거래가 — 기사에는 이 단지 숫자만 들어가요</div></div>}
          </>)}
          {src === "market" && (<>{head(n++, "무엇을 중심으로")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
              {storyList.map((x) => (
                <button key={x.id} type="button" onClick={() => setStoryPick((p) => ({ ...p, market: x.id }))} title={`문단 순서: ${x.flow}`} style={{ ...chip(story?.id === x.id), height: "auto", padding: "7px 10px", textAlign: "left", display: "block", whiteSpace: "normal" }}>
                  <div style={{ fontWeight: 800 }}>{x.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.8, marginTop: 1 }}>{x.desc}</div>
                </button>
              ))}
            </div>
            {focus === "region" && <div style={{ fontSize: 12, color: DIM, marginTop: 5 }}>주변 시설 자료가 많지 않아 분량은 &apos;짧게·보통&apos;까지만 돼요</div>}
            {/* 분석이 끝나도 다시 누를 수 있게 — [↻ 다시 분석하기] (2026-11-09 사장님: "한번 분석하고 끝이네") */}
            <button type="button" onClick={() => void analyze()} disabled={!canAna || Boolean(anaBusy)}
              style={{ width: "100%", height: 40, marginTop: 8, borderRadius: 6, fontFamily: "inherit", fontSize: 14, fontWeight: 800,
                border: ana?.key === anaKey && !anaBusy ? `1px solid ${NAVY}` : 0,
                background: !canAna || anaBusy ? "#e5e7eb" : ana?.key === anaKey ? "#fff" : NAVY, color: !canAna || anaBusy ? "#6b7280" : ana?.key === anaKey ? NAVY : "#fff", cursor: !canAna || anaBusy ? "default" : "pointer" }}>
              {anaBusy ? "분석하는 중…" : ana?.key === anaKey ? "↻ 다시 분석하기" : !canAna ? (mkt === "area" ? "지역을 고르면 분석할 수 있어요" : "단지를 고르면 분석할 수 있어요") : <>Step 1<span style={{ display: "inline-block", width: 12 }} />분석하기</>} {/* 아이콘 대신 Step 1 (2026-11-08 사장님) */}
            </button>
          </>)}
          {src === "news" && (<>{head(n++, "뉴스 기사 고르기")}
            <div style={{ display: "flex", gap: 5 }}>
              <input value={newsUrl} onChange={(e) => { setNewsUrl(e.target.value); setNews(null); }} onKeyDown={(e) => { if (e.key === "Enter" && /^https?:\/\//.test(newsUrl.trim())) void takeNews("url"); }}
                placeholder="네이버 뉴스 기사 주소 붙여넣기 (https://n.news.naver.com/…)" style={{ ...input, flex: 1 }} />
              <button type="button" onClick={() => void takeNews("url")} disabled={newsBusy || !/^https?:\/\//.test(newsUrl.trim())} style={btn}>가져오기</button>
            </div>
            <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
              <button type="button" onClick={() => (isApp ? void bridge()?.column?.openNews?.().catch(() => {}) : void openDocked("https://news.naver.com/section/101", "gs-naver-news"))} /* 오른쪽 작은 창 (2026-11-06 사장님: "우측에 창으로 떠야 함") */ style={{ ...btn, height: 34 }}>📂 네이버 뉴스 열기</button>
              {isApp
                ? <button type="button" onClick={() => void takeNews("grab")} disabled={newsBusy} title="전용 크롬에서 보고 있는 기사를 가져와요" style={{ ...btn, height: 34 }}>{newsBusy ? "가져오는 중…" : "지금 보는 뉴스 가져오기"}</button>
                : <span style={{ alignSelf: "center", fontSize: 11.5, color: DIM }}>{newsBusy ? "가져오는 중…" : "기사 주소를 복사해 위에 붙여 넣으세요"}</span>}
            </div>
            {news && (
              <div style={{ marginTop: 8, padding: "10px 12px", border: `1px solid ${NAVY}`, borderRadius: 5, background: "#f5f8fd" }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: TEXT, lineHeight: 1.45 }}>{news.title}</div>
                <div style={{ fontSize: 12, color: SUB, marginTop: 4 }}>{[news.publisher, news.publishedAt].filter(Boolean).join(" · ")} · 본문 {String(news.body || "").length.toLocaleString()}자</div>
              </div>
            )}
            <div style={{ fontSize: 12, color: DIM, marginTop: 5 }}>원문 문장은 옮기지 않고 사실만 살려 새로 써요</div>
          </>)}
          {src === "topic" && (<>{head(n++, "주제")}
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="예: 전세 계약 전 꼭 확인할 것" style={input} />
          </>)}
          {src === "gongsil" && (<>{head(n++, "공실뉴스 기사 고르기")}
            <div style={{ display: "flex", gap: 5 }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void search(); }} placeholder="기사 제목 찾기" style={{ ...input, flex: 1 }} />
              <button type="button" onClick={() => void search()} style={btn}>찾기</button>
            </div>
            {!pick && found.length > 0 && list(found)}
            {pick && <div style={{ marginTop: 6, fontSize: 13 }}><b>{pick.label}</b> <button type="button" onClick={() => setPick(null)} style={{ border: 0, background: "none", color: SUB, cursor: "pointer" }}>바꾸기</button></div>}
          </>)}
        </div>
        {anaBox()}
        {/* 매물 소개 — 기사 스타일 대신 어떤 이야기로 (2026-11-09 사장님) · 단지는 위 [무엇을 중심으로]가 대신 · 뉴스·자유 주제는 그대로 */}
        {src === "vacancy" ? (
          <div>{head(n++, "어떤 이야기로")}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{storyList.map((x) => <button key={x.id} type="button" onClick={() => setStoryPick((p) => ({ ...p, vacancy: x.id }))} title={`${x.desc} — 문단 순서: ${x.flow}`} style={chip(story?.id === x.id)}>{x.name}</button>)}</div>
          </div>
        ) : src !== "market" && (
          <div>{head(n++, "기사 스타일")}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{KINDS.map((k) => <button key={k.id} type="button" onClick={() => setKind(k.id)} title={k.prompt} style={chip(kind === k.id)}>{k.name}</button>)}</div>
          </div>
        )}
        {/* [문체] 줄은 없앴다 — 기사 스타일과 겹치고, 말투는 원칙(지역 부동산 전문가)으로 정해져 있음 (2026-11-06 사장님: "하나로 통일해줘") */}
        {!story && <div>{head(n++, <>제목 {dim("(선택)")}</>)}
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            {HOOKS.map((h) => <button key={h.id} type="button" onClick={() => setHook(hook === h.id ? "" : h.id)} title={h.prompt} style={{ ...chip(hook === h.id), height: 28, padding: "0 9px", fontSize: 12.5 }}>{h.name}</button>)}
          </div>
        </div>} {/* 단지·매물 소개는 제목도 고른 중심·이야기에 맞춰 (2026-11-09) */}
        <div>{head(n++, "분량")}
          <div style={{ display: "flex", gap: 5 }}>{LENGTHS.map((l) => { const off = src === "market" && focus === "region" && l.id === "long"; return <button key={l.id} type="button" disabled={off} onClick={() => setLen(l.id)} title={off ? "지역 정보는 자료가 적어 '보통'까지만 돼요" : undefined} style={{ ...chip(len === l.id), height: 28, padding: "0 12px", fontSize: 12.5, ...(off ? { opacity: 0.35, cursor: "default" } : {}) }}>{l.name}</button>; })}</div>
          <div style={{ fontSize: 12, color: DIM, marginTop: 5 }}>{LENGTHS.find((l) => l.id === len)?.name} · {LENGTHS.find((l) => l.id === len)?.chars}</div>
        </div>
        <div>{head(n++, <>더 할 말 {dim("(선택)")}</>)}
          <textarea value={more} onChange={(e) => setMore(e.target.value)} rows={3} placeholder="예: 신혼부부 관점으로, 역세권 강조" style={{ ...input, height: "auto", padding: 10, lineHeight: 1.5, resize: "vertical" }} />
        </div>
      </div>
      <div style={{ padding: "12px 18px 14px", borderTop: `1px solid ${LINE}` }}>
        {/* 쓸 AI 는 왼쪽 메뉴 [AI 설정]에서 정한 것 그대로 (2026-11-06 사장님: "이미 메인에서 지정되어 있음") */}
        {webWait && <WebAiOverlay name={(WEB_AI.find((x) => x.id === webAi) || WEB_AI[0]).name} msg={note} onReopen={() => void webReopen()} onPaste={() => void webTry(false)} onStop={() => { setWebWait(null); setBusy(""); setNote(""); }} />}
        <button type="button" onClick={() => void write()} disabled={!webWait && (Boolean(busy) || !ready)}
          style={{ width: "100%", height: 48, borderRadius: 6, border: 0, background: busy || anaBusy ? NAVY : !ready ? "#9aa6b8" : "#2563eb", color: "#fff", fontSize: 15.5, fontWeight: 800, cursor: busy || !ready ? "default" : "pointer", fontFamily: "inherit" }}>
          {webWait ? <>AI 답을 기다리는 중<Dots /> <span style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.85 }}>· 누르면 그만두기</span></> : busy ? <>AI가 쓰는 중<Dots /></> : anaBusy ? <>분석하는 중<Dots /></> : noVacancy ? "✨ AI 초안 작성" : src === "market" ? <>Step 2<span style={{ display: "inline-block", width: 12 }} />AI 기사 초안 작성</> : "✨ AI 기사 초안 작성"} {/* 분석하기가 있는 단지/지역/시세만 Step 2 (2026-11-08) */}
        </button>
        <div style={{ marginTop: 7, fontSize: 12, textAlign: "center", color: err ? "#dc2626" : busy ? NAVY : done ? "#16a34a" : DIM, fontWeight: err || busy || done ? 700 : 500, lineHeight: 1.5 }}>
          {err || busy || note || (done ? "기사 칸에 채웠어요. 고쳐서 등록하세요." : anaBusy ? "분석이 끝나면 쓸 수 있어요" : !ready && src === "market" ? "단지와 중심을 고른 뒤 [분석하기]를 누르세요" : !ready && src !== "topic" ? "재료를 고르면 저절로 분석해요" : "분석한 재료로 써요 · 문체를 바꿔 여러 번 다시 써도 돼요")}
        </div>
        {/* 웹 — AI 답을 기다리는 동안 그림 설명 창 · [? 쓰는 법] (2026-11-03 사장님: 처음 하는 사람은 복사 붙여넣기를 모름, 복사 단추 위치까지) */}
        {installGuide && <InstallGuideModal ver={installer.ver} onClose={() => setInstallGuide(false)} />}
        {guide && <AiCopyGuide ai={isApp ? aiCur?.provider || "chatgpt" : webAi} waiting={false} onClose={() => setGuide(false)} />}
      </div>
    </div>
  );
}
