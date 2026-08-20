import React, { useState, useEffect } from 'react';
import { FilterState } from './useVacancyFilters';

interface Props {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  PROPERTY_TYPES: { group: string; items: string[] }[];
}

export default function PropertyTypeFilterPanel({ filters, onFilterChange, PROPERTY_TYPES }: Props) {
  const allItems = PROPERTY_TYPES.flatMap(g => g.items);
  const isAllItemsSelected = allItems.length > 0 && allItems.every(item => filters.propertyTypes.includes(item));

  // 현재 선택된 대분류 그룹 판별
  // 만약 모든 아이템이 선택되었거나 여러 그룹의 아이템이 섞여 있으면 "전체"로 설정
  const getInitialActiveGroup = () => {
    if (filters.propertyTypes.length === 0 || isAllItemsSelected) return "전체";
    const matched = PROPERTY_TYPES.filter(g => g.items.some(item => filters.propertyTypes.includes(item)));
    if (matched.length > 1) return "전체";
    if (matched.length === 1) return matched[0].group;
    return "전체";
  };

  const [activeGroup, setActiveGroup] = useState<string>(getInitialActiveGroup);

  useEffect(() => {
    if (filters.propertyTypes.length === 0 || isAllItemsSelected) {
      setActiveGroup("전체");
    } else {
      const matched = PROPERTY_TYPES.filter(g => g.items.some(item => filters.propertyTypes.includes(item)));
      if (matched.length === 1) {
        setActiveGroup(matched[0].group);
      } else {
        setActiveGroup("전체");
      }
    }
  }, [filters.propertyTypes, PROPERTY_TYPES, isAllItemsSelected]);

  const selectedGroupObj = PROPERTY_TYPES.find(g => g.group === activeGroup);
  const groupItems = activeGroup === "전체" ? allItems : (selectedGroupObj?.items || []);
  const isAllGroupSelected = groupItems.length > 0 && groupItems.every(item => filters.propertyTypes.includes(item));

  // 대분류 탭 전환 시: 해당 대분류의 모든 세부항목으로 설정 (PC 동일)
  const handleSelectGroup = (groupName: string) => {
    setActiveGroup(groupName);
    if (groupName === "전체") {
      onFilterChange({ propertyTypes: allItems });
    } else {
      const targetGroup = PROPERTY_TYPES.find(g => g.group === groupName);
      if (targetGroup) {
        onFilterChange({ propertyTypes: targetGroup.items });
      }
    }
  };

  // 소분류 알약 개별 토글
  const toggleProp = (item: string) => {
    const arr = filters.propertyTypes;
    let newArr: string[];

    if (activeGroup === "전체") {
      newArr = arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
    } else {
      const isCurrentGroupOnly = arr.filter(x => groupItems.includes(x));
      if (isCurrentGroupOnly.includes(item)) {
        newArr = isCurrentGroupOnly.filter(x => x !== item);
      } else {
        newArr = [...isCurrentGroupOnly, item];
      }
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
    padding: "11px 8px",
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
    padding: "10px 4px",
    borderRadius: "8px",
    fontSize: "13px",
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
      {/* 1단계: 대분류 선택 (우측 상단 전체선택/전체해제 버튼) */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#6b7280" }}>
            1. 매물 대분류 선택
          </span>
          <button
            type="button"
            onClick={() => {
              if (isAllItemsSelected) {
                onFilterChange({ propertyTypes: [] });
              } else {
                onFilterChange({ propertyTypes: allItems });
              }
            }}
            style={{
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              background: isAllItemsSelected ? "#eef4ff" : "#fff",
              color: isAllItemsSelected ? "#4b89ff" : "#6b7280",
              border: isAllItemsSelected ? "1px solid #c7d2fe" : "1px solid #d1d5db",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {isAllItemsSelected ? "✓ 전체해제" : "✓ 전체선택"}
          </button>
        </div>

        {/* 4대 대분류 그리드 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
          {PROPERTY_TYPES.map(g => {
            const isSelected = activeGroup === "전체" 
              ? g.items.some(item => filters.propertyTypes.includes(item))
              : activeGroup === g.group;

            return (
              <button
                key={g.group}
                type="button"
                onClick={() => handleSelectGroup(g.group)}
                style={mainTabStyle(isSelected)}
              >
                {g.group === "아파트·오피스텔" && "🏢 "}
                {g.group === "빌라·주택" && "🏡 "}
                {g.group === "원룸·투룸(풀옵션)" && "🛏️ "}
                {g.group === "상가·사무실·공장·토지" && "🏬 "}
                {g.group} {isSelected && "✓"}
              </button>
            );
          })}
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

        {activeGroup === "전체" ? (
          <div>
            {PROPERTY_TYPES.map(g => (
              <div key={g.group} style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#4b5563", marginBottom: "6px" }}>
                  {g.group}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                  {g.items.map(item => (
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
            ))}
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
