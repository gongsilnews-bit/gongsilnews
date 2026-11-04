"use client";
/**
 * MY관심 — 지도 없이 넓게 (2026-11-04 사장님) · 카드는 왼쪽 목록과 똑같은 모양 (11-04: 크고 촌스럽다 → 목록에 보이는 대로)
 *  탭마다 [찜한 · 최근 본] + 폴더 (공실 폴더는 원래 것, 기사·부동산·단지 폴더는 bookmark_categories type ARTICLE·AGENCY·COMPLEX)
 *  카드를 누르면 목록은 왼쪽 한 줄로 줄고 오른쪽에 상세 — 공실 = 원래 상세 창(GongsilClient) · 기사 = 기사 창 · 부동산 = 사무소 창 · 단지 = 단지 창
 *  최근 본 기사·부동산·단지 = 이 기기(stars.getRecent). 부동산·단지 카드에는 1주일 안 새 소식. ★ = 찜 해제
 */
import { useEffect, useRef, useState } from "react";
import { CommentCount } from "./useCommentCounts";
import { getMyBoard, type BoardAgency, type BoardArticle, type BoardComplex } from "@/app/actions/mapStars";
import { agencyArticles, listMapAgencies, type MapAgency } from "@/app/actions/mapAgencies";
import SnsIconLink from "./SnsIconLink";
import { getBookmarkCategories } from "@/app/actions/bookmark";
import BookmarkCategoryModal from "@/components/BookmarkCategoryModal";
import { fullPrice, areaLabel } from "@/utils/aptMapShared";
import { formatAreaWithPy, getCleanAddrText, getPriceText } from "./gongsilHelpers";
import { getRecent, starSvg, useStars, type StarKind } from "./stars";
import NewsArticlePanel from "./NewsArticlePanel";
import AptDetailPanel, { type AptDetail } from "./AptDetailPanel";

type Tab = "vac" | "auc" | "art" | "ag" | "apt"; // auc = 찜한 경매·공매 (11-04 사장님: 경매는 따로)
type Side = { kind: "art"; id: string } | { kind: "ag"; item: BoardAgency } | { kind: "apt"; id: string } | null;
const KIND: Record<string, string> = { apt: "아파트", offi: "오피스텔", villa: "빌라" };
const FOLDER_TYPE: Record<"art" | "ag" | "apt", "ARTICLE" | "AGENCY" | "COMPLEX"> = { art: "ARTICLE", ag: "AGENCY", apt: "COMPLEX" };
const ORANGE = "#ff8e15", NAVY = "#1e3a6e", BLUE = "#1a73e8";
// outline: none — 누른 뒤 브라우저가 그리는 검은 테두리(포커스 선)를 지운다 (11-04 사장님: 클릭하면 왜 라인이 남을까)
const cardBox: React.CSSProperties = { position: "relative", display: "block", background: "#fff", border: "1px solid #eee", borderRadius: 6, padding: "16px 20px 16px 16px", color: "#111", textDecoration: "none", cursor: "pointer", outline: "none" };
// 상세가 팝업이라 뒤 목록 카드는 표시하지 않는다 (11-04 사장님: 고른 카드 테두리가 남아 보인다)
const picked: React.CSSProperties = {};
const sep = <span style={{ color: "#ddd", margin: "0 4px" }}>|</span>;
const chip = (on: boolean, fill = false): React.CSSProperties => ({ padding: "6px 12px", borderRadius: 8, border: `1px solid ${on ? BLUE : "#d1d5db"}`, background: on && fill ? BLUE : "#fff", color: on ? (fill ? "#fff" : BLUE) : "#4b5563", fontSize: 13, fontWeight: 700, cursor: "pointer" });
/** 누르면 — 목록은 그대로, 상세만 가운데 팝업 + 뒤 살짝 어둡게 (11-04 사장님). GongsilClient 의 공실 상세 팝업도 같은 높이 */
export const MY_POP: React.CSSProperties = { position: "absolute", top: 20, bottom: 20, left: "50%", borderRadius: 10, overflow: "hidden", boxShadow: "0 18px 50px rgba(0,0,0,.35)", background: "#fff" };
export const MY_DIM: React.CSSProperties = { position: "absolute", inset: 0, background: "rgba(17,24,39,.45)" };
const plain = (e: React.MouseEvent) => e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1; // 새 탭으로 열기는 그대로

