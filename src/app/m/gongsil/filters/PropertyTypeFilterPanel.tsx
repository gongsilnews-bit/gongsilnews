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
      {PROPERTY_TYPES.map(g => {
        const isGroupAllSelected = g.items.every(item => filters.propertyTypes.includes(item));
        const toggleGroup = () => {
          if (isGroupAllSelected) {
            onFilterChange({
              propertyTypes: filters.propertyTypes.filter(x => !g.items.includes(x))
            });
          } else {
            const otherGroupsItems = filters.propertyTypes.filter(x => !g.items.includes(x));
            onFilterChange({
              propertyTypes: [...otherGroupsItems, ...g.items]
            });
          }
        };

        return (
          <div key={g.group} style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#6b7280", marginBottom: "8px" }}>{g.group}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
              <button 
                type="button" 
                onClick={toggleGroup} 
                style={{ ...gridBtnStyle(isGroupAllSelected), fontSize: "14px" }}
              >
                {isGroupAllSelected ? "전체해제" : "전체선택"}
              </button>
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
