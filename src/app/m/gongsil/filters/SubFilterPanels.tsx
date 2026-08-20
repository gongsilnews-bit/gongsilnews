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
  '가성비', '단기임대', '주차편리', '대로변안전', '여성안심', '오피스텔', '애완견가능',
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
  const isAllSelected = filters.ownerRole === null;
  const isUserActive = filters.ownerRole === null || filters.ownerRole === 'USER';
  const isRealtorActive = filters.ownerRole === null || filters.ownerRole === 'REALTOR';

  const handleToggleAll = () => {
    if (isAllSelected) {
      onFilterChange({ ownerRole: 'NONE' });
    } else {
      onFilterChange({ ownerRole: null });
    }
  };

  const toggleUser = () => {
    if (filters.ownerRole === null) {
      onFilterChange({ ownerRole: 'REALTOR' });
    } else if (filters.ownerRole === 'USER') {
      onFilterChange({ ownerRole: 'NONE' });
    } else if (filters.ownerRole === 'REALTOR') {
      onFilterChange({ ownerRole: null });
    } else {
      onFilterChange({ ownerRole: 'USER' });
    }
  };

  const toggleRealtor = () => {
    if (filters.ownerRole === null) {
      onFilterChange({ ownerRole: 'USER' });
    } else if (filters.ownerRole === 'REALTOR') {
      onFilterChange({ ownerRole: 'NONE' });
    } else if (filters.ownerRole === 'USER') {
      onFilterChange({ ownerRole: null });
    } else {
      onFilterChange({ ownerRole: 'REALTOR' });
    }
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "20px" }}>
        <button 
          type="button" 
          onClick={handleToggleAll} 
          style={{ ...gridBtnStyle(isAllSelected), fontSize: "14px" }}
        >
          {isAllSelected ? "✓ 전체해제" : "✓ 전체선택"}
        </button>
        <button 
          type="button" 
          onClick={toggleUser} 
          style={gridBtnStyle(isUserActive)}
        >
          일반인
        </button>
        <button 
          type="button" 
          onClick={toggleRealtor} 
          style={gridBtnStyle(isRealtorActive)}
        >
          부동산
        </button>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={() => onFilterChange({ ownerRole: 'NONE' })} style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>↻ 조건삭제</button>
      </div>
    </div>
  );
}

