"use client";

// 공실스튜디오 첫 화면 (2026-10-27 사장님 — 캔바식 뼈대 + "내 공실" 진행판)
// 위에서 아래로: 인사말·찾기 → 만들기 아이콘 한 줄 → 작업 계속하기(PC 최근 파일) → 내 공실(무엇을 만들었나)
import React, { useEffect, useMemo, useState } from "react";
import { AdminSectionProps } from "./types";
import { SvgIcon, IconBuilding, IconArticle, IconSend, IconFilm, IconImage } from "./AdminIcons";
import { getVacancies } from "@/app/actions/vacancy";
import { getPriceText } from "@/app/(map)/gongsil/gongsilHelpers";
import { checkMyPromoLinks, getMyVacancyPromos, saveVacancyPromo, type VacancyPromo } from "@/app/actions/vacancyPromos";
import type { PromoChannel } from "@/utils/vacancyPromos";

type Done = Record<string, boolean>;
type LocalWork = { vacancyId: string; no: string; title: string; priceText: string; thumb: string | null; updatedAt: string; done: Done };
type PhotoRecent = { path: string; name: string; at: number; thumb: string; missing?: boolean };
type VideoRecent = { dir: string; name: string; updatedAt: string; thumb: string; duration: number };
type Bridge = {
  vacancy?: { list: () => Promise<LocalWork[]> };
  photo?: { recent: () => Promise<PhotoRecent[]> };
  video?: { project: { recent: () => Promise<VideoRecent[]> } };
  snap?: { open: () => Promise<unknown> };
};
const bridge = () => (typeof window === "undefined" ? undefined : (window as unknown as { gongsilStudio?: Bridge }).gongsilStudio);

type Card = { key: string; kind: "photo" | "video"; name: string; thumb: string; at: number; open: () => void };
type VacancyCard = { id: string; no: string; title: string; price: string; thumb: string | null; done: Done; at: number; active: boolean };

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

