"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { chooseWebAi, openDocked, webAi, webAsk, webAskImage } from "./ai-ask";
import { NO_HELPER, api, download, getMember, helper, helperJob, helperOn, helperWait, newId, now, onProgress, options, pickFiles, readFile, safeName, say, sleep, toJpeg, tx, useQuota, ymd, zipDownload } from "./core";
import { getMyArticlePhotos } from "@/app/actions/studioWebColumn";
import { listFolder, markRestored, restored, saveToFolder } from "./folder";

/**
 * 웹 뉴스·SNS자동화 [공실뉴스] — 앱(window.gongsilStudio)의 대역 (공통은 core.ts) (2026-11-03 사장님: 앱의 공실뉴스 부분을 웹에서도 똑같이)
 *
 * 화면(StudioSnsSection · StudioChannelTabs · 각 패널)은 앱과 같은 코드를 쓰고, 앱이 PC 에서 하던 일만 여기서 웹 방식으로 한다.
 *  - 분석: 숨은 창(iframe)에 공실열람 상세를 열고 앱과 같은 읽기 코드(inject/gongsil-page.js)로 매물 정보·등록 사진을 읽는다.
 *          화면 3장(공실열람 검증·지도·로드뷰)은 웹에서 못 찍는다 (앱에서)
 *  - 글쓰기: 서버(/api/studio/web)가 앱과 같은 확장 프롬프트로 질문을 만들고 → 회원 AI(새 탭, 복사·붙여넣기) → 서버가 답을 나눈다
 *  - 저장: 이 브라우저(IndexedDB)에 — 앱의 PC 저장 자리 (다른 PC·브라우저에서는 안 보인다)
 *  - 채우기: 공실뉴스 작성기(크롬 확장 4.1.0~, 2026-11-04 도우미 합침)에게 웹페이지가 직접 일감을 넘긴다 (web-bridge.js)
 *  - 이용 횟수: 앱과 같은 /api/studio/usage (블로그·SNS·유튜브)
 * 앱과 같은 일을 하는 곳: studio-app/src blog-writer.js · sns-writer.js · all-writer.js · youtube-writer.js · naver-write.js · main.js(vacancy-*)
 */

type Src = { key: string; kind: string; src: string; caption: string; real: boolean; addedAt: number };
type Analysis = { vacancyId: string; vacancy: any; media: Src[]; hidden: Src[]; failures: string[]; analyzedAt: string };
type DocMedia = { id: string; kind: string; file: string; src?: string; caption: string; isCover: boolean; insertAfterParagraph?: number | null };
type Doc = { vacancyId: string; style: string; length: string; section1?: string; section2?: string; title: string; subtitles: string[]; paragraphs: string[]; keywords: string[]; media: DocMedia[]; seenFiles?: string[]; writtenAt: string; revisedAt?: string; editedAt?: string };
type Sns = { vacancyId: string; noun: string; listing: any; posts: Record<string, any>; pool: DocMedia[]; media: Record<string, string[]>; seenFiles?: string[]; tone?: unknown; writtenAt: string };
type Yt = { title: string; titles: string[]; narration: string[]; settings: Record<string, string>; detailUrl: string; listing: any; writtenAt: string; revisedAt?: string; editedAt?: string };
// column — 뉴스칼럼(번호 "col-…", 2026-11-04 웹): 소재는 회원 본인 기사. 사진은 analysis.media 에 (공실과 같은 길을 탄다)
//  links — 올린 게시물 주소 { blog·instagram·threads·facebook·youtube: url } (회원 PC 작업 파일에만, 2026-11-06)
type Column = { source: any; createdAt: string; articleNo: string; links?: Record<string, string> };
type Work = { key: string; memberId: string; vacancyId: string; analysis: Analysis; column?: Column; article?: Doc; blog?: Doc; sns?: Sns; youtube?: Yt; updatedAt: string };

const CHANNELS = ["instagram", "threads", "facebook"];
const HOME: Record<string, string> = { instagram: "https://www.instagram.com/", threads: "https://www.threads.com/", facebook: "https://www.facebook.com/" };
const BLOG_HOME_URL = "https://section.blog.naver.com/BlogHome.naver?directoryNo=0&currentPage=1&groupId=0";
const FIT_KINDS = new Set(["proof", "map", "roadview", "capture"]); // 화면 캡처는 자르지 않고 흰 여백으로

const keyOf = (vacancyId: string) => `${getMember()}:${vacancyId}`;
const getWork = (vacancyId: string) => tx<Work | undefined>("readonly", (s) => s.get(keyOf(vacancyId))).then((w) => w || null).catch(() => null);
const putWork = (w: Work) => tx("readwrite", (s) => s.put({ ...w, updatedAt: now() })).then((r) => { gsnLater(w.vacancyId); return r; });
const allWorks = async () => {
  await restoreFromFolder();
  return tx<Work[]>("readonly", (s) => s.getAll()).then((l) => (l || []).filter((w) => w.memberId === getMember())).catch(() => [] as Work[]);
};

/* ── PC 폴더 작업 파일 .gsn (2026-11-04 사장님: PC 폴더 저장 — 문서\공실뉴스 뉴스SNS발행\프로젝트6110461104 작업이름.gsn)
   작업이 바뀌면 3초 쉬었다가 통째로 쓴다 (앱 gsn.js 와 같은 자리·이름). 폴더를 안 정했으면 아무것도 안 한다.
   파일 이름은 처음 정한 것을 이 브라우저에 기억 — 제목을 고쳐도 같은 파일에 쓴다.
   다른 브라우저(엣지↔크롬)·새 PC 에서 같은 폴더를 고르면 목록을 열 때 브라우저 안에 없는 작업을 되살린다 */
const GSN_KIND = "gongsilnews-web-gsn";
const GSN_NAMES = "gs-web-gsn-names";
const gsnNames = (): Record<string, { day: string; name: string; dir?: string }> => { try { return JSON.parse(localStorage.getItem(GSN_NAMES) || "{}"); } catch { return {}; } };
const setGsnName = (key: string, v: { day: string; name: string; dir?: string }) => { try { localStorage.setItem(GSN_NAMES, JSON.stringify({ ...gsnNames(), [key]: v })); } catch { /* */ } };
const dayOf = (iso: string) => { const d = new Date(iso || Date.now()); return isNaN(+d) ? ymd() : `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`; };
const gsnTimers = new Map<string, ReturnType<typeof setTimeout>>();
function gsnLater(vacancyId: string) {
  clearTimeout(gsnTimers.get(vacancyId));
  gsnTimers.set(vacancyId, setTimeout(() => { gsnTimers.delete(vacancyId); void gsnWrite(vacancyId); }, 3000));
}
async function gsnWrite(vacancyId: string) {
  const w = await getWork(vacancyId);
  if (!w) return;
  let at = gsnNames()[w.key];
  // 처음이거나 예전 자리(프로젝트\날짜 · 메뉴별 폴더)면 새 자리로 — 01 뉴스SNS발행 바로 밑 (2026-11-06 사장님: "폴더가 너무 많아", "뉴스SNS발행 폴더 밑에 20261106 제목")
  //  예전 파일은 그대로 남아 계속 읽힌다
  if (!at || at.dir !== GSN_ROOT) {
    const day = dayOf(w.column?.createdAt || w.analysis?.analyzedAt || w.updatedAt);
    const dir = GSN_ROOT, base = `${day} ${workName(w) || "작업"}`;
    // 같은 날 같은 제목의 다른 글이 있으면 덮어쓰지 않게 (2), (3)…
    const taken = new Set(Object.entries(gsnNames()).filter(([k, v]) => k !== w.key && v.dir === dir && v.day === day).map(([, v]) => v.name));
    let name = `${base}.gsn`;
    for (let n = 2; taken.has(name); n++) name = `${base} (${n}).gsn`;
    at = { dir, day, name };
  }
  const body = JSON.stringify({ kind: GSN_KIND, version: 1, savedAt: now(), work: w });
  if (await saveToFolder("sns", [], at.name, new Blob([body], { type: "application/json" }))) setGsnName(w.key, at);
}
async function restoreFromFolder() {
  if (restored || !getMember()) return;
  markRestored();
  // 01 뉴스SNS발행 바로 밑(+ 한 단계 아래 메뉴별 폴더) + 예전 프로젝트\날짜
  const files = [
    ...(await listFolder("sns", [], ".gsn")).map((f) => ({ ...f, dir: f.path.length ? f.path[0] : GSN_ROOT })),
    ...(await listFolder("sns", ["프로젝트"], ".gsn")).map((f) => ({ ...f, dir: "프로젝트" })),
  ];
  for (const f of files) {
    try {
      const d = JSON.parse(await f.file.text());
      const w: Work | undefined = d && d.kind === GSN_KIND ? d.work : undefined;
      if (!w || w.memberId !== getMember() || w.key !== `${w.memberId}:${w.vacancyId}`) continue; // 다른 회원 작업은 안 읽는다
      const have = await tx<Work | undefined>("readonly", (s) => s.get(w.key)).catch(() => undefined);
      if (!have || String(have.updatedAt) < String(w.updatedAt)) await tx("readwrite", (s) => s.put(w)); // 폴더 것이 더 새것일 때만
      if (f.dir === GSN_ROOT && gsnNames()[w.key]?.dir !== GSN_ROOT) setGsnName(w.key, { dir: GSN_ROOT, day: /^(\d{8})/.exec(f.name)?.[1] || "", name: f.name }); // 새 자리 파일이면 그 이름을 기억
    } catch { /* 못 읽는 파일은 건너뛴다 */ }
  }
}
/** 폴더를 새로 고르면 되살리기를 다시 (folder.ts 가 restored 를 내린다) — 목록 화면이 다시 읽게 알린다 */
if (typeof window !== "undefined") window.addEventListener("gs-folder-change", () => { window.dispatchEvent(new Event("gs-works-change")); });
async function need(vacancyId: string) {
  const w = await getWork(vacancyId);
  if (!w) throw new Error("먼저 [분석]을 해 주세요.");
  return w;
}

