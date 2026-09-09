import React from 'react';
import { FilterState } from './useVacancyFilters';

interface Props {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  TRADE_TYPES: string[];
}

export default function TradeTypeFilterPanel({ filters, onFilterChange, TRADE_TYPES }: Props) {
  const isAllSelected = TRADE_TYPES.length > 0 && TRADE_TYPES.every(item => filters.tradeTypes.includes(item));

  const selectAll = () => {
    onFilterChange({ tradeTypes: TRADE_TYPES });
  };

  const toggleTrade = (item: string) => {
    if (isAllSelected) {
      // 전체 선택 상태에서 특정 항목을 누르면 해당 항목만 단독 선택
      onFilterChange({ tradeTypes: [item] });
      return;
    }
    const arr = filters.tradeTypes;
    let newArr = arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
    if (newArr.length === 0) {
      newArr = TRADE_TYPES; // 모두 해제되면 자동으로 전체 선택 복원
    }
    onFilterChange({ tradeTypes: newArr });
  };

  const gridBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 4px", borderRadius: "8px", fontSize: "15px", fontWeight: active ? 700 : 500, textAlign: "center",
    border: active ? "1.5px solid #4b89ff" : "1px solid #e5e7eb",
    background: active ? "#eef4ff" : "#fff", color: active ? "#4b89ff" : "#000",
    cursor: "pointer", transition: "all 0.15s",
  });

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
        <button 
          type="button"
          onClick={selectAll} 
          style={gridBtnStyle(isAllSelected)}
        >
          전체 {isAllSelected && "✓"}
        </button>
        {TRADE_TYPES.map(t => {
          const active = !isAllSelected && filters.tradeTypes.includes(t);
          return (
            <button key={t} type="button" onClick={() => toggleTrade(t)} style={gridBtnStyle(active)}>
              {t} {active && "✓"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
