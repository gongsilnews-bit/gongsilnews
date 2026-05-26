import React from 'react';
import { FilterState } from './useVacancyFilters';

interface Props {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  PROPERTY_TYPES: { group: string; items: string[] }[];
}

export default function PropertyTypeFilterPanel({ filters, onFilterChange, PROPERTY_TYPES }: Props) {
  const allItems = PROPERTY_TYPES.flatMap(g => g.items);

  const toggleProp = (item: string) => {
    const arr = filters.propertyTypes;
    const newArr = arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
    onFilterChange({ propertyTypes: newArr });
  };

  const selectAll = () => {
    onFilterChange({ propertyTypes: allItems });
  };

  const selectNone = () => {
    onFilterChange({ propertyTypes: [] });
  };

  const gridBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 4px", borderRadius: "8px", fontSize: "15px", fontWeight: active ? 700 : 500, textAlign: "center",
    border: active ? "1.5px solid #4b89ff" : "1px solid #e5e7eb",
    background: active ? "#eef4ff" : "#fff", color: active ? "#4b89ff" : "#000",
    cursor: "pointer", transition: "all 0.15s",
  });

  return (
    <div>
      {/* 🚀 [대표님 지침] 광고유형 최상단 세련된 원터치 퀵 토글 버튼 장착 */}
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

      {PROPERTY_TYPES.map(g => (
        <div key={g.group} style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#6b7280", marginBottom: "8px" }}>{g.group}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
            {g.items.map(item => (
              <button key={item} onClick={() => toggleProp(item)} style={gridBtnStyle(filters.propertyTypes.includes(item))}>
                {item}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
