import { agencyArticles, type MapAgency } from "@/app/actions/mapAgencies";
import SnsIconLink from "./SnsIconLink";
import { addRecent, starSvg, useStars, type StarKind } from "./stars";
import React, { useEffect, useState, useMemo } from "react";
import { useMapFields } from "@/utils/useMapFields";
import { getCleanAddrText, getPriceText, getAuctionInfo, formatAmount, formatAreaWithPy } from "./gongsilHelpers";

type AuctionSortKey = "latest" | "appraisal" | "bid" | "bidDate";

interface GongsilSidebarProps {
  activeCategory: string;
  wishTab: "wish" | "recent";
  setWishTab: React.Dispatch<React.SetStateAction<"wish" | "recent">>;
  displayVacancies: any[];
  categories: any[];
  selectedCategoryId: string | null;
  setSelectedCategoryId: React.Dispatch<React.SetStateAction<string | null>>;
  zoomLevel: number;
  isAuctionMode: boolean;
  selectedClusterIds: string[] | null;
  visibleCount: number;
  setVisibleCount: React.Dispatch<React.SetStateAction<number>>;
  activeProperty: string | number | null;
  setActiveProperty: React.Dispatch<React.SetStateAction<string | number | null>>;
  showDetail: boolean;
  setShowDetail: React.Dispatch<React.SetStateAction<boolean>>;
  setPrevPropertyId: React.Dispatch<React.SetStateAction<string | number | null>>;
  setActiveDetailTab: React.Dispatch<React.SetStateAction<any>>;
  setGalleryIndex: React.Dispatch<React.SetStateAction<number>>;
  showArticleOnMap: (prop: any) => void;
  currentUser: any;
  userLevel: number;
  setIsAuthModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedVacancyId: React.Dispatch<React.SetStateAction<any>>;
  setShowCategoryModal: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function GongsilSidebar({
  activeCategory,
  wishTab,
  setWishTab,
  displayVacancies,
  categories,
  selectedCategoryId,
  setSelectedCategoryId,
  zoomLevel,
  isAuctionMode,
  selectedClusterIds,
  visibleCount,
  setVisibleCount,
  activeProperty,
  setActiveProperty,
  showDetail,
  setShowDetail,
  setPrevPropertyId,
  setActiveDetailTab,
  setGalleryIndex,
  showArticleOnMap,
  currentUser,
  userLevel,
  setIsAuthModalOpen,
  setSelectedVacancyId,
  setShowCategoryModal,
}: GongsilSidebarProps) {
  const [auctionSort, setAuctionSort] = useState<AuctionSortKey>("latest");
  // 단지 창에서 [이 단지 공실 보기]로 온 목록 — 제목 앞 [‹] = 뒤로가기 = 보던 단지 정보 (AptPriceLayer, 2026-11-03 사장님)
  const [fromApt, setFromApt] = useState(false);
  useEffect(() => {
    const on = (e: Event) => setFromApt(Boolean((e as CustomEvent).detail));
    window.addEventListener("gongsil-apt-list", on);
    return () => window.removeEventListener("gongsil-apt-list", on);
  }, []);
  useMapFields("pc-gongsil-sort", { auctionSort }, { auctionSort: setAuctionSort });
  // [우리동네뉴스]를 켜면 — 공실 수 옆에 주황 "뉴스 N개", 누르면 지도 위 뉴스 목록 (2026-11-04 사장님). 뉴스 목록은 NewsLayer 가 알려 준다
  type News = { id: string; title: string; subtitle?: string | null; section1?: string | null; section2?: string | null; location_name?: string | null; published_at?: string | null; created_at?: string | null; author_name?: string | null; thumbnail_url?: string | null };
  const [news, setNews] = useState<News[] | null>(null);
  const [newsMode, setNewsMode] = useState(false);
  const [newsPicked, setNewsPicked] = useState<News[] | null>(null); // 지도에서 누른 뉴스 동그라미의 기사들
  useEffect(() => {
    const on = (e: Event) => {
      const l = (e as CustomEvent).detail as News[] | null;
      setNewsPicked(l);
      if (l) {
        setNewsMode(true); setAgListMode(false);
        setAgency((a) => { if (a) { window.dispatchEvent(new CustomEvent("gs-agency-open", { detail: null })); window.dispatchEvent(new CustomEvent("gs-agency-close")); } return null; });
      }
    };
    window.addEventListener("gs-news-select", on);
    return () => window.removeEventListener("gs-news-select", on);
  }, []);
  useEffect(() => {
    const on = (e: Event) => { const l = (e as CustomEvent).detail as News[] | null; setNews(l); if (!l) setNewsMode(false); };
    window.addEventListener("gs-news-visible", on);
    return () => window.removeEventListener("gs-news-visible", on);
  }, []);
  const openNews = (id: string) => window.dispatchEvent(new CustomEvent("gs-news-open", { detail: id }));
  // 지도 [부동산]에서 고른 사무소 — 맨 위 사무소 카드 + [공실 N] [기사 N] (공실은 GongsilClient 가 그 사무소 것 전부로 거른다, 2026-11-04 사장님)
  const { isStar, toggleStar } = useStars();
  /** 카드 오른쪽 위 ★ — 누르면 노란색 (카드 누르기와 따로) */
  const Star = ({ k, id, style }: { k: StarKind; id: string; style?: React.CSSProperties }) => (
    <span role="button" title={isStar(k, id) ? "찜 해제" : "찜하기"} onClick={(e) => { e.stopPropagation(); void toggleStar(k, id); }}
      style={{ position: "absolute", top: 8, right: 10, zIndex: 2, width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,.92)", boxShadow: "0 1px 4px rgba(0,0,0,.18)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", ...style }}
      dangerouslySetInnerHTML={{ __html: starSvg(isStar(k, id), 18) }} />
  );
  const [agency, setAgency] = useState<MapAgency | null>(null);
  const [agList, setAgList] = useState<MapAgency[] | null>(null); // 지도 화면 안 부동산 ([부동산]을 켰을 때만)
  const [agListMode, setAgListMode] = useState(false);
  const [agPicked, setAgPicked] = useState<MapAgency[] | null>(null); // 한 자리 여러 사무소 묶음을 누르면
  useEffect(() => {
    const on = (e: Event) => {
      const l = (e as CustomEvent).detail as MapAgency[] | null;
      setAgPicked(l);
      if (l) { setAgListMode(true); setNewsMode(false); }
    };
    window.addEventListener("gs-agency-group", on);
    return () => window.removeEventListener("gs-agency-group", on);
  }, []);
  useEffect(() => {
    const on = (e: Event) => { const l = (e as CustomEvent).detail as MapAgency[] | null; setAgList(l); if (!l) setAgListMode(false); };
    window.addEventListener("gs-agency-visible", on);
    return () => window.removeEventListener("gs-agency-visible", on);
  }, []);
  const [agencyTab, setAgencyTab] = useState<"vac" | "art">("vac");
  const [agencyArts, setAgencyArts] = useState<News[] | null>(null);
  const [introOpen, setIntroOpen] = useState(false);
  useEffect(() => {
    const on = (e: Event) => {
      const a = (e as CustomEvent).detail as MapAgency | null;
      setAgency(a); setAgencyTab("vac"); setAgencyArts(null); setIntroOpen(false); setNewsMode(false); if (a) setNewsPicked(null);
      if (!a) setAgListMode(true); // 사무소를 닫으면(또 누르기 · ‹ · ✕) 지도 화면의 부동산 목록으로 (11-04 사장님)
      if (a) agencyArticles(a.ownerId).then((l) => setAgencyArts(l as News[])).catch(() => setAgencyArts([]));
      if (a) addRecent("ag", { id: a.id, ownerId: a.ownerId, name: a.name, address: a.address, phone: a.phone, photo: a.photo, vacancies: a.vacancies, articles: a.articles, newVacancies: 0, newArticles: 0 }); // MY관심 [최근 본 부동산]
    };
    window.addEventListener("gs-agency-open", on);
    return () => window.removeEventListener("gs-agency-open", on);
  }, []);
  const closeAgency = () => {
    setAgency(null);
    window.dispatchEvent(new CustomEvent("gs-agency-open", { detail: null }));
    window.dispatchEvent(new CustomEvent("gs-agency-close"));
  };
  // 다른 데서 공실 선택이 풀리면(지도 빈 곳 누르기 등) 사무소 보기도 닫는다
  useEffect(() => { if (agency && selectedClusterIds === null) { setAgency(null); if (agList) setAgListMode(true); window.dispatchEvent(new CustomEvent("gs-agency-close")); } }, [selectedClusterIds]); // eslint-disable-line react-hooks/exhaustive-deps
  const showArts = Boolean(agency && agencyTab === "art");
  // 지도를 움직이면 — 고른 뉴스·사무소를 풀고 지금 화면의 뉴스·부동산 목록으로 (보던 종류 그대로)
  useEffect(() => {
    const on = () => {
      setNewsPicked(null); setAgPicked(null);
      if (agency) { setAgency(null); setAgListMode(true); window.dispatchEvent(new CustomEvent("gs-agency-close")); }
    };
    window.addEventListener("gs-map-moved", on);
    return () => window.removeEventListener("gs-map-moved", on);
  }, [agency]);
  // 지도에서 공실 표시를 누르면 — 뉴스·부동산 목록을 보고 있었어도 공실 목록으로
  useEffect(() => {
    const on = () => { setNewsMode(false); setAgListMode(false); setNewsPicked(null); setAgPicked(null); if (agency) { setAgency(null); window.dispatchEvent(new CustomEvent("gs-agency-close")); } };
    window.addEventListener("gs-vacancy-pick", on);
    return () => window.removeEventListener("gs-vacancy-pick", on);
  }, [agency]);
  const [newsReading, setNewsReading] = useState<string | null>(null); // 열린 기사 — 카드에 빨간 [기사닫기 ✕]
  useEffect(() => {
    const on = (e: Event) => setNewsReading(((e as CustomEvent).detail as string | null) || null);
    window.addEventListener("gs-news-reading", on);
    return () => window.removeEventListener("gs-news-reading", on);
  }, []);

  const sortedVacancies = useMemo(() => {
    if (!isAuctionMode) return displayVacancies;
    const arr = [...displayVacancies];
    switch (auctionSort) {
      case "latest":
        return arr.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      case "appraisal": {
        const getAppr = (v: any) => {
          const m = v.metadata || {};
          return m.appraisal_price || parseInt(m.apslEvlAmt || "0", 10) || v.deposit * 10000 || 0;
        };
        return arr.sort((a, b) => getAppr(a) - getAppr(b));
      }
      case "bid": {
        const getBid = (v: any) => {
          const m = v.metadata || {};
          return m.lowest_bid_price || parseInt(m.lowstBidPrcIndctCont || "0", 10) || 0;
        };
        return arr.sort((a, b) => getBid(a) - getBid(b));
      }
      case "bidDate": {
        const getBidDate = (v: any) => {
          const m = v.metadata || {};
          return m.pbctBegnDtm || m.pblctBgnDtm || m.bid_start_date || "";
        };
        return arr.sort((a, b) => {
          const da = getBidDate(a);
          const db = getBidDate(b);
          if (!da && !db) return 0;
          if (!da) return 1;
          if (!db) return -1;
          return db.localeCompare(da);
        });
      }
      default:
        return arr;
    }
  }, [displayVacancies, auctionSort, isAuctionMode]);
  return (
    <aside
      data-gongsil-side // 단지 실거래가 창이 이 자리에 붙는다 (AptPriceLayer)
      style={{
        width: 380,
        minWidth: 380,
        height: "100%",
        background: "#fff",
        borderRight: "1px solid #eee",
        display: "flex",
        flexDirection: "column",
        zIndex: 20,
      }}
    >
      {activeCategory === "wish" ? (
        <>
          <div style={{ display: "flex", width: "100%" }}>
            {["찜한물건", "최근본물건"].map((tab) => {
              const isTabActive =
                (tab === "찜한물건" && wishTab === "wish") ||
                (tab === "최근본물건" && wishTab === "recent");
              return (
                <div
                  key={tab}
                  onClick={() => setWishTab(tab === "찜한물건" ? "wish" : "recent")}
                  style={{
                    flex: 1,
                    padding: "14px 0",
                    textAlign: "center",
                    borderTop: "1px solid transparent",
                    borderBottom: isTabActive ? "none" : "1px solid #e0e0e0",
                    background: isTabActive ? "#1a73e8" : "#f5f5f5",
                    fontSize: 14,
                    cursor: "pointer",
                    color: isTabActive ? "#fff" : "#666",
                    fontWeight: isTabActive ? "bold" : "normal",
                  }}
                >
                  {tab}
                </div>
              );
            })}
          </div>
          <div
            style={{
              padding: "12px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid #f5f5f5",
            }}
          >
            <div style={{ display: "flex", gap: 10, fontSize: 12, color: "#999" }}>
              <span style={{ color: "#1a73e8", fontWeight: "bold", cursor: "pointer" }}>가나다순</span>
              <span style={{ cursor: "pointer" }}>최근접수순</span>
            </div>
          </div>

          {wishTab === "wish" && (
            <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 16px 0" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#333" }}>관심 폴더</span>
                <button
                  onClick={() => {
                    if (!currentUser) { setIsAuthModalOpen(true); return; }
                    setSelectedVacancyId(null);
                    setShowCategoryModal(true);
                  }}
                  style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#4b5563', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer' }}
                >폴더관리</button>
              </div>
            <div
              style={{
                display: "flex",
                overflowX: "auto",
                background: "#fff",
                padding: "10px 16px",
                gap: "8px",
                WebkitOverflowScrolling: "touch",
              }}
              className="no-scrollbar"
            >
              <button
                onClick={() => setSelectedCategoryId("ALL")}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: selectedCategoryId === "ALL" ? 700 : 500,
                  background: selectedCategoryId === "ALL" ? "#1e56a0" : "#f3f4f6",
                  color: selectedCategoryId === "ALL" ? "#fff" : "#4b5563",
                  border: "none",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                전체
              </button>
              <button
                onClick={() => setSelectedCategoryId(null)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: selectedCategoryId === null ? 700 : 500,
                  background: selectedCategoryId === null ? "#1e56a0" : "#f3f4f6",
                  color: selectedCategoryId === null ? "#fff" : "#4b5563",
                  border: "none",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                기본 폴더
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    fontSize: "13px",
                    fontWeight: selectedCategoryId === cat.id ? 700 : 500,
                    background: selectedCategoryId === cat.id ? "#1e56a0" : "#f3f4f6",
                    color: selectedCategoryId === cat.id ? "#fff" : "#4b5563",
                    border: "none",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  flexShrink: 0,
                  }}
                >
                  {cat.name}
                </button>
              ))}

            </div>
            </div>
          )}

          <div style={{ padding: "15px 20px 5px", fontWeight: "bold", fontSize: 14, color: "#111" }}>
            현재 화면 {displayVacancies.length}개
          </div>
        </>
      ) : agency ? (
        <div style={{ flexShrink: 0, borderBottom: "1px solid #eee", background: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 14px 10px", fontSize: 15, fontWeight: 800, color: "#111" }}>
            <button onClick={closeAgency} title="목록으로" aria-label="목록으로" style={{ border: "none", background: "none", padding: "0 4px 0 0", fontSize: 22, lineHeight: 1, fontWeight: 700, color: "#333", cursor: "pointer" }}>‹</button>
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{agency.name}</span>
            <button onClick={closeAgency} title="닫기" aria-label="닫기" style={{ border: "none", background: "none", fontSize: 20, lineHeight: 1, color: "#999", cursor: "pointer" }}>✕</button>
          </div>
          {/* 사무소 카드 — 기사 아래 사무소 소개 상자와 같은 내용 (없는 값은 빼고) */}
          <div style={{ position: "relative", margin: "0 14px 12px", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 14px 12px", boxShadow: "0 4px 14px -4px rgba(0,0,0,.06)" }}>
            <Star k="ag" id={String(agency.id)} />
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {agency.photo
                ? <img src={agency.photo} alt="" style={{ width: 48, height: 48, borderRadius: 14, objectFit: "cover", border: "1.5px solid #e5e7eb", flexShrink: 0 }} />
                : <div style={{ width: 48, height: 48, borderRadius: 14, background: "#e8eef8", color: "#1e3a6e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: 800, flexShrink: 0 }}>{agency.name.slice(0, 1)}</div>}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#111" }}>{agency.name}</div>
                <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 2 }}>{[agency.ceo && `대표 ${agency.ceo}`, agency.regNum && `등록번호 ${agency.regNum}`].filter(Boolean).join("  |  ")}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "52px 1fr", rowGap: 6, marginTop: 12, fontSize: 13 }}>
              {agency.address && <><span style={{ color: "#6b7280" }}>주소</span><span style={{ color: "#111" }}>{agency.address}</span></>}
              {(agency.phone || agency.cell) && <><span style={{ color: "#6b7280" }}>연락처</span><span style={{ color: "#2563eb", fontWeight: 800 }}>{[agency.phone, agency.cell].filter(Boolean).join(", ")}</span></>}
            </div>
            {agency.sns.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {agency.sns.map((x) => <SnsIconLink key={x.key} kind={x.key} url={x.url} />)}
              </div>
            )}
            {agency.intro && (
              <div style={{ marginTop: 10, background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 8, padding: "9px 11px", fontSize: 12.5, color: "#374151", lineHeight: 1.6 }}>
                <div style={{ fontWeight: 800, fontSize: 12, color: "#6b7280", marginBottom: 3 }}>소개말</div>
                <div style={introOpen ? undefined : { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{agency.intro}</div>
                {agency.intro.length > 60 && <button onClick={() => setIntroOpen((v) => !v)} style={{ border: "none", background: "none", padding: 0, marginTop: 3, fontSize: 12, color: "#1e3a6e", fontWeight: 700, cursor: "pointer" }}>{introOpen ? "접기" : "더보기"}</button>}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, padding: "0 14px 12px" }}>
            {([["vac", "공실", displayVacancies.length, "#2563eb"], ["art", "기사", agencyArts ? agencyArts.length : agency.articles, "#ff8e15"]] as const).map(([k, l, n, c]) => (
              <button key={k} type="button" onClick={() => setAgencyTab(k)}
                style={{ flex: 1, height: 36, borderRadius: 8, border: `1.5px solid ${agencyTab === k ? c : "#e5e7eb"}`, background: agencyTab === k ? c : "#fff", color: agencyTab === k ? "#fff" : "#374151", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>{l} {n}</button>
            ))}
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: "12px 16px",
            fontWeight: 800,
            fontSize: 15,
            color: isAuctionMode ? "#1a4282" : "#111",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: isAuctionMode ? "2px solid #1a4282" : "1px solid #eee",
            flexShrink: 0,
            background: isAuctionMode ? "#e3ecf5" : "#fff",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {fromApt && (
              <button onClick={() => window.history.back()} title="단지 정보로" aria-label="단지 정보로" style={{ border: "none", background: "none", padding: "0 6px 0 0", fontSize: 20, lineHeight: 1, fontWeight: 700, color: "#333", cursor: "pointer" }}>‹</button>
            )}
            {zoomLevel >= 9 ? (
              "지도를 더 확대해 주세요"
            ) : (
              <>
                {news || newsPicked || agList ? (
                  // [우리동네뉴스]·[부동산]을 켜면 — 공실 | 뉴스 | 부동산 (고른 것만 진하게, 2026-11-04 사장님)
                  (() => {
                    const mode = (news || newsPicked) && newsMode ? "news" : agList && agListMode ? "agency" : "vac";
                    const seg = (k: "vac" | "news" | "agency", label: string, n: number, color: string) =>
                      mode === k
                        ? <span key={k}>{label} <span style={{ color }}>{n}</span>개</span>
                        : <button key={k} type="button" onClick={() => { setNewsMode(k === "news"); setAgListMode(k === "agency"); }}
                            style={{ border: "none", background: "none", padding: 0, font: "inherit", color: "#9ca3af", cursor: "pointer" }}>{label.replace(/^지도위의 /, "")} {n}개</button>;
                    const bar = <span style={{ color: "#d1d5db", margin: "0 6px" }}>|</span>;
                    return (
                      <>
                        {seg("vac", isAuctionMode ? "경/공매" : selectedClusterIds && selectedClusterIds.length > 0 ? "선택된 공실" : "지도위의 공실", displayVacancies.length, "#111")}
                        {(news || newsPicked) && <>{bar}{seg("news", newsPicked ? "선택한 뉴스" : "지도위의 뉴스", newsPicked ? newsPicked.length : (news || []).length, "#ff8e15")}</>}
                        {agList && <>{bar}{seg("agency", agPicked ? "선택한 부동산" : "지도위의 부동산", agPicked ? agPicked.length : agList.length, "#1e3a6e")}</>}
                      </>
                    );
                  })()
                ) : (
                  <>
                    {isAuctionMode ? "해당 지역의 경/공매 매물" : selectedClusterIds && selectedClusterIds.length > 0 ? "선택된 공실" : "지도위의 공실"}{" "}
                    {displayVacancies.length}개
                  </>
                )}
              </>
            )}
          </span>
          {isAuctionMode && zoomLevel < 9 && (
            <select
              value={auctionSort}
              onChange={(e) => setAuctionSort(e.target.value as AuctionSortKey)}
              style={{
                padding: "4px 8px",
                fontSize: 12,
                fontWeight: 700,
                color: "#1a4282",
                background: "#fff",
                border: "1px solid #1a4282",
                borderRadius: 6,
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="latest">최신등록순</option>
              <option value="appraisal">감정가 낮은순</option>
              <option value="bid">입찰가 낮은순</option>
              <option value="bidDate">입찰 최근순</option>
            </select>
          )}
        </div>
      )}

      {agList && agListMode && !agency && (
        <div style={{ flex: 1, overflowY: "auto", background: "#fff" }}>
          {!(agPicked || agList).length && <div style={{ padding: "60px 24px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>이 지도 영역에는 부동산이 없어요</div>}
          {(agPicked || agList).map((a) => (
            <div key={a.id} onClick={() => window.dispatchEvent(new CustomEvent("gs-agency-pick", { detail: a.id }))}
              style={{ position: "relative", display: "flex", gap: 12, alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f6fb")} onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}>
              {a.photo
                ? <img src={a.photo} alt="" style={{ width: 52, height: 52, borderRadius: 14, objectFit: "cover", border: "1.5px solid #e5e7eb", flexShrink: 0 }} />
                : <div style={{ width: 52, height: 52, borderRadius: 14, background: "#e8eef8", color: "#1e3a6e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, flexShrink: 0 }}>{a.name.slice(0, 1)}</div>}
              <div style={{ minWidth: 0, flex: 1 }}>
                <Star k="ag" id={String(a.id)} />
                <div style={{ fontSize: 15, fontWeight: 800, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 34 }}>{a.name}</div>
                <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.address}</div>
                <div style={{ fontSize: 12.5, marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <b style={{ color: "#2563eb" }}>공실 {a.vacancies}</b>
                  <b style={{ color: "#ff8e15" }}>기사 {a.articles}</b>
                  {a.phone && <span style={{ color: "#374151" }}>{a.phone}</span>}
                  {/* 기사 수 옆에 [상세보기] — 누르면 사무소 화면 (11-04 사장님) */}
                  <span style={{ marginLeft: "auto", color: "#1e3a6e", fontWeight: 800, whiteSpace: "nowrap" }}>상세보기 &gt;</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {(((news || newsPicked) && newsMode && !agency) || showArts) && (
        <div style={{ flex: 1, overflowY: "auto", background: "#fff" }}>
          {showArts && !agencyArts && <div style={{ padding: "60px 24px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>기사를 불러오는 중…</div>}
          {(showArts ? agencyArts || [] : newsPicked || news || []).length === 0 && (!showArts || agencyArts) && <div style={{ padding: "60px 24px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>{showArts ? "이 사무소가 쓴 기사가 아직 없어요" : "이 지도 영역에는 뉴스가 없어요"}</div>}
          {(showArts ? agencyArts || [] : newsPicked || news || []).map((a) => (
            <div key={a.id} onClick={() => openNews(a.id)} style={{ position: "relative", padding: "18px 20px", borderBottom: "1px solid #f0f0f0", cursor: "pointer", background: newsReading === a.id ? "#fff7ed" : "#fff", borderLeft: newsReading === a.id ? "4px solid #ff8e15" : "4px solid transparent" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#fff7ed")} onMouseLeave={(e) => (e.currentTarget.style.background = newsReading === a.id ? "#fff7ed" : "#fff")}>
              <Star k="art" id={String(a.id)} />
              <div style={{ fontSize: 11, color: "#ff8e15", fontWeight: "bold", marginBottom: 6, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", paddingRight: 34 }}>
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
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12 }}>
                <span style={{ color: "#a1a1aa" }}>{String(a.published_at || a.created_at || "").slice(0, 10).replace(/-/g, ". ")} · {a.author_name || "공실뉴스"}</span>
                <span style={{ color: newsReading === a.id ? "#d32f2f" : "#ff8e15", fontWeight: 700 }}>{newsReading === a.id ? "기사닫기 ✕" : "기사 보러가기 >"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div
        onScroll={(e) => {
          const target = e.currentTarget;
          if (target.scrollHeight - target.scrollTop <= target.clientHeight + 150) {
            if (sortedVacancies.length > visibleCount) {
              setVisibleCount((prev) => prev + 30);
            }
          }
        }}
        style={{ flex: 1, overflowY: "auto", padding: 0, background: "#fff", display: ((news || newsPicked) && newsMode && !agency) || showArts || (agList && agListMode && !agency) ? "none" : undefined }}
      >
        {zoomLevel >= 9 && activeCategory !== "wish" && !agency ? (
          <div
            style={{
              padding: "80px 30px",
              textAlign: "center",
              color: "#64748b",
              background: "#f8fafc",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="11" y1="8" x2="11" y2="14"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", marginBottom: 8 }}>지도를 조금만 더 확대해 주세요</div>
            <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
              지도를 조금만 더 확대하시면 해당 지역의
              <br />
              상세 매물 목록이 자동으로 표시됩니다.
            </div>
          </div>
        ) : displayVacancies.length === 0 ? (
          <div style={{ padding: "60px 40px", textAlign: "center", color: "#888", fontSize: 14 }}>
            {activeCategory === "wish"
              ? wishTab === "wish"
                ? "현재 등록된 관심 공실광고가 없습니다."
                : "최근 본 공실광고가 없습니다."
              : "조건에 맞는 공실광고가 없습니다."}
          </div>
        ) : (
          sortedVacancies.slice(0, visibleCount).map((prop) => {
            const isActiveAndShowing = activeProperty === prop.id && showDetail;
            const addrText = getCleanAddrText(prop);
            const meta = (prop as any).metadata || {};
            const appraisalPrice = meta.appraisal_price || parseInt(meta.apslEvlAmt || "0", 10) || prop.deposit * 10000;
            const lowestBidPrice = meta.lowest_bid_price || parseInt(meta.lowstBidPrcIndctCont || "0", 10) || 0;
            const lowestBidText =
              meta.lowstBidPrcIndctCont === "비공개" ? "비공개" : lowestBidPrice > 0 ? formatAmount(lowestBidPrice) : "";
            const cardDiscountRate = appraisalPrice > 0 ? Math.round(((appraisalPrice - lowestBidPrice) / appraisalPrice) * 100) : 0;
            const priceText = isAuctionMode ? `감정가 ${formatAmount(appraisalPrice)}` : getPriceText(prop);
            // 마스킹 판별: 부동산노출 전용 + 부동산회원 미만 (본인 등록 매물 제외)
            const isMyProperty = currentUser && prop && prop.owner_id === currentUser.id;
            const isMasked = prop.exposure_type === "부동산노출" &&
              (prop.trade_type === "경매" || prop.trade_type === "공매" ? userLevel < 1 : userLevel < 2) &&
              !isMyProperty;
            const showCommission = userLevel >= 2; // 중개보수는 부동산회원 이상만

            return (
              <div
                key={prop.id}
                onClick={() => {
                  if (isActiveAndShowing) {
                    setShowDetail(false);
                  } else {
                    setPrevPropertyId(null);
                    setActiveProperty(prop.id);
                    setShowDetail(true);
                    setActiveDetailTab(prop.trade_type === "경매" ? "auction_detail" : "info");
                    setGalleryIndex(0);
                  }
                }}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  padding: "16px 20px 16px 16px",
                  cursor: "pointer",
                  position: "relative",
                  transition: "background 0.2s, border-color 0.2s",
                  borderBottom: "1px solid #eee",
                  borderLeft: activeProperty === prop.id ? (isAuctionMode ? "4px solid #1a4282" : "4px solid #1a73e8") : "4px solid transparent",
                  background: activeProperty === prop.id ? (isAuctionMode ? "#e3ecf5" : "#eaf4ff") : "#fff",
                }}
              >
                <Star k="vac" id={String(prop.id)} style={{ top: 22, right: 26 }} />
                <div style={{ flex: 1, paddingRight: prop.images?.[0] ? 15 : 0, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {isAuctionMode && (
                        <>
                          <span
                            style={{
                              display: "inline-block",
                              fontSize: 11,
                              color: "#d9363e",
                              border: "1px solid #d9363e",
                              padding: "1px 5px",
                              borderRadius: 4,
                              fontWeight: "bold",
                            }}
                          >
                            {getAuctionInfo(prop).badge}
                          </span>
                          {prop.created_at && (Date.now() - new Date(prop.created_at).getTime()) < 3 * 24 * 60 * 60 * 1000 && (
                            <span
                              style={{
                                display: "inline-block",
                                fontSize: 10,
                                color: "#fff",
                                background: "#f97316",
                                padding: "1px 6px",
                                borderRadius: 4,
                                fontWeight: 800,
                                letterSpacing: 0.5,
                              }}
                            >
                              New
                            </span>
                          )}
                        </>
                      )}
                      {showCommission && !isAuctionMode && (prop.realtor_commission || prop.commission_type) && (
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: 11,
                            color: "#d9363e",
                            border: "1px solid #d9363e",
                            padding: "1px 5px",
                            borderRadius: 4,
                            fontWeight: "bold",
                          }}
                        >
                          {prop.realtor_commission || prop.commission_type}
                        </span>
                      )}
                      {!isAuctionMode && (
                        <>
                          <span style={{ fontSize: 12, color: "#d9363e", fontWeight: "bold" }}>{prop.vacancy_no}</span>
                          <span style={{ fontSize: 12, color: "#aaa" }}>
                            {new Date(prop.created_at)
                              .toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
                              .replace(/\s/g, "")}
                          </span>
                        </>
                      )}
                    </div>

                  </div>

                  {/* 주소 영역: 마스킹 시 글자수에 맞춰 X로 대체 */}
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: "bold",
                      color: isMasked ? "#bbb" : "#111",
                      marginBottom: 4,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      letterSpacing: isMasked ? 1 : 0,
                    }}
                  >
                    {isMasked ? (addrText || "주소 없음").replace(/[^\s]/g, "X") : addrText || "주소 없음"}
                  </div>
                  {/* 가격, 면적, 옵션: 항상 정상 표시 */}
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: isAuctionMode ? "#1a4282" : "#1a73e8",
                      marginBottom: isAuctionMode && lowestBidText ? 0 : 4,
                    }}
                  >
                    {isAuctionMode ? (
                      <>
                        <span style={{ fontSize: 13, color: "#888", fontWeight: "normal", marginRight: 4 }}>감정가</span>
                        <span style={{ fontWeight: 800 }}>{formatAmount(appraisalPrice)}</span>
                      </>
                    ) : (
                      priceText
                    )}
                  </div>
                  {isAuctionMode && lowestBidText && (
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#d9363e", marginBottom: 4 }}>
                      최저입찰가 {lowestBidText}
                      {cardDiscountRate !== 0 && (
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            color: cardDiscountRate > 0 ? "#16a34a" : "#d9363e",
                            marginLeft: 8,
                          }}
                        >
                          {cardDiscountRate > 0 ? "▼" : "▲"}
                          {Math.abs(cardDiscountRate)}%
                        </span>
                      )}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 13,
                      color: "#555",
                      marginBottom: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {prop.trade_type === "경매" ? (
                      (() => {
                        const info = getAuctionInfo(prop);
                        return (
                          <>
                            {info.category}
                            {info.area ? (
                              <>
                                <span style={{ color: "#ddd", margin: "0 4px" }}>|</span>
                                {info.area}
                              </>
                            ) : null}
                          </>
                        );
                      })()
                    ) : (
                      <>
                        {prop.property_type} <span style={{ color: "#ddd", margin: "0 4px" }}>|</span> {prop.direction || "방향없음"}{" "}
                        <span style={{ color: "#ddd", margin: "0 4px" }}>|</span> {prop.exclusive_m2 ? formatAreaWithPy(prop.exclusive_m2) : "면적미상"}
                      </>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#666",
                      marginBottom: prop.themes?.length ? 8 : 0,
                      display: "-webkit-box",
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {prop.trade_type === "경매"
                      ? [
                          (() => {
                            const av = meta.bldSqms || meta.landSqms || meta.ldSqms || meta.cltrAr || prop.exclusive_m2;
                            return av ? `면적 ${formatAreaWithPy(av)}` : null;
                          })(),
                          meta.pblctBgnDtm || meta.bid_start_date
                            ? `입찰 ${(meta.pblctBgnDtm || meta.bid_start_date || "").substring(0, 10)}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "상세정보 확인"
                      : [`룸 ${prop.room_count || 0}개`, `욕실 ${prop.bathroom_count || 0}개`, ...(prop.options || [])]
                          .filter(Boolean)
                          .join(", ")}
                  </div>

                </div>
                 {prop.images?.[0] && (
                  <div data-thumb-wrapper="true" style={{ flexShrink: 0, marginLeft: 5, textAlign: "center", alignSelf: isAuctionMode ? "center" : "flex-start" }}>
                    <div style={{ width: isAuctionMode ? 130 : 110, height: isAuctionMode ? 100 : 110, borderRadius: 6, overflow: "hidden", background: "transparent" }}>
                      <img 
                        src={prop.images[0]} 
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        onError={(e) => {
                          const wrapper = (e.currentTarget as HTMLImageElement).closest('[data-thumb-wrapper="true"]');
                          if (wrapper) wrapper.style.display = "none";
                        }}
                      />
                    </div>
                    {isAuctionMode && (meta.cltrMngNo || meta.cltr_mng_no) && (
                      <div style={{ fontSize: 10, color: "#999", marginTop: 4, lineHeight: 1.2 }}>
                        {meta.cltrMngNo || meta.cltr_mng_no}
                      </div>
                    )}
                  </div>
                )}

                {/* 테마 키워드 (사진 밑 카드 전체 폭 1줄 활용 + 말줄임) */}
                {prop.themes && prop.themes.length > 0 && (
                  <div style={{ flexBasis: "100%", width: "100%", display: "flex", alignItems: "center", gap: 6, marginTop: 10, overflow: "hidden", whiteSpace: "nowrap" }}>
                    {prop.themes.slice(0, 4).map((theme: string, idx: number) => (
                      <span
                        key={idx}
                        style={{
                          background: "#f8fafc",
                          color: "#3b82f6",
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 12,
                          fontWeight: 700,
                          border: "1px solid #bfdbfe",
                          flexShrink: 0,
                        }}
                      >
                        {theme.startsWith("#") ? theme : `# ${theme}`}
                      </span>
                    ))}
                    {prop.themes.length > 4 && (
                      <span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 800, letterSpacing: 1, flexShrink: 0, paddingLeft: 2 }}>
                        ...
                      </span>
                    )}
                  </div>
                )}
                    {activeCategory === "wish" && wishTab === "wish" && (
                      <div style={{ flexBasis: "100%", display: "flex", justifyContent: "flex-end", paddingTop: 12 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVacancyId(prop.id);
                          setShowCategoryModal(true);
                        }}
                        style={{
                          background: "#f3f4f6",
                          border: "none",
                          padding: "4px 10px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#4b5563",
                          cursor: "pointer",
                        }}
                      >
                        폴더 이동
                      </button>
                      </div>
                    )}
              </div>
            );
          })
        )}
        {sortedVacancies.length > visibleCount && (
          <button
            onClick={() => setVisibleCount((prev) => prev + 30)}
            style={{
              width: "100%",
              padding: "16px",
              color: isAuctionMode ? "#1a4282" : "#1a73e8",
              border: "none",
              borderTop: "1px solid #eee",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = isAuctionMode ? "#e3ecf5" : "#eaf4ff")}
            onMouseOut={(e) => (e.currentTarget.style.background = "#f8fafc")}
          >
            더보기 ({sortedVacancies.length - visibleCount}개 남음)
          </button>
        )}
      </div>
    </aside>
  );
}
