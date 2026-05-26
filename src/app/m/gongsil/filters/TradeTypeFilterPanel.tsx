import React from 'react';
import { FilterState } from './useVacancyFilters';

interface Props {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  TRADE_TYPES: string[];
}

export default function TradeTypeFilterPanel({ filters, onFilterChange, TRADE_TYPES }: Props) {
  const toggleTrade = (item: string) => {
    const arr = filters.tradeTypes;
    const newArr = arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
    onFilterChange({ tradeTypes: newArr });
  };

  const selectAll = () => {
    onFilterChange({ tradeTypes: TRADE_TYPES });
  };

  const selectNone = () => {
    onFilterChange({ tradeTypes: [] });
  };

  const gridBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "14px 4px", borderRadius: "8px", fontSize: "16px", fontWeight: active ? 700 : 500, textAlign: "center",
    border: active ? "1.5px solid #4b89ff" : "1px solid #e5e7eb",
    background: active ? "#eef4ff" : "#fff", color: active ? "#4b89ff" : "#000",
    cursor: "pointer", transition: "all 0.15s",
  });

  return (
    <div>
      {/* 🚀 [대표님 지침] 거래방식 최상단 세련된 원터치 퀵 토글 버튼 장착 */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginBottom: "14px" }}>
        <button 
          onClick={selectAll} 
          style={{ 
            background: "none", border: "none", fontSize: "13px", fontWeight: 800, color: "#1a73e8", 
            cursor: "pointer", padding: "6px 10px", borderRadius: "6px", backgroundColor: "#f0f7ff",
            transition: "background-color 0.15s"
          }}
        >
          ✓ 전체 선택
        </button>
        <button 
          onClick={selectNone} 
          style={{ 
            background: "none", border: "none", fontSize: "13px", fontWeight: 800, color: "#ef4444", 
            cursor: "pointer", padding: "6px 10px", borderRadius: "6px", backgroundColor: "#fef2f2",
            transition: "background-color 0.15s"
          }}
        >
          ✕ 전체 해제
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
        {TRADE_TYPES.map(t => (
          <button key={t} onClick={() => toggleTrade(t)} style={gridBtnStyle(filters.tradeTypes.includes(t))}>
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