/* 작업 파일 이름·폴더 (2026-11-06 사장님: 자유 글쓰기가 "20261106 뉴스칼럼_" 으로 제목이 빠지던 것)
   파일 이름 = 년월일 8자리 + 제목(앞 40자) · 01 뉴스SNS발행 바로 밑, 하위 폴더 없음 (사장님 "날짜 폴더는 필요없어", "폴더가 너무 많아") */
const workName = (w: Work) => {
  if (w.column) {
    const s: any = w.column.source || {};
    return safeName(s.mode === "topic" ? s.topic?.subject || "자유 글" : s.news?.title || "뉴스칼럼");
  }
  const no = fieldOf(w.analysis.vacancy, "공실광고번호") || "";
  return safeName(`${no ? `${no} ` : ""}${w.analysis.vacancy?.title || "공실"}`);
};
/** 01 뉴스SNS발행 바로 밑 (하위 폴더 없음) — 기억해 둔 자리 표시 */
const GSN_ROOT = "root";

/* ── 뉴스칼럼 (앱 column-writer.js) — 웹은 본인이 쓴 공실뉴스 기사만 소재로 (2026-11-04 사장님) ── */
const isCol = (id: string) => /^col-[a-f0-9]+$/.test(String(id || ""));
let colOpt: Promise<any> | null = null;
const colOptions = () => (colOpt ||= api("options", { column: true }).catch((e) => { colOpt = null; throw e; }));
/** 이 작업의 선택지 — 칼럼이면 뉴스메이커 것 */
const optionsOf = (w: Work | null) => (w?.column ? colOptions() : options(w?.analysis.vacancy));
/** 서버에 함께 보낼 칼럼 소재 (공실이면 없음) */
const colBody = (w: Work) => (w.column ? { source: w.column.source, column: true } : {});

/* ── 사진 설명 (앱 vacancy-capture.js captionFor 와 같은 문구) ── */
function fieldOf(v: any, ...labels: string[]) {
  for (const want of labels) { const hit = (v?.fields || []).find((f: any) => f.label === want); if (hit) return String(hit.value); }
  return "";
}
function captionFor(kind: string, v: any, index = 0) {
  if (v && v.saleKind) {
    const name = (v.title || fieldOf(v, "소재지(지번)", "소재지")) || "해당 물건";
    const price = v.priceText || "";
    if (kind === "proof") return `[공실열람 ${v.saleKind} 물건 정보] 공실뉴스 공실열람에 게재된 '${name}'${price ? ` (${price})` : ""} ${v.saleKind} 물건 현황`;
    if (kind === "photo") return index === 0 ? `${name} 전경 (자료: 공실뉴스)` : `${name} 사진 ${index + 1} (자료: 공실뉴스)`;
    return name;
  }
  const name = (v && (v.title || fieldOf(v, "소재지"))) || "해당 매물";
  const price = (v && v.priceText) || "";
  if (kind === "proof") return `[공실뉴스 실매물 등록 검증] 공실뉴스에 공식 등록된 '${name}'${price ? ` (${price})` : ""} 등록 현황`;
  if (kind === "photo") return index === 0 ? `${name} 현장 실물 전경 (자료: 공실뉴스)` : `${name} 현장 실물 ${index + 1} (자료: 공실뉴스)`;
  return name;
}
const EXCLUDED_FACT = /정보\s*제공|고객\s*센터|주의\s*사항|1588-?5321/;

/* ── 매물 출처 (앱 naver-write fetchListing) ── */
async function fetchListing(vacancyId: string, saleKind = "") {
  const site = (await options()).siteUrl || "https://www.gongsilnews.com";
  if (saleKind) {
    const r = await fetch(`/api/extension/auction-source?id=${encodeURIComponent(vacancyId)}&for=blog`);
    const d = await r.json().catch(() => ({}));
    if (!d || !d.success) throw new Error((d && d.error) || "경매·공매 물건 정보를 가져오지 못했습니다.");
    const fact = (...labels: string[]) => ((d.facts || []).find((f: any) => labels.includes(f.label)) || {}).value || "";
    return { detailUrl: `${site}${d.detailPath}`, location: d.location || "", propertyType: d.propertyType || "", saleKind: d.saleKind || "", caseLabel: fact("관리번호") ? "관리번호" : "사건번호", caseNo: fact("관리번호", "사건번호"), agency: fact("집행기관", "관할법원"), capturedAt: now() };
  }
  const r = await fetch(`/api/extension/vacancy-source?id=${encodeURIComponent(vacancyId)}`);
  const d = await r.json().catch(() => ({}));
  if (!d || !d.success) throw new Error((d && d.error) || "매물 출처 정보를 가져오지 못했습니다.");
  return { detailUrl: `${site}${d.detailPath}`, location: d.location || "", propertyType: d.propertyType || "", tradeType: d.tradeType || "", owner: d.owner || null, capturedAt: now() };
}

/* ── 분석 (앱 vacancy-capture analyzeVacancy) ── */
let pageScript: Promise<string> | null = null;
/* o.shots === false — 화면 캡처(공실열람·로드뷰 등 5장) 없이 공실 정보·등록 사진만 (2026-11-10 사장님: "분석은 위에서 하지 말고 분석이라고 누를 때 해줘")
 *  [SNS뉴스발행]으로 처음 열 때는 이것만 — 화면 캡처는 [↻ 다시 분석]을 누를 때 */
async function analyze(vacancyId: string, o: { shots?: boolean } = {}) {
  say("vacancy", "공실열람 화면을 여는 중…");
  if (!pageScript) pageScript = api("pageScript").then((d) => String(d.script || "")).catch((e) => { pageScript = null; throw e; });
  const script = await pageScript;
  const prev = await getWork(vacancyId);
  const frame = document.createElement("iframe");
  Object.assign(frame.style, { position: "fixed", left: "-20000px", top: "0", width: "1440px", height: "900px", border: "0", opacity: "0", pointerEvents: "none" });
  frame.setAttribute("aria-hidden", "true");
  frame.src = `/gongsil?id=${encodeURIComponent(vacancyId)}`;
  document.body.appendChild(frame);
  try {
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("공실열람 화면이 열리지 않았습니다. 잠시 뒤 다시 해 주세요.")), 40000);
      frame.onload = () => { clearTimeout(t); resolve(); };
    });
    const w = frame.contentWindow as any;
    w.eval(script);
    const deadline = Date.now() + 25000;
    while (!(w.__gongsilStudio && w.__gongsilStudio.isReady())) {
      if (Date.now() > deadline) throw new Error("공실열람 상세 화면이 열리지 않았습니다. 공실 번호를 확인해 주세요.");
      await sleep(300);
    }
    await sleep(1200); // 사진·표가 다 그려질 때까지
    say("vacancy", "매물 정보를 읽는 중…");
    const got = w.__gongsilStudio.collectVacancy();
    if (!got || !got.ok) throw new Error((got && got.reason) || "매물 정보를 읽지 못했습니다.");
    let vacancy = got.vacancy;
    // 경매·공매 물건이면 서버의 물건 정보 (앱 fetchAuction 과 같다)
    const ar = await fetch(`/api/extension/auction-source?id=${encodeURIComponent(vacancy.vacancyId || vacancyId)}`).then((r) => r.json()).catch(() => null);
    if (ar && ar.success) {
      vacancy = { vacancyId: ar.id, saleKind: ar.saleKind, title: ar.title, priceText: ar.priceText, location: ar.location, propertyType: ar.propertyType, detailPath: ar.detailPath,
        fields: (ar.facts || []).filter((f: any) => !EXCLUDED_FACT.test(`${f.label} ${f.value}`)), images: (vacancy.images || []).length ? vacancy.images : ar.images || [], url: vacancy.url };
      say("vacancy", `${vacancy.saleKind} 물건으로 확인했습니다.`);
    } else if (!(vacancy.fields || []).length) throw new Error("매물 상세 표를 읽지 못했습니다.");

    const media: Src[] = [];
    const failures: string[] = [];
    const t0 = Date.now();
    (vacancy.images || []).forEach((u: string, i: number) => media.push({ key: `photo:${u}`, kind: "photo", src: u, caption: captionFor("photo", vacancy, i), real: true, addedAt: t0 }));

    // 실제 화면 5장 — 공실열람에 나와 있는 모습 · 상세 창 · 로드뷰 · 스카이뷰 · 주변 지도 (2026-11-09 사장님: 단지 분석처럼)
    //  예전엔 "웹에서 못 찍는다"며 뺐다 — 이제 창 전체에 띄워 도우미(또는 크롬 공유)로 실제 화면을 찍는다. 주소 비공개 매물은 로드뷰·스카이뷰를 찍지 않는다
    frame.remove();
    if (o.shots !== false) try {
      const { captureVacancyScreens } = await import("../writing/realScreenShot");
      const shots = await captureVacancyScreens(vacancy.vacancyId || vacancyId, String(vacancy.title || ""), (t) => say("vacancy", t));
      const KIND: Record<string, string> = { screen: "proof", panel: "detail", street: "roadview", sky: "sky", wide: "map" };
      for (const [i, s] of shots.entries()) {
        const src = await toJpeg(s.url, 1600).catch(() => "");
        URL.revokeObjectURL(s.url);
        if (src) media.push({ key: `shot:${s.key}`, kind: KIND[s.key] || "proof", src, caption: s.caption, real: true, addedAt: t0 + 1 + i });
      }
      if (!shots.length) failures.push("화면 사진을 찍지 못했어요 (건너뛰었거나 공유를 취소)");
    } catch { failures.push("화면 사진을 찍지 못했어요"); }

    // 다시 분석해도 회원이 넣은 사진(내 사진)은 남기고, 뺀 사진은 계속 뺀 채로 (앱과 같다)
    const hidden: Src[] = [];
    if (prev) {
      const mine = (m: Src) => m.kind === "ai" || m.kind === "upload";
      const gone = new Set((prev.analysis.hidden || []).filter((m) => !mine(m)).map((m) => m.key));
      for (let i = media.length - 1; i >= 0; i--) if (gone.has(media[i].key)) hidden.unshift(...media.splice(i, 1));
      media.push(...(prev.analysis.media || []).filter(mine));
      hidden.push(...(prev.analysis.hidden || []).filter(mine));
    }
    // 글의 주인공은 회원의 부동산 — 중개사무소 이름 (앱과 같다, 못 받으면 빈칸)
    if (!vacancy.saleKind) {
      const listing = await fetchListing(vacancyId, "").catch(() => null);
      if (listing?.owner?.type === "agency" && listing.owner.name) {
        vacancy.office = listing.owner.name;
        if (listing.owner.homepage) vacancy.homepage = listing.owner.homepage;
      } else if (listing?.owner?.type === "general" && listing.owner.name) vacancy.landlord = listing.owner.name;
    }
    const analysis: Analysis = { vacancyId, vacancy, media, hidden, failures, analyzedAt: now() };
    const work: Work = prev ? { ...prev, analysis } : { key: keyOf(vacancyId), memberId: getMember(), vacancyId, analysis, updatedAt: now() };
    syncAnalysisMedia(work);
    await putWork(work);
    return analysisForWeb(analysis);
  } finally {
    frame.remove();
  }
}
/* 분석 내용 고치기 (2026-11-06 사장님: "분석 내용 · 글의 재료를 수정할 수 있어야 함") — 공실 정보 항목 · 주변 환경 · 특징
   AI 는 이 내용만 보고 쓰므로, 고친 뒤 쓰는 글부터 반영된다. [다시 분석]하면 새로 읽은 값으로 바뀐다 */
