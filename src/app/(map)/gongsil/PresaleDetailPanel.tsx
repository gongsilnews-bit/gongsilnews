"use client";
/**
 * 분양 단지 상세 창 (2026-11-26 사장님: 아파트 단지 상세 창과 같은 틀로 — 색은 보라)
 *  맨 위 로드뷰 + 이름·주소 · 세대수·입주 예정 · 시공·시행 · 평형 고르기 + 분양가(큰 글자) · 청약 일정(그래프 자리) · 평형별 분양가 · 맨 아래 모집공고
 *  값은 청약홈 자료 그대로, 없는 칸은 "-" (지어내지 않는다)
 */
import React, { useEffect, useMemo, useState } from "react";
import { HeroRoadview, heroBtn } from "./AptDetailPanel";
import { repType } from "@/utils/presale";

export const PRESALE = "#6d28d9";      // 분양 보라 — 청약 전·진행 중 (11-26 사장님: 더 진하게)
export const PRESALE_DIM = "#7c3aed";  // 청약 마감 (연보라는 안 보여서 진하게, 11-26)
const SOFT = "#f5f3ff";
const SUB = "#6b7280";

export type PresaleItem = {
  id: string; kind: "apt" | "ofc" | "rem"; name: string; address: string | null; house_type: string | null; supply_kind: string | null;
  total_units: number | null; notice_date: string | null; special_start: string | null; special_end: string | null;
  rank1_date: string | null; rank2_date: string | null; receipt_start: string | null; receipt_end: string | null; winner_date: string | null;
  contract_start: string | null; contract_end: string | null; move_in_ym: string | null; builder: string | null; developer: string | null;
  notice_url: string | null; homepage: string | null; phone: string | null; lat: number | null; lng: number | null;
  types: { type: string; area: number | null; supply_area: number | null; units: number | null; price: number | null }[];
};

const today = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10); // 한국 날짜
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

/** 청약 단계 — 지도 표시 아래 줄과 카드에 */
export function presaleStage(x: { receipt_start: string | null; receipt_end: string | null; winner_date: string | null }) {
  const t = today();
  if (x.receipt_start && t < x.receipt_start) return { short: `청약 D-${days(t, x.receipt_start)}`, live: true, done: false };
  if (x.receipt_end && t <= x.receipt_end) return { short: "청약 중", live: true, done: false };
  if (x.winner_date && t < x.winner_date) return { short: `발표 D-${days(t, x.winner_date)}`, live: false, done: false };
  return { short: "청약 마감", live: false, done: true };
}

/** 만원 → "9억 8,000만" */
export function presalePrice(v: number | null) {
  if (!v) return "-";
  const eok = Math.floor(v / 10000), man = v % 10000;
  return `${eok ? `${eok}억` : ""}${eok && man ? " " : ""}${man ? `${man.toLocaleString("ko-KR")}만` : ""}` || "-";
}
/** "15513560" → "1551-3560" · "0635628881" → "063-562-8881" */
const telText = (p: string) => {
  const r = p.replace(/\D/g, "");
  if (r.length === 8 && /^1[5-9]/.test(r)) return `${r.slice(0, 4)}-${r.slice(4)}`;
  if (r.startsWith("02")) return r.length === 9 ? `02-${r.slice(2, 5)}-${r.slice(5)}` : `02-${r.slice(2, 6)}-${r.slice(6)}`;
  if (r.length === 10) return `${r.slice(0, 3)}-${r.slice(3, 6)}-${r.slice(6)}`;
  if (r.length === 11) return `${r.slice(0, 3)}-${r.slice(3, 7)}-${r.slice(7)}`;
  return p;
};
const dot = (d: string | null) => (d ? d.slice(2).replace(/-/g, ".") : "-");
const range = (a: string | null, b: string | null) => (a ? (b && b !== a ? `${dot(a)} ~ ${dot(b).slice(3)}` : dot(a)) : "-");

