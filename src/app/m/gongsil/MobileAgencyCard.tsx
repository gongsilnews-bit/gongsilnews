"use client";
/**
 * 모바일 공실열람 — 부동산 이름표 [상세보기]를 누르면 공실 목록 화면 위에 사무소 카드 + [공실 N]·[기사 N] 탭
 *  (2026-11-11 사장님: "모바일에서도 부동산 클릭하면 이렇게 나오게" — PC 우리동네부동산 왼쪽 사무소 화면과 같은 내용)
 *  카드 내용·모양은 PC GongsilSidebar 사무소 카드 그대로 (없는 값은 뺀다). 기사 탭은 그 사무소가 쓴 공실뉴스 기사, 누르면 모바일 기사 화면
 */
import React, { useEffect, useState } from "react";
import { agencyArticles, type MapAgency } from "@/app/actions/mapAgencies";
import SnsIconLink from "@/app/(map)/gongsil/SnsIconLink";
import { addRecent, starSvg, useStars } from "@/app/(map)/gongsil/stars";
import { ProTag } from "@/components/admin/ProBadge";

type Art = { id: string; article_no?: number | string | null; title: string; subtitle?: string | null; thumbnail_url?: string | null; published_at?: string | null; created_at?: string | null; author_name?: string | null; section1?: string | null; section2?: string | null; location_name?: string | null };