export function CommissionFilterPanel({ filters, onFilterChange }: Props) {
  const isAllSelected = filters.commissionType === null;

  const isOptionActive = (val: string) => {
    return filters.commissionType === null || filters.commissionType === val;
  };

  const handleToggleAll = () => {
    if (isAllSelected) {
      onFilterChange({ commissionType: 'NONE' });
    } else {
      onFilterChange({ commissionType: null });
    }
  };

  const toggleOption = (val: string) => {
    if (filters.commissionType === null) {
      onFilterChange({ commissionType: val });
    } else if (filters.commissionType === val) {
      onFilterChange({ commissionType: 'NONE' });
    } else {
      onFilterChange({ commissionType: val });
    }
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", marginBottom: "20px" }}>
        <button 
          type="button" 
          onClick={handleToggleAll} 
          style={{ ...gridBtnStyle(isAllSelected), fontSize: "14px" }}
        >
          {isAllSelected ? "✓ 전체해제" : "✓ 전체선택"}
        </button>
        {COMMISSION_PRESETS.filter(p => p.value !== null).map(p => (
          <button 
            type="button" 
            key={p.label} 
            onClick={() => toggleOption(p.value!)} 
            style={gridBtnStyle(isOptionActive(p.value!))}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={() => onFilterChange({ commissionType: 'NONE' })} style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>↻ 조건삭제</button>
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

interface ThemeProps {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  presets?: string[];
}

export function ThemeFilterPanel({ filters, onFilterChange, presets }: ThemeProps) {
  const finalPresets = presets || THEME_PRESETS;
  const toggleTheme = (t: string) => {
    const arr = filters.themes;
    const newArr = arr.includes(t) ? arr.filter(x => x !== t) : [...arr, t];
    onFilterChange({ themes: newArr });
  };
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
        {finalPresets.map(t => (
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

// ── 방 / 욕실수 패널 (PC 동일) ──
export function RoomBathFilterPanel({ filters, onFilterChange }: Props) {
  const ROOMS = [
    { label: "전체", val: null },
    { label: "1개+", val: 1 },
    { label: "2개+", val: 2 },
    { label: "3개+", val: 3 },
    { label: "4개+", val: 4 },
  ];
  const BATHS = [
    { label: "전체", val: null },
    { label: "1개+", val: 1 },
    { label: "2개+", val: 2 },
    { label: "3개+", val: 3 },
  ];

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#111", marginBottom: "8px" }}>방 개수</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px" }}>
          {ROOMS.map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => onFilterChange({ roomCount: r.val })}
              style={gridBtnStyle(filters.roomCount === r.val)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#111", marginBottom: "8px" }}>욕실 개수</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
          {BATHS.map((b) => (
            <button
              key={b.label}
              type="button"
              onClick={() => onFilterChange({ bathCount: b.val })}
              style={gridBtnStyle(filters.bathCount === b.val)}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => onFilterChange({ roomCount: null, bathCount: null })}
          style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer" }}
        >
          ↻ 조건삭제
        </button>
      </div>
    </div>
  );
}

// ── 방향 패널 (PC 동일) ──
export function DirectionFilterPanel({ filters, onFilterChange }: Props) {
  const DIRS = ["전체", "동향", "서향", "남향", "북향", "남동향", "남서향", "북동향", "북서향"];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "20px" }}>
        {DIRS.map((d) => {
          const isSel = (d === "전체" && !filters.direction) || filters.direction === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onFilterChange({ direction: d === "전체" ? null : d })}
              style={gridBtnStyle(isSel)}
            >
              {d}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => onFilterChange({ direction: null })}
          style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer" }}
        >
          ↻ 조건삭제
        </button>
      </div>
    </div>
  );
}

// ── 세대수 패널 (PC 동일) ──
export function UnitsFilterPanel({ filters, onFilterChange }: Props) {
  const UNITS = [
    { label: "전체", val: null },
    { label: "50세대+", val: 50 },
    { label: "100세대+", val: 100 },
    { label: "300세대+", val: 300 },
    { label: "500세대+", val: 500 },
    { label: "1,000세대+", val: 1000 },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "20px" }}>
        {UNITS.map((u) => (
          <button
            key={u.label}
            type="button"
            onClick={() => onFilterChange({ unitsMin: u.val })}
            style={gridBtnStyle(filters.unitsMin === u.val)}
          >
            {u.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => onFilterChange({ unitsMin: null })}
          style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer" }}
        >
          ↻ 조건삭제
        </button>
      </div>
    </div>
  );
}

// ── 관리비 패널 (PC 동일) ──
export function MaintFilterPanel({ filters, onFilterChange }: Props) {
  const MAINTO_PRESETS = [
    { label: "전체", val: null },
    { label: "5만 이하", val: 50000 },
    { label: "10만 이하", val: 100000 },
    { label: "20만 이하", val: 200000 },
    { label: "30만 이하", val: 300000 },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "20px" }}>
        {MAINTO_PRESETS.map((m) => (
          <button
            key={m.label}
            type="button"
            onClick={() => onFilterChange({ maintMax: m.val })}
            style={gridBtnStyle(filters.maintMax === m.val)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => onFilterChange({ maintMax: null })}
          style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer" }}
        >
          ↻ 조건삭제
        </button>
      </div>
    </div>
  );
}

// ── 주차 패널 (PC 동일) ──
export function ParkingFilterPanel({ filters, onFilterChange }: Props) {
  const PARKING = ["전체", "주차가능", "자주식", "기계식", "무료주차"];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "20px" }}>
        {PARKING.map((p) => {
          const isSel = (p === "전체" && !filters.parking) || filters.parking === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onFilterChange({ parking: p === "전체" ? null : p })}
              style={gridBtnStyle(isSel)}
            >
              {p}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => onFilterChange({ parking: null })}
          style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer" }}
        >
          ↻ 조건삭제
        </button>
      </div>
    </div>
  );
}

// ── 기타옵션 패널 (카테고리별 1:1 맞춤 옵션, PC 동일) ──
interface OptionsProps {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  optionsList: string[];
}

export function OptionsFilterPanel({ filters, onFilterChange, optionsList }: OptionsProps) {
  const toggleOption = (opt: string) => {
    const arr = filters.options;
    const newArr = arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt];
    onFilterChange({ options: newArr });
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "20px" }}>
        {optionsList.map((opt) => {
          const isSel = filters.options.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggleOption(opt)}
              style={gridBtnStyle(isSel)}
            >
              {opt} {isSel && "✓"}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => onFilterChange({ options: [] })}
          style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer" }}
        >
          ↻ 조건삭제
        </button>
      </div>
    </div>
  );
}