async function saveVacancyInfo(vacancyId: string, patch: { fields?: { label: string; value: string }[]; infra?: string; themes?: string[] }) {
  const w = await need(vacancyId);
  const v = { ...(w.analysis.vacancy || {}) };
  if (Array.isArray(patch.fields)) v.fields = patch.fields.map((f) => ({ label: String(f.label || "").trim(), value: String(f.value || "").trim() })).filter((f) => f.label && f.value);
  if (typeof patch.infra === "string") v.infra = patch.infra.trim();
  if (Array.isArray(patch.themes)) v.themes = patch.themes.map((t) => String(t || "").trim()).filter(Boolean);
  w.analysis = { ...w.analysis, vacancy: v };
  await putWork(w);
  return analysisForWeb(w.analysis);
}
const analysisForWeb = (a: Analysis) => ({
  vacancyId: a.vacancyId,
  vacancy: a.vacancy,
  failures: a.failures || [],
  media: (a.media || []).map((m) => ({ kind: m.kind, caption: m.caption, thumb: m.src, real: m.kind !== "ai" && m.real !== false })),
  hiddenCount: (a.hidden || []).length,
});

/* 분석 사진 정리 — 순서·빼기·되살리기·내 사진·AI 이미지 (앱 main.js mediaOp) */
async function mediaOp(vacancyId: string, op: any) {
  // 내 사진 고르기 창은 누른 순간에 열어야 한다 (브라우저가 막지 않게) — 기다리기 전에
  const files = op?.type === "upload" ? (Array.isArray(op.files) ? Promise.resolve(op.files as File[]) : pickFiles(true)) : null;
  const w = await need(vacancyId);
  const a = w.analysis;
  if (op.type === "order") {
    const ord = (op.order || []).map(Number);
    if (ord.length !== a.media.length || new Set(ord).size !== ord.length) throw new Error("사진 순서를 읽지 못했어요.");
    a.media = ord.map((i: number) => a.media[i]);
  } else if (op.type === "remove") {
    const [m] = a.media.splice(Number(op.index), 1);
    if (m) a.hidden.push(m);
  } else if (op.type === "restore") {
    a.media.push(...a.hidden);
    a.hidden = [];
  } else if (op.type === "upload") {
    const list = await files!;
    if (!list.length) return analysisForWeb(a);
    for (const f of list) {
      const src = await toJpeg(await readFile(f), 1600);
      // 오픈자료(Pixabay)는 출처 글을 달고, 실제 매물 사진이 아니므로 대표 사진으로 앞세우지 않는다
      if (op.caption) a.media.push({ key: `stock:${newId()}`, kind: "stock", src, caption: String(op.caption), real: false, addedAt: Date.now() });
      else a.media.push({ key: `upload:${newId()}`, kind: "upload", src, caption: `${f.name.replace(/\.[^.]+$/, "")} (직접 올린 사진)`, real: true, addedAt: Date.now() });
    }
  } else if (op.type === "ai") {
    // AI 이미지 만들기 (2026-11-04 사장님: 웹도 내 사진 + AI 이미지, 스타일 20여 가지) — 앱 main.js mediaOp 와 같은 질문을
    // 회원 본인 ChatGPT·Gemini 옆 창에서 그려 가져온다 ([AI 설정] 이미지 칸). 서버 AI 는 쓰지 않는다
    const prompt = String(op.prompt || "").trim();
    if (!prompt) throw new Error("무엇을 그릴지 적어 주세요.");
    let style = String(op.stylePrompt || "").slice(0, 1200);
    if (!style && op.style) { try { style = (await api("imageStyleText", { style: op.style, ...colBody(w) })).text || ""; } catch { /* 이름만 */ } }
    const ask = [prompt, style || op.styleLabel ? `[화풍·스타일] ${op.styleLabel || ""}${style ? "\n" + style : ""}` : "부동산 매물 소개에 쓸 실사 느낌 사진", "가로 4:3 비율", "이미지 안에 글자·숫자·로고·사람 얼굴 없이"].join("\n\n");
    const src = await toJpeg(await webAskImage(ask), 1600);
    await useQuota("ai_image", vacancyId);
    a.media.push({ key: `ai:${newId()}`, kind: "ai", src, caption: `AI 생성 이미지${op.styleLabel ? `(${op.styleLabel})` : ""} — ${prompt.slice(0, 40)} (실제 매물 사진 아님)`, real: false, addedAt: Date.now() });
  } else throw new Error("알 수 없는 작업이에요.");
  // 대표(맨 앞)는 실제 사진
  const isReal = (m: Src) => m && m.kind !== "ai" && m.real !== false;
  const firstReal = a.media.findIndex(isReal);
  if (firstReal > 0 && !isReal(a.media[0])) a.media.unshift(a.media.splice(firstReal, 1)[0]);
  syncAnalysisMedia(w);
  await putWork(w);
  return analysisForWeb(a);
}

/* ── 기사·블로그 (앱 blog-writer.js) ── */
const srcMap = (w: Work) => new Map([...(w.analysis.media || []), ...(w.analysis.hidden || [])].map((m) => [m.key, m.src]));
const thumbOf = (w: Work, m: DocMedia, map = srcMap(w)) => m.src || map.get(m.file) || null;
const seedMedia = (w: Work): DocMedia[] => (w.analysis.media || []).map((m, i) => ({ id: newId(), kind: m.kind, file: m.key, caption: m.caption, isCover: i === 0 }));
function seenOf(d: { seenFiles?: string[]; writtenAt?: string; media?: DocMedia[] }, an: Analysis, files = (d.media || []).map((m) => m.file)) {
  if (Array.isArray(d.seenFiles)) return new Set([...d.seenFiles, ...files]);
  const since = Date.parse(d.writtenAt || "") || 0;
  return new Set([...files, ...(an.media || []).filter((m) => m.kind !== "ai" && (m.addedAt || 0) <= since).map((m) => m.key)]);
}
/* 분석 사진을 고치면 이미 쓴 기사·블로그에도 — 뺀 사진은 글에서도 뺀다 (앱 syncAnalysisMedia)
 *  새로 넣은 사진은 글 맨 앞 — 첫 장이 대표 사진 (2026-11-10 사장님: "공실뉴스기사 블로그 인스타그램 스레드 페이스북에 들어가게 · 싱크 · 앞으로") */
