"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 공실열람 PC 3줄 검색조건 칩 (2026-11-17 사장님: 네이버처럼)
 *  - 칩을 누르면 그 칩 바로 아래 작은 창(제목 · ✕ · 조건삭제)이 열리고, 바깥을 누르면 닫힌다. 한 번에 하나만.
 *  - 값은 상세검색 창(GongsilFilterPanel)과 같은 필터 상태(useGongsilFilterState)를 바로 바꾼다 → 지도·목록에 바로 적용, 두 창 값이 늘 같다.
 *  - 칸 조건 전부가 칩 — pcChipKeys(자주 쓰는 것, 네이버 순서) 다음 pcDetailKeys(나머지). 좁으면 줄바꿈.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MAINT_PRESETS, pcWizardTabs } from "./gongsilHelpers";
import { AREA_SCALE, UNIT_SCALE, YEAR_SCALE } from "./gongsilFilterScales";

const NAVY = "#1a4282";
const BLUE = "#1a73e8";
const THIS_YEAR = new Date().getFullYear();

/** 칸(상세조건 묶음)별 자주 쓰는 조건 — 네이버 순서로 칩 줄 앞쪽에 */
export function pcChipKeys(condCategory: string, isAuctionMode: boolean): string[] {
  if (isAuctionMode) return ["감정가", "최저입찰가", "할인율", "유찰횟수", "입찰일"];
  if (condCategory === "apart") return ["거래방식", "가격대", "면적", "사용승인일", "세대수", "방/욕실수", "방향"];
  if (condCategory === "villa") return ["거래방식", "가격대", "면적", "사용승인일", "방/욕실수", "방향", "기타옵션"];
  if (condCategory === "one") return ["거래방식", "가격대", "면적", "방/욕실수", "관리비", "방향", "기타옵션"];
  if (condCategory === "biz") return ["거래방식", "가격대", "면적", "층수", "관리비", "주차", "기타옵션"];
  if (condCategory === "sale") return ["거래방식", "가격대", "면적", "세대수", "등록자", "중개보수"];
  return [];
}

/** 칸(상세조건 묶음)의 조건 전부 — 예전 상세검색 창 칸 목록(pcWizardTabs)에서 거래유형을 거래방식·가격대로 나눈 것 */
export function pcAllConditionKeys(condCategory: string, isAuctionMode: boolean): string[] {
  const tabs = pcWizardTabs(isAuctionMode ? "auction" : condCategory);
  return tabs.flatMap((t) => (t === "거래유형" ? ["거래방식", "가격대"] : [t]));
}
/** 칸 조건 중 pcChipKeys 에 없는 나머지 — 칩 줄 뒤쪽에 */
export function pcDetailKeys(condCategory: string, isAuctionMode: boolean): string[] {
  const chips = pcChipKeys(condCategory, isAuctionMode);
  return pcAllConditionKeys(condCategory, isAuctionMode).filter((k) => !chips.includes(k));
}

/** 금액(원) → "3억" · "1억 5천" · "5천" · "50만" */
export function fmtWon(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const man = Math.round(v / 10000);
  if (man >= 10000) {
    const eok = Math.floor(man / 10000);
    const rest = man % 10000;
    return rest === 0 ? `${eok}억` : rest % 1000 === 0 ? `${eok}억 ${rest / 1000}천` : `${eok}억 ${rest.toLocaleString()}만`;
  }
  if (man >= 1000 && man % 1000 === 0) return `${man / 1000}천`;
  return `${man.toLocaleString()}만`;
}
const rangeText = (min: number | null, max: number | null, f: (v: number) => string) =>
  min === null && max === null ? "" : `${min !== null ? f(min) : ""}~${max !== null ? f(max) : ""}`;

