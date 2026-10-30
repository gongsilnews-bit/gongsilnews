"use client";

// 공실마케팅 첫 화면 (2026-10-27 사장님 — 캔바식 뼈대 + "내 공실" 진행판)
// 위에서 아래로: 인사말·찾기 → 만들기 아이콘 한 줄 → 작업 계속하기(PC 최근 파일) → 내 공실(무엇을 만들었나)
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSectionProps } from "./types";
import { SvgIcon, IconBuilding, IconArticle, IconHomepage, IconSend, IconFilm, IconImage } from "./AdminIcons";
import VacancyCardGrid, { CardTools, CardHoverStyle, CardMenu, LoadingDots, IconReport, IconOut, IconPen, IconStar, IconTrash, IconLink, kakaoShare, type MenuItem } from "./VacancyCardGrid";
import ArticleCardGrid from "./ArticleCardGrid";
import { listMyStudioReports } from "@/app/actions/studio";
// 강의영상녹화 창 — 홈 위에 바로 (2026-10-30 사장님). 누를 때만 불러온다
const RecordFlow = React.lazy(() => import("@/components/admin/studio-video/Flows").then((m) => ({ default: m.RecordFlow })));

type PhotoRecent = { path: string; name: string; at: number; thumb: string; missing?: boolean };
type VideoRecent = { dir: string; name: string; updatedAt: string; thumb: string; duration: number };
type Bridge = {
  photo?: { recent: () => Promise<PhotoRecent[]>; recentRemove?: (file: string) => Promise<unknown>; reveal?: (file: string) => Promise<unknown> };
  report?: { list: () => Promise<{ id: string; title: string; updatedAt: string; thumb?: string }[]> };
  video?: { project: { recent: () => Promise<VideoRecent[]> }; post?: { openPath?: (p: string) => Promise<unknown> } };
  snap?: { open: () => Promise<unknown> };
  ai?: { list: () => Promise<{ name: string; ok: boolean }[]> };
  openAiConnect?: () => Promise<void>;
};
const bridge = () => (typeof window === "undefined" ? undefined : (window as unknown as { gongsilStudio?: Bridge }).gongsilStudio);

type Card = { key: string; kind: "photo" | "video" | "report" | "flyer"; name: string; thumb: string; at: number; open: () => void; ref: string /* 공실 id · PSD 파일 · 영상 폴더 */ };
const IconSnap = (p: any) => <SvgIcon {...p}><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><circle cx="12" cy="12" r="3" /></SvgIcon>;
const IconFlyer = (p: any) => <SvgIcon {...p}><rect x="5" y="3" width="14" height="18" rx="1.5" /><rect x="8" y="6" width="8" height="6" rx="1" /><line x1="8" y1="15" x2="16" y2="15" /><line x1="8" y1="18" x2="13" y2="18" /></SvgIcon>;
const IconLecture = (p: any) => <SvgIcon {...p}><rect x="2.5" y="6" width="13" height="12" rx="2" /><path d="m15.5 10.5 6-3.5v10l-6-3.5" /></SvgIcon>;
const IconSearch = (p: any) => <SvgIcon {...p}><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /></SvgIcon>;

/** 홈에서 뺀 동영상 작업 — 이 기기에만 기억 (앱의 최근 목록·PC 파일은 그대로) */
const HIDDEN_VIDEO_KEY = "gs-home-hidden-video";
const hiddenVideos = (): string[] => { try { return JSON.parse(localStorage.getItem(HIDDEN_VIDEO_KEY) || "[]"); } catch { return []; } };
const hideVideo = (dir: string) => { try { localStorage.setItem(HIDDEN_VIDEO_KEY, JSON.stringify([...hiddenVideos(), dir].slice(-200))); } catch {} };

const ago = (t: number) => {
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
};

