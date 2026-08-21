import React from 'react';
import { FilterState } from './useVacancyFilters';

interface Props {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
}

const FLOOR_PRESETS = ['1층', '2층이상', '반지하/지하', '옥탑'];

const COMMISSION_PRESETS = [
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
  padding: "10px 4px", borderRadius: "8px", fontSize: "15px", fontWeight: active ? 700 : 500, textAlign: "center",
  border: active ? "1.5px solid #4b89ff" : "1px solid #e5e7eb",
  background: active ? "#eef4ff" : "#fff", color: active ? "#4b89ff" : "#000",
  cursor: "pointer", transition: "all 0.15s",
});

const themeBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: "7px 12px", borderRadius: "16px", fontSize: "14px", fontWeight: active ? 700 : 500,
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
      onFilterChange({ ownerRole: 'USER' });
    } else if (filters.ownerRole === 'USER') {
      onFilterChange({ ownerRole: null });
    } else {
      onFilterChange({ ownerRole: 'USER' });
    }
  };

  const toggleRealtor = () => {
    if (filters.ownerRole === null) {
      onFilterChange({ ownerRole: 'REALTOR' });
    } else if (filters.ownerRole === 'REALTOR') {
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
          일반인 {isUserActive && "✓"}
        </button>
        <button 
          type="button" 
          onClick={toggleRealtor} 
          style={gridBtnStyle(isRealtorActive)}
        >
          부동산 {isRealtorActive && "✓"}
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
      onFilterChange({ commissionType: null });
    } else {
      onFilterChange({ commissionType: val });
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
        {COMMISSION_PRESETS.map(p => {
          const active = isOptionActive(p.value);
          return (
            <button 
              type="button" 
              key={p.label} 
              onClick={() => toggleOption(p.value)} 
              style={gridBtnStyle(active)}
            >
              {p.label} {active && "✓"}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={() => onFilterChange({ commissionType: 'NONE' })} style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>↻ 조건삭제</button>
      </div>
    </div>
  );
}

export function FloorFilterPanel({ filters, onFilterChange }: Props) {
  const isAll = filters.floor === null;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => onFilterChange({ floor: isAll ? FLOOR_PRESETS[0] : null })}
          style={{ ...gridBtnStyle(isAll), fontSize: "14px" }}
        >
          {isAll ? "✓ 전체해제" : "✓ 전체선택"}
        </button>
        {FLOOR_PRESETS.map(f => {
          const active = isAll || filters.floor === f;
          return (
            <button 
              type="button" 
              key={f} 
              onClick={() => onFilterChange({ floor: filters.floor === f ? null : f })} 
              style={gridBtnStyle(active)}
            >
              {f} {active && "✓"}
            </button>
          );
        })}
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
        {finalPresets.map(t => {
          const isSel = filters.themes.includes(t);
          return (
            <button key={t} type="button" onClick={() => toggleTheme(t)} style={themeBtnStyle(isSel)}>
              # {t} {isSel && "✓"}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={() => onFilterChange({ themes: [] })} style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>↻ 조건삭제</button>
      </div>
    </div>
  );
}

// ── 방 / 욕실수 패널 (전체선택 시 모든 방/욕실 버튼 활성화) ──
export function RoomBathFilterPanel({ filters, onFilterChange }: Props) {
  const ROOMS = [
    { label: "1개+", val: 1 },
    { label: "2개+", val: 2 },
    { label: "3개+", val: 3 },
    { label: "4개+", val: 4 },
  ];
  const BATHS = [
    { label: "1개+", val: 1 },
    { label: "2개+", val: 2 },
    { label: "3개+", val: 3 },
  ];

  const isRoomAll = filters.roomCount === null;
  const isBathAll = filters.bathCount === null;

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#111", marginBottom: "8px" }}>방 개수</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
          <button
            type="button"
            onClick={() => onFilterChange({ roomCount: isRoomAll ? 1 : null })}
            style={{ ...gridBtnStyle(isRoomAll), fontSize: "14px" }}
          >
            {isRoomAll ? "✓ 전체해제" : "✓ 전체선택"}
          </button>
          {ROOMS.map((r) => {
            const active = isRoomAll || filters.roomCount === r.val;
            return (
              <button
                key={r.label}
                type="button"
                onClick={() => onFilterChange({ roomCount: filters.roomCount === r.val ? null : r.val })}
                style={gridBtnStyle(active)}
              >
                {r.label} {active && "✓"}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#111", marginBottom: "8px" }}>욕실 개수</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
          <button
            type="button"
            onClick={() => onFilterChange({ bathCount: isBathAll ? 1 : null })}
            style={{ ...gridBtnStyle(isBathAll), fontSize: "14px" }}
          >
            {isBathAll ? "✓ 전체해제" : "✓ 전체선택"}
          </button>
          {BATHS.map((b) => {
            const active = isBathAll || filters.bathCount === b.val;
            return (
              <button
                key={b.label}
                type="button"
                onClick={() => onFilterChange({ bathCount: filters.bathCount === b.val ? null : b.val })}
                style={gridBtnStyle(active)}
              >
                {b.label} {active && "✓"}
              </button>
            );
          })}
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

// ── 방향 패널 (전체선택 시 모든 방향 활성화) ──
export function DirectionFilterPanel({ filters, onFilterChange }: Props) {
  const DIRS = ["동향", "서향", "남향", "북향", "남동향", "남서향", "북동향", "북서향"];
  const isAll = !filters.direction;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => onFilterChange({ direction: isAll ? DIRS[0] : null })}
          style={{ ...gridBtnStyle(isAll), fontSize: "14px" }}
        >
          {isAll ? "✓ 전체해제" : "✓ 전체선택"}
        </button>
        {DIRS.map((d) => {
          const isSel = isAll || filters.direction === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onFilterChange({ direction: filters.direction === d ? null : d })}
              style={gridBtnStyle(isSel)}
            >
              {d} {isSel && "✓"}
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

// ── 세대수 패널 (전체선택 시 모든 세대수 활성화) ──
export function UnitsFilterPanel({ filters, onFilterChange }: Props) {
  const UNITS = [
    { label: "50세대+", val: 50 },
    { label: "100세대+", val: 100 },
    { label: "300세대+", val: 300 },
    { label: "500세대+", val: 500 },
    { label: "1,000세대+", val: 1000 },
  ];
  const isAll = filters.unitsMin === null;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => onFilterChange({ unitsMin: isAll ? UNITS[0].val : null })}
          style={{ ...gridBtnStyle(isAll), fontSize: "14px" }}
        >
          {isAll ? "✓ 전체해제" : "✓ 전체선택"}
        </button>
        {UNITS.map((u) => {
          const active = isAll || filters.unitsMin === u.val;
          return (
            <button
              key={u.label}
              type="button"
              onClick={() => onFilterChange({ unitsMin: filters.unitsMin === u.val ? null : u.val })}
              style={gridBtnStyle(active)}
            >
              {u.label} {active && "✓"}
            </button>
          );
        })}
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

// ── 관리비 패널 (전체선택 시 모든 관리비 활성화) ──
export function MaintFilterPanel({ filters, onFilterChange }: Props) {
  const MAINTO_PRESETS = [
    { label: "5만 이하", val: 50000 },
    { label: "10만 이하", val: 100000 },
    { label: "20만 이하", val: 200000 },
    { label: "30만 이하", val: 300000 },
  ];
  const isAll = filters.maintMax === null;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => onFilterChange({ maintMax: isAll ? MAINTO_PRESETS[0].val : null })}
          style={{ ...gridBtnStyle(isAll), fontSize: "14px" }}
        >
          {isAll ? "✓ 전체해제" : "✓ 전체선택"}
        </button>
        {MAINTO_PRESETS.map((m) => {
          const active = isAll || filters.maintMax === m.val;
          return (
            <button
              key={m.label}
              type="button"
              onClick={() => onFilterChange({ maintMax: filters.maintMax === m.val ? null : m.val })}
              style={gridBtnStyle(active)}
            >
              {m.label} {active && "✓"}
            </button>
          );
        })}
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

// ── 주차 패널 (전체선택 시 모든 주차옵션 활성화) ──
export function ParkingFilterPanel({ filters, onFilterChange }: Props) {
  const PARKING = ["주차가능", "자주식", "기계식", "무료주차"];
  const isAll = !filters.parking;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => onFilterChange({ parking: isAll ? PARKING[0] : null })}
          style={{ ...gridBtnStyle(isAll), fontSize: "14px" }}
        >
          {isAll ? "✓ 전체해제" : "✓ 전체선택"}
        </button>
        {PARKING.map((p) => {
          const isSel = isAll || filters.parking === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onFilterChange({ parking: filters.parking === p ? null : p })}
              style={gridBtnStyle(isSel)}
            >
              {p} {isSel && "✓"}
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

// ══════════════════════════════════════════════════════════════
// 🔨 [PC 100% 동일] 법원 경·공매 전용 맞춤 상세 필터 패널들
// ══════════════════════════════════════════════════════════════

// 1. 감정가 패널 (전체선택 시 모든 프리셋 활성화)
export function AuctionAppraisalFilterPanel({ filters, onFilterChange }: Props) {
  const PRESETS = [
    { label: "1억 이하", min: null, max: 100000000 },
    { label: "3억 이하", min: null, max: 300000000 },
    { label: "5억 이하", min: null, max: 500000000 },
    { label: "10억 이하", min: null, max: 1000000000 },
    { label: "15억 이하", min: null, max: 1500000000 },
    { label: "15억 이상", min: 1500000000, max: null },
  ];
  const isAll = filters.auctionAppraisalMin === null && filters.auctionAppraisalMax === null;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => onFilterChange({ auctionAppraisalMin: isAll ? PRESETS[0].min : null, auctionAppraisalMax: isAll ? PRESETS[0].max : null })}
          style={{ ...gridBtnStyle(isAll), fontSize: "14px" }}
        >
          {isAll ? "✓ 전체해제" : "✓ 전체선택"}
        </button>
        {PRESETS.map((p) => {
          const isSel = isAll || (filters.auctionAppraisalMin === p.min && filters.auctionAppraisalMax === p.max);
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onFilterChange({ auctionAppraisalMin: filters.auctionAppraisalMin === p.min ? null : p.min, auctionAppraisalMax: filters.auctionAppraisalMax === p.max ? null : p.max })}
              style={gridBtnStyle(isSel)}
            >
              {p.label} {isSel && "✓"}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => onFilterChange({ auctionAppraisalMin: null, auctionAppraisalMax: null })}
          style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer" }}
        >
          ↻ 조건삭제
        </button>
      </div>
    </div>
  );
}

// 2. 최저입찰가 패널 (전체선택 시 모든 프리셋 활성화)
export function AuctionBidPriceFilterPanel({ filters, onFilterChange }: Props) {
  const PRESETS = [
    { label: "5천 이하", min: null, max: 50000000 },
    { label: "1억 이하", min: null, max: 100000000 },
    { label: "3억 이하", min: null, max: 300000000 },
    { label: "5억 이하", min: null, max: 500000000 },
    { label: "10억 이하", min: null, max: 1000000000 },
    { label: "15억 이하", min: null, max: 1500000000 },
  ];
  const isAll = filters.auctionBidPriceMin === null && filters.auctionBidPriceMax === null;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => onFilterChange({ auctionBidPriceMin: isAll ? PRESETS[0].min : null, auctionBidPriceMax: isAll ? PRESETS[0].max : null })}
          style={{ ...gridBtnStyle(isAll), fontSize: "14px" }}
        >
          {isAll ? "✓ 전체해제" : "✓ 전체선택"}
        </button>
        {PRESETS.map((p) => {
          const isSel = isAll || (filters.auctionBidPriceMin === p.min && filters.auctionBidPriceMax === p.max);
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onFilterChange({ auctionBidPriceMin: filters.auctionBidPriceMin === p.min ? null : p.min, auctionBidPriceMax: filters.auctionBidPriceMax === p.max ? null : p.max })}
              style={gridBtnStyle(isSel)}
            >
              {p.label} {isSel && "✓"}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => onFilterChange({ auctionBidPriceMin: null, auctionBidPriceMax: null })}
          style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer" }}
        >
          ↻ 조건삭제
        </button>
      </div>
    </div>
  );
}

// 3. 할인율 패널 (전체선택 시 모든 할인율 활성화)
export function AuctionDiscountFilterPanel({ filters, onFilterChange }: Props) {
  const DISCOUNTS = [
    { label: "▼10%↑", val: 10 },
    { label: "▼20%↑", val: 20 },
    { label: "▼30%↑", val: 30 },
    { label: "▼50%↑", val: 50 },
  ];
  const isAll = filters.auctionDiscount === 0;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => onFilterChange({ auctionDiscount: isAll ? DISCOUNTS[0].val : 0 })}
          style={{ ...gridBtnStyle(isAll), fontSize: "14px" }}
        >
          {isAll ? "✓ 전체해제" : "✓ 전체선택"}
        </button>
        {DISCOUNTS.map((d) => {
          const active = isAll || filters.auctionDiscount === d.val;
          return (
            <button
              key={d.label}
              type="button"
              onClick={() => onFilterChange({ auctionDiscount: filters.auctionDiscount === d.val ? 0 : d.val })}
              style={gridBtnStyle(active)}
            >
              {d.label} {active && "✓"}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => onFilterChange({ auctionDiscount: 0 })}
          style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer" }}
        >
          ↻ 조건삭제
        </button>
      </div>
    </div>
  );
}

// 4. 유찰 횟수 패널 (전체선택 시 모든 유찰횟수 활성화)
export function AuctionBidCountFilterPanel({ filters, onFilterChange }: Props) {
  const COUNTS = [
    { label: "1회↑", val: 1 },
    { label: "2회↑", val: 2 },
    { label: "3회↑", val: 3 },
  ];
  const isAll = filters.auctionBidCount === 0;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => onFilterChange({ auctionBidCount: isAll ? COUNTS[0].val : 0 })}
          style={{ ...gridBtnStyle(isAll), fontSize: "14px" }}
        >
          {isAll ? "✓ 전체해제" : "✓ 전체선택"}
        </button>
        {COUNTS.map((c) => {
          const active = isAll || filters.auctionBidCount === c.val;
          return (
            <button
              key={c.label}
              type="button"
              onClick={() => onFilterChange({ auctionBidCount: filters.auctionBidCount === c.val ? 0 : c.val })}
              style={gridBtnStyle(active)}
            >
              {c.label} {active && "✓"}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => onFilterChange({ auctionBidCount: 0 })}
          style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer" }}
        >
          ↻ 조건삭제
        </button>
      </div>
    </div>
  );
}

// 5. 입찰 시작일 패널 (전체선택 시 모든 입찰시작일 활성화)
export function AuctionStartDateFilterPanel({ filters, onFilterChange }: Props) {
  const DATES = [
    { label: "1주 이내", val: "1w" },
    { label: "2주 이내", val: "2w" },
    { label: "1달 이내", val: "1m" },
    { label: "1~3개월", val: "1_3m" },
    { label: "3개월 이후", val: "over_3m" },
  ];
  const isAll = !filters.auctionStartDate || filters.auctionStartDate === "all";

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => onFilterChange({ auctionStartDate: isAll ? DATES[0].val : "all" })}
          style={{ ...gridBtnStyle(isAll), fontSize: "14px" }}
        >
          {isAll ? "✓ 전체해제" : "✓ 전체선택"}
        </button>
        {DATES.map((d) => {
          const active = isAll || (filters.auctionStartDate || "all") === d.val;
          return (
            <button
              key={d.label}
              type="button"
              onClick={() => onFilterChange({ auctionStartDate: (filters.auctionStartDate || "all") === d.val ? "all" : d.val })}
              style={gridBtnStyle(active)}
            >
              {d.label} {active && "✓"}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => onFilterChange({ auctionStartDate: "all" })}
          style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer" }}
        >
          ↻ 조건삭제
        </button>
      </div>
    </div>
  );
}