const DIRECTIONS = ["남향", "남동향", "남서향", "동향", "서향", "북향", "북동향", "북서향"]; // 등록 화면 값 그대로
const PARKINGS = ["1대", "2대", "3대", "4대", "5대이상", "없음"]; // 등록 화면 값 그대로
const FLOORS = ["1층", "저층", "중간층", "고층", "탑층"];
const OWNER_ROLES = [{ label: "전체", val: null }, { label: "중개사", val: "REALTOR" }, { label: "임대인·일반", val: "OWNER" }];
const COMMISSIONS = [{ label: "전체", val: null }, { label: "공동중개 가능", val: "공동중개" }, { label: "수수료 25% 이상", val: "25" }, { label: "수수료 50% 이상", val: "50" }, { label: "수수료 100%(법정)", val: "100" }];
const PRICE_POINTS: [string, number][] = [
  ["5천", 5e7], ["6천", 6e7], ["7천", 7e7], ["8천", 8e7], ["9천", 9e7], ["1억", 1e8],
  ["2억", 2e8], ["3억", 3e8], ["4억", 4e8], ["5억", 5e8], ["6억", 6e8], ["7억", 7e8],
  ["8억", 8e8], ["9억", 9e8], ["10억", 1e9], ["11억", 1.1e9], ["12억", 1.2e9], ["13억", 1.3e9],
  ["14억", 1.4e9], ["15억", 1.5e9], ["16억", 1.6e9], ["17억", 1.7e9], ["18억", 1.8e9],
];
const RENT_POINTS: [string, number][] = [
  ["10", 1e5], ["20", 2e5], ["30", 3e5], ["40", 4e5], ["50", 5e5], ["60", 6e5],
  ["70", 7e5], ["80", 8e5], ["90", 9e5], ["1백", 1e6], ["2백", 2e6],
];
const AUCTION_POINTS: [string, number][] = [
  ["5천", 5e7], ["1억", 1e8], ["2억", 2e8], ["3억", 3e8], ["5억", 5e8], ["7억", 7e8],
  ["10억", 1e9], ["15억", 1.5e9], ["20억", 2e9], ["30억", 3e9], ["50억", 5e9],
];
// 면적 칸 (평) — [아래, 위) · null 은 끝없음
const AREA_BUCKETS: { label: string; lo: number | null; hi: number | null }[] = [
  { label: "~10평", lo: null, hi: 10 }, { label: "10평대", lo: 10, hi: 20 }, { label: "20평대", lo: 20, hi: 30 },
  { label: "30평대", lo: 30, hi: 40 }, { label: "40평대", lo: 40, hi: 50 }, { label: "50평대", lo: 50, hi: 60 },
  { label: "60평대", lo: 60, hi: 70 }, { label: "70평~", lo: 70, hi: null },
];
const PY = 3.3; // 상세검색 창과 같은 환산(평 × 3.3 = ㎡) — 두 창 값이 같은 평으로 보이게

type Props = {
  isAuctionMode: boolean;
  condCategory: string;
  allowedTradeTypes: string[];
  optionList: string[];
  themeList: string[];
  /** useGongsilFilterState 값·바꾸기 함수 그대로 */
  s: Record<string, any>;
};