function syncAnalysisMedia(w: Work) {
  const an = w.analysis;
  const gone = new Set((an.hidden || []).map((m) => m.key));
  for (const doc of ["article", "blog"] as const) {
    const d = w[doc];
    if (!d || !Array.isArray(d.media)) continue;
    const before = d.media.length;
    let media = d.media.filter((m) => !gone.has(m.file));
    const have = new Set(media.map((m) => m.file));
    const end = (d.paragraphs || []).length;
    const seen = seenOf(d, an);
    void end;
    // 글의 재료에 있는 사진은 기사·블로그에 늘 들어간다 — 빠진 사진은 맨 앞에 (2026-11-10 사장님: "기사와 블로그에도 들어가야지")
    //  사진을 글에서 빼려면 글의 재료에서 뺀다 (빼면 글에서도 빠진다)
    const added = (an.media || []).filter((m) => !have.has(m.key)).map((m, i) => ({ id: newId(), kind: m.kind, file: m.key, caption: m.caption, isCover: false, insertAfterParagraph: i === 0 ? null : 0 }));
    if (!added.length && media.length === before && Array.isArray(d.seenFiles)) continue;
    if (added.length) {
      // 새 사진 첫 장(실제 사진이면)이 대표 — 원래 대표는 첫 문단 뒤로
      const coverOk = added[0].kind !== "ai";
      media = media.map((m) => (coverOk && m.isCover ? { ...m, isCover: false, insertAfterParagraph: 0 } : m));
      if (coverOk) added[0].isCover = true; else added[0].insertAfterParagraph = 0;
      media = [...added, ...media];
    }
    if (media.length && !media.some((m) => m.isCover)) media[0].isCover = true;
    d.media = media;
    d.seenFiles = [...new Set([...seen, ...media.map((m) => m.file)])];
    d.editedAt = now();
  }
}
function docForWeb(w: Work, doc: "article" | "blog") {
  const d = w[doc];
  if (!d) return null;
  const map = srcMap(w);
  return {
    doc, vacancyId: w.vacancyId, style: d.style, length: d.length, title: d.title, subtitles: d.subtitles || [], paragraphs: d.paragraphs, keywords: d.keywords,
    section1: d.section1 || "", section2: d.section2 || "",
    version: [d.writtenAt, d.revisedAt, d.editedAt].map((v) => v || "").join("|"),
    media: (d.media || []).map((m) => ({ id: m.id, kind: m.kind, caption: m.caption, isCover: Boolean(m.isCover), insertAfterParagraph: Number.isInteger(m.insertAfterParagraph) ? m.insertAfterParagraph : null, thumb: thumbOf(w, m, map) })),
  };
}
const referenceArticle = (w: Work) => (w.article ? { title: w.article.title, subtitles: w.article.subtitles || [], body: w.article.paragraphs.join("\n\n") } : null);
async function saveWritten(w: Work, doc: "article" | "blog", parsed: { title: string; subtitles: string[]; paragraphs: string[]; keywords: string[]; section1?: string; section2?: string }, extra: { style: string; length: string }) {
  const prev = w[doc];
  const media = prev && prev.media && prev.media.length ? prev.media.map((m) => ({ ...m, insertAfterParagraph: m.isCover ? null : undefined })) : seedMedia(w);
  const laid = (await api("layout", { media, paragraphCount: parsed.paragraphs.length })).media as DocMedia[];
  w[doc] = { vacancyId: w.vacancyId, ...extra, ...(parsed.section1 ? { section1: parsed.section1, section2: parsed.section2 || "" } : {}), title: parsed.title, subtitles: parsed.subtitles || [], paragraphs: parsed.paragraphs, keywords: parsed.keywords || [], media: laid, ...(prev && Array.isArray(prev.seenFiles) ? { seenFiles: prev.seenFiles } : {}), writtenAt: now() };
  if (prev) syncAnalysisMedia(w);
}
async function blogGet(vacancyId: string, doc: "article" | "blog" = "blog") {
  const w = await getWork(vacancyId);
  if (!w) return null;
  // 열 때도 글의 재료 사진과 맞춘다 — 전에 넣어 둔 사진도 기사·블로그에 (2026-11-10 사장님: "기사와 블로그에도 들어가야지")
  const before = JSON.stringify([w.article?.media, w.blog?.media]);
  syncAnalysisMedia(w);
  if (JSON.stringify([w.article?.media, w.blog?.media]) !== before) await putWork(w);
  return docForWeb(w, doc);
}
async function blogSave(p: any) {
  const w = await need(p.vacancyId);
  const doc = p.doc === "article" ? "article" : "blog";
  const d = w[doc];
  if (!d) throw new Error("저장할 글이 없습니다.");
  if (typeof p.title === "string") d.title = p.title.trim();
  if (Array.isArray(p.subtitles)) d.subtitles = p.subtitles.map((s: string) => String(s).trim()).filter(Boolean).slice(0, 3);
  if (Array.isArray(p.paragraphs)) d.paragraphs = p.paragraphs.map((s: string) => String(s).trim()).filter(Boolean);
  if (Array.isArray(p.keywords)) d.keywords = p.keywords.map((k: string) => String(k).replace(/^#+/, "").trim()).filter(Boolean);
  if (Array.isArray(p.media)) {
    const byId = new Map(d.media.map((m) => [m.id, m]));
    d.media = p.media.filter((m: any) => byId.has(m.id)).map((m: any) => ({
      ...byId.get(m.id)!,
      caption: typeof m.caption === "string" ? m.caption : byId.get(m.id)!.caption,
      isCover: Boolean(m.isCover),
      insertAfterParagraph: m.isCover ? null : Number.isInteger(m.insertAfterParagraph) ? Math.min(m.insertAfterParagraph, d.paragraphs.length) : d.paragraphs.length,
    }));
  }
  d.editedAt = now();
  await putWork(w);
  return { ok: true };
}
async function blogRevise({ vacancyId, doc = "blog", request }: { vacancyId: string; doc?: string; request: string }) {
  const w = await need(vacancyId);
  const which = doc === "article" ? "article" : "blog";
  const d = w[which];
  if (!d) throw new Error(`먼저 ${which === "article" ? "기사" : "블로그"}를 써 주세요.`);
  const { prompt } = await api("revisePrompt", { doc: which, request, vacancy: w.analysis.vacancy, draft: d, ref: which === "blog" ? referenceArticle(w) : null, ...colBody(w) });
  const r = await webAsk(prompt, `${which === "article" ? "기사" : "블로그"}를 고치고 있습니다`, async (text) => {
    const x = await api("reviseParse", { doc: which, text, ...colBody(w) });
    if (!x.ok) throw new Error(x.error);
    return x.doc;
  });
  say("blog", "고친 글을 정리하는 중…");
  d.title = r.title || d.title;
  if (which === "article" && Array.isArray(r.subtitles) && r.subtitles.length) d.subtitles = r.subtitles;
  if (which === "article" && r.section1) { d.section1 = r.section1; d.section2 = r.section2 || ""; }
  d.paragraphs = r.paragraphs;
  if (Array.isArray(r.keywords) && r.keywords.length) d.keywords = r.keywords;
  d.media.forEach((m) => { if (Number.isInteger(m.insertAfterParagraph)) m.insertAfterParagraph = Math.min(m.insertAfterParagraph as number, d.paragraphs.length); });
  d.revisedAt = now();
  await putWork(w);
  return docForWeb(w, which);
}
async function blogAddPhoto({ vacancyId, doc = "blog", dataUrl, slot, replaceId, kind = "upload", caption = "" }: any) {
  const w = await need(vacancyId);
  const which = doc === "article" ? "article" : "blog";
  const d = w[which];
  if (!d) throw new Error("먼저 글을 써 주세요.");
  const src = await toJpeg(dataUrl, 1600);
  if (replaceId) {
    const item = d.media.find((m) => m.id === replaceId);
    if (!item) throw new Error("바꿀 사진을 찾지 못했습니다.");
    Object.assign(item, { src, kind, file: `doc:${newId()}`, ...(caption ? { caption } : {}) });
    await putWork(w);
    return { id: item.id, kind: item.kind, caption: item.caption, isCover: Boolean(item.isCover), insertAfterParagraph: Number.isInteger(item.insertAfterParagraph) ? item.insertAfterParagraph : null, thumb: src };
  }
  const id = newId();
  const item: DocMedia = { id, kind, file: `doc:${id}`, src, caption, isCover: false, insertAfterParagraph: Number.isInteger(slot) ? Math.min(slot, d.paragraphs.length) : d.paragraphs.length };
  d.media.push(item);
  await putWork(w);
  return { id, kind, caption, isCover: false, insertAfterParagraph: item.insertAfterParagraph, thumb: src };
}

/* AI 사진 만들기 (2026-11-04 사장님: 내 사진뿐 아니라 AI 사진도) — 앱 blog-writer.js makeImage 와 같은 질문(서버 imagePrompt)을
   회원 본인 ChatGPT·Gemini 옆 창에서 그려 가져온다. 서버 AI 는 쓰지 않는다. 설명에는 "(AI 생성 이미지)"가 붙는다 */
async function blogMakeImage({ vacancyId, doc = "blog", style, request, slot, replaceId, styleLabel, stylePrompt }: any) {
  const w = await need(vacancyId);
  const d = w[doc === "article" ? "article" : "blog"];
  if (!d) throw new Error("먼저 글을 써 주세요.");
  const { prompt, caption } = await api("imagePrompt", { vacancy: w.analysis?.vacancy, title: d.title, body: d.paragraphs.join("\n\n"), style, request, styleLabel, stylePrompt, ...colBody(w) });
  const dataUrl = await webAskImage(prompt);
  await useQuota("ai_image", vacancyId);
  return blogAddPhoto({ vacancyId, doc, dataUrl, slot, replaceId, kind: "ai", caption });
}

/* ── SNS (앱 sns-writer.js) ── */
function photoPool(w: Work): DocMedia[] {
  if (w.blog && w.blog.media.length) return w.blog.media.map((m) => ({ id: m.id, kind: m.kind, file: m.file, src: m.src, caption: m.caption, isCover: Boolean(m.isCover) }));
  return seedMedia(w);
}
async function pickMedia(w: Work) {
  const prev = w.sns;
  const pool = photoPool(w);
  const fresh = await api("snsPick", { pool: pool.map((m) => ({ id: m.id, kind: m.kind, caption: m.caption, ai: m.kind === "ai" })) });
  const media: Record<string, string[]> = {};
  for (const ch of CHANNELS) {
    media[ch] = prev && Array.isArray(prev.media?.[ch]) && prev.media[ch].length && prev.media[ch].every((id) => pool.some((m) => m.id === id)) ? prev.media[ch] : fresh.media[ch] || [];
    // 고른 사진이 없으면 글의 재료 사진을 순서대로 (2026-11-10 사장님: "글의 재료에 사진을 넣으면 인스타그램 스레드 페북 블로그 사진이 되어야 함")
    if (!media[ch].length) media[ch] = pool.map((m) => m.id);
  }
  return { pool, media };
}
async function syncNewMedia(w: Work) {
  const data = w.sns;
  if (!data) return;
  syncAnalysisMedia(w);
  const gone = new Set((w.analysis.hidden || []).map((m) => m.key));
  let pool = (data.pool || []).filter((m) => !gone.has(m.file));
  const inPool = new Set(pool.map((m) => m.file));
  pool = pool.concat(photoPool(w).filter((m) => !inPool.has(m.file) && !gone.has(m.file)).map((m) => ({ ...m, isCover: false })));
  const byId = new Map(pool.map((m) => [m.id, m]));
  const used = new Set<string>();
  for (const ch of CHANNELS) for (const id of data.media?.[ch] || []) { const m = byId.get(id); if (m) used.add(m.file); }
  const seen = seenOf(data as any, w.analysis, [...used]);
  const fresh = pool.filter((m) => !used.has(m.file) && !seen.has(m.file));
  const emptyCh = pool.length > 0 && CHANNELS.some((ch) => !(data.media?.[ch] || []).some((id) => byId.has(id)));
  if (!fresh.length && !emptyCh && pool.length === (data.pool || []).length && Array.isArray(data.seenFiles)) return;
  const max = Object.fromEntries(((await options()).channels as any[]).map((c) => [c.id, c.maxMedia || 10]));
  const media: Record<string, string[]> = {};
  // 새 사진은 채널마다 맨 앞 — 장수 한도에 잘리지 않게 (2026-11-10 사장님: "앞으로")
  //  채널에 사진이 하나도 없으면 글의 재료 사진을 순서대로 채운다 (2026-11-10)
  for (const ch of CHANNELS) {
    const keep = (data.media?.[ch] || []).filter((id) => byId.has(id));
    media[ch] = (keep.length ? fresh.map((m) => m.id).concat(keep) : pool.map((m) => m.id)).slice(0, max[ch]);
  }
  w.sns = { ...data, pool, media, seenFiles: [...new Set([...seen, ...used, ...fresh.map((m) => m.file)])] };
}
async function snsForWeb(w: Work) {
  const data = w.sns;
  if (!data) return null;
  const map = srcMap(w);
  const byId = new Map((data.pool || []).map((m) => [m.id, m]));
  const per: Record<string, DocMedia[]> = Object.fromEntries(CHANNELS.map((ch) => [ch, (data.media?.[ch] || []).map((id) => byId.get(id)).filter(Boolean) as DocMedia[]]));
  const c = await api("snsCompose", { ...colBody(w), posts: data.posts, noun: data.noun, listing: data.listing, ai: Object.fromEntries(CHANNELS.map((ch) => [ch, per[ch].map((m) => m.kind === "ai")])) });
  const thumb = (m: DocMedia) => thumbOf(w, m, map);
  const channels: Record<string, unknown> = {};
  for (const ch of CHANNELS) {
    channels[ch] = {
      post: data.posts[ch] || null,
      composed: c.channels[ch].composed,
      media: per[ch].map((m) => ({ id: m.id, kind: m.kind, caption: m.caption, ai: m.kind === "ai", thumb: thumb(m) })),
      aiNote: c.channels[ch].aiNote,
    };
  }
  return { vacancyId: w.vacancyId, channels, pool: (data.pool || []).map((m) => ({ id: m.id, kind: m.kind, caption: m.caption, ai: m.kind === "ai", thumb: thumb(m) })), writtenAt: data.writtenAt };
}
async function snsGet(vacancyId: string) {
  const w = await getWork(vacancyId);
  if (!w || !w.sns) return null;
  await syncNewMedia(w);
  await putWork(w);
  return snsForWeb(w);
}
async function snsSave({ vacancyId, channel, post, mediaIds }: any) {
  const w = await need(vacancyId);
  if (!w.sns) throw new Error("저장할 SNS 글이 없습니다.");
  if (!CHANNELS.includes(channel)) throw new Error("알 수 없는 채널입니다.");
  if (post) w.sns.posts[channel] = post;
  if (Array.isArray(mediaIds)) {
    const max = ((await options()).channels as any[]).find((c) => c.id === channel)?.maxMedia || 10;
    w.sns.media[channel] = mediaIds.filter((id: string) => w.sns!.pool.some((m) => m.id === id)).slice(0, max);
  }
  await putWork(w);
  return (await snsForWeb(w))!.channels[channel];
}
async function snsRevise({ vacancyId, channel, request }: any) {
  const w = await need(vacancyId);
  if (!w.sns) throw new Error("먼저 SNS 글을 써 주세요.");
  const { prompt } = await api("revisePrompt", { doc: "sns", channel, request, vacancy: w.analysis.vacancy, posts: w.sns.posts, ref: referenceArticle(w), tone: w.sns.tone, ...colBody(w) });
  const post = await webAsk(prompt, "SNS 글을 고치고 있습니다", async (text) => {
    const x = await api("reviseParse", { doc: "sns", channel, text, ...colBody(w) });
    if (!x.ok) throw new Error(x.error);
    return x.post;
  });
  w.sns.posts[channel] = post;
  await putWork(w);
  return (await snsForWeb(w))!.channels[channel];
}
/* 채널 비율로 자른 사진 + 올라갈 글 (앱 channelFiles) */
async function channelFiles(vacancyId: string, channel: string) {
  const w = await need(vacancyId);
  if (!w.sns) throw new Error("먼저 SNS 글을 써 주세요.");
  await syncNewMedia(w);
  const view = (await snsForWeb(w))!.channels[channel] as any;
  const info = ((await options()).channels as any[]).find((c) => c.id === channel);
  const [cw, chh] = info?.size || [1080, 1080];
  const byId = new Map(w.sns.pool.map((m) => [m.id, m]));
  const map = srcMap(w);
  const list = (w.sns.media[channel] || []).map((id) => byId.get(id)).filter(Boolean).slice(0, info?.maxMedia || 10) as DocMedia[];
  const photos: { name: string; dataUrl: string }[] = [];
  for (let i = 0; i < list.length; i++) {
    const src = thumbOf(w, list[i], map);
    if (!src) continue;
    try {
      const mode = !info?.ratio ? "max" : FIT_KINDS.has(list[i].kind) ? "fit" : "cover";
      const dataUrl = await toJpeg(src, cw, chh, mode, 0.86);
      photos.push({ name: `${String(i + 1).padStart(2, "0")}${i === 0 ? "_대표" : ""}${list[i].kind === "ai" ? "_AI" : ""}.jpg`, dataUrl });
    } catch { /* 못 불러온 사진은 넘어간다 */ }
  }
  return { w, info, text: view.composed.text as string, posts: (view.composed.posts || []) as string[], photos, total: list.length };
}
async function snsExport({ vacancyId, channel }: any) {
  const r = await channelFiles(vacancyId, channel);
  const label = r.info?.label || channel;
  const textForFile = channel === "threads" ? r.posts.map((t, i) => `[${i === 0 ? "첫 글" : `이어 쓰기 ${i}`}]\n${t}`).join("\n\n―――――――――――\n\n") : r.text;
  const name = `${ymd()}_${label}_${workName(r.w)}.zip`;
  await zipDownload(name, [{ name: `${label}_글.txt`, data: new Blob([textForFile], { type: "text/plain;charset=utf-8" }) }, ...r.photos.map((p) => ({ name: p.name, data: p.dataUrl }))]);
  return { folder: `내려받기 폴더의 ${name}`, saved: r.photos.length, total: r.total };
}

async function snsFill({ vacancyId, channel }: any) {
  if (!HOME[channel]) throw new Error("알 수 없는 채널입니다.");
  if (!(await helperOn())) throw new Error(NO_HELPER);
  say("sns", "사진을 채널 비율로 맞추는 중…");
  const r = await channelFiles(vacancyId, channel);
  const label = r.info?.label || channel;
  const id = await helperJob(channel, { channel, label, text: r.text, posts: r.posts, photos: r.photos.map((p) => p.dataUrl) }, HOME[channel], vacancyId, channel, "sns", label);
  say("sns", `도우미가 ${label}에 사진 ${r.photos.length}장과 글을 넣는 중… (그 탭을 닫지 마세요)`);
  const done = await helperWait(id, "done", 180000);
  if (!done) return { ok: true, partial: true, note: "새 탭의 도우미 상자를 확인해 주세요. 확인하고 [공유하기]·[게시]는 직접 눌러 주세요." };
  return { ...done };
}

/* ── 네이버 블로그 채우기 (앱 naver-write fillNaver) ── */
async function naverFill({ vacancyId, design, via = "helper" }: any) {
  const w = await need(vacancyId);
  syncAnalysisMedia(w);
  if (!w.blog) throw new Error("먼저 블로그 글을 써 주세요.");
  if (via !== "manual" && !(await helperOn())) throw new Error(NO_HELPER);
  const v = w.analysis.vacancy || {};
  if (!w.column) say("naver", "매물 출처 정보(중개사무소)를 확인하는 중…");
  const listing = w.column ? null : await fetchListing(vacancyId, v.saleKind || ""); // 뉴스칼럼은 글 끝 [참고 자료](내 기사 주소)
  const media = w.blog.media.length ? w.blog.media : seedMedia(w);
  const map = srcMap(w);
  const nb = await api("naverBlocks", { ...colBody(w), vacancyId, vacancy: v, listing, design, blog: { title: w.blog.title, paragraphs: w.blog.paragraphs, keywords: w.blog.keywords, style: w.blog.style }, media: media.map((m) => ({ kind: m.kind, caption: m.caption, isCover: m.isCover, insertAfterParagraph: m.insertAfterParagraph })) });
  say("naver", "사진을 준비하는 중…");
  const blocks: any[] = [];
  for (const b of nb.blocks as any[]) {
    if (b.type !== "image") { blocks.push(b); continue; }
    const src = media[b.mediaIndex] ? thumbOf(w, media[b.mediaIndex], map) : null;
    blocks.push({ type: "image", dataUrl: src ? await toJpeg(src, 1600).catch(() => null) : null });
  }
  const total = blocks.filter((b) => b.type === "image").length;
  const writeUrl = (await options()).writeUrl || "https://blog.naver.com/GoBlogWrite.naver";
  if (via === "manual") {
    const htmlText = (h: string) => String(h || "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|h\d|li|blockquote)>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/\n{3,}/g, "\n\n").trim();
    let n = 0;
    const html: string[] = [], text: string[] = [], files: { name: string; data: string }[] = [];
    for (const b of blocks) {
      if (b.type === "html") { html.push(b.html); text.push(htmlText(b.html)); continue; }
      if (b.type !== "image" || !b.dataUrl) continue;
      n += 1;
      files.push({ name: `${String(n).padStart(2, "0")}.jpg`, data: b.dataUrl });
      html.push(`<p style="color:#2563eb">[사진 ${n}]</p>`);
      text.push(`[사진 ${n}]`);
    }
    const tagLine = (nb.tags || []).map((t: string) => "#" + t).join(" ");
    const name = `${ymd()}_네이버블로그_${workName(w)}.zip`;
    await zipDownload(name, [...files, { name: "블로그_글.txt", data: [w.blog.title, "", text.join("\n\n"), "", tagLine].join("\n") }]);
    openDocked(writeUrl); // AI 창과 같은 자리에 작은 창으로 (2026-11-04)
    return { ok: true, imagesInserted: 0, imagesTotal: total, design: nb.design, tags: nb.tags, via: "manual", folder: `내려받기 폴더의 ${name}`, copy: { title: w.blog.title, html: html.join(""), text: text.join("\n\n"), tags: tagLine }, photos: n };
  }
  const id = await helperJob("naver", { title: w.blog.title, blocks, tags: nb.tags }, writeUrl, vacancyId, "blog", "naver", "네이버 블로그 글쓰기");
  say("naver", `도우미가 제목·본문·사진 ${total}장을 채우는 중… (그 탭을 닫지 마세요)`);
  const done = await helperWait(id, "done", 240000);
  if (!done) throw new Error("도우미가 다 채웠다는 소식이 없어요. 새 탭에서 채워진 내용을 확인해 주세요.");
  if (!done.ok) throw new Error(done.error || "도우미가 채우지 못했어요.");
  return { ok: true, imagesInserted: done.imagesInserted || 0, imagesTotal: total, design: nb.design, tags: nb.tags, via: "helper" };
}

/* ── 유튜브 대본 (앱 youtube-writer.js) ── */
async function ytForWeb(w: Work) {
  const d = w.youtube;
  if (!d) return null;
  const article = w.article || w.blog || null;
  const v = await api("ytView", { ...colBody(w), script: d, listing: d.listing, detailUrl: d.detailUrl, article: article ? { subtitles: article.subtitles, paragraphs: article.paragraphs, keywords: article.keywords } : null });
  return { vacancyId: w.vacancyId, settings: d.settings, title: d.title, titles: d.titles || [], narration: d.narration, seconds: v.seconds, chars: v.chars, description: v.description, version: [d.writtenAt, d.revisedAt, d.editedAt].map((x) => x || "").join("|") };
}
async function ytGet(vacancyId: string) {
  const w = await getWork(vacancyId);
  return w ? ytForWeb(w) : null;
}
async function ytSave({ vacancyId, title, narration }: any) {
  const w = await need(vacancyId);
  if (!w.youtube) throw new Error("저장할 대본이 없습니다.");
  if (typeof title === "string") w.youtube.title = title.trim();
  if (Array.isArray(narration)) w.youtube.narration = narration.map((p: string) => String(p || "").trim()).filter(Boolean);
  w.youtube.editedAt = now();
  await putWork(w);
  return ytForWeb(w);
}
async function ytRevise({ vacancyId, request }: any) {
  const w = await need(vacancyId);
  if (!w.youtube) throw new Error("먼저 대본을 써 주세요.");
  const ref = referenceArticle(w) || (w.blog ? { title: w.blog.title, subtitles: [], body: w.blog.paragraphs.join("\n\n") } : null);
  const { prompt } = await api("revisePrompt", { doc: "youtube", request, vacancy: w.analysis.vacancy, draft: w.youtube, ref, ...colBody(w) });
  const s = await webAsk(prompt, "유튜브 대본을 고치고 있습니다", async (text) => {
    const x = await api("reviseParse", { doc: "youtube", text, ...colBody(w) });
    if (!x.ok) throw new Error(x.error);
    return x.script;
  });
  Object.assign(w.youtube, { title: s.title || w.youtube.title, titles: s.titles.length ? s.titles : w.youtube.titles, narration: s.narration, revisedAt: now() });
  await putWork(w);
  return ytForWeb(w);
}
async function ytExport(vacancyId: string) {
  const w = await need(vacancyId);
  const web = await ytForWeb(w);
  if (!web) throw new Error("먼저 대본을 써 주세요.");
  const min = Math.floor(web.seconds / 60);
  const text = [
    `[제목]\n${web.title}`,
    web.titles.length ? `[제목 후보]\n${web.titles.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}` : "",
    `[나레이션 원고] 약 ${min ? `${min}분 ` : ""}${web.seconds % 60}초 · ${web.chars}자\n\n${web.narration.join("\n\n")}`,
    `[설명란]\n${web.description.text}\n\n${web.description.tags.join(" ")}`,
  ].filter(Boolean).join("\n\n―――――――――――\n\n");
  const name = `${ymd()}_유튜브대본_${workName(w)}.txt`;
  download(name, new Blob([text], { type: "text/plain;charset=utf-8" }));
  return { folder: "내려받기 폴더", file: name };
}

/** 쓰기 전에 — 이번 달 남은 횟수가 없으면 막는다 (센 것은 글을 받은 뒤 useQuota) */
async function writeRoom(vacancyId: string) {
  const d = await fetch("/api/studio/usage", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
  if (!d || !d.success) return; // 모르면 막지 않는다 (받은 뒤 서버가 한 번 더 본다)
  if (/^col-/.test(vacancyId) && !d.pro) throw new Error("뉴스칼럼은 공실뉴스부동산에서 쓸 수 있어요.");
  const u = d.usage;
  if (u && u.monthRemaining !== null && u.monthRemaining <= 0) {
    throw new Error(u.monthLimit === 0 ? "글쓰기는 공실뉴스부동산 회원 기능이에요." : `이번 달 쓰기 ${u.monthLimit}번을 모두 썼어요. 공실뉴스부동산에서는 제한 없이 쓸 수 있어요.`);
  }
}

/* ── 한 번에 쓰기 (앱 all-writer.js) ── */
async function writeAll(o: any) {
  const w = await need(o.vacancyId);
  const v = w.analysis.vacancy;
  const SNS_CH = CHANNELS;
  const snsList = (Array.isArray(o.sns?.only) ? o.sns.only : [o.sns?.only]).filter((c: string) => SNS_CH.includes(c));
  const snsOnly: string[] = snsList.length && snsList.length < SNS_CH.length ? snsList : [];
  const want = { article: o.article?.on !== false, blog: o.blog?.on !== false, sns: o.sns?.on !== false, youtube: o.youtube?.on === true };
  if (!want.article && !want.blog && !want.sns && !want.youtube) throw new Error("쓸 글을 하나 이상 골라 주세요.");
  // 이용 횟수 (2026-11-04 사장님): 무료 공실뉴스부동산은 한 달에 쓰기 3번 — [한 번에 쓰기]·[이 글만 쓰기] 한 번 = 1번, [수정 요청]은 안 셈 · PRO 무제한
  //  쓰기 전에 남았는지만 보고, 글을 다 받은 뒤에 1번을 센다 (중간에 멈추면 안 셈)
  say("blog", "이용 횟수를 확인하는 중…");
  await writeRoom(o.vacancyId);
  const skipped: string[] = [];
  say("blog", "질문을 만드는 중…");
  const P = await api("allPrompt", { vacancy: v, want, story: o.story, article: o.article, blog: o.blog, tone: o.sns?.tone, snsOnly, youtube: o.youtube, ref: want.article ? null : referenceArticle(w), ...colBody(w) });
  say("blog", `${webAi().name} 답을 기다리는 중…`);
  const r = await webAsk(P.prompt, `${P.keys.length}가지 글을 한 번에 쓰고 있습니다`, async (text) => {
    const x = await api("allParse", { text, keys: P.keys, ...colBody(w) });
    if (!x.ok) throw new Error(x.error);
    return x;
  });
  await useQuota("blog", o.vacancyId); // 쓰기 1번
  say("blog", "받은 글을 나누는 중…");
  const out: Record<string, unknown> = {};
  const fresh = await getWork(o.vacancyId) || w; // 기다리는 동안 고친 것
  if (r.article) await saveWritten(fresh, "article", r.article, { style: P.settings.artKind, length: P.settings.artLen });
  if (r.blog) await saveWritten(fresh, "blog", r.blog, { style: P.settings.blogSt, length: P.settings.blogLen });
  const needListing = !w.column && (r.sns || r.youtube); // 뉴스칼럼은 중개사무소 출처 대신 소재 출처(내 기사 주소)
  const listing = needListing ? await fetchListing(o.vacancyId, v?.saleKind || "").catch(() => null) : null;
  if (r.sns) {
    if (!w.column) say("blog", "매물 정보 출처(중개사무소)를 확인하는 중…");
    let posts = r.sns as Record<string, any>;
    if (snsOnly.length && fresh.sns) { const keep = { ...fresh.sns.posts }; for (const c of snsOnly) if (posts[c]) keep[c] = posts[c]; posts = keep; }
    const { pool, media } = await pickMedia(fresh);
    fresh.sns = { vacancyId: o.vacancyId, noun: v?.saleKind ? "물건" : "매물", listing, posts, pool, media, tone: o.sns?.tone, ...(fresh.sns && Array.isArray(fresh.sns.seenFiles) ? { seenFiles: fresh.sns.seenFiles } : {}), writtenAt: now() };
    await syncNewMedia(fresh);
  }
  if (r.youtube) fresh.youtube = { ...r.youtube, settings: P.settings.ytSet, detailUrl: (listing && listing.detailUrl) || (w.column?.source?.news?.url || ""), listing, writtenAt: now() };
  await putWork(fresh);
  if (r.article) out.article = docForWeb(fresh, "article");
  if (r.blog) out.blog = docForWeb(fresh, "blog");
  if (r.sns) out.sns = await snsForWeb(fresh);
  if (r.youtube) out.youtube = await ytForWeb(fresh);
  return { ...out, miss: r.miss || [], skipped };
}

/* ── [기사쓰기 화면으로 보내기] — 기사쓰기 화면이 읽는 웹 초안 자리 (NewsWriteForm gsn-web-draft:) ── */
export async function prepareWebArticleDraft(vacancyId: string) {
  const w = await getWork(vacancyId);
  if (!w || !w.article) return false;
  syncAnalysisMedia(w);
  const d = w.article;
  const map = srcMap(w);
  const draft = {
    title: d.title, subtitles: d.subtitles || [], paragraphs: d.paragraphs, keywords: d.keywords || [], saleKind: w.analysis.vacancy?.saleKind || "",
    photos: (d.media || []).map((m) => ({ dataUrl: thumbOf(w, m, map), caption: m.caption || "", isCover: Boolean(m.isCover), slot: m.isCover ? -1 : Number.isInteger(m.insertAfterParagraph) ? m.insertAfterParagraph : d.paragraphs.length })).filter((p) => p.dataUrl),
  };
  try { sessionStorage.setItem(`gsn-web-draft:${vacancyId}`, JSON.stringify(draft)); return true; } catch { return false; }
}

/* ── 작업 목록 (앱 studio:vacancy-list) ── */
async function list() {
  const works = (await allWorks()).filter((w) => !w.column);
  return works.map((w) => {
    const first = (w.analysis.media || []).find((m) => m.kind === "photo") || w.analysis.media?.[0];
    return {
      vacancyId: w.vacancyId, no: fieldOf(w.analysis.vacancy, "공실광고번호"), title: w.analysis.vacancy?.title || "", priceText: w.analysis.vacancy?.priceText || "", saleKind: w.analysis.vacancy?.saleKind || "",
      thumb: first ? first.src : null, updatedAt: w.updatedAt,
      done: { article: Boolean(w.article), blog: Boolean(w.blog), instagram: Boolean(w.sns?.posts?.instagram), threads: Boolean(w.sns?.posts?.threads), facebook: Boolean(w.sns?.posts?.facebook), youtube: Boolean(w.youtube) },
    };
  }).sort((x, y) => (x.updatedAt < y.updatedAt ? 1 : -1));
}

/* ── 뉴스칼럼 저장·목록 (앱 column-writer create · get · list · setNewsUrl) ── */
const hex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, "0")).join("");
const articleNoOf = (url: string) => /\/news\/(\d+)(?:[/?#]|$)/.exec(String(url || ""))?.[1] || "";
function colForWeb(w: Work) {
  const c = w.column!;
  const n = c.source?.news || {};
  const media = w.analysis.media || [];
  return {
    id: w.vacancyId, source: c.source, label: n.title || c.source?.topic?.subject || "뉴스칼럼", createdAt: c.createdAt,
    articleTitle: w.article?.title || "",
    captures: media.map((m) => ({ thumb: m.src, caption: m.caption, kind: m.kind })), hiddenCount: (w.analysis.hidden || []).length,
    thumb: media[0]?.src || null,
    worked: Boolean(w.article || w.blog || w.sns || w.youtube),
    done: { article: Boolean(w.article), blog: Boolean(w.blog), instagram: Boolean(w.sns?.posts?.instagram), threads: Boolean(w.sns?.posts?.threads), facebook: Boolean(w.sns?.posts?.facebook), youtube: Boolean(w.youtube) },
    links: { ...(c.links || {}) },
    updatedAt: w.updatedAt,
  };
}
/* 올린 게시물 주소 연결·풀기 — 빈 주소면 푼다. 서버에는 올리지 않는다 (작업 파일 .gsn 에 같이 저장) */
async function colSetLink(id: string, channel: string, url: string) {
  const w = isCol(id) ? await getWork(id) : null;
  if (!w?.column) throw new Error("이 글을 찾지 못했어요. 목록에서 다시 골라 주세요.");
  const ch = String(channel || "");
  if (!["blog", "instagram", "threads", "facebook", "youtube"].includes(ch)) throw new Error("채널을 다시 골라 주세요.");
  const v = String(url || "").trim();
  if (v && !/^https:\/\//.test(v)) throw new Error("https:// 로 시작하는 주소를 넣어 주세요.");
  const links = { ...(w.column.links || {}) };
  if (v) links[ch] = v; else delete links[ch];
  w.column = { ...w.column, links };
  await putWork(w);
  window.dispatchEvent(new CustomEvent("gs-col-links", { detail: { id } }));
  return colForWeb(w);
}
// 도우미가 올린 글 주소를 잡으면 (core.ts watchPublished) 저절로 연결
if (typeof window !== "undefined") {
  window.addEventListener("gs-col-published", (e) => {
    const d = (e as CustomEvent<{ id: string; channel: string; url: string }>).detail;
    if (!d?.id || !d.url) return;
    void colSetLink(d.id, d.channel, d.url).then((c) => {
      // 내 공실뉴스 기사로 만든 뉴스칼럼이면 그 기사 홍보현황에도 (기사는 원래 서버 데이터 — 기사 카드 ✓)
      const no = articleNoOf(String((c.source as any)?.news?.url || ""));
      if (no) void fetch("/api/studio/promo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ articleNo: no, channel: d.channel, url: d.url }) })
        .then(() => window.dispatchEvent(new CustomEvent("gs-promo-changed"))).catch(() => {});
    }).catch(() => {});
  });
}
async function colCreate(source: any) {
  const n = source?.news;
  // 자유 글쓰기 — 제목 + 내 글 (+ 사진) (2026-11-05 사장님: 뉴스칼럼 밑 자유 글쓰기)
  if (source?.mode === "topic") {
    const t = source.topic || {};
    const subject = String(t.subject || "").trim(), memo = String(t.memo || "").trim();
    if (!subject || !memo) throw new Error("제목과 본문을 써 주세요.");
    const id = `col-${Date.now().toString(16)}${hex(3)}`;
    const t0 = Date.now();
    const media: Src[] = (Array.isArray(source.media) ? source.media : []).filter((m: any) => m && m.url).map((m: any, i: number) => ({ key: `photo:${m.url}`, kind: "photo", src: String(m.url), caption: String(m.caption || ""), real: true, addedAt: t0 + i }));
    const source2 = { mode: "topic", angle: String(source.angle || ""), topic: { subject, intro: "", points: [], outro: "", memo } };
    const w: Work = { key: keyOf(id), memberId: getMember(), vacancyId: id, analysis: { vacancyId: id, vacancy: null, media, hidden: [], failures: [], analyzedAt: now() }, column: { source: source2 as any, createdAt: now(), articleNo: "" }, updatedAt: now() };
    await putWork(w);
    return colForWeb(w);
  }
  // 웹은 내 공실뉴스 기사로만 (2026-11-04 사장님: 본인이 작성한 기사만) — 기사관리 카드에서 연다
  if (!source || source.mode !== "news" || !n || n.publisher !== "공실뉴스") throw new Error("웹 뉴스칼럼은 내가 쓴 공실뉴스 기사로 만들 수 있어요. 아래 기사 카드를 눌러 주세요.");
  if (!String(n.title || "").trim() || !String(n.body || "").trim()) throw new Error("기사 제목과 본문이 필요합니다.");
  const id = `col-${Date.now().toString(16)}${hex(3)}`;
  const articleNo = articleNoOf(n.url);
  // 칼럼 사진 = 내 기사에 넣은 사진 (기사에 적힌 설명 그대로)
  const got = articleNo ? await getMyArticlePhotos(articleNo).catch(() => null) : null;
  const t0 = Date.now();
  const media: Src[] = (got?.photos || []).map((p, i) => ({ key: `photo:${p.url}`, kind: "photo", src: p.url, caption: p.caption, real: true, addedAt: t0 + i }));
  const source2 = { mode: "news", angle: String(source.angle || ""), news: { title: String(n.title).trim(), publisher: "공실뉴스", publishedAt: String(n.publishedAt || ""), url: String(n.url || ""), body: String(n.body).trim() } };
  const w: Work = { key: keyOf(id), memberId: getMember(), vacancyId: id, analysis: { vacancyId: id, vacancy: null, media, hidden: [], failures: [], analyzedAt: now() }, column: { source: source2, createdAt: now(), articleNo }, updatedAt: now() };
  await putWork(w);
  return colForWeb(w);
}
async function colGet(id: string) {
  const w = isCol(id) ? await getWork(id) : null;
  return w?.column ? colForWeb(w) : null;
}
/* 자유 글쓰기·뉴스칼럼 소재 지우기 — 이 브라우저의 작업만 (PC 작업 파일은 그대로) (2026-11-10) */
async function colRemove(id: string) {
  if (!isCol(id)) return false;
  await tx("readwrite", (s) => s.delete(keyOf(id)));
  return true;
}
async function colList(limit = 200) {
  return (await allWorks()).filter((w) => w.column).sort((a, b) => (a.column!.createdAt < b.column!.createdAt ? 1 : -1)).slice(0, limit).map(colForWeb);
}
/* 기사 주소를 내 물건접수 홈페이지의 그 기사로 (앱 setNewsUrl) — 새로 쓰는 블로그·SNS 글부터 */
async function colSetUrl(id: string, url: string) {
  const w = isCol(id) ? await getWork(id) : null;
  const next = String(url || "").trim();
  if (!w?.column || !/^https:\/\//.test(next)) return null;
  if (w.column.source.news.url !== next) { w.column.source.news.url = next; await putWork(w); }
  return colForWeb(w);
}
/* 뉴스칼럼 원문·글의 재료 고치기 (2026-11-06 사장님: "어떻게 고쳐 고칠 수가 없는데") — 기사 제목·본문 / 자유 글쓰기 제목·내 글 / 추가 요청 */
async function colSave(id: string, p: { title?: string; body?: string; angle?: string; intro?: string; points?: string[]; outro?: string }) {
  const w = isCol(id) ? await getWork(id) : null;
  if (!w?.column) throw new Error("이 소재를 찾지 못했어요. 목록에서 다시 골라 주세요.");
  const s: any = { ...w.column.source };
  const title = typeof p.title === "string" ? p.title.trim() : undefined;
  const body = typeof p.body === "string" ? p.body.trim() : undefined;
  if (s.mode === "news") s.news = { ...s.news, ...(title ? { title } : {}), ...(body ? { body } : {}) };
  else s.topic = { ...s.topic, ...(title ? { subject: title } : {}), ...(body !== undefined ? { memo: body } : {}),
    ...(typeof p.intro === "string" ? { intro: p.intro.trim() } : {}), ...(typeof p.outro === "string" ? { outro: p.outro.trim() } : {}),
    ...(Array.isArray(p.points) ? { points: p.points.map((x) => String(x || "").trim()).filter(Boolean) } : {}) };
  if (typeof p.angle === "string") s.angle = p.angle.trim();
  const tp = s.topic || {};
  if (s.mode === "news" ? !String(s.news?.body || "").trim() : !String(tp.memo || tp.intro || (tp.points || []).join("") || tp.outro || "").trim()) throw new Error("본문을 비울 수는 없어요.");
  w.column = { ...w.column, source: s };
  await putWork(w);
  return colForWeb(w);
}
async function colMedia(id: string, op: any) {
  await mediaOp(id, op);
  return colGet(id);
}

/* ── 대역 ── */
const notInWeb = (what: string) => () => Promise.reject(new Error(`${what}는 웹에서 아직 안 돼요.`));
const web = {
  isWeb: true,
  openAiConnect: () => chooseWebAi(),
  ai: {
    list: async () => [{ id: webAi().id, name: webAi().name, ready: true, ok: true }],
    connect: async () => ({ ok: true }),
    finishLogin: async () => {},
    writer: async () => ({ id: webAi().id, name: webAi().name }),
    onWriterChanged: (fn: () => void) => { window.addEventListener("gs-web-ai", fn); return () => window.removeEventListener("gs-web-ai", fn); },
  },
  vacancy: {
    analyze, load: async (id: string) => { const w = await getWork(id); return w ? analysisForWeb(w.analysis) : null; },
    list, media: mediaOp, save: saveVacancyInfo, onProgress: onProgress("vacancy"),
  },
  article: {
    options: async (id: string) => { const w = await getWork(id); return (await optionsOf(w)).article; },
    write: async (o: any) => writeAll({ vacancyId: o.vacancyId, article: { on: true, kind: o.kind, length: o.length }, blog: { on: false }, sns: { on: false }, youtube: { on: false } }).then((r: any) => r.article),
  },
  blog: {
    styles: async (id?: string) => { const w = id ? await getWork(id) : null; return (await optionsOf(w)).blog; },
    get: blogGet, save: blogSave, revise: blogRevise, addPhoto: blogAddPhoto,
    write: async (o: any) => writeAll({ vacancyId: o.vacancyId, article: { on: false }, blog: { on: true, style: o.style, length: o.length }, sns: { on: false }, youtube: { on: false } }).then((r: any) => r.blog),
    imageStyles: async (id?: string) => { const w = id ? await getWork(id) : null; return (await optionsOf(w)).imageStyles || (await options()).imageStyles; },
    makeImage: blogMakeImage,
    onProgress: onProgress("blog"),
  },
  sns: {
    channels: async () => (await options()).channels,
    get: snsGet, save: snsSave, revise: snsRevise, exportChannel: snsExport, fillByHelper: snsFill, writeAll,
    write: async (o: any) => writeAll({ vacancyId: o.vacancyId, article: { on: false }, blog: { on: false }, sns: { on: true, tone: o.tone }, youtube: { on: false } }).then((r: any) => r.sns),
    onProgress: onProgress("sns"),
  },
  column: {
    create: colCreate, get: colGet, list: colList, remove: colRemove, setUrl: colSetUrl, media: colMedia, save: colSave, setLink: colSetLink,
    // 다른 뉴스 가져오기는 앱에서 (웹은 내 기사만, 2026-11-04 사장님)
    fetchNews: notInWeb("다른 뉴스 가져오기"), openNews: notInWeb("다른 뉴스 가져오기"), grabNews: notInWeb("다른 뉴스 가져오기"),
  },
  naver: {
    designs: async (id?: string) => (await optionsOf(id ? await getWork(id) : null)).designs,
    fill: naverFill,
    openMyBlog: async () => { window.open(BLOG_HOME_URL, "_blank", "noopener"); return { ok: true }; },
    onProgress: onProgress("naver"),
  },
  youtube: {
    options: async (id: string) => { const w = await getWork(id); return (await optionsOf(w)).youtube; },
    get: ytGet, save: ytSave, revise: ytRevise, exportText: ytExport,
    write: async (o: any) => writeAll({ vacancyId: o.vacancyId, article: { on: false }, blog: { on: false }, sns: { on: false }, youtube: { on: true, ...o } }).then((r: any) => r.youtube),
    onProgress: onProgress("youtube"),
  },
};

/** 앱이면 앱(window.gongsilStudio), 웹이면 이 대역 — 뉴스·SNS자동화 화면들이 같이 쓴다 */
export function studioBridge<T>(): T | null {
  if (typeof window === "undefined") return null;
  const app = (window as unknown as { gongsilStudio?: T }).gongsilStudio;
  return app ?? (web as unknown as T);
}
export const isWebStudio = () => typeof window !== "undefined" && !(window as unknown as { gongsilStudio?: unknown }).gongsilStudio;
