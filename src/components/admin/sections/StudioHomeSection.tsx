"use client";

// 공실마케팅 첫 화면 (2026-10-27 사장님 — 캔바식 뼈대 + "내 공실" 진행판)
// 위에서 아래로: 인사말·찾기 → 만들기 아이콘 한 줄 → 작업 계속하기(PC 최근 파일) → 내 공실(무엇을 만들었나)
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSectionProps } from "./types";
import { SvgIcon, IconBuilding, IconArticle, IconHomepage, IconSend, IconFilm, IconImage } from "./AdminIcons";
import VacancyCardGrid, { CardTools, CardHoverStyle, LoadingDots, IconReport } from "./VacancyCardGrid";
import ArticleCardGrid from "./ArticleCardGrid";

type PhotoRecent = { path: string; name: string; at: number; thumb: string; missing?: boolean };
type VideoRecent = { dir: string; name: string; updatedAt: string; thumb: string; duration: number };
type Bridge = {
  photo?: { recent: () => Promise<PhotoRecent[]> };
  video?: { project: { recent: () => Promise<VideoRecent[]> } };
  snap?: { open: () => Promise<unknown> };
  ai?: { list: () => Promise<{ name: string; ok: boolean }[]> };
  openAiConnect?: () => Promise<void>;
};
const bridge = () => (typeof window === "undefined" ? undefined : (window as unknown as { gongsilStudio?: Bridge }).gongsilStudio);