export default function ConditionChips({ isAuctionMode, condCategory, allowedTradeTypes, optionList, themeList, s }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // 바깥을 누르면 닫는다
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(null); };
    // 지도(카카오)가 누름을 가로채도 닫히게 — 잡는 단계(capture)에서 본다
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [open]);
  // 칸이 바뀌면 닫는다
  useEffect(() => { setOpen(null); }, [condCategory, isAuctionMode]);

  // ── 값 바꾸기 (상세검색 창 [적용] 과 같은 상태를 바로) ──
  const setTrade = (next: string[]) => { s.setFilterTradeTypes(next); s.setTempFilterTradeTypes(next); };
  const setPrice = (min: number | null, max: number | null) => {
    // 매매가 · 전세가 · 보증금 · 분양가 한 범위 — 상세검색 창의 매매가 · 보증금 둘 다
    s.setAppliedMaemaeMin(min); s.setAppliedMaemaeMax(max); s.setTempMaemaeMin(min); s.setTempMaemaeMax(max);
    s.setAppliedDepositMin(min); s.setAppliedDepositMax(max); s.setTempDepositMin(min); s.setTempDepositMax(max);
  };
  const setRent = (min: number | null, max: number | null) => { s.setAppliedRentMin(min); s.setAppliedRentMax(max); s.setTempRentMin(min); s.setTempRentMax(max); };
  const priceMin: number | null = s.appliedMaemaeMin ?? s.appliedDepositMin ?? null;
  const priceMax: number | null = s.appliedMaemaeMax ?? s.appliedDepositMax ?? null;

  // ── 칩 글자 · 켜짐 ──
  const chip = (key: string): { label: string; on: boolean } => {
    switch (key) {
      case "거래방식": return { label: s.filterTradeTypes.length ? s.filterTradeTypes.map((t: string) => (t === "단기" ? "단기임대" : t)).join("·") : "거래방식", on: s.filterTradeTypes.length > 0 };
      case "가격대": {
        const p = rangeText(priceMin, priceMax, fmtWon);
        const r = rangeText(s.appliedRentMin, s.appliedRentMax, fmtWon);
        const txt = [p, r ? `월 ${r}` : ""].filter(Boolean).join(" · ");
        return { label: txt || "가격대", on: Boolean(txt) };
      }
      case "면적": {
        const t = rangeText(s.filterAreaMin, s.filterAreaMax, (v) => `${Math.round(v / PY)}평`);
        return { label: t || "면적", on: Boolean(t) };
      }
      case "사용승인일": {
        const a = s.filterYearMin, b = s.filterYearMax;
        if (a === null && b === null) return { label: "사용승인일", on: false };
        if (a !== null && b === null) return { label: a > THIS_YEAR ? "입주예정" : `${THIS_YEAR - a}년 이내`, on: true };
        return { label: `${a ?? ""}~${b ?? ""}년`, on: true };
      }
      case "세대수": {
        const t = rangeText(s.filterUnitMin, s.filterUnitMax, (v) => `${v}세대`);
        return { label: t || "세대수", on: Boolean(t) };
      }
      case "방/욕실수": {
        const parts = [s.filterRoomCount !== null ? `방 ${s.filterRoomCount}개+` : "", s.filterBathCount !== null ? `욕실 ${s.filterBathCount}개+` : ""].filter(Boolean);
        return { label: parts.join(" · ") || "방/욕실", on: parts.length > 0 };
      }
      case "층수": return { label: s.filterFloor || "층수", on: Boolean(s.filterFloor) };
      case "관리비": return { label: s.filterMaintIdx > 0 ? `관리비 ${MAINT_PRESETS[s.filterMaintIdx].label}` : "관리비", on: s.filterMaintIdx > 0 };
      case "방향": return { label: s.filterDirection || "방향", on: Boolean(s.filterDirection) };
      case "주차": return { label: s.filterParking ? `주차 ${s.filterParking}` : "주차", on: Boolean(s.filterParking) };
      case "기타옵션": return { label: s.filterOptions.length ? `옵션 ${s.filterOptions.length}` : "옵션", on: s.filterOptions.length > 0 };
      case "테마": return { label: s.filterThemes.length ? `테마 ${s.filterThemes.length}` : "테마", on: s.filterThemes.length > 0 };
      case "등록자": return { label: OWNER_ROLES.find((o) => o.val === s.filterOwnerRole)?.val ? OWNER_ROLES.find((o) => o.val === s.filterOwnerRole)!.label : "등록자", on: Boolean(s.filterOwnerRole) };
      case "중개보수": return { label: s.filterCommissionType ? COMMISSIONS.find((o) => o.val === s.filterCommissionType)?.label || "중개보수" : "중개보수", on: Boolean(s.filterCommissionType) };
      case "감정가": { const t = rangeText(s.filterAuctionAppraisalMin, s.filterAuctionAppraisalMax, fmtWon); return { label: t ? `감정가 ${t}` : "감정가", on: Boolean(t) }; }
      case "최저입찰가": { const t = rangeText(s.filterAuctionBidPriceMin, s.filterAuctionBidPriceMax, fmtWon); return { label: t ? `최저가 ${t}` : "최저입찰가", on: Boolean(t) }; }
      case "할인율": return { label: s.filterAuctionDiscount > 0 ? `할인 ${s.filterAuctionDiscount}%↑` : "할인율", on: s.filterAuctionDiscount > 0 };
      case "유찰횟수": {
        const v = String(s.filterAuctionBidCount);
        return { label: v === "all" ? "유찰횟수" : v === "0" ? "신건" : v === "4" ? "유찰 4회↑" : `유찰 ${v}회`, on: v !== "all" };
      }
      case "입찰일": return { label: s.filterAuctionStartDate !== "all" ? BID_DATES.find((d) => d.val === s.filterAuctionStartDate)?.label || "입찰일" : "입찰일", on: s.filterAuctionStartDate !== "all" };
      default: return { label: key, on: false };
    }
  };

  // ── 작은 창 내용 ──
  const body = (key: string): { title: string; width: number; clear?: () => void; node: React.ReactNode } => {
    switch (key) {
      case "거래방식": {
        const all = allowedTradeTypes;
        const sel: string[] = s.filterTradeTypes.filter((t: string) => all.includes(t));
        const isAll = sel.length === 0;
        return {
          title: "거래방식", width: 260,
          node: (
            <>
              <Check label="전체" checked={isAll} onChange={() => setTrade([])} />
              {all.map((t) => (
                <Check key={t} label={t === "단기" ? "단기임대" : t} checked={sel.includes(t)} onChange={() => setTrade(sel.includes(t) ? sel.filter((x) => x !== t) : [...sel, t])} />
              ))}
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>중복선택이 가능합니다.</div>
            </>
          ),
        };
      }
      case "가격대": {
        const showRent = allowedTradeTypes.some((t) => t === "월세" || t === "단기");
        return {
          title: "가격대", width: 440, clear: () => { setPrice(null, null); setRent(null, null); },
          node: (
            <>
              <SectionTitle text="매매가 / 전세가 / 보증금 / 분양가" value={rangeText(priceMin, priceMax, fmtWon) || "전체"} />
              <PointGrid points={PRICE_POINTS} openEnd="18억~" min={priceMin} max={priceMax} onChange={setPrice} />
              <MinMaxInputs min={priceMin} max={priceMax} step={1000} onChange={setPrice} />
              {showRent && (
                <>
                  <div style={{ height: 1, background: "#eee", margin: "14px 0" }} />
                  <SectionTitle text="월세 (만원)" value={rangeText(s.appliedRentMin, s.appliedRentMax, fmtWon) || "전체"} />
                  <PointGrid points={RENT_POINTS} openEnd="2백~" min={s.appliedRentMin} max={s.appliedRentMax} onChange={setRent} />
                  <MinMaxInputs min={s.appliedRentMin} max={s.appliedRentMax} step={5} onChange={setRent} />
                </>
              )}
            </>
          ),
        };
      }
      case "면적": return { title: "면적", width: 400, clear: () => { s.setFilterAreaMin(null); s.setFilterAreaMax(null); }, node: <AreaBody s={s} /> };
      case "사용승인일": {
        const presets: { label: string; min: number | null }[] = [
          { label: "전체", min: null }, { label: "입주예정", min: THIS_YEAR + 1 }, ...[2, 4, 10, 15, 20, 25, 30].map((n) => ({ label: `${n}년 이내`, min: THIS_YEAR - n })),
        ];
        return {
          title: "사용승인일", width: 380, clear: () => { s.setFilterYearMin(null); s.setFilterYearMax(null); },
          node: (
            <>
              <SectionTitle text="사용승인일" value={chip("사용승인일").on ? chip("사용승인일").label : "전체"} />
              <DualSlider scale={YEAR_SCALE} min={s.filterYearMin} max={s.filterYearMax} fmt={(v) => `${v}년`} onChange={(a, b) => { s.setFilterYearMin(a); s.setFilterYearMax(b); }} />
              <Grid cols={3}>
                {presets.map((p) => (
                  <GridBtn key={p.label} on={p.min === null ? s.filterYearMin === null && s.filterYearMax === null : s.filterYearMin === p.min && s.filterYearMax === null} onClick={() => { s.setFilterYearMin(p.min); s.setFilterYearMax(null); }}>{p.label}</GridBtn>
                ))}
              </Grid>
            </>
          ),
        };
      }
      case "세대수":
        return {
          title: "세대수", width: 360, clear: () => { s.setFilterUnitMin(null); s.setFilterUnitMax(null); },
          node: (
            <>
              <SectionTitle text="세대수" value={rangeText(s.filterUnitMin, s.filterUnitMax, (v) => `${v}세대`) || "전체"} />
              <DualSlider scale={UNIT_SCALE} min={s.filterUnitMin} max={s.filterUnitMax} fmt={(v) => `${v}세대`} onChange={(a, b) => { s.setFilterUnitMin(a); s.setFilterUnitMax(b); }} />
              <Grid cols={3}>
                {[100, 300, 500, 700, 1000, 2000].map((n) => (
                  <GridBtn key={n} on={s.filterUnitMin === n && s.filterUnitMax === null} onClick={() => { s.setFilterUnitMin(n); s.setFilterUnitMax(null); }}>{n}세대 이상</GridBtn>
                ))}
              </Grid>
            </>
          ),
        };
      case "방/욕실수":
        return {
          title: "방/욕실수", width: 320, clear: () => { s.setFilterRoomCount(null); s.setFilterBathCount(null); },
          node: (
            <>
              <SectionTitle text="방 수" />
              <Radios options={[{ label: "전체", val: null }, { label: "1개+", val: 1 }, { label: "2개+", val: 2 }, { label: "3개+", val: 3 }, { label: "4개+", val: 4 }]} value={s.filterRoomCount} onChange={s.setFilterRoomCount} cols={5} />
              <div style={{ height: 12 }} />
              <SectionTitle text="욕실 수" />
              <Radios options={[{ label: "전체", val: null }, { label: "1개+", val: 1 }, { label: "2개+", val: 2 }, { label: "3개+", val: 3 }, { label: "4개+", val: 4 }]} value={s.filterBathCount} onChange={s.setFilterBathCount} cols={5} />
            </>
          ),
        };
      case "층수":
        return { title: "층수", width: 280, node: <Radios options={[{ label: "전체", val: null }, ...FLOORS.map((f) => ({ label: f, val: f }))]} value={s.filterFloor} onChange={s.setFilterFloor} cols={3} /> };
      case "관리비":
        return { title: "관리비 (월)", width: 300, node: <Radios options={MAINT_PRESETS.map((m, i) => ({ label: m.label, val: i }))} value={s.filterMaintIdx} onChange={s.setFilterMaintIdx} cols={2} /> };
      case "방향":
        return { title: "방향", width: 320, node: <Radios options={[{ label: "전체", val: null }, ...DIRECTIONS.map((d) => ({ label: d, val: d }))]} value={s.filterDirection} onChange={s.setFilterDirection} cols={3} /> };
      case "주차":
        return { title: "주차", width: 300, node: <Radios options={[{ label: "전체", val: null }, ...PARKINGS.map((p) => ({ label: p, val: p }))]} value={s.filterParking} onChange={s.setFilterParking} cols={3} /> };
      case "기타옵션":
        return {
          title: "기타옵션", width: 340, clear: () => s.setFilterOptions([]),
          node: (
            <Grid cols={2}>
              {optionList.map((o) => (
                <Check key={o} label={o} checked={s.filterOptions.includes(o)} onChange={() => s.setFilterOptions(s.filterOptions.includes(o) ? s.filterOptions.filter((x: string) => x !== o) : [...s.filterOptions, o])} />
              ))}
            </Grid>
          ),
        };
      case "테마":
        return {
          title: "테마", width: 340, clear: () => s.setFilterThemes([]),
          node: (
            <Grid cols={2}>
              {themeList.map((t) => (
                <Check key={t} label={`#${t}`} checked={s.filterThemes.includes(t)} onChange={() => s.setFilterThemes(s.filterThemes.includes(t) ? s.filterThemes.filter((x: string) => x !== t) : [...s.filterThemes, t])} />
              ))}
            </Grid>
          ),
        };
      case "등록자":
        return { title: "등록자", width: 280, node: <Radios options={OWNER_ROLES} value={s.filterOwnerRole} onChange={s.setFilterOwnerRole} cols={3} /> };
      case "중개보수":
        return { title: "중개보수", width: 320, node: <Radios options={COMMISSIONS} value={s.filterCommissionType} onChange={s.setFilterCommissionType} cols={1} /> };
      case "감정가":
      case "최저입찰가": {
        const isA = key === "감정가";
        const mn = isA ? s.filterAuctionAppraisalMin : s.filterAuctionBidPriceMin;
        const mx = isA ? s.filterAuctionAppraisalMax : s.filterAuctionBidPriceMax;
        const set = (a: number | null, b: number | null) => {
          if (isA) { s.setFilterAuctionAppraisalMin(a); s.setFilterAuctionAppraisalMax(b); } else { s.setFilterAuctionBidPriceMin(a); s.setFilterAuctionBidPriceMax(b); }
        };
        return {
          title: key, width: 420, clear: () => set(null, null),
          node: (
            <>
              <SectionTitle text={key} value={rangeText(mn, mx, fmtWon) || "전체"} />
              <PointGrid points={AUCTION_POINTS} openEnd="50억~" min={mn} max={mx} onChange={set} />
              <MinMaxInputs min={mn} max={mx} step={1000} onChange={set} />
            </>
          ),
        };
      }
      case "할인율":
        return { title: "할인율 (감정가 대비)", width: 300, node: <Radios options={[{ label: "전체", val: 0 }, ...[10, 20, 30, 40, 50, 60].map((n) => ({ label: `${n}% 이상`, val: n }))]} value={s.filterAuctionDiscount} onChange={s.setFilterAuctionDiscount} cols={3} /> };
      case "유찰횟수":
        return { title: "유찰횟수", width: 300, node: <Radios options={[{ label: "전체", val: "all" }, { label: "신건", val: "0" }, { label: "1회", val: "1" }, { label: "2회", val: "2" }, { label: "3회", val: "3" }, { label: "4회 이상", val: "4" }]} value={String(s.filterAuctionBidCount)} onChange={s.setFilterAuctionBidCount} cols={3} /> };
      case "입찰일":
        return { title: "입찰일", width: 300, node: <Radios options={BID_DATES} value={s.filterAuctionStartDate} onChange={s.setFilterAuctionStartDate} cols={2} /> };
      default:
        return { title: key, width: 260, node: null };
    }
  };

  // 칸 조건 전부를 칩으로 (2026-11-17 사장님: [상세매물검색] 없이) — 자주 쓰는 것 먼저(네이버 순서), 그다음 나머지
  const keys = [...pcChipKeys(condCategory, isAuctionMode), ...pcDetailKeys(condCategory, isAuctionMode)];
  // ↺ 조건삭제 — 상세조건 전부 (알약은 그대로)
  const clearAll = () => {
    setTrade([]); setPrice(null, null); setRent(null, null);
    s.setFilterPriceMin(null); s.setFilterPriceMax(null);
    s.setFilterAreaMin(null); s.setFilterAreaMax(null);
    s.setFilterYearMin(null); s.setFilterYearMax(null);
    s.setFilterUnitMin(null); s.setFilterUnitMax(null);
    s.setFilterRoomCount(null); s.setFilterBathCount(null);
    s.setFilterFloor(null); s.setFilterMaintIdx(0); s.setFilterDirection(null); s.setFilterParking(null);
    s.setFilterOptions([]); s.setFilterThemes([]); s.setFilterOwnerRole(null); s.setFilterCommissionType(null);
    s.setFilterSaleStage([]); s.setFilterSaleType([]);
    s.setFilterAuctionAppraisalMin(null); s.setFilterAuctionAppraisalMax(null);
    s.setFilterAuctionBidPriceMin(null); s.setFilterAuctionBidPriceMax(null);
    s.setFilterAuctionDiscount(0); s.setFilterAuctionBidCount("all"); s.setFilterAuctionStartDate("all");
  };
  const anyOn = keys.some((k) => chip(k).on);
  return (
    <div ref={rootRef} style={{ display: "contents" }}>
      {keys.map((k) => {
        // 거래가 하나뿐인 칸(빌딩/건물 매매 = 매매만)은 누를 수 없는 고정 칩 (2026-11-17 사장님)
        if (k === "거래방식" && allowedTradeTypes.length === 1) {
          return (
            <span key={k} style={{ background: "#e8f0fe", border: `1px solid ${BLUE}`, fontSize: 13, color: BLUE, padding: "6px 14px", borderRadius: 20, whiteSpace: "nowrap", fontWeight: "bold", flexShrink: 0, cursor: "default" }}>
              {allowedTradeTypes[0] === "단기" ? "단기임대" : allowedTradeTypes[0]}
            </span>
          );
        }
        const c = chip(k);
        const active = open === k;
        return (
          <div key={k} style={{ position: "relative", flexShrink: 0 }}>
            <button
              onClick={() => setOpen(active ? null : k)}
              style={{
                background: c.on || active ? "#e8f0fe" : "#fff",
                border: `1px solid ${c.on || active ? BLUE : "#ccc"}`,
                fontSize: 13,
                color: c.on || active ? BLUE : "#333",
                cursor: "pointer",
                padding: "6px 14px",
                borderRadius: 20,
                whiteSpace: "nowrap",
                fontWeight: c.on ? "bold" : "normal",
                fontFamily: "inherit",
                transition: "all 0.15s",
                maxWidth: 220,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {c.label} {active ? "▴" : "▾"}
            </button>
            {active && <Popover {...body(k)} onClose={() => setOpen(null)} />}
          </div>
        );
      })}
      {/* 끝 ↺ 조건삭제 — 걸린 조건이 있을 때만, 상세조건 전부 지움 (알약은 그대로) */}
      {anyOn && (
        <button
          onClick={() => { clearAll(); setOpen(null); }}
          style={{ background: "none", border: "none", fontSize: 13, color: "#6b7280", cursor: "pointer", padding: "6px 4px", whiteSpace: "nowrap", fontFamily: "inherit", flexShrink: 0 }}
        >
          ↺ 조건삭제
        </button>
      )}
    </div>
  );
}

const BID_DATES = [
  { label: "전체", val: "all" }, { label: "1주 이내", val: "1w" }, { label: "2주 이내", val: "2w" },
  { label: "1달 이내", val: "1m" }, { label: "1~3개월", val: "1_3m" }, { label: "3개월 이후", val: "over_3m" },
];

// ── 작은 부품 ──

function Popover({ title, width, clear, node, onClose }: { title: string; width: number; clear?: () => void; node: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);
  // 화면 오른쪽 끝을 넘으면 왼쪽으로 민다
  useLayoutEffect(() => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const over = r.right - (window.innerWidth - 12);
    if (over > 0) setShift(-over);
  }, []);
  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        left: shift,
        zIndex: 1100, // 지도 위
        width,
        maxWidth: "calc(100vw - 24px)",
        background: "#fff",
        border: "1px solid #e0e0e0",
        borderRadius: 8,
        boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
        padding: "14px 16px",
        fontSize: 13,
        color: "#333",
        cursor: "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#111" }}>{title}</span>
        <button onClick={onClose} aria-label="닫기" style={{ background: "none", border: "none", fontSize: 16, color: "#888", cursor: "pointer", padding: 2 }}>✕</button>
      </div>
      {/* 긴 내용은 안에서 스크롤 — 화면 아래로 넘치지 않게 */}
      <div style={{ maxHeight: "min(62vh, 560px)", overflowY: "auto" }}>{node}</div>
      {clear && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button onClick={clear} style={{ background: "none", border: "1px solid #ccc", borderRadius: 4, padding: "5px 10px", fontSize: 12, color: "#555", cursor: "pointer", fontFamily: "inherit" }}>↺ 조건삭제</button>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ text, value }: { text: string; value?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
      <span style={{ fontWeight: 700, color: "#374151" }}>{text}</span>
      {value !== undefined && <span style={{ fontWeight: 800, color: NAVY }}>{value}</span>}
    </div>
  );
}

