import React from 'react';
import { FilterState } from './useVacancyFilters';

interface Props {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  PROPERTY_TYPES: { group: string; items: string[] }[];
}

export default function PropertyTypeFilterPanel({ filters, onFilterChange, PROPERTY_TYPES }: Props) {
  const allItems = PROPERTY_TYPES.flatMap(g => g.items);
  const isAllSelected = allItems.length > 0 && allItems.every(item => filters.propertyTypes.includes(item));

  const toggleProp = (item: string) => {
    const arr = filters.propertyTypes;
    const newArr = arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
    onFilterChange({ propertyTypes: newArr });
  };

  const handleToggleAll = () => {
    if (isAllSelected) {
      onFilterChange({ propertyTypes: [] });
    } else {
      onFilterChange({ propertyTypes: allItems });
    }
  };

  const gridBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 4px", borderRadius: "8px", fontSize: "15px", fontWeight: active ? 700 : 500, textAlign: "center",
    border: active ? "1.5px solid #4b89ff" : "1px solid #e5e7eb",
    background: active ? "#eef4ff" : "#fff", color: active ? "#4b89ff" : "#000",
    cursor: "pointer", transition: "all 0.15s",
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <span style={{ fontSize: "14px", fontWeight: 700, color: "#111" }}>공실광고유형 선택</span>
        <button
          type="button"
          onClick={handleToggleAll}
          style={{
            padding: "5px 12px",
            borderRadius: "6px",
            fontSize: "13px",
            fontWeight: 700,
            border: isAllSelected ? "1.5px solid #4b89ff" : "1px solid #d1d5db",
            background: isAllSelected ? "#eef4ff" : "#f9fafb",
            color: isAllSelected ? "#4b89ff" : "#4b5563",
            cursor: "pointer",
          }}
        >
          {isAllSelected ? "✓ 전체해제" : "✓ 전체선택"}
        </button>
      </div>

      {PROPERTY_TYPES.map((g) => {
        return (
          <div key={g.group} style={{ marginBottom: "18px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#102c57", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "4px", height: "13px", background: "#102c57", borderRadius: "2px", display: "inline-block" }}></span>
              <span>{g.group}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
              {g.items.map(item => (
                <button 
                  type="button" 
                  key={item} 
                  onClick={() => toggleProp(item)} 
                  style={gridBtnStyle(filters.propertyTypes.includes(item))}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