export function useAgencyArticles(agency: MapAgency | null) {
  const [arts, setArts] = useState<Art[] | null>(null);
  useEffect(() => {
    setArts(null);
    if (!agency) return;
    agencyArticles(agency.ownerId).then((l) => setArts(l as Art[])).catch(() => setArts([]));
    addRecent("ag", { id: agency.id, ownerId: agency.ownerId, name: agency.name, address: agency.address, phone: agency.phone, photo: agency.photo, vacancies: agency.vacancies, articles: agency.articles, newVacancies: 0, newArticles: 0 }); // MY관심 [최근 본 부동산] — PC 와 같이
  }, [agency?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return arts;
}

export function MobileAgencyCard({ agency, vacCount, artCount, tab, setTab }: { agency: MapAgency; vacCount: number; artCount: number; tab: "vac" | "art"; setTab: (t: "vac" | "art") => void }) {
  const { isStar, toggleStar } = useStars();
  const [introOpen, setIntroOpen] = useState(false);
  useEffect(() => setIntroOpen(false), [agency.id]);
  const tel = (agency.cell || agency.phone || "").replace(/[^0-9]/g, "");
  return (
    <div style={{ flexShrink: 0, background: "#fff", borderBottom: "1px solid #f3f4f6" }}>
      <div style={{ position: "relative", margin: "12px 16px", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 14px 12px", boxShadow: "0 4px 14px -4px rgba(0,0,0,.06)" }}>
        <span role="button" title={isStar("ag", agency.id) ? "찜 해제" : "찜하기"} onClick={(e) => { e.stopPropagation(); void toggleStar("ag", agency.id); }}
          style={{ position: "absolute", top: 8, right: 10, width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,.92)", boxShadow: "0 1px 4px rgba(0,0,0,.18)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          dangerouslySetInnerHTML={{ __html: starSvg(isStar("ag", agency.id), 18) }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingRight: 34 }}>
          {agency.photo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={agency.photo} alt="" style={{ width: 48, height: 48, borderRadius: 14, objectFit: "cover", border: "1.5px solid #e5e7eb", flexShrink: 0 }} />
            : <div style={{ width: 48, height: 48, borderRadius: 14, background: "#e8eef8", color: "#1e3a6e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: 800, flexShrink: 0 }}>{agency.name.slice(0, 1)}</div>}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#111", display: "flex", alignItems: "center", gap: 6 }}>{agency.name}{agency.pro && <ProTag />}</div>
            <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 2 }}>{[agency.ceo && `대표 ${agency.ceo}`, agency.regNum && `등록번호 ${agency.regNum}`].filter(Boolean).join("  |  ")}</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "52px 1fr", rowGap: 6, marginTop: 12, fontSize: 13 }}>
          {agency.address && <><span style={{ color: "#6b7280" }}>주소</span><span style={{ color: "#111" }}>{agency.address}</span></>}
          {(agency.phone || agency.cell) && <><span style={{ color: "#6b7280" }}>연락처</span>
            {/* 휴대폰이라 번호를 누르면 바로 전화 */}
            <span style={{ fontWeight: 800 }}>{[agency.phone, agency.cell].filter(Boolean).map((p, i) => <React.Fragment key={p}>{i ? ", " : ""}<a href={`tel:${p.replace(/[^0-9]/g, "")}`} style={{ color: "#2563eb", textDecoration: "none" }}>{p}</a></React.Fragment>)}</span></>}
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
        {tel && (
          <a href={`tel:${tel}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 40, marginTop: 12, borderRadius: 8, background: "#1e3a6e", color: "#fff", fontSize: 14, fontWeight: 800, textDecoration: "none" }}>
            {/* 전화 그림은 흰색 (2026-11-11 사장님: 빨간 그림 말고 흰색) */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" aria-hidden><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1z" /></svg>
            전화하기
          </a>
        )}
      </div>
      <div style={{ display: "flex", gap: 6, padding: "0 16px 12px" }}>
        {([["vac", "공실", vacCount, "#2563eb"], ["art", "기사", artCount, "#ff8e15"]] as const).map(([k, l, n, c]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            style={{ flex: 1, height: 38, borderRadius: 8, border: `1.5px solid ${tab === k ? c : "#e5e7eb"}`, background: tab === k ? c : "#fff", color: tab === k ? "#fff" : "#374151", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>{l} {n}</button>
        ))}
      </div>
    </div>
  );
}

/** 기사 탭 — PC 사무소 기사 목록과 같은 줄 모양, 누르면 모바일 기사 화면 */
export function MobileAgencyArticles({ arts }: { arts: Art[] | null }) {
  if (!arts) return <div style={{ padding: "60px 24px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>기사를 불러오는 중…</div>;
  if (!arts.length) return <div style={{ padding: "60px 24px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>이 사무소가 쓴 기사가 아직 없어요</div>;
  return (
    <>
      {arts.map((a) => (
        <a key={a.id} href={`/m/news/${a.article_no || a.id}`} style={{ display: "block", padding: "18px 4px", borderBottom: "1px solid #f0f0f0", textDecoration: "none", color: "inherit" }}>
          <div style={{ fontSize: 11, color: "#ff8e15", fontWeight: "bold", marginBottom: 6, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ border: "1px solid #fdba74", background: "#fff7ed", borderRadius: 3, padding: "1px 6px" }}>{[a.section1, a.section2].filter(Boolean).join(" > ")}</span>
            {a.location_name && <span style={{ color: "#9ca3af", fontWeight: 600 }}>📍 {a.location_name}</span>}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#111", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "keep-all" }}>{a.title}</div>
              {a.subtitle && <div style={{ fontSize: 12.5, color: "#666", marginTop: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{String(a.subtitle).split(/\r?\n/)[0]}</div>}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {a.thumbnail_url && <img src={a.thumbnail_url} alt="" style={{ width: 84, height: 64, objectFit: "cover", borderRadius: 6, flexShrink: 0, background: "#f3f4f6" }} />}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12 }}>
            <span style={{ color: "#a1a1aa" }}>{String(a.published_at || a.created_at || "").slice(0, 10).replace(/-/g, ". ")} · {a.author_name || "공실뉴스"}</span>
            <span style={{ color: "#ff8e15", fontWeight: 700 }}>기사 보러가기 &gt;</span>
          </div>
        </a>
      ))}
    </>
  );
}
