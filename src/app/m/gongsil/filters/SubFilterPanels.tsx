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
  { label: '수수료25%~', value: '25' },
  { label: '50%~', value: '50' },
  { label: '75%~', value: '75' },
  { label: '100% (법정수수료)', value: '100' },
];

const THEME_PRESETS = [
  '급매', '추천공실광고', '신축급', '올수리', '한강뷰', '역세권', '풀옵션',
  '가성비', '단기임대', '주차편리', '대로변안전', '여성안심',
  '무권리', '코너자리', '유동인구많음', '인테리어잘됨', '층고높음',
  '테라스', '복층', '마당있음', '투자용',
];

const gridBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: "10px 4px", borderRadius: "8px", fontSize: "16px", fontWeight: active ? 700 : 500, textAlign: "center",
  border: active ? "1.5px solid #4b89ff" : "1px solid #e5e7eb",
  background: active ? "#eef4ff" : "#fff", color: active ? "#4b89ff" : "#000",
  cursor: "pointer", transition: "all 0.15s",
});

const themeBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: "7px 12px", borderRadius: "16px", fontSize: "15px", fontWeight: active ? 700 : 500,
  border: active ? "1.5px solid #10b981" : "1px solid #e5e7eb",
  background: active ? "#d1fae5" : "#f9fafb", color: active ? "#065f46" : "#000",
  cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" as const,
});

export function OwnerRoleFilterPanel({ filters, onFilterChange }: Props) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "20px" }}>
        {OWNER_PRESETS.map(p => (
          <button type="button" key={p.label} onClick={() => onFilterChange({ ownerRole: filters.ownerRole === p.value ? null : p.value })} style={gridBtnStyle(filters.ownerRole === p.value)}>
            {p.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={() => onFilterChange({ ownerRole: null })} style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>↻ 조건삭제</button>
      </div>
    </div>
  );
}

export function CommissionFilterPanel({ filters, onFilterChange }: Props) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", marginBottom: "20px" }}>
        {COMMISSION_PRESETS.map(p => (
          <button type="button" key={p.label} onClick={() => onFilterChange({ commissionType: filters.commissionType === p.value ? null : p.value })} style={gridBtnStyle(filters.commissionType === p.value)}>
            {p.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={() => onFilterChange({ commissionType: null })} style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>↻ 조건삭제</button>
      </div>
    </div>
  );
}

export function FloorFilterPanel({ filters, onFilterChange }: Props) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "20px" }}>
        {FLOOR_PRESETS.map(f => (
          <button type="button" key={f} onClick={() => onFilterChange({ floor: filters.floor === f ? null : f })} style={gridBtnStyle(filters.floor === f)}>
            {f}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={() => onFilterChange({ floor: null })} style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>↻ 조건삭제</button>
      </div>
    </div>
  );
}

export function YearFilterPanel({ filters, onFilterChange }: Props) {
  const minVal = filters.yearMin ?? 1990;
  const maxVal = filters.yearMax ?? 2026;

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Number(e.target.value), maxVal - 1);
    onFilterChange({ yearMin: value === 1990 ? null : value });
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(Number(e.target.value), minVal + 1);
    onFilterChange({ yearMax: value >= 2026 ? null : value });
  };

  const minPercent = ((minVal - 1990) / (2026 - 1990)) * 100;
  const maxPercent = ((maxVal - 1990) / (2026 - 1990)) * 100;

  return (
    <div style={{ padding: "10px 0" }}>
      {/* 실시간 말풍선 라벨 */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
        <div style={{
          backgroundColor: "#f0f7ff", border: "1.5px solid #1a73e8", color: "#1a73e8",
          padding: "6px 16px", borderRadius: "20px", fontSize: "14px", fontWeight: 800,
          boxShadow: "0 2px 8px rgba(26, 115, 232, 0.15)"
        }}>
          {minVal === 1990 && maxVal === 2026 
            ? "전체" 
            : minVal > 1990 && maxVal === 2026 
            ? `${minVal}년 이후` 
            : minVal === 1990 && maxVal < 2026 
            ? `${maxVal}년 이전` 
            : `${minVal}년 ~ ${maxVal}년`}
        </div>
      </div>

      {/* 이중 슬라이더 레인지 컨테이너 */}
      <div style={{ position: "relative", width: "100%", height: "40px", display: "flex", alignItems: "center" }}>
        {/* 기본 회색 트랙 */}
        <div style={{ position: "absolute", left: 0, right: 0, height: "6px", backgroundColor: "#e5e7eb", borderRadius: "3px" }} />
        
        {/* 활성화 블루 트랙 */}
        <div style={{
          position: "absolute",
          left: `${minPercent}%`,
          width: `${maxPercent - minPercent}%`,
          height: "6px",
          backgroundColor: "#1a73e8",
          borderRadius: "3px"
        }} />

        {/* 투명 레인지 인풋 2개 (겹침 배치) */}
        <input 
          type="range"
          min="1990"
          max="2026"
          step="1"
          value={minVal}
          onChange={handleMinChange}
          style={{
            position: "absolute", width: "100%", pointerEvents: "none", WebkitAppearance: "none", appearance: "none",
            background: "none", outline: "none", margin: 0, zIndex: 3
          }}
          className="dual-slider-thumb-left"
        />
        <input 
          type="range"
          min="1990"
          max="2026"
          step="1"
          value={maxVal}
          onChange={handleMaxChange}
          style={{
            position: "absolute", width: "100%", pointerEvents: "none", WebkitAppearance: "none", appearance: "none",
            background: "none", outline: "none", margin: 0, zIndex: 4
          }}
          className="dual-slider-thumb-right"
        />
      </div>

      {/* 최소/최대 축 힌트 */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
        <span>1990년 이전</span>
        <span>2000년</span>
        <span>2010년</span>
        <span>2020년</span>
        <span>현재(2026년)</span>
      </div>

      {/* 조건삭제 */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
        <button type="button" onClick={() => onFilterChange({ yearMin: null, yearMax: null })} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
          ↻ 조건삭제
        </button>
      </div>
    </div>
  );
}

export function ThemeFilterPanel({ filters, onFilterChange }: Props) {
  const toggleTheme = (t: string) => {
    const arr = filters.themes;
    const newArr = arr.includes(t) ? arr.filter(x => x !== t) : [...arr, t];
    onFilterChange({ themes: newArr });
  };
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
        {THEME_PRESETS.map(t => (
          <button type="button" key={t} onClick={() => toggleTheme(t)} style={themeBtnStyle(filters.themes.includes(t))}>
            # {t} {filters.themes.includes(t) && "✓"}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={() => onFilterChange({ themes: [] })} style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>↻ 조건삭제</button>
      </div>
    </div>
  );
}
