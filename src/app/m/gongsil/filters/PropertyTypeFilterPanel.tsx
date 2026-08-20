import React, { useState, useEffect } from 'react';
import { FilterState } from './useVacancyFilters';

interface Props {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  PROPERTY_TYPES: { group: string; items: string[] }[];
}

export default function PropertyTypeFilterPanel({ filters, onFilterChange, PROPERTY_TYPES }: Props) {
  // 현재 선택된 대분류 그룹 찾기 (기본값: 첫 번째 그룹 또는 선택된 아이템이 포함된 그룹)
  const currentGroup = PROPERTY_TYPES.find(g => 
    g.items.some(item => filters.propertyTypes.includes(item))
  )?.group || PROPERTY_TYPES[0]?.group || "아파트·오피스텔";

  const [activeGroup, setActiveGroup] = useState<string>(currentGroup);

  useEffect(() => {
    const matched = PROPERTY_TYPES.find(g => 
      g.items.some(item => filters.propertyTypes.includes(item))
    )?.group;
    if (matched) setActiveGroup(matched);
  }, [filters.propertyTypes, PROPERTY_TYPES]);

  const selectedGroupObj = PROPERTY_TYPES.find(g => g.group === activeGroup) || PROPERTY_TYPES[0];
  const groupItems = selectedGroupObj?.items || [];
  const isAllGroupSelected = groupItems.length > 0 && groupItems.every(item => filters.propertyTypes.includes(item));

  // 대분류 탭 전환 시: 해당 대분류의 모든 세부항목으로 설정 (PC 동일)
  const handleSelectGroup = (groupName: string) => {
    setActiveGroup(groupName);
    const targetGroup = PROPERTY_TYPES.find(g => g.group === groupName);
    if (targetGroup) {
      onFilterChange({ propertyTypes: targetGroup.items });
    }
  };

  // 소분류 알약 개별 토글
  const toggleProp = (item: string) => {
    const arr = filters.propertyTypes;
    const isCurrentGroupOnly = arr.filter(x => groupItems.includes(x));
    let newArr: string[];

    if (isCurrentGroupOnly.includes(item)) {
      newArr = isCurrentGroupOnly.filter(x => x !== item);
    } else {
      newArr = [...isCurrentGroupOnly, item];
    }
    onFilterChange({ propertyTypes: newArr });
  };

  // 현재 대분류 내 전체선택 / 전체해제
  const handleToggleGroupAll = () => {
    if (isAllGroupSelected) {
      onFilterChange({ propertyTypes: [] });
    } else {
      onFilterChange({ propertyTypes: groupItems });
    }
  };

  const mainTabStyle = (active: boolean): React.CSSProperties => ({
    padding: "12px 10px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: active ? 800 : 600,
    textAlign: "center",
    border: active ? "2px solid #1a73e8" : "1px solid #e5e7eb",
    background: active ? "#f0f7ff" : "#ffffff",
    color: active ? "#1a73e8" : "#4b5563",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: active ? "0 2px 8px rgba(26, 115, 232, 0.15)" : "none",
  });

  const subPillStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 6px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: active ? 700 : 500,
    textAlign: "center",
    border: active ? "1.5px solid #4b89ff" : "1px solid #e5e7eb",
    background: active ? "#eef4ff" : "#fff",
    color: active ? "#4b89ff" : "#374151",
    cursor: "pointer",
    transition: "all 0.15s",
  });

  return (
    <div>
      {/* 1단계: 4대 대분류 선택 탭 (PC 100% 동일) */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "#6b7280", marginBottom: "8px" }}>
          1. 매물 대분류 선택
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
          {PROPERTY_TYPES.map(g => (
            <button
              key={g.group}
              type="button"
              onClick={() => handleSelectGroup(g.group)}
              style={mainTabStyle(activeGroup === g.group)}
            >
              {g.group === "아파트·오피스텔" && "🏢 "}
              {g.group === "빌라·주택" && "🏡 "}
              {g.group === "원룸·투룸(풀옵션)" && "🛏️ "}
              {g.group === "상가·사무실·공장·토지" && "🏬 "}
              {g.group}
            </button>
          ))}
        </div>
      </div>

      {/* 2단계: 선택된 대분류의 세부 알약(소분류) 선택 */}
      <div style={{ background: "#f9fafb", padding: "14px", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#102c57" }}>
            2. 세부 분류 선택 ({activeGroup})
          </span>
          <button
            type="button"
            onClick={handleToggleGroupAll}
            style={{
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 700,
              border: isAllGroupSelected ? "1px solid #4b89ff" : "1px solid #d1d5db",
              background: isAllGroupSelected ? "#eef4ff" : "#fff",
              color: isAllGroupSelected ? "#4b89ff" : "#4b5563",
              cursor: "pointer",
            }}
          >
            {isAllGroupSelected ? "✓ 전체해제" : "✓ 전체선택"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
          {groupItems.map(item => (
            <button
              key={item}
              type="button"
              onClick={() => toggleProp(item)}
              style={subPillStyle(filters.propertyTypes.includes(item))}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
