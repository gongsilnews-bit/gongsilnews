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

  // 현재 2단계에서 펼쳐진 대분류 그룹 (현재 선택된 매물유형이 속한 그룹 우선 자동 감지)
  const getInitialGroup = () => {
    if (filters.propertyTypes.length > 0 && filters.propertyTypes.length < allItems.length) {
      const matched = PROPERTY_TYPES.find(g => g.items.some(item => filters.propertyTypes.includes(item)));
      if (matched) return matched.group;
    }
    if (PROPERTY_TYPES.length > 0) return PROPERTY_TYPES[0].group;
    return "아파트·오피스텔";
  };

  const [activeGroup, setActiveGroup] = useState<string>(getInitialGroup);

  // filters.propertyTypes 변경 시 activeGroup 자동 동기화
  useEffect(() => {
    if (filters.propertyTypes.length > 0 && filters.propertyTypes.length < allItems.length) {
      const currentGroupObj = PROPERTY_TYPES.find(g => g.group === activeGroup);
      const isCurrentGroupSelected = currentGroupObj?.items.some(item => filters.propertyTypes.includes(item));
      if (!isCurrentGroupSelected) {
        const matched = PROPERTY_TYPES.find(g => g.items.some(item => filters.propertyTypes.includes(item)));
        if (matched) {
          setActiveGroup(matched.group);
        }
      }
    }
  }, [filters.propertyTypes, PROPERTY_TYPES, allItems.length, activeGroup]);

  const selectedGroupObj = PROPERTY_TYPES.find(g => g.group === activeGroup) || PROPERTY_TYPES[0];
  const groupItems = selectedGroupObj?.items || [];
  
  // 현재 활성화된 대분류 내의 모든 세부항목이 선택되어 있는지 여부
  const isAllGroupSelected = groupItems.length > 0 && groupItems.every(item => filters.propertyTypes.includes(item));

  // 1단계 대분류 탭 클릭 시: 해당 대분류로 세부분류 창을 전환하고 해당 대분류 항목만 선택
  const handleSelectGroup = (groupName: string) => {
    setActiveGroup(groupName);
    const targetGroup = PROPERTY_TYPES.find(g => g.group === groupName);
    if (targetGroup) {
      onFilterChange({ propertyTypes: targetGroup.items });
    }
  };

  // 1단계 최상단 전체선택 / 전체해제
  const handleToggleGlobalAll = () => {
    if (isAllItemsSelected) {
      onFilterChange({ propertyTypes: [] });
    } else {
      onFilterChange({ propertyTypes: allItems });
    }
  };

  // 2단계 세부분류 내 개별 알약 토글
  const toggleProp = (item: string) => {
    const arr = filters.propertyTypes;
    const newArr = arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
    onFilterChange({ propertyTypes: newArr });
  };

  // 2단계 세부분류 전체선택 / 전체해제 (오직 현재 선택된 1차 대분류에만 영향!)
  const handleToggleGroupAll = () => {
    if (isAllGroupSelected) {
      // 현재 대분류의 세부항목들만 선택 해제 (다른 대분류는 보존)
      const remaining = filters.propertyTypes.filter(x => !groupItems.includes(x));
      onFilterChange({ propertyTypes: remaining });
    } else {
      // 현재 대분류의 세부항목들을 모두 선택에 추가
      const merged = Array.from(new Set([...filters.propertyTypes, ...groupItems]));
      onFilterChange({ propertyTypes: merged });
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
    fontSize: "14px",
    fontWeight: active ? 700 : 500,
    textAlign: "center",
    border: active ? "1.5px solid #4b89ff" : "1px solid #e5e7eb",
    background: active ? "#eef4ff" : "#fff",
    color: active ? "#4b89ff" : "#374151",
    cursor: "pointer",
    transition: "all 0.15s",
  });

  // 🔨 [법원 경·공매 모드] 단일 그룹일 때는 1단계/2단계 분기 없이 바로 6대 자산 알약을 3열 그리드로 깔끔하게 노출!
  if (PROPERTY_TYPES.length === 1) {
    const singleGroupItems = PROPERTY_TYPES[0].items;
    const isAllSingleSelected = singleGroupItems.length > 0 && singleGroupItems.every(item => filters.propertyTypes.includes(item));

    const handleToggleSingleAll = () => {
      if (isAllSingleSelected) {
        onFilterChange({ propertyTypes: [] });
      } else {
        onFilterChange({ propertyTypes: singleGroupItems });
      }
    };

    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
          {/* 맨 앞 1번: 전체해제 / 전체선택 */}
          <button
            type="button"
            onClick={handleToggleSingleAll}
            style={{
              ...subPillStyle(isAllSingleSelected),
              fontSize: "14px",
            }}
          >
            {isAllSingleSelected ? "✓ 전체해제" : "✓ 전체선택"}
          </button>
          {singleGroupItems.map(item => {
            const isSel = filters.propertyTypes.includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleProp(item)}
                style={subPillStyle(isSel)}
              >
                {item} {isSel && "✓"}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 🏢 [일반 공실 모드] 4대 대분류 + 세부분류 2단계 구조
  return (
    <div>
      {/* 1단계: 매물 대분류 선택 */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "#6b7280", marginBottom: "8px" }}>
          1. 매물 대분류 선택
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
          {/* 최상단 1번: 전체선택 / 전체해제 */}
          <button
            type="button"
            onClick={handleToggleGlobalAll}
            style={{
              ...mainTabStyle(isAllItemsSelected),
              gridColumn: "1 / -1",
              fontSize: "14px",
              padding: "10px 8px",
            }}
          >
            {isAllItemsSelected ? "✓ 전체해제 (모든 유형 선택됨)" : "✓ 대분류 전체선택"}
          </button>

          {PROPERTY_TYPES.map(g => {
            const hasSelectedItems = g.items.some(item => filters.propertyTypes.includes(item));
            const isTabFocused = activeGroup === g.group;

            return (
              <button
                key={g.group}
                type="button"
                onClick={() => handleSelectGroup(g.group)}
                style={mainTabStyle(isTabFocused || hasSelectedItems)}
              >
                {g.group === "아파트·오피스텔" && "🏢 "}
                {g.group === "빌라·주택" && "🏡 "}
                {g.group === "원룸·투룸(풀옵션)" && "🛏️ "}
                {g.group === "상가·사무실·공장·토지" && "🏬 "}
                {g.group} {hasSelectedItems && "✓"}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2단계: 선택된 1차 대분류의 세부 분류(소분류) 선택 */}
      <div style={{ background: "#f9fafb", padding: "14px", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "#102c57", marginBottom: "10px" }}>
          2. 세부 분류 선택 ({activeGroup})
        </div>

        {/* 2단계 세부분류 그리드 (1번 맨 앞: 해당 1차 카테고리 전용 전체선택/전체해제) */}
        <div style={{ marginBottom: "10px" }}>
          <button
            type="button"
            onClick={handleToggleGroupAll}
            style={{
              ...subPillStyle(isAllGroupSelected),
              width: "100%",
              padding: "9px 8px",
              fontWeight: 800,
              fontSize: "13px",
            }}
          >
            {isAllGroupSelected ? `✓ ${activeGroup} 세부분류 전체해제` : `✓ ${activeGroup} 세부분류 전체선택`}
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
              {item} {filters.propertyTypes.includes(item) && "✓"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
