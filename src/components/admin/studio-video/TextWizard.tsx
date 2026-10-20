"use client";

// 텍스트로 영상 만들기 — 브루와 같은 3단계: ① 스타일 고르기 ② 대본 작성 ③ 영상 꾸미기 → 확인 → 자동 만들기
// 대본은 회원 AI(기본 글쓰기 AI), 길이는 글자 수 (사장님 결정). 화면 자료: 공실 사진 → 무료 자료 → AI 그림
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { LibItem, Project, Ratio, Fill, Clip, Layer } from "./types";
import { RATIO_LABEL, errText, uid, videoBridge } from "./types";
import { splitScript, estimateSeconds, mergeSingleScenes } from "./timeline";
import { findVoice } from "@/lib/studio-video/voices";
import { MUSIC_LIBRARY, MUSIC_MOODS } from "@/lib/reels/music-catalog";
import { findStudioVacancyByNo, getStudioArticle, listMyStudioVacancies, listStudioArticles } from "@/app/actions/studio";
import { useStudioWriter, useStudioImager } from "@/components/admin/sections/useStudioWriter";
import { Btn, C, FONT, Hint, Icon, Modal, Toggle, Working, input, label } from "./ui";
import { MusicPanel, VoiceFace, VoicePanel } from "./Panels";
import { AiPick, aiChoiceName, effectiveAi, useAiPick } from "./AiPick";
import { SaveAsFields } from "./Flows";

export type VideoStyle = { id: string; name: string; desc: string; icon: string; prompt: string; voice: string; speed: number; music: string; ratio?: Ratio; subtitle?: "long" | "short"; chars: number };

export const STYLES: VideoStyle[] = [
  { id: "listing", name: "매물 소개", desc: "공실 사진과 함께 매물을 차분히 소개해요", icon: "image", prompt: "부동산 매물 소개 영상. 첫 문장에 위치와 물건 종류, 이어서 장점과 조건, 마지막에 공실뉴스에서 자세히 볼 수 있다는 안내", voice: "Charon", speed: 1, music: "잔잔한", chars: 500 },
  { id: "news", name: "부동산 뉴스 해설", desc: "뉴스처럼 또박또박 설명해요", icon: "file", prompt: "부동산 뉴스 해설 영상. 사실을 먼저, 의미와 영향은 차분하게. 단정·과장 금지", voice: "Kore", speed: 1, music: "고급스러운", chars: 800 },
  { id: "auction", name: "경매·공매 브리핑", desc: "감정가·최저가·일정을 정리해요", icon: "template", prompt: "경매·공매 물건 브리핑 영상. 감정가, 최저입찰가, 유찰 횟수, 입찰 일정을 정확히. 입찰 전 확인할 점으로 마무리. 투자 권유 금지", voice: "Sadaltager", speed: 1, music: "잔잔한", chars: 700 },
  { id: "area", name: "동네·상권 소개", desc: "교통·학군·상권을 소개해요", icon: "bg", prompt: "동네·상권 소개 영상. 교통, 생활 편의, 학군, 상권 분위기를 친근하게", voice: "Sulafat", speed: 1, music: "경쾌한", chars: 700 },
  { id: "info", name: "정보 전달", desc: "알아 두면 좋은 부동산 정보", icon: "info", prompt: "부동산 정보 전달 영상. 쉬운 말로 핵심부터, 예시 하나, 정리 한 문장", voice: "Achird", speed: 1, music: "잔잔한", chars: 900 },
  { id: "shorts", name: "짧은 쇼츠", desc: "30초 안팎, 빠르고 짧게", icon: "shorts", prompt: "30초 세로 쇼츠. 첫 문장은 궁금하게 만드는 한마디, 문장은 아주 짧게", voice: "Puck", speed: 1, music: "경쾌한", ratio: "9:16", subtitle: "short", chars: 250 },
];

type Hint = { desc?: string; keywords?: string; kind?: string };
type Vac = { id: string; label: string };

/* 공실로 쓰기 — 용도 (2026-10-20 사장님): 고르면 글자 수·화면 비율·대본 구성이 그 용도에 맞게. 1단계 스타일보다 우선 */
type Purpose = "shorts" | "listing" | "area" | "etc";
const PURPOSES: { id: Purpose; name: string; chars?: number; ratio?: Ratio; prompt: string; hint: string }[] = [
  { id: "shorts", name: "릴스·쇼츠", chars: 250, ratio: "9:16", hint: "30~45초 세로 · 첫 문장에 궁금증",
    prompt: "릴스·쇼츠용 30~45초 세로 영상. 첫 문장은 손가락을 멈추게 하는 궁금증 한마디, 이어서 이 매물의 핵심 장점 3가지를 아주 짧은 문장으로, 마지막은 공실뉴스에서 자세히 볼 수 있다는 한 줄. 문장은 15~25자 안팎으로 짧게" },
  { id: "listing", name: "매물 설명", chars: 600, ratio: "16:9", hint: "1~2분 · 매물을 차근차근",
    prompt: "매물 설명 영상. 위치와 매물 종류로 시작해 가격·면적·구조, 옵션과 장점, 계약 전에 확인할 점 순서로 차분하게 설명하고, 마지막에 공실뉴스에서 자세히 보고 문의할 수 있다는 안내" },
  { id: "area", name: "단지·지역 소개", chars: 700, ratio: "16:9", hint: "1~2분 · 교통·생활·상권 위주",
    prompt: "단지·지역 소개 영상. 이 매물이 있는 단지·동네를 중심으로 교통, 생활 편의시설, 학군, 상권과 분위기를 소개하고, 마지막에 이 동네의 이 매물을 한 줄로 소개. 확인되지 않은 시설 이름·거리는 지어내지 말 것" },
  { id: "etc", name: "기타", hint: "[대본 요청]에 적은 대로", prompt: "" },
];

/* 뉴스 기사로 쓰기 — 용도 (2026-10-20 사장님): 릴스·쇼츠 / 뉴스·칼럼 / 기타 */
type NewsPurpose = "shorts" | "column" | "etc";
const NEWS_PURPOSES: { id: NewsPurpose; name: string; chars?: number; ratio?: Ratio; prompt: string; hint: string }[] = [
  { id: "shorts", name: "릴스·쇼츠", chars: 250, ratio: "9:16", hint: "30~45초 세로 · 첫 문장에 궁금증",
    prompt: "릴스·쇼츠용 30~45초 세로 뉴스 영상. 첫 문장은 손가락을 멈추게 하는 궁금증 한마디, 이어서 기사의 핵심 사실 2~3가지를 아주 짧은 문장으로, 마지막은 이 소식이 부동산에 주는 의미 한 줄. 문장은 15~25자 안팎으로 짧게" },
  { id: "column", name: "뉴스·칼럼", chars: 700, ratio: "16:9", hint: "1~2분 가로 · 보도·해설 말투",
    prompt: "뉴스·칼럼 영상. 무슨 일인지 한 문장으로 시작해 핵심 사실(숫자·날짜·지역)을 차분한 보도 말투로 전하고, 이어서 부동산 시장·실수요자에게 주는 의미를 해설한 뒤 한 줄로 정리" },
  { id: "etc", name: "기타", hint: "[대본 요청]에 적은 대로", prompt: "" },
];
type News = { title: string; publisher: string; publishedAt: string; url: string; body: string };
type ColumnBridge = { fetchNews: (url: string) => Promise<News>; openNews: () => Promise<unknown>; openUrl?: (url: string) => Promise<unknown>; grabNews: () => Promise<News> };
/* 보도자료 사이트 바로가기 (2026-10-20 사장님) — 주소는 열어서 확인한 것만 */
const PRESS_SITES: { group: string; items: { name: string; url: string }[] }[] = [
  { group: "정부", items: [
    { name: "정책브리핑 (정부 전체)", url: "https://www.korea.kr/briefing/pressReleaseList.do" },
    { name: "청와대 브리핑", url: "https://www.president.go.kr/briefings" },
    { name: "국토교통부", url: "https://www.molit.go.kr/USR/NEWS/m_71/lst.jsp" },
    { name: "서울시", url: "https://www.seoul.go.kr/news/news_report.do" },
    { name: "국세청", url: "https://www.nts.go.kr/" },
  ] },
  { group: "금융", items: [
    { name: "금융위원회", url: "https://www.fsc.go.kr/no010101" },
    { name: "금융감독원", url: "https://www.fss.or.kr/fss/bbs/B0000188/list.do?menuNo=200218" },
    { name: "한국은행", url: "https://www.bok.or.kr/portal/singl/newsData/list.do?menuNo=201263" },
  ] },
  { group: "청약·부동산", items: [
    { name: "청약홈", url: "https://www.applyhome.co.kr/" },
    { name: "한국부동산원", url: "https://www.reb.or.kr/" },
    { name: "LH", url: "https://www.lh.or.kr/" },
    { name: "법원경매", url: "https://www.courtauction.go.kr/" },
    { name: "온비드", url: "https://www.onbid.co.kr/" },
  ] },
];
const columnBridge = () => (window as unknown as { gongsilStudio?: { column?: ColumnBridge } }).gongsilStudio?.column;