export default function MyStarsBoard({ vacancies, allVacancies, wishTab, setWishTab, categories, selectedCategoryId, setSelectedCategoryId, onManageFolders, currentUser, userLevel, onLogin, detailId, onOpenVacancy, onCloseVacancy }: {
  vacancies: any[]; allVacancies: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  wishTab: "wish" | "recent"; setWishTab: (t: "wish" | "recent") => void;
  categories: { id: string; name: string }[]; selectedCategoryId: string | null | "ALL"; setSelectedCategoryId: (id: string | null | "ALL") => void;
  onManageFolders: () => void;
  currentUser: { id: string } | null; userLevel: number; onLogin: () => void;
  /** 열린 공실 상세 — 원래 공실 상세 창이 목록 오른쪽(380px 옆)에 뜬다 */
  detailId: string | number | null; onOpenVacancy: (prop: any) => void; onCloseVacancy: () => void; // eslint-disable-line @typescript-eslint/no-explicit-any
}) {
  const [tab, setTab] = useState<Tab>("vac");
  const [src, setSrc] = useState<"star" | "recent">("star"); // 기사·부동산·단지 — 찜한 / 최근 본
  const [board, setBoard] = useState<{ articles: BoardArticle[]; agencies: BoardAgency[]; complexes: BoardComplex[] } | null>(null);
  const [cats, setCats] = useState<Record<"art" | "ag" | "apt", { id: string; name: string }[]>>({ art: [], ag: [], apt: [] });
  const [catSel, setCatSel] = useState<Record<"art" | "ag" | "apt", string>>({ art: "ALL", ag: "ALL", apt: "ALL" });
  const [modal, setModal] = useState<{ kind: "art" | "ag" | "apt"; itemId: string | null } | null>(null);
  const [side, setSide] = useState<Side>(null);
  // 사무소 팝업에서 공실·기사를 열면 — ✕(닫기)가 뒤로가기처럼 사무소 팝업으로 돌아간다 (11-04 사장님)
  const [backTo, setBackTo] = useState<Side>(null);
  const closeSide = () => { if (backTo) { setSide(backTo); setBackTo(null); } else setSide(null); };
  const wasDetail = useRef(false);
  useEffect(() => {
    if (detailId != null) { wasDetail.current = true; return; }
    if (wasDetail.current && backTo) { setSide(backTo); setBackTo(null); } // 공실 상세를 닫으면 사무소로
    wasDetail.current = false;
  }, [detailId]); // eslint-disable-line react-hooks/exhaustive-deps
  const { isStar, toggleStar } = useStars();

  const load = () => { if (currentUser) getMyBoard().then((r) => setBoard(r)).catch(() => setBoard({ articles: [], agencies: [], complexes: [] })); };
  const loadCats = () => {
    if (!currentUser) return;
    (["art", "ag", "apt"] as const).forEach((k) => getBookmarkCategories(currentUser.id, FOLDER_TYPE[k]).then((r) => { if (r.success) setCats((c) => ({ ...c, [k]: (r.categories || []) as { id: string; name: string }[] })); }).catch(() => {}));
  };
  useEffect(() => { load(); loadCats(); }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setSide(null); setBackTo(null); }, [tab]);
  const openSide = (s: Side) => { onCloseVacancy(); if (s && (side?.kind === "ag" || side?.kind === "apt") && s.kind !== side.kind) setBackTo(side); setSide(s); };
  const narrow = false; // 목록은 늘 넓게 — 상세는 팝업

  const wrap: React.CSSProperties = { position: "absolute", inset: 0, zIndex: 3000, background: "#f5f6f8", overflow: "hidden" };
  if (!currentUser) return (
    <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 6, padding: "30px 40px", textAlign: "center", fontSize: 15, color: "#333" }}>
        로그인하면 찜한 공실·기사·부동산·단지를 한곳에서 봐요
        <div><button onClick={onLogin} style={{ marginTop: 14, height: 38, padding: "0 22px", border: 0, borderRadius: 5, background: NAVY, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>로그인</button></div>
      </div>
    </div>
  );

  // 보여 줄 목록 — 찜한(폴더로 거름) / 최근 본(이 기기)
  const pick = <T extends { categoryId?: string | null }>(k: "art" | "ag" | "apt", starred: T[], recentKey: "art" | "ag" | "apt") =>
    src === "recent" ? getRecent<T>(recentKey) : catSel[k] === "ALL" ? starred : starred.filter((x) => (x.categoryId || null) === (catSel[k] === "NONE" ? null : catSel[k]));
  const arts = pick("art", board?.articles || [], "art");
  const ags = pick("ag", board?.agencies || [], "ag");
  const cxs = pick("apt", board?.complexes || [], "apt");
  const isAuc = (p: { trade_type?: string }) => p.trade_type === "경매" || p.trade_type === "공매";
  const vacs = vacancies.filter((p) => !isAuc(p)), aucs = vacancies.filter(isAuc);
  const counts: Record<Tab, number> = { vac: vacs.length, auc: aucs.length, art: arts.length, ag: ags.length, apt: cxs.length };
  const label = (k: Tab, l: string) => (k === "vac" || k === "auc" ? (wishTab === "recent" ? `최근 본 ${l}` : `찜한 ${l}`) : src === "recent" ? `최근 본 ${l}` : `찜한 ${l}`);
  const TABS: [Tab, string][] = [["vac", "공실"], ["auc", "경매"], ["art", "기사"], ["ag", "부동산"], ["apt", "단지"]];

  const Star = ({ k, id, top = 8, right = 10 }: { k: StarKind; id: string; top?: number; right?: number }) => (
    <span role="button" title={isStar(k, id) ? "찜 해제" : "찜하기"} onClick={(e) => { e.preventDefault(); e.stopPropagation(); void toggleStar(k, id); }}
      style={{ position: "absolute", top, right, zIndex: 2, width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,.92)", boxShadow: "0 1px 4px rgba(0,0,0,.18)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
      dangerouslySetInnerHTML={{ __html: starSvg(isStar(k, id), 18) }} />
  );
  /** 카드 아래 [폴더] — 찜한 것만 (폴더로 옮기기) */
  const FolderBtn = ({ k, id }: { k: "art" | "ag" | "apt"; id: string }) => src === "star" ? (
    <span role="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setModal({ kind: k, itemId: id }); }}
      style={{ fontSize: 12, color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: 6, padding: "2px 8px", cursor: "pointer", background: "#fff" }}>폴더</span>
  ) : null;
  const fresh = (parts: [string, number][]) => {
    const on = parts.filter(([, n]) => n > 0);
    return on.length ? <div style={{ fontSize: 12, color: "#ef4444", fontWeight: 700, marginTop: 6 }}>{on.map(([l, n]) => `새 ${l} ${n}`).join(" · ")} <span style={{ color: "#aaa", fontWeight: 500 }}>(1주일)</span></div> : null;
  };
  const empty = (t: string) => <div style={{ gridColumn: "1 / -1", background: "#fff", border: "1px solid #eee", borderRadius: 6, padding: "60px 20px", textAlign: "center", color: "#888", fontSize: 14 }}>{t}</div>;

  /* ── 카드 (왼쪽 목록과 같은 모양) ── */
  const vacCard = (p: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const mine = currentUser && p.owner_id === currentUser.id;
    const auction = p.trade_type === "경매" || p.trade_type === "공매";
    const masked = p.exposure_type === "부동산노출" && (auction ? userLevel < 1 : userLevel < 2) && !mine; // 목록과 같은 가림 규칙
    const addr = getCleanAddrText(p) || "주소 없음";
    return (
      <a key={p.id} href={`/gongsil/detail/${p.id}`} onClick={(e) => { if (plain(e)) return; e.preventDefault(); if (side?.kind === "ag" || side?.kind === "apt") setBackTo(side); setSide(null); onOpenVacancy(p); }}
        style={{ ...cardBox, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", ...(String(detailId) === String(p.id) ? picked : {}) }}>
        <Star k="vac" id={String(p.id)} top={22} right={26} />
        <div style={{ flex: 1, paddingRight: p.images?.[0] ? 15 : 0, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            {userLevel >= 2 && (p.realtor_commission || p.commission_type) && <span style={{ fontSize: 11, color: "#d9363e", border: "1px solid #d9363e", padding: "1px 5px", borderRadius: 4, fontWeight: "bold" }}>{p.realtor_commission || p.commission_type}</span>}
            <span style={{ fontSize: 12, color: "#d9363e", fontWeight: "bold" }}>{p.vacancy_no}</span>
            {p.created_at && <span style={{ fontSize: 12, color: "#aaa" }}>{new Date(p.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\s/g, "")}</span>}
          </div>
          <div style={{ fontSize: 15, fontWeight: "bold", color: masked ? "#bbb" : "#111", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: masked ? 1 : 0 }}>{masked ? addr.replace(/[^\s]/g, "X") : addr}</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: BLUE, marginBottom: 4 }}>{getPriceText(p)}</div>
          <div style={{ fontSize: 13, color: "#555", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {p.property_type}{sep}{p.direction || "방향없음"}{sep}{p.exclusive_m2 ? formatAreaWithPy(p.exclusive_m2) : "면적미상"}
          </div>
          {!auction && <div style={{ fontSize: 12, color: "#666", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{[`룸 ${p.room_count || 0}개`, `욕실 ${p.bathroom_count || 0}개`, ...(p.options || [])].filter(Boolean).join(", ")}</div>}
        </div>
        {p.images?.[0] && <div style={{ flexShrink: 0, marginLeft: 5, width: 110, height: 110, borderRadius: 6, overflow: "hidden" }}><img src={p.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></div>}
        {p.themes?.length > 0 && (
          <div style={{ flexBasis: "100%", display: "flex", gap: 6, marginTop: 10, overflow: "hidden", whiteSpace: "nowrap" }}>
            {p.themes.slice(0, 4).map((t: string, i: number) => <span key={i} style={{ background: "#f8fafc", color: "#3b82f6", fontSize: 11, padding: "2px 8px", borderRadius: 12, fontWeight: 700, border: "1px solid #bfdbfe", flexShrink: 0 }}>{t.startsWith("#") ? t : `# ${t}`}</span>)}
            {p.themes.length > 4 && <span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 800 }}>...</span>}
          </div>
        )}
      </a>
    );
  };
  const artCard = (a: BoardArticle, folder = true) => {
    const on = side?.kind === "art" && side.id === String(a.id);
    return (
      <a key={a.id} href={`/news/${a.article_no || a.id}`} onClick={(e) => { if (plain(e)) return; e.preventDefault(); openSide(on ? null : { kind: "art", id: String(a.id) }); }}
        style={{ ...cardBox, padding: "18px 20px", ...(on ? picked : {}) }}>
        <Star k="art" id={String(a.id)} />
        <div style={{ fontSize: 11, color: ORANGE, fontWeight: "bold", marginBottom: 6, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", paddingRight: 34 }}>
          <span style={{ border: "1px solid #fdba74", background: "#fff7ed", borderRadius: 3, padding: "1px 6px" }}>{[a.section1, a.section2].filter(Boolean).join(" > ")}</span>
          {a.location_name && <span style={{ color: "#9ca3af", fontWeight: 600 }}>📍 {a.location_name}</span>}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#111", lineHeight: 1.4, letterSpacing: -0.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "keep-all" }}>{a.title}</div>
            {a.subtitle && <div style={{ fontSize: 12.5, color: "#666", marginTop: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{String(a.subtitle).split(/\r?\n/)[0]}</div>}
          </div>
          {a.thumbnail_url && <img src={a.thumbnail_url} alt="" style={{ width: 84, height: 64, objectFit: "cover", borderRadius: 6, flexShrink: 0, background: "#f3f4f6" }} />}
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 10, fontSize: 12 }}>
          <span style={{ color: "#a1a1aa" }}>{String(a.published_at || "").slice(0, 10).replace(/-/g, ". ")} · {a.author_name || "공실뉴스"}</span>
          <span style={{ marginLeft: "auto" }} />
          {folder && <FolderBtn k="art" id={String(a.id)} />}
          <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
            <span style={{ color: on ? "#d32f2f" : ORANGE, fontWeight: 700 }}>{on ? "기사닫기 ✕" : "기사 보러가기 >"}</span>
            <CommentCount id={a.id} />
          </span>
        </div>
      </a>
    );
  };
  const agCard = (a: BoardAgency) => {
    const on = side?.kind === "ag" && side.item.id === a.id;
    return (
      <a key={a.id} href={`/reporter/${a.ownerId}`} onClick={(e) => { if (plain(e)) return; e.preventDefault(); openSide(on ? null : { kind: "ag", item: a }); }}
        style={{ ...cardBox, display: "flex", gap: 12, alignItems: "center", padding: "16px 20px", ...(on ? picked : {}) }}>
        <Star k="ag" id={a.id} />
        {a.photo ? <img src={a.photo} alt="" style={{ width: 52, height: 52, borderRadius: 14, objectFit: "cover", border: "1.5px solid #e5e7eb", flexShrink: 0 }} />
          : <div style={{ width: 52, height: 52, borderRadius: 14, background: "#e8eef8", color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, flexShrink: 0 }}>{a.name.slice(0, 1)}</div>}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 34 }}>{a.name}</div>
          <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.address}</div>
          <div style={{ fontSize: 12.5, marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <b style={{ color: "#2563eb" }}>공실 {a.vacancies}</b><b style={{ color: ORANGE }}>기사 {a.articles}</b>
            {a.phone && <span style={{ color: "#374151" }}>{a.phone}</span>}
            <span style={{ marginLeft: "auto" }} />
            <FolderBtn k="ag" id={a.id} />
            <span style={{ color: on ? "#d32f2f" : NAVY, fontWeight: 800 }}>{on ? "닫기 ✕" : "상세보기 >"}</span>
          </div>
          {fresh([["공실", a.newVacancies], ["기사", a.newArticles]])}
        </div>
      </a>
    );
  };
  const aptCard = (c: BoardComplex) => {
    const color = c.kind === "offi" ? "#0f766e" : c.kind === "villa" ? "#be185d" : "#1a56db";
    const on = side?.kind === "apt" && side.id === c.id;
    return (
      <a key={c.id} href={`/gongsil?apt=${encodeURIComponent(c.id)}`} onClick={(e) => { if (plain(e)) return; e.preventDefault(); openSide(on ? null : { kind: "apt", id: c.id }); }} style={{ ...cardBox, ...(on ? picked : {}) }}>
        <Star k="apt" id={c.id} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, paddingRight: 34 }}>
          <span style={{ fontSize: 11, color, border: `1px solid ${color}`, padding: "1px 5px", borderRadius: 4, fontWeight: "bold" }}>{KIND[c.kind] || "아파트"}</span>
          <span style={{ fontSize: 12, color: "#aaa" }}>{c.place}</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: "bold", color: "#111", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 34 }}>{c.name}</div>
        {c.repPrice && c.repArea
          ? <><div style={{ fontSize: 16, fontWeight: 800, color, marginBottom: 4 }}>매매 {fullPrice(c.repPrice)}</div>
              <div style={{ fontSize: 13, color: "#555" }}>최근 실거래{sep}{areaLabel(c.repArea)}{c.repDate ? <>{sep}{c.repDate.replace(/-/g, ".")}</> : null}{sep}3년 {c.tradeCount}건</div></>
          : <div style={{ fontSize: 13, color: "#555" }}>최근 3년 매매 없음</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1 }}>{fresh([["실거래", c.newTrades], ["공실", c.newVacancies], ["기사", c.newArticles]])}</div>
          <div style={{ marginTop: 6 }}><FolderBtn k="apt" id={c.id} /></div>
        </div>
      </a>
    );
  };

  return (
    <div style={wrap} className="gsmy-board">
      {/* 누른 카드에 남는 검은 테두리(포커스 선) 지우기 — 전체 CSS 의 a:focus 보다 세게 (11-04 사장님) */}
      <style>{".gsmy-board a,.gsmy-board a:focus,.gsmy-board a:focus-visible,.gsmy-board a:active{outline:none!important;box-shadow:none}"}</style>
      {/* 목록 — 상세가 열리면 왼쪽 380px 한 줄 */}
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "100%", overflowY: "auto", borderRight: narrow ? "1px solid #e5e7eb" : undefined, background: "#f5f6f8" }}>
        <div style={narrow ? { padding: "14px 10px 60px" } : { maxWidth: 1240, margin: "0 auto", padding: "20px 24px 60px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: "#fff", border: "1px solid #eee", borderRadius: 6, padding: "12px 16px", fontSize: narrow ? 14 : 15, fontWeight: 800, color: "#111" }}>
            {TABS.map(([k, l], i) => (
              <span key={k} style={{ display: "inline-flex", alignItems: "center" }}>
                {i > 0 && <span style={{ color: "#d1d5db", margin: "0 10px 0 0" }}>|</span>}
                <button type="button" onClick={() => setTab(k)} style={{ border: "none", background: "none", padding: 0, font: "inherit", cursor: "pointer", color: tab === k ? "#111" : "#9ca3af" }}>
                  {tab === k ? label(k, l) : l} <span style={{ color: tab === k ? (k === "art" ? ORANGE : k === "ag" ? NAVY : k === "auc" ? "#dc2626" : BLUE) : "#9ca3af" }}>{counts[k]}</span>개
                </button>
              </span>
            ))}
            {!narrow && <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 500, color: "#999" }}>찜한 부동산·단지에 새 소식이 오면 🔔 알림으로 알려 드려요</span>}
          </div>

          {/* 찜한 / 최근 본 + 폴더 */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", margin: "12px 0 0" }}>
            {tab === "vac" || tab === "auc" ? <>
              {(["wish", "recent"] as const).map((t) => <button key={t} onClick={() => setWishTab(t)} style={chip(wishTab === t, true)}>{t === "wish" ? "찜한" : "최근 본"} {tab === "auc" ? "경매" : "공실"}</button>)}
              {wishTab === "wish" && <>
                <span style={{ width: 1, height: 16, background: "#e5e7eb", margin: "0 6px" }} />
                {[{ id: "ALL", name: "전체" }, ...categories].map((c) => <button key={c.id} onClick={() => setSelectedCategoryId(c.id as string)} style={chip(selectedCategoryId === c.id)}>{c.name}</button>)}
                <button onClick={onManageFolders} style={chip(false)}>폴더관리</button>
              </>}
            </> : <>
              {(["star", "recent"] as const).map((t) => <button key={t} onClick={() => setSrc(t)} style={chip(src === t, true)}>{t === "star" ? "찜한" : "최근 본"} {tab === "art" ? "기사" : tab === "ag" ? "부동산" : "단지"}</button>)}
              {src === "star" && <>
                <span style={{ width: 1, height: 16, background: "#e5e7eb", margin: "0 6px" }} />
                {[{ id: "ALL", name: "전체" }, ...cats[tab]].map((c) => <button key={c.id} onClick={() => setCatSel((s) => ({ ...s, [tab]: c.id }))} style={chip(catSel[tab] === c.id)}>{c.name}</button>)}
                <button onClick={() => setModal({ kind: tab, itemId: null })} style={chip(false)}>폴더관리</button>
              </>}
            </>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "repeat(auto-fill, minmax(360px, 1fr))", gap: 10, marginTop: 12 }}>
            {!board && tab !== "vac" && tab !== "auc" && src === "star" && empty("불러오는 중…")}
            {tab === "vac" && (vacs.length ? vacs.map(vacCard) : empty(wishTab === "wish" ? "찜한 공실이 없어요. 공실 카드의 ☆을 눌러 찜해 보세요." : "최근 본 공실이 없어요."))}
            {tab === "auc" && (aucs.length ? aucs.map(vacCard) : empty(wishTab === "wish" ? "찜한 경매가 없어요. 경매/공매 카드의 ☆을 눌러 찜해 보세요." : "최근 본 경매가 없어요."))}
            {tab === "art" && (board || src === "recent") && (arts.length ? arts.map((a) => artCard(a)) : empty(src === "recent" ? "최근 본 기사가 없어요." : "찜한 기사가 없어요. 기사 옆 ☆을 눌러 찜해 보세요."))}
            {tab === "ag" && (board || src === "recent") && (ags.length ? ags.map(agCard) : empty(src === "recent" ? "최근 본 부동산이 없어요." : "찜한 부동산이 없어요. 지도의 [부동산]에서 ☆을 눌러 찜해 보세요."))}
            {tab === "apt" && (board || src === "recent") && (cxs.length ? cxs.map(aptCard) : empty(src === "recent" ? "최근 본 단지가 없어요." : "찜한 단지가 없어요. 단지 창 위쪽 ☆을 눌러 찜해 보세요."))}
          </div>
        </div>
      </div>

      {/* 오른쪽 상세 — 기사 창 · 사무소 창 · 단지 창 (공실은 원래 공실 상세 창이 같은 자리에) */}
      {side && (
        <div style={{ position: "absolute", inset: 0, zIndex: 5 }}>
          <div style={MY_DIM} onClick={closeSide} />
          <div style={{ ...MY_POP, width: side.kind === "apt" ? 420 : side.kind === "art" ? 760 : 600, maxWidth: "calc(100% - 40px)", transform: "translateX(-50%)" }}>
          {side.kind === "art" && <NewsArticlePanel id={side.id} onClose={closeSide} />}
          {side.kind === "ag" && <AgencySide a={side.item} vacancies={allVacancies} vacCard={vacCard} artCard={(x) => artCard(x, false)} onClose={() => setSide(null)} />}
          {side.kind === "apt" && <ComplexSide id={side.id} onClose={() => setSide(null)} vacancies={allVacancies} vacCard={vacCard} artCard={(x) => artCard(x, false)} />}
          </div>
        </div>
      )}

      {modal && (
        <BookmarkCategoryModal isOpen onClose={() => { setModal(null); load(); loadCats(); }} userId={currentUser.id} itemId={modal.itemId} type={FOLDER_TYPE[modal.kind]} onSuccess={() => { load(); }} />
      )}
    </div>
  );
}