const IconBlog = (p: any) => <SvgIcon {...p}><path d="M4 4h16v12H8l-4 4z" /><line x1="8" y1="8" x2="16" y2="8" /><line x1="8" y1="12" x2="13" y2="12" /></SvgIcon>;
const IconReport = (p: any) => <SvgIcon {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><line x1="8" y1="17" x2="8" y2="13" /><line x1="12" y1="17" x2="12" y2="9" /><line x1="16" y1="17" x2="16" y2="11" /></SvgIcon>;
const IconSnap = (p: any) => <SvgIcon {...p}><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><circle cx="12" cy="12" r="3" /></SvgIcon>;
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
  const [q, setQ] = useState("");
  const [cards, setCards] = useState<Card[] | null>(null);
  const [vacancies, setVacancies] = useState<VacancyCard[] | null>(null);

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

  // 내 공실 — 등록한 공실 + 이 PC에서 무엇을 만들었는지
  useEffect(() => {
    if (!memberId) return;
    let off = false;
    Promise.all([
      getVacancies({ ownerId: memberId }).then((r) => (r.success ? (r.data as any[]) || [] : [])).catch(() => [] as any[]),
      bridge()?.vacancy?.list().catch(() => [] as LocalWork[]) ?? Promise.resolve([] as LocalWork[]),
    ]).then(([rows, works]) => {
      if (off) return;
      const local = new Map((works as LocalWork[]).map((w) => [w.vacancyId, w]));
      const list: VacancyCard[] = rows.map((v) => {
        const w = local.get(String(v.id));
        const photo = [...(v.vacancy_photos || [])].sort((a: any, z: any) => (a.sort_order ?? 0) - (z.sort_order ?? 0))[0]?.url || null;
        return {
          id: String(v.id),
          no: v.vacancy_no ? String(v.vacancy_no) : "",
          title: v.building_name || [v.sigungu, v.dong].filter(Boolean).join(" ") || "이름 없는 공실",
          price: getPriceText(v), // "매매 13억"처럼 거래 종류까지 들어 있다
          thumb: photo || w?.thumb || null,
          done: w?.done || {},
          at: Math.max(Date.parse(w?.updatedAt || "") || 0, Date.parse(v.created_at) || 0),
          active: v.status === "ACTIVE",
        };
      });
      setVacancies(list.sort((x, y) => y.at - x.at));
    });
    return () => { off = true; };
  }, [memberId]);

  // 홍보현황 — 공실뉴스 기사 · 채널별 글 주소 (서버)
  const [promos, setPromos] = useState<Record<string, VacancyPromo>>({});
  const loadPromos = () => getMyVacancyPromos().then((r) => r.success && setPromos(r.promos)).catch(() => {});
  // 지운 글은 연결을 푼다 — 5분에 한 번까지 (홈을 열 때 · 앱으로 돌아올 때)
  const [notice, setNotice] = useState("");
  const checkedAt = React.useRef(0);
  const checkLinks = () => {
    if (Date.now() - checkedAt.current < 5 * 60 * 1000) return;
    checkedAt.current = Date.now();
    checkMyPromoLinks().then((r) => {
      if (!r.removed.length) return;
      const names = r.removed.map((x) => x.title).join(", ");
      setNotice(`${names} — 네이버 블로그 글이 지워져서 연결을 풀었어요.`);
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

  // 진행판 칸을 누르면 뉴스·SNS발행에서 그 공실·그 탭으로 (StudioSnsSection 이 기억을 읽어 연다)
  const openStep = (vacancyId: string, tab: string) => {
    try {
      localStorage.setItem("studio_news_category", "gongsil");
      localStorage.setItem("studio_last_vacancy", JSON.stringify({ vacancyId, picked: null, tab }));
    } catch {}
    onMenuChange("sns");
  };

  const tools: { label: string; color: string; icon: React.ReactElement<React.SVGProps<SVGSVGElement>>; go: () => void; hide?: boolean }[] = [
    { label: "공실등록", color: "#e8590c", icon: <IconBuilding />, go: () => onMenuChange("gongsil") },
    { label: "뉴스·SNS", color: "#1971c2", icon: <IconSend />, go: () => onMenuChange("sns") },
    { label: "기사", color: "#0b7285", icon: <IconArticle />, go: () => onMenuChange("article") },
    { label: "블로그", color: "#2f9e44", icon: <IconBlog />, go: () => onMenuChange("sns") },
    { label: "동영상", color: "#c2255c", icon: <IconFilm />, go: () => onMenuChange("video") },
    { label: "이미지", color: "#7048e8", icon: <IconImage />, go: () => onMenuChange("photo") },
    { label: "매물보고서", color: "#5c3b2e", icon: <IconReport />, go: () => onMenuChange("marketing") },
    { label: "화면캡처", color: "#495057", icon: <IconSnap />, go: () => void b?.snap?.open(), hide: !b?.snap },
  ];

  const kw = q.trim().toLowerCase();
  const shownCards = useMemo(() => (cards || []).filter((c) => !kw || c.name.toLowerCase().includes(kw)), [cards, kw]);
  const shownVac = useMemo(() => (vacancies || []).filter((v) => !kw || `${v.title} ${v.no} ${v.price}`.toLowerCase().includes(kw)), [vacancies, kw]);

  const sectionTitle: React.CSSProperties = { fontSize: 20, fontWeight: 800, color: textPrimary, margin: "0 0 14px" };
  const empty: React.CSSProperties = { padding: "28px 20px", border: `1px dashed ${border}`, borderRadius: 12, color: textSecondary, fontSize: 14, textAlign: "center" };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px 48px" }}>
      {/* 인사말·찾기 */}
      <div style={{ borderRadius: 18, padding: "40px 24px 30px", textAlign: "center",
        background: darkMode ? "linear-gradient(135deg,#2b2320,#3a2a22)" : "linear-gradient(135deg,#fff4e6 0%,#ffe8cc 45%,#f3d9c4 100%)" }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: darkMode ? "#ffd8a8" : "#5c3b2e", letterSpacing: -0.5 }}>오늘은 어떤 공실을 알려 볼까요?</h1>
        <div style={{ maxWidth: 640, margin: "22px auto 0", display: "flex", alignItems: "center", gap: 10, padding: "0 18px", height: 52,
          background: cardBg, border: `1px solid ${border}`, borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
          <IconSearch width={20} height={20} stroke={textSecondary} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="공실 이름·광고번호·작업 파일 찾기"
            style={{ flex: 1, border: 0, outline: 0, background: "transparent", fontSize: 15, color: textPrimary }} />
        </div>
        {/* 만들기 아이콘 한 줄 */}
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 18, marginTop: 28 }}>
          {tools.filter((t) => !t.hide).map((t) => (
            <button key={t.label} onClick={t.go} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: 84, border: 0, background: "transparent", cursor: "pointer" }}>
              <span style={{ width: 56, height: 56, borderRadius: "50%", background: t.color, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}>
                {React.cloneElement(t.icon, { width: 26, height: 26, stroke: "#fff" })}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 내 공실 홍보현황 — 맨 앞 (2026-10-27 사장님): [+ 공실등록] 다음에 공실별 카드 */}
      <div style={{ marginTop: 36 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h2 style={sectionTitle}>내 공실 홍보현황</h2>
          {notice && (
            <span style={{ flex: 1, margin: "0 16px", fontSize: 13, fontWeight: 700, color: "#c92a2a" }}>
              {notice} <button onClick={() => setNotice("")} style={{ border: 0, background: "transparent", color: textSecondary, cursor: "pointer" }}>✕</button>
            </span>
          )}
          <button onClick={() => onMenuChange("gongsil")} style={{ border: 0, background: "transparent", color: textSecondary, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>모두 보기</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 18 }}>
          <button onClick={() => onMenuChange("gongsil")} title="새 공실 등록하기"
            style={{ minHeight: 250, borderRadius: 14, border: `2px dashed ${darkMode ? "#5c4033" : "#f3c9a8"}`, background: darkMode ? "#2b2320" : "#fff8f1", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <span style={{ width: 60, height: 60, borderRadius: "50%", background: "#e8590c", color: "#fff", fontSize: 34, fontWeight: 400, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(232,89,12,0.3)" }}>+</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: darkMode ? "#ffd8a8" : "#5c3b2e" }}>공실등록</span>
          </button>
          {vacancies === null ? <div style={{ ...empty, display: "flex", alignItems: "center", justifyContent: "center" }}>불러오는 중…</div>
            : shownVac.length === 0 ? (kw ? <div style={{ ...empty, display: "flex", alignItems: "center", justifyContent: "center" }}>찾는 공실이 없어요.</div> : null)
            : shownVac.slice(0, 11).map((v) => (
              <div key={v.id} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 14, overflow: "hidden" }}>
                <div style={{ aspectRatio: "16 / 9", background: darkMode ? "#2c2d31" : "#f1f3f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {v.thumb ? <img src={v.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <IconBuilding width={36} height={36} stroke={textSecondary} />}
                </div>
                <div style={{ padding: "12px 14px 14px" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.title}</div>
                  <div style={{ marginTop: 3, fontSize: 12, color: textSecondary }}>{[v.no && `#${v.no}`, v.price].filter(Boolean).join(" · ")}</div>
                  <PromoRows theme={theme} v={v} promo={promos[v.id]} onMake={(tab) => openStep(v.id, tab)} onSaved={loadPromos} />
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* 작업 계속하기 */}
      <div style={{ marginTop: 40 }}>
        <h2 style={sectionTitle}>작업 계속하기</h2>
        {cards === null ? <div style={empty}>불러오는 중…</div>
          : shownCards.length === 0 ? <div style={empty}>{kw ? "찾는 작업 파일이 없어요." : b ? "아직 만든 이미지·영상이 없어요. 위 [동영상]이나 [이미지]로 시작해 보세요." : "작업 파일은 공실스튜디오 앱에서 보여요."}</div>
          : (
            // 캔바처럼 한 줄 — 넘치면 옆으로 밀어 본다
            <div style={{ display: "flex", gap: 18, overflowX: "auto", paddingBottom: 6 }}>
              {shownCards.map((c) => (
                <button key={c.key} onClick={c.open} style={{ flex: "0 0 210px", textAlign: "left", border: 0, background: "transparent", cursor: "pointer", padding: 0 }}>
                  <div style={{ aspectRatio: "16 / 10", borderRadius: 12, background: darkMode ? "#2c2d31" : "#f1f3f5", border: `1px solid ${border}`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {c.thumb ? <img src={c.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : (c.kind === "video" ? <IconFilm width={34} height={34} stroke={textSecondary} /> : <IconImage width={34} height={34} stroke={textSecondary} />)}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                  <div style={{ marginTop: 2, fontSize: 12, color: textSecondary }}>{c.kind === "video" ? "동영상" : "이미지"} · {ago(c.at)} 편집함</div>
                </button>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

/* 공실 카드 안 홍보현황 — 채널 아이콘 한 줄 (2026-10-27 사장님: 글자 표는 촌스럽다)
   광고 중 = 원래 색 + 초록 ✓ · 글 써 둠 = 흐린 색 · 연결 전 = 회색
   아이콘을 누르면 아래에 [바로가기]·[링크 바꾸기] 또는 [만들기]·[링크 붙여넣기] */
type Slot = { id: string; label: string; bg: string; glyph: React.ReactNode; url?: string; state: "on" | "draft" | "off"; note?: string; tab?: string; channel?: PromoChannel };

const G: Record<string, React.ReactNode> = {
  listing: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /><path d="M10 20v-5h4v5" /></svg>,
  article: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="7" y1="9" x2="17" y2="9" /><line x1="7" y1="13" x2="17" y2="13" /><line x1="7" y1="17" x2="12" y2="17" /></svg>,
  blog: <span style={{ color: "#fff", fontWeight: 900, fontSize: 16, fontFamily: "Arial, sans-serif" }}>N</span>,
  instagram: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r="0.6" fill="#fff" /></svg>,
  threads: <span style={{ color: "#fff", fontWeight: 800, fontSize: 17, fontFamily: "Arial, sans-serif" }}>@</span>,
  facebook: <span style={{ color: "#fff", fontWeight: 900, fontSize: 18, fontFamily: "Arial, sans-serif", marginTop: 2 }}>f</span>,
  youtube: <svg viewBox="0 0 24 24" width="18" height="18"><path d="M9.5 8.2v7.6L16 12z" fill="#fff" /></svg>,
};
const BG: Record<string, string> = {
  listing: "#e8590c", article: "#0b7285", blog: "#03c75a", instagram: "linear-gradient(45deg,#f9a825,#e1306c 55%,#833ab4)",
  threads: "#111", facebook: "#1877f2", youtube: "#ff0000",
};

function PromoRows({ theme, v, promo, onMake, onSaved }: { theme: AdminSectionProps["theme"]; v: VacancyCard; promo?: VacancyPromo; onMake: (tab: string) => void; onSaved: () => Promise<unknown> | void }) {
  const { textPrimary, textSecondary, border, darkMode } = theme;
  const [open, setOpen] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const green = "#2f9e44";
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const art = promo?.article;

  const slots: Slot[] = [
    { id: "listing", label: "공실뉴스 매물", bg: BG.listing, glyph: G.listing, state: v.active ? "on" : "off", url: v.active ? `${origin}/gongsil/detail/${v.id}` : undefined, note: v.active ? undefined : "공개 전이에요" },
    { id: "article", label: "공실뉴스 기사", bg: BG.article, glyph: G.article, tab: "article",
      state: art && !art.pending ? "on" : art || v.done.article ? "draft" : "off",
      url: art && !art.pending ? `${origin}/news/${art.no}` : undefined, note: art?.pending ? "기사 검토 중이에요" : undefined },
    ...CHANNELS.map((c): Slot => {
      const url = promo?.links[c.id];
      return { id: c.id, label: c.label, bg: BG[c.id], glyph: G[c.id], url, tab: c.id, channel: c.id, state: url ? "on" : v.done[c.id] ? "draft" : "off" };
    }),
  ];
  const onCount = slots.filter((x) => x.state === "on").length;
  const cur = slots.find((x) => x.id === open) || null;

  const pick = (id: string) => {
    setErr("");
    setPasting(false);
    setOpen(open === id ? null : id);
  };
  const save = async (url: string) => {
    if (!cur?.channel) return;
    setBusy(true);
    setErr("");
    const r = await saveVacancyPromo(v.id, cur.channel, url);
    setBusy(false);
    if (!r.success) return setErr(r.error || "저장하지 못했어요.");
    setPasting(false);
    await onSaved();
  };

  const pill = (primary: boolean): React.CSSProperties => ({
    height: 30, padding: "0 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
    border: primary ? 0 : `1px solid ${border}`, background: primary ? textPrimary : "transparent", color: primary ? (darkMode ? "#111" : "#fff") : textPrimary,
  });

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

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {slots.map((x) => (
          <button key={x.id} onClick={() => pick(x.id)} title={`${x.label} · ${x.state === "on" ? "연결됨" : x.state === "draft" ? "글 써 둠" : "연결 전"}`}
            style={{ position: "relative", width: 32, height: 32, padding: 0, border: 0, borderRadius: 10, cursor: "pointer", background: x.bg,
              display: "flex", alignItems: "center", justifyContent: "center",
              filter: x.state === "off" ? "grayscale(1)" : "none", opacity: x.state === "on" ? 1 : x.state === "draft" ? 0.5 : 0.25,
              outline: open === x.id ? `2px solid ${textPrimary}` : "none", outlineOffset: 2, transition: "opacity .15s" }}>
            {x.glyph}
            {x.state === "on" && (
              <span style={{ position: "absolute", right: -4, bottom: -4, width: 15, height: 15, borderRadius: "50%", background: green, border: `2px solid ${darkMode ? "#25262b" : "#fff"}`, color: "#fff", fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</span>
            )}
          </button>
        ))}
      </div>

      {/* 누른 채널 — 바로가기 / 만들기 / 링크 붙여넣기 */}
      {cur && (
        <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10, background: darkMode ? "#1f2023" : "#f6f7f9" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: textPrimary }}>{cur.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: cur.state === "on" ? green : cur.state === "draft" ? "#e67700" : textSecondary }}>
              {cur.state === "on" ? "● 연결됨" : cur.note || (cur.state === "draft" ? "글 써 둠" : "연결 전")}
            </span>
          </div>
          {pasting ? (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="올린 글 주소 https://"
                  onKeyDown={(e) => { if (e.key === "Enter") void save(draft); if (e.key === "Escape") setPasting(false); }}
                  style={{ flex: 1, minWidth: 0, height: 30, padding: "0 10px", fontSize: 12.5, borderRadius: 999, border: `1px solid ${border}`, background: darkMode ? "#1a1b1e" : "#fff", color: textPrimary, outline: 0 }} />
                <button disabled={busy} onClick={() => void save(draft)} style={pill(true)}>{busy ? "…" : "저장"}</button>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button onClick={() => setPasting(false)} style={{ border: 0, background: "transparent", padding: 0, fontSize: 12, color: textSecondary, cursor: "pointer" }}>취소</button>
                {cur.url && <button disabled={busy} onClick={() => void save("")} style={{ border: 0, background: "transparent", padding: 0, fontSize: 12, color: "#c92a2a", cursor: "pointer" }}>연결 끊기</button>}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {cur.url && <button onClick={() => openOut(cur.url!)} style={pill(true)}>바로가기 ↗</button>}
              {!cur.url && cur.tab && <button onClick={() => onMake(cur.tab!)} style={pill(true)}>{cur.state === "draft" ? "열어서 발행하기" : "만들기"}</button>}
              {cur.channel && <button onClick={() => { setDraft(cur.url || ""); setPasting(true); }} style={pill(false)}>{cur.url ? "링크 바꾸기" : "링크 붙여넣기"}</button>}
            </div>
          )}
          {err && <div style={{ marginTop: 6, fontSize: 12, color: "#c92a2a" }}>{err}</div>}
        </div>
      )}
    </div>
  );
}