export default function TextWizard({ onCancel, onDone, onRecord }: { onCancel: () => void; onDone: (p: Project) => void; onRecord?: (script: string) => void }) {
  const b = videoBridge()!;
  const writer = useStudioWriter();
  const imager = useStudioImager();
  const [step, setStep] = useState(1); // 스타일 고르기는 뺐다 (2026-10-20 사장님) — 대본 작성부터 바로
  const [style, setStyle] = useState<VideoStyle | null>(null);
  // ② 대본
  // 대본 갈래 (2026-10-20 사장님) — 매물 소개 / 뉴스 기사 / 자유 주제 (대본이 있으면 오른쪽 칸에 바로 붙여 넣어도 된다)
  const [src, setSrc] = useState<"vacancy" | "news" | "topic">("vacancy");
  const [topic, setTopic] = useState("");
  const [request, setRequest] = useState("");
  const [useChars, setUseChars] = useState(true);
  const [chars, setChars] = useState(500);
  const [script, setScript] = useState("");
  const hints = useRef<Record<string, Hint>>({});
  const sceneTitles = useRef<Record<string, string>>({}); // 첫 문장 → AI 가 지은 씬 이름
  const [writing, setWriting] = useState("");
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(""); // 목소리만 저장한 파일
  const [textSaved, setTextSaved] = useState(""); // 텍스트로 내려받은 대본 파일
  // 만드는 중 멈추기 (2026-10-20 사장님) — open: 여기까지 만든 것으로 편집 화면 열기 · discard: 만들지 않고 닫기 (만들던 프로젝트는 휴지통)
  const stopRef = useRef<"" | "open" | "discard">("");
  const [stopping, setStopping] = useState<"" | "open" | "discard">("");
  const [vacs, setVacs] = useState<Vac[] | null>(null);
  const [vacId, setVacId] = useState("");
  const [vacInfo, setVacInfo] = useState<{ vacancy: unknown; photos: LibItem[]; shots?: LibItem[] } | null>(null);
  // 화면 캡쳐 (2026-10-20 사장님) — 기사·보도자료 화면 / 공실 검증·지도·로드뷰. 영상 만들 때 AI 가 문장에 맞춰 골라 넣는다
  const [caps, setCaps] = useState<LibItem[]>([]);
  const [capping, setCapping] = useState(false);
  const [useCaps, setUseCaps] = useState(true);
  // ③ 꾸미기
  const [ratio, setRatio] = useState<Ratio>("16:9");
  const [projName, setProjName] = useState<string | null>(null); // null = 정하지 않음 (스타일 이름_날짜, 없으면 무제)
  const [folder, setFolder] = useState("");
  const [subOn, setSubOn] = useState(true);
  const [subPos, setSubPos] = useState<"bottom" | "middle-low" | "middle" | "middle-high" | "top">("bottom");
  // 자막 한 화면 최대 줄 수 — 가로 2줄, 세로(쇼츠) 1줄이 처음 값 (2026-10-19 사장님: 길게·짧게 대신 구체적으로)
  const [subLines, setSubLines] = useState<1 | 2 | 3>(2);
  const [voiceOn, setVoiceOn] = useState(true);
  const [motionOn, setMotionOn] = useState(true); // 사진 자동 움직임 (줌인·좌우·상하)
  const [aiDeco, setAiDeco] = useState(false); // AI가 다 꾸미기 — 자막 스타일·효과·스티커·효과음 (2026-10-19 사장님)
  const [voiceId, setVoiceId] = useState("Charon");
  const [emotion, setEmotion] = useState<string | undefined>(undefined); // 타입캐스트 말투 · 일레븐랩스 세부 설정 (x:…)
  const [voicePick, setVoicePick] = useState(false); // 목소리 고르기 창 (편집 화면과 같은 얼굴 카드 창)
  const [speed, setSpeed] = useState(1);
  const [musicOn, setMusicOn] = useState(true);
  const [mood, setMood] = useState<string>("잔잔한");
  // 곡 직접 고르기 (2026-10-20 사장님) — null = 분위기 첫 곡 자동 / lib = 공실뉴스 음악 / mine = 내 음악(PC)
  const [track, setTrack] = useState<{ kind: "lib" | "mine"; id: string; label: string } | null>(null);
  const [musicPick, setMusicPick] = useState(false);

  const [usePhotos, setUsePhotos] = useState(true);
  const [useStock, setUseStock] = useState(true);
  const [useAi, setUseAi] = useState(false);
  const [visualLater, setVisualLater] = useState(false);
  // 내 영상에서 고르기 — 찍어 둔 영상·사진을 AI 가 문장에 맞춰 고른다 (회의 3-19). 첨부하면 [내 자료]에도 자동으로 담긴다
  const [footOn, setFootOn] = useState(false);
  const [foot, setFoot] = useState<LibItem[]>([]);
  const [footPick, setFootPick] = useState<LibItem[] | null>(null); // [내 자료에서 고르기] 창 — 목록
  const [footSel, setFootSel] = useState<string[]>([]); // 화면은 나중에 — 목소리(·자막·음악)만 먼저 만들고 편집 화면에서 클립마다 넣기 (2026-10-18 사장님)
  const [fill, setFill] = useState<Fill>("cover");
  const [confirm, setConfirm] = useState(false);
  const [gen, setGen] = useState<{ title: string; detail?: string; frac?: number } | null>(null);

  const pickStyle = (s: VideoStyle | null) => {
    setStyle(s);
    if (s) {
      setVoiceId(s.voice);
      setSpeed(s.speed);
      setMood(s.music);
      setChars(s.chars);
      if (s.ratio) setRatio(s.ratio);
      if (s.subtitle) setSubLines(s.subtitle === "short" ? 1 : 2);
      if (s.id === "listing") setSrc("vacancy");
      // 1단계 스타일에 맞춰 공실 용도도 미리 (쇼츠 → 릴스·쇼츠, 동네·상권 → 단지·지역)
      setPurposeRaw(s.id === "shorts" ? "shorts" : s.id === "area" ? "area" : "listing");
    }
  };

  const loadVacs = () => {
    if (vacs) return;
    listMyStudioVacancies().then((r) => setVacs(r.success ? r.data.map((v) => ({ id: v.id, label: `[${v.trade_type || "-"}] ${v.building_name || v.property_type || "공실"} · ${v.address} · 사진 ${v.photoCount}장` })) : [])).catch(() => setVacs([]));
  };
  // 이 공실의 유튜브 대본 ([뉴스·SNS발행 › 유튜브 대본]에서 쓴 것, 이 PC) — 있으면 다시 쓰지 않고 가져온다 (2026-10-20 사장님)
  const [yt, setYt] = useState<{ title: string; narration: string[]; seconds: number } | null>(null);
  const ytBridge = () => (window as unknown as { gongsilStudio?: { youtube?: { get: (id: string) => Promise<{ title: string; narration: string[]; seconds: number } | null> } } }).gongsilStudio?.youtube;
  const takeYt = () => {
    if (!yt) return;
    const endMark = (t: string) => (/[.?!]["'」』)]*$/.test(t) ? t : t.replace(/[\s,~…·]+$/, "") + ".");
    pushHistory();
    hints.current = {};
    sceneTitles.current = {};
    setScript(yt.narration.map((x) => endMark(String(x).trim())).filter((x) => x.length > 1).join("\n\n"));
  };
  // 대본 수정 요청 — 지금 대본을 바탕으로 요청한 부분만 다시 쓰기 · 되돌리기 (2026-10-20 사장님)
  const [revReq, setRevReq] = useState("");
  const [purpose, setPurposeRaw] = useState<Purpose>("listing");
  const setPurpose = (id: Purpose) => {
    setPurposeRaw(id);
    const pp = PURPOSES.find((x) => x.id === id)!;
    if (pp.chars) { setChars(pp.chars); setUseChars(true); }
    if (pp.ratio) setRatio(pp.ratio);
  };
  const [aiSel, setAiSel, aiList] = useAiPick(); // 이번 대본을 쓸 AI (계정/API) — 비면 [AI 설정] 기본
  const aiUse = effectiveAi(aiSel, aiList); // 연결이 끊긴 걸 골라 뒀으면 기본으로
  const aiName = aiChoiceName(aiUse, aiList, writer);
  const [history, setHistory] = useState<string[]>([]);
  const pushHistory = () => { if (script.trim()) setHistory((h) => [...h.slice(-9), script]); };
  const undoScript = () => {
    setHistory((h) => {
      if (!h.length) return h;
      setScript(h[h.length - 1]);
      return h.slice(0, -1);
    });
  };
  // 처음 열 때 내 공실 목록
  useEffect(() => {
    listMyStudioVacancies().then((r) => setVacs((cur) => cur ?? (r.success ? r.data.map((v) => ({ id: v.id, label: `[${v.trade_type || "-"}] ${v.building_name || v.property_type || "공실"} · ${v.address} · 사진 ${v.photoCount}장` })) : []))).catch(() => setVacs((cur) => cur ?? []));
  }, []);
  /* ── 뉴스 기사 — 공실뉴스 기사(목록·주소) / 네이버 뉴스(주소·보던 뉴스) ── */
  const [newsFrom, setNewsFrom] = useState<"gongsil" | "naver" | "press">("gongsil");
  /** 보도자료 사이트 — 앱이면 전용 크롬(거기서 [지금 보는 페이지 가져오기]), 아니면 브라우저 새 창 */
  const openSite = (url: string) => {
    const c = columnBridge();
    if (c?.openUrl) return void c.openUrl(url).catch((e) => setErr(errText(e)));
    const g = (window as unknown as { gongsilStudio?: { openInBrowser?: (u: string) => void } }).gongsilStudio;
    if (g?.openInBrowser) g.openInBrowser(url);
    else window.open(url, "_blank");
  };
  const [news, setNews] = useState<News | null>(null);
  const [arts, setArts] = useState<{ id: string; no: number | null; title: string; author: string; date: string }[] | null>(null);
  const [artQ, setArtQ] = useState("");
  const [newsUrl, setNewsUrl] = useState("");
  const [newsPurpose, setNewsPurposeRaw] = useState<NewsPurpose>("column");
  const setNewsPurpose = (id: NewsPurpose) => {
    setNewsPurposeRaw(id);
    const pp = NEWS_PURPOSES.find((x) => x.id === id)!;
    if (pp.chars) { setChars(pp.chars); setUseChars(true); }
    if (pp.ratio) setRatio(pp.ratio);
  };
  const loadArts = async (q = artQ) => {
    const r = await listStudioArticles(q).catch((e) => ({ success: false as const, error: errText(e) }));
    if (!r.success) { setErr(r.error); setArts([]); return; }
    setArts(r.data);
  };
  const takeNews = async (how: "article" | "url" | "grab", key = "") => {
    setErr("");
    setWriting("기사를 읽는 중…");
    try {
      let n: News | null = null;
      if (how === "article" || (how === "url" && /gongsilnews\.com\/news\//i.test(key))) {
        const r = await getStudioArticle(key);
        if (!r.success) throw new Error(r.error);
        n = r.data;
      } else {
        const c = columnBridge();
        if (!c) throw new Error("네이버 뉴스 가져오기는 공실뉴스 스튜디오 앱에서 돼요.");
        n = how === "grab" ? await c.grabNews() : await c.fetchNews(key);
      }
      setNews(n);
      setNewsUrl("");
      if (n && !topic.trim()) setTopic(n.title);
      // 화면 캡쳐 — 남의 언론사 기사(네이버)는 제목 부분 1장 + 출처, 공실뉴스 기사·보도자료는 제목부터 몇 장
      setCaps([]);
      if (n?.url && b.capturePage) {
        const from = how === "article" || /gongsilnews\.com/i.test(n.url) ? "gongsil" : newsFrom;
        setCapping(true);
        b.capturePage(n.url, {
          mode: from === "naver" ? "head" : "full",
          title: n.title,
          credit: from === "gongsil" ? "" : `출처: ${n.publisher || (from === "press" ? "보도자료" : "원문 기사")}`,
        }).then(setCaps).catch(() => setCaps([])).finally(() => setCapping(false));
      }
    } catch (e) {
      setErr(errText(e));
    }
    setWriting("");
  };
  // 번호로 찾기 — 공실번호(숫자) · 경매·공매 관리번호(2026-18154-001) — 내 공실이 아니어도 공실열람에 공개 중이면 (2026-10-20 사장님)
  const [vacNo, setVacNo] = useState("");
  const findByNo = async () => {
    setErr("");
    const r = await findStudioVacancyByNo(vacNo).catch((e) => ({ success: false as const, error: errText(e) }));
    if (!r.success) return setErr(r.error);
    const v = r.data as { id: string; vacancy_no: number; building_name: string | null; trade_type: string | null; property_type: string | null; sido: string | null; sigungu: string | null; dong: string | null };
    const label = `[${v.trade_type || "-"}] ${v.building_name || v.property_type || "공실"} · ${[v.sido, v.sigungu, v.dong].filter(Boolean).join(" ")} · ${v.vacancy_no}번`;
    setVacs((list) => [{ id: v.id, label }, ...(list || []).filter((x) => x.id !== v.id)]);
    setVacNo("");
    void chooseVac(v.id);
  };
  /** 공실열람에서 이 공실을 새 창으로 */
  const openGongsil = () => {
    // 늘 실제 공실뉴스 주소로, 바깥 브라우저 새 창에 (앱 안 팝업이 안 뜨는 경우가 있어서) — 공실을 안 골랐으면 공실열람 첫 화면
    const url = `https://www.gongsilnews.com/gongsil${vacId ? `?id=${encodeURIComponent(vacId)}` : ""}`;
    const g = (window as unknown as { gongsilStudio?: { openInBrowser?: (u: string) => void } }).gongsilStudio;
    if (g?.openInBrowser) g.openInBrowser(url);
    else window.open(url, "_blank");
  };
  const chooseVac = async (id: string) => {
    setVacId(id);
    setVacInfo(null);
    setYt(null);
    if (!id) return;
    ytBridge()?.get(id).then((r) => setYt(r && r.narration?.length ? r : null)).catch(() => setYt(null));
    setWriting("공실 정보와 사진을 받는 중…");
    try {
      setVacInfo(await b.vacancy(id));
    } catch (e) {
      setErr(errText(e));
    }
    setWriting("");
  };

  const write = async (revise?: string, fromYt?: boolean) => {
    setErr("");
    setWriting(revise ? `${aiName}가 요청대로 고치는 중… (1~2분)` : `${aiName}가 대본을 쓰는 중… (1~2분)`);
    const off = b.onProgress((t) => setWriting(t));
    try {
      const pp = src === "vacancy" ? PURPOSES.find((x) => x.id === purpose) : src === "news" ? NEWS_PURPOSES.find((x) => x.id === newsPurpose) : undefined;
      const fromNews = !revise && src === "news" && news;
      const rq = revise
        ? `[수정 요청] ${revise}\n위 [참고 글]은 지금 대본이에요. 요청한 부분만 고치고 나머지 문장은 되도록 그대로 두세요.${request.trim() ? `\n(처음 요청: ${request.trim()})` : ""}`
        : fromNews
          ? `위 [참고 글]은 ${news.publisher || (newsFrom === "press" ? "정부·기관" : "뉴스")} ${newsFrom === "press" ? "보도자료" : "기사"}「${news.title}」${news.publishedAt ? ` (${news.publishedAt})` : ""}예요. 기사 문장을 그대로 옮기지 말고, 사실(숫자·날짜·지역·이름)만 살려 영상 대본으로 새로 써 주세요. 기사에 없는 사실은 지어내지 마세요. 마지막 문장은 "출처는 ${news.publisher || "원문 기사"}입니다." 처럼 출처를 밝혀 주세요.${request.trim() ? `\n${request.trim()}` : ""}`
        : fromYt
          ? `위 [참고 글]은 이 공실의 유튜브 대본이에요. 사실(가격·면적·위치)은 그대로 두고, 아래 용도에 맞게 길이와 구성을 바꿔 다시 써 주세요.${request.trim() ? `\n${request.trim()}` : ""}`
          : request;
      // 공실로 쓰기는 고른 용도가 스타일보다 우선 (기타는 스타일·요청 그대로)
      const st = pp && pp.prompt ? `${pp.name} — ${pp.prompt}` : style ? `${style.name} — ${style.prompt}` : "";
      const source = revise ? script : fromNews ? `${news.title}\n\n${news.body}` : fromYt && yt ? yt.narration.join("\n\n") : undefined;
      const r = await b.ai.script({ topic: src === "news" && news ? news.title : topic, style: st, request: rq, chars: useChars ? chars : 0, vacancy: src === "vacancy" ? vacInfo?.vacancy : null, ...(source ? { source } : {}), ai: aiUse });
      pushHistory();
      hints.current = {};
      sceneTitles.current = {};
      const text = r.scenes.map((s) => s.lines.map((l, li) => {
        if (li === 0 && s.title) sceneTitles.current[l.text] = s.title; // 씬 이름 — 그 씬 첫 문장으로 찾는다 (회의 3-22)
        hints.current[l.text] = { desc: l.desc, keywords: l.keywords, kind: l.kind };
        return l.text;
      }).join("\n")).join("\n\n");
      setScript(text);
    } catch (e) {
      setErr(errText(e));
    } finally {
      off();
      setWriting("");
    }
  };

  const defaultName = `${style ? style.name : src === "vacancy" ? "매물 소개" : src === "news" ? "뉴스 기사" : "자유 주제"}_${new Date().getMonth() + 1}월${new Date().getDate()}일`;
  const scenes = useMemo(() => splitScript(script), [script]);
  const lineCount = scenes.reduce((a, s) => a + s.length, 0);
  const seconds = useMemo(() => scenes.flat().reduce((a, t) => a + estimateSeconds(t, speed) + 0.12, 0), [scenes, speed]);
  const photoCount = src === "vacancy" && usePhotos && !visualLater ? vacInfo?.photos.length || 0 : 0;

  /* ── 목소리만 파일로 (2026-10-20 사장님: 타임라인 말고 mp3 로도) — 프로젝트는 만들지 않는다 ── */
  const saveVoice = async (kind: "mp3" | "wav") => {
    if (!b.voiceSave || !b.exportPick) return;
    const f = await b.exportPick({ name: (projName ?? defaultName).trim() || "목소리", voiceOnly: true } as unknown as Project, kind); // 기본 폴더 = 공실뉴스 스튜디오\AI오디오
    if (!f) return;
    setErr("");
    setSaved("");
    const off = b.onProgress((t, fr) => setGen({ title: t, frac: typeof fr === "number" ? fr : undefined }));
    try {
      setGen({ title: "AI 목소리를 만드는 중…", frac: 0.02 });
      const r = await b.voiceSave(scenes.flat(), voiceId, { kind, outFile: f, speed, emotion });
      setSaved(r.file);
      b.showFile(r.file);
    } catch (e) {
      setErr(errText(e));
    } finally {
      setGen(null);
      off();
    }
  };

  /* ── 자동 만들기 ── */
  const build = async () => {
    setConfirm(false);
    setErr("");
    stopRef.current = "";
    setStopping("");
    const STOP = "__gsv_stop__";
    /** 멈춤 확인 — 버리기면 바로 그만, 열기면 true (남은 일은 건너뛴다) */
    const halt = () => {
      if (stopRef.current === "discard") throw new Error(STOP);
      return stopRef.current === "open";
    };
    let made: Project | null = null;
    const off = b.onProgress((t, f) => setGen((g) => ({ title: g?.title || "만드는 중…", detail: t, frac: typeof f === "number" ? f : g?.frac })));
    try {
      setGen({ title: "프로젝트를 만드는 중…", frac: 0.02 });
      const p = await b.project.create({ method: "text", ratio, vacancyId: src === "vacancy" ? vacId : "", name: (projName ?? defaultName).trim(), folder: folder || undefined });
      made = p;
      p.settings.fill = fill;
      p.settings.subtitle = { ...p.settings.subtitle, on: subOn, position: subPos, length: subLines === 1 ? "short" : "long", maxLines: subLines };
      p.settings.voice = { id: voiceId, speed, volume: 1, ...(emotion ? { emotion } : {}) } as Project["settings"]["voice"];
      p.settings.motion = motionOn ? "auto" : "none";
      if (aiDeco) p.settings.aiAuto = true;
      // 클립
      // 씬 — AI 가 지은 이름을 붙이고, 클립 하나짜리 씬이 이어지면 묶는다 (회의 3-22)
      p.scenes = mergeSingleScenes(scenes.map((ls) => ({ id: uid(), title: sceneTitles.current[ls[0]] || undefined, clips: ls.map((t) => ({ id: uid(), type: "voice", text: t, words: t.split(/\s+/).map((w) => ({ w, s: 0, e: 0 })), voice: null, visual: null, hint: hints.current[t] }) as Clip) })));
      const clips = p.scenes.flatMap((s) => s.clips);
      // 음악
      if (musicOn) {
        try {
          if (track?.kind === "mine") {
            const r = await b.musicUse(p.dir, track.id);
            p.settings.music = { on: true, file: r.file, url: r.url, name: r.name || track.label, mood, volume: 0.03 };
          } else {
            const t = (track && MUSIC_LIBRARY.find((x) => x.id === track.id)) || MUSIC_LIBRARY.find((x) => x.mood === mood) || MUSIC_LIBRARY[0];
            const r = await b.musicGet(p.dir, `bgm/lib/${t.id.slice(4)}.mp3`);
            p.settings.music = { on: true, file: r.file, url: r.url, name: t.label, mood, volume: 0.03 };
          }
        } catch {}
      }
      // 화면 자료
      const used = new Set<string>();
      const addAsset = async (item: LibItem) => {
        const a = await b.project.addAsset(item.id);
        p.assets[a.id] = a;
        return a.id;
      };
      const photos: string[] = [];
      if (photoCount && vacInfo) {
        setGen({ title: "공실 사진을 넣는 중…", frac: 0.08 });
        for (const ph of vacInfo.photos) photos.push(await addAsset(ph));
      }
      // 내 영상에서 고르기 — AI 가 장면 모음을 보고 문장마다 영상·시작 초를 고른다
      const footIds: Record<string, string> = {};
      const capList = useCaps ? (src === "vacancy" ? vacInfo?.shots || [] : src === "news" ? caps : []) : [];
      const footAll = [...(footOn ? foot : []), ...capList];
      if (!visualLater && footAll.length && b.ai.footage && !halt()) {
        setGen({ title: `${writer}가 내 영상에서 문장마다 장면을 고르는 중…`, detail: "장면 모음을 만들어 AI 에 보내요 (원본 영상은 보내지 않아요)", frac: 0.1 });
        try {
          const ok = footAll.filter((f) => f.path && (f.kind === "video" || f.kind === "image"));
          const r = await b.ai.footage(clips.map((c) => c.text), ok.map((f) => ({ path: f.path!, kind: f.kind, duration: f.duration })));
          for (let i = 0; i < clips.length; i++) {
            const m = r[i];
            if (!m || m.v < 0 || !ok[m.v]) continue;
            const f = ok[m.v];
            if (!footIds[f.id]) footIds[f.id] = await addAsset(f);
            clips[i].visual = { asset: footIds[f.id], s: m.t };
          }
        } catch (e) {
          setErr(`내 영상에서 장면을 고르지 못했어요 (나머지로 채워요): ${errText(e)}`);
        }
      }
      // 화면 검색어가 없는 문장은 회원 AI 에게 한 번에 묻는다
      const needHint = clips.filter((c) => !c.hint?.keywords && !c.visual);
      if (!visualLater && (useStock || useAi) && needHint.length && (!photos.length || photos.length < clips.length) && !halt()) {
        setGen({ title: `${writer}가 문장마다 어울리는 화면을 고르는 중…`, frac: 0.12 });
        try {
          const hs = await b.ai.scenes(needHint.map((c) => c.text));
          needHint.forEach((c, i) => (c.hint = hs[i]));
        } catch {}
      }
      let stockOk = useStock;
      let aiLeft = useAi ? 8 : 0;
      for (let i = 0; i < (visualLater ? 0 : clips.length); i++) {
        const c = clips[i];
        if (c.visual) continue; // 내 영상에서 이미 골랐다
        if (halt()) { // 여기까지 — 남은 문장은 사진이 있으면 사진, 없으면 앞 화면을 이어서
          if (photos.length) c.visual = { asset: photos[i % photos.length], s: 0 };
          else if (clips[i - 1]?.visual) c.visual = { ...clips[i - 1].visual! };
          continue;
        }
        setGen({ title: `화면 자료를 고르는 중… (${i + 1}/${clips.length})`, frac: 0.15 + (i / clips.length) * 0.45 });
        if (photos.length && (i < photos.length || (!stockOk && !aiLeft))) {
          c.visual = { asset: photos[i % photos.length], s: 0 };
          continue;
        }
        if (stockOk && c.hint?.keywords) {
          try {
            const orient = ratio === "9:16" || ratio === "4:5" ? "portrait" : ratio === "1:1" ? "square" : "landscape";
            const r = await b.stock.search(c.hint.keywords, c.hint.kind === "image" ? "photo" : "video", orient);
            if (!r.success) {
              if (r.needKey) stockOk = false;
            } else {
              const pick = (r.items || []).find((x) => !used.has(x.id));
              if (pick) {
                used.add(pick.id);
                const it = await b.stock.get(p.dir, pick);
                c.visual = { asset: await addAsset(it), s: 0 };
                continue;
              }
            }
          } catch {}
        }
        if (aiLeft > 0) {
          aiLeft--;
          setGen({ title: `${imager}가 그림을 그리는 중… (${i + 1}/${clips.length})`, detail: "한 장에 30초~1분 걸려요", frac: 0.15 + (i / clips.length) * 0.45 });
          try {
            const it = await b.ai.image(p.dir, `${c.hint?.desc || c.text} — 부동산 영상에 쓸 실사 사진, 글자·사람 얼굴 없이, ${ratio === "9:16" ? "세로" : "가로"} 화면`);
            c.visual = { asset: await addAsset(it), s: 0 };
            continue;
          } catch {}
        }
        // 못 찾았으면 앞 화면을 이어서
        const prev = clips[i - 1]?.visual;
        if (prev) c.visual = { ...prev };
        else if (photos.length) c.visual = { asset: photos[0], s: 0 };
      }
      // AI 목소리
      if (voiceOn) {
        let done = 0;
        let k = 0;
        const one = async () => {
          while (k < clips.length && !halt()) {
            const c = clips[k++];
            try {
              const r = await b.voice(p.dir, c.text, voiceId, emotion ? { emotion } : undefined);
              c.voice = { file: r.file, url: r.url, duration: r.duration, id: r.id, text: r.text };
              c.words = r.words;
            } catch {}
            done++;
            setGen({ title: `AI 목소리를 만드는 중… (${done}/${clips.length})`, frac: 0.6 + (done / clips.length) * 0.38 });
          }
        };
        await Promise.all([one(), one(), one()]);
        clips.forEach((c) => { if (!c.voice) c.hold = estimateSeconds(c.text, speed); }); // 멈춰서 못 만든 문장 — 글 길이만큼 (나중에 [목소리 다시 만들기])
      } else {
        clips.forEach((c) => (c.hold = estimateSeconds(c.text, speed)));
      }
      await b.project.save(p);
      setGen({ title: "편집 화면을 여는 중…", frac: 1 });
      onDone(p);
    } catch (e) {
      if (e instanceof Error && e.message === STOP) {
        // 만들지 않고 닫기 — 만들던 프로젝트는 휴지통으로 (되돌릴 수 있게)
        if (made && b.project.trash) await b.project.trash(made.dir).catch(() => "");
        setErr("만들기를 멈췄어요. 대본은 그대로 있어요.");
      } else setErr(errText(e));
      setGen(null);
    } finally {
      off();
      stopRef.current = "";
      setStopping("");
    }
  };
  const stop = (how: "open" | "discard") => {
    stopRef.current = how;
    setStopping(how);
  };

  if (gen) {
    return (
      <Modal title="" width={760}
        footer={stopping ? <span style={{ fontSize: 14, color: C.sub }}>{stopping === "open" ? "지금 만드는 것까지 끝내고 편집 화면을 열어요…" : "멈추는 중… (지금 만드는 것 하나는 끝까지 기다려요)"}</span> : (
          <>
            <Btn onClick={() => stop("discard")}><Icon name="close" size={16} />중지하고 닫기</Btn>
            <span style={{ flex: 1 }} />
            <Btn onClick={() => stop("open")}><Icon name="check" size={16} />여기까지 만든 것으로 열기</Btn>
          </>
        )}>
        <Working title={gen.title} detail={gen.detail || "[중지하고 닫기]를 누르면 만들지 않고 대본으로 돌아가요"} frac={gen.frac ?? null} />
      </Modal>
    );
  }

  const chip = (on: boolean): React.CSSProperties => ({ height: 36, padding: "0 14px", borderRadius: 5, border: `1px solid ${on ? C.text : C.line2}`, background: on ? C.text : "transparent", color: on ? C.bg : C.sub, fontSize: 14, fontWeight: 700, fontFamily: FONT, cursor: "pointer" });
  const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "14px 0", borderBottom: `1px solid ${C.line}` };
  const steps = ["대본 작성", "영상 꾸미기"];
  let no = 0; // 대본 작성 칸 번호 — 그리는 차례대로
  const head = (text: React.ReactNode, inline?: boolean) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: inline ? 0 : 8 }}>
      <span style={{ width: 22, height: 22, flexShrink: 0, borderRadius: 11, background: C.accent, color: "#fff", fontSize: 12.5, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{++no}</span>
      <span style={{ ...label, margin: 0 }}>{text}</span>
    </div>
  );

  const footer = (
    <>
      {step > 1 && <Btn onClick={() => setStep(step - 1)}>이전</Btn>}
      {step === 0 && <Btn primary onClick={() => setStep(1)}>다음 <Icon name="chevron" size={16} /></Btn>}
      {/* 대본을 다 쓰면 만드는 방식을 고른다 (2026-10-20 사장님) — 내가 직접 녹화·녹음 / AI 보이스 */}
      {step === 1 && onRecord && (
        <Btn onClick={() => onRecord(script.trim())} disabled={!script.trim()} title="이 대본을 프롬프터에 띄우고 내가 직접 읽으며 녹화해요. 녹화가 끝나면 편집 화면으로 가요">
          <Icon name="record" size={16} />직접 녹화·녹음하고 편집
        </Btn>
      )}
      {step === 1 && <Btn primary onClick={() => setStep(2)} disabled={!script.trim()} title="AI 성우가 대본을 읽고 사진·영상·자막을 붙여요"><Icon name="mic" size={16} />AI 보이스로 만들고 편집 <Icon name="chevron" size={16} /></Btn>}
      {step === 2 && <Btn primary onClick={() => setConfirm(true)} disabled={!lineCount}>완료 <Icon name="chevron" size={16} /></Btn>}
    </>
  );

  return (
    <Modal steps={steps} step={step - 1} onClose={onCancel} width={1440} footer={footer}>
      {step === 0 && (
        <div style={{ padding: "22px 28px" }}>
          <div style={{ fontSize: 20, fontWeight: 800, textAlign: "center", marginBottom: 18 }}>원하는 영상 스타일을 고르세요</div>
          <button type="button" onClick={() => { pickStyle(null); setStep(1); }}
            style={{ width: "100%", height: 64, borderRadius: 6, border: `1px solid ${C.line2}`, background: C.card, color: C.text, fontSize: 17, fontWeight: 800, fontFamily: FONT, cursor: "pointer" }}>
            스타일 없이 바로 시작하기
          </button>
          <div style={{ ...label, margin: "22px 0 10px" }}>추천 스타일</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {STYLES.map((s) => (
              <button key={s.id} type="button" onClick={() => pickStyle(s)}
                style={{ textAlign: "left", padding: "18px 18px", borderRadius: 6, border: `1px solid ${style?.id === s.id ? C.accent : C.line2}`, background: style?.id === s.id ? C.accentDim : C.card, color: C.text, cursor: "pointer", fontFamily: FONT }}>
                <Icon name={s.icon} size={26} />
                <div style={{ fontSize: 17, fontWeight: 800, marginTop: 12 }}>{s.name}</div>
                <div style={{ fontSize: 14, color: C.sub, marginTop: 4, lineHeight: 1.5 }}>{s.desc}</div>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 16 }}><Hint>스타일을 누른 뒤 아래 [다음]을 누르세요. 스타일마다 대본 말투·목소리·음악이 정해져 있어요.</Hint></div>
        </div>
      )}

      {step === 1 && (
        <div style={{ display: "flex", minHeight: "calc(92vh - 160px)" }}>
          <div style={{ width: 480, flexShrink: 0, padding: "22px 26px", borderRight: `1px solid ${C.line}`, display: "flex", flexDirection: "column", gap: 18 }}>
            {/* 순서대로 번호 (2026-10-20 사장님) — 갈래마다 칸이 달라 번호는 그리는 차례로 매긴다 */}
            <div>
            {head("무엇으로 쓸까요")}
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" onClick={() => { setSrc("vacancy"); loadVacs(); setPurpose(purpose); }} style={chip(src === "vacancy")}>매물 소개</button>
              <button type="button" onClick={() => { setSrc("news"); setNewsPurpose(newsPurpose); if (!arts) void loadArts(""); }} style={chip(src === "news")}>뉴스 기사</button>
              <button type="button" onClick={() => setSrc("topic")} style={chip(src === "topic")}>자유 주제</button>
            </div>
            </div>
            {src === "vacancy" && (
              <div>
                {head("공실 고르기")}
                <div style={{ display: "flex", gap: 6 }}>
                  <select value={vacId} onFocus={loadVacs} onChange={(e) => chooseVac(e.target.value)} style={{ ...input, fontSize: 14, flex: 1, minWidth: 0 }}>
                    <option value="">{vacs === null ? "내 공실 불러오는 중…" : `공실을 고르세요 (${vacs.length}개)`}</option>
                    {(vacs || []).map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                  </select>
                  <Btn onClick={openGongsil} title="공실열람을 새 창으로 열어요 (공실을 골랐으면 그 공실)"><Icon name="open" size={15} />공실열람</Btn>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <input value={vacNo} onChange={(e) => setVacNo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && vacNo.trim()) void findByNo(); }}
                    placeholder="번호로 찾기 — 공실번호 (88633) · 경매 관리번호 (2026-18154-001)" style={{ ...input, fontSize: 13.5, height: 38, flex: 1, minWidth: 0 }} />
                  <Btn onClick={() => void findByNo()} disabled={!vacNo.trim()}><Icon name="search" size={15} />찾기</Btn>
                </div>
                {vacInfo && <div style={{ fontSize: 13.5, color: C.sub, marginTop: 6 }}>사진 {vacInfo.photos.length}장을 PC에 받아 뒀어요. 가격·면적은 등록된 값 그대로 써요.</div>}
                {vacInfo && <CapStrip items={vacInfo.shots || []} busy={false} label="공실열람 검증·지도·로드뷰 화면" />}
                <div style={{ height: 18 }} />
                {head("용도")}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {PURPOSES.map((x) => <button key={x.id} type="button" onClick={() => setPurpose(x.id)} style={{ ...chip(purpose === x.id), height: 34 }}>{x.name}</button>)}
                </div>
                <div style={{ fontSize: 12.5, color: C.dim, marginTop: 5 }}>{PURPOSES.find((x) => x.id === purpose)?.hint}{PURPOSES.find((x) => x.id === purpose)?.ratio ? ` · 화면 ${PURPOSES.find((x) => x.id === purpose)?.ratio}` : ""}</div>
                {yt && (
                  <div style={{ marginTop: 10, padding: 12, borderRadius: 6, border: `1px solid ${C.accent}`, background: C.accentDim }}>
                    <div style={{ fontSize: 14.5, fontWeight: 800 }}>이 공실은 유튜브 대본이 있어요</div>
                    <div style={{ fontSize: 13, color: C.sub, marginTop: 4, lineHeight: 1.5 }}>「{yt.title}」 · 약 {Math.round(yt.seconds)}초 — 다시 쓰지 않고 가져올 수 있어요 (AI 이용 횟수 안 써요)</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                      <Btn small primary onClick={takeYt}><Icon name="plus" size={15} />그대로 가져오기</Btn>
                      <Btn small onClick={() => void write(undefined, true)} disabled={Boolean(writing)} title="유튜브 대본을 바탕으로 고른 용도에 맞게 다시 써요 (AI 사용)"><Icon name="pen" size={15} />{PURPOSES.find((x) => x.id === purpose)?.name} 용도로 고쳐 쓰기</Btn>
                    </div>
                  </div>
                )}
              </div>
            )}
            {src === "news" && (
              <div>
                {head("기사 고르기")}
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  <button type="button" onClick={() => setNewsFrom("gongsil")} style={{ ...chip(newsFrom === "gongsil"), height: 32 }}>공실뉴스 기사</button>
                  <button type="button" onClick={() => setNewsFrom("naver")} style={{ ...chip(newsFrom === "naver"), height: 32 }}>네이버 뉴스</button>
                  <button type="button" onClick={() => setNewsFrom("press")} style={{ ...chip(newsFrom === "press"), height: 32 }}>보도자료</button>
                </div>
                {newsFrom === "gongsil" ? (
                  <>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input value={artQ} onChange={(e) => setArtQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void loadArts(); }} placeholder="기사 찾기 (제목) · 또는 기사 주소 붙여넣기" style={{ ...input, fontSize: 13.5, height: 38, flex: 1, minWidth: 0 }} />
                      <Btn onClick={() => (/^https?:\/\//i.test(artQ.trim()) ? void takeNews("url", artQ.trim()) : void loadArts())}><Icon name="search" size={15} />찾기</Btn>
                    </div>
                    <div style={{ marginTop: 6, maxHeight: 168, overflowY: "auto", border: `1px solid ${C.line}`, borderRadius: 6 }}>
                      {arts === null ? <div style={{ padding: 10, fontSize: 13, color: C.dim }}>기사 목록을 불러오는 중…</div>
                        : !arts.length ? <div style={{ padding: 10, fontSize: 13, color: C.dim }}>찾은 기사가 없어요</div>
                        : arts.map((a) => (
                          <button key={a.id} type="button" onClick={() => void takeNews("article", a.id)} title={a.title}
                            style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 10px", border: "none", borderBottom: `1px solid ${C.line}`, background: news?.title === a.title ? C.accentDim : "transparent", color: C.text, fontFamily: FONT, cursor: "pointer" }}>
                            <div style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
                            <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>{a.date} · {a.author}</div>
                          </button>
                        ))}
                    </div>
                  </>
                ) : newsFrom === "press" ? (
                  <>
                    {PRESS_SITES.map((g) => (
                      <div key={g.group} style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center", marginBottom: 6 }}>
                        <span style={{ width: 62, flexShrink: 0, fontSize: 12.5, fontWeight: 800, color: C.sub }}>{g.group}</span>
                        {g.items.map((x) => (
                          <button key={x.url} type="button" onClick={() => openSite(x.url)} title={`${x.name} 보도자료 열기 — ${x.url}`}
                            style={{ height: 28, padding: "0 9px", borderRadius: 14, border: `1px solid ${C.line2}`, background: "transparent", color: C.text, fontSize: 12.5, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>{x.name} ↗</button>
                        ))}
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      <input value={newsUrl} onChange={(e) => setNewsUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newsUrl.trim()) void takeNews("url", newsUrl.trim()); }} placeholder="보도자료 주소 붙여넣기 (https://…)" style={{ ...input, fontSize: 13.5, height: 38, flex: 1, minWidth: 0 }} />
                      <Btn onClick={() => void takeNews("url", newsUrl.trim())} disabled={!newsUrl.trim() || Boolean(writing)}>가져오기</Btn>
                    </div>
                    {columnBridge() && <div style={{ marginTop: 6 }}><Btn small onClick={() => void takeNews("grab")} disabled={Boolean(writing)} title="전용 크롬에서 보고 있는 보도자료를 가져와요">지금 보는 보도자료 가져오기</Btn></div>}
                    <div style={{ fontSize: 12, color: C.dim, marginTop: 6, lineHeight: 1.5 }}>사이트를 누르면 전용 크롬에 열려요. 보도자료 한 건을 연 뒤 [지금 보는 보도자료 가져오기]를 누르세요.</div>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input value={newsUrl} onChange={(e) => setNewsUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newsUrl.trim()) void takeNews("url", newsUrl.trim()); }} placeholder="네이버 뉴스 기사 주소 붙여넣기 (https://n.news.naver.com/…)" style={{ ...input, fontSize: 13.5, height: 38, flex: 1, minWidth: 0 }} />
                      <Btn onClick={() => void takeNews("url", newsUrl.trim())} disabled={!newsUrl.trim() || Boolean(writing)}>가져오기</Btn>
                    </div>
                    {columnBridge() && (
                      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        <Btn small onClick={() => void columnBridge()!.openNews().catch((e) => setErr(errText(e)))}><Icon name="open" size={14} />네이버 뉴스 열기</Btn>
                        <Btn small onClick={() => void takeNews("grab")} disabled={Boolean(writing)} title="전용 크롬에서 보고 있는 기사를 가져와요">지금 보는 뉴스 가져오기</Btn>
                      </div>
                    )}
                  </>
                )}
                {news && (
                  <div style={{ marginTop: 10, padding: 10, borderRadius: 6, border: `1px solid ${C.accent}`, background: C.accentDim }}>
                    <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.4 }}>{news.title}</div>
                    <div style={{ fontSize: 12.5, color: C.sub, marginTop: 3 }}>{[news.publisher, news.publishedAt].filter(Boolean).join(" · ")} · 본문 {news.body.length.toLocaleString()}자 — 문장은 새로 쓰고 사실만 살려요</div>
                    <CapStrip items={caps} busy={capping} />
                  </div>
                )}
                <div style={{ height: 18 }} />
                {head("용도")}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {NEWS_PURPOSES.map((x) => <button key={x.id} type="button" onClick={() => setNewsPurpose(x.id)} style={{ ...chip(newsPurpose === x.id), height: 34 }}>{x.name}</button>)}
                </div>
                <div style={{ fontSize: 12.5, color: C.dim, marginTop: 5 }}>{NEWS_PURPOSES.find((x) => x.id === newsPurpose)?.hint}</div>
              </div>
            )}
            {(
              <>
                {src === "topic" && (
                  <div>
                    {head("주제")}
                    <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="예: 전세 계약할 때 꼭 확인할 것" style={input} />
                  </div>
                )}
                <div>
                  {head(<>대본 요청 <span style={{ color: C.dim, fontWeight: 600 }}>(선택)</span></>)}
                  <textarea value={request} onChange={(e) => setRequest(e.target.value)} rows={3} placeholder="말투·보는 사람·꼭 넣을 내용 (예: 신혼부부에게, 친근하게)" style={{ ...input, height: "auto", padding: 10, lineHeight: 1.5, resize: "vertical" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ flex: 1 }}>{head("글자 수 정하기", true)}</span>
                  <Toggle on={useChars} onChange={setUseChars} />
                  <input type="number" min={100} max={5000} step={50} value={chars} onChange={(e) => setChars(Number(e.target.value))} disabled={!useChars} style={{ ...input, width: 96, textAlign: "right" }} />
                  <span style={{ fontSize: 14, color: C.sub }}>자</span>
                </div>
                <div>{head("쓸 AI")}<AiPick value={aiSel} onChange={setAiSel} list={aiList} noTitle /></div>
                <div>{head("대본 쓰기")}
                <Btn primary onClick={() => void write()} disabled={Boolean(writing) || (src === "topic" && !topic.trim()) || (src === "vacancy" && !vacInfo) || (src === "news" && !news)} style={{ height: 52, fontSize: 16.5, width: "100%" }}>
                  <Icon name="pen" size={18} />{aiName}로 대본 쓰기
                </Btn>
                </div>
                {writing && <div style={{ fontSize: 14, color: C.sub }}>{writing}</div>}
              </>
            )}
            {src === "topic" && <Hint>대본이 이미 있으면 AI 없이 오른쪽 칸에 바로 쓰거나 붙여 넣어도 돼요. 빈 줄로 나누면 씬이 나뉘고, 문장마다 클립이 돼요.</Hint>}
            {err && <div style={{ fontSize: 14, color: C.danger, lineHeight: 1.5 }}>{err}</div>}
          </div>
          <div style={{ flex: 1, padding: "22px 26px", display: "flex", flexDirection: "column" }}>
            {head("대본 확인·고치기 — 다 되면 아래에서 만드는 방식을 고르세요")}
            <textarea value={script} onChange={(e) => setScript(e.target.value)} placeholder="직접 대본을 쓰거나, 왼쪽에서 AI로 쓰기를 눌러 보세요."
              style={{ flex: 1, minHeight: 400, padding: 16, borderRadius: 6, border: `1px solid ${C.line2}`, background: C.bg, color: C.text, fontSize: 17, lineHeight: 1.85, fontFamily: FONT, resize: "none", outline: "none" }} />
            {/* 수정 요청 — 대본이 있으면 */}
            {script.trim() && (
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 10 }}>
                <input value={revReq} onChange={(e) => setRevReq(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && revReq.trim() && !writing) { void write(revReq.trim()); setRevReq(""); } }}
                  placeholder="수정 요청 (예: 30초로 짧게, 첫 문장을 궁금하게, 관리비 얘기는 빼 줘)" disabled={Boolean(writing)} style={{ ...input, flex: 1, height: 40, fontSize: 14 }} />
                <Btn primary onClick={() => { void write(revReq.trim()); setRevReq(""); }} disabled={!revReq.trim() || Boolean(writing)}><Icon name="pen" size={15} />다시 쓰기</Btn>
                {history.length > 0 && <Btn onClick={undoScript} disabled={Boolean(writing)} title="바로 앞 대본으로"><Icon name="undo" size={15} />되돌리기</Btn>}
              </div>
            )}
            {writing && script.trim() && <div style={{ fontSize: 13.5, color: C.sub, marginTop: 6 }}>{writing}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14, marginTop: 8, fontSize: 14, color: C.sub }}>
              {b.saveText && script.trim() && (
                <Btn small onClick={async () => { try { const f = await b.saveText!((projName ?? defaultName).trim() || "대본", script); setTextSaved(f || ""); if (f) setErr(""); } catch (e) { setErr(errText(e)); } }} style={{ marginRight: "auto" }} title="저장할 폴더와 파일 이름을 고르고 .txt 로 저장 (처음은 문서 › 공실뉴스 스튜디오 › 대본)">
                  <Icon name="file" size={15} />텍스트로 내려받기
                </Btn>
              )}
              {textSaved && b.showFile && <button type="button" onClick={() => b.showFile(textSaved)} title="저장한 폴더 열기" style={{ border: "none", background: "transparent", color: C.accent, fontSize: 13, fontFamily: FONT, cursor: "pointer", marginRight: "auto", marginLeft: -6, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>✓ {textSaved.split(/[\\/]/).pop()} 저장됨</button>}
              <span>클립 {lineCount}개</span>
              <span>약 {Math.floor(seconds / 60) ? `${Math.floor(seconds / 60)}분 ` : ""}{Math.round(seconds % 60)}초</span>
              <span>{script.length.toLocaleString()} / 10,000자</span>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: "flex", minHeight: 520 }}>
          <div style={{ width: 460, flexShrink: 0, padding: "8px 22px 18px", borderRight: `1px solid ${C.line}` }}>
            <div style={{ marginTop: 10 }}>
              <SaveAsFields compact name={projName ?? defaultName} setName={setProjName} folder={folder} setFolder={setFolder}
                note={src === "vacancy" && !folder ? "공실 영상은 기본으로 그 매물 폴더에 저장돼요" : undefined} />
            </div>
            <div style={{ ...row, flexWrap: "wrap" }}>
              <span style={{ ...label, width: "100%" }}>화면 비율</span>
              {(Object.keys(RATIO_LABEL) as Ratio[]).map((r) => <button key={r} type="button" onClick={() => { setRatio(r); setSubLines(r === "9:16" ? 1 : 2); }} style={chip(ratio === r)}>{r}</button>)}
            </div>
            <div style={{ ...row, flexWrap: "wrap" }}>
              <span style={{ ...label, flex: 1 }}>자막</span>
              <Toggle on={subOn} onChange={setSubOn} />
              {subOn && (
                <div style={{ width: "100%", display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {([["top", "상단"], ["middle-high", "중상단"], ["middle", "중단"], ["middle-low", "중하단"], ["bottom", "하단"]] as const).map(([k, l]) => <button key={k} type="button" onClick={() => setSubPos(k)} style={chip(subPos === k)}>{l}</button>)}
                  <span style={{ width: 10 }} />
                  <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                    <span style={{ fontSize: 14, color: C.sub, marginRight: 4 }} title="자막이 이보다 길면 이 줄 수만큼씩 말하는 때에 맞춰 넘어가요">한 화면 최대</span>
                    {([1, 2, 3] as const).map((n) => <button key={n} type="button" onClick={() => setSubLines(n)} style={chip(subLines === n)}>{n}줄</button>)}
                  </div>
                </div>
              )}
            </div>
            <div style={{ ...row, flexWrap: "wrap" }}>
              <span style={{ ...label, flex: 1 }}>AI 목소리</span>
              <Toggle on={voiceOn} onChange={setVoiceOn} />
              {voiceOn && (
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* 목록 대신 — 고른 성우 얼굴 카드, 누르면 얼굴 카드 창 */}
                  {(() => {
                    const v = findVoice(voiceId);
                    return (
                      <button type="button" onClick={() => setVoicePick(true)} title="눌러서 목소리 바꾸기"
                        style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: 10, borderRadius: 8, border: `1px solid ${C.line2}`, background: C.card, color: C.text, fontFamily: FONT, cursor: "pointer", textAlign: "left" }}>
                        {v && <VoiceFace id={v.id} name={v.name} size={56} />}
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "block", fontSize: 17, fontWeight: 800 }}>{v?.name || "목소리"}</span>
                          {v && <span style={{ display: "block", fontSize: 14, color: C.sub, marginTop: 3 }}>{v.kind}{"age" in v && "mood" in v ? ` · ${v.age} · ${v.mood}` : ""}</span>}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.sub, display: "inline-flex", alignItems: "center", gap: 4 }}>바꾸기<Icon name="chevron" size={14} /></span>
                      </button>
                    );
                  })()}
                  {voicePick && <VoicePanel initial={{ id: voiceId, speed, emotion }} pickLabel="이 목소리로" targetCount={0}
                    onApply={(o) => { setVoiceId(o.id); setSpeed(o.speed); setEmotion(o.emotion); setVoicePick(false); }} onClose={() => setVoicePick(false)} />}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 14, color: C.sub, width: 50 }}>빠르기</span>
                    <input type="range" min={0.7} max={1.6} step={0.05} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} style={{ flex: 1, accentColor: C.accent }} />
                    <span style={{ fontSize: 14, width: 44, textAlign: "right" }}>{speed.toFixed(2)}배</span>
                  </div>
                </div>
              )}
            </div>
            <div style={{ ...row, flexWrap: "wrap", padding: 12, borderRadius: 8, border: `1px solid ${aiDeco ? C.accent : C.line2}`, background: aiDeco ? C.accentDim : "transparent" }}>
              <span style={{ ...label, flex: 1 }}>✦ AI가 다 꾸미기 <span style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>· {writer}가 자막 스타일·효과·그래픽·효과음까지</span></span>
              <Toggle on={aiDeco} onChange={setAiDeco} />
              {aiDeco && <div style={{ width: "100%", fontSize: 12.5, color: C.sub, lineHeight: 1.6, marginTop: 4 }}>영상이 만들어지면 편집 화면에서 AI 편집이 저절로 시작돼요 (1~2분). 마음에 안 들면 한 번에 되돌릴 수 있어요.</div>}
            </div>
            <div style={{ ...row, flexWrap: "wrap" }}>
              <span style={{ ...label, flex: 1 }}>사진 자동 움직임 <span style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>· 줌인·좌우·상하로 천천히</span></span>
              <Toggle on={motionOn} onChange={setMotionOn} />
            </div>
            <div style={{ ...row, flexWrap: "wrap" }}>
              <span style={{ ...label, flex: 1 }}>배경 음악</span>
              <Toggle on={musicOn} onChange={setMusicOn} />
              {musicOn && <div style={{ width: "100%", display: "flex", gap: 6, flexWrap: "wrap" }}>{MUSIC_MOODS.map((m) => <button key={m} type="button" onClick={() => { setMood(m); if (track?.kind === "lib") setTrack(null); }} style={chip(mood === m && track?.kind !== "mine")}>{m}</button>)}</div>}
              {musicOn && (
                <div style={{ width: "100%", marginTop: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: C.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      ♪ {track ? track.label : `${(MUSIC_LIBRARY.find((x) => x.mood === mood) || MUSIC_LIBRARY[0]).label} (분위기 첫 곡)`}
                    </span>
                    <button type="button" onClick={() => setMusicPick(true)} style={chip(false)}>곡 직접 고르기</button>
                  </div>
                  {musicPick && (
                    // 편집 화면과 같은 [배경 음악] 칸 — 공실뉴스 음악 · 내 음악 · 무료 음악 사이트 (고르기만, 담는 건 [완료] 때)
                    <div onClick={() => setMusicPick(false)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.55)", display: "flex", justifyContent: "flex-end" }}>
                      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", height: "100%" }}>
                        <MusicPanel project={{ dir: "" } as Project} current={track ? ({ name: track.label } as Layer) : null} rangeText="" onPick={() => {}} onClose={() => setMusicPick(false)}
                          choose={(c) => { setTrack({ kind: c.kind, id: c.id, label: c.name }); setMusicPick(false); }} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ ...row, flexDirection: "column", alignItems: "stretch", gap: 10 }}>
              <span style={label}>화면 자료</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button type="button" onClick={() => setVisualLater(false)} style={chip(!visualLater)}>지금 함께 넣기</button>
                <button type="button" onClick={() => setVisualLater(true)} style={chip(visualLater)}>나중에 넣기 (목소리만 먼저)</button>
              </div>
              {visualLater && <div style={{ fontSize: 13.5, color: C.sub, lineHeight: 1.6 }}>목소리·자막·음악만 먼저 만들어요 (빨라요). 화면은 검게 두고, 편집 화면에서 클립마다 [사진·영상]으로 넣으면 돼요.</div>}
              {!visualLater && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center" }}><span style={{ flex: 1, fontSize: 15 }}>내 영상에서 고르기 <span style={{ fontSize: 12.5, color: C.sub }}>· AI가 문장에 맞춰 장면을 골라요</span></span><Toggle on={footOn} onChange={setFootOn} /></div>
                  {footOn && (
                    <>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <Btn small onClick={async () => {
                          // 첨부 = [내 자료]에 담기 (PC에서 불러오기와 같다)
                          const added = await b.lib.pick().catch(() => []);
                          const ok = added.filter((x) => x.kind === "video" || x.kind === "image");
                          if (ok.length) setFoot((v) => [...v, ...ok.filter((x) => !v.some((y) => y.id === x.id))]);
                        }}><Icon name="plus" size={15} />영상·사진 첨부</Btn>
                        <Btn small onClick={async () => { setFootSel(foot.map((x) => x.id)); setFootPick(await b.lib.list({ kind: "all" }).catch(() => [])); }}><Icon name="folder" size={15} />내 자료에서 고르기</Btn>
                      </div>
                      {foot.length > 0 ? (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {foot.map((f) => (
                            <span key={f.id} title={f.name} style={{ position: "relative", width: 72, height: 44, borderRadius: 4, overflow: "hidden", background: "#000", border: `1px solid ${C.line2}` }}>
                              {f.thumb && <img src={f.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                              {f.kind === "video" && <span style={{ position: "absolute", left: 3, bottom: 2, fontSize: 10.5, color: "#fff", background: "rgba(0,0,0,0.6)", padding: "0 3px", borderRadius: 2 }}>{Math.round(f.duration)}초</span>}
                              <button type="button" title="빼기" onClick={() => setFoot((v) => v.filter((x) => x.id !== f.id))} style={{ position: "absolute", right: 2, top: 2, width: 18, height: 18, borderRadius: 9, border: 0, background: "rgba(0,0,0,0.65)", color: "#fff", cursor: "pointer", fontSize: 11, lineHeight: "18px", padding: 0 }}>✕</button>
                            </span>
                          ))}
                        </div>
                      ) : <div style={{ fontSize: 13, color: C.sub }}>찍어 둔 영상·사진을 넣어 주세요 (10개 안팎). 첨부한 것은 [내 자료]에도 담겨요.</div>}
                    </>
                  )}
                </div>
              )}
              {!visualLater && src === "vacancy" && vacInfo && <div style={{ display: "flex", alignItems: "center" }}><span style={{ flex: 1, fontSize: 15 }}>공실 사진 쓰기 ({vacInfo.photos.length}장)</span><Toggle on={usePhotos} onChange={setUsePhotos} /></div>}
              {!visualLater && ((src === "vacancy" && vacInfo?.shots?.length) || (src === "news" && caps.length)) ? (
                <div style={{ display: "flex", alignItems: "center" }} title="문장에 맞는 캡쳐 화면을 AI가 골라 넣어요"><span style={{ flex: 1, fontSize: 15 }}>화면 캡쳐 넣기 ({src === "vacancy" ? vacInfo?.shots?.length : caps.length}장 · AI가 문장에 맞춰)</span><Toggle on={useCaps} onChange={setUseCaps} /></div>
              ) : null}
              {!visualLater && <div style={{ display: "flex", alignItems: "center" }}><span style={{ flex: 1, fontSize: 15 }}>무료 영상·사진 (Pexels·Pixabay)</span><Toggle on={useStock} onChange={setUseStock} /></div>}
              {!visualLater && <div style={{ display: "flex", alignItems: "center" }}><span style={{ flex: 1, fontSize: 15 }}>AI 그림 ({imager}, 느림 · 최대 8장)</span><Toggle on={useAi} onChange={setUseAi} /></div>}
            </div>
            <div style={{ ...row, flexWrap: "wrap", borderBottom: 0 }}>
              <span style={{ ...label, width: "100%" }}>채우기</span>
              {([["cover", "꽉 채우기"], ["contain", "맞추기"], ["blur", "흐린 배경"]] as const).map(([k, l]) => <button key={k} type="button" onClick={() => setFill(k)} style={chip(fill === k)}>{l}</button>)}
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, gap: 14 }}>
            <div style={{ fontSize: 14, color: C.sub }}>예시 화면</div>
            {(() => {
              const [w, h] = ratio.split(":").map(Number);
              const W = w >= h ? 460 : (340 * w) / h;
              const H = (W * h) / w;
              return (
                <div style={{ position: "relative", width: W, height: H, background: "#2a2b30", border: `1px solid ${C.line2}`, borderRadius: 4, overflow: "hidden" }}>
                  {subOn && (
                    <div style={{ position: "absolute", left: 10, right: 10, textAlign: "center", ...(subPos === "top" ? { top: H * 0.08 } : subPos === "middle-high" ? { top: H * 0.24 } : subPos === "middle" ? { top: "45%" } : subPos === "middle-low" ? { bottom: H * 0.24 } : { bottom: H * 0.07 }) }}>
                      <span style={{ fontFamily: "'Malgun Gothic', sans-serif", fontWeight: 700, fontSize: Math.min(W, H) * 0.075, color: "#fff", WebkitTextStroke: "2px #000", paintOrder: "stroke fill" }}>자막은 이 위치에 보여요</span>
                    </div>
                  )}
                </div>
              );
            })()}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", fontSize: 14, color: C.sub }}>
              <span>{ratio} {RATIO_LABEL[ratio]}</span>
              {voiceOn && <span>{findVoice(voiceId)?.name}</span>}
              {musicOn && <span>{track ? `♪ ${track.label}` : `${mood} 음악`}</span>}
              <span>클립 {lineCount}개 · 약 {Math.round(seconds)}초</span>
            </div>
            {voiceOn && b.voiceSave && b.exportPick && lineCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap", fontSize: 14, color: C.sub }}>
                <span>영상 말고 목소리만 파일로 저장</span>
                <Btn small onClick={() => void saveVoice("mp3")}><Icon name="music" size={15} />MP3</Btn>
                <Btn small onClick={() => void saveVoice("wav")}><Icon name="music" size={15} />WAV (고음질)</Btn>
              </div>
            )}
            {saved && <div style={{ fontSize: 14, color: C.accent, textAlign: "center", wordBreak: "break-all" }}>목소리 파일을 저장했어요 — {saved}</div>}
            {err && <div style={{ fontSize: 14, color: C.danger }}>{err}</div>}
          </div>
        </div>
      )}

      {footPick && (
        <Modal title="내 자료에서 고르기" onClose={() => setFootPick(null)} width={720}
          footer={<><Btn onClick={() => setFootPick(null)}>취소</Btn><Btn primary onClick={() => { setFoot(footPick.filter((x) => footSel.includes(x.id))); setFootPick(null); }}><Icon name="check" size={16} />{footSel.length}개 넣기</Btn></>}>
          <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, maxHeight: "60vh", overflowY: "auto" }}>
            {footPick.filter((x) => x.kind === "video" || x.kind === "image").map((x) => {
              const on = footSel.includes(x.id);
              return (
                <button key={x.id} type="button" onClick={() => setFootSel((v) => (on ? v.filter((y) => y !== x.id) : [...v, x.id]))}
                  style={{ position: "relative", aspectRatio: "16 / 10", padding: 0, borderRadius: 4, overflow: "hidden", border: `2px solid ${on ? C.accent : "transparent"}`, background: "#000", cursor: "pointer" }}>
                  {x.thumb && <img src={x.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                  {on && <span style={{ position: "absolute", left: 5, top: 5, width: 22, height: 22, borderRadius: 4, background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={15} /></span>}
                  {x.kind === "video" && <span style={{ position: "absolute", left: 5, bottom: 4, fontSize: 11.5, color: "#fff", background: "rgba(0,0,0,0.6)", padding: "0 4px", borderRadius: 3 }}>{Math.round(x.duration)}초</span>}
                </button>
              );
            })}
            {!footPick.length && <div style={{ color: C.sub, fontSize: 14 }}>아직 [내 자료]가 없어요. [영상·사진 첨부]로 넣어 주세요.</div>}
          </div>
        </Modal>
      )}
      {confirm && (
        <Modal title="확인" onClose={() => setConfirm(false)} width={520} footer={<><Btn onClick={() => setConfirm(false)}>취소</Btn><Btn primary onClick={build}>확인</Btn></>}>
          <div style={{ padding: 22, fontSize: 16, lineHeight: 1.8 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>영상 만들기를 시작할까요?</div>
            <div style={{ color: C.sub, fontSize: 15 }}>
              클립 {lineCount}개 · {voiceOn ? findVoice(voiceId)?.name : "목소리 없음"}
              {visualLater ? " · 화면은 나중에" : <>{footOn && foot.length ? ` · 내 영상 ${foot.length}개 (AI가 골라요)` : ""}{photoCount ? ` · 공실 사진 ${photoCount}장` : ""}{useStock ? " · 무료 영상" : ""}{useAi ? ` · AI 그림(${imager})` : ""}</>}
              <br />예상 {visualLater ? "1분 안팎" : useAi ? "5~10분" : lineCount > 20 ? "2~4분" : "1~2분"}
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}

/** 캡쳐한 화면 줄 — 작은 그림 몇 장 + 몇 장인지 */
function CapStrip({ items, busy, label: what = "화면 캡쳐" }: { items: LibItem[]; busy: boolean; label?: string }) {
  if (!busy && !items.length) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 5 }}>{busy ? "화면을 캡쳐하는 중…" : `${what} ${items.length}장 — 영상 만들 때 문장에 맞춰 넣어요`}</div>
      {items.length > 0 && (
        <div style={{ display: "flex", gap: 5, overflowX: "auto" }}>
          {items.map((it) => <img key={it.id} src={it.thumb || it.url} alt="" title={it.name} style={{ width: 96, height: 54, objectFit: "cover", borderRadius: 4, border: `1px solid ${C.line2}`, flexShrink: 0 }} />)}
        </div>
      )}
    </div>
  );
}