/** 사무소 창이 다시 열릴 때 — 보던 탭과 스크롤 자리 그대로 (공실·기사를 열었다 닫으면 돌아오는 곳, 11-04 사장님) */
const agencyMemo = new Map<string, { t: "vac" | "art"; top: number }>();

/** 사무소 창 — 사무소 카드 + 그 사무소 공실 전부 · 기사 전부 (왼쪽 목록 사무소 화면과 같은 내용) */
function AgencySide({ a, vacancies, vacCard, artCard, onClose }: { a: BoardAgency; vacancies: any[]; vacCard: (p: any) => React.ReactNode; artCard: (x: BoardArticle) => React.ReactNode; onClose: () => void }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const memo = agencyMemo.get(a.id);
  const [t, setTState] = useState<"vac" | "art">(memo?.t || "vac");
  const scroller = useRef<HTMLDivElement>(null);
  const setT = (v: "vac" | "art") => { setTState(v); agencyMemo.set(a.id, { t: v, top: 0 }); if (scroller.current) scroller.current.scrollTop = 0; };
  const [arts, setArts] = useState<BoardArticle[] | null>(null);
  const [full, setFull] = useState<MapAgency | null>(null);
  const [introOpen, setIntroOpen] = useState(false);
  useEffect(() => { setFull(null); listMapAgencies(null, a.id).then((l) => setFull(l[0] || null)).catch(() => {}); }, [a.id]);
  useEffect(() => { setArts(null); agencyArticles(a.ownerId).then((l) => setArts(l as unknown as BoardArticle[])).catch(() => setArts([])); }, [a.ownerId]);
  const vs = vacancies.filter((v) => v.owner_id === a.ownerId);
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !memo?.top || !scroller.current) return;
    if (t === "art" && !arts) return; // 기사는 다 불러온 뒤에
    requestAnimationFrame(() => { if (scroller.current) scroller.current.scrollTop = memo.top; });
    restored.current = true;
  }, [arts, t]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div ref={scroller} onScroll={(e) => agencyMemo.set(a.id, { t, top: (e.currentTarget as HTMLDivElement).scrollTop })}
      style={{ position: "absolute", inset: 0, background: "#fff", overflowY: "auto", overflowX: "hidden" }}>
      <button onClick={onClose} title="닫기" style={{ position: "absolute", top: 12, right: 14, border: "none", background: "none", fontSize: 26, color: "#999", cursor: "pointer", lineHeight: 1 }}>✕</button>
      {/* 사무소 카드 — 지도 왼쪽 사무소 화면과 같은 내용 (대표·등록번호·주소·연락처·SNS·소개말, 11-04 사장님) */}
      <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid #eee" }}>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 14px 12px", boxShadow: "0 4px 14px -4px rgba(0,0,0,.06)", marginRight: 30 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {a.photo ? <img src={a.photo} alt="" style={{ width: 52, height: 52, borderRadius: 14, objectFit: "cover", border: "1.5px solid #e5e7eb", flexShrink: 0 }} />
              : <div style={{ width: 52, height: 52, borderRadius: 14, background: "#e8eef8", color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, flexShrink: 0 }}>{a.name.slice(0, 1)}</div>}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#111" }}>{a.name}</div>
              {full && (full.ceo || full.regNum) && <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 2 }}>{[full.ceo && `대표 ${full.ceo}`, full.regNum && `등록번호 ${full.regNum}`].filter(Boolean).join("  |  ")}</div>}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "52px 1fr", rowGap: 6, marginTop: 12, fontSize: 13 }}>
            {a.address && <><span style={{ color: "#6b7280" }}>주소</span><span style={{ color: "#111" }}>{a.address}</span></>}
            {(full?.phone || full?.cell || a.phone) && <><span style={{ color: "#6b7280" }}>연락처</span><span style={{ color: "#2563eb", fontWeight: 800 }}>{full ? [full.phone, full.cell].filter(Boolean).join(", ") : a.phone}</span></>}
          </div>
          {full && full.sns.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>{full.sns.map((x) => <SnsIconLink key={x.key} kind={x.key} url={x.url} />)}</div>}
          {full?.intro && (
            <div style={{ marginTop: 10, background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 8, padding: "9px 11px", fontSize: 12.5, color: "#374151", lineHeight: 1.6 }}>
              <div style={{ fontWeight: 800, fontSize: 12, color: "#6b7280", marginBottom: 3 }}>소개말</div>
              <div style={introOpen ? undefined : { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{full.intro}</div>
              {full.intro.length > 60 && <button onClick={() => setIntroOpen((v) => !v)} style={{ border: "none", background: "none", padding: 0, marginTop: 3, fontSize: 12, color: NAVY, fontWeight: 700, cursor: "pointer" }}>{introOpen ? "접기" : "더보기"}</button>}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
          {([["vac", "공실", vs.length, "#2563eb"], ["art", "기사", arts ? arts.length : a.articles, ORANGE]] as const).map(([k, l, n, c]) => (
            <button key={k} onClick={() => setT(k)} style={{ flex: 1, height: 36, borderRadius: 8, border: `1.5px solid ${t === k ? c : "#e5e7eb"}`, background: t === k ? c : "#fff", color: t === k ? "#fff" : "#374151", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>{l} {n}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: 12, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 10 }}>
        {t === "vac" && (vs.length ? vs.map(vacCard) : <div style={{ padding: 40, textAlign: "center", color: "#888" }}>공실이 없어요</div>)}
        {t === "art" && (!arts ? <div style={{ padding: 40, textAlign: "center", color: "#888" }}>불러오는 중…</div> : arts.length ? arts.map(artCard) : <div style={{ padding: 40, textAlign: "center", color: "#888" }}>기사가 없어요</div>)}
      </div>
    </div>
  );
}

/** 단지 창이 다시 열릴 때 — 보던 목록(공실·뉴스)과 스크롤 자리 그대로 */
const complexMemo = new Map<string, { view: "vac" | "news"; top: number }>();

/** 단지 창 — 공실열람의 단지 창 그대로 · 아래 [공실 N]·[뉴스 N] 을 누르면 팝업 안에 그 목록 (11-04 사장님) */
function ComplexSide({ id, onClose, vacancies, vacCard, artCard }: { id: string; onClose: () => void; vacancies: any[]; vacCard: (p: any) => React.ReactNode; artCard: (x: BoardArticle) => React.ReactNode }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const box = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState<AptDetail | null>(null);
  const [rect, setRect] = useState<{ left: number; top: number; height: number } | null>(null);
  const memo = complexMemo.get(id);
  const [view, setViewState] = useState<"panel" | "vac" | "news">(memo?.view || "panel");
  const setView = (v: "panel" | "vac" | "news") => { setViewState(v); if (v === "panel") complexMemo.delete(id); else complexMemo.set(id, { view: v, top: 0 }); };
  useEffect(() => {
    setDetail(null);
    fetch(`/api/apt-prices?id=${encodeURIComponent(id)}`).then((r) => r.json()).then((r) => { if (r?.success) setDetail(r.complex); }).catch(() => {});
  }, [id]);
  useEffect(() => {
    // 팝업 틀이 transform 으로 가운데라, 안쪽의 fixed 는 틀 기준 — 틀 왼쪽 위(0,0)에 붙인다
    const m = () => { const r = box.current?.getBoundingClientRect(); if (r) setRect({ left: 0, top: 0, height: r.height }); };
    m(); window.addEventListener("resize", m);
    return () => window.removeEventListener("resize", m);
  }, []);
  useEffect(() => { if (view !== "panel" && memo?.top && scroller.current) requestAnimationFrame(() => { if (scroller.current) scroller.current.scrollTop = memo.top; }); }, [view, detail]); // eslint-disable-line react-hooks/exhaustive-deps
  const vs = detail ? vacancies.filter((v) => (detail.vacancy_ids || []).map(String).includes(String(v.id))) : [];
  const news = (detail?.news || []) as unknown as BoardArticle[];
  return (
    <div ref={box} style={{ position: "absolute", inset: 0, background: "#fff" }}>
      {!detail && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>단지 정보를 불러오는 중…</div>}
      {detail && rect && view === "panel" && (
        <AptDetailPanel detail={detail} onClose={onClose} side={rect} vacancyCount={vs.length}
          onShowVacancies={() => setView("vac")} onShowNews={() => setView("news")} />
      )}
      {detail && view !== "panel" && (
        <div ref={scroller} onScroll={(e) => complexMemo.set(id, { view: view as "vac" | "news", top: (e.currentTarget as HTMLDivElement).scrollTop })}
          style={{ position: "absolute", inset: 0, overflowY: "auto", overflowX: "hidden" }}>
          <div style={{ position: "sticky", top: 0, zIndex: 3, display: "flex", alignItems: "center", gap: 6, padding: "14px 14px", background: "#fff", borderBottom: "1px solid #eee", fontSize: 15, fontWeight: 800, color: "#111" }}>
            <button onClick={() => setView("panel")} title="단지 정보로" style={{ border: "none", background: "none", fontSize: 22, lineHeight: 1, cursor: "pointer", color: "#333", padding: "0 4px 0 0" }}>‹</button>
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detail.name} · {view === "vac" ? `공실 ${vs.length}` : `뉴스 ${news.length}`}</span>
            {/* ✕ 도 뒤로가기처럼 단지 정보로 (11-04 사장님) — 팝업을 닫으려면 단지 화면의 ✕ */}
            <button onClick={() => setView("panel")} title="단지 정보로" style={{ border: "none", background: "none", fontSize: 20, lineHeight: 1, color: "#999", cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ padding: 12, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 10 }}>
            {view === "vac" && (vs.length ? vs.map(vacCard) : <div style={{ padding: 40, textAlign: "center", color: "#888" }}>이 단지 공실이 없어요</div>)}
            {view === "news" && (news.length ? news.map(artCard) : <div style={{ padding: 40, textAlign: "center", color: "#888" }}>이 단지 뉴스가 없어요</div>)}
          </div>
        </div>
      )}
    </div>
  );
}
