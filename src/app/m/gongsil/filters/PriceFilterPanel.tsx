import React from 'react';
import { FilterState } from './useVacancyFilters';

interface Props {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
}

export default function PriceFilterPanel({ filters, onFilterChange }: Props) {
  const tradeTypes = filters.tradeTypes.filter(type => ["매매", "전세", "월세", "단기"].includes(type));

  const range = (label: string, minKey: keyof FilterState, maxKey: keyof FilterState, max: number) => {
    const min = Number(filters[minKey] ?? 0);
    const maxValue = Number(filters[maxKey] ?? max);
    const step = max === 10000 ? 500 : 5000;
    const minPercent = (min / max) * 100;
    const maxPercent = (maxValue / max) * 100;
    const setMin = (value: number) => onFilterChange({ [minKey]: value <= 0 ? null : Math.min(value, maxValue - step) });
    const setMax = (value: number) => onFilterChange({ [maxKey]: value >= max ? null : Math.max(value, min + step) });
    return <div style={{ padding: "14px 0", borderBottom: "1px solid #f3f4f6" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>{label}</div>
        <div style={{ color: "#1a4282", fontSize: 13, fontWeight: 800 }}>{min === 0 && maxValue >= max ? "전체" : `${min.toLocaleString()}만 ~ ${maxValue >= max ? "최대" : `${maxValue.toLocaleString()}만`}`}</div>
      </div>
      <div style={{ position: "relative", height: 38, display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", left: 0, right: 0, height: 5, background: "#e5e7eb", borderRadius: 3 }} />
        <div style={{ position: "absolute", left: `${minPercent}%`, width: `${Math.max(0, maxPercent - minPercent)}%`, height: 5, background: "#1a4282", borderRadius: 3 }} />
        <input type="range" min={0} max={max} step={step} value={min} onChange={e => setMin(Number(e.target.value))} style={{ position: "absolute", width: "100%", pointerEvents: "none", WebkitAppearance: "none", appearance: "none", background: "none", margin: 0, zIndex: 3 }} className="mobile-price-min" />
        <input type="range" min={0} max={max} step={step} value={maxValue} onChange={e => setMax(Number(e.target.value))} style={{ position: "absolute", width: "100%", pointerEvents: "none", WebkitAppearance: "none", appearance: "none", background: "none", margin: 0, zIndex: 4 }} className="mobile-price-max" />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", fontWeight: 600 }}><span>최소</span><span>{max === 10000 ? "20만" : "1억"}</span><span>{max === 10000 ? "50만" : "5억"}</span><span>{max === 10000 ? "150만" : "15억"}</span><span>최대</span></div>
    </div>;
  };

  return <div style={{ padding: "10px 0" }}>
    {tradeTypes.length === 0 && <div style={{ color: "#9ca3af", padding: "20px 0", textAlign: "center" }}>거래유형을 먼저 선택해주세요.</div>}
    {tradeTypes.includes("매매") && range("매매가", "salePriceMin", "salePriceMax", 100000)}
    {(tradeTypes.includes("전세") || tradeTypes.includes("월세") || tradeTypes.includes("단기")) && range("보증금", "depositMin", "depositMax", 100000)}
    {(tradeTypes.includes("월세") || tradeTypes.includes("단기")) && range("월세", "monthlyRentMin", "monthlyRentMax", 10000)}
    <style>{`.mobile-price-min::-webkit-slider-thumb,.mobile-price-max::-webkit-slider-thumb{pointer-events:auto!important;-webkit-appearance:none;appearance:none;width:24px;height:24px;border-radius:50%;background:#fff;border:2px solid #1a4282;box-shadow:0 2px 6px rgba(0,0,0,.2);cursor:pointer}.mobile-price-min::-moz-range-thumb,.mobile-price-max::-moz-range-thumb{width:24px;height:24px;border-radius:50%;background:#fff;border:2px solid #1a4282;cursor:pointer}`}</style>
    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}><button onClick={() => onFilterChange({ priceMin: null, priceMax: null, salePriceMin: null, salePriceMax: null, depositMin: null, depositMax: null, monthlyRentMin: null, monthlyRentMax: null })} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>↻ 조건삭제</button></div>
  </div>;
}
