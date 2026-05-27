"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getVacancies, getAgencyInfo, getVacancyDetail, getVacanciesForMap } from "@/app/actions/vacancy";
import { getVacancyComments, createVacancyComment } from "@/app/actions/vacancyComments";
import { getVacancyUserData, toggleWishlistToDB, addRecentViewToDB } from "@/app/actions/vacancyUserData";
import { getPermissionLevel } from "@/utils/permissionCheck";
import { handleLocationPermissionDenied, handleLocationUnavailable } from "@/utils/locationPermission";
import MapTopAuthButtons from "@/components/MapTopAuthButtons";
import AuthModal from "@/components/AuthModal";
import BookmarkCategoryModal from "@/components/BookmarkCategoryModal";
import { getBookmarkCategories } from "@/app/actions/bookmark";

// Import modular components
import GongsilSidebar from "./GongsilSidebar";
import GongsilDetailPanel from "./GongsilDetailPanel";
import KakaoMapView from "./KakaoMapView";

// Import helpers and constants
import {
  CATEGORY_CONFIG,
  CATEGORY_TO_PROPERTY_TYPE,
  PRICE_GRID,
  AREA_GRID,
  YEAR_GRID,
  UNIT_GRID,
  MAINT_PRESETS,
  getCleanAddrText,
  getPriceText,
  formatAmount,
  isApartmentType,
} from "./gongsilHelpers";

const MAEMAE_SCALE = [
  0,
  10000000,   // 1천만
  30000000,   // 3천만
  50000000,   // 5천만
  100000000,  // 1억
  200000000,  // 2억
  300000000,  // 3억
  500000000,  // 5억
  700000000,  // 7억
  1000000000, // 10억
  1500000000, // 15억
  2000000000, // 20억
  3000000000, // 30억
  4000000000, // 40억
  5000000000, // 50억
];

const DEPOSIT_SCALE = [
  0,
  5000000,    // 500만
  10000000,   // 1천만
  20000000,   // 2천만
  30000000,   // 3천만
  50000000,   // 5천만
  100000000,  // 1억
  150000000,  // 1.5억
  200000000,  // 2억
  300000000,  // 3억
  500000000,  // 5억
  700000000,  // 7억
  1000000000, // 10억
  1500000000, // 15억
  2000000000, // 20억
];

const RENT_SCALE = [
  0,
  100000,   // 10만
  200000,   // 20만
  300000,   // 30만
  400000,   // 40만
  500000,   // 50만
  600000,   // 60만
  800000,   // 80만
  1000000,  // 100만
  1200000,  // 120만
  1500000,  // 150만
  2000000,  // 200만
  3000000,  // 300만
  4000000,  // 400만
  5000000,  // 500만
];

const AREA_SCALE = [
  0,
  10,
  20,
  30,
  40,
  50,
  60,
  70,
  80,
  100,
  120,
  150,
  200,
  300,
  500,
  1000,
];

const YEAR_SCALE = [
  1960,
  1970,
  1980,
  1990,
  1995,
  2000,
  2005,
  2010,
  2015,
  2020,
  2022,
  2024,
  2026,
];

const UNIT_SCALE = [
  0,
  50,
  100,
  200,
  300,
  500,
  700,
  1000,
  1500,
  2000,
  2500,
  3000,
  4000,
  5000,
];

const getScaleIndex = (val: number | null, scale: number[], isMax: boolean) => {
  if (val === null) return isMax ? scale.length - 1 : 0;
  let closestIdx = 0;
  let minDiff = Infinity;
  for (let i = 0; i < scale.length; i++) {
    const diff = Math.abs(scale[i] - val);
    if (diff < minDiff) {
      minDiff = diff;
      closestIdx = i;
    }
  }
  return closestIdx;
};