function Grid({ cols, children }: { cols: number; children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 6 }}>{children}</div>;
}

function GridBtn({ on, mid, onClick, children }: { on: boolean; mid?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 2px",
        border: `1px solid ${on ? BLUE : "#e5e7eb"}`,
        borderRadius: 4,
        background: on ? BLUE : mid ? "#e8f0fe" : "#fff",
        color: on ? "#fff" : mid ? BLUE : "#333",
        fontSize: 12,
        fontWeight: on ? 700 : 500,
        cursor: "pointer",
        fontFamily: "inherit",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", cursor: "pointer", userSelect: "none" }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ width: 16, height: 16, accentColor: BLUE, cursor: "pointer" }} />
      {label}
    </label>
  );
}

function Radios<T>({ options, value, onChange, cols }: { options: { label: string; val: T }[]; value: T; onChange: (v: T) => void; cols: number }) {
  return (
    <Grid cols={cols}>
      {options.map((o) => (
        <label key={o.label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
          <input type="radio" checked={value === o.val} onChange={() => onChange(o.val)} style={{ width: 15, height: 15, accentColor: BLUE, cursor: "pointer" }} />
          {o.label}
        </label>
      ))}
    </Grid>
  );
}

/** 금액 칸 — 첫 번째 누름 = 최소, 두 번째 누름 = 최대 (네이버처럼). openEnd 는 "그 이상" */
function PointGrid({ points, openEnd, min, max, onChange }: { points: [string, number][]; openEnd: string; min: number | null; max: number | null; onChange: (a: number | null, b: number | null) => void }) {
  const [waitingMax, setWaitingMax] = useState(false);
  const last = points[points.length - 1][1];
  const pick = (v: number) => {
    if (!waitingMax) { onChange(v, null); setWaitingMax(true); return; }
    if (min !== null && v < min) onChange(v, min); else onChange(min, v);
    setWaitingMax(false);
  };
  const inRange = (v: number) => min !== null && max !== null && v > min && v < max;
  return (
    <Grid cols={6}>
      {points.map(([label, v]) => (
        <GridBtn key={label} on={v === min || v === max} mid={inRange(v)} onClick={() => pick(v)}>{label}</GridBtn>
      ))}
      <GridBtn on={min === last && max === null && !waitingMax} onClick={() => { onChange(last, null); setWaitingMax(false); }}>{openEnd}</GridBtn>
    </Grid>
  );
}

/** [− 최소 +] ~ [− 최대 +] (만원 단위, 직접 입력 가능) */
function MinMaxInputs({ min, max, step, onChange }: { min: number | null; max: number | null; step: number; onChange: (a: number | null, b: number | null) => void }) {
  // 천 단위 쉼표 (2026-11-17 사장님: 5,000 처럼) — 입력할 때는 쉼표를 빼고 읽는다(fromMan)
  const toMan = (v: number | null) => (v === null ? "" : Math.round(v / 10000).toLocaleString("ko-KR"));
  const fromMan = (t: string) => { const n = parseInt(t.replace(/[^0-9]/g, ""), 10); return isNaN(n) ? null : n * 10000; };
  const box = (val: number | null, set: (v: number | null) => void, ph: string) => (
    <div style={{ display: "flex", alignItems: "center", border: "1px solid #d1d5db", borderRadius: 4, overflow: "hidden", flex: 1 }}>
      <button onClick={() => set(Math.max(0, (val ?? 0) - step * 10000) || null)} style={stepBtn}>−</button>
      <input value={toMan(val)} placeholder={ph} inputMode="numeric" onChange={(e) => set(fromMan(e.target.value))} style={{ width: "100%", minWidth: 0, border: "none", outline: "none", textAlign: "center", fontSize: 13, padding: "6px 0", fontFamily: "inherit" }} />
      <button onClick={() => set((val ?? 0) + step * 10000)} style={stepBtn}>+</button>
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
      {box(min, (v) => onChange(v, max), "최소")}
      <span style={{ color: "#999" }}>~</span>
      {box(max, (v) => onChange(min, v), "최대")}
      <span style={{ fontSize: 12, color: "#888", whiteSpace: "nowrap" }}>만원</span>
    </div>
  );
}
const stepBtn: React.CSSProperties = { border: "none", background: "#f3f4f6", width: 26, alignSelf: "stretch", cursor: "pointer", fontSize: 14, color: "#555" };

/** 두 손잡이 막대 (눈금 scale 위) — 처음·끝 눈금은 "끝없음"(null) */
function DualSlider({ scale, min, max, fmt, onChange }: { scale: number[]; min: number | null; max: number | null; fmt: (v: number) => string; onChange: (a: number | null, b: number | null) => void }) {
  const idx = (v: number | null, isMax: boolean) => {
    if (v === null) return isMax ? scale.length - 1 : 0;
    let best = 0;
    scale.forEach((x, i) => { if (Math.abs(x - v) < Math.abs(scale[best] - v)) best = i; });
    return best;
  };
  const a = idx(min, false), b = idx(max, true);
  const last = scale.length - 1;
  return (
    <div style={{ margin: "6px 4px 14px" }}>
      <style>{`
        .gs-cc-range { position: relative; height: 4px; background: #e5e7eb; border-radius: 2px; margin: 14px 0 8px; }
        .gs-cc-range input { position: absolute; left: 0; top: -8px; width: 100%; height: 20px; margin: 0; background: none; pointer-events: none; -webkit-appearance: none; appearance: none; }
        .gs-cc-range input::-webkit-slider-thumb { pointer-events: auto; -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 2px solid ${NAVY}; cursor: pointer; }
        .gs-cc-range input::-moz-range-thumb { pointer-events: auto; width: 16px; height: 16px; border-radius: 50%; background: #fff; border: 2px solid ${NAVY}; cursor: pointer; }
      `}</style>
      <div className="gs-cc-range">
        <div style={{ position: "absolute", height: "100%", background: NAVY, borderRadius: 2, left: `${(a / last) * 100}%`, right: `${100 - (b / last) * 100}%` }} />
        <input type="range" min={0} max={last} value={a} onChange={(e) => { const v = Math.min(parseInt(e.target.value, 10), b); onChange(v === 0 ? null : scale[v], max); }} />
        <input type="range" min={0} max={last} value={b} onChange={(e) => { const v = Math.max(parseInt(e.target.value, 10), a); onChange(min, v === last ? null : scale[v]); }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9ca3af" }}>
        <span>{min === null ? "최소" : fmt(min)}</span>
        <span>{max === null ? "최대" : fmt(max)}</span>
      </div>
    </div>
  );
}

// 면적 막대 눈금 — 상세검색 창 AREA_SCALE(평)을 ㎡ 로 (필터 값은 ㎡)
const AREA_M2_SCALE = AREA_SCALE.map((p) => p * PY);

/** 면적 — ㎡/평 바꿔 보기 · 막대 · 평 칸(첫 번째 누름 = 그 칸, 두 번째 누름 = 두 칸 사이 전부) */
function AreaBody({ s }: { s: Record<string, any> }) {
  const [unit, setUnit] = useState<"평" | "㎡">("평");
  const [anchor, setAnchor] = useState<number | null>(null);
  const toM2 = (py: number | null) => (py === null ? null : Math.round(py * PY));
  const set = (a: number | null, b: number | null) => { s.setFilterAreaMin(a); s.setFilterAreaMax(b); };
  const fmt = (m2: number) => (unit === "평" ? `${Math.round(m2 / PY)}평` : `${Math.round(m2)}㎡`);
  const pick = (i: number) => {
    const bk = AREA_BUCKETS[i];
    if (anchor === null || anchor === i) { set(toM2(bk.lo), toM2(bk.hi)); setAnchor(i); return; }
    const lo = Math.min(anchor, i), hi = Math.max(anchor, i);
    set(toM2(AREA_BUCKETS[lo].lo), toM2(AREA_BUCKETS[hi].hi));
    setAnchor(null);
  };
  const minPy = s.filterAreaMin === null ? null : s.filterAreaMin / PY;
  const maxPy = s.filterAreaMax === null ? null : s.filterAreaMax / PY;
  const covered = (bk: (typeof AREA_BUCKETS)[number]) =>
    (minPy !== null || maxPy !== null) &&
    (minPy === null || (bk.lo ?? 0) >= minPy - 0.5) &&
    (maxPy === null || (bk.hi ?? Infinity) <= maxPy + 0.5);
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontWeight: 800, color: NAVY }}>{rangeText(s.filterAreaMin, s.filterAreaMax, fmt) || "전체"}</span>
        <div style={{ display: "flex", border: "1px solid #d1d5db", borderRadius: 4, overflow: "hidden" }}>
          {(["㎡", "평"] as const).map((u) => (
            <button key={u} onClick={() => setUnit(u)} style={{ border: "none", padding: "3px 10px", fontSize: 12, cursor: "pointer", background: unit === u ? NAVY : "#fff", color: unit === u ? "#fff" : "#555", fontFamily: "inherit" }}>{u}</button>
          ))}
        </div>
      </div>
      <DualSlider scale={AREA_M2_SCALE} min={s.filterAreaMin} max={s.filterAreaMax} fmt={fmt} onChange={set} />
      <Grid cols={4}>
        {AREA_BUCKETS.map((bk, i) => (
          <GridBtn key={bk.label} on={anchor === i || covered(bk)} onClick={() => pick(i)}>
            {unit === "평" ? bk.label : `${bk.lo === null ? "~" : Math.round(bk.lo * PY)}${bk.hi === null ? "㎡~" : `~${Math.round(bk.hi * PY)}㎡`}`}
          </GridBtn>
        ))}
      </Grid>
    </>
  );
}
