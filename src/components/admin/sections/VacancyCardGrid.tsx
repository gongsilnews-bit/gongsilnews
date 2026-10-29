"use client";

// 내 공실 카드 (2026-10-28) — 홈 "내 공실 홍보현황"과 공실등록 [카드형]이 함께 쓴다
// 위쪽은 공실열람 목록 카드(GongsilSidebar)와 같은 모양 · 아래는 홍보현황(광고 중 n/7 · 채널)
// 오른쪽 클릭·[···] = 캔바식 메뉴 · ☆ = 즐겨찾기(이 기기, 맨 앞으로)
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSectionProps } from "./types";
import { SvgIcon, IconBuilding, IconArticle, IconSend, IconFilm, IconImage } from "./AdminIcons";
import { updateVacancyStatus, deleteVacancy } from "@/app/actions/vacancy";
import { getCleanAddrText, getPriceText, formatAreaWithPy } from "@/app/(map)/gongsil/gongsilHelpers";
import { checkMyPromoLinks, getMyVacancyCards, getMyVacancyPromos, saveVacancyPromo, setVacancyDealClosed, type VacancyPromo } from "@/app/actions/vacancyPromos";
import type { PromoChannel } from "@/utils/vacancyPromos";
import { getHomepageBase } from "@/app/actions/homepage";

type Done = Record<string, boolean>;
type LocalWork = { vacancyId: string; thumb: string | null; updatedAt: string; done: Done };
const localWorks = () => {
  const g = typeof window === "undefined" ? undefined : (window as unknown as { gongsilStudio?: { vacancy?: { list: () => Promise<LocalWork[]> } } }).gongsilStudio;
  return g?.vacancy?.list().catch(() => [] as LocalWork[]) ?? Promise.resolve([] as LocalWork[]);
};

// 한 번 읽은 카드·홍보현황은 기억해 두고 바로 그린다 — 화면을 옮겨 다시 와도 "불러오는 중"이 다시 뜨지 않게.
// 뒤에서 새로 읽어 바뀐 것만 고친다 (2026-10-28 사장님: 매번 로딩된다)
const memo: { member?: string; cards?: VacancyCard[]; promos?: Record<string, VacancyPromo> } = {};

type VacancyCard = {
  id: string; no: string; title: string; building: string; price: string; thumb: string | null; done: Done; at: number; active: boolean;
  commission: string; date: string; spec: string[]; rooms: string; type: string;
  closed: boolean; // 거래 완료 (광고 내리기 › 거래 완료, metadata.deal_closed_at)
  status: string; // ACTIVE 광고중 · STOPPED 광고종료 · DRAFT 임시저장
};

// 광고 상태 나눔 — 목록형과 같은 탭 (2026-10-28 사장님: 카드형에서도)
const STATUS_TABS: { label: string; st: string; color: string }[] = [
  { label: "전체", st: "", color: "#e5e7eb" },
  { label: "광고중", st: "ACTIVE", color: "#10b981" },
  { label: "광고종료", st: "STOPPED", color: "#ef4444" },
  { label: "임시저장", st: "DRAFT", color: "#9ca3af" },
];

// 매물별 찾기 (2026-10-28 사장님) — 공실열람 위 메뉴와 같은 나눔 (property_type 그대로, CATEGORY_TO_PROPERTY_TYPE)
const TYPE_TABS: { label: string; type: string }[] = [
  { label: "아파트·오피스텔", type: "아파트·오피스텔" },
  { label: "빌라·주택", type: "빌라·주택" },
  { label: "원룸·투룸(풀옵션)", type: "원룸·투룸(풀옵션)" },
  { label: "상가·사무실·공장·토지", type: "상가·사무실·건물·공장·토지" },
  { label: "신축/분양", type: "분양" },
];

// 홍보현황 줄 (2026-10-27 회의) — 연결됨이면 [바로가기], 아니면 [만들기]·[링크 붙여넣기]
// "글만 써 둠" = 이 PC에 글이 있다 (studio:vacancy-list 의 done — sns.json·blog.json 등)
const CHANNELS: { id: PromoChannel; label: string }[] = [
  { id: "blog", label: "네이버 블로그" },
  { id: "instagram", label: "인스타그램" },
  { id: "threads", label: "스레드" },
  { id: "facebook", label: "페이스북" },
  { id: "youtube", label: "유튜브" },
];
// 앱에서는 평소 크롬으로, 웹에서는 새 탭으로
const openOut = (url: string) => {
  const g = (window as unknown as { gongsilStudio?: { openInBrowser?: (u: string) => Promise<void> } }).gongsilStudio;
  if (g?.openInBrowser) void g.openInBrowser(url);
  else window.open(url, "_blank", "noopener");
};

/* 카카오톡으로 보내기 (2026-10-28 사장님) — 친구·단톡방에 링크. 게시물이 아니라 홍보현황 ✓·n/7 에는 넣지 않는다
   공실열람 [공유하기]와 같은 카카오 SDK·키. 앱에서는 카카오 창이 앱 안 작은 창으로 뜬다 (main.js IN_APP_POPUP_HOSTS) */
type KakaoSdk = { isInitialized: () => boolean; init: (k: string) => void; Share: { sendDefault: (o: unknown) => void } };
let kakaoLoading: Promise<KakaoSdk> | null = null;
function loadKakao(): Promise<KakaoSdk> {
  const ready = () => (window as unknown as { Kakao?: KakaoSdk }).Kakao;
  if (ready()?.isInitialized()) return Promise.resolve(ready()!);
  kakaoLoading ||= new Promise((resolve, reject) => {
    const init = () => {
      const K = ready();
      if (!K) return reject(new Error("카카오를 불러오지 못했어요."));
      if (!K.isInitialized()) K.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY || process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc");
      resolve(K);
    };
    if (ready()) return init();
    const s = document.createElement("script");
    s.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
    s.onload = init;
    s.onerror = () => { kakaoLoading = null; reject(new Error("카카오를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.")); };
    document.head.appendChild(s);
  });
  return kakaoLoading;
}
/** 링크는 늘 실제 사이트 주소로 (앱·개발 화면 주소가 아니라) */
export const SITE = "https://www.gongsilnews.com";
/** 내 홈페이지(물건접수홈페이지) 주소 — 쓸 수 있으면 링크 복사·카톡 보내기를 내 홈페이지로 (2026-10-28 사장님). 없거나 꺼져 있으면 "" */
const homepageMemo: Record<string, string> = {};
export function useHomepageBase(memberId?: string) {
  const [base, setBase] = useState(memberId ? homepageMemo[memberId] ?? "" : "");
  useEffect(() => {
    if (!memberId) return;
    let alive = true;
    // Pro · Studio 로 쓸 수 있을 때만 (2026-10-29) — 무료 회원이 켜 둔 홈페이지는 중단 페이지라 공유하지 않는다
    getHomepageBase(memberId).then((b) => {
      homepageMemo[memberId] = b;
      if (alive) setBase(b);
    }).catch(() => {});
    return () => { alive = false; };
  }, [memberId]);
  return base;
}
/** homepage 가 있으면 두 번째 버튼 [물건 맡기기] — 내 홈페이지 물건 접수 칸(#intake)으로 (2026-10-29 사장님) */
/** 도우미 확장에게 인스타·페북 지운 글 확인을 부탁 (앱에서만, 2026-10-29) */
export function verifyByHelper(urls: (string | undefined)[]) {
  const list = urls.filter((u): u is string => !!u && /^https:\/\/www\.(instagram|facebook|threads)\.(com|net)\//.test(u));
  if (!list.length) return; // 인스타·페북 링크가 없으면 부탁할 것도 없다
  try { void (window as unknown as { gongsilStudio?: { promo?: { verifyNow?: (u: string[]) => Promise<unknown> } } }).gongsilStudio?.promo?.verifyNow?.(list); } catch {}
}
export async function kakaoShare(o: { title: string; description: string; imageUrl?: string | null; url: string; button: string; homepage?: string }) {
  const K = await loadKakao();
  const intake = o.homepage ? `${o.homepage}/#intake` : "";
  K.Share.sendDefault({
    objectType: "feed",
    content: { title: o.title, description: o.description, imageUrl: o.imageUrl || `${SITE}/logo.png`, link: { mobileWebUrl: o.url, webUrl: o.url } },
    buttons: [
      { title: o.button, link: { mobileWebUrl: o.url, webUrl: o.url } },
      ...(intake ? [{ title: "물건 맡기기", link: { mobileWebUrl: intake, webUrl: intake } }] : []),
    ],
  });
}
export const KakaoGlyph = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path fill="#3c1e1e" d="M12 4C7 4 3 7.1 3 10.9c0 2.4 1.6 4.6 4.1 5.8l-.9 3.3c-.1.3.2.5.5.4l3.9-2.6c.5.1.9.1 1.4.1 5 0 9-3.1 9-6.9S17 4 12 4z" /></svg>
);