export default function GongsilClient({ initialVacancies }: { initialVacancies: any[] }) {
  /* ── State & Refs ── */
  const searchParams = useSearchParams();
  const [dbVacancies, setDbVacancies] = useState<any[]>(initialVacancies);
  const [activeCategory, setActiveCategory] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("gongsil_category") || "all";
    }
    return "all";
  });
  const [activePills, setActivePills] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const cat = localStorage.getItem("gongsil_category") || "all";
      const saved = localStorage.getItem("gongsil_pills");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
      const config = CATEGORY_CONFIG[cat];
      if (config && config.pills) {
        return config.pills;
      }
    }
    return [];
  });
  const [activeProperty, setActiveProperty] = useState<string | number | null>(null);
  const [prevPropertyId, setPrevPropertyId] = useState<string | number | null>(null);
  const [showDetail, setShowDetail] = useState(true);
  const [activeDetailTab, setActiveDetailTab] = useState<
    "info" | "realtor" | "auction_detail" | "auction_property" | "auction_bid" | "auction_market"
  >("info");
  const [showDetailFilters, setShowDetailFilters] = useState(false);
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAuctionMode, setIsAuctionMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("gongsil_category") === "auction";
    }
    return false;
  });
  const [activeMode, setActiveMode] = useState<"공실" | "분양" | "경매">(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("gongsil_category") === "auction" ? "경매" : "공실";
    }
    return "공실";
  });
  const shareDropdownRef = useRef<HTMLDivElement>(null);

  const [wishTab, setWishTab] = useState<"wish" | "recent">("wish");
  const [recentViews, setRecentViews] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [wishlistData, setWishlistData] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null | "ALL">("ALL");

  // 폴더 이동 모달 상태
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedVacancyId, setSelectedVacancyId] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userLevel, setUserLevel] = useState<number>(0);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSecret, setIsSecret] = useState(true);
  const [replyTarget, setReplyTarget] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [realtorTradeType, setRealtorTradeType] = useState<string>("전체");

  // ── 실제 필터 상태 (네이버 부동산 스타일) ──
  const [filterTradeTypes, setFilterTradeTypes] = useState<string[]>([]);
  const [tempFilterTradeTypes, setTempFilterTradeTypes] = useState<string[]>([]);
  const [tempMaemaeMin, setTempMaemaeMin] = useState<number | null>(null);
  const [tempMaemaeMax, setTempMaemaeMax] = useState<number | null>(null);
  const [tempDepositMin, setTempDepositMin] = useState<number | null>(null);
  const [tempDepositMax, setTempDepositMax] = useState<number | null>(null);
  const [tempRentMin, setTempRentMin] = useState<number | null>(null);
  const [tempRentMax, setTempRentMax] = useState<number | null>(null);
  const [sliderInteractions, setSliderInteractions] = useState<Record<string, { min: boolean; max: boolean }>>({});
  const [roomBathInteractions, setRoomBathInteractions] = useState({ room: false, bath: false });
  const [savedCategoryAlerts, setSavedCategoryAlerts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const saved = localStorage.getItem("gongsil_saved_category_alerts");
    if (saved) {
      try {
        setSavedCategoryAlerts(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleToggleCategoryAlert = (cat: string) => {
    setSavedCategoryAlerts((prev) => {
      const isCurrentlySaved = prev[cat];
      const updated = { ...prev, [cat]: !isCurrentlySaved };
      localStorage.setItem("gongsil_saved_category_alerts", JSON.stringify(updated));
      
      if (!isCurrentlySaved) {
        setToastMessage(`${CATEGORY_CONFIG[cat]?.name || "해당"} 카테고리의 맞춤 필터 조건이 알림으로 등록되었습니다.`);
      } else {
        setToastMessage(`${CATEGORY_CONFIG[cat]?.name || "해당"} 카테고리의 알림 등록이 해제되었습니다.`);
      }
      return updated;
    });
  };

  const [appliedMaemaeMin, setAppliedMaemaeMin] = useState<number | null>(null);
  const [appliedMaemaeMax, setAppliedMaemaeMax] = useState<number | null>(null);
  const [appliedDepositMin, setAppliedDepositMin] = useState<number | null>(null);
  const [appliedDepositMax, setAppliedDepositMax] = useState<number | null>(null);
  const [appliedRentMin, setAppliedRentMin] = useState<number | null>(null);
  const [appliedRentMax, setAppliedRentMax] = useState<number | null>(null);
  const [popoverSearchKeyword, setPopoverSearchKeyword] = useState<string>("");
  const [filterSearchKeyword, setFilterSearchKeyword] = useState<string>("");
  const [activeSection, setActiveSection] = useState<string>("거래유형");
  const [isFilterCollapsed, setIsFilterCollapsed] = useState<boolean>(false);
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [filterOffset, setFilterOffset] = useState({ x: 0, y: 0 });
  const [isDraggingFilter, setIsDraggingFilter] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const offsetStartRef = useRef({ x: 0, y: 0 });
  const scrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "BUTTON" ||
      target.tagName === "SPAN" ||
      target.tagName === "A" ||
      target.closest(".dual-slider-container")
    ) {
      return;
    }
    setIsDraggingFilter(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    offsetStartRef.current = { ...filterOffset };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingFilter) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setFilterOffset({
        x: offsetStartRef.current.x + dx,
        y: offsetStartRef.current.y + dy,
      });
    };
    const handleMouseUp = () => {
      if (isDraggingFilter) {
        setIsDraggingFilter(false);
      }
    };
    if (isDraggingFilter) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingFilter]);

  useEffect(() => {
    setFilterOffset({ x: 0, y: 0 });
  }, [activeFilterDropdown]);

  const [filterPriceMin, setFilterPriceMin] = useState<number | null>(null);
  const [filterPriceMax, setFilterPriceMax] = useState<number | null>(null);
  const [filterAreaMin, setFilterAreaMin] = useState<number | null>(null); // ㎡ 단위
  const [filterAreaMax, setFilterAreaMax] = useState<number | null>(null);
  const [filterMaintIdx, setFilterMaintIdx] = useState(0);
  const [filterRoomCount, setFilterRoomCount] = useState<number | null>(null);
  const [filterBathCount, setFilterBathCount] = useState<number | null>(null);
  const [filterDirection, setFilterDirection] = useState<string | null>(null);
  const [filterYearMin, setFilterYearMin] = useState<number | null>(null);
  const [filterYearMax, setFilterYearMax] = useState<number | null>(null);
  const [filterUnitMin, setFilterUnitMin] = useState<number | null>(null);
  const [filterUnitMax, setFilterUnitMax] = useState<number | null>(null);
  const [filterFloor, setFilterFloor] = useState<string | null>(null);
  const [filterSaleStage, setFilterSaleStage] = useState<string[]>([]);
  const [filterSaleType, setFilterSaleType] = useState<string[]>([]);
  const [filterOptions, setFilterOptions] = useState<string[]>([]);
  const [filterOwnerRole, setFilterOwnerRole] = useState<string | null>(null);
  const [filterCommissionType, setFilterCommissionType] = useState<string | null>(null);
  const [filterThemes, setFilterThemes] = useState<string[]>([]);

  const [selectedClusterIds, setSelectedClusterIds] = useState<string[] | null>(null);
  const [mapBounds, setMapBounds] = useState<any>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(6);
  const [selectedRegion, setSelectedRegion] = useState<{ sido: string; gugun: string; dong: string } | null>(null);
  const [mapCenterRegion, setMapCenterRegion] = useState<{ sido: string; gugun: string; dong: string } | null>(null);
  const [visibleCount, setVisibleCount] = useState(30);
  const [isFetchingVacancies, setIsFetchingVacancies] = useState(false);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [agencyInfo, setAgencyInfo] = useState<any>(null);

  // Lazy Loading Detail Map
  const [fullDetailsMap, setFullDetailsMap] = useState<Record<string, any>>({});

  const itemMapRef = useRef<HTMLDivElement>(null);
  const roadviewRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<any>(null);

  useEffect(() => {
    if (activeFilterDropdown === "거래유형" || activeFilterDropdown === "거래방식") {
      setTempFilterTradeTypes(filterTradeTypes);
      setTempMaemaeMin(appliedMaemaeMin);
      setTempMaemaeMax(appliedMaemaeMax);
      setTempDepositMin(appliedDepositMin);
      setTempDepositMax(appliedDepositMax);
      setTempRentMin(appliedRentMin);
      setTempRentMax(appliedRentMax);
    }
  }, [activeFilterDropdown]);

  // Set initial data and ref
  useEffect(() => {
    if (initialVacancies && initialVacancies.length > 0) {
      const withImages = initialVacancies.map((v: any) => ({
        ...v,
        images: v.vacancy_photos
          ? [...v.vacancy_photos].sort((a: any, b: any) => a.sort_order - b.sort_order).map((p: any) => p.url)
          : [],
      }));
      setDbVacancies(withImages);
    }
  }, [initialVacancies]);

  // 💡 Bbox(지도의 경계면) 변화 시 Supabase 실시간 Bbox 데이터 패치 적용 (성능 60fps 극대화)
  useEffect(() => {
    if (!mapBounds) return;

    const fetchBboxVacancies = async () => {
      setIsFetchingVacancies(true);
      try {
        const sw = mapBounds.getSouthWest();
        const ne = mapBounds.getNorthEast();

        const swLat = sw.getLat();
        const swLng = sw.getLng();
        const neLat = ne.getLat();
        const neLng = ne.getLng();

        // Server Action 호출하여 범위 내 매물만 초고속 fetch
        const res = await getVacanciesForMap({
          bbox: { swLat, swLng, neLat, neLng }
        });

        if (res.success && res.data) {
          const withImages = res.data.map((v: any) => ({
            ...v,
            images: v.vacancy_photos
              ? [...v.vacancy_photos].sort((a: any, b: any) => a.sort_order - b.sort_order).map((p: any) => p.url)
              : [],
          }));
          setDbVacancies(withImages);
        }
      } catch (err) {
        console.error("Failed to fetch bbox vacancies:", err);
      } finally {
        setIsFetchingVacancies(false);
      }
    };

    fetchBboxVacancies();
  }, [mapBounds]);

  useEffect(() => {
    let localRecent: any[] = [];
    const savedRecent = localStorage.getItem("gongsil_recent_views");
    if (savedRecent) {
      try {
        localRecent = JSON.parse(savedRecent);
        setRecentViews(localRecent);
      } catch (e) {}
    }

    if (currentUser) {
      getVacancyUserData(currentUser.id).then((res) => {
        if (res.success) {
          const mergedWish = Array.from(new Set([...(res.wishlist || [])]));
          const mergedRecent = Array.from(new Set([...(res.recentViews || []), ...localRecent])).slice(0, 50);

          setWishlist(mergedWish);
          setWishlistData(res.wishlistData || []);
          setRecentViews(mergedRecent);
          localStorage.setItem("gongsil_recent_views", JSON.stringify(mergedRecent));
        }
      });
      getBookmarkCategories(currentUser.id, "VACANCY").then((res) => {
        if (res.success) setCategories(res.categories || []);
      });
    } else {
      setWishlist([]); // 로그아웃 시 찜 목록 초기화
      setWishlistData([]);
      setCategories([]);
    }
  }, [currentUser, showCategoryModal]);

  useEffect(() => {
    if (activeProperty) {
      setRecentViews((prev) => {
        const id = activeProperty;
        const newViews = [id, ...prev.filter((x) => x !== id)].slice(0, 50);
        localStorage.setItem("gongsil_recent_views", JSON.stringify(newViews));
        return newViews;
      });
      if (currentUser) {
        addRecentViewToDB(currentUser.id, String(activeProperty));
      }
    }
  }, [activeProperty, currentUser]);

  useEffect(() => {
    document.title = isAuctionMode ? "경/공매 | 공실뉴스" : "공실열람 | 공실뉴스";
  }, [isAuctionMode]);

  const toggleWishlist = (id: any) => {
    if (!currentUser) {
      setToastMessage("관심공실로 등록하시려면 로그인이 필요합니다.");
      setIsAuthModalOpen(true);
      return;
    }

    const isWished = wishlist.includes(id);
    setToastMessage(isWished ? "찜을 해제했습니다." : "찜했습니다.");

    setWishlist((prev) => {
      return isWished ? prev.filter((x) => x !== id) : [id, ...prev];
    });

    toggleWishlistToDB(currentUser.id, String(id), !isWished);
  };

  const filteredVacancies = React.useMemo(() => {
    let list = dbVacancies;

    if (isAuctionMode) {
      // Auction Mode: Only show auction listings
      let auctionList = list.filter((v) => v.trade_type === "경매");
      // [대표님 지침] 아무것도 선택하지 않으면 아무것도 노출하지 않습니다.
      if (activePills.length === 0) {
        return [];
      }
      auctionList = auctionList.filter((v) => {
        const meta = (v as any).metadata || {};
        const mcls = meta.cltrUsgMclsCtgrNm || "";
        const scls = meta.cltrUsgSclsCtgrNm || "";
        return activePills.some((pill) => {
          if (pill === "아파트") return scls === "아파트";
          if (pill === "단독/다가구") return scls === "단독주택" || scls === "다가구주택";
          if (pill === "빌라/주택")
            return mcls === "주거용건물" && scls !== "아파트" && scls !== "단독주택" && scls !== "다가구주택";
          if (pill === "상가/점포")
            return mcls.includes("상업") || scls.includes("상가") || scls.includes("점포") || scls.includes("판매");
          if (pill === "사무실/지산")
            return (
              scls.includes("사무") ||
              mcls.includes("업무") ||
              scls.includes("오피스텔") ||
              scls.includes("아파트형") ||
              scls.includes("지식산업")
            );
          if (pill === "빌딩/근생")
            return (
              mcls.includes("근린생활") ||
              scls.includes("상가주택") ||
              scls.includes("빌딩") ||
              mcls.includes("숙박") ||
              mcls.includes("의료")
            );
          if (pill === "공장/창고")
            return (
              (scls.includes("공장") || scls.includes("창고") || scls.includes("제조") || mcls.includes("산업")) &&
              !scls.includes("아파트형") &&
              !scls.includes("지식산업")
            );
          if (pill === "토지") return mcls === "토지";
          return false;
        });
      });
      return auctionList;
    }

    // Standard Mode: Completely exclude auction listings so they do not mix in!
    list = list.filter((v) => v.trade_type !== "경매");

    if (activeCategory === "wish") {
      if (wishTab === "recent") {
        return recentViews
          .map((id) => dbVacancies.find((v) => v.id === id))
          .filter(Boolean) as any[];
      }
      if (wishTab === "wish") {
        let list = wishlist
          .map((id) => dbVacancies.find((v) => v.id === id))
          .filter(Boolean) as any[];
        // 카테고리 필터 적용
        if (selectedCategoryId !== "ALL") {
          list = list.filter((v) => {
            const b = wishlistData.find((wd) => String(wd.vacancy_id) === String(v.id));
            if (!b) return false;
            return b.category_id === selectedCategoryId;
          });
        }
        return list;
      }
      return [];
    }

    // 1) property_type 필터 (메인 카테고리 탭) - 'all'이면 전체 표시
    const dbPropType = CATEGORY_TO_PROPERTY_TYPE[activeCategory];
    if (dbPropType) {
      list = list.filter((v) => v.property_type === dbPropType);
    }

    // 2) sub_category 필터 (Pills) - 'all'이면 무시. [대표님 지침] 아무것도 선택하지 않으면 아무것도 노출하지 않습니다.
    if (activeCategory !== "all") {
      if (activePills.length === 0) {
        return [];
      }
      list = list.filter((v) => activePills.includes(v.sub_category));
    }

    // 3) 거래방식 및 통합 가격 필터 적용
    if (activeCategory === "apart" || activeCategory === "villa") {
      if (filterTradeTypes.length > 0) {
        list = list.filter((v) => filterTradeTypes.includes(v.trade_type));
      }
      
      list = list.filter((v) => {
        if (v.trade_type === "매매") {
          if (appliedMaemaeMin !== null && v.deposit < appliedMaemaeMin) return false;
          if (appliedMaemaeMax !== null && v.deposit > appliedMaemaeMax) return false;
        } else if (v.trade_type === "전세") {
          if (appliedDepositMin !== null && v.deposit < appliedDepositMin) return false;
          if (appliedDepositMax !== null && v.deposit > appliedDepositMax) return false;
        } else if (v.trade_type === "월세" || v.trade_type === "단기") {
          if (appliedDepositMin !== null && v.deposit < appliedDepositMin) return false;
          if (appliedDepositMax !== null && v.deposit > appliedDepositMax) return false;
          if (appliedRentMin !== null && (v.monthly_rent || 0) < appliedRentMin) return false;
          if (appliedRentMax !== null && (v.monthly_rent || 0) > appliedRentMax) return false;
        }
        return true;
      });
    } else {
      if (filterTradeTypes.length > 0) {
        list = list.filter((v) => filterTradeTypes.includes(v.trade_type));
      }
      if (filterPriceMin !== null || filterPriceMax !== null) {
        list = list.filter((v) => {
          const dep = v.deposit || 0;
          if (filterPriceMin !== null && dep < filterPriceMin) return false;
          if (filterPriceMax !== null && dep > filterPriceMax) return false;
          return true;
        });
      }
    }

    // 5) 면적 필터 (전용면적 기준, ㎡ min/max)
    if (filterAreaMin !== null || filterAreaMax !== null) {
      list = list.filter((v) => {
        const area = v.exclusive_m2 || v.supply_m2 || 0;
        if (filterAreaMin !== null && area < filterAreaMin) return false;
        if (filterAreaMax !== null && area > filterAreaMax) return false;
        return true;
      });
    }

    // 6) 관리비 필터
    if (filterMaintIdx > 0) {
      const m = MAINT_PRESETS[filterMaintIdx];
      list = list.filter(
        (v) =>
          (v.maintenance_fee || 0) >= m.min &&
          (v.maintenance_fee || 0) < (m.max === Infinity ? 99999999 : m.max)
      );
    }

    // 7) 방 개수
    if (filterRoomCount !== null) {
      list = list.filter((v) => (v.room_count || 0) >= filterRoomCount);
    }

    // 8) 욕실 개수
    if (filterBathCount !== null) {
      list = list.filter((v) => (v.bath_count || 0) >= filterBathCount);
    }

    // 9) 방향
    if (filterDirection) {
      list = list.filter((v) => v.direction === filterDirection);
    }

    // 10) 사용승인일 (연도 필터)
    if (filterYearMin !== null || filterYearMax !== null) {
      list = list.filter((v) => {
        const year = v.approval_year || 0;
        if (!year) return false;
        if (filterYearMin !== null && year < filterYearMin) return false;
        if (filterYearMax !== null && year > filterYearMax) return false;
        return true;
      });
    }

    // 11) 세대수 필터
    if (filterUnitMin !== null || filterUnitMax !== null) {
      list = list.filter((v) => {
        const units = v.total_units || 0;
        if (!units) return false;
        if (filterUnitMin !== null && units < filterUnitMin) return false;
        if (filterUnitMax !== null && units > filterUnitMax) return false;
        return true;
      });
    }

    // 12) 등록자 유형 (일반인/부동산)
    if (filterOwnerRole) {
      list = list.filter((v) => v.owner_role === filterOwnerRole);
    }

    // 13) 중개보수 필터
    if (filterCommissionType) {
      list = list.filter((v) => {
        const vc = v.realtor_commission || v.commission_type || "";
        
        // Calculate the commission percentage of the listing
        const percentMatch = vc.match(/(\d+)%/);
        const vcPercent = percentMatch
          ? parseInt(percentMatch[1], 10)
          : (vc.includes("100") || vc === "법정수수료" || vc.includes("법정"))
          ? 100
          : (vc.includes("50"))
          ? 50
          : (vc.includes("25"))
          ? 25
          : 0;

        if (filterCommissionType === "공동중개") {
          // "공동중개 선택하면 수수료 100%까지"
          return vc.includes("공동") || vcPercent >= 0;
        }

        const minPercent = parseInt(filterCommissionType, 10);
        if (!isNaN(minPercent)) {
          // "25%하면 50 100%는 자동으로 되도록 해줘"
          return vcPercent >= minPercent;
        }
        return true;
      });
    }

    // 14) 테마 키워드
    if (filterThemes.length > 0) {
      list = list.filter((v) => {
        if (!v.themes || !Array.isArray(v.themes)) return false;
        return filterThemes.some((t) => v.themes.includes(t));
      });
    }

    // 15) 검색어 키워드 필터 (공실번호, 건물명, 지명 주소 등)
    if (filterSearchKeyword) {
      const kw = filterSearchKeyword.trim().toLowerCase();
      list = list.filter((v) => {
        const vacancyNo = String(v.vacancy_no || "").toLowerCase();
        const bldName = String(v.building_name || "").toLowerCase();
        const dongName = String(v.dong || "").toLowerCase();
        const sigunguName = String(v.sigungu || "").toLowerCase();
        const detailAddr = String(v.detail_addr || "").toLowerCase();
        return (
          vacancyNo.includes(kw) ||
          bldName.includes(kw) ||
          dongName.includes(kw) ||
          sigunguName.includes(kw) ||
          detailAddr.includes(kw)
        );
      });
    }

    return list;
  }, [
    dbVacancies,
    activeCategory,
    activePills,
    filterTradeTypes,
    appliedMaemaeMin,
    appliedMaemaeMax,
    appliedDepositMin,
    appliedDepositMax,
    appliedRentMin,
    appliedRentMax,
    filterPriceMin,
    filterPriceMax,
    filterAreaMin,
    filterAreaMax,
    filterMaintIdx,
    filterRoomCount,
    filterBathCount,
    filterDirection,
    filterYearMin,
    filterYearMax,
    filterUnitMin,
    filterUnitMax,
    filterOwnerRole,
    filterCommissionType,
    filterThemes,
    filterSearchKeyword,
    wishTab,
    recentViews,
    isAuctionMode,
  ]);

  // Reset pagination whenever filters, map bounds, or selected cluster changes to keep map responsive
  useEffect(() => {
    setVisibleCount(30);
  }, [filteredVacancies, selectedClusterIds, mapBounds]);

  // ── 지도 범위 / 클러스터 선택 적용 ──
  const displayVacancies = React.useMemo(() => {
    let filtered = filteredVacancies;

    // MY관심공실인 경우, 지도 범위와 상관없이 모든 대상 항목을 그대로 보여줍니다.
    if (activeCategory === "wish") {
      return filtered;
    }

    if (selectedRegion) {
      filtered = filtered.filter((v) => {
        if (selectedRegion.sido && selectedRegion.sido !== "시/도 선택" && selectedRegion.sido !== "-") {
          const vSido = v.sido || "";
          const matchSido =
            vSido.includes(selectedRegion.sido) ||
            selectedRegion.sido.includes(vSido) ||
            selectedRegion.sido.substring(0, 2) === vSido.substring(0, 2);
          if (!matchSido) return false;
        }
        if (selectedRegion.gugun && selectedRegion.gugun !== "-") {
          const vGugun = v.sigungu || "";
          const matchGugun = vGugun.includes(selectedRegion.gugun) || selectedRegion.gugun.includes(vGugun);
          if (!matchGugun) return false;
        }
        if (selectedRegion.dong && selectedRegion.dong !== "-") {
          const vDong = v.dong || "";
          const matchDong = vDong.includes(selectedRegion.dong) || selectedRegion.dong.includes(vDong);
          if (!matchDong) return false;
        }
        return true;
      });
    } else if (selectedClusterIds) {
      filtered = filtered.filter((v) => selectedClusterIds.includes(String(v.id)));
    } else if (mapBounds && (window as any).kakao?.maps) {
      filtered = filtered.filter((v) => {
        if (!v.lat || !v.lng) return false;
        const pos = new (window as any).kakao.maps.LatLng(v.lat, v.lng);
        return mapBounds.contain(pos);
      });
    }
    return filtered;
  }, [filteredVacancies, selectedClusterIds, mapBounds, activeCategory, selectedRegion]);

  const showArticleOnMap = useCallback((prop: any) => {
    if (!kakaoMapRef.current || !prop.lat || !prop.lng) return;
    const kakao = (window as any).kakao;
    const position = new kakao.maps.LatLng(prop.lat, prop.lng);
    kakaoMapRef.current.panTo(position);
  }, []);

  // Handle ?id=X from main page navigation
  useEffect(() => {
    const idParam = searchParams.get("id");
    if (idParam && dbVacancies.length > 0) {
      const target = dbVacancies.find((v) => String(v.id) === String(idParam));
      if (target) {
        setActiveProperty(target.id);
        setShowDetail(true);
        setActiveDetailTab("info");
        const catEntry = Object.entries(CATEGORY_TO_PROPERTY_TYPE).find(
          ([, pType]) => pType === target.property_type
        );
        if (catEntry) {
          setActiveCategory(catEntry[0]);
          setActivePills(target.sub_category ? [target.sub_category] : []);
        }
        if (target.lat && target.lng && kakaoMapRef.current) {
          const kakao = (window as any).kakao;
          if (kakao?.maps) {
            kakaoMapRef.current.panTo(new kakao.maps.LatLng(target.lat, target.lng));
            kakaoMapRef.current.setLevel(5);
          }
        }
        setSelectedClusterIds([String(target.id)]);
      }
    }
  }, [searchParams, dbVacancies]);

  // On activeProperty change, reset detail scroll position
  useEffect(() => {
    const el = document.getElementById("detail-scroll-container");
    if (el) el.scrollTop = 0;
  }, [activeProperty, showDetail]);

  // Fetch full details for lazy loading
  useEffect(() => {
    if (showDetail && activeProperty && !fullDetailsMap[activeProperty]) {
      getVacancyDetail(String(activeProperty)).then((res) => {
        if (res.success && res.data) {
          const detailProp = {
            ...res.data,
            images: res.photos
              ? res.photos.sort((a: any, b: any) => a.sort_order - b.sort_order).map((p: any) => p.url)
              : [],
          };
          setFullDetailsMap((prev) => ({ ...prev, [activeProperty]: detailProp }));
        }
      });
    }
  }, [showDetail, activeProperty]);

  useEffect(() => {
    if (showDetail && activeProperty && activeDetailTab === "realtor") {
      const prop = dbVacancies.find((v) => v.id === activeProperty);
      if (prop?.owner_id && prop?.owner_role === "REALTOR") {
        getAgencyInfo(prop.owner_id).then((res) => {
          if (res.success) setAgencyInfo(res.data);
          else setAgencyInfo(null);
        });
      } else {
        setAgencyInfo(null);
      }
    }
  }, [showDetail, activeProperty, activeDetailTab, dbVacancies]);

  useEffect(() => {
    async function initUser() {
      const { createClient } = await import("@/utils/supabase/client");
      const client = createClient();
      const { data } = await client.auth.getUser();
      if (data?.user) {
        const { data: memberData } = await client
          .from("members")
          .select("role, plan_type")
          .eq("id", data.user.id)
          .single();
        setCurrentUser({ ...data.user, role: memberData?.role });
        if (memberData) {
          setUserLevel(getPermissionLevel(memberData));
        } else {
          setUserLevel(1);
        }
      }
    }
    initUser();
  }, []);

  const fetchComments = useCallback(async (vacancyId: string) => {
    const res = await getVacancyComments(vacancyId);
    if (res.success) setComments(res.data || []);
  }, []);

  // 해시 링크 네비게이션 처리 (댓글 알림에서 이동 시)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith("#comment-") && comments.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(hash.substring(1));
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.style.backgroundColor = "#eff6ff";
          el.style.transition = "background-color 1.5s ease-out";
          setTimeout(() => {
            el.style.backgroundColor = "transparent";
          }, 2000);
        }
      }, 300);
    }
  }, [comments]);

  const handleCommentSubmit = async () => {
    if (!activeProperty || !newComment.trim()) return;
    if (!currentUser) return alert("로그인 후 이용 가능합니다.");

    const authorNameValue = currentUser.user_metadata?.name || currentUser.email?.split("@")[0] || "회원";

    const res = await createVacancyComment({
      vacancy_id: String(activeProperty),
      author_id: currentUser.id,
      author_name: authorNameValue,
      content: newComment.trim(),
      is_secret: isSecret,
      parent_id: replyTarget?.id || undefined,
    });

    if (res.success) {
      setNewComment("");
      setReplyTarget(null);
      fetchComments(String(activeProperty));
    } else {
      console.error("Comment submit error:", res.error);
      alert("코멘트 등록 중 오류가 발생했습니다. " + (res.error || ""));
    }
  };

  useEffect(() => {
    if (showDetail && activeProperty) {
      const prop = dbVacancies.find((v) => v.id === activeProperty);
      if (prop?.id) fetchComments(prop.id.toString());
      if (
        (activeDetailTab === "info" || activeDetailTab === "auction_detail") &&
        prop?.lat &&
        prop?.lng &&
        mapLoaded &&
        (window as any).kakao?.maps
      ) {
        const kakao = (window as any).kakao;
        const pos = new kakao.maps.LatLng(prop.lat, prop.lng);

        const isPrivateAddr = prop.address_exposure && prop.address_exposure !== "번지공개";
        const isApt = isApartmentType(prop.property_type) || isApartmentType(prop.sub_category);
        const useCircle = isPrivateAddr && !isApt;

        if (itemMapRef.current) {
          const map = new kakao.maps.Map(itemMapRef.current, { center: pos, level: useCircle ? 5 : 3 });
          if (useCircle) {
            map.setMinLevel(5);
            map.setMaxLevel(8);
            new kakao.maps.Circle({
              center: pos,
              radius: 300,
              strokeWeight: 2,
              strokeColor: "#3b82f6",
              strokeOpacity: 0.6,
              strokeStyle: "solid",
              fillColor: "#3b82f6",
              fillOpacity: 0.15,
              map: map,
            });
          } else {
            new kakao.maps.Marker({ position: pos, map: map });
          }
        }

        if (roadviewRef.current) {
          const rv = new kakao.maps.Roadview(roadviewRef.current);
          const rvClient = new kakao.maps.RoadviewClient();

          if (useCircle && agencyInfo?.lat && agencyInfo?.lng) {
            const agencyPos = new kakao.maps.LatLng(agencyInfo.lat, agencyInfo.lng);
            rvClient.getNearestPanoId(agencyPos, 50, (panoId: any) => {
              if (panoId) {
                rv.setPanoId(panoId, agencyPos);
              } else {
                if (roadviewRef.current)
                  roadviewRef.current.innerHTML =
                    '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#999; font-size:13px;">중개업소 위치의 로드뷰가 제공되지 않습니다.</div>';
              }
            });
          } else {
            rvClient.getNearestPanoId(pos, 50, (panoId: any) => {
              if (panoId) {
                rv.setPanoId(panoId, pos);
              } else {
                if (roadviewRef.current)
                  roadviewRef.current.innerHTML =
                    '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#999; font-size:13px;">해당 위치의 로드뷰가 제공되지 않습니다.</div>';
              }
            });
          }
        }
      }
    }
  }, [showDetail, activeProperty, activeDetailTab, dbVacancies, agencyInfo, mapLoaded]);

  useEffect(() => {
    if (
      (window as any).kakao &&
      (window as any).kakao.maps &&
      typeof (window as any).kakao.maps.LatLng === "function"
    ) {
      setMapLoaded(true);
      return;
    }
    const scriptId = "kakao-map-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      const kakaoApiKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc";
      script.id = scriptId;
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoApiKey}&libraries=services,clusterer&autoload=false`;
      script.onerror = () => setMapError("카카오맵 JS 키가 유효하지 않거나 등록되지 않았습니다.");
      document.head.appendChild(script);
      script.onload = () => {
        (window as any).kakao.maps.load(() => {
          setMapLoaded(true);
        });
      };
    } else {
      const check = setInterval(() => {
        if (
          (window as any).kakao &&
          (window as any).kakao.maps &&
          typeof (window as any).kakao.maps.LatLng === "function"
        ) {
          clearInterval(check);
          setMapLoaded(true);
        }
      }, 100);
    }
  }, []);

  // Preload Kakao Share SDK
  useEffect(() => {
    const scriptId = "kakao-share-script";
    if (document.getElementById(scriptId)) return;
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
    script.onload = () => {
      const Kakao = (window as any).Kakao;
      if (Kakao && !Kakao.isInitialized()) {
        const kakaoJsKey =
          process.env.NEXT_PUBLIC_KAKAO_JS_KEY ||
          process.env.NEXT_PUBLIC_KAKAO_APP_KEY ||
          "435d3602201a49ea712e5f5a36fe6efc";
        Kakao.init(kakaoJsKey);
      }
    };
    document.head.appendChild(script);
  }, []);

  // Close share dropdown on outside click
  useEffect(() => {
    if (!showShareDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (shareDropdownRef.current && !shareDropdownRef.current.contains(e.target as Node)) {
        setShowShareDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showShareDropdown]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 2000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // ── 인쇄 핸들러 ──
  const handlePrint = (prop: any) => {
    const images = prop.images && prop.images.length > 0 && prop.images[0] ? prop.images : [];
    const imageHtml = images
      .map(
        (src: string) =>
          `<img src="${src}" style="max-width:100%;max-height:300px;object-fit:contain;border-radius:6px;margin-bottom:8px;" />`
      )
      .join("");
    const addrText = getCleanAddrText(prop);
    const fullAddr = [prop.sido, prop.sigungu, prop.dong, prop.detail_addr].filter(Boolean).join(" ");
    const priceText = getPriceText(prop);
    const printWindow = window.open("", "_blank", "width=800,height=1000");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>${addrText} - 공실뉴스</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; padding: 30px; color: #222; }
          .header { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #1a73e8; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { font-size: 22px; color: #1a73e8; }
          .header .sub { font-size: 12px; color: #888; }
          .gallery { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
          .price { font-size: 24px; font-weight: 800; color: #1f5edb; margin-bottom: 12px; }
          .info-row { display: flex; border-bottom: 1px solid #eee; }
          .info-label { width: 120px; background: #f4f5f7; padding: 10px 14px; font-size: 13px; font-weight: bold; color: #444; flex-shrink: 0; }
          .info-value { flex: 1; padding: 10px 14px; font-size: 13px; color: #222; word-break: break-all; }
          .section-title { font-size: 16px; font-weight: 800; margin: 25px 0 10px; }
          .options { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 15px; }
          .option-tag { font-size: 12px; background: #f0f0f0; padding: 4px 10px; border-radius: 4px; }
          .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 15px; font-size: 11px; color: #999; text-align: center; }
          @media print { body { padding: 15px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>공실뉴스</h1>
          <span class="sub">부동산 중개망의 스마트한 변화</span>
        </div>
        <div class="gallery">${imageHtml}</div>
        <h2 style="font-size:18px;margin-bottom:8px;">${addrText}</h2>
        <div class="price">${priceText}</div>
        <div style="font-size:13px;color:#555;margin-bottom:20px;">${prop.property_type} · ${
      prop.direction || "방향없음"
    } · 공급/전용: ${prop.supply_m2 || 0}㎡ / ${prop.exclusive_m2 || 0}㎡</div>
        <div class="info-row"><div class="info-label">공실광고번호</div><div class="info-value">${
          prop.vacancy_no || "-"
        }</div></div>
        <div class="info-row"><div class="info-label">소재지</div><div class="info-value">${fullAddr || "-"}</div></div>
        <div class="info-row"><div class="info-label">공급/전용면적</div><div class="info-value">${
          prop.supply_m2 ? prop.supply_m2 + "m²" : "-"
        } / ${prop.exclusive_m2 ? prop.exclusive_m2 + "m²" : "-"}</div></div>
        <div class="info-row"><div class="info-label">해당층/총층</div><div class="info-value">${
          prop.current_floor || "-"
        } / ${prop.total_floor || "-"}</div></div>
        <div class="info-row"><div class="info-label">방/욕실</div><div class="info-value">${
          prop.room_count || 0
        }개 / ${prop.bathroom_count || 0}개</div></div>
        <div class="info-row"><div class="info-label">방향</div><div class="info-value">${prop.direction || "-"}</div></div>
        <div class="info-row"><div class="info-label">주차</div><div class="info-value">${prop.parking || "없음"}</div></div>
        <div class="info-row"><div class="info-label">입주가능일</div><div class="info-value">${
          prop.move_in_date || "즉시입주(공실)"
        }</div></div>
        <div class="info-row"><div class="info-label">관리비</div><div class="info-value">${
          prop.maintenance_fee ? prop.maintenance_fee / 10000 + "만원" : "없음"
        }</div></div>
        ${
          prop.description
            ? `<div class="info-row"><div class="info-label">상세설명</div><div class="info-value" style="white-space:pre-line;">${prop.description}</div></div>`
            : ""
        }
        ${
          prop.options && prop.options.length > 0
            ? `<div class="section-title">옵션</div><div class="options">${prop.options
                .map((o: string) => `<span class="option-tag">${o}</span>`)
                .join("")}</div>`
            : ""
        }
        <div class="footer">공실뉴스 | https://gongsilnews.com/gongsil?id=${prop.id} | 인쇄일: ${new Date().toLocaleDateString(
      "ko-KR"
    )}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 1500);
  };

  // ── 카카오톡 공유 ──
  const handleKakaoShare = (prop: any) => {
    const Kakao = (window as any).Kakao;
    if (!Kakao || !Kakao.isInitialized()) {
      alert("카카오 SDK가 로드되지 않았습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    const addrText = getCleanAddrText(prop);
    const priceText = getPriceText(prop);
    const shareUrl = `https://gongsilnews.com/gongsil?id=${prop.id}`;
    const imageUrl = prop.images?.[0] || "";

    Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: `${addrText} ${priceText}`,
        description: `${prop.property_type} · ${prop.direction || "방향없음"} · ${prop.exclusive_m2 || 0}㎡`,
        imageUrl: imageUrl,
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [{ title: "공실광고 보기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
    });
    setShowShareDropdown(false);
  };

  // ── URL 복사 ──
  const handleCopyUrl = (propId: any) => {
    const url = `https://gongsilnews.com/gongsil?id=${propId}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setToastMessage("URL이 복사되었습니다.");
      })
      .catch(() => {
        const input = document.createElement("input");
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        setToastMessage("URL이 복사되었습니다.");
      });
    setShowShareDropdown(false);
  };

  const scrollToSection = (sectionId: string) => {
    const container = document.getElementById("popover-scroll-container");
    if (sectionId === "적용하기") {
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
        setActiveSection("테마");
      }
      return;
    }
    const section = document.getElementById(`section-${sectionId}`);
    if (container && section) {
      container.scrollTo({
        top: section.offsetTop - container.offsetTop,
        behavior: "smooth",
      });
      setActiveSection(sectionId);
    }
  };

  const handleSliderRelease = (sliderKey: string, type: "min" | "max", nextSectionId: string) => {
    setSliderInteractions((prev) => {
      const current = prev[sliderKey] || { min: false, max: false };
      const updated = { ...current, [type]: true };
      if (updated.min && updated.max) {
        setTimeout(() => {
          scrollToSection(nextSectionId);
        }, 800);
        return {
          ...prev,
          [sliderKey]: { min: false, max: false }
        };
      }
      return {
        ...prev,
        [sliderKey]: updated
      };
    });
  };

  const config = CATEGORY_CONFIG[activeCategory] || {
    name: "전체",
    pills: [],
    basicFilters: [],
    detailFilters: [],
    showToggle: false,
  };
  const isOfficePill = (p: string) => p.includes("오피스텔");

  const getThemesByCategory = (category: string): string[] => {
    if (category === "apart") {
      return ["신축급", "올수리", "한강뷰", "역세권", "풀옵션", "급매물", "대출가능"];
    }
    if (category === "villa") {
      return getThemesForVilla(activePills);
    }
    if (category === "one") {
      return ["가성비", "단기임대", "주차편리", "대로변안전", "여성안심", "풀옵션", "급매물"];
    }
    if (category === "biz") {
      return ["무권리", "코너자리", "유동인구많음", "주차대수많음", "인테리어잘됨", "층고높음", "대로변"];
    }
    return ["급매물", "역세권", "신축", "풀옵션", "주차편리", "보증보험가능", "대출가능", "반려동물가능"];
  };

  const getThemesForVilla = (pills: string[]): string[] => {
    if (pills.length === 0) {
      return ["테라스", "복층", "마당있음", "투자용", "올수리", "급매물", "대출가능"];
    }
    const themes = new Set<string>();
    if (pills.includes("빌라/연립")) {
      ["테라스", "올수리", "역세권", "신축급", "복층", "급매물", "대출가능"].forEach(t => themes.add(t));
    }
    if (pills.includes("단독/다가구")) {
      ["마당있음", "복층", "올수리", "투자용", "급매물", "대출가능"].forEach(t => themes.add(t));
    }
    if (pills.includes("전원주택")) {
      ["마당있음", "테라스", "복층", "투자용", "급매물", "경치좋은"].forEach(t => themes.add(t));
    }
    if (pills.includes("상가주택")) {
      ["상가주택", "코너자리", "투자용", "올수리", "급매물", "대출가능"].forEach(t => themes.add(t));
    }
    if (themes.size === 0) {
      return ["테라스", "복층", "마당있음", "투자용", "올수리", "급매물", "대출가능"];
    }
    return Array.from(themes);
  };

  const getWizardTabs = () => {
    if (activeCategory === "apart") {
      return ["거래유형", "면적", "사용승인일", "세대수", "방/욕실수", "방향", "등록자", "중개보수", "테마"];
    }
    if (activeCategory === "villa") {
      const hasVillaOrCommercialHouse = activePills.includes("빌라/연립") || activePills.includes("상가주택");
      const hasDetachedOrRural = activePills.includes("단독/다가구") || activePills.includes("전원주택");
      
      if (hasDetachedOrRural && !hasVillaOrCommercialHouse) {
        return ["거래유형", "면적", "사용승인일", "방/욕실수", "방향", "등록자", "중개보수", "테마"];
      }
      return ["거래유형", "면적", "사용승인일", "세대수", "방/욕실수", "방향", "등록자", "중개보수", "테마"];
    }
    if (activeCategory === "one") {
      return ["거래유형", "면적", "방/욕실수", "방향", "관리비", "기타옵션", "등록자", "중개보수", "테마"];
    }
    if (activeCategory === "biz") {
      return ["거래유형", "면적", "층수", "관리비", "기타옵션", "등록자", "중개보수", "테마"];
    }
    if (activeCategory === "sale") {
      return ["거래유형", "면적", "세대수", "등록자", "중개보수", "테마"];
    }
    if (activeCategory === "auction") {
      return ["거래유형", "면적", "테마"];
    }
    return ["거래유형", "면적", "사용승인일", "세대수", "방/욕실수", "방향", "등록자", "중개보수", "테마"];
  };

  const resetAllFilters = () => {
    setFilterTradeTypes([]);
    setFilterPriceMin(null);
    setFilterPriceMax(null);
    setFilterAreaMin(null);
    setFilterAreaMax(null);
    setFilterMaintIdx(0);
    setFilterRoomCount(null);
    setFilterBathCount(null);
    setFilterDirection(null);
    setFilterYearMin(null);
    setFilterYearMax(null);
    setFilterUnitMin(null);
    setFilterUnitMax(null);
    setFilterFloor(null);
    setFilterSaleStage([]);
    setFilterSaleType([]);
    setFilterOptions([]);
    setFilterOwnerRole(null);
    setFilterCommissionType(null);
    setFilterThemes([]);
    setActiveFilterDropdown(null);

    // Also reset unified filters
    setAppliedMaemaeMin(null);
    setAppliedMaemaeMax(null);
    setAppliedDepositMin(null);
    setAppliedDepositMax(null);
    setAppliedRentMin(null);
    setAppliedRentMax(null);
    setPopoverSearchKeyword("");
    setFilterSearchKeyword("");
  };

  const handleCategoryChange = (key: string) => {
    if (activeCategory === key) {
      // 2차 카테고리가 사라지지 않도록 더블 클릭 시 변경 방지
      return;
    }
    const newKey = key;
    setActiveCategory(newKey);
    setIsAuctionMode(newKey === "auction");
    setActiveMode(newKey === "auction" ? "경매" : "공실");
    
    const savedPillsKey = `gongsil_pills_${newKey}`;
    const savedPills = localStorage.getItem(savedPillsKey);
    let pills: string[] = [];
    if (savedPills) {
      try {
        pills = JSON.parse(savedPills);
      } catch {}
    }
    if (pills.length === 0) {
      const c = CATEGORY_CONFIG[newKey];
      pills = c && c.pills ? c.pills : [];
    }
    setActivePills(pills);
    localStorage.setItem("gongsil_pills", JSON.stringify(pills));

    setShowDetail(false);
    setShowDetailFilters(false);
    setSelectedClusterIds(null);
    resetAllFilters();
    localStorage.setItem("gongsil_category", newKey);
  };

  const togglePill = (p: string) => {
    setActivePills((prev) => {
      const next = prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p];
      localStorage.setItem("gongsil_pills", JSON.stringify(next));
      localStorage.setItem(`gongsil_pills_${activeCategory}`, JSON.stringify(next));
      return next;
    });
  };

  const toggleTradeType = (t: string) => {
    setFilterTradeTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const hasActiveFilters =
    filterTradeTypes.length > 0 ||
    appliedMaemaeMin !== null ||
    appliedMaemaeMax !== null ||
    appliedDepositMin !== null ||
    appliedDepositMax !== null ||
    appliedRentMin !== null ||
    appliedRentMax !== null ||
    filterPriceMin !== null ||
    filterPriceMax !== null ||
    filterAreaMin !== null ||
    filterAreaMax !== null ||
    filterMaintIdx > 0 ||
    filterRoomCount !== null ||
    filterBathCount !== null ||
    filterDirection !== null ||
    filterYearMin !== null ||
    filterYearMax !== null ||
    filterUnitMin !== null ||
    filterUnitMax !== null ||
    filterOwnerRole !== null ||
    filterCommissionType !== null ||
    filterThemes.length > 0;

  const formatPriceLabel = (val: number | null) => {
    if (val === null) return "";
    const eok = Math.floor(val / 100000000);
    const remainder = val % 100000000;
    const man = Math.floor(remainder / 10000);

    if (eok > 0) {
      if (man > 0) {
        return `${eok}억 ${man}만`;
      }
      return `${eok}억`;
    }
    if (man > 0) {
      return `${man}만`;
    }
    return `${val}원`;
  };

  const getTradeTypeFilterLabel = () => {
    if (filterTradeTypes.length === 0) return "거래유형";
    
    const typesStr = filterTradeTypes.join(",");
    const hasPriceFilter =
      appliedMaemaeMin !== null ||
      appliedMaemaeMax !== null ||
      appliedDepositMin !== null ||
      appliedDepositMax !== null ||
      appliedRentMin !== null ||
      appliedRentMax !== null;
      
    if (!hasPriceFilter) return typesStr;
    
    if (filterTradeTypes.length === 1) {
      const t = filterTradeTypes[0];
      if (t === "매매") {
        if (appliedMaemaeMin === null && appliedMaemaeMax === null) return "매매";
        return `매매 ${formatPriceLabel(appliedMaemaeMin) || "~"}~${formatPriceLabel(appliedMaemaeMax) || ""}`;
      } else if (t === "전세") {
        if (appliedDepositMin === null && appliedDepositMax === null) return "전세";
        return `전세 ${formatPriceLabel(appliedDepositMin) || "~"}~${formatPriceLabel(appliedDepositMax) || ""}`;
      } else if (t === "월세") {
        const depStr = appliedDepositMin !== null || appliedDepositMax !== null 
          ? `보증금 ${formatPriceLabel(appliedDepositMin) || "~"}~${formatPriceLabel(appliedDepositMax) || ""}`
          : "";
        const rentStr = appliedRentMin !== null || appliedRentMax !== null
          ? `월세 ${formatPriceLabel(appliedRentMin) || "~"}~${formatPriceLabel(appliedRentMax) || ""}`
          : "";
        return `월세 ${[depStr, rentStr].filter(Boolean).join(" / ")}`;
      }
    }
    
    return `${typesStr} (필터됨)`;
  };
  const priceFilterLabel =
    filterPriceMin !== null || filterPriceMax !== null
      ? `가격대 ${formatPriceLabel(filterPriceMin) || "~"}~${formatPriceLabel(filterPriceMax) || ""}`
      : "가격대";
  const areaFilterLabel =
    filterAreaMin !== null || filterAreaMax !== null
      ? `면적 ${filterAreaMin ? Math.round(filterAreaMin / 3.3) + "평" : "~"}~${
          filterAreaMax ? Math.round(filterAreaMax / 3.3) + "평" : ""
        }`
      : "면적";
  const yearFilterLabel =
    filterYearMin !== null || filterYearMax !== null
      ? `사용승인일 ${filterYearMin || "~"}~${filterYearMax || ""}`
      : "사용승인일";
  const unitFilterLabel =
    filterUnitMin !== null || filterUnitMax !== null
      ? `세대수 ${filterUnitMin || "~"}~${filterUnitMax || ""}`
      : "세대수";

  const openGalleryModal = () => {
    setShowGalleryModal(true);
  };

  const closeGalleryModal = () => {
    setShowGalleryModal(false);
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "'Pretendard', sans-serif",
      }}
    >
      {/* ===== 상단 필터 바 ===== */}
      <div
        style={{ background: "#fff", width: "100%", zIndex: 200, position: "relative", borderBottom: "1px solid #ccc", flexShrink: 0 }}
      >
        {/* Tier 1: 메인 탭 */}
        <div style={{ display: "flex", gap: 24, padding: "0 20px", borderBottom: "1px solid #ddd", alignItems: "center", overflowX: "auto" }}>
          <Link href="/" style={{ marginRight: 15, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
            <img
              src="/logo.png"
              alt="공실뉴스"
              style={{ height: 48 }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://via.placeholder.com/150x48?text=LOGO";
              }}
            />
          </Link>
          <span
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: "#111",
              marginRight: 20,
              whiteSpace: "nowrap",
              transition: "color 0.2s",
            }}
          >
            공실열람
          </span>
          {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => handleCategoryChange(key)}
              style={{
                background: "none",
                border: "none",
                fontSize: 16,
                fontWeight: "bold",
                color: activeCategory === key ? "#1a73e8" : "#555",
                cursor: "pointer",
                padding: "16px 4px",
                position: "relative",
                whiteSpace: "nowrap",
                borderBottom: activeCategory === key ? "3px solid #1a73e8" : "3px solid transparent",
                fontFamily: "inherit",
                transition: "color 0.2s, border-color 0.2s",
              }}
            >
              {cfg.name}
            </button>
          ))}
          {/* 우측 상단 통합 검색창 & 로그인 영역 */}
          <div style={{ display: "flex", gap: "16px", alignItems: "center", marginLeft: "auto" }}>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <input
                type="text"
                placeholder="공실번호, 학교, 지하철"
                value={popoverSearchKeyword}
                onChange={(e) => setPopoverSearchKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setFilterSearchKeyword(popoverSearchKeyword);
                  }
                }}
                style={{
                  width: "240px",
                  padding: "8px 12px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "13px",
                  outline: "none",
                  height: "36px",
                }}
              />
              <button
                onClick={() => setFilterSearchKeyword(popoverSearchKeyword)}
                style={{
                  height: "36px",
                  padding: "0 14px",
                  background: "#1a4282", // Corporate Deep Navy matching search button in mockup
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </button>
            </div>
            <MapTopAuthButtons />
          </div>
        </div>

        {/* Tier 2: 서브 필터(Pills + 드롭다운) */}
        {activeCategory !== "wish" && activeCategory !== "all" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderBottom: "1px solid #e0e0e0",
              overflowX: "visible",
            }}
          >
            {config.pills.map((p, idx) => {
              let activeBg = "#e8f0fe";
              let activeBorder = "#1a73e8";
              let activeColor = "#1a73e8";

              if (isAuctionMode) {
                if (["상가/점포", "사무실/지산", "빌딩/근생", "공장/창고"].includes(p)) {
                  activeBg = "#f3f0ff";
                  activeBorder = "#7048e8";
                  activeColor = "#7048e8";
                } else if (p === "토지") {
                  activeBg = "#ebfbee";
                  activeBorder = "#2b8a3e";
                  activeColor = "#2b8a3e";
                }
              }

              const isSelected = activePills.includes(p);

              return (
                <React.Fragment key={p}>
                  <button
                    onClick={() => togglePill(p)}
                    style={{
                      background: isSelected ? (isOfficePill(p) ? "#111" : activeBg) : "#fff",
                      border: `1px solid ${isSelected ? (isOfficePill(p) ? "#111" : activeBorder) : "#ccc"}`,
                      fontSize: 13,
                      color: isSelected ? (isOfficePill(p) ? "#fff" : activeColor) : "#333",
                      cursor: "pointer",
                      padding: "6px 14px",
                      borderRadius: isOfficePill(p) ? 4 : 20,
                      whiteSpace: "nowrap",
                      fontWeight: isSelected ? "bold" : "normal",
                      fontFamily: "inherit",
                      flexShrink: 0,
                      transition: "all 0.15s",
                    }}
                  >
                    {isSelected && !isOfficePill(p) ? `✓ ${p}` : p}
                  </button>
                  {isAuctionMode && (p === "빌라/주택" || p === "공장/창고") && (
                    <div style={{ width: 1, height: 16, background: "#ddd", margin: "0 6px", flexShrink: 0 }} />
                  )}
                </React.Fragment>
              );
            })}


            {/* Active filter text badges for wizard categories */}
            {["apart", "villa", "one", "biz", "sale", "auction"].includes(activeCategory) && (() => {
              const tags: { label: string; isTheme?: boolean }[] = [];

              const formatPriceRange = (min: number | null, max: number | null) => {
                if (min === null && max === null) return "";
                if (min === null || min === 0) {
                  return `~${formatPriceLabel(max)}`;
                }
                if (max === null) {
                  return `${formatPriceLabel(min)}~`;
                }
                return `${formatPriceLabel(min)}~${formatPriceLabel(max)}`;
              };

              // 1. 거래유형 & 가격 (Applied States - 적용하기 후에만 반영)
              const getAppliedTradeTypeFilterLabel = () => {
                if (filterTradeTypes.length === 0) return "";
                
                const typesStr = filterTradeTypes.join(",");
                const hasPriceFilter =
                  appliedMaemaeMin !== null ||
                  appliedMaemaeMax !== null ||
                  appliedDepositMin !== null ||
                  appliedDepositMax !== null ||
                  appliedRentMin !== null ||
                  appliedRentMax !== null;
                  
                if (!hasPriceFilter) return typesStr;
                
                if (filterTradeTypes.length === 1) {
                  const t = filterTradeTypes[0];
                  if (t === "매매") {
                    if (appliedMaemaeMin === null && appliedMaemaeMax === null) return "매매";
                    return `매매 ${formatPriceRange(appliedMaemaeMin, appliedMaemaeMax)}`;
                  } else if (t === "전세") {
                    if (appliedDepositMin === null && appliedDepositMax === null) return "전세";
                    return `전세 ${formatPriceRange(appliedDepositMin, appliedDepositMax)}`;
                  } else if (t === "월세") {
                    const depStr = appliedDepositMin !== null || appliedDepositMax !== null 
                      ? `보증금 ${formatPriceRange(appliedDepositMin, appliedDepositMax)}`
                      : "";
                    const rentStr = appliedRentMin !== null || appliedRentMax !== null
                      ? `월세 ${formatPriceRange(appliedRentMin, appliedRentMax)}`
                      : "";
                    return `월세 ${[depStr, rentStr].filter(Boolean).join(" / ")}`;
                  } else if (t === "단기") {
                    const depStr = appliedDepositMin !== null || appliedDepositMax !== null 
                      ? `보증금 ${formatPriceRange(appliedDepositMin, appliedDepositMax)}`
                      : "";
                    const rentStr = appliedRentMin !== null || appliedRentMax !== null
                      ? `월세 ${formatPriceRange(appliedRentMin, appliedRentMax)}`
                      : "";
                    return `단기 ${[depStr, rentStr].filter(Boolean).join(" / ")}`;
                  }
                }
                
                // Multiple trade types with applied prices
                const parts: string[] = [];
                if (filterTradeTypes.includes("매매")) {
                  parts.push(`매매 ${formatPriceRange(appliedMaemaeMin, appliedMaemaeMax)}`);
                }
                if (filterTradeTypes.includes("전세")) {
                  parts.push(`전세 ${formatPriceRange(appliedDepositMin, appliedDepositMax)}`);
                }
                if (filterTradeTypes.includes("월세")) {
                  const dep = appliedDepositMin !== null || appliedDepositMax !== null ? `보증금 ${formatPriceRange(appliedDepositMin, appliedDepositMax)}` : "";
                  const rnt = appliedRentMin !== null || appliedRentMax !== null ? `월세 ${formatPriceRange(appliedRentMin, appliedRentMax)}` : "";
                  parts.push(`월세 ${[dep, rnt].filter(Boolean).join("/")}`);
                }
                if (filterTradeTypes.includes("단기")) {
                  const dep = appliedDepositMin !== null || appliedDepositMax !== null ? `보증금 ${formatPriceRange(appliedDepositMin, appliedDepositMax)}` : "";
                  const rnt = appliedRentMin !== null || appliedRentMax !== null ? `월세 ${formatPriceRange(appliedRentMin, appliedRentMax)}` : "";
                  parts.push(`단기 ${[dep, rnt].filter(Boolean).join("/")}`);
                }
                return parts.filter(Boolean).join(", ");
              };

              const tradeLabel = getAppliedTradeTypeFilterLabel();
              if (tradeLabel) {
                tags.push({ label: tradeLabel });
              }

              // 2. 면적
              if (filterAreaMin !== null || filterAreaMax !== null) {
                tags.push({ label: areaFilterLabel });
              }

              // 3. 사용승인일
              if (filterYearMin !== null || filterYearMax !== null) {
                tags.push({ label: yearFilterLabel });
              }

              // 4. 세대수
              if (filterUnitMin !== null || filterUnitMax !== null) {
                tags.push({ label: unitFilterLabel });
              }

              // 5. 방/욕실수
              if (filterRoomCount !== null || filterBathCount !== null) {
                const roomStr = filterRoomCount ? `${filterRoomCount}룸` : "";
                const bathStr = filterBathCount ? `${filterBathCount}욕실` : "";
                tags.push({ label: `방/욕실수: ${[roomStr, bathStr].filter(Boolean).join(", ")}` });
              }

              // 6. 방향
              if (filterDirection !== null) {
                tags.push({ label: `방향: ${filterDirection}` });
              }

              // 7. 등록자
              if (filterOwnerRole !== null) {
                tags.push({ label: `등록자: ${filterOwnerRole}` });
              }

              // 8. 중개보수
              if (filterCommissionType !== null) {
                const labelMap: Record<string, string> = {
                  "공동중개": "공동중개 가능",
                  "25": "수수료 25%이상",
                  "50": "수수료 50%이상",
                  "100": "수수료 100%(법정가)",
                };
                tags.push({ label: `중개보수: ${labelMap[filterCommissionType] || filterCommissionType}` });
              }

              // 9. 테마
              filterThemes.forEach((t) => {
                tags.push({ label: t, isTheme: true });
              });

              if (tags.length === 0) return null;

              return (
                <>
                  <div style={{ width: 1, height: 16, background: "#e0e0e0", margin: "0 8px", flexShrink: 0 }}></div>
                  <div 
                    style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "8px", 
                      fontSize: "13px", 
                      color: "#475569", 
                      fontWeight: "bold",
                      fontFamily: "inherit",
                      whiteSpace: "nowrap",
                      overflowX: "auto"
                    }} 
                    className="no-scrollbar"
                  >
                    {tags.map((tag, idx) => (
                      <React.Fragment key={idx}>
                        {idx > 0 && <span style={{ color: "#cbd5e1", margin: "0 2px" }}>·</span>}
                        <span
                          style={{
                            color: tag.isTheme ? "#1a73e8" : "#334155",
                            fontWeight: "bold",
                          }}
                        >
                          {tag.isTheme ? `#${tag.label}` : tag.label}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                </>
              );
            })()}

            {config.basicFilters.map((f) => {
              const isFilterActive =
                (f === "거래방식" && filterTradeTypes.length > 0) ||
                (f === "거래유형" && (
                  filterTradeTypes.length > 0 ||
                  appliedMaemaeMin !== null ||
                  appliedMaemaeMax !== null ||
                  appliedDepositMin !== null ||
                  appliedDepositMax !== null ||
                  appliedRentMin !== null ||
                  appliedRentMax !== null
                )) ||
                ((f === "가격대" || f === "분양가/보증금") && (filterPriceMin !== null || filterPriceMax !== null)) ||
                (f === "면적" && (filterAreaMin !== null || filterAreaMax !== null)) ||
                (f === "사용승인일" && (filterYearMin !== null || filterYearMax !== null)) ||
                (f === "세대수" && (filterUnitMin !== null || filterUnitMax !== null)) ||
                (f === "관리비" && filterMaintIdx > 0) ||
                (f === "방/욕실수" && (filterRoomCount !== null || filterBathCount !== null)) ||
                (f === "방향" && filterDirection !== null) ||
                (f === "등록자" && filterOwnerRole !== null) ||
                (f === "중개보수" && filterCommissionType !== null) ||
                (f === "테마" && filterThemes.length > 0);

              const btnLabel =
                f === "가격대" || f === "분양가/보증금"
                  ? priceFilterLabel
                  : f === "면적"
                  ? areaFilterLabel
                  : f === "사용승인일"
                  ? yearFilterLabel
                  : f === "세대수"
                  ? unitFilterLabel
                  : f === "관리비" && filterMaintIdx > 0
                  ? `관리비: ${MAINT_PRESETS[filterMaintIdx].label}`
                  : f === "거래유형"
                  ? getTradeTypeFilterLabel()
                  : f;

              const isPremiumWizard = (activeCategory === "apart" || activeCategory === "villa" || activeCategory === "one" || activeCategory === "biz") && f === "거래유형";

              return (
                <div 
                  key={f} 
                  style={{
                    position: "relative"
                  }}
                >
                  <button
                    onClick={() => {
                      if (isPremiumWizard) {
                        setIsWizardOpen(!isWizardOpen);
                      } else {
                        setActiveFilterDropdown(activeFilterDropdown === f ? null : f);
                      }
                    }}
                    style={{
                      background: isFilterActive ? "#e8f0fe" : "#fff",
                      border: `1px solid ${isFilterActive ? "#1a73e8" : "#ccc"}`,
                      fontSize: 13,
                      color: isFilterActive ? "#1a73e8" : "#333",
                      cursor: "pointer",
                      padding: "6px 14px",
                      borderRadius: 4,
                      whiteSpace: "nowrap",
                      fontWeight: isFilterActive ? "bold" : "normal",
                      fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}
                  >
                    {btnLabel} {isPremiumWizard ? (isWizardOpen ? "▴" : "▾") : "▾"}
                  </button>

                  {/* 드롭다운 필터 내용 */}
                  {((!isPremiumWizard && activeFilterDropdown === f) || (isPremiumWizard && isWizardOpen)) && (
                    <div
                      onMouseDown={f === "거래유형" ? handleDragStart : undefined}
                      style={isPremiumWizard ? {
                        position: "fixed",
                        top: 130,
                        left: 400,
                        marginTop: 4,
                        background: "#fff",
                        border: "1px solid #ccc",
                        borderRadius: 10,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                        padding: 18,
                        zIndex: 300,
                        minWidth: 436,
                        animation: "dropdownFadeIn 0.15s ease",
                        transform: `translate(${filterOffset.x}px, ${filterOffset.y}px)`,
                        cursor: isDraggingFilter ? "grabbing" : "grab",
                      } : {
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        marginTop: 4,
                        background: "#fff",
                        border: "1px solid #ccc",
                        borderRadius: 4,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                        padding: 16,
                        zIndex: 300,
                        minWidth: 200,
                        animation: "dropdownFadeIn 0.15s ease",
                      }}
                    >
                      {/* Close button at the top right of the popover */}
                      <button
                        onClick={() => {
                          if (isPremiumWizard) {
                            setIsWizardOpen(false);
                          } else {
                            setActiveFilterDropdown(null);
                          }
                        }}
                        style={{
                          position: "absolute",
                          top: "12px",
                          right: "12px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#6b7280",
                          padding: "6px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "50%",
                          transition: "background 0.15s, color 0.15s",
                          zIndex: 310,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f3f4f6";
                          e.currentTarget.style.color = "#111827";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "none";
                          e.currentTarget.style.color = "#6b7280";
                        }}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                      {f === "거래유형" && (
                        <div style={{ display: "flex", flexDirection: "column", width: "400px" }}>
                          {/* Dedicated elegant grab bar at the very top */}
                          <div
                            style={{
                              width: "36px",
                              height: "4px",
                              borderRadius: "2px",
                              background: "#cbd5e1",
                              margin: "0 auto 10px auto",
                              cursor: isDraggingFilter ? "grabbing" : "grab",
                            }}
                            title="드래그하여 이동할 수 있습니다"
                          />
                          {/* style block to inject dual slider styles and custom scrollbar */}
                          <style>{`
                            .dual-slider-container {
                              position: relative;
                              width: 100%;
                              height: 4px;
                              background: #e5e7eb;
                              border-radius: 2px;
                              margin: 20px 0 28px 0;
                            }
                            .dual-slider-track {
                              position: absolute;
                              height: 100%;
                              background: #1a4282; /* Corporate Deep Navy track */
                              border-radius: 2px;
                            }
                            .dual-slider-input {
                              position: absolute;
                              width: 100%;
                              height: 4px;
                              top: 0;
                              left: 0;
                              background: none;
                              pointer-events: none;
                              -webkit-appearance: none;
                              -moz-appearance: none;
                              appearance: none;
                              margin: 0;
                            }
                             .dual-slider-input::-webkit-slider-thumb {
                              height: 20px;
                              width: 20px;
                              margin-top: -8px;
                              border-radius: 50%;
                              background: #ffffff;
                              border: 2.5px solid #1a4282;
                              cursor: pointer;
                              pointer-events: auto;
                              -webkit-appearance: none;
                              box-shadow: 0 2px 4px rgba(0,0,0,0.15);
                              transition: transform 0.12s cubic-bezier(0.25, 0.46, 0.45, 0.94), background-color 0.12s, border-color 0.12s, box-shadow 0.12s;
                            }
                            .dual-slider-input::-webkit-slider-thumb:hover {
                              transform: scale(1.35);
                              background: #f8fafc;
                              border-color: #0f172a;
                              box-shadow: 0 4px 10px rgba(0,0,0,0.22);
                            }
                            .dual-slider-input::-webkit-slider-thumb:active {
                              transform: scale(1.45);
                              background: #1a4282;
                              border-color: #1a4282;
                            }
                            .dual-slider-input::-moz-range-thumb {
                              height: 20px;
                              width: 20px;
                              border-radius: 50%;
                              background: #ffffff;
                              border: 2.5px solid #1a4282;
                              cursor: pointer;
                              pointer-events: auto;
                              box-shadow: 0 2px 4px rgba(0,0,0,0.15);
                              transition: transform 0.12s cubic-bezier(0.25, 0.46, 0.45, 0.94), background-color 0.12s, border-color 0.12s, box-shadow 0.12s;
                            }
                            .dual-slider-input::-moz-range-thumb:hover {
                              transform: scale(1.35);
                              background: #f8fafc;
                              border-color: #0f172a;
                              box-shadow: 0 4px 10px rgba(0,0,0,0.22);
                            }
                            .dual-slider-input::-moz-range-thumb:active {
                              transform: scale(1.45);
                              background: #1a4282;
                              border-color: #1a4282;
                            }
                            
                            /* Custom slim scrollbar */
                            #popover-scroll-container::-webkit-scrollbar {
                              width: 10px;
                            }
                            #popover-scroll-container::-webkit-scrollbar-track {
                              background: #f1f5f9;
                              border-radius: 5px;
                            }
                            #popover-scroll-container::-webkit-scrollbar-thumb {
                              background: #cbd5e1;
                              border-radius: 5px;
                            }
                            #popover-scroll-container::-webkit-scrollbar-thumb:hover {
                              background: #94a3b8;
                            }
                            
                            .sub-gnb-scroll::-webkit-scrollbar {
                              display: none;
                            }
                            .sub-gnb-scroll {
                              -ms-overflow-style: none;
                              scrollbar-width: none;
                            }
                          `}</style>
                          


                          {/* Horizontal Navigation with Left/Right Buttons */}
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "12px", position: "relative", paddingRight: "36px" }}>
                            <button
                              onClick={() => {
                                const nav = document.getElementById("sub-gnb-scroll");
                                if (nav) nav.scrollBy({ left: -80, behavior: "smooth" });
                              }}
                              style={{
                                border: "none",
                                background: "none",
                                fontSize: "16px",
                                color: "#6b7280",
                                cursor: "pointer",
                                padding: "4px 8px",
                                fontWeight: "bold",
                              }}
                            >
                              &lt;
                            </button>
                            
                            <div
                              id="sub-gnb-scroll"
                              className="sub-gnb-scroll"
                              style={{
                                display: "flex",
                                gap: "8px",
                                overflowX: "auto",
                                flex: 1,
                                whiteSpace: "nowrap",
                                padding: "6px 0",
                              }}
                            >
                              {getWizardTabs().map((tab) => {
                                const isActive = activeSection === tab;
                                const isSelected = (() => {
                                  if (tab === "거래유형") {
                                    return tempFilterTradeTypes.length > 0 || 
                                           tempMaemaeMin !== null || tempMaemaeMax !== null ||
                                           tempDepositMin !== null || tempDepositMax !== null ||
                                           tempRentMin !== null || tempRentMax !== null;
                                  }
                                  if (tab === "면적") {
                                    return filterAreaMin !== null || filterAreaMax !== null;
                                  }
                                  if (tab === "사용승인일") {
                                    return filterYearMin !== null || filterYearMax !== null;
                                  }
                                  if (tab === "세대수") {
                                    return filterUnitMin !== null || filterUnitMax !== null;
                                  }
                                  if (tab === "방/욕실수") {
                                    return filterRoomCount !== null || filterBathCount !== null;
                                  }
                                  if (tab === "방향") {
                                    return filterDirection !== null;
                                  }
                                  if (tab === "등록자") {
                                    return filterOwnerRole !== null;
                                  }
                                  if (tab === "중개보수") {
                                    return filterCommissionType !== null;
                                  }
                                  if (tab === "테마") {
                                    return filterThemes.length > 0;
                                  }
                                  return false;
                                })();
                                return (
                                  <span
                                    key={tab}
                                    onClick={() => {
                                      scrollToSection(tab);
                                    }}
                                    style={{
                                      fontSize: "14px",
                                      color: isActive ? "#1a4282" : "#4b5563",
                                      fontWeight: isActive ? "bold" : "normal",
                                      cursor: "pointer",
                                      padding: "6px 12px",
                                      background: isActive ? "#e8f0fe" : "none",
                                      border: "1px solid transparent",
                                      borderRadius: "14px",
                                      transition: "all 0.15s",
                                    }}
                                  >
                                    {tab}
                                  </span>
                                );
                              })}
                            </div>
                            
                            <button
                              onClick={() => {
                                const nav = document.getElementById("sub-gnb-scroll");
                                if (nav) nav.scrollBy({ left: 80, behavior: "smooth" });
                              }}
                              style={{
                                border: "none",
                                background: "none",
                                fontSize: "16px",
                                color: "#6b7280",
                                cursor: "pointer",
                                padding: "4px 8px",
                                fontWeight: "bold",
                              }}
                            >
                              &gt;
                            </button>
                          </div>

                          {/* Scrollable area */}
                          <div
                            id="popover-scroll-container"
                            style={{ maxHeight: "420px", overflowY: "auto", paddingRight: "8px", paddingBottom: "10px" }}
                            onScroll={(e) => {
                              const container = e.currentTarget;
                              if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
                              scrollDebounceRef.current = setTimeout(() => {
                                const containerRect = container.getBoundingClientRect();
                                const sections = getWizardTabs();
                                
                                let closestSec = sections[0];
                                let minDiff = Infinity;
                                
                                for (const sec of sections) {
                                  const el = document.getElementById(`section-${sec}`);
                                  if (el) {
                                    const rect = el.getBoundingClientRect();
                                    const diff = Math.abs(rect.top - containerRect.top);
                                    if (diff < minDiff) {
                                      minDiff = diff;
                                      closestSec = sec;
                                    }
                                  }
                                }
                                
                                setActiveSection(closestSec);
                              }, 100);
                            }}
                          >
                            {/* Section 1: 거래유형 */}
                            <div
                              id="section-거래유형"
                              style={{
                                padding: "16px 12px",
                                borderRadius: "8px",
                                background: activeSection === "거래유형" ? "#f3f4f6" : "transparent",
                                marginBottom: "16px",
                                transition: "all 0.2s ease-in-out",
                              }}
                            >
                              <div style={{ fontSize: "14px", color: "#374151", marginBottom: "10px", fontWeight: "bold" }}>
                                거래유형 중복선택 가능
                              </div>
                              
                              <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
                                <button
                                  onClick={() => {
                                    setTempFilterTradeTypes([]);
                                    setTimeout(() => {
                                      scrollToSection("면적");
                                    }, 350);
                                  }}
                                  style={{
                                    padding: "6px 14px",
                                    borderRadius: 4,
                                    fontSize: 13,
                                    border: "1px solid " + (tempFilterTradeTypes.length === 0 ? "#111" : "#ccc"),
                                    background: tempFilterTradeTypes.length === 0 ? "#111" : "#ffffff",
                                    color: tempFilterTradeTypes.length === 0 ? "#ffffff" : "#333",
                                    fontWeight: tempFilterTradeTypes.length === 0 ? "bold" : "normal",
                                    cursor: "pointer",
                                    transition: "all 0.15s"
                                  }}
                                >
                                  전체
                                </button>
                                
                                {["매매", "전세", "월세", "단기"].map((type) => {
                                  const isSel = tempFilterTradeTypes.includes(type);
                                  return (
                                    <button
                                      key={type}
                                      onClick={() => {
                                        setTempFilterTradeTypes((prev) => {
                                          return prev.includes(type) ? prev.filter((x) => x !== type) : [...prev, type];
                                        });
                                      }}
                                      style={{
                                        padding: "6px 14px",
                                        borderRadius: 4,
                                        fontSize: 13,
                                        border: "1px solid " + (isSel ? "#111" : "#ccc"),
                                        background: isSel ? "#111" : "#ffffff",
                                        color: isSel ? "#ffffff" : "#333",
                                        fontWeight: isSel ? "bold" : "normal",
                                        cursor: "pointer",
                                        transition: "all 0.15s"
                                      }}
                                    >
                                      {type}
                                    </button>
                                  );
                                })}
                              </div>
                              
                              <div style={{ height: "1px", background: "#e5e7eb", marginBottom: "20px" }} />
                              
                              {/* MAEMAE Price Range Slider */}
                              {(tempFilterTradeTypes.length === 0 || tempFilterTradeTypes.includes("매매")) && (() => {
                                const minIdx = getScaleIndex(tempMaemaeMin, MAEMAE_SCALE, false);
                                const maxIdx = getScaleIndex(tempMaemaeMax, MAEMAE_SCALE, true);
                                return (
                                  <div style={{ marginBottom: "24px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                      <span style={{ fontSize: "15px", fontWeight: "800", color: "#111827" }}>매매가</span>
                                      <span style={{ fontSize: "14px", color: "#1a4282", fontWeight: "800" }}>
                                        {tempMaemaeMin === null && tempMaemaeMax === null 
                                          ? "전체" 
                                          : `${formatPriceLabel(tempMaemaeMin) || "0"} ~ ${formatPriceLabel(tempMaemaeMax) || "최대"}`}
                                      </span>
                                    </div>
                                    
                                    <div className="dual-slider-container">
                                      <div 
                                        className="dual-slider-track" 
                                        style={{ left: `${(minIdx / (MAEMAE_SCALE.length - 1)) * 100}%`, right: `${100 - (maxIdx / (MAEMAE_SCALE.length - 1)) * 100}%` }} 
                                      />
                                      <input 
                                        type="range" 
                                        min={0} 
                                        max={MAEMAE_SCALE.length - 1} 
                                        value={minIdx} 
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10);
                                          if (val <= maxIdx) {
                                            setTempMaemaeMin(val === 0 ? null : MAEMAE_SCALE[val]);
                                          }
                                        }} 
                                        onMouseUp={() => handleSliderRelease("maemae", "min", "면적")}
                                        onTouchEnd={() => handleSliderRelease("maemae", "min", "면적")}
                                        className="dual-slider-input" 
                                      />
                                      <input 
                                        type="range" 
                                        min={0} 
                                        max={MAEMAE_SCALE.length - 1} 
                                        value={maxIdx} 
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10);
                                          if (val >= minIdx) {
                                            setTempMaemaeMax(val === MAEMAE_SCALE.length - 1 ? null : MAEMAE_SCALE[val]);
                                          }
                                        }} 
                                        onMouseUp={() => handleSliderRelease("maemae", "max", "면적")}
                                        onTouchEnd={() => handleSliderRelease("maemae", "max", "면적")}
                                        className="dual-slider-input" 
                                      />
                                    </div>
                                    
                                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0 2px", marginTop: "-24px" }}>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>최소</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>1억</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>5억</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>15억</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>최대</span>
                                    </div>
                                  </div>
                                );
                              })()}
                              
                              {/* DEPOSIT Price Range Slider */}
                              {(tempFilterTradeTypes.length === 0 || tempFilterTradeTypes.includes("전세") || tempFilterTradeTypes.includes("월세") || tempFilterTradeTypes.includes("단기")) && (() => {
                                const minIdx = getScaleIndex(tempDepositMin, DEPOSIT_SCALE, false);
                                const maxIdx = getScaleIndex(tempDepositMax, DEPOSIT_SCALE, true);
                                return (
                                  <div style={{ marginBottom: "24px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                      <span style={{ fontSize: "15px", fontWeight: "800", color: "#111827" }}>보증금</span>
                                      <span style={{ fontSize: "14px", color: "#1a4282", fontWeight: "800" }}>
                                        {tempDepositMin === null && tempDepositMax === null 
                                          ? "전체" 
                                          : `${formatPriceLabel(tempDepositMin) || "0"} ~ ${formatPriceLabel(tempDepositMax) || "최대"}`}
                                      </span>
                                    </div>
                                    
                                    <div className="dual-slider-container">
                                      <div 
                                        className="dual-slider-track" 
                                        style={{ left: `${(minIdx / (DEPOSIT_SCALE.length - 1)) * 100}%`, right: `${100 - (maxIdx / (DEPOSIT_SCALE.length - 1)) * 100}%` }} 
                                      />
                                      <input 
                                        type="range" 
                                        min={0} 
                                        max={DEPOSIT_SCALE.length - 1} 
                                        value={minIdx} 
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10);
                                          if (val <= maxIdx) {
                                            setTempDepositMin(val === 0 ? null : DEPOSIT_SCALE[val]);
                                          }
                                        }} 
                                        onMouseUp={() => handleSliderRelease("deposit", "min", "면적")}
                                        onTouchEnd={() => handleSliderRelease("deposit", "min", "면적")}
                                        className="dual-slider-input" 
                                      />
                                      <input 
                                        type="range" 
                                        min={0} 
                                        max={DEPOSIT_SCALE.length - 1} 
                                        value={maxIdx} 
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10);
                                          if (val >= minIdx) {
                                            setTempDepositMax(val === DEPOSIT_SCALE.length - 1 ? null : DEPOSIT_SCALE[val]);
                                          }
                                        }} 
                                        onMouseUp={() => handleSliderRelease("deposit", "max", "면적")}
                                        onTouchEnd={() => handleSliderRelease("deposit", "max", "면적")}
                                        className="dual-slider-input" 
                                      />
                                    </div>
                                    
                                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0 2px", marginTop: "-24px" }}>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>최소</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>5천만</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>2억</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>10억</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>최대</span>
                                    </div>
                                  </div>
                                );
                              })()}
                              
                              {/* RENT Price Range Slider */}
                              {(tempFilterTradeTypes.length === 0 || tempFilterTradeTypes.includes("월세") || tempFilterTradeTypes.includes("단기")) && (() => {
                                const minIdx = getScaleIndex(tempRentMin, RENT_SCALE, false);
                                const maxIdx = getScaleIndex(tempRentMax, RENT_SCALE, true);
                                return (
                                  <div style={{ marginBottom: "12px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                      <span style={{ fontSize: "15px", fontWeight: "800", color: "#111827" }}>월세</span>
                                      <span style={{ fontSize: "14px", color: "#1a4282", fontWeight: "800" }}>
                                        {tempRentMin === null && tempRentMax === null 
                                          ? "전체" 
                                          : `${formatPriceLabel(tempRentMin) || "0"} ~ ${formatPriceLabel(tempRentMax) || "최대"}`}
                                      </span>
                                    </div>
                                    
                                    <div className="dual-slider-container">
                                      <div 
                                        className="dual-slider-track" 
                                        style={{ left: `${(minIdx / (RENT_SCALE.length - 1)) * 100}%`, right: `${100 - (maxIdx / (RENT_SCALE.length - 1)) * 100}%` }} 
                                      />
                                      <input 
                                        type="range" 
                                        min={0} 
                                        max={RENT_SCALE.length - 1} 
                                        value={minIdx} 
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10);
                                          if (val <= maxIdx) {
                                            setTempRentMin(val === 0 ? null : RENT_SCALE[val]);
                                          }
                                        }} 
                                        onMouseUp={() => handleSliderRelease("rent", "min", "면적")}
                                        onTouchEnd={() => handleSliderRelease("rent", "min", "면적")}
                                        className="dual-slider-input" 
                                      />
                                      <input 
                                        type="range" 
                                        min={0} 
                                        max={RENT_SCALE.length - 1} 
                                        value={maxIdx} 
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10);
                                          if (val >= minIdx) {
                                            setTempRentMax(val === RENT_SCALE.length - 1 ? null : RENT_SCALE[val]);
                                          }
                                        }} 
                                        onMouseUp={() => handleSliderRelease("rent", "max", "면적")}
                                        onTouchEnd={() => handleSliderRelease("rent", "max", "면적")}
                                        className="dual-slider-input" 
                                      />
                                    </div>
                                    
                                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0 2px", marginTop: "-24px" }}>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>최소</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>20만</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>50만</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>150만</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>최대</span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Section 2: 면적 */}
                            <div
                              id="section-면적"
                              style={{
                                padding: "16px 12px",
                                borderRadius: "8px",
                                background: activeSection === "면적" ? "#f3f4f6" : "transparent",
                                marginBottom: "16px",
                                transition: "all 0.2s ease-in-out",
                              }}
                            >
                              {(() => {
                                const pyeongMin = filterAreaMin ? Math.round(filterAreaMin / 3.3) : null;
                                const pyeongMax = filterAreaMax ? Math.round(filterAreaMax / 3.3) : null;
                                const minIdx = getScaleIndex(pyeongMin, AREA_SCALE, false);
                                const maxIdx = getScaleIndex(pyeongMax, AREA_SCALE, true);
                                return (
                                  <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                      <span style={{ fontSize: "15px", fontWeight: "800", color: "#111827" }}>면적</span>
                                      <span style={{ fontSize: "14px", color: "#1a4282", fontWeight: "800" }}>
                                        {filterAreaMin === null && filterAreaMax === null 
                                          ? "전체" 
                                          : `${pyeongMin || "0"}평 ~ ${pyeongMax || "최대"}`}
                                      </span>
                                    </div>
                                    
                                    <div className="dual-slider-container" style={{ margin: "20px 0 28px 0" }}>
                                      <div 
                                        className="dual-slider-track" 
                                        style={{ left: `${(minIdx / (AREA_SCALE.length - 1)) * 100}%`, right: `${100 - (maxIdx / (AREA_SCALE.length - 1)) * 100}%` }} 
                                      />
                                      <input 
                                        type="range" 
                                        min={0} 
                                        max={AREA_SCALE.length - 1} 
                                        value={minIdx} 
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10);
                                          if (val <= maxIdx) {
                                            setFilterAreaMin(val === 0 ? null : AREA_SCALE[val] * 3.3);
                                          }
                                        }} 
                                        onMouseUp={() => handleSliderRelease("area", "min", "사용승인일")}
                                        onTouchEnd={() => handleSliderRelease("area", "min", "사용승인일")}
                                        className="dual-slider-input" 
                                      />
                                      <input 
                                        type="range" 
                                        min={0} 
                                        max={AREA_SCALE.length - 1} 
                                        value={maxIdx} 
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10);
                                          if (val >= minIdx) {
                                            setFilterAreaMax(val === AREA_SCALE.length - 1 ? null : AREA_SCALE[val] * 3.3);
                                          }
                                        }} 
                                        onMouseUp={() => handleSliderRelease("area", "max", "사용승인일")}
                                        onTouchEnd={() => handleSliderRelease("area", "max", "사용승인일")}
                                        className="dual-slider-input" 
                                      />
                                    </div>
                                    
                                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0 2px", marginTop: "-24px" }}>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>최소</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>10평</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>40평</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>150평</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>최대</span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Section: 층수 */}
                            {getWizardTabs().includes("층수") && (
                              <div
                                id="section-층수"
                                style={{
                                  padding: "16px 12px",
                                  borderRadius: "8px",
                                  background: activeSection === "층수" ? "#f3f4f6" : "transparent",
                                  marginBottom: "16px",
                                  transition: "all 0.2s ease-in-out",
                                }}
                              >
                                <div style={{ fontSize: "14px", color: "#374151", marginBottom: "10px", fontWeight: "bold" }}>층수</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                  {["전체", "지하", "1층", "2층", "3~5층", "6층이상"].map((fl) => {
                                    const isSel = filterFloor === fl || (!filterFloor && fl === "전체");
                                    return (
                                      <button
                                        key={fl}
                                        onClick={() => {
                                          setFilterFloor(fl === "전체" ? null : fl);
                                          setTimeout(() => {
                                            scrollToSection("관리비");
                                          }, 350);
                                        }}
                                        style={{
                                          padding: "8px 12px",
                                          border: "1px solid " + (isSel ? "#111" : "#eee"),
                                          borderRadius: 4,
                                          background: isSel ? "#111" : "#fff",
                                          color: isSel ? "#fff" : "#333",
                                          fontSize: 12,
                                          fontWeight: "bold",
                                          cursor: "pointer",
                                          transition: "all 0.15s"
                                        }}
                                      >
                                        {fl}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Section 3: 사용승인일 */}
                            {getWizardTabs().includes("사용승인일") && (
                            <div
                              id="section-사용승인일"
                              style={{
                                padding: "16px 12px",
                                borderRadius: "8px",
                                background: activeSection === "사용승인일" ? "#f3f4f6" : "transparent",
                                marginBottom: "16px",
                                transition: "all 0.2s ease-in-out",
                              }}
                            >
                              {(() => {
                                const minIdx = getScaleIndex(filterYearMin, YEAR_SCALE, false);
                                const maxIdx = getScaleIndex(filterYearMax, YEAR_SCALE, true);
                                return (
                                  <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                      <span style={{ fontSize: "15px", fontWeight: "800", color: "#111827" }}>사용승인일</span>
                                      <span style={{ fontSize: "14px", color: "#1a4282", fontWeight: "800" }}>
                                        {filterYearMin === null && filterYearMax === null 
                                          ? "전체" 
                                          : `${filterYearMin || "1960"}년 ~ ${filterYearMax || "최대"}`}
                                      </span>
                                    </div>
                                    
                                    <div className="dual-slider-container" style={{ margin: "20px 0 28px 0" }}>
                                      <div 
                                        className="dual-slider-track" 
                                        style={{ left: `${(minIdx / (YEAR_SCALE.length - 1)) * 100}%`, right: `${100 - (maxIdx / (YEAR_SCALE.length - 1)) * 100}%` }} 
                                      />
                                      <input 
                                        type="range" 
                                        min={0} 
                                        max={YEAR_SCALE.length - 1} 
                                        value={minIdx} 
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10);
                                          if (val <= maxIdx) {
                                            setFilterYearMin(val === 0 ? null : YEAR_SCALE[val]);
                                          }
                                        }} 
                                        onMouseUp={() => handleSliderRelease("year", "min", "세대수")}
                                        onTouchEnd={() => handleSliderRelease("year", "min", "세대수")}
                                        className="dual-slider-input" 
                                      />
                                      <input 
                                        type="range" 
                                        min={0} 
                                        max={YEAR_SCALE.length - 1} 
                                        value={maxIdx} 
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10);
                                          if (val >= minIdx) {
                                            setFilterYearMax(val === YEAR_SCALE.length - 1 ? null : YEAR_SCALE[val]);
                                          }
                                        }} 
                                        onMouseUp={() => handleSliderRelease("year", "max", "세대수")}
                                        onTouchEnd={() => handleSliderRelease("year", "max", "세대수")}
                                        className="dual-slider-input" 
                                      />
                                    </div>
                                    
                                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0 2px", marginTop: "-24px" }}>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>최소</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>1990년</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>2005년</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>2020년</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>최대</span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                            )}

                            {/* Section 4: 세대수 */}
                            {getWizardTabs().includes("세대수") && (
                            <div
                              id="section-세대수"
                              style={{
                                padding: "16px 12px",
                                borderRadius: "8px",
                                background: activeSection === "세대수" ? "#f3f4f6" : "transparent",
                                marginBottom: "16px",
                                transition: "all 0.2s ease-in-out",
                              }}
                            >
                              {(() => {
                                const minIdx = getScaleIndex(filterUnitMin, UNIT_SCALE, false);
                                const maxIdx = getScaleIndex(filterUnitMax, UNIT_SCALE, true);
                                return (
                                  <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                      <span style={{ fontSize: "15px", fontWeight: "800", color: "#111827" }}>세대수</span>
                                      <span style={{ fontSize: "14px", color: "#1a4282", fontWeight: "800" }}>
                                        {filterUnitMin === null && filterUnitMax === null 
                                          ? "전체" 
                                          : `${filterUnitMin || "0"}세대 ~ ${filterUnitMax || "최대"}`}
                                      </span>
                                    </div>
                                    
                                    <div className="dual-slider-container" style={{ margin: "20px 0 28px 0" }}>
                                      <div 
                                        className="dual-slider-track" 
                                        style={{ left: `${(minIdx / (UNIT_SCALE.length - 1)) * 100}%`, right: `${100 - (maxIdx / (UNIT_SCALE.length - 1)) * 100}%` }} 
                                      />
                                      <input 
                                        type="range" 
                                        min={0} 
                                        max={UNIT_SCALE.length - 1} 
                                        value={minIdx} 
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10);
                                          if (val <= maxIdx) {
                                            setFilterUnitMin(val === 0 ? null : UNIT_SCALE[val]);
                                          }
                                        }} 
                                        onMouseUp={() => handleSliderRelease("unit", "min", "방/욕실수")}
                                        onTouchEnd={() => handleSliderRelease("unit", "min", "방/욕실수")}
                                        className="dual-slider-input" 
                                      />
                                      <input 
                                        type="range" 
                                        min={0} 
                                        max={UNIT_SCALE.length - 1} 
                                        value={maxIdx} 
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10);
                                          if (val >= minIdx) {
                                            setFilterUnitMax(val === UNIT_SCALE.length - 1 ? null : UNIT_SCALE[val]);
                                          }
                                        }} 
                                        onMouseUp={() => handleSliderRelease("unit", "max", "방/욕실수")}
                                        onTouchEnd={() => handleSliderRelease("unit", "max", "방/욕실수")}
                                        className="dual-slider-input" 
                                      />
                                    </div>
                                    
                                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0 2px", marginTop: "-24px" }}>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>최소</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>100세대</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>500세대</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>2000세대</span>
                                      <span style={{ fontSize: "11px", fontWeight: "bold", color: "#4b5563" }}>최대</span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                            )}

                            {/* Section 5: 방/욕실수 */}
                            {getWizardTabs().includes("방/욕실수") && (
                            <div
                              id="section-방/욕실수"
                              style={{
                                padding: "16px 12px",
                                borderRadius: "8px",
                                background: activeSection === "방/욕실수" ? "#f3f4f6" : "transparent",
                                marginBottom: "16px",
                                transition: "all 0.2s ease-in-out",
                              }}
                            >
                              <div style={{ fontSize: "14px", color: "#374151", marginBottom: "10px", fontWeight: "bold" }}>방/욕실수</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                <div>
                                  <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>방 개수</div>
                                  <div style={{ display: "flex", gap: 4 }}>
                                    {[1, 2, 3, 4].map((num) => (
                                      <button
                                        key={num}
                                        onClick={() => {
                                          setFilterRoomCount(filterRoomCount === num ? null : num);
                                          setRoomBathInteractions((prev) => {
                                            const updated = { ...prev, room: true };
                                            if (updated.room && updated.bath) {
                                              setTimeout(() => {
                                                scrollToSection("방향");
                                              }, 500);
                                              return { room: false, bath: false };
                                            }
                                            return updated;
                                          });
                                        }}
                                        style={{
                                          flex: 1,
                                          padding: "6px 0",
                                          border: "1px solid " + (filterRoomCount === num ? "#111" : "#eee"),
                                          borderRadius: 4,
                                          background: filterRoomCount === num ? "#111" : "#fff",
                                          color: filterRoomCount === num ? "#fff" : "#333",
                                          fontSize: 12,
                                          fontWeight: "bold",
                                          cursor: "pointer",
                                          transition: "all 0.15s"
                                        }}
                                      >
                                        {num}개+
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>욕실 개수</div>
                                  <div style={{ display: "flex", gap: 4 }}>
                                    {[1, 2, 3].map((num) => (
                                      <button
                                        key={num}
                                        onClick={() => {
                                          setFilterBathCount(filterBathCount === num ? null : num);
                                          setRoomBathInteractions((prev) => {
                                            const updated = { ...prev, bath: true };
                                            if (updated.room && updated.bath) {
                                              setTimeout(() => {
                                                scrollToSection("방향");
                                              }, 500);
                                              return { room: false, bath: false };
                                            }
                                            return updated;
                                          });
                                        }}
                                        style={{
                                          flex: 1,
                                          padding: "6px 0",
                                          border: "1px solid " + (filterBathCount === num ? "#111" : "#eee"),
                                          borderRadius: 4,
                                          background: filterBathCount === num ? "#111" : "#fff",
                                          color: filterBathCount === num ? "#fff" : "#333",
                                          fontSize: 12,
                                          fontWeight: "bold",
                                          cursor: "pointer",
                                          transition: "all 0.15s"
                                        }}
                                      >
                                        {num}개+
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                            )}

                            {/* Section 6: 방향 */}
                            {getWizardTabs().includes("방향") && (
                            <div
                              id="section-방향"
                              style={{
                                padding: "16px 12px",
                                borderRadius: "8px",
                                background: activeSection === "방향" ? "#f3f4f6" : "transparent",
                                marginBottom: "16px",
                                transition: "all 0.2s ease-in-out",
                              }}
                            >
                              <div style={{ fontSize: "14px", color: "#374151", marginBottom: "10px", fontWeight: "bold" }}>방향</div>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                                <button
                                  onClick={() => {
                                    setFilterDirection(null);
                                    setTimeout(() => {
                                      scrollToSection("등록자");
                                    }, 350);
                                  }}
                                  style={{
                                    gridColumn: "span 2",
                                    padding: "6px 0",
                                    border: "1px solid " + (filterDirection === null ? "#111" : "#eee"),
                                    borderRadius: 4,
                                    background: filterDirection === null ? "#111" : "#fff",
                                    color: filterDirection === null ? "#fff" : "#333",
                                    fontSize: 12,
                                    fontWeight: "bold",
                                    cursor: "pointer",
                                    transition: "all 0.15s"
                                  }}
                                >
                                  전체
                                </button>
                                {["동향", "서향", "남향", "북향", "남동향", "남서향", "북동향", "북서향"].map((dir) => (
                                  <button
                                    key={dir}
                                    onClick={() => {
                                      setFilterDirection(filterDirection === dir ? null : dir);
                                      setTimeout(() => {
                                        scrollToSection("등록자");
                                      }, 350);
                                    }}
                                    style={{
                                      padding: "6px 0",
                                      border: "1px solid " + (filterDirection === dir ? "#111" : "#eee"),
                                      borderRadius: 4,
                                      background: filterDirection === dir ? "#e8f0fe" : "#fff",
                                      color: filterDirection === dir ? "#1a4282" : "#333",
                                      fontSize: 12,
                                      fontWeight: filterDirection === dir ? "bold" : "normal",
                                      cursor: "pointer",
                                      transition: "all 0.15s"
                                    }}
                                  >
                                    {dir}
                                  </button>
                                ))}
                              </div>
                            </div>
                            )}

                            {/* Section: 관리비 */}
                            {getWizardTabs().includes("관리비") && (
                              <div
                                id="section-관리비"
                                style={{
                                  padding: "16px 12px",
                                  borderRadius: "8px",
                                  background: activeSection === "관리비" ? "#f3f4f6" : "transparent",
                                  marginBottom: "16px",
                                  transition: "all 0.2s ease-in-out",
                                }}
                              >
                                <div style={{ fontSize: "14px", color: "#374151", marginBottom: "10px", fontWeight: "bold" }}>관리비</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                  {MAINT_PRESETS.map((m, idx) => {
                                    const isSel = filterMaintIdx === idx;
                                    return (
                                      <button
                                        key={m.label}
                                        onClick={() => {
                                          setFilterMaintIdx(idx);
                                          setTimeout(() => {
                                            scrollToSection("기타옵션");
                                          }, 350);
                                        }}
                                        style={{
                                          padding: "8px 12px",
                                          border: "1px solid " + (isSel ? "#111" : "#eee"),
                                          borderRadius: 4,
                                          background: isSel ? "#111" : "#fff",
                                          color: isSel ? "#fff" : "#333",
                                          fontSize: 12,
                                          fontWeight: "bold",
                                          cursor: "pointer",
                                          transition: "all 0.15s"
                                        }}
                                      >
                                        {m.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Section: 기타옵션 */}
                            {getWizardTabs().includes("기타옵션") && (
                              <div
                                id="section-기타옵션"
                                style={{
                                  padding: "16px 12px",
                                  borderRadius: "8px",
                                  background: activeSection === "기타옵션" ? "#f3f4f6" : "transparent",
                                  marginBottom: "16px",
                                  transition: "all 0.2s ease-in-out",
                                }}
                              >
                                <div style={{ fontSize: "14px", color: "#374151", marginBottom: "10px", fontWeight: "bold" }}>기타옵션</div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                                  {(activeCategory === "one" 
                                    ? ["에어컨", "세탁기", "냉장고", "가스렌지", "전자렌지", "침대", "옷장", "TV", "신발장"] 
                                    : ["냉난방기", "수도설비", "가스설비", "화물용승강기", "보안시스템", "엘리베이터", "주차"]
                                  ).map((opt) => {
                                    const isSel = filterOptions.includes(opt);
                                    return (
                                      <button
                                        key={opt}
                                        onClick={() => {
                                          setFilterOptions((prev) =>
                                            isSel ? prev.filter((x) => x !== opt) : [...prev, opt]
                                          );
                                        }}
                                        style={{
                                          padding: "8px 12px",
                                          border: "1px solid " + (isSel ? "#111" : "#eee"),
                                          borderRadius: 4,
                                          background: isSel ? "#111" : "#fff",
                                          color: isSel ? "#fff" : "#333",
                                          fontSize: 12,
                                          fontWeight: "bold",
                                          cursor: "pointer",
                                          transition: "all 0.15s"
                                        }}
                                      >
                                        {opt}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Section 7: 등록자 */}
                            <div
                              id="section-등록자"
                              style={{
                                padding: "16px 12px",
                                borderRadius: "8px",
                                background: activeSection === "등록자" ? "#f3f4f6" : "transparent",
                                marginBottom: "16px",
                                transition: "all 0.2s ease-in-out",
                              }}
                            >
                              <div style={{ fontSize: "14px", color: "#374151", marginBottom: "10px", fontWeight: "bold" }}>등록자</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {[
                                  { label: "전체", val: null },
                                  { label: "중개사", val: "REALTOR" },
                                  { label: "임대인", val: "OWNER" },
                                ].map((item) => (
                                  <button
                                    key={item.label}
                                    onClick={() => {
                                      setFilterOwnerRole(item.val);
                                      setTimeout(() => {
                                        scrollToSection("중개보수");
                                      }, 350);
                                    }}
                                    style={{
                                      padding: "8px 12px",
                                      border: "1px solid " + (filterOwnerRole === item.val ? "#111" : "#eee"),
                                      borderRadius: 4,
                                      background: filterOwnerRole === item.val ? "#111" : "#fff",
                                      color: filterOwnerRole === item.val ? "#fff" : "#333",
                                      fontSize: 12,
                                      fontWeight: "bold",
                                      cursor: "pointer",
                                      textAlign: "left",
                                      transition: "all 0.15s"
                                    }}
                                  >
                                    {item.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Section 8: 중개보수 */}
                            <div
                              id="section-중개보수"
                              style={{
                                padding: "16px 12px",
                                borderRadius: "8px",
                                background: activeSection === "중개보수" ? "#f3f4f6" : "transparent",
                                marginBottom: "16px",
                                transition: "all 0.2s ease-in-out",
                              }}
                            >
                              <div style={{ fontSize: "14px", color: "#374151", marginBottom: "10px", fontWeight: "bold" }}>중개보수</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {[
                                  { label: "전체", val: null },
                                  { label: "공동중개 가능", val: "공동중개" },
                                  { label: "수수료 25%이상", val: "25" },
                                  { label: "수수료 50%이상", val: "50" },
                                  { label: "수수료 100%(법정가)", val: "100" },
                                ].map((item) => {
                                  const isSelected = (() => {
                                    if (filterCommissionType === null) return item.val === null;
                                    if (item.val === null) return false;
                                    if (filterCommissionType === "공동중개") {
                                      return item.val === "공동중개" || item.val === "25" || item.val === "50" || item.val === "100";
                                    }
                                    if (filterCommissionType === "25") {
                                      return item.val === "25" || item.val === "50" || item.val === "100";
                                    }
                                    if (filterCommissionType === "50") {
                                      return item.val === "50" || item.val === "100";
                                    }
                                    if (filterCommissionType === "100") {
                                      return item.val === "100";
                                    }
                                    return filterCommissionType === item.val;
                                  })();
                                  return (
                                    <button
                                      key={item.label}
                                      onClick={() => {
                                        setFilterCommissionType(item.val);
                                        setTimeout(() => {
                                          scrollToSection("테마");
                                        }, 350);
                                      }}
                                      style={{
                                        padding: "8px 12px",
                                        border: "1px solid " + (isSelected ? "#111" : "#eee"),
                                        borderRadius: 4,
                                        background: isSelected ? "#111" : "#fff",
                                        color: isSelected ? "#fff" : "#333",
                                        fontSize: 12,
                                        fontWeight: "bold",
                                        cursor: "pointer",
                                        textAlign: "left",
                                        transition: "all 0.15s"
                                      }}
                                    >
                                      {item.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Section 9: 테마 */}
                            <div
                              id="section-테마"
                              style={{
                                padding: "16px 12px",
                                borderRadius: "8px",
                                background: activeSection === "테마" ? "#f3f4f6" : "transparent",
                                marginBottom: "16px",
                                transition: "all 0.2s ease-in-out",
                              }}
                            >
                              <div style={{ fontSize: "14px", color: "#374151", marginBottom: "10px", fontWeight: "bold" }}>테마</div>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                                {getThemesByCategory(activeCategory).map((t) => {
                                  const isThemeSelected = filterThemes.includes(t);
                                  return (
                                    <button
                                      key={t}
                                      onClick={() => {
                                        setFilterThemes((prev) =>
                                          isThemeSelected ? prev.filter((x) => x !== t) : [...prev, t]
                                        );
                                        setTimeout(() => {
                                          scrollToSection("적용하기");
                                        }, 500);
                                      }}
                                      style={{
                                        padding: "8px 0",
                                        border: "1px solid " + (isThemeSelected ? "#111" : "#eee"),
                                        borderRadius: 4,
                                        background: isThemeSelected ? "#111" : "#fff",
                                        color: isThemeSelected ? "#fff" : "#333",
                                        fontSize: 12,
                                        fontWeight: "bold",
                                        cursor: "pointer",
                                        transition: "all 0.15s"
                                      }}
                                    >
                                      #{t}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          


                          {/* Bottom Action buttons */}
                          <div style={{ display: "flex", gap: "10px", borderTop: "1px solid #f3f4f6", paddingTop: "15px", background: "#ffffff" }}>
                            <button
                              onClick={() => {
                                // Reset all temporary wizard states
                                setTempFilterTradeTypes([]);
                                setTempMaemaeMin(null);
                                setTempMaemaeMax(null);
                                setTempDepositMin(null);
                                setTempDepositMax(null);
                                setTempRentMin(null);
                                setTempRentMax(null);
                                setPopoverSearchKeyword("");
                                setFilterSearchKeyword("");
                                setActiveSection("거래유형");

                                // Reset all permanent filter states
                                setFilterTradeTypes([]);
                                setFilterPriceMin(null);
                                setFilterPriceMax(null);
                                setFilterAreaMin(null);
                                setFilterAreaMax(null);
                                setFilterMaintIdx(0);
                                setFilterRoomCount(null);
                                setFilterBathCount(null);
                                setFilterDirection(null);
                                setFilterYearMin(null);
                                setFilterYearMax(null);
                                setFilterUnitMin(null);
                                setFilterUnitMax(null);
                                setFilterFloor(null);
                                setFilterSaleStage([]);
                                setFilterSaleType([]);
                                setFilterOptions([]);
                                setFilterOwnerRole(null);
                                setFilterCommissionType(null);
                                setFilterThemes([]);
                                setAppliedMaemaeMin(null);
                                setAppliedMaemaeMax(null);
                                setAppliedDepositMin(null);
                                setAppliedDepositMax(null);
                                setAppliedRentMin(null);
                                setAppliedRentMax(null);
                              }}
                              style={{
                                flex: 1,
                                padding: "9px 0",
                                border: "1px solid #ccc",
                                borderRadius: "4px",
                                fontSize: "13px",
                                color: "#4b5563",
                                background: "#ffffff",
                                cursor: "pointer",
                                fontWeight: "bold",
                                transition: "all 0.15s"
                              }}
                            >
                              초기화
                            </button>
                            <button
                              onClick={() => {
                                setFilterTradeTypes(tempFilterTradeTypes);
                                setAppliedMaemaeMin(tempMaemaeMin);
                                setAppliedMaemaeMax(tempMaemaeMax);
                                setAppliedDepositMin(tempDepositMin);
                                setAppliedDepositMax(tempDepositMax);
                                setAppliedRentMin(tempRentMin);
                                setAppliedRentMax(tempRentMax);
                                setActiveFilterDropdown(null);
                                setIsFilterCollapsed(true);
                                setIsWizardOpen(false);
                              }}
                              style={{
                                flex: 2,
                                padding: "9px 0",
                                border: "none",
                                borderRadius: "4px",
                                fontSize: "13px",
                                color: "#ffffff",
                                background: "#1a4282", /* Premium Corporate Deep Navy */
                                cursor: "pointer",
                                fontWeight: "bold",
                                transition: "all 0.15s"
                              }}
                            >
                              적용하기
                            </button>
                          </div>
                    </div>
                  )}

                      {f === "거래방식" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {["매매", "전세", "월세"].map((type) => (
                            <label
                              key={type}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                fontSize: 13,
                                cursor: "pointer",
                                userSelect: "none",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={filterTradeTypes.includes(type)}
                                onChange={() => toggleTradeType(type)}
                                style={{ width: 18, height: 18, accentColor: "#1a73e8", cursor: "pointer" }}
                              />
                              {type}
                            </label>
                          ))}
                        </div>
                      )}

                      {(f === "가격대" || f === "분양가/보증금") && (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <input
                              type="number"
                              placeholder="최소(만원)"
                              value={filterPriceMin ? filterPriceMin / 10000 : ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseInt(e.target.value) * 10000 : null;
                                setFilterPriceMin(val);
                              }}
                              style={{
                                width: 90,
                                padding: "6px 8px",
                                border: "1px solid #ccc",
                                borderRadius: 4,
                                fontSize: 12,
                              }}
                            />
                            <span>~</span>
                            <input
                              type="number"
                              placeholder="최대(만원)"
                              value={filterPriceMax ? filterPriceMax / 10000 : ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseInt(e.target.value) * 10000 : null;
                                setFilterPriceMax(val);
                              }}
                              style={{
                                width: 90,
                                padding: "6px 8px",
                                border: "1px solid #ccc",
                                borderRadius: 4,
                                fontSize: 12,
                              }}
                            />
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(3, 1fr)",
                              gap: 6,
                              maxHeight: 180,
                              overflowY: "auto",
                              paddingRight: 4,
                            }}
                          >
                            {PRICE_GRID.map((item) => (
                              <button
                                key={item.label}
                                onClick={() => {
                                  if (item.val === -1) {
                                    setFilterPriceMin(3000000000);
                                    setFilterPriceMax(null);
                                  } else {
                                    setFilterPriceMax(item.val);
                                  }
                                }}
                                style={{
                                  padding: "6px 0",
                                  border: "1px solid #eee",
                                  borderRadius: 4,
                                  background: "#f9f9f9",
                                  fontSize: 11,
                                  cursor: "pointer",
                                }}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {f === "면적" && (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <input
                              type="number"
                              placeholder="최소(평)"
                              value={filterAreaMin ? Math.round(filterAreaMin / 3.3) : ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) * 3.3 : null;
                                setFilterAreaMin(val);
                              }}
                              style={{
                                width: 90,
                                padding: "6px 8px",
                                border: "1px solid #ccc",
                                borderRadius: 4,
                                fontSize: 12,
                              }}
                            />
                            <span>~</span>
                            <input
                              type="number"
                              placeholder="최대(평)"
                              value={filterAreaMax ? Math.round(filterAreaMax / 3.3) : ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseFloat(e.target.value) * 3.3 : null;
                                setFilterAreaMax(val);
                              }}
                              style={{
                                width: 90,
                                padding: "6px 8px",
                                border: "1px solid #ccc",
                                borderRadius: 4,
                                fontSize: 12,
                              }}
                            />
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(3, 1fr)",
                              gap: 6,
                              maxHeight: 180,
                              overflowY: "auto",
                              paddingRight: 4,
                            }}
                          >
                            {AREA_GRID.map((item) => (
                              <button
                                key={item.label}
                                onClick={() => {
                                  if (item.m2 === -1) {
                                    setFilterAreaMin(1650);
                                    setFilterAreaMax(null);
                                  } else {
                                    setFilterAreaMax(item.m2);
                                  }
                                }}
                                style={{
                                  padding: "6px 0",
                                  border: "1px solid #eee",
                                  borderRadius: 4,
                                  background: "#f9f9f9",
                                  fontSize: 11,
                                  cursor: "pointer",
                                }}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {f === "사용승인일" && (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <input
                              type="number"
                              placeholder="최소(년)"
                              value={filterYearMin || ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseInt(e.target.value) : null;
                                setFilterYearMin(val);
                              }}
                              style={{
                                width: 90,
                                padding: "6px 8px",
                                border: "1px solid #ccc",
                                borderRadius: 4,
                                fontSize: 12,
                              }}
                            />
                            <span>~</span>
                            <input
                              type="number"
                              placeholder="최대(년)"
                              value={filterYearMax || ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseInt(e.target.value) : null;
                                setFilterYearMax(val);
                              }}
                              style={{
                                width: 90,
                                padding: "6px 8px",
                                border: "1px solid #ccc",
                                borderRadius: 4,
                                fontSize: 12,
                              }}
                            />
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(3, 1fr)",
                              gap: 6,
                              maxHeight: 180,
                              overflowY: "auto",
                              paddingRight: 4,
                            }}
                          >
                            {YEAR_GRID.map((item) => (
                              <button
                                key={item.label}
                                onClick={() => {
                                  setFilterYearMax(item.val);
                                }}
                                style={{
                                  padding: "6px 0",
                                  border: "1px solid #eee",
                                  borderRadius: 4,
                                  background: "#f9f9f9",
                                  fontSize: 11,
                                  cursor: "pointer",
                                }}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {f === "세대수" && (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <input
                              type="number"
                              placeholder="최소(세대)"
                              value={filterUnitMin || ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseInt(e.target.value) : null;
                                setFilterUnitMin(val);
                              }}
                              style={{
                                width: 90,
                                padding: "6px 8px",
                                border: "1px solid #ccc",
                                borderRadius: 4,
                                fontSize: 12,
                              }}
                            />
                            <span>~</span>
                            <input
                              type="number"
                              placeholder="최대(세대)"
                              value={filterUnitMax || ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseInt(e.target.value) : null;
                                setFilterUnitMax(val);
                              }}
                              style={{
                                width: 90,
                                padding: "6px 8px",
                                border: "1px solid #ccc",
                                borderRadius: 4,
                                fontSize: 12,
                              }}
                            />
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(3, 1fr)",
                              gap: 6,
                              maxHeight: 180,
                              overflowY: "auto",
                              paddingRight: 4,
                            }}
                          >
                            {UNIT_GRID.map((item) => (
                              <button
                                key={item.label}
                                onClick={() => {
                                  setFilterUnitMax(item.val);
                                }}
                                style={{
                                  padding: "6px 0",
                                  border: "1px solid #eee",
                                  borderRadius: 4,
                                  background: "#f9f9f9",
                                  fontSize: 11,
                                  cursor: "pointer",
                                }}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {f === "관리비" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {MAINT_PRESETS.map((m, idx) => (
                            <button
                              key={m.label}
                              onClick={() => {
                                setFilterMaintIdx(idx);
                                setActiveFilterDropdown(null);
                              }}
                              style={{
                                padding: "8px 12px",
                                border: "1px solid #eee",
                                borderRadius: 4,
                                background: filterMaintIdx === idx ? "#e8f0fe" : "#fff",
                                color: filterMaintIdx === idx ? "#1a73e8" : "#333",
                                fontSize: 12,
                                fontWeight: filterMaintIdx === idx ? "bold" : "normal",
                                cursor: "pointer",
                                textAlign: "left",
                              }}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {f === "방/욕실수" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          <div>
                            <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>방 개수</div>
                            <div style={{ display: "flex", gap: 4 }}>
                              {[1, 2, 3, 4].map((num) => (
                                <button
                                  key={num}
                                  onClick={() => setFilterRoomCount(filterRoomCount === num ? null : num)}
                                  style={{
                                    flex: 1,
                                    padding: "6px 0",
                                    border: "1px solid #eee",
                                    borderRadius: 4,
                                    background: filterRoomCount === num ? "#e8f0fe" : "#fff",
                                    color: filterRoomCount === num ? "#1a73e8" : "#333",
                                    fontSize: 12,
                                    cursor: "pointer",
                                  }}
                                >
                                  {num}개+
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>욕실 개수</div>
                            <div style={{ display: "flex", gap: 4 }}>
                              {[1, 2, 3].map((num) => (
                                <button
                                  key={num}
                                  onClick={() => setFilterBathCount(filterBathCount === num ? null : num)}
                                  style={{
                                    flex: 1,
                                    padding: "6px 0",
                                    border: "1px solid #eee",
                                    borderRadius: 4,
                                    background: filterBathCount === num ? "#e8f0fe" : "#fff",
                                    color: filterBathCount === num ? "#1a73e8" : "#333",
                                    fontSize: 12,
                                    cursor: "pointer",
                                  }}
                                >
                                  {num}개+
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {f === "방향" && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                          {["동향", "서향", "남향", "북향", "남동향", "남서향", "북동향", "북서향"].map((dir) => (
                            <button
                              key={dir}
                              onClick={() => {
                                setFilterDirection(filterDirection === dir ? null : dir);
                                setActiveFilterDropdown(null);
                              }}
                              style={{
                                padding: "6px 0",
                                border: "1px solid #eee",
                                borderRadius: 4,
                                background: filterDirection === dir ? "#e8f0fe" : "#fff",
                                color: filterDirection === dir ? "#1a73e8" : "#333",
                                fontSize: 12,
                                cursor: "pointer",
                              }}
                            >
                              {dir}
                            </button>
                          ))}
                        </div>
                      )}

                      {f === "등록자" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {[
                            { label: "전체", val: null },
                            { label: "중개사", val: "REALTOR" },
                            { label: "임대인", val: "OWNER" },
                          ].map((item) => (
                            <button
                              key={item.label}
                              onClick={() => {
                                setFilterOwnerRole(item.val);
                                setActiveFilterDropdown(null);
                              }}
                              style={{
                                padding: "8px 12px",
                                border: "1px solid #eee",
                                borderRadius: 4,
                                background: filterOwnerRole === item.val ? "#e8f0fe" : "#fff",
                                color: filterOwnerRole === item.val ? "#1a73e8" : "#333",
                                fontSize: 12,
                                cursor: "pointer",
                                textAlign: "left",
                              }}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {f === "중개보수" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {[
                            { label: "전체", val: null },
                            { label: "공동중개 가능", val: "공동중개" },
                            { label: "수수료 25%이상", val: "25" },
                            { label: "수수료 50%이상", val: "50" },
                            { label: "수수료 100%(법정가)", val: "100" },
                          ].map((item) => {
                            const isSelected = (() => {
                              if (filterCommissionType === null) return item.val === null;
                              if (item.val === null) return false;
                              if (filterCommissionType === "공동중개") {
                                return item.val === "공동중개" || item.val === "25" || item.val === "50" || item.val === "100";
                              }
                              if (filterCommissionType === "25") {
                                return item.val === "25" || item.val === "50" || item.val === "100";
                              }
                              if (filterCommissionType === "50") {
                                return item.val === "50" || item.val === "100";
                              }
                              if (filterCommissionType === "100") {
                                return item.val === "100";
                              }
                              return filterCommissionType === item.val;
                            })();
                            return (
                              <button
                                key={item.label}
                                onClick={() => {
                                  setFilterCommissionType(item.val);
                                  setActiveFilterDropdown(null);
                                }}
                                style={{
                                  padding: "8px 12px",
                                  border: `1px solid ${isSelected ? "#1a73e8" : "#eee"}`,
                                  borderRadius: 4,
                                  background: isSelected ? "#e8f0fe" : "#fff",
                                  color: isSelected ? "#1a73e8" : "#333",
                                  fontSize: 12,
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                              >
                                {item.label}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {f === "테마" && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, width: 240 }}>
                          {getThemesByCategory(activeCategory).map((t) => {
                            const isThemeSelected = filterThemes.includes(t);
                            return (
                              <button
                                key={t}
                                onClick={() => {
                                  setFilterThemes((prev) =>
                                    isThemeSelected ? prev.filter((x) => x !== t) : [...prev, t]
                                  );
                                }}
                                style={{
                                  padding: "8px 0",
                                  border: `1px solid ${isThemeSelected ? "#1a73e8" : "#eee"}`,
                                  borderRadius: 4,
                                  background: isThemeSelected ? "#e8f0fe" : "#fff",
                                  color: isThemeSelected ? "#1a73e8" : "#333",
                                  fontSize: 12,
                                  fontWeight: "bold",
                                  cursor: "pointer",
                                }}
                              >
                                #{t}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== 메인 레이아웃 ===== */}
      <main style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        <GongsilSidebar
          activeCategory={activeCategory}
          wishTab={wishTab}
          setWishTab={setWishTab}
          displayVacancies={displayVacancies}
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          setSelectedCategoryId={setSelectedCategoryId}
          zoomLevel={zoomLevel}
          isAuctionMode={isAuctionMode}
          selectedClusterIds={selectedClusterIds}
          visibleCount={visibleCount}
          setVisibleCount={setVisibleCount}
          activeProperty={activeProperty}
          setActiveProperty={setActiveProperty}
          showDetail={showDetail}
          setShowDetail={setShowDetail}
          setPrevPropertyId={setPrevPropertyId}
          setActiveDetailTab={setActiveDetailTab}
          setGalleryIndex={setGalleryIndex}
          showArticleOnMap={showArticleOnMap}
          currentUser={currentUser}
          userLevel={userLevel}
          setIsAuthModalOpen={setIsAuthModalOpen}
          setSelectedVacancyId={setSelectedVacancyId}
          setShowCategoryModal={setShowCategoryModal}
        />

        <GongsilDetailPanel
          showDetail={showDetail}
          activeProperty={activeProperty}
          dbVacancies={dbVacancies}
          fullDetailsMap={fullDetailsMap}
          galleryIndex={galleryIndex}
          setGalleryIndex={setGalleryIndex}
          prevPropertyId={prevPropertyId}
          setPrevPropertyId={setPrevPropertyId}
          setActiveProperty={setActiveProperty}
          setShowDetail={setShowDetail}
          activeDetailTab={activeDetailTab}
          setActiveDetailTab={setActiveDetailTab}
          userLevel={userLevel}
          handlePrint={handlePrint}
          wishlist={wishlist}
          toggleWishlist={toggleWishlist}
          showShareDropdown={showShareDropdown}
          setShowShareDropdown={setShowShareDropdown}
          shareDropdownRef={shareDropdownRef}
          handleKakaoShare={handleKakaoShare}
          handleCopyUrl={handleCopyUrl}
          itemMapRef={itemMapRef}
          roadviewRef={roadviewRef}
          comments={comments}
          currentUser={currentUser}
          newComment={newComment}
          setNewComment={setNewComment}
          isSecret={isSecret}
          setIsSecret={setIsSecret}
          replyTarget={replyTarget}
          setReplyTarget={setReplyTarget}
          handleCommentSubmit={handleCommentSubmit}
          agencyInfo={agencyInfo}
          realtorTradeType={realtorTradeType}
          setRealtorTradeType={setRealtorTradeType}
          openGalleryModal={openGalleryModal}
          isAuctionMode={isAuctionMode}
        />

        <KakaoMapView
          kakaoMapRef={kakaoMapRef}
          mapLoaded={mapLoaded}
          mapError={mapError}
          initialVacancies={initialVacancies}
          filteredVacancies={filteredVacancies}
          activeCategory={activeCategory}
          activeProperty={activeProperty}
          isAuctionMode={isAuctionMode}
          setIsAuctionMode={setIsAuctionMode}
          setActiveMode={setActiveMode}
          setActiveCategory={setActiveCategory}
          setActivePills={setActivePills}
          showDetail={showDetail}
          setShowDetail={setShowDetail}
          selectedClusterIds={selectedClusterIds}
          setSelectedClusterIds={setSelectedClusterIds}
          selectedRegion={selectedRegion}
          setSelectedRegion={setSelectedRegion}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          mapCenterRegion={mapCenterRegion}
          setMapCenterRegion={setMapCenterRegion}
          setMapBounds={setMapBounds}
          handleLocationPermissionDenied={handleLocationPermissionDenied}
          handleLocationUnavailable={handleLocationUnavailable}
          activeFilterDropdown={activeFilterDropdown}
          dbVacancies={dbVacancies}
        />

        {/* 💡 지도가 너무 줌아웃되었을 때 뜨는 "줌인/확대안내" 오버레이 바 */}
        {zoomLevel >= 9 && activeCategory !== "wish" && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 1000,
              background: "rgba(30, 41, 59, 0.9)", // 시인성을 높이기 위해 Slate 900 불투명도 약간 상승
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              padding: "16px 36px", // 조금 더 시원하고 묵직하게 패딩 확장
              borderRadius: "30px",
              boxShadow: "0 12px 30px rgba(0, 0, 0, 0.25)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              pointerEvents: "none", // 지도 조작 방해 금지
              animation: "pulseGlow 2s infinite ease-in-out",
            }}
          >
            <style>{`
              @keyframes pulseGlow {
                0% { opacity: 0.95; transform: translate(-50%, -50%) scale(1); }
                50% { opacity: 1; transform: translate(-50%, -50%) scale(1.03); }
                100% { opacity: 0.95; transform: translate(-50%, -50%) scale(1); }
              }
            `}</style>
            
            <span style={{ fontSize: 18 }}>🔍</span>
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "-0.5px",
                fontFamily: "'Pretendard', sans-serif",
              }}
            >
              상세 매물 확인을 위해 지도를 확대해 주세요
            </span>
          </div>
        )}

        {/* 💡 실시간 공실 데이터 로딩 인디케이터 (Glassmorphism Indicator) */}
        {isFetchingVacancies && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 10000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              padding: "12px",
              borderRadius: "50%", // 동그란 미니 조약돌 모양
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              pointerEvents: "none", // 지도 조작 방해 금지
              animation: "fadeIn 0.2s ease-out",
            }}
          >
            {/* 🌀 애니메이션 스타일 주입 */}
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              @keyframes fadeIn {
                from { opacity: 0; transform: translate(-50%, -45%); }
                to { opacity: 1; transform: translate(-50%, -50%); }
              }
            `}</style>

            {/* 🌀 스피너 서클 */}
            <div
              style={{
                width: 22,
                height: 22,
                border: "3.5px solid rgba(26, 115, 232, 0.15)",
                borderTop: "3.5px solid #1a73e8",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
          </div>
        )}
      </main>

      {/* 갤러리 풀스크린 모달 */}
      {showGalleryModal && activeProperty !== null && (() => {
        const baseProp = dbVacancies.find((v) => v.id === activeProperty);
        if (!baseProp) return null;
        const fullProp = fullDetailsMap[activeProperty] || {};
        const prop = { ...baseProp, ...fullProp };
        const images = prop.images && prop.images.length > 0 ? prop.images : [];
        if (images.length === 0 || (images.length === 1 && images[0] === "")) return null;
        return (
          <div
            onClick={() => closeGalleryModal()}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0,0,0,0.9)",
              zIndex: 99999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <button
              onClick={() => closeGalleryModal()}
              style={{
                position: "absolute",
                top: 20,
                right: 30,
                background: "none",
                border: "none",
                color: "#fff",
                fontSize: 50,
                cursor: "pointer",
                zIndex: 100000,
                fontWeight: 300,
                lineHeight: 1,
              }}
            >
              ×
            </button>

            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "relative",
                width: "80%",
                maxWidth: 1000,
                height: "80%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img src={images[galleryIndex]} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              {images.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setGalleryIndex(Math.max(0, galleryIndex - 1));
                    }}
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: -80,
                      transform: "translateY(-50%)",
                      background: "rgba(255,255,255,0.15)",
                      color: "#fff",
                      border: "none",
                      width: 60,
                      height: 60,
                      borderRadius: "50%",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 28,
                      zIndex: 10000,
                    }}
                  >
                    〈
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setGalleryIndex(Math.min(images.length - 1, galleryIndex + 1));
                    }}
                    style={{
                      position: "absolute",
                      top: "50%",
                      right: -80,
                      transform: "translateY(-50%)",
                      background: "rgba(255,255,255,0.15)",
                      color: "#fff",
                      border: "none",
                      width: 60,
                      height: 60,
                      borderRadius: "50%",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 28,
                      zIndex: 10000,
                    }}
                  >
                    〉
                  </button>
                  <div
                    style={{
                      position: "absolute",
                      bottom: -50,
                      left: "50%",
                      transform: "translateX(-50%)",
                      color: "#fff",
                      fontSize: 16,
                      fontWeight: "bold",
                      background: "rgba(255,255,255,0.2)",
                      padding: "6px 20px",
                      borderRadius: 20,
                    }}
                  >
                    {galleryIndex + 1} / {images.length}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* 토스트 알림 */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: "30%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.8)",
            color: "#fff",
            padding: "12px 28px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: "bold",
            zIndex: 999999,
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            animation: "toastFadeIn 0.2s ease",
            whiteSpace: "nowrap",
          }}
        >
          {toastMessage}
        </div>
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialTab="signup" />

      {currentUser && showCategoryModal && selectedVacancyId && (
        <BookmarkCategoryModal
          isOpen={showCategoryModal}
          onClose={() => {
            setShowCategoryModal(false);
            setSelectedVacancyId(null);
          }}
          userId={currentUser.id}
          itemId={selectedVacancyId}
          type="VACANCY"
          onSuccess={() => alert("폴더 이동이 완료되었습니다.")}
        />
      )}

       <style>{`
        @keyframes toastFadeIn { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes dropdownFadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .no-scrollbar::-webkit-scrollbar { display: none !important; }
        .no-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        .sub-gnb-scroll::-webkit-scrollbar { display: none !important; }
        .sub-gnb-scroll { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}</style>
    </div>
  );
}