export default function StudioHomeSection({ theme, memberId, onMenuChange }: AdminSectionProps & { memberId?: string; onMenuChange: (menu: string) => void }) {
  const { cardBg, textPrimary, textSecondary, border, darkMode } = theme;
  const b = bridge();
  const router = useRouter();
  // [공실등록] — 목록을 거치지 않고 바로 등록 화면 (2026-10-28 사장님)
  const newVacancy = () => router.push("?menu=gongsil&action=write", { scroll: false });
  const [q, setQ] = useState("");
  // 내 AI 연결 상태 — 뉴스·SNS발행 위쪽과 같은 초록 칸 (2026-10-29 사장님: 홈 왼쪽 위). 누르면 AI 설정
  const [aiOn, setAiOn] = useState<string[] | null>(null);
  useEffect(() => {
    const load = () => { bridge()?.ai?.list().then((l) => setAiOn(l.filter((a) => a.ok).map((a) => a.name))).catch(() => {}); };
    load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, []);

  // 작업 줄 — 종류마다 따로 받아 먼저 온 줄부터 보인다 (2026-10-30 사장님: 로딩이 길다 — 넷을 다 기다리지 않게)
  const [parts, setParts] = useState<Partial<Record<Card["kind"], Card[]>>>({});
  const put = (k: Card["kind"], list: Card[]) => setParts((p) => ({ ...p, [k]: list.sort((x, y) => y.at - x.at) }));
  useEffect(() => {
    const g = bridge();
    if (!g) { setParts({ report: [], flyer: [], photo: [], video: [] }); return; }
    const toVac = (kind: "report" | "flyer") => (rows: { id: string; title: string; updatedAt: string; thumb?: string }[]): Card[] => rows.map((r) => ({
      key: (kind === "report" ? "r:" : "f:") + r.id, kind, ref: r.id, name: r.title || (kind === "report" ? "매물보고서" : "물건홍보지"), thumb: r.thumb || "", at: Date.parse(r.updatedAt) || 0,
      open: () => {
        try { localStorage.setItem("studio_marketing_category", kind); localStorage.setItem("studio_marketing_vacancy", r.id); } catch {}
        onMenuChange("marketing");
      },
    }));
    // 매물보고서 · 물건홍보지 — 내 공실로 저장한 것 (서버, 표지 그림만 받는다)
    listMyStudioReports().then((r) => put("report", toVac("report")(r.success ? r.data : []))).catch(() => put("report", []));
    listMyStudioReports("flyer").then((r) => put("flyer", toVac("flyer")(r.success ? r.data : []))).catch(() => put("flyer", []));
    // 포토studio — PSD 로 저장한 파일만 (그냥 열어 본 그림·캡처는 빼고)
    (g.photo?.recent() ?? Promise.resolve([] as PhotoRecent[])).then((ph) => put("photo", ph.filter((r) => !r.missing && /\.psd$/i.test(r.path) && r.thumb).map((r) => ({
      key: "p:" + r.path, kind: "photo" as const, ref: r.path, name: r.name, thumb: r.thumb, at: r.at,
      open: () => {
        // 이미지제작이 메뉴를 바꾸며 놓아 둔 파일을 받아 연다 (PhotoStudio — 화면캡처 알림과 같은 길)
        (window as unknown as { __gsSnapPhoto?: string }).__gsSnapPhoto = r.path;
        onMenuChange("photo");
        setTimeout(() => window.dispatchEvent(new Event("gs-snap-photo")), 0);
      },
    })))).catch(() => put("photo", []));
    // 동영상studio — 미리보기가 있는(저장한) 프로젝트만
    (g.video?.project.recent() ?? Promise.resolve([] as VideoRecent[])).then((vi) => put("video", vi.filter((r) => r.thumb && !hiddenVideos().includes(r.dir)).map((r) => ({
      key: "v:" + r.dir, kind: "video" as const, ref: r.dir, name: r.name, thumb: r.thumb, at: Date.parse(r.updatedAt) || 0,
      open: () => {
        try { sessionStorage.setItem("gs-video-open", JSON.stringify({ dir: r.dir, at: Date.now() })); } catch {}
        onMenuChange("video");
      },
    })))).catch(() => put("video", []));
  }, [onMenuChange]); // eslint-disable-line react-hooks/exhaustive-deps
  const cards = useMemo(() => Object.values(parts).flat() as Card[], [parts]);

  /* ── 작업 카드 오른쪽 클릭 메뉴 (2026-10-30 사장님 — 기사 카드 메뉴와 같은 틀: 열기 · 즐겨찾기 · 종류별 · 삭제) ── */
  const [recOpen, setRecOpen] = useState(false);
  const [workMenu, setWorkMenu] = useState<{ c: Card; x: number; y: number } | null>(null);
  const dropCard = (c: Card) => setParts((p) => ({ ...p, [c.kind]: (p[c.kind] || []).filter((x) => x.key !== c.key) }));
  const menuGroups = (c: Card): MenuItem[][] => {
    const g = bridge();
    const fav: MenuItem = { label: favs.includes(c.key) ? "즐겨찾기 해제" : "즐겨찾기", icon: <IconStar />, go: () => toggleFav(c.key) };
    const vacMenu = (other: "report" | "flyer"): MenuItem[] => [
      { label: other === "flyer" ? "이 공실로 물건홍보지 만들기" : "이 공실로 매물보고서 만들기", icon: other === "flyer" ? <IconFlyer /> : <IconReport />, go: () => {
        try { localStorage.setItem("studio_marketing_category", other); localStorage.setItem("studio_marketing_vacancy", c.ref); } catch {}
        onMenuChange("marketing");
      } },
      { label: "공실 정보 보기", icon: <IconOut />, go: () => router.push(`?menu=gongsil&action=detail&id=${encodeURIComponent(c.ref)}`, { scroll: false }) },
    ];
    if (c.kind === "report" || c.kind === "flyer") {
      const what = c.kind === "report" ? "매물보고서" : "물건홍보지";
      // 손님에게 보내는 주소 — 저장할 때 만들어지는 공개 페이지
      const url = `https://www.gongsilnews.com/${c.kind === "report" ? "report" : "flyer"}/${c.ref}.html`;
      // 그 화면을 열고, 다 그려지면 내보내기를 한 번 실행 (보고서·홍보지 화면이 gs-auto-action 을 읽는다)
      const run = (action: "pdf" | "image" | "print") => {
        try { localStorage.setItem("gs-auto-action", JSON.stringify({ id: c.ref, action, at: Date.now() })); } catch {}
        c.open();
      };
      const IconImg = (p: React.SVGProps<SVGSVGElement>) => <IconImage {...p} />;
      return [
        [{ label: "이어서 고치기", icon: <IconPen />, go: c.open }, fav],
        vacMenu(c.kind === "report" ? "flyer" : "report"),
        [
          ...(c.kind === "report" ? [{ label: "PDF 내보내기", icon: <IconReport />, note: "열고 바로", go: () => run("pdf") }] : [{ label: "인쇄 · PDF", icon: <IconReport />, note: "열고 바로", go: () => run("print") }]),
          { label: "이미지 내보내기", icon: <IconImg />, note: "열고 바로", go: () => run("image") },
          { label: "카카오톡으로 보내기", icon: <IconOut />, go: () => void kakaoShare({ title: c.name, description: c.kind === "report" ? "매물보고서" : "물건홍보지", url, button: c.kind === "report" ? "보고서 보기" : "홍보지 보기" }).catch(() => window.alert("카카오톡을 열지 못했어요.")) },
          { label: "링크 복사", icon: <IconLink />, go: async () => { try { await navigator.clipboard.writeText(url); window.alert("링크를 복사했어요. 문자·카톡에 붙여넣으세요."); } catch { window.prompt("이 링크를 복사하세요", url); } } },
        ],
        [{ label: `${what} 삭제`, icon: <IconTrash />, danger: true, note: "공실은 그대로", go: async () => {
          if (!window.confirm(`"${c.name}" ${what}를 지울까요?\n공실은 그대로 남아요. 지운 ${what}는 되살릴 수 없어요.`)) return;
          const r = await fetch("/api/vacancy/save-flyer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vacancyId: c.ref, flyerState: null, type: c.kind }) }).then((x) => x.json()).catch(() => null);
          if (r?.success) dropCard(c); else window.alert(`${what}를 지우지 못했어요.`);
        } }],
      ];
    }
    if (c.kind === "photo") return [
      [{ label: "포토studio에서 열기", icon: <IconPen />, go: c.open }, fav],
      ...(g?.photo?.reveal ? [[{ label: "폴더에서 보기", icon: <IconOut />, go: () => void g.photo!.reveal!(c.ref) }]] : []),
      [{ label: "목록에서 빼기", icon: <IconTrash />, danger: true, note: "PC 파일은 그대로", go: async () => { await g?.photo?.recentRemove?.(c.ref); dropCard(c); } }],
    ];
    return [
      [{ label: "동영상studio에서 열기", icon: <IconPen />, go: c.open }, fav],
      ...(g?.video?.post?.openPath ? [[{ label: "폴더에서 보기", icon: <IconOut />, go: () => void g.video!.post!.openPath!(c.ref) }]] : []),
      [{ label: "목록에서 빼기", icon: <IconTrash />, danger: true, note: "PC 파일은 그대로", go: () => { hideVideo(c.ref); dropCard(c); } }],
    ];
  };

  // 아이콘 순서 (2026-10-29 사장님): 공실관리 · 기사관리 · 물건접수홈페이지 · 뉴스·SNS · 매물보고서 · 유리창홍보지 · 이미지제작 · 동영상제작 · 강의영상녹화 · 화면캡처 (블로그는 뺌)
  const openMarketing = (cat: "report" | "flyer") => {
    try { localStorage.setItem("studio_marketing_category", cat); } catch {}
    onMenuChange("marketing");
  };
  const tools: { label: string; color: string; icon: React.ReactElement<React.SVGProps<SVGSVGElement>>; go: () => void; hide?: boolean; soon?: boolean }[] = [
    // 관리 화면으로 (2026-10-29 사장님) — 새 등록·작성은 아래 카드 줄 [+ 공실등록]·[+ 기사 작성]
    { label: "공실관리", color: "#e8590c", icon: <IconBuilding />, go: () => onMenuChange("gongsil") },
    { label: "기사관리", color: "#0b7285", icon: <IconArticle />, go: () => onMenuChange("article") },
    { label: "물건접수홈페이지", color: "#d6336c", icon: <IconHomepage />, go: () => onMenuChange("homepage") },
    { label: "뉴스·SNS", color: "#1971c2", icon: <IconSend />, go: () => onMenuChange("sns") },
    { label: "매물보고서", color: "#5c3b2e", icon: <IconReport />, go: () => openMarketing("report") },
    { label: "유리창홍보지", color: "#2f9e44", icon: <IconFlyer />, go: () => openMarketing("flyer") },
    { label: "포토studio", color: "#7048e8", icon: <IconImage />, go: () => onMenuChange("photo") },
    { label: "동영상studio", color: "#c2255c", icon: <IconFilm />, go: () => onMenuChange("video") },
    // 동영상제작 › 강의/영상녹화 (영상 녹화하기 창) — 앱에서만
    // 홈 위에서 바로 녹화 창 — 다 찍으면 동영상studio 편집으로 이어 간다 (2026-10-30 사장님)
    { label: "강의영상녹화", color: "#f08c00", icon: <IconLecture />, hide: !b, go: () => setRecOpen(true) },
    { label: "화면캡처", color: "#495057", icon: <IconSnap />, go: () => void b?.snap?.open(), hide: !b?.snap },
  ];

  const kw = q.trim().toLowerCase();
  // 작업 카드 즐겨찾기 (2026-10-28 사장님 — 캔바식 ☆) — 이 기기에 회원별로 기억, 별 누른 것이 맨 앞 (공실 카드는 VacancyCardGrid)
  const favKey = `gs-home-fav:${memberId || "me"}`;
  const [favs, setFavs] = useState<string[]>([]);
  useEffect(() => {
    try { setFavs(JSON.parse(localStorage.getItem(favKey) || "[]")); } catch { setFavs([]); }
  }, [favKey]);
  const toggleFav = (k: string) => setFavs((cur) => {
    const next = cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k];
    try { localStorage.setItem(favKey, JSON.stringify(next)); } catch {}
    return next;
  });
  const favFirst = <T,>(list: T[], key: (x: T) => string) => [...list].sort((a, z) => Number(favs.includes(key(z))) - Number(favs.includes(key(a))));


  const shownCards = useMemo(() => favFirst(cards.filter((c) => !kw || c.name.toLowerCase().includes(kw)), (c) => c.key), [cards, kw, favs]);


  const sectionTitle: React.CSSProperties = { fontSize: 20, fontWeight: 800, color: textPrimary, margin: "0 0 14px" };
  const empty: React.CSSProperties = { padding: "28px 20px", border: `1px dashed ${border}`, borderRadius: 12, color: textSecondary, fontSize: 14, textAlign: "center" };

  return (
    <div data-gs-home style={{ flex: 1, overflowY: "auto", padding: "20px 28px 48px" }}>
      {/* 인사말·찾기 */}
      <div style={{ position: "relative", borderRadius: 18, padding: "40px 24px 30px", textAlign: "center",
        background: darkMode ? "linear-gradient(135deg,#2b2320,#3a2a22)" : "linear-gradient(135deg,#fff4e6 0%,#ffe8cc 45%,#f3d9c4 100%)" }}>
        {b?.openAiConnect && aiOn && (
          <button onClick={() => void b.openAiConnect?.()} title="AI 설정 (내 AI 연결)"
            style={{ position: "absolute", top: 18, left: 18, display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
              background: aiOn.length ? (darkMode ? "rgba(34,197,94,0.12)" : "#ecfdf5") : cardBg, border: `1px solid ${aiOn.length ? (darkMode ? "rgba(110,231,183,0.6)" : "#6ee7b7") : border}`, color: aiOn.length ? (darkMode ? "#6ee7b7" : "#047857") : textPrimary }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: aiOn.length ? "#22c55e" : "#cbd5e1", boxShadow: aiOn.length ? "0 0 0 3px rgba(34,197,94,0.2)" : "none" }} />
            {aiOn.length ? `AI 설정 · ${aiOn.join(", ")}` : "AI 설정"}
          </button>
        )}
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: darkMode ? "#ffd8a8" : "#5c3b2e", letterSpacing: -0.5 }}>오늘은 어떤 공실을 SNS로 마케팅 할까요?</h1>
        <div style={{ maxWidth: 640, margin: "22px auto 0", display: "flex", alignItems: "center", gap: 10, padding: "0 18px", height: 52,
          background: cardBg, border: `1px solid ${border}`, borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
          <IconSearch width={20} height={20} stroke={textSecondary} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="공실 이름·광고번호·작업 파일 찾기"
            style={{ flex: 1, border: 0, outline: 0, background: "transparent", fontSize: 15, color: textPrimary }} />
        </div>
        {/* 만들기 아이콘 한 줄 */}
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 18, marginTop: 28 }}>
          {tools.filter((t) => !t.hide).map((t) => (
            <button key={t.label} onClick={t.go} disabled={t.soon} title={t.soon ? "준비 중이에요" : undefined} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 84, border: 0, background: "transparent", cursor: t.soon ? "default" : "pointer", opacity: t.soon ? 0.55 : 1 }}>
              <span style={{ position: "relative", width: 56, height: 56, borderRadius: "50%", background: t.color, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}>
                {t.soon && <span style={{ position: "absolute", top: -6, right: -10, fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 999, background: "#fff", color: "#495057", border: "1px solid #dee2e6", whiteSpace: "nowrap" }}>준비 중</span>}
                {React.cloneElement(t.icon, { width: 26, height: 26, stroke: "#fff" })}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary, whiteSpace: "nowrap" }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 내 공실 홍보현황 — 맨 앞 (2026-10-27 사장님): [+ 공실등록] 다음에 공실별 카드 */}
      <div style={{ marginTop: 36 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h2 style={sectionTitle}>내 공실 홍보현황</h2>
          {/* 모두 보기 → 뉴스·SNS자동화 (홍보현황 목록, 2026-10-30 사장님) */}
          <button onClick={() => onMenuChange("sns")} style={{ border: 0, background: "transparent", color: textSecondary, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>모두 보기</button>
        </div>
        <VacancyCardGrid theme={theme} memberId={memberId} onMenuChange={onMenuChange} keyword={q} limit={11} onAdd={newVacancy} row />
      </div>

      {/* 내 기사 — 공실 홍보현황 아래 · 작업 계속하기 위 (2026-10-28 사장님) */}
      <div style={{ marginTop: 40 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h2 style={sectionTitle}>내 기사</h2>
          <span style={{ fontSize: 13, color: textSecondary }}>누르면 그 기사로 블로그·SNS 글을 써요</span>
          <button onClick={() => onMenuChange("article")} style={{ marginLeft: "auto", border: 0, background: "transparent", color: textSecondary, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>모두 보기</button>
        </div>
        <ArticleCardGrid theme={theme} memberId={memberId} onMenuChange={onMenuChange} keyword={q} layout="row" />
      </div>

      {/* 작업 카드 ☆ 상자 · (공실 카드와 같은 모양) · 기사 사진 위 채널 아이콘 */}
      <CardHoverStyle darkMode={darkMode} />

      {/* 작업 줄 — 매물보고서 · 물건홍보지 · 포토studio · 동영상studio, 한 줄씩 (2026-10-30 사장님) */}
      {(() => {
        const secs: { kind: Card["kind"]; title: string; desc: string; go: () => void; none: string; add: { label: string; color: string; go: () => void } }[] = [
          { kind: "report", title: "매물보고서", desc: "공실로 만든 매물 소개 보고서 — 누르면 이어서 고쳐요", go: () => openMarketing("report"), none: "아직 만든 매물보고서가 없어요.",
            add: { label: "매물보고서 작성", color: "#5c3b2e", go: () => openMarketing("report") } },
          { kind: "flyer", title: "물건홍보지", desc: "유리창·온라인에 붙이는 홍보지 — 누르면 이어서 고쳐요", go: () => openMarketing("flyer"), none: "아직 만든 물건홍보지가 없어요.",
            add: { label: "물건홍보지 작성", color: "#2f9e44", go: () => openMarketing("flyer") } },
          { kind: "photo", title: "포토studio", desc: "저장한 이미지(PSD) — 누르면 포토studio에서 열려요", go: () => onMenuChange("photo"), none: "아직 저장한 이미지가 없어요.",
            add: { label: "이미지 만들기", color: "#7048e8", go: () => { try { sessionStorage.setItem("gs-photo-new", "1"); } catch {} onMenuChange("photo"); } } },
          { kind: "video", title: "동영상studio", desc: "저장한 영상 작업 — 누르면 동영상studio에서 열려요", go: () => onMenuChange("video"), none: "아직 저장한 영상이 없어요.",
            add: { label: "동영상 만들기", color: "#c2255c", go: () => { try { sessionStorage.setItem("gs-video-flow", "new"); } catch {} onMenuChange("video"); } } },
        ];
        // 탭 대신 종류마다 한 줄씩 쭉 (2026-10-30 사장님: 1열로 쭉)
        return secs.map((sec) => {
        const list = shownCards.filter((c) => c.kind === sec.kind).slice(0, 12);
        const tall = sec.kind === "flyer"; // 홍보지는 세로 A4
        const addCard = b && (
          <button key="add" onClick={sec.add.go} style={{ flex: `0 0 ${tall ? 150 : 210}px`, width: tall ? 150 : 210, aspectRatio: tall ? "860 / 1216" : "16 / 10", alignSelf: "flex-start", borderRadius: 12, border: `2px dashed ${sec.add.color}66`, background: darkMode ? "#2c2d31" : "#fbf7f4", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span style={{ width: 44, height: 44, borderRadius: 22, background: sec.add.color, color: "#fff", fontSize: 26, lineHeight: "44px", fontWeight: 400 }}>+</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: sec.add.color }}>{sec.add.label}</span>
          </button>
        );
        return (
          <div key={sec.kind} style={{ marginTop: 40 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <h2 style={sectionTitle}>{sec.title}</h2>
              <span style={{ fontSize: 13, color: textSecondary }}>{sec.desc}</span>
              <button onClick={sec.go} style={{ marginLeft: "auto", border: 0, background: "transparent", color: textSecondary, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>모두 보기</button>
            </div>
            {parts[sec.kind] === undefined ? <div style={{ ...empty, display: "flex", justifyContent: "center" }}><LoadingDots color={textSecondary} /></div>
              : !b ? <div style={empty}>작업 파일은 공실마케팅 앱에서 보여요.</div>
              : (
                // 캔바처럼 한 줄 — 넘치면 옆으로 밀어 본다
                <div style={{ display: "flex", gap: 18, overflowX: "auto", paddingBottom: 6, alignItems: "flex-start" }}>
                  {addCard}
                  {list.length === 0 && kw && <div style={{ ...empty, flex: 1, alignSelf: "stretch", display: "flex", alignItems: "center", justifyContent: "center" }}>찾는 작업 파일이 없어요.</div>}
                  {list.map((c) => (
                    <div key={c.key} className="gs-work-card" onContextMenu={(e) => { e.preventDefault(); setWorkMenu({ c, x: e.clientX, y: e.clientY }); }} style={{ position: "relative", flex: `0 0 ${tall ? 150 : 210}px`, width: tall ? 150 : 210, minWidth: 0 }}>
                    <CardTools style={{ top: 8, right: 8 }} fav={favs.includes(c.key)} onFav={() => toggleFav(c.key)} onMore={(e) => { const r = e.currentTarget.getBoundingClientRect(); setWorkMenu({ c, x: r.left, y: r.bottom + 4 }); }} />
                    <button onClick={c.open} style={{ width: "100%", textAlign: "left", border: 0, background: "transparent", cursor: "pointer", padding: 0 }}>
                      <div style={{ aspectRatio: tall ? "860 / 1216" : "16 / 10", borderRadius: 12, background: darkMode ? "#2c2d31" : "#f1f3f5", border: `1px solid ${border}`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {c.thumb ? <img src={c.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                          : (c.kind === "video" ? <IconFilm width={34} height={34} stroke={textSecondary} /> : c.kind === "report" ? <IconReport width={34} height={34} stroke={textSecondary} /> : c.kind === "flyer" ? <IconFlyer width={34} height={34} stroke={textSecondary} /> : <IconImage width={34} height={34} stroke={textSecondary} />)}
                      </div>
                      <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                      <div style={{ marginTop: 2, fontSize: 12, color: textSecondary }}>{c.kind === "video" ? "동영상" : c.kind === "report" ? "매물보고서" : c.kind === "flyer" ? "물건홍보지" : "이미지"} · {ago(c.at)} 편집함</div>
                    </button>
                    </div>
                  ))}
                </div>
              )}
          </div>
        );
        });
      })()}
      {recOpen && (
        <React.Suspense fallback={null}>
          <RecordFlow onCancel={() => setRecOpen(false)} onRecorded={(item, script) => {
            try { sessionStorage.setItem("gs-video-recorded", JSON.stringify({ item, script: script || "", at: Date.now() })); } catch {}
            setRecOpen(false);
            onMenuChange("video");
          }} />
        </React.Suspense>
      )}
      {workMenu && <CardMenu theme={theme} title={workMenu.c.name}
        sub={`${workMenu.c.kind === "video" ? "동영상" : workMenu.c.kind === "report" ? "매물보고서" : workMenu.c.kind === "flyer" ? "물건홍보지" : "이미지"} · ${ago(workMenu.c.at)} 편집함`}
        x={workMenu.x} y={workMenu.y} groups={menuGroups(workMenu.c)} onClose={() => setWorkMenu(null)} />}
    </div>
  );
}