type Card = { key: string; kind: "photo" | "video"; name: string; thumb: string; at: number; open: () => void };
const IconSnap = (p: any) => <SvgIcon {...p}><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><circle cx="12" cy="12" r="3" /></SvgIcon>;
const IconFlyer = (p: any) => <SvgIcon {...p}><rect x="5" y="3" width="14" height="18" rx="1.5" /><rect x="8" y="6" width="8" height="6" rx="1" /><line x1="8" y1="15" x2="16" y2="15" /><line x1="8" y1="18" x2="13" y2="18" /></SvgIcon>;
const IconLecture = (p: any) => <SvgIcon {...p}><rect x="2.5" y="6" width="13" height="12" rx="2" /><path d="m15.5 10.5 6-3.5v10l-6-3.5" /></SvgIcon>;
const IconSearch = (p: any) => <SvgIcon {...p}><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /></SvgIcon>;

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
  const [cards, setCards] = useState<Card[] | null>(null);
  // 내 AI 연결 상태 — 뉴스·SNS발행 위쪽과 같은 초록 칸 (2026-10-29 사장님: 홈 왼쪽 위). 누르면 AI 설정
  const [aiOn, setAiOn] = useState<string[] | null>(null);
  useEffect(() => {
    const load = () => { bridge()?.ai?.list().then((l) => setAiOn(l.filter((a) => a.ok).map((a) => a.name))).catch(() => {}); };
    load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, []);

  // 작업 계속하기 — 이미지제작·동영상제작 최근 파일 (이 PC)
  useEffect(() => {
    const g = bridge();
    if (!g) return setCards([]);
    Promise.all([
      g.photo?.recent().catch(() => []) ?? Promise.resolve([] as PhotoRecent[]),
      g.video?.project.recent().catch(() => []) ?? Promise.resolve([] as VideoRecent[]),
    ]).then(([ph, vi]) => {
      const list: Card[] = [
        ...(ph as PhotoRecent[]).filter((r) => !r.missing).map((r) => ({
          key: "p:" + r.path, kind: "photo" as const, name: r.name, thumb: r.thumb, at: r.at,
          open: () => {
            // 이미지제작이 메뉴를 바꾸며 놓아 둔 파일을 받아 연다 (PhotoStudio — 화면캡처 알림과 같은 길)
            (window as unknown as { __gsSnapPhoto?: string }).__gsSnapPhoto = r.path;
            onMenuChange("photo");
            setTimeout(() => window.dispatchEvent(new Event("gs-snap-photo")), 0);
          },
        })),
        ...(vi as VideoRecent[]).map((r) => ({
          key: "v:" + r.dir, kind: "video" as const, name: r.name, thumb: r.thumb, at: Date.parse(r.updatedAt) || 0,
          open: () => {
            try { sessionStorage.setItem("gs-video-open", JSON.stringify({ dir: r.dir, at: Date.now() })); } catch {}
            onMenuChange("video");
          },
        })),
      ];
      setCards(list.sort((x, y) => y.at - x.at).slice(0, 12));
    });
  }, [onMenuChange]);

  // 아이콘 순서 (2026-10-29 사장님): 공실관리 · 기사관리 · 물건접수홈페이지 · 뉴스·SNS · 매물보고서 · 유리창홍보지 · 이미지제작 · 동영상편집 · 강의영상녹화 · 화면캡처 (블로그는 뺌)
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
    { label: "이미지제작", color: "#7048e8", icon: <IconImage />, go: () => onMenuChange("photo") },
    { label: "동영상편집", color: "#c2255c", icon: <IconFilm />, go: () => onMenuChange("video") },
    // 동영상제작 › 강의/영상녹화 (영상 녹화하기 창) — 앱에서만
    { label: "강의영상녹화", color: "#f08c00", icon: <IconLecture />, hide: !b, go: () => { try { sessionStorage.setItem("gs-video-flow", "record"); } catch {} onMenuChange("video"); } },
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


  const shownCards = useMemo(() => favFirst((cards || []).filter((c) => !kw || c.name.toLowerCase().includes(kw)), (c) => c.key), [cards, kw, favs]);


  const sectionTitle: React.CSSProperties = { fontSize: 20, fontWeight: 800, color: textPrimary, margin: "0 0 14px" };
  const empty: React.CSSProperties = { padding: "28px 20px", border: `1px dashed ${border}`, borderRadius: 12, color: textSecondary, fontSize: 14, textAlign: "center" };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px 48px" }}>
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
          <button onClick={() => onMenuChange("gongsil")} style={{ border: 0, background: "transparent", color: textSecondary, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>모두 보기</button>
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

      {/* 작업 계속하기 */}
      <div style={{ marginTop: 40 }}>
        <h2 style={sectionTitle}>작업 계속하기</h2>
        {cards === null ? <div style={{ ...empty, display: "flex", justifyContent: "center" }}><LoadingDots color={textSecondary} /></div>
          : shownCards.length === 0 ? <div style={empty}>{kw ? "찾는 작업 파일이 없어요." : b ? "아직 만든 이미지·영상이 없어요. 위 [동영상편집]이나 [이미지제작]으로 시작해 보세요." : "작업 파일은 공실마케팅 앱에서 보여요."}</div>
          : (
            // 캔바처럼 한 줄 — 넘치면 옆으로 밀어 본다
            <div style={{ display: "flex", gap: 18, overflowX: "auto", paddingBottom: 6 }}>
              {shownCards.map((c) => (
                <div key={c.key} className="gs-work-card" style={{ position: "relative", flex: "0 0 210px", width: 210, minWidth: 0 }}>
                <CardTools style={{ top: 8, right: 8 }} fav={favs.includes(c.key)} onFav={() => toggleFav(c.key)} />
                <button onClick={c.open} style={{ width: "100%", textAlign: "left", border: 0, background: "transparent", cursor: "pointer", padding: 0 }}>
                  <div style={{ aspectRatio: "16 / 10", borderRadius: 12, background: darkMode ? "#2c2d31" : "#f1f3f5", border: `1px solid ${border}`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {c.thumb ? <img src={c.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : (c.kind === "video" ? <IconFilm width={34} height={34} stroke={textSecondary} /> : <IconImage width={34} height={34} stroke={textSecondary} />)}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                  <div style={{ marginTop: 2, fontSize: 12, color: textSecondary }}>{c.kind === "video" ? "동영상" : "이미지"} · {ago(c.at)} 편집함</div>
                </button>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