export default function PresaleDetailPanel({ item, onClose, mobile = false, side }: { item: PresaleItem; onClose: () => void; mobile?: boolean; side?: { left: number; top: number; height: number } }) {
  const types = useMemo(() => (item.types || []).filter((t) => t.type), [item]);
  // 처음 고른 평형 = 지도 표시와 같은 대표 평형 (repType)
  const first = useMemo(() => (repType(types) || types[0])?.type || "", [types]);
  const [sel, setSel] = useState(first);
  useEffect(() => setSel(first), [item.id, first]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const t = types.find((x) => x.type === sel) || types[0];
  const stage = presaleStage(item);
  const color = stage.done ? PRESALE_DIM : PRESALE;
  const priceLabel = item.kind === "ofc" ? "공급금액" : "분양가 (최고가 기준)";
  const moveIn = item.move_in_ym && /^\d{6}$/.test(item.move_in_ym) ? `${item.move_in_ym.slice(0, 4)}년 ${item.move_in_ym.slice(4)}월 입주 예정` : "입주 예정 -";
  const tag = item.kind === "rem" ? "무순위 · 잔여세대" : item.kind === "ofc" ? `${item.house_type || "오피스텔"} 분양` : `분양${item.supply_kind ? ` · ${item.supply_kind}` : ""}`;

  // 청약 일정 — 지난 것은 회색, 다음 것은 보라로 강조
  const now = today();
  const steps = [
    { label: "모집공고", d: item.notice_date, e: null as string | null },
    { label: "특별공급", d: item.special_start, e: item.special_end },
    { label: "1순위", d: item.rank1_date, e: null },
    { label: "2순위", d: item.rank2_date, e: null },
    ...(item.kind !== "apt" && !item.rank1_date ? [{ label: "청약 접수", d: item.receipt_start, e: item.receipt_end }] : []),
    { label: "당첨 발표", d: item.winner_date, e: null },
    { label: "계약", d: item.contract_start, e: item.contract_end },
  ].filter((s) => s.d);
  const nextIdx = steps.findIndex((s) => (s.e || s.d)! >= now);

  const section: React.CSSProperties = { background: "#fff", marginBottom: 10 };
  const h3: React.CSSProperties = { fontSize: 16, fontWeight: 800, margin: 0, padding: "18px 20px 10px" };
  const lat = Number(item.lat), lng = Number(item.lng);

  return (
    <div onClick={side ? undefined : onClose} style={side ? { position: "fixed", left: side.left, top: side.top, height: side.height, width: 420, zIndex: 1002, display: "flex" } : { position: mobile ? "fixed" : "absolute", inset: 0, zIndex: mobile ? 9000 : 1002, background: "rgba(17,24,39,.45)", display: "flex", alignItems: mobile ? "flex-end" : "center", justifyContent: "center", padding: mobile ? 0 : 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ["--apt-accent" as string]: PRESALE, ["--apt-soft" as string]: SOFT, position: "relative", width: mobile || side ? "100%" : 600, maxWidth: "100%", height: mobile ? "88%" : "100%", maxHeight: mobile || side ? undefined : 860, borderRadius: side ? 0 : mobile ? "16px 16px 0 0" : 16, overflow: "hidden", background: "#f3f4f6", boxShadow: side ? "4px 0 16px rgba(0,0,0,.14)" : "0 18px 50px rgba(0,0,0,.35)", display: "flex", flexDirection: "column", fontSize: 14, color: "#1f2937" }}>
        <div style={{ flex: 1, overflowY: "auto" }}>
          <HeroRoadview lat={Number.isFinite(lat) ? lat : NaN} lng={lng} title={item.name} sub={item.address || ""} tag={tag}
            actions={(dark) => (<>
              {side && <button onClick={onClose} aria-label="목록으로" title="공실 목록으로" style={heroBtn(dark)}>‹</button>}
              <span style={{ flex: 1 }} />
              <button onClick={onClose} aria-label="닫기" style={heroBtn(dark)}>✕</button>
            </>)} />

          {/* 단지 한 줄 — 세대수 · 입주 예정 / 시공 · 시행 */}
          <div style={{ ...section, padding: "16px 20px" }}>
            <div style={{ color: "#4b5563" }}>
              {item.total_units ? `${item.total_units.toLocaleString("ko-KR")}세대 공급` : "공급 세대 -"} <span style={{ color: "#d1d5db" }}>|</span> {moveIn}
            </div>
            <div style={{ color: "#4b5563", marginTop: 2 }}>
              시공 {item.builder || "-"} <span style={{ color: "#d1d5db" }}>|</span> 시행 {item.developer || "-"}
            </div>
          </div>

          {/* 분양가 — 평형 고르기 + 큰 글자 */}
          <div style={section}>
            <div style={{ display: "flex", alignItems: "center", padding: "16px 20px 0", gap: 8 }}>
              <span style={{ background: color, color: "#fff", borderRadius: 6, padding: "6px 14px", fontSize: 14, fontWeight: 800 }}>{stage.short}</span>
              <div style={{ flex: 1 }} />
              {types.length > 0 && (
                <select value={t?.type} onChange={(e) => setSel(e.target.value)}
                  style={{ border: `1.5px solid ${PRESALE}`, background: "#fff", color: PRESALE, borderRadius: 6, padding: "6px 10px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                  {types.map((x) => <option key={x.type} value={x.type}>{x.area ? `전용 ${Math.round(x.area * 100) / 100}㎡ · ${x.type}` : x.type}</option>)}
                </select>
              )}
            </div>
            <div style={{ padding: "16px 20px 4px", color: PRESALE, fontWeight: 600 }}>{priceLabel}</div>
            <div style={{ padding: "0 20px", fontSize: 30, fontWeight: 900, color: PRESALE, letterSpacing: "-0.5px" }}>{presalePrice(t?.price ?? null)}</div>
            <div style={{ padding: "4px 20px 16px", color: SUB, fontSize: 12 }}>
              {[t?.units ? `${t.units.toLocaleString("ko-KR")}세대` : "", t?.supply_area ? `공급 ${Math.round(t.supply_area * 100) / 100}㎡` : ""].filter(Boolean).join(" · ") || "평형 정보 없음"}
            </div>
          </div>

          {/* 청약 일정 — 단지 창의 "최근 3년" 그래프 자리 */}
          <div style={section}>
            <h3 style={h3}>청약 일정</h3>
            <div style={{ padding: "0 20px 16px" }}>
              {steps.length ? steps.map((s, i) => {
                const past = nextIdx === -1 || i < nextIdx, next = i === nextIdx;
                return (
                  <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < steps.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 5, flexShrink: 0, background: next ? PRESALE : past ? "#d1d5db" : "#fff", border: `2px solid ${next ? PRESALE : past ? "#d1d5db" : PRESALE_DIM}` }} />
                    <span style={{ width: 70, fontWeight: next ? 800 : 600, color: next ? PRESALE : past ? "#9ca3af" : "#374151" }}>{s.label}</span>
                    <span style={{ flex: 1, color: next ? PRESALE : past ? "#9ca3af" : "#374151", fontWeight: next ? 800 : 500 }}>{range(s.d, s.e)}</span>
                    {next && <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", background: PRESALE, borderRadius: 10, padding: "1px 8px" }}>{days(now, s.d!) > 0 ? `D-${days(now, s.d!)}` : "오늘"}</span>}
                  </div>
                );
              }) : <div style={{ color: SUB }}>일정 정보가 없습니다.</div>}
            </div>
          </div>

          {/* 평형별 분양가 */}
          {types.length > 0 && (
            <div style={section}>
              <h3 style={h3}>평형별 {item.kind === "ofc" ? "공급금액" : "분양가"}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 70px auto", gap: 10, padding: "8px 20px", color: SUB, fontSize: 12, borderBottom: "1px solid #e5e7eb" }}>
                <span>평형</span><span style={{ textAlign: "right" }}>세대</span><span style={{ textAlign: "right" }}>{item.kind === "ofc" ? "공급금액" : "최고가"}</span>
              </div>
              {types.map((x) => (
                <div key={x.type} onClick={() => setSel(x.type)} style={{ display: "grid", gridTemplateColumns: "1fr 70px auto", gap: 10, padding: "10px 20px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", background: x.type === t?.type ? SOFT : "#fff" }}>
                  <span style={{ fontWeight: 700 }}>{x.type}{x.area ? <span style={{ color: SUB, fontWeight: 500 }}> · 전용 {Math.round(x.area * 100) / 100}㎡</span> : null}</span>
                  <span style={{ textAlign: "right", color: "#4b5563" }}>{x.units ?? "-"}</span>
                  <span style={{ textAlign: "right", fontWeight: 800, color: PRESALE }}>{presalePrice(x.price)}</span>
                </div>
              ))}
              <div style={{ padding: "10px 20px 14px", color: SUB, fontSize: 12 }}>출처: 청약홈(한국부동산원) 모집공고 · 자세한 조건은 모집공고에서 확인하세요.</div>
            </div>
          )}

          {(item.phone || item.homepage) && (
            <div style={{ ...section, padding: "14px 20px", color: "#4b5563", lineHeight: 1.7 }}>
              {item.phone && <div>분양 문의 <a href={`tel:${item.phone}`} style={{ color: PRESALE, fontWeight: 700 }}>{telText(item.phone)}</a></div>}
              {item.homepage && <div>홈페이지 <a href={item.homepage} target="_blank" rel="noopener noreferrer" style={{ color: PRESALE, fontWeight: 700, wordBreak: "break-all" }}>{item.homepage}</a></div>}
            </div>
          )}
        </div>

        {/* 맨 아래 — 단지 창의 보라 줄 자리에 모집공고 */}
        {item.notice_url && (
          <a href={item.notice_url} target="_blank" rel="noopener noreferrer"
            style={{ flexShrink: 0, height: 52, background: PRESALE, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, textDecoration: "none" }}>
            청약홈 모집공고 보기 →
          </a>
        )}
      </div>
    </div>
  );
}
