import React from 'react';
import { FilterState } from './useVacancyFilters';

interface Props {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
}

const YEAR_PRESETS = [
  { label: '1년 이내', min: new Date().getFullYear() - 1, max: null },
  { label: '5년 이내', min: new Date().getFullYear() - 5, max: null },
  { label: '10년 이내', min: new Date().getFullYear() - 10, max: null },
  { label: '15년 이내', min: new Date().getFullYear() - 15, max: null },
  { label: '15년 이상', min: null, max: new Date().getFullYear() - 15 },
];

const FLOOR_PRESETS = ['1층', '2층이상', '반지하/지하', '옥탑'];

const OWNER_PRESETS = [
  { label: '전체', value: null },
  { label: '일반인', value: 'USER' },
  { label: '부동산', value: 'REALTOR' },
];

const COMMISSION_PRESETS = [
  { label: '전체', value: null },
  { label: '공동중개', value: '공동중개' },
  { label: '25%~', value: '25' },
  { label: '50%~', value: '50' },
  { label: '75%~', value: '75' },
  { label: '100%(법정)', value: '100' },
];

const THEME_PRESETS = [
  '급매', '추천매물', '신축급', '올수리', '한강뷰', '역세권', '풀옵션',
  '가성비', '단기임대', '주차편리', '대로변안전', '여성안심',
  '무권리', '코너자리', '유동인구많음', '인테리어잘됨', '층고높음',
  '테라스', '복층', '마당있음', '투자용',
];

export default function DetailFilterPanel({ filters, onFilterChange }: Props) {
  const gridBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 4px", borderRadius: "4px", fontSize: "14px", fontWeight: active ? 700 : 500, textAlign: "center",
    border: active ? "1.5px solid #4b89ff" : "1px solid #e5e7eb",
    background: active ? "#eef4ff" : "#fff", color: active ? "#4b89ff" : "#374151",
    cursor: "pointer", transition: "all 0.15s",
  });

  const themeBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "7px 12px", borderRadius: "16px", fontSize: "13px", fontWeight: active ? 700 : 500,
    border: active ? "1.5px solid #10b981" : "1px solid #e5e7eb",
    background: active ? "#d1fae5" : "#f9fafb", color: active ? "#065f46" : "#6b7280",
    cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" as const,
  });

  const isYearActive = (min: number | null, max: number | null) => filters.yearMin === min && filters.yearMax === max;

  const toggleTheme = (t: string) => {
    const arr = filters.themes;
    const newArr = arr.includes(t) ? arr.filter(x => x !== t) : [...arr, t];
    onFilterChange({ themes: newArr });
  };

  return (
    <div>
      {/* 등록자 유형 */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#111", marginBottom: "12px" }}>등록자 유형</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
          {OWNER_PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => onFilterChange({ ownerRole: filters.ownerRole === p.value ? null : p.value })}
              style={gridBtnStyle(filters.ownerRole === p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 수수료 유형 */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#111", marginBottom: "12px" }}>중개보수</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
          {COMMISSION_PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => onFilterChange({ commissionType: filters.commissionType === p.value ? null : p.value })}
              style={gridBtnStyle(filters.commissionType === p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 층수 */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#111", marginBottom: "12px" }}>층수</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
          {FLOOR_PRESETS.map(f => (
            <button
              key={f}
              onClick={() => onFilterChange({ floor: filters.floor === f ? null : f })}
              style={gridBtnStyle(filters.floor === f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* 사용승인일 */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#111", marginBottom: "12px" }}>사용승인일 (연식)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
          {YEAR_PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => onFilterChange({ yearMin: isYearActive(p.min, p.max) ? null : p.min, yearMax: isYearActive(p.min, p.max) ? null : p.max })}
              style={gridBtnStyle(isYearActive(p.min, p.max))}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 테마 키워드 */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#111", marginBottom: "12px" }}>테마 키워드</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {THEME_PRESETS.map(t => (
            <button key={t} onClick={() => toggleTheme(t)} style={themeBtnStyle(filters.themes.includes(t))}>
              # {t} {filters.themes.includes(t) && "✓"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
        <button onClick={() => onFilterChange({ floor: null, yearMin: null, yearMax: null, ownerRole: null, commissionType: null, themes: [] })} style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
          ↻ 조건삭제
        </button>
      </div>
    </div>
  );
}
