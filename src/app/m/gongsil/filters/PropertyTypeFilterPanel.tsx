import React from 'react';
import { FilterState } from './useVacancyFilters';

interface Props {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  PROPERTY_TYPES: { group: string; items: string[] }[];
}

export default function PropertyTypeFilterPanel({ filters, onFilterChange, PROPERTY_TYPES }: Props) {
  const toggleProp = (item: string) => {
    const arr = filters.propertyTypes;
    const newArr = arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
    onFilterChange({ propertyTypes: newArr });
  };

  const gridBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 4px", borderRadius: "8px", fontSize: "13px", fontWeight: active ? 700 : 500, textAlign: "center",
    border: active ? "1.5px solid #4b89ff" : "1px solid #e5e7eb",
    background: active ? "#eef4ff" : "#fff", color: active ? "#4b89ff" : "#374151",
    cursor: "pointer", transition: "all 0.15s",
  });

  return (
    <div>
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
      <button 
        onClick={() => onFilterChange({ propertyTypes: [] })} 
        style={{ width: "100%", padding: "12px", background: "#f3f4f6", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, color: "#6b7280", cursor: "pointer", marginTop: "8px" }}
      >
        초기화
      </button>
    </div>
  );
}