export const IconBlog = (p: any) => <SvgIcon {...p}><path d="M4 4h16v12H8l-4 4z" /><line x1="8" y1="8" x2="16" y2="8" /><line x1="8" y1="12" x2="13" y2="12" /></SvgIcon>;
export const IconReport = (p: any) => <SvgIcon {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><line x1="8" y1="17" x2="8" y2="13" /><line x1="12" y1="17" x2="12" y2="9" /><line x1="16" y1="17" x2="16" y2="11" /></SvgIcon>;

export default function VacancyCardGrid({ theme, memberId, onMenuChange, keyword = "", limit, onAdd, showTypes, row }: {
  theme: AdminSectionProps["theme"];
  memberId?: string;
  onMenuChange: (menu: string) => void;
  keyword?: string; // 홈 찾기 칸
  limit?: number; // 홈은 11장까지
  row?: boolean; // 홈 — 한 줄로 놓고 가로 스크롤 (2026-10-28 사장님)
  onAdd?: () => void; // 맨 앞 [+ 공실등록] 칸
  showTypes?: boolean; // 위에 매물별 칸 (공실등록 카드형)
}) {
  const { cardBg, textPrimary, textSecondary, border, darkMode } = theme;
  const router = useRouter();
  const fresh = memo.member === memberId;
  const [vacancies, setVacancies] = useState<VacancyCard[] | null>(fresh ? memo.cards ?? null : null);

  // 내 공실 — 등록한 공실 + 이 PC에서 무엇을 만들었는지
  const [reloadVac, setReloadVac] = useState(0); // 메뉴로 광고 내리기·삭제한 뒤 다시 읽기
  useEffect(() => {
    if (!memberId) return;
    let off = false;
    Promise.all([
      getMyVacancyCards().then((r) => (r.success ? r.data : [])).catch(() => [] as any[]),
      localWorks(),
    ]).then(([rows, works]) => {
      if (off) return;
      const local = new Map(works.map((w) => [w.vacancyId, w]));
      const list: VacancyCard[] = rows.map((v) => {
        const w = local.get(String(v.id));
        const photo = [...(v.vacancy_photos || [])].sort((a: any, z: any) => (a.sort_order ?? 0) - (z.sort_order ?? 0))[0]?.url || null;
        return {
          id: String(v.id),
          no: v.vacancy_no ? String(v.vacancy_no) : "",
          title: getCleanAddrText(v) || "공실 매물", // 공실열람과 같은 제목 (동 + 종류 + 건물명) — 내 공실이라 가리지 않는다
          building: v.building_name || "",
          price: getPriceText(v), // "매매 13억"처럼 거래 종류까지 들어 있다
          commission: v.realtor_commission || "",
          date: v.created_at ? new Date(v.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\s/g, "") : "",
          spec: [v.property_type, v.direction || "방향없음", v.exclusive_m2 ? formatAreaWithPy(v.exclusive_m2) : "면적미상"].filter(Boolean),
          rooms: [`룸 ${v.room_count || 0}개`, `욕실 ${v.bath_count || 0}개`, ...(v.options || [])].filter(Boolean).join(", "),
          thumb: photo || w?.thumb || null,
          done: w?.done || {},
          at: Math.max(Date.parse(w?.updatedAt || "") || 0, Date.parse(v.created_at) || 0),
          active: v.status === "ACTIVE",
          status: String(v.status || ""),
          type: v.property_type || "",
          closed: Boolean(v.metadata && v.metadata.deal_closed_at),
        };
      });
      list.sort((x, y) => y.at - x.at);
      memo.member = memberId;
      memo.cards = list;
      setVacancies(list);
    });
    return () => { off = true; };
  }, [memberId, reloadVac]);

  // 홍보현황 — 공실뉴스 기사 · 채널별 글 주소 (서버)
  const [promos, setPromos] = useState<Record<string, VacancyPromo>>((fresh && memo.promos) || {});
  const loadPromos = () => getMyVacancyPromos().then((r) => { if (r.success) { memo.promos = r.promos; setPromos(r.promos); } }).catch(() => {});
  // 지운 글은 연결을 푼다 — 5분에 한 번까지 (화면을 열 때 · 앱으로 돌아올 때)
  const [notice, setNotice] = useState("");
  const checkedAt = React.useRef(0);
  const checkLinks = (only?: { vacancyId: string }) => {
    if (!only) {
      // 전체 확인은 6시간에 한 번 (공실이 많아도 화면은 기다리지 않는다 — 뒤에서 돈다)
      let last = checkedAt.current;
      try { last = Math.max(last, Number(localStorage.getItem("gs-promo-checked") || 0)); } catch {}
      if (Date.now() - last < 6 * 60 * 60 * 1000) return;
      checkedAt.current = Date.now();
      try { localStorage.setItem("gs-promo-checked", String(checkedAt.current)); } catch {}
    }
    checkMyPromoLinks(only).then((r) => {
      if (!r.removed.length) return;
      const names = [...new Set(r.removed.map((x) => `${x.title} ${x.channel}`))].join(", ");
      setNotice(`${names} 글이 지워져서 연결을 풀었어요.`);
      void loadPromos();
    }).catch(() => {});
  };
  useEffect(() => {
    void loadPromos();
    checkLinks();
    // 크롬에서 발행하고 앱으로 돌아오면 · 도우미가 글 주소를 보내 오면 다시 읽는다
    const again = () => { void loadPromos(); checkLinks(); };
    window.addEventListener("focus", again);
    const off = (window as unknown as { gongsilStudio?: { promo?: { onSaved: (fn: () => void) => () => void } } }).gongsilStudio?.promo?.onSaved(again);
    return () => { window.removeEventListener("focus", again); off?.(); };
  }, []);

  // 공실마케팅의 매물보고서·물건홍보지를 그 공실을 고른 채로 (StudioMarketingSection 이 기억을 읽어 연다)
  const openMarketing = (vacancyId: string, cat: "report" | "flyer") => {
    try {
      localStorage.setItem("studio_marketing_category", cat);
      localStorage.setItem("studio_marketing_vacancy", vacancyId);
    } catch {}
    onMenuChange("marketing");
  };
  // 진행판 칸을 누르면 뉴스·SNS발행에서 그 공실·그 탭으로 (StudioSnsSection 이 기억을 읽어 연다)
  // 처음 작업하는 공실도 다시 고르지 않게 공실 정보를 같이 넘긴다 — auto: 작업이 없으면 바로 분석·캡처 (2026-10-29 사장님)
  const openStep = (v: VacancyCard, tab: string) => {
    try {
      const picked = { id: v.id, vacancy_no: Number(v.no) || 0, building_name: v.building || null };
      localStorage.setItem("studio_news_category", "gongsil");
      localStorage.setItem("studio_last_vacancy", JSON.stringify({ vacancyId: v.id, picked, tab, auto: true }));
    } catch {}
    onMenuChange("sns");
  };

  // 즐겨찾기 (2026-10-28 사장님 — 캔바식 ☆) — 이 기기에 회원별로 기억, 별 누른 것이 맨 앞
  const favKey = `gs-vac-fav:${memberId || "me"}`;
  const [favs, setFavs] = useState<string[]>([]);
  useEffect(() => {
    try { setFavs(JSON.parse(localStorage.getItem(favKey) || "[]")); } catch { setFavs([]); }
  }, [favKey]);
  const toggleFav = (id: string) => setFavs((cur) => {
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    try { localStorage.setItem(favKey, JSON.stringify(next)); } catch {}
    return next;
  });

  // 공실 카드 메뉴 (2026-10-28 사장님 — 캔바식): 오른쪽 클릭 또는 [···]
  const [menu, setMenu] = useState<{ v: VacancyCard; x: number; y: number } | null>(null);
  const [pasteFor, setPasteFor] = useState<{ v: VacancyCard; ch: PromoChannel; x: number; y: number } | null>(null); // 아이콘 오른쪽 클릭 — 링크 작은 창
  const [linksFor, setLinksFor] = useState<{ v: VacancyCard; x: number; y: number } | null>(null); // [링크 수정] 창
  // [링크 수정]을 열면 지운 글 확인을 바로 — 서버(블로그·스레드·유튜브) + 도우미 확장(인스타·페북, 1분 안) (2026-10-29 사장님)
  useEffect(() => {
    if (!linksFor) return;
    checkLinks({ vacancyId: linksFor.v.id });
    verifyByHelper(Object.values(promos[linksFor.v.id]?.links || {}));
  }, [linksFor?.v.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [stopFor, setStopFor] = useState<VacancyCard | null>(null); // 광고 내리기 — 이유 묻기
  const [cleanFor, setCleanFor] = useState<VacancyCard | null>(null); // 거래 완료 — 올라간 글 정리 // [링크 붙여넣기] 창 (아이콘 오른쪽 클릭이면 그 채널)
  const [flash, setFlash] = useState("");
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(""), 2500);
    return () => clearTimeout(t);
  }, [flash]);
  const detailUrl = (v: VacancyCard) => `${window.location.origin}/gongsil/detail/${v.id}`;
  // 보내는 링크 — 내 홈페이지가 켜져 있으면 내 홈페이지의 그 공실, 아니면 공실뉴스 (2026-10-28 사장님)
  const homepage = useHomepageBase(memberId);
  const shareUrl = (v: VacancyCard) => `${homepage || SITE}/gongsil/detail/${v.id}`;
  const shareKakao = (v: VacancyCard) => {
    void kakaoShare({ title: `${v.title} ${v.price}`, description: [v.spec.join(" · "), v.rooms].filter(Boolean).join("\n"), imageUrl: v.thumb, url: shareUrl(v), button: "공실 보기", homepage })
      .catch((e) => setFlash(e instanceof Error ? e.message : "카카오톡을 열지 못했어요."));
  };
  const menuGroups = (v: VacancyCard): MenuItem[][] => [
    [
      { label: "공실열람에서 보기", icon: <IconOut />, go: () => openOut(detailUrl(v)) },
      { label: "공실 수정", icon: <IconPen />, go: () => router.push(`?menu=gongsil&action=write&id=${v.id}`, { scroll: false }) },
      { label: favs.includes(v.id) ? "즐겨찾기 해제" : "즐겨찾기", icon: <IconStar />, go: () => toggleFav(v.id) },
    ],
    [
      { label: "기사 만들기", icon: <IconArticle />, go: () => openStep(v, "article") },
      { label: "뉴스·SNS 만들기", icon: <IconSend />, go: () => openStep(v, "instagram") },
      { label: "블로그 만들기", icon: <IconBlog />, go: () => openStep(v, "blog") },
      { label: "동영상 만들기", icon: <IconFilm />, note: "대본부터", go: () => openStep(v, "youtube") },
      { label: "매물보고서 만들기", icon: <IconReport />, go: () => openMarketing(v.id, "report") },
      { label: "물건홍보지 만들기", icon: <IconImage />, go: () => openMarketing(v.id, "flyer") },
    ],
    [
      { label: "카카오톡으로 보내기", icon: <IconSend />, note: homepage ? "내 홈페이지 링크" : "친구·단톡방", go: () => shareKakao(v) },
      { label: "링크 복사", icon: <IconLink />, note: homepage ? "내 홈페이지" : undefined, go: () => { void navigator.clipboard.writeText(shareUrl(v)).then(() => setFlash(homepage ? "내 홈페이지 공실 링크를 복사했어요." : "공실 링크를 복사했어요.")).catch(() => setFlash("복사하지 못했어요.")); } },
      { label: "사본 만들기", icon: <IconCopy />, note: "복사해서 새로 등록", go: () => router.push(`?menu=gongsil&action=write&copy=${v.id}`, { scroll: false }) },
    ],
    [
      ...(v.closed ? [{ label: "홍보 글 정리", icon: <IconTrash />, note: "거래 완료", go: () => setCleanFor(v) }] : []),
      v.active
        ? { label: "광고 내리기", icon: <IconPause />, go: () => setStopFor(v) }
        : { label: "광고 다시 올리기", icon: <IconPlay />, go: async () => {
            if (!confirm(`"${v.title}" 광고를 다시 올릴까요?`)) return;
            const r = v.closed ? await setVacancyDealClosed(v.id, false) : await updateVacancyStatus(v.id, "ACTIVE");
            setFlash(r.success ? "광고를 다시 올렸어요." : `광고를 올리지 못했어요. ${r.error || ""}`);
            setReloadVac((n) => n + 1);
          } },
      { label: "삭제", icon: <IconTrash />, danger: true, go: async () => {
          if (!confirm(`"${v.title}" 공실을 삭제할까요?\n삭제하면 공실 목록과 공실열람에서 사라져요.`)) return;
          const r = await deleteVacancy(v.id);
          setFlash(r.success ? "공실을 삭제했어요." : `삭제하지 못했어요. ${r.error || ""}`);
          setReloadVac((n) => n + 1);
        } },
    ],
  ];

  const kw = keyword.trim().toLowerCase();
  const [pickType, setPickType] = useState(""); // "" = 전체
  const [pickStatus, setPickStatus] = useState(""); // "" = 전체
  const shownVac = useMemo(() => {
    const list = (vacancies || []).filter((v) => (!pickType || v.type === pickType) && (!pickStatus || v.status === pickStatus) && (!kw || `${v.title} ${v.building} ${v.no} ${v.price}`.toLowerCase().includes(kw)));
    return list.sort((a, z) => Number(favs.includes(z.id)) - Number(favs.includes(a.id)));
  }, [vacancies, kw, favs, pickType, pickStatus]);
  // 내 공실이 있는 나눔만 (몇 개인지 함께)
  const typeTabs = TYPE_TABS.map((t) => ({ ...t, n: (vacancies || []).filter((v) => v.type === t.type).length })).filter((t) => t.n > 0);
  const empty: React.CSSProperties = { padding: "28px 20px", border: `1px dashed ${border}`, borderRadius: 12, color: textSecondary, fontSize: 14, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" };

  return (
    <>
      {notice && (
        <div style={{ marginBottom: 10, fontSize: 13, fontWeight: 700, color: "#c92a2a" }}>
          {notice} <button onClick={() => setNotice("")} style={{ border: 0, background: "transparent", color: textSecondary, cursor: "pointer" }}>✕</button>
        </div>
      )}
      {showTypes && vacancies && vacancies.length > 0 && (
        <div style={{ display: "flex", borderBottom: `1px solid ${border}`, marginBottom: 14 }}>
          {STATUS_TABS.map((t) => {
            const on = pickStatus === t.st;
            const n = t.st ? vacancies.filter((v) => v.status === t.st).length : vacancies.length;
            return (
              <button key={t.label} onClick={() => setPickStatus(t.st)} aria-pressed={on}
                style={{ border: "none", background: "none", padding: "12px 18px", fontSize: 14, fontWeight: on ? 800 : 600, color: on ? "#3b82f6" : textSecondary, borderBottom: `3px solid ${on ? "#3b82f6" : "transparent"}`, marginBottom: -1, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                {t.label}
                <span style={{ background: t.color, color: t.st ? "#fff" : "#4b5563", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{n}</span>
              </button>
            );
          })}
        </div>
      )}
      {showTypes && vacancies && vacancies.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {[{ label: "전체", type: "", n: vacancies.length }, ...typeTabs].map((t) => {
            const on = pickType === t.type;
            return (
              <button key={t.label} onClick={() => setPickType(t.type)} aria-pressed={on}
                style={{ height: 34, padding: "0 14px", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
                  border: `1px solid ${on ? textPrimary : border}`, background: on ? textPrimary : cardBg, color: on ? (darkMode ? "#111" : "#fff") : textPrimary }}>
                {t.label} <span style={{ fontWeight: 600, opacity: 0.7 }}>{t.n}</span>
              </button>
            );
          })}
        </div>
      )}
      <div style={row ? { display: "grid", gridAutoFlow: "column", gridAutoColumns: "320px", gap: 18, overflowX: "auto", paddingBottom: 10 } : { display: "grid", gridTemplateColumns: "repeat(auto-fill, 320px)", gap: 18 }}>
        {onAdd && (
          <button onClick={onAdd} title="새 공실 등록하기"
            style={{ minHeight: 230, borderRadius: 14, border: `2px dashed ${darkMode ? "#5c4033" : "#f3c9a8"}`, background: darkMode ? "#2b2320" : "#fff8f1", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <span style={{ width: 60, height: 60, borderRadius: "50%", background: "#e8590c", color: "#fff", fontSize: 34, fontWeight: 400, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(232,89,12,0.3)" }}>+</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: darkMode ? "#ffd8a8" : "#5c3b2e" }}>공실등록</span>
          </button>
        )}
        {vacancies === null ? <div style={empty}><LoadingDots color={textSecondary} /></div>
          : shownVac.length === 0 ? (kw || pickType || pickStatus ? <div style={empty}>찾는 공실이 없어요.</div> : onAdd ? null : <div style={empty}>아직 등록한 공실이 없어요.</div>)
          : (limit ? shownVac.slice(0, limit) : shownVac).map((v) => (
            <div key={v.id} className="gs-vac-card" onContextMenu={(e) => { e.preventDefault(); setMenu({ v, x: e.clientX, y: e.clientY }); }}
              style={{ position: "relative", background: cardBg, border: `1px solid ${border}`, borderRadius: 14, overflow: "hidden", padding: "16px 16px 14px" }}>
              <CardTools style={{ top: 22, right: 22 }} fav={favs.includes(v.id)} onFav={() => toggleFav(v.id)}
                onMore={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMenu({ v, x: r.left, y: r.bottom + 4 }); }} />
              {/* 카드 위쪽(제목·가격·사진)을 누르면 뉴스·SNS발행에서 그 공실 (2026-10-28 사장님) */}
              <div role="button" title="뉴스·SNS발행에서 이 공실 열기" onClick={() => openStep(v, "article")} style={{ display: "flex", gap: 10, cursor: "pointer" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    {v.commission && <span style={{ fontSize: 11, color: "#fa5252", border: "1px solid #fa5252", padding: "1px 5px", borderRadius: 4, fontWeight: 700, whiteSpace: "nowrap" }}>{v.commission}</span>}
                    {v.no && <span style={{ fontSize: 12, color: "#fa5252", fontWeight: 700 }}>{v.no}</span>}
                    {v.date && <span style={{ fontSize: 12, color: "#aaa" }}>{v.date}</span>}
                    {v.closed ? <span style={{ fontSize: 11, fontWeight: 800, padding: "1px 6px", borderRadius: 4, background: "#495057", color: "#fff", whiteSpace: "nowrap" }}>거래 완료</span>
                      : !v.active && <span style={{ fontSize: 11, fontWeight: 800, padding: "1px 6px", borderRadius: 4, background: "#adb5bd", color: "#fff", whiteSpace: "nowrap" }}>광고 내림</span>}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: textPrimary, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.title}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#1a73e8", marginBottom: 4 }}>{v.price}</div>
                  <div style={{ fontSize: 13, color: darkMode ? "#adb5bd" : "#555", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {v.spec.map((t, i) => <React.Fragment key={i}>{i > 0 && <span style={{ color: "#ddd", margin: "0 4px" }}>|</span>}{t}</React.Fragment>)}
                  </div>
                  <div style={{ fontSize: 12, color: darkMode ? "#868e96" : "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.rooms}</div>
                </div>
                <div style={{ flexShrink: 0, width: 110, height: 110, borderRadius: 6, overflow: "hidden", background: darkMode ? "#2c2d31" : "#f1f3f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {v.thumb ? <img src={v.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <IconBuilding width={32} height={32} stroke={textSecondary} />}
                </div>
              </div>
              {/* 매물보고서 · 물건홍보지 (2026-10-28 사장님) */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
                {([["report", "매물보고서"], ["flyer", "물건홍보지"]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => openMarketing(v.id, k)}
                    style={{ height: 26, padding: "0 10px", borderRadius: 999, border: `1px solid ${border}`, background: "transparent", color: textPrimary, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                    {l}
                  </button>
                ))}
              </div>
              {/* 아래 — 홍보현황 (광고 중 n/7 · 채널) */}
              <div style={{ marginTop: 12, borderTop: `1px solid ${border}` }}>
                <PromoRows theme={theme} v={v} promo={promos[v.id]} homepage={homepage} onMake={(tab) => openStep(v, tab)}
                  onListing={() => router.push(`?menu=gongsil&action=write&id=${v.id}`, { scroll: false })} onPaste={(ch, x, y) => setPasteFor({ v, ch, x, y })} onLinks={(x, y) => setLinksFor({ v, x, y })} />
                {/* 거래 완료인데 아직 올라가 있는 글 — 눈에 띄게 */}
                {v.closed && (() => {
                  const left = CLEAN_CH.filter(([c]) => promos[v.id]?.links[c]).length;
                  return left > 0 && (
                    <button onClick={() => setCleanFor(v)} style={{ marginTop: 10, width: "100%", height: 34, borderRadius: 8, border: 0, background: "#fff4e6", color: "#d9480f", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                      거래 완료 · 홍보 글 {left}곳 정리하기 →
                    </button>
                  );
                })()}
              </div>
            </div>
          ))}
      </div>

      {/* 마우스를 올리면 카드 바탕이 살짝 회색 · ☆·[···] 상자가 나타난다 (즐겨찾기한 카드는 별이 늘 보인다) */}
      <CardHoverStyle darkMode={darkMode} />
      {menu && (() => {
        const pr = promos[menu.v.id];
        const onCount = (menu.v.active ? 1 : 0) + (pr?.article && !pr.article.pending ? 1 : 0) + CHANNELS.filter((c) => pr?.links[c.id]).length;
        return <CardMenu theme={theme} title={menu.v.title} sub={[menu.v.no, menu.v.price, `광고 중 ${onCount}/${CHANNELS.length + 2}`].filter(Boolean).join(" · ")}
          x={menu.x} y={menu.y} groups={menuGroups(menu.v)} onClose={() => setMenu(null)} />;
      })()}
      {stopFor && (
        <StopDialog theme={theme} title={stopFor.title} onClose={() => setStopFor(null)}
          onPick={async (closed) => {
            const v = stopFor;
            setStopFor(null);
            const r = closed ? await setVacancyDealClosed(v.id, true) : await updateVacancyStatus(v.id, "STOPPED");
            if (!r.success) { setFlash(`광고를 내리지 못했어요. ${r.error || ""}`); return; }
            setFlash(closed ? "거래 완료로 광고를 내렸어요." : "광고를 잠시 내렸어요.");
            setReloadVac((n) => n + 1);
            if (closed && CLEAN_CH.some(([c]) => promos[v.id]?.links[c])) setCleanFor({ ...v, closed: true, active: false });
          }} />
      )}
      {cleanFor && (
        <CleanupDialog theme={theme} title={cleanFor.title} links={promos[cleanFor.id]?.links || {}} onClose={() => setCleanFor(null)}
          onDone={async (ch) => {
            const r = await saveVacancyPromo(cleanFor.id, ch, "");
            if (!r.success) { setFlash(r.error || "정리하지 못했어요."); return; }
            await loadPromos();
          }} />
      )}
      {linksFor && (
        <LinksPanel theme={theme} x={linksFor.x} y={linksFor.y} links={promos[linksFor.v.id]?.links || {}} onClose={() => setLinksFor(null)}
          onSave={async (ch, url) => {
            const r = await saveVacancyPromo(linksFor.v.id, ch, url);
            if (!r.success) return r.error || "저장하지 못했어요.";
            await loadPromos();
            return "";
          }} />
      )}
      {pasteFor && (
        <LinkPopover theme={theme} x={pasteFor.x} y={pasteFor.y} channel={pasteFor.ch} url={promos[pasteFor.v.id]?.links[pasteFor.ch]} onClose={() => setPasteFor(null)}
          onSave={async (url) => {
            const r = await saveVacancyPromo(pasteFor.v.id, pasteFor.ch, url);
            if (!r.success) return r.error || "저장하지 못했어요.";
            await loadPromos();
            setFlash(url.trim() ? "링크를 저장했어요." : "연결을 끊었어요.");
            return "";
          }} />
      )}
      {flash && (
        <div style={{ position: "fixed", left: "50%", bottom: 32, transform: "translateX(-50%)", zIndex: 10001, padding: "10px 18px", borderRadius: 10, background: "#212529", color: "#fff", fontSize: 14, fontWeight: 700, boxShadow: "0 6px 20px rgba(0,0,0,0.25)" }}>{flash}</div>
      )}
    </>
  );
}

// 카드 위 ☆·[···] 상자 보이기 · 카드 바탕 회색 (공실 카드 .gs-vac-card · 홈 작업 카드 .gs-work-card)
export function CardHoverStyle({ darkMode }: { darkMode: boolean }) {
  return (
    <style>{`.gs-vac-more{opacity:0;transition:opacity .15s}.gs-vac-card:hover .gs-vac-more,.gs-work-card:hover .gs-vac-more,.gs-vac-more:focus-within{opacity:1}
.gs-vac-more.gs-fav-on{opacity:1}.gs-vac-more.gs-fav-on .gs-more-dots{display:none}.gs-vac-card:hover .gs-fav-on .gs-more-dots,.gs-work-card:hover .gs-fav-on .gs-more-dots{display:flex}
.gs-vac-card{transition:background-color .15s}.gs-vac-card:hover{background-color:${darkMode ? "#2c2e33" : "#f5f6f7"} !important}`}</style>
  );
}

/* 공실 카드 안 홍보현황 — 채널 아이콘 한 줄 (2026-10-27 사장님: 글자 표는 촌스럽다)
   광고 중 = 원래 색 + 초록 ✓ · 글 써 둠 = 흐린 색 · 연결 전 = 회색
   아이콘을 누르면 아래에 [바로가기]·[링크 바꾸기] 또는 [만들기]·[링크 붙여넣기] */
type Slot = { id: string; label: string; bg: string; glyph: React.ReactNode; url?: string; state: "on" | "draft" | "off"; note?: string; tab?: string; channel?: PromoChannel };

export const G: Record<string, React.ReactNode> = {
  listing: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /><path d="M10 20v-5h4v5" /></svg>,
  article: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="7" y1="9" x2="17" y2="9" /><line x1="7" y1="13" x2="17" y2="13" /><line x1="7" y1="17" x2="12" y2="17" /></svg>,
  blog: <span style={{ color: "#fff", fontWeight: 900, fontSize: 16, fontFamily: "Arial, sans-serif" }}>N</span>,
  instagram: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r="0.6" fill="#fff" /></svg>,
  threads: <span style={{ color: "#fff", fontWeight: 800, fontSize: 17, fontFamily: "Arial, sans-serif" }}>@</span>,
  facebook: <span style={{ color: "#fff", fontWeight: 900, fontSize: 18, fontFamily: "Arial, sans-serif", marginTop: 2 }}>f</span>,
  youtube: <svg viewBox="0 0 24 24" width="18" height="18"><path d="M9.5 8.2v7.6L16 12z" fill="#fff" /></svg>,
};
export const BG: Record<string, string> = {
  listing: "#e8590c", article: "#0b7285", blog: "#03c75a", instagram: "linear-gradient(45deg,#f9a825,#e1306c 55%,#833ab4)",
  threads: "#111", facebook: "#1877f2", youtube: "#ff0000",
};

function PromoRows({ theme, v, promo, homepage = "", onMake, onListing, onPaste, onLinks }: { theme: AdminSectionProps["theme"]; v: VacancyCard; homepage?: string; promo?: VacancyPromo; onMake: (tab: string) => void; onListing: () => void; onPaste: (ch: PromoChannel, x: number, y: number) => void; onLinks: (x: number, y: number) => void }) {
  const { textSecondary, darkMode } = theme;
  const green = "#2f9e44";
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const art = promo?.article;

  const slots: Slot[] = [
    // 내 홈페이지(Pro · Studio)가 있으면 물건접수 홈페이지의 그 매물 화면으로 (2026-10-29 사장님)
    { id: "listing", label: homepage ? "물건접수 홈페이지 매물" : "공실뉴스 매물", bg: BG.listing, glyph: G.listing, state: v.active ? "on" : "off", url: v.active ? `${homepage || origin}/gongsil/detail/${v.id}` : undefined, note: v.active ? undefined : "공개 전 — 누르면 공실 수정" },
    { id: "article", label: "공실뉴스 기사", bg: BG.article, glyph: G.article, tab: "article",
      state: art && !art.pending ? "on" : art || v.done.article ? "draft" : "off",
      url: art && !art.pending ? `${origin}/news/${art.no}` : undefined, note: art?.pending ? "기사 검토 중" : undefined },
    ...CHANNELS.map((c): Slot => {
      const url = promo?.links[c.id];
      return { id: c.id, label: c.label, bg: BG[c.id], glyph: G[c.id], url, tab: c.id, channel: c.id, state: url ? "on" : v.done[c.id] ? "draft" : "off" };
    }),
  ];
  const onCount = slots.filter((x) => x.state === "on").length;
  // 누르면 — 올린 곳이 있으면 그 글을 새 창으로 · 없으면 그 채널 발행하는 곳으로 (링크 붙여넣기는 카드 메뉴)
  const go = (x: Slot) => {
    if (x.url) return openOut(x.url);
    if (x.id === "listing") return onListing();
    if (x.tab) onMake(x.tab);
  };

  return (
    <div style={{ marginTop: 14 }}>
      {/* 몇 곳에서 광고 중인지 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: textSecondary, whiteSpace: "nowrap" }}>
          광고 중 <b style={{ color: onCount ? green : textSecondary, fontSize: 13 }}>{onCount}</b> / {slots.length}
        </span>
        <span style={{ flex: 1, height: 4, borderRadius: 4, background: darkMode ? "#333" : "#eef0f2", overflow: "hidden" }}>
          <span style={{ display: "block", height: "100%", width: `${(onCount / slots.length) * 100}%`, background: green, borderRadius: 4, transition: "width .3s" }} />
        </span>
      </div>

      <div style={{ display: "flex", gap: 4 }}>
        {slots.map((x) => (
          <button key={x.id} onClick={() => go(x)}
            onContextMenu={(e) => { if (!x.channel) return; e.preventDefault(); e.stopPropagation(); onPaste(x.channel, e.clientX, e.clientY + 8); }}
            title={`${x.label} · ${x.state === "on" ? "올린 글 보기" : x.note || (x.state === "draft" ? "글 써 둠 — 올렸다면 주소를 확인해 주세요 (오른쪽 클릭으로 넣기)" : "만들기")}${x.channel ? " · 오른쪽 클릭: 링크 걸기" : ""}`}
            style={{ position: "relative", width: 32, height: 32, padding: 0, border: 0, borderRadius: 10, cursor: "pointer", background: x.bg,
              display: "flex", alignItems: "center", justifyContent: "center",
              filter: x.state === "off" ? "grayscale(1)" : "none", opacity: x.state === "on" ? 1 : x.state === "draft" ? 0.5 : 0.25, transition: "opacity .15s" }}>
            {x.glyph}
            {x.state === "on" && (
              <span style={{ position: "absolute", right: -4, bottom: -4, width: 15, height: 15, borderRadius: "50%", background: green, border: `2px solid ${darkMode ? "#25262b" : "#fff"}`, color: "#fff", fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</span>
            )}
            {/* 글은 써 뒀는데 링크가 없다 — 올렸다면 주소 확인 필요 (오른쪽 클릭으로 넣기, 2026-10-28) */}
            {x.state === "draft" && x.channel && (
              <span style={{ position: "absolute", right: -4, top: -4, width: 14, height: 14, borderRadius: "50%", background: "#f59f00", border: `2px solid ${darkMode ? "#25262b" : "#fff"}`, color: "#fff", fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>!</span>
            )}
          </button>
        ))}
        {/* 링크 수정 — 채널 링크를 한눈에 보고 복사·고치기 (2026-10-28 사장님: 회색으로) */}
        <button onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onLinks(r.left, r.bottom + 6); }} title="채널별 링크 보기·복사·수정"
          style={{ marginLeft: "auto", height: 32, padding: "0 10px", borderRadius: 10, border: 0, background: darkMode ? "#3a3b40" : "#e9ecef", color: textSecondary, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
          링크 수정
        </button>
      </div>
    </div>
  );
}

/* 채널 링크 작은 창 (2026-10-28 사장님) — 아이콘을 오른쪽 클릭하면 그 자리에
   걸린 링크 보기 · [복사] · [열기] · [수정](손으로 고치기) · [연결 끊기]. 링크가 없으면 바로 붙여넣기 칸 */
const LINK_LABEL: Record<string, string> = { blog: "네이버 블로그", instagram: "인스타그램", threads: "스레드", facebook: "페이스북", youtube: "유튜브" };
export function LinkPopover({ theme, x, y, channel, url, onSave, onClose }: {
  theme: AdminSectionProps["theme"]; x: number; y: number; channel: PromoChannel; url?: string;
  onSave: (url: string) => Promise<string>; onClose: () => void;
}) {
  const { cardBg, textPrimary, textSecondary, border, darkMode } = theme;
  const [edit, setEdit] = useState(!url);
  const [draft, setDraft] = useState(url || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setPos({ left: Math.max(8, Math.min(x, window.innerWidth - el.offsetWidth - 8)), top: Math.max(8, Math.min(y, window.innerHeight - el.offsetHeight - 8)) });
  }, [x, y, edit]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  const save = async (v: string) => {
    setBusy(true);
    setErr("");
    const e = await onSave(v);
    setBusy(false);
    if (e) setErr(e); else onClose();
  };
  const pill = (primary: boolean): React.CSSProperties => ({
    height: 30, padding: "0 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
    border: primary ? 0 : `1px solid ${border}`, background: primary ? textPrimary : "transparent", color: primary ? (darkMode ? "#111" : "#fff") : textPrimary,
  });
  return (
    <>
      <div onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 10001 }} />
      <div ref={ref} role="dialog" aria-label={`${LINK_LABEL[channel]} 링크`}
        style={{ position: "fixed", left: pos.left, top: pos.top, zIndex: 10002, width: 340, background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: "12px 14px", boxShadow: "0 10px 32px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 22, height: 22, borderRadius: 6, background: BG[channel], display: "flex", alignItems: "center", justifyContent: "center", transform: "scale(0.85)" }}>{G[channel]}</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: textPrimary }}>{LINK_LABEL[channel]}</span>
          <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: url ? "#2f9e44" : textSecondary }}>{url ? "● 연결됨" : "연결 전"}</span>
        </div>
        {!edit && url ? (
          <>
            <div title={url} style={{ marginTop: 8, padding: "7px 10px", borderRadius: 8, background: darkMode ? "#1f2023" : "#f6f7f9", fontSize: 12.5, color: textPrimary, wordBreak: "break-all", lineHeight: 1.45 }}>{url}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 10, alignItems: "center" }}>
              <button onClick={() => { void navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }} style={pill(true)}>{copied ? "복사했어요 ✓" : "복사"}</button>
              <button onClick={() => openOut(url)} style={pill(false)}>열기 ↗</button>
              <button onClick={() => { setDraft(url); setEdit(true); }} style={pill(false)}>수정</button>
              <button disabled={busy} onClick={() => { if (confirm("이 링크 연결을 끊을까요? (올린 글은 그대로예요)")) void save(""); }}
                style={{ marginLeft: "auto", border: 0, background: "transparent", padding: 0, fontSize: 12.5, color: "#c92a2a", cursor: "pointer" }}>연결 끊기</button>
            </div>
          </>
        ) : (
          <>
            <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="올린 글 주소 https://"
              onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) void save(draft); }}
              style={{ marginTop: 8, width: "100%", boxSizing: "border-box", height: 36, padding: "0 10px", fontSize: 13, borderRadius: 8, border: "2px solid #3b82f6", background: darkMode ? "#1a1b1e" : "#fff", color: textPrimary, outline: 0 }} />
            <div style={{ display: "flex", gap: 6, marginTop: 10, justifyContent: "flex-end" }}>
              <button onClick={() => (url ? setEdit(false) : onClose())} style={pill(false)}>취소</button>
              <button disabled={busy || !draft.trim()} onClick={() => void save(draft)} style={{ ...pill(true), opacity: busy || !draft.trim() ? 0.5 : 1 }}>{busy ? "저장 중…" : "저장"}</button>
            </div>
          </>
        )}
        {err && <div style={{ marginTop: 8, fontSize: 12, color: "#c92a2a" }}>{err}</div>}
      </div>
    </>
  );
}

/* [링크 수정] 창 — 다섯 채널 링크를 한 번에: 주소 보기 · [복사] · [수정](파란 칸) · 빈 채널은 [붙여넣기] (2026-10-28 사장님) */
export function LinksPanel({ theme, x, y, links, onSave, onClose }: {
  theme: AdminSectionProps["theme"]; x: number; y: number; links: Partial<Record<PromoChannel, string>>;
  onSave: (ch: PromoChannel, url: string) => Promise<string>; onClose: () => void;
}) {
  const { cardBg, textPrimary, textSecondary, border, darkMode } = theme;
  const [edit, setEdit] = useState<PromoChannel | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState<PromoChannel | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setPos({ left: Math.max(8, Math.min(x, window.innerWidth - el.offsetWidth - 8)), top: Math.max(8, Math.min(y, window.innerHeight - el.offsetHeight - 8)) });
  }, [x, y, edit]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  const save = async (ch: PromoChannel, v: string) => {
    setBusy(true);
    setErr("");
    const e = await onSave(ch, v);
    setBusy(false);
    if (e) setErr(e); else setEdit(null);
  };
  const small = (primary: boolean): React.CSSProperties => ({
    height: 26, padding: "0 9px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
    border: primary ? 0 : `1px solid ${border}`, background: primary ? textPrimary : "transparent", color: primary ? (darkMode ? "#111" : "#fff") : textPrimary,
  });
  return (
    <>
      <div onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 10001 }} />
      <div ref={ref} role="dialog" aria-label="링크 수정"
        style={{ position: "fixed", left: pos.left, top: pos.top, zIndex: 10002, width: 420, maxWidth: "calc(100vw - 16px)", background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: "12px 14px", boxShadow: "0 10px 32px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: textPrimary, marginBottom: 8 }}>링크 수정</div>
        {CLEAN_CH.map(([c, label]) => {
          const url = links[c];
          return (
            <div key={c} style={{ padding: "7px 0", borderTop: `1px solid ${border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 22, height: 22, borderRadius: 6, background: BG[c], display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, filter: url ? "none" : "grayscale(1)", opacity: url ? 1 : 0.5, transform: "scale(0.9)" }}>{G[c]}</span>
                <span style={{ width: 78, flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: textPrimary }}>{label}</span>
                <span title={url || ""} style={{ flex: 1, minWidth: 0, fontSize: 12, color: url ? textPrimary : textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url || "연결 전"}</span>
                {url && edit !== c && <button onClick={() => { void navigator.clipboard.writeText(url).then(() => { setCopied(c); setTimeout(() => setCopied(null), 1500); }); }} style={small(false)}>{copied === c ? "✓" : "복사"}</button>}
                {edit !== c && <button onClick={() => { setDraft(url || ""); setErr(""); setEdit(c); }} style={small(!url)}>{url ? "수정" : "붙여넣기"}</button>}
              </div>
              {edit === c && (
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="올린 글 주소 https://"
                    onKeyDown={(e) => { if (e.key === "Enter") void save(c, draft); }}
                    style={{ flex: 1, minWidth: 0, height: 30, padding: "0 9px", fontSize: 12.5, borderRadius: 8, border: "2px solid #3b82f6", background: darkMode ? "#1a1b1e" : "#fff", color: textPrimary, outline: 0 }} />
                  <button disabled={busy} onClick={() => void save(c, draft)} style={small(true)}>{busy ? "…" : draft.trim() ? "저장" : "연결 끊기"}</button>
                  <button onClick={() => setEdit(null)} style={small(false)}>취소</button>
                </div>
              )}
            </div>
          );
        })}
        {err && <div style={{ marginTop: 6, fontSize: 12, color: "#c92a2a" }}>{err}</div>}
      </div>
    </>
  );
}

/* 카드 오른쪽 위 흰 상자 — ☆ 즐겨찾기 · [···] 메뉴 (캔바식, 2026-10-28) */
export function CardTools({ style, fav, onFav, onMore }: { style: React.CSSProperties; fav: boolean; onFav: () => void; onMore?: (e: React.MouseEvent<HTMLButtonElement>) => void }) {
  const btn: React.CSSProperties = { width: 30, height: 30, border: 0, borderRadius: 8, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, color: "#212529" };
  return (
    <div className={`gs-vac-more${fav ? " gs-fav-on" : ""}`} style={{ position: "absolute", zIndex: 1, display: "flex", gap: 2, padding: 3, borderRadius: 10, background: "rgba(255,255,255,0.96)", boxShadow: "0 1px 4px rgba(0,0,0,0.25)", ...style }}>
      <button title={fav ? "즐겨찾기 해제" : "즐겨찾기"} aria-label={fav ? "즐겨찾기 해제" : "즐겨찾기"} aria-pressed={fav} onClick={(e) => { e.stopPropagation(); onFav(); }} style={btn}>
        <svg viewBox="0 0 24 24" width={20} height={20} fill={fav ? "#fab005" : "none"} stroke={fav ? "#f59f00" : "currentColor"} strokeWidth={1.8} strokeLinejoin="round" aria-hidden>
          <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
        </svg>
      </button>
      {onMore && (
        <span className="gs-more-dots" style={{ display: "flex" }}>
          <button title="더보기" aria-label="더보기" onClick={(e) => { e.stopPropagation(); onMore(e); }} style={{ ...btn, fontSize: 16, fontWeight: 900, letterSpacing: 1 }}>···</button>
        </span>
      )}
    </div>
  );
}

/* 불러오는 중 — 점 세 개가 차례로 통통 (2026-10-28 사장님) */
export function LoadingDots({ color }: { color: string }) {
  return (
    <span role="status" aria-label="불러오는 중" style={{ display: "inline-flex", gap: 6, alignItems: "center", height: 20 }}>
      <style>{`@keyframes gs-dot{0%,80%,100%{transform:translateY(0);opacity:.35}40%{transform:translateY(-6px);opacity:1}}`}</style>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: color, animation: `gs-dot 1s ${i * 0.15}s infinite ease-in-out` }} />
      ))}
    </span>
  );
}

/* ───────── 공실 카드 메뉴 (캔바식) ───────── */
export type MenuItem = { label: string; icon: React.ReactElement<React.SVGProps<SVGSVGElement>>; go: () => void | Promise<void>; note?: string; danger?: boolean };
export const IconOut = (p: any) => <SvgIcon {...p}><path d="M14 4h6v6" /><line x1="20" y1="4" x2="11" y2="13" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></SvgIcon>;
export const IconPen = (p: any) => <SvgIcon {...p}><path d="M4 20h4L19 9l-4-4L4 16z" /><line x1="13.5" y1="6.5" x2="17.5" y2="10.5" /></SvgIcon>;
export const IconStar = (p: any) => <SvgIcon {...p}><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" /></SvgIcon>;
export const IconLink = (p: any) => <SvgIcon {...p}><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" /><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" /></SvgIcon>;
const IconCopy = (p: any) => <SvgIcon {...p}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></SvgIcon>;
const IconPause = (p: any) => <SvgIcon {...p}><circle cx="12" cy="12" r="9" /><line x1="10" y1="9" x2="10" y2="15" /><line x1="14" y1="9" x2="14" y2="15" /></SvgIcon>;
const IconPlay = (p: any) => <SvgIcon {...p}><circle cx="12" cy="12" r="9" /><path d="M10 8.5v7l6-3.5z" /></SvgIcon>;
export const IconTrash = (p: any) => <SvgIcon {...p}><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /><line x1="10" y1="11" x2="10" y2="16" /><line x1="14" y1="11" x2="14" y2="16" /></SvgIcon>;

// 카드 메뉴 (캔바식) — 맨 위 이름·한 줄 설명, 아래 묶음별 항목 (공실 카드 · 홈 내 기사 카드)
export function CardMenu({ theme, title, sub, x, y, groups, onClose }: { theme: AdminSectionProps["theme"]; title: string; sub: string; x: number; y: number; groups: MenuItem[][]; onClose: () => void }) {
  const { textPrimary, textSecondary, border, darkMode } = theme;
  const ref = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  const [hover, setHover] = useState(-1);
  // 화면 밖으로 넘치지 않게
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth, h = el.offsetHeight;
    setPos({ left: Math.max(8, Math.min(x, window.innerWidth - w - 8)), top: Math.max(8, Math.min(y, window.innerHeight - h - 8)) });
  }, [x, y]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    window.addEventListener("resize", onClose);
    window.addEventListener("blur", onClose);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("resize", onClose); window.removeEventListener("blur", onClose); };
  }, [onClose]);
  let n = 0;
  return (
    <>
      <div onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} onWheel={onClose} style={{ position: "fixed", inset: 0, zIndex: 10000 }} />
      <div ref={ref} role="menu" style={{ position: "fixed", left: pos.left, top: pos.top, zIndex: 10001, width: 290, maxHeight: "calc(100vh - 16px)", overflowY: "auto",
        background: darkMode ? "#25262b" : "#fff", border: `1px solid ${border}`, borderRadius: 14, boxShadow: "0 10px 32px rgba(0,0,0,0.18)", padding: "6px 0" }}>
        <div style={{ padding: "10px 18px 12px" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
          <div style={{ marginTop: 3, fontSize: 12, color: textSecondary }}>{sub}</div>
        </div>
        {groups.map((g, gi) => (
          <div key={gi} style={{ borderTop: `1px solid ${border}`, padding: "6px 0" }}>
            {g.map((it) => {
              const i = n++;
              const color = it.danger ? "#e03131" : textPrimary;
              return (
                <button key={it.label} role="menuitem" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(-1)}
                  onClick={() => { onClose(); void it.go(); }}
                  style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "9px 18px", border: 0, cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                    background: hover === i ? (darkMode ? "#2c2e33" : "#f1f3f5") : "transparent", color, fontSize: 14, fontWeight: 500 }}>
                  {React.cloneElement(it.icon, { width: 20, height: 20, stroke: color })}
                  <span style={{ flex: 1 }}>{it.label}</span>
                  {it.note && <span style={{ fontSize: 12, color: textSecondary }}>{it.note}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}

/* ───────── 광고 내리기 — 이유 묻기 · 거래 완료면 올라간 글 정리 (2026-10-28 사장님 회의) ─────────
   글을 지우거나 비공개로 하는 것은 회원이 직접 (앱은 목록과 [글 열기]만). 정리했다고 누르면 그 채널 ✓가 빠진다 */
const CLEAN_CH: [PromoChannel, string][] = [["blog", "네이버 블로그"], ["instagram", "인스타그램"], ["threads", "스레드"], ["facebook", "페이스북"], ["youtube", "유튜브"]];

function StopDialog({ theme, title, onPick, onClose }: { theme: AdminSectionProps["theme"]; title: string; onPick: (closed: boolean) => void; onClose: () => void }) {
  const { cardBg, textPrimary, textSecondary, border } = theme;
  const opt = (closed: boolean, head: string, desc: string) => (
    <button onClick={() => onPick(closed)} style={{ textAlign: "left", width: "100%", padding: "14px 16px", borderRadius: 12, border: `1px solid ${border}`, background: "transparent", cursor: "pointer", color: textPrimary }}>
      <div style={{ fontSize: 15, fontWeight: 800 }}>{head}</div>
      <div style={{ marginTop: 4, fontSize: 12.5, color: textSecondary, lineHeight: 1.5 }}>{desc}</div>
    </button>
  );
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10002, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="광고 내리기"
        style={{ width: 440, maxWidth: "calc(100vw - 32px)", background: cardBg, borderRadius: 16, padding: "22px 24px", boxShadow: "0 16px 48px rgba(0,0,0,0.25)" }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: textPrimary }}>광고를 왜 내리시나요?</div>
        <div style={{ marginTop: 4, fontSize: 13, color: textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
          {opt(true, "거래 완료", "공실뉴스 매물을 내리고, 블로그·SNS에 올린 글도 정리할 수 있게 목록을 보여 드려요. 거래가 끝난 매물 광고를 그대로 두면 부당한 표시·광고가 될 수 있어요.")}
          {opt(false, "잠시 보류", "공실뉴스 매물만 내려요. 블로그·SNS 글은 그대로 두고, 다시 올리면 이어서 써요.")}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={{ height: 36, padding: "0 16px", borderRadius: 999, border: `1px solid ${border}`, background: "transparent", color: textPrimary, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>취소</button>
        </div>
      </div>
    </div>
  );
}

function CleanupDialog({ theme, title, links, onDone, onClose }: {
  theme: AdminSectionProps["theme"]; title: string; links: Partial<Record<PromoChannel, string>>;
  onDone: (ch: PromoChannel) => Promise<void>; onClose: () => void;
}) {
  const { cardBg, textPrimary, textSecondary, border, darkMode } = theme;
  const [busy, setBusy] = useState("");
  const rows = CLEAN_CH.filter(([c]) => links[c]);
  const pill = (primary: boolean): React.CSSProperties => ({
    height: 32, padding: "0 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
    border: primary ? 0 : `1px solid ${border}`, background: primary ? textPrimary : "transparent", color: primary ? (darkMode ? "#111" : "#fff") : textPrimary,
  });
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10002, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="홍보 글 정리"
        style={{ width: 480, maxWidth: "calc(100vw - 32px)", background: cardBg, borderRadius: 16, padding: "22px 24px", boxShadow: "0 16px 48px rgba(0,0,0,0.25)" }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: textPrimary }}>거래 완료 — 올라간 홍보 글을 정리해 주세요</div>
        <div style={{ marginTop: 4, fontSize: 13, color: textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
        <div style={{ marginTop: 8, fontSize: 12.5, color: textSecondary, lineHeight: 1.55 }}>[글 열기]로 크롬에서 열어 <b>삭제나 비공개</b>로 바꾼 뒤 [정리했어요]를 눌러 주세요. 지우는 건 직접 해요.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          {rows.length === 0 && <div style={{ padding: "14px 0", fontSize: 14, fontWeight: 700, color: "#2f9e44" }}>정리할 글이 없어요. 다 정리했어요 ✓</div>}
          {rows.map(([c, label]) => (
            <div key={c} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: `1px solid ${border}` }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: BG[c], display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{G[c]}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: textPrimary }}>{label}</span>
              <button onClick={() => openOut(links[c]!)} style={pill(false)}>글 열기 ↗</button>
              <button disabled={busy === c} onClick={async () => { setBusy(c); await onDone(c); setBusy(""); }} style={pill(true)}>{busy === c ? "…" : "정리했어요"}</button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
          <span style={{ fontSize: 12.5, color: textSecondary }}>남은 글 {rows.length}곳</span>
          <button onClick={onClose} style={{ height: 36, padding: "0 16px", borderRadius: 999, border: `1px solid ${border}`, background: "transparent", color: textPrimary, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>닫기</button>
        </div>
      </div>
    </div>
  );
}
