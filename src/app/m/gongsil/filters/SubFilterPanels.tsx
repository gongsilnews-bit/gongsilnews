import React from 'react';
import { FilterState } from './useVacancyFilters';

interface Props {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
}

const YEAR_PRESETS = [
  { label: '1???¥ÎÇ¥', min: new Date().getFullYear() - 1, max: null },
  { label: '5???¥ÎÇ¥', min: new Date().getFullYear() - 5, max: null },
  { label: '10???¥ÎÇ¥', min: new Date().getFullYear() - 10, max: null },
  { label: '15???¥ÎÇ¥', min: new Date().getFullYear() - 15, max: null },
  { label: '15???¥ÏÉÅ', min: null, max: new Date().getFullYear() - 15 },
];

const FLOOR_PRESETS = ['1Ï∏?, '2Ï∏µÏù¥??, 'Î∞òÏ???ÏßÄ??, '?•ÌÉë'];

const OWNER_PRESETS = [
  { label: '?ÑÏ≤¥', value: null },
  { label: '?ºÎ∞ò??, value: 'USER' },
  { label: 'Î∂Ä?ôÏÇ∞', value: 'REALTOR' },
];

const COMMISSION_PRESETS = [
  { label: '?ÑÏ≤¥', value: null },
  { label: 'Í≥µÎèôÏ§ëÍ∞ú', value: 'Í≥µÎèôÏ§ëÍ∞ú' },
  { label: '?òÏàòÎ£?5%~', value: '25' },
  { label: '50%~', value: '50' },
  { label: '75%~', value: '75' },
  { label: '100% (Î≤ïÏ†ï?òÏàòÎ£?', value: '100' },
];

const THEME_PRESETS = [
  'Í∏âÎß§', 'Ï∂îÏ≤úÍ≥µÏã§Í¥ëÍ≥†', '?†Ï∂ïÍ∏?, '?¨ÏàòÎ¶?, '?úÍ∞ïÎ∑?, '??Ñ∏Í∂?, '?Ä?µÏÖò',
  'Í∞Ä?±ÎπÑ', '?®Í∏∞?ÑÎ?', 'Ï£ºÏ∞®?∏Î¶¨', '?ÄÎ°úÎ??àÏ†Ñ', '?¨ÏÑ±?àÏã¨', '?§Ìîº?§ÌÖî', '?†ÏôÑÍ≤¨Í???,
  'Î¨¥Í∂åÎ¶?, 'ÏΩîÎÑà?êÎ¶¨', '?†Îèô?∏Íµ¨ÎßéÏùå', '?∏ÌÖåÎ¶¨Ïñ¥?òÎê®', 'Ï∏µÍ≥†?íÏùå',
  '?åÎùº??, 'Î≥µÏ∏µ', 'ÎßàÎãπ?àÏùå', '?¨Ïûê??,
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
        <button type="button" onClick={() => onFilterChange({ ownerRole: null })} style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>??Ï°∞Í±¥??†ú</button>
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
        <button type="button" onClick={() => onFilterChange({ commissionType: null })} style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>??Ï°∞Í±¥??†ú</button>
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
        <button type="button" onClick={() => onFilterChange({ floor: null })} style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>??Ï°∞Í±¥??†ú</button>
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
      {/* ?§ÏãúÍ∞?ÎßêÌíç???ºÎ≤® */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
        <div style={{
          backgroundColor: "#f0f7ff", border: "1.5px solid #1a73e8", color: "#1a73e8",
          padding: "6px 16px", borderRadius: "20px", fontSize: "14px", fontWeight: 800,
          boxShadow: "0 2px 8px rgba(26, 115, 232, 0.15)"
        }}>
          {minVal === 1990 && maxVal === 2026 
            ? "?ÑÏ≤¥" 
            : minVal > 1990 && maxVal === 2026 
            ? `${minVal}???¥ÌõÑ` 
            : minVal === 1990 && maxVal < 2026 
            ? `${maxVal}???¥Ï†Ñ` 
            : `${minVal}??~ ${maxVal}??}
        </div>
      </div>

      {/* ?¥Ï§ë ?¨Îùº?¥Îçî ?àÏù∏ÏßÄ Ïª®ÌÖå?¥ÎÑà */}
      <div style={{ position: "relative", width: "100%", height: "40px", display: "flex", alignItems: "center" }}>
        {/* Í∏∞Î≥∏ ?åÏÉâ ?∏Îûô */}
        <div style={{ position: "absolute", left: 0, right: 0, height: "6px", backgroundColor: "#e5e7eb", borderRadius: "3px" }} />
        
        {/* ?úÏÑ±??Î∏îÎ£® ?∏Îûô */}
        <div style={{
          position: "absolute",
          left: `${minPercent}%`,
          width: `${maxPercent - minPercent}%`,
          height: "6px",
          backgroundColor: "#1a73e8",
          borderRadius: "3px"
        }} />

        {/* ?¨Î™Ö ?àÏù∏ÏßÄ ?∏Ìíã 2Í∞?(Í≤πÏπ® Î∞∞Ïπò) */}
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

      {/* ÏµúÏÜå/ÏµúÎ? Ï∂??åÌä∏ */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
        <span>1990???¥Ï†Ñ</span>
        <span>2000??/span>
        <span>2010??/span>
        <span>2020??/span>
        <span>?ÑÏû¨(2026??</span>
      </div>

      {/* Ï°∞Í±¥??†ú */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
        <button type="button" onClick={() => onFilterChange({ yearMin: null, yearMax: null })} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
          ??Ï°∞Í±¥??†ú
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
            # {t} {filters.themes.includes(t) && "??}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={() => onFilterChange({ themes: [] })} style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>??Ï°∞Í±¥??†ú</button>
      </div>
    </div>
  );
}
