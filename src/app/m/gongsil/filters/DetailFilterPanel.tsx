import React from 'react';
import { FilterState } from './useVacancyFilters';

interface Props {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
}

const YEAR_PRESETS = [
  { label: '1???´ë‚´', min: new Date().getFullYear() - 1, max: null },
  { label: '5???´ë‚´', min: new Date().getFullYear() - 5, max: null },
  { label: '10???´ë‚´', min: new Date().getFullYear() - 10, max: null },
  { label: '15???´ë‚´', min: new Date().getFullYear() - 15, max: null },
  { label: '15???´ìƒ', min: null, max: new Date().getFullYear() - 15 },
];

const FLOOR_PRESETS = ['1ì¸?, '2ì¸µì´??, 'ë°˜ì???ì§€??, '?¥íƒ‘'];

const OWNER_PRESETS = [
  { label: '?„ì²´', value: null },
  { label: '?¼ë°˜??, value: 'USER' },
  { label: 'ë¶€?™ì‚°', value: 'REALTOR' },
];

const COMMISSION_PRESETS = [
  { label: '?„ì²´', value: null },
  { label: 'ê³µë™ì¤‘ê°œ', value: 'ê³µë™ì¤‘ê°œ' },
  { label: '?˜ìˆ˜ë£?5%~', value: '25' },
  { label: '50%~', value: '50' },
  { label: '75%~', value: '75' },
  { label: '100% (ë²•ì •?˜ìˆ˜ë£?', value: '100' },
];

const THEME_PRESETS = [
  'ê¸‰ë§¤', 'ì¶”ì²œê³µì‹¤ê´‘ê³ ', '? ì¶•ê¸?, '?¬ìˆ˜ë¦?, '?œê°•ë·?, '??„¸ê¶?, '?€?µì…˜',
  'ê°€?±ë¹„', '?¨ê¸°?„ë?', 'ì£¼ì°¨?¸ë¦¬', '?€ë¡œë??ˆì „', '?¬ì„±?ˆì‹¬', '?¤í”¼?¤í…”', '? ì™„ê²¬ê???,
  'ë¬´ê¶Œë¦?, 'ì½”ë„ˆ?ë¦¬', '? ë™?¸êµ¬ë§ìŒ', '?¸í…Œë¦¬ì–´?˜ë¨', 'ì¸µê³ ?’ìŒ',
  '?Œë¼??, 'ë³µì¸µ', 'ë§ˆë‹¹?ˆìŒ', '?¬ì??,
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
      {/* ?±ë¡??? í˜• */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#111", marginBottom: "12px" }}>?±ë¡??? í˜•</div>
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

      {/* ?˜ìˆ˜ë£?? í˜• */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#111", marginBottom: "12px" }}>ì¤‘ê°œë³´ìˆ˜</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
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

      {/* ì¸µìˆ˜ */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#111", marginBottom: "12px" }}>ì¸µìˆ˜</div>
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

      {/* ?¬ìš©?¹ì¸??*/}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#111", marginBottom: "12px" }}>?¬ìš©?¹ì¸??(?°ì‹)</div>
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

      {/* ?Œë§ˆ ?¤ì›Œ??*/}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#111", marginBottom: "12px" }}>?Œë§ˆ ?¤ì›Œ??/div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {THEME_PRESETS.map(t => (
            <button key={t} onClick={() => toggleTheme(t)} style={themeBtnStyle(filters.themes.includes(t))}>
              # {t} {filters.themes.includes(t) && "??}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
        <button onClick={() => onFilterChange({ floor: null, yearMin: null, yearMax: null, ownerRole: null, commissionType: null, themes: [] })} style={{ background: "none", border: "none", color: "#6b7280", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
          ??ì¡°ê±´?? œ
        </button>
      </div>
    </div>
  );
}
