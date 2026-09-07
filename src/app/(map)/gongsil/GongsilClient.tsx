"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getVacancies, getAgencyInfo, getVacancyDetail, getVacanciesForMap, getVacancyByVacancyNo } from "@/app/actions/vacancy";
import { getVacancyComments, createVacancyComment } from "@/app/actions/vacancyComments";
import { getVacancyUserData, toggleWishlistToDB, addRecentViewToDB } from "@/app/actions/vacancyUserData";
import { getPermissionLevel } from "@/utils/permissionCheck";
import { handleLocationPermissionDenied, handleLocationUnavailable } from "@/utils/locationPermission";
import AuthModal from "@/components/AuthModal";
import BookmarkCategoryModal from "@/components/BookmarkCategoryModal";
import { getBookmarkCategories } from "@/app/actions/bookmark";

// Import modular components
import GongsilSidebar from "./GongsilSidebar";
import GongsilDetailPanel from "./GongsilDetailPanel";
import KakaoMapView from "./KakaoMapView";
import GongsilFilterBar from "./GongsilFilterBar";
import GongsilFilterPanel from "./GongsilFilterPanel";
import GongsilRegisterPromoOverlay from "./GongsilRegisterPromoOverlay";
import { filterVacancies } from "./filterVacancies";
import { useGongsilFilterState } from "./useGongsilFilterState";
import {
  MAEMAE_SCALE,
  DEPOSIT_SCALE,
  RENT_SCALE,
  AREA_SCALE,
  YEAR_SCALE,
  UNIT_SCALE,
  getScaleIndex,
} from "./gongsilFilterScales";

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
  getJitteredCoords,
} from "./gongsilHelpers";

export default function GongsilClient({ initialVacancies, ownerId }: { initialVacancies: any[]; ownerId?: string }) {
  /* ── State & Refs ── */
  const searchParams = useSearchParams();
  const [dbVacancies, setDbVacancies] = useState<any[]>(() => {
    if (initialVacancies && initialVacancies.length > 0) {
      return initialVacancies.map((v: any) => ({
        ...v,
        images: v.images && v.images.length > 0
          ? v.images
          : (v.vacancy_photos
              ? [...v.vacancy_photos].sort((a: any, b: any) => a.sort_order - b.sort_order).map((p: any) => p.url)
              : []),
      }));
    }
    return [];
  });

  const [activeCategory, setActiveCategory] = useState(() => {
    const first = initialVacancies[0];
    if (first) {
      if (first.trade_type === "경매") return "auction";
      const catEntry = Object.entries(CATEGORY_TO_PROPERTY_TYPE).find(
        ([, pType]) => pType === first.property_type
      );
      if (catEntry) return catEntry[0];
    }
    // 공실열람 메뉴 진입 시 언제나 매물이 가장 풍부한 '경매/공매' 탭이 기본으로 열림
    return "auction";
  });
  const [activePills, setActivePills] = useState<string[]>(() => {
    const first = initialVacancies[0];
    if (first) {
      if (first.trade_type === "경매") {
        const meta = first.metadata || {};
        const scls = meta.cltrUsgSclsCtgrNm || "";
        if (scls.includes("아파트") || scls.includes("오피스텔") || scls.includes("공동주택")) return ["아파트"];
        if (scls.includes("단독") || scls.includes("다가구") || scls.includes("주택")) return ["단독/다가구"];
        if (scls.includes("빌라") || scls.includes("다세대") || scls.includes("연립")) return ["빌라/주택"];
        if (scls.includes("상가") || scls.includes("점포") || scls.includes("사무") || scls.includes("빌딩") || scls.includes("근린생활")) return ["빌딩/사무실"];
        if (scls.includes("공장") || scls.includes("창고")) return ["공장/창고"];
        if (scls.includes("토지") || scls.includes("대지") || scls.includes("임야")) return ["토지"];
        return ["아파트", "단독/다가구", "빌라/주택", "빌딩/사무실", "공장/창고", "토지"];
      } else {
        if (first.sub_category) {
          return [first.sub_category];
        }
      }
    }
    const config = CATEGORY_CONFIG["auction"];
    if (config && config.pills) {
      return config.pills.filter((p) => p !== "오피스텔만 보기");
    }
    return ["아파트", "단독/다가구", "빌라/주택", "빌딩/사무실", "공장/창고", "토지"];
  });
  const [activeProperty, setActiveProperty] = useState<string | number | null>(() => {
    return initialVacancies[0]?.id || null;
  });
  const [prevPropertyId, setPrevPropertyId] = useState<string | number | null>(null);
  const [showDetail, setShowDetail] = useState(true);
  const [activeDetailTab, setActiveDetailTab] = useState<
    "info" | "realtor" | "auction_detail" | "auction_property" | "auction_bid" | "auction_market"
  >(() => {
    const first = initialVacancies[0];
    if (first && first.trade_type === "경매") {
      return "auction_detail";
    }
    return "info";
  });
  const [showDetailFilters, setShowDetailFilters] = useState(false);
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAuctionMode, setIsAuctionMode] = useState(() => {
    const first = initialVacancies[0];
    if (first) {
      return first.trade_type === "경매";
    }
    return true;
  });
  const [activeMode, setActiveMode] = useState<"공실" | "분양" | "경매">(() => {
    const first = initialVacancies[0];
    if (first) {
      return first.trade_type === "경매" ? "경매" : "공실";
    }
    return "경매";
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

  const {
    filterTradeTypes, setFilterTradeTypes, tempFilterTradeTypes, setTempFilterTradeTypes,
    tempMaemaeMin, setTempMaemaeMin, tempMaemaeMax, setTempMaemaeMax,
    tempDepositMin, setTempDepositMin, tempDepositMax, setTempDepositMax,
    tempRentMin, setTempRentMin, tempRentMax, setTempRentMax,
    filterAuctionDiscount, setFilterAuctionDiscount, filterAuctionBidCount, setFilterAuctionBidCount,
    filterAuctionStartDate, setFilterAuctionStartDate,
    filterAuctionAppraisalMin, setFilterAuctionAppraisalMin, filterAuctionAppraisalMax, setFilterAuctionAppraisalMax,
    filterAuctionBidPriceMin, setFilterAuctionBidPriceMin, filterAuctionBidPriceMax, setFilterAuctionBidPriceMax,
    sliderInteractions, setSliderInteractions, roomBathInteractions, setRoomBathInteractions,
    appliedMaemaeMin, setAppliedMaemaeMin, appliedMaemaeMax, setAppliedMaemaeMax,
    appliedDepositMin, setAppliedDepositMin, appliedDepositMax, setAppliedDepositMax,
    appliedRentMin, setAppliedRentMin, appliedRentMax, setAppliedRentMax,
    popoverSearchKeyword, setPopoverSearchKeyword, filterSearchKeyword, setFilterSearchKeyword,
    filterPriceMin, setFilterPriceMin, filterPriceMax, setFilterPriceMax,
    filterAreaMin, setFilterAreaMin, filterAreaMax, setFilterAreaMax, filterMaintIdx, setFilterMaintIdx,
    filterRoomCount, setFilterRoomCount, filterBathCount, setFilterBathCount,
    filterDirection, setFilterDirection, filterParking, setFilterParking,
    filterYearMin, setFilterYearMin, filterYearMax, setFilterYearMax,
    filterUnitMin, setFilterUnitMin, filterUnitMax, setFilterUnitMax,
    filterFloor, setFilterFloor, filterSaleStage, setFilterSaleStage,
    filterSaleType, setFilterSaleType, filterOptions, setFilterOptions,
    filterOwnerRole, setFilterOwnerRole, filterCommissionType, setFilterCommissionType,
    filterThemes, setFilterThemes,
  } = useGongsilFilterState();
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


  const [selectedClusterIds, setSelectedClusterIds] = useState<string[] | null>(null);
  const [mapBounds, setMapBounds] = useState<any>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(6);
  const [selectedRegion, setSelectedRegion] = useState<{ sido: string; gugun: string; dong: string } | null>(null);
  const [mapCenterRegion, setMapCenterRegion] = useState<{ sido: string; gugun: string; dong: string } | null>(null);
  const [visibleCount, setVisibleCount] = useState(30);
  const [isFetchingVacancies, setIsFetchingVacancies] = useState(false);
  const fetchingLoadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const beginFetchingIndicator = () => {
    if (fetchingLoadingTimerRef.current) clearTimeout(fetchingLoadingTimerRef.current);
    fetchingLoadingTimerRef.current = setTimeout(() => setIsFetchingVacancies(true), 200);
  };

  const endFetchingIndicator = () => {
    if (fetchingLoadingTimerRef.current) {
      clearTimeout(fetchingLoadingTimerRef.current);
      fetchingLoadingTimerRef.current = null;
    }
    setIsFetchingVacancies(false);
  };

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [showRegisterPromoOverlay, setShowRegisterPromoOverlay] = useState(false);
  const [agencyInfo, setAgencyInfo] = useState<any>(null);
  const detailHistoryInitializedRef = useRef(false);

  // Lazy Loading Detail Map
  const [fullDetailsMap, setFullDetailsMap] = useState<Record<string, any>>({});

  const itemMapRef = useRef<HTMLDivElement>(null);
  const roadviewRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<any>(null);
  const skipNextBboxFetchRef = useRef(false);

  useEffect(() => {
    const currentState = window.history.state || {};
    window.history.replaceState({ ...currentState, gongsilView: "list" }, "", window.location.href);
    if (showDetail && activeProperty !== null) {
      window.history.pushState({ gongsilView: "detail" }, "", window.location.href);
    }
    detailHistoryInitializedRef.current = true;

    const handlePopState = (event: PopStateEvent) => {
      const view = event.state?.gongsilView;
      if (view === "gallery") {
        setShowGalleryModal(false);
        setShowDetail(true);
      } else if (view === "detail") {
        setShowGalleryModal(false);
        setShowDetail(true);
      } else {
        setShowGalleryModal(false);
        setShowDetail(false);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!detailHistoryInitializedRef.current || showGalleryModal) return;
    if (showDetail && window.history.state?.gongsilView === "list") {
      window.history.pushState({ ...window.history.state, gongsilView: "detail" }, "", window.location.href);
    }
  }, [showDetail, showGalleryModal]);

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

  // 상세검색의 임시 금액값도 슬라이더를 움직이는 즉시 실제 목록 필터에 반영한다.
  useEffect(() => {
    setFilterTradeTypes(tempFilterTradeTypes);
    setAppliedMaemaeMin(tempMaemaeMin);
    setAppliedMaemaeMax(tempMaemaeMax);
    setAppliedDepositMin(tempDepositMin);
    setAppliedDepositMax(tempDepositMax);
    setAppliedRentMin(tempRentMin);
    setAppliedRentMax(tempRentMax);
  }, [tempFilterTradeTypes, tempMaemaeMin, tempMaemaeMax, tempDepositMin, tempDepositMax, tempRentMin, tempRentMax]);

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

    // URL 파라미터 진입 시 panTo로 인한 불필요한 bbox fetch 스킵 (깜빡임 방지)
    if (skipNextBboxFetchRef.current) {
      skipNextBboxFetchRef.current = false;
      return;
    }

    const fetchBboxVacancies = async () => {
      beginFetchingIndicator();
      try {
        const sw = mapBounds.getSouthWest();
        const ne = mapBounds.getNorthEast();

        const swLat = sw.getLat();
        const swLng = sw.getLng();
        const neLat = ne.getLat();
        const neLng = ne.getLng();

        // Server Action 호출하여 범위 내 매물만 초고속 fetch
        const res = await getVacanciesForMap({
          bbox: { swLat, swLng, neLat, neLng },
          ownerId
        });

        if (res.success && res.data) {
          const withImages = res.data.map((v: any) => ({
            ...v,
            images: v.vacancy_photos
              ? [...v.vacancy_photos].sort((a: any, b: any) => a.sort_order - b.sort_order).map((p: any) => p.url)
              : [],
          }));
          // Bbox 조회 결과는 교체하지 않고 기존 캐시와 병합한다.
          // 상세주소 비공개 매물은 대표 좌표가 실제 좌표와 다를 수 있어, 줌인 시 재조회 결과에서 누락될 수 있다.
          setDbVacancies((prev) => {
            const nextById = new Map(prev.map((item) => [String(item.id), item]));
            withImages.forEach((item: any) => nextById.set(String(item.id), item));
            return Array.from(nextById.values());
          });
        }
      } catch (err) {
        console.error("Failed to fetch bbox vacancies:", err);
      } finally {
        endFetchingIndicator();
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

  const vacancyFilterOptions = {
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
    filterParking,
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
    wishlist,
    wishlistData,
    selectedCategoryId,
    isAuctionMode,
    filterAuctionAppraisalMin,
    filterAuctionAppraisalMax,
    filterAuctionBidPriceMin,
    filterAuctionBidPriceMax,
    filterAuctionDiscount,
    filterAuctionBidCount,
    filterAuctionStartDate,
  };
  const filteredVacancies = React.useMemo(() => filterVacancies(vacancyFilterOptions), [vacancyFilterOptions]);

  // Reset pagination whenever the filtered list or cluster selection substantially changes
  const prevFilteredLenRef = useRef(filteredVacancies.length);
  const prevClusterIdsRef = useRef(selectedClusterIds);
  if (
    filteredVacancies.length !== prevFilteredLenRef.current ||
    selectedClusterIds !== prevClusterIdsRef.current
  ) {
    prevFilteredLenRef.current = filteredVacancies.length;
    prevClusterIdsRef.current = selectedClusterIds;
    if (visibleCount !== 30) {
      setVisibleCount(30);
    }
  }

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
        const displayCoords = getJitteredCoords(v, zoomLevel <= 5);
        if (!displayCoords.lat || !displayCoords.lng) return false;
        const pos = new (window as any).kakao.maps.LatLng(displayCoords.lat, displayCoords.lng);
        return mapBounds.contain(pos);
      });
    }
    return filtered;
  }, [filteredVacancies, selectedClusterIds, mapBounds, activeCategory, selectedRegion, zoomLevel]);

  const showArticleOnMap = useCallback((prop: any) => {
    // 대표님 지침: 리스트/매물 선택 시 지도가 강제로 움직이지 않도록 완전 고정
  }, []);

  // 보류된 지도 이동 좌표 (비동기 핸들러 → 지도 로딩 후 실행용, useState로 re-render 트리거)
  const [pendingPan, setPendingPan] = useState<{ lat: number; lng: number } | null>(null);

  // Handle ?id=X from main page navigation
  const idParamHandledRef = useRef<string | null>(initialVacancies[0] ? String(initialVacancies[0].id) : null);
  const idParamMapPannedRef = useRef<string | null>(initialVacancies[0] ? String(initialVacancies[0].id) : null);
  useEffect(() => {
    const idParam = searchParams.get("id");
    if (idParam && idParamHandledRef.current !== idParam) {
      const loadDirectVacancy = async () => {
        // First check if it's already in dbVacancies
        let target = dbVacancies.find((v) => String(v.id) === String(idParam));
        if (!target) {
          const res = await getVacancyDetail(idParam);
          if (res.success && res.data) {
            target = res.data;
            setDbVacancies((prev) => {
              if (prev.some((v) => String(v.id) === String(idParam))) return prev;
              return [...prev, target];
            });
          }
        }

        if (target) {
          idParamHandledRef.current = idParam; // 동일 id에 대해 반복 실행 방지
          setActiveProperty(target.id);
          setShowDetail(true);

          // 경매 물건은 auction 카테고리로 정확히 라우팅
          if (target.trade_type === "경매") {
            setActiveCategory("auction");
            setIsAuctionMode(true);
            setActiveMode("경매");
            setActiveDetailTab("auction_detail");
            localStorage.setItem("gongsil_category", "auction");
            // pills 설정 (저장된 것 또는 기본값) — pills가 비어있으면 filteredVacancies가 []을 반환
            const savedPills = localStorage.getItem("gongsil_pills_auction");
            let pills: string[] = [];
            if (savedPills) { try { pills = JSON.parse(savedPills); } catch {} }
            if (pills.length === 0) {
              const c = CATEGORY_CONFIG["auction"];
              pills = c?.pills || [];
            }
            setActivePills(pills);
            localStorage.setItem("gongsil_pills", JSON.stringify(pills));
          } else {
            setActiveDetailTab("info");
            const catEntry = Object.entries(CATEGORY_TO_PROPERTY_TYPE).find(
              ([, pType]) => pType === target.property_type
            );
            if (catEntry) {
              setActiveCategory(catEntry[0]);
              setIsAuctionMode(false);
              setActiveMode("공실");
              // pills 설정 (저장된 것 또는 기본값)
              const savedPills = localStorage.getItem(`gongsil_pills_${catEntry[0]}`);
              let pills: string[] = [];
              if (savedPills) { try { pills = JSON.parse(savedPills); } catch {} }
              if (pills.length === 0) {
                pills = target.sub_category ? [target.sub_category] : (CATEGORY_CONFIG[catEntry[0]]?.pills || []);
              }
              setActivePills(pills);
              localStorage.setItem("gongsil_pills", JSON.stringify(pills));
              sessionStorage.setItem("gongsil_category", catEntry[0]);
            }
          }

          if (target.lat && target.lng && idParamMapPannedRef.current !== idParam) {
            idParamMapPannedRef.current = idParam;
            skipNextBboxFetchRef.current = true;
            if (kakaoMapRef.current) {
              const kakao = (window as any).kakao;
              if (kakao?.maps) {
                kakaoMapRef.current.panTo(new kakao.maps.LatLng(target.lat, target.lng));
                kakaoMapRef.current.setLevel(5);
              }
            } else {
              setPendingPan({ lat: target.lat, lng: target.lng });
            }
          }
        }
      };

      loadDirectVacancy();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, mapLoaded]);

  // Handle ?mng=물건관리번호 from main page hero (경매 물건 — UUID 대신 안정적 식별자 사용)
  const mngParamHandledRef = useRef<string | null>(
    initialVacancies[0]
      ? (initialVacancies[0].metadata?.cltrMngNo || initialVacancies[0].metadata?.cltr_mng_no || null)
      : null
  );
  useEffect(() => {
    const mngParam = searchParams.get("mng");
    if (!mngParam || mngParamHandledRef.current === mngParam) return;

    const loadByMngNo = async () => {
      // 1) 현재 dbVacancies에서 cltrMngNo로 검색
      let target = dbVacancies.find((v) => {
        const m = v.metadata?.cltrMngNo || v.metadata?.cltr_mng_no;
        return m === mngParam;
      });

      // 2) 없으면 서버에서 직접 검색
      if (!target) {
        const { getVacancyByMngNo } = await import("@/app/actions/vacancy");
        const res = await getVacancyByMngNo(mngParam);
        if (res.success && res.data) {
          target = res.data;
          // dbVacancies에 추가
          setDbVacancies((prev) => {
            if (prev.some((v) => String(v.id) === String(target!.id))) return prev;
            return [...prev, target!];
          });
        }
      }

      if (!target) return; // 서버에서도 못 찾으면 포기

      mngParamHandledRef.current = mngParam;
      setActiveProperty(target.id);
      setShowDetail(true);
      setActiveCategory("auction");
      setIsAuctionMode(true);
      setActiveMode("경매");
      setActiveDetailTab("auction_detail");
      localStorage.setItem("gongsil_category", "auction");

      const savedPills = localStorage.getItem("gongsil_pills_auction");
      let pills: string[] = [];
      if (savedPills) { try { pills = JSON.parse(savedPills); } catch {} }
      if (pills.length === 0) { pills = CATEGORY_CONFIG["auction"]?.pills || []; }
      setActivePills(pills);
      localStorage.setItem("gongsil_pills", JSON.stringify(pills));

      // 지도를 해당 물건 위치로 이동 (지도 준비 전이면 보류)
      if (target.lat && target.lng) {
        skipNextBboxFetchRef.current = true;
        if (kakaoMapRef.current) {
          const kakao = (window as any).kakao;
          if (kakao?.maps) {
            kakaoMapRef.current.panTo(new kakao.maps.LatLng(target.lat, target.lng));
            kakaoMapRef.current.setLevel(5);
          }
        } else {
          setPendingPan({ lat: target.lat, lng: target.lng });
        }
      }
      setSelectedClusterIds([String(target.id)]);
    };

    loadByMngNo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, mapLoaded]);

  // 보류된 지도 이동 실행 (지도가 준비된 후 + pendingPan 변경 시)
  useEffect(() => {
    if (mapLoaded && kakaoMapRef.current && pendingPan) {
      const kakao = (window as any).kakao;
      if (kakao?.maps) {
        skipNextBboxFetchRef.current = true;
        kakaoMapRef.current.panTo(new kakao.maps.LatLng(pendingPan.lat, pendingPan.lng));
        kakaoMapRef.current.setLevel(5);
        setPendingPan(null);
      }
    }
  }, [mapLoaded, pendingPan]);

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
          .select("role, plan_type, agencies(status)")
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
        const coords = getJitteredCoords(prop, true);
        const pos = new kakao.maps.LatLng(coords.lat, coords.lng);

        const exp = prop.address_exposure;
        const propType = prop.property_type || "";
        const subCategory = prop.sub_category || "";
        const isApt = ["아파트", "오피스텔", "도시형생활주택"].some(t => propType.includes(t) || subCategory.includes(t));
        const isPrivateAddr = exp && exp !== "번지공개" && exp !== "지번공개" && exp !== "동/호수공개";
        const useCircle = isPrivateAddr && !isApt;

        if (itemMapRef.current) {
          const map = new kakao.maps.Map(itemMapRef.current, { center: pos, level: useCircle ? 5 : 3 });
          if (useCircle) {
            map.setMinLevel(5);
            map.setMaxLevel(8);
            new kakao.maps.Circle({
              center: pos,
              radius: 500,
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

          rvClient.getNearestPanoId(pos, 50, (panoId: any) => {
            if (panoId) {
              rv.setPanoId(panoId, pos);
            } else {
              if (roadviewRef.current)
                roadviewRef.current.innerHTML =
                  '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#999; font-size:13px;">해당 위치 근처의 로드뷰가 제공되지 않습니다.</div>';
            }
          });
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
    } · ${prop.trade_type === "매매" && ((prop.property_type === "빌라·주택" && ["단독/다가구", "전원주택", "상가주택"].includes(prop.sub_category)) || (prop.property_type === "상가·사무실·건물·공장·토지" && ["건물/빌딩", "공장/창고"].includes(prop.sub_category))) ? `연면적: ${prop.supply_m2 || 0}㎡` : `공급/전용: ${prop.supply_m2 || 0}㎡ / ${prop.exclusive_m2 || 0}㎡`}</div>
        <div class="info-row"><div class="info-label">공실광고번호</div><div class="info-value">${
          prop.vacancy_no || "-"
        }</div></div>
        <div class="info-row"><div class="info-label">소재지</div><div class="info-value">${fullAddr || "-"}</div></div>
        <div class="info-row"><div class="info-label">${prop.trade_type === "매매" && ((prop.property_type === "빌라·주택" && ["단독/다가구", "전원주택", "상가주택"].includes(prop.sub_category)) || (prop.property_type === "상가·사무실·건물·공장·토지" && ["건물/빌딩", "공장/창고"].includes(prop.sub_category))) ? "연면적" : "공급/전용면적"}</div><div class="info-value">${
          prop.trade_type === "매매" && ((prop.property_type === "빌라·주택" && ["단독/다가구", "전원주택", "상가주택"].includes(prop.sub_category)) || (prop.property_type === "상가·사무실·건물·공장·토지" && ["건물/빌딩", "공장/창고"].includes(prop.sub_category))) 
            ? (prop.supply_m2 ? prop.supply_m2 + "m²" : "-")
            : `${prop.supply_m2 ? prop.supply_m2 + "m²" : "-"} / ${prop.exclusive_m2 ? prop.exclusive_m2 + "m²" : "-"}`
        }</div></div>
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
    let themes = new Set<string>();
    const isEmpty = activePills.length === 0;

    if (category === "apart") {
      if (isEmpty || activePills.includes("아파트분양권") || activePills.includes("오피스텔분양권")) {
        ["마이너스피", "무피", "로열층", "중도금무이자", "전매제한없음", "하이엔드", "수익형", "역세권", "뻥뷰", "급매"].forEach(t => themes.add(t));
      }
      if (isEmpty || activePills.includes("아파트") || activePills.includes("오피스텔")) {
        ["신축첫입주", "특올수리", "로열층", "뻥뷰", "역세권", "풀옵션", "반려동물가능", "주차편리", "초품아", "숲세권", "전세대출가능", "즉시입주"].forEach(t => themes.add(t));
      }
      return Array.from(themes);
    }
    if (category === "villa") {
      return getThemesForVilla(activePills);
    }
    if (category === "one") {
      return ["가성비", "단기임대", "주차편리", "대로변안전", "여성안심", "오피스텔", "애완견가능"];
    }
    if (category === "biz") {
      if (isEmpty || activePills.includes("상가")) ["대로변상가", "가시성최상", "무권리", "카페추천", "음식점추천", "코너상가", "유동인구많음"].forEach(t => themes.add(t));
      if (isEmpty || activePills.includes("사무실")) ["역세권사무실", "채광우수", "가성비사무실", "사옥추천", "디자인사무실", "즉시입주", "주차편리"].forEach(t => themes.add(t));
      if (isEmpty || activePills.includes("건물/빌딩")) ["사옥추천", "통임대", "수익형건물", "메디컬빌딩", "리모델링빌딩", "코너건물", "가시성우수"].forEach(t => themes.add(t));
      if (isEmpty || activePills.includes("공장/창고")) ["IC인접", "대로변접", "민원없는곳", "신축공장", "물류창고", "단독공장", "저렴한임대료"].forEach(t => themes.add(t));
      if (isEmpty || activePills.includes("지식산업센터")) ["드라이브인", "섹션오피스", "역세권지산", "코너호실", "로얄층", "풀인테리어", "가성비매물"].forEach(t => themes.add(t));
      if (isEmpty || activePills.includes("토지")) ["공장부지", "창고부지", "전원주택지", "투자가치최상", "자연녹지", "급매물", "남향"].forEach(t => themes.add(t));
      return Array.from(themes);
    }
    return ["급매", "추천공실광고"];
  };

  const getThemesForVilla = (pills: string[]): string[] => {
    let themes = new Set<string>();
    const isEmpty = pills.length === 0;
    if (isEmpty || pills.includes("빌라/연립")) {
      ["신축첫입주", "특올수리", "엘리베이터있음", "주차편리", "역세권", "풀옵션", "전세대출가능", "반려동물가능", "안심전세", "투룸/쓰리룸"].forEach(t => themes.add(t));
    }
    if (isEmpty || pills.includes("단독/다가구") || pills.includes("전원주택") || pills.includes("상가주택")) {
      ["마당있음", "테라스/옥상", "수익형부동산", "통임대/통매매", "리모델링", "조용한동네", "반려동물환영", "전원생활", "층간소음프리", "대가족추천"].forEach(t => themes.add(t));
    }
    return Array.from(themes);
  };

  const getWizardTabs = (): string[] => {
    if (activeCategory === "apart") {
      return ["거래유형", "면적", "사용승인일", "세대수", "방/욕실수", "방향", "기타옵션", "등록자", "중개보수", "테마"];
    }
    if (activeCategory === "villa") {
      const hasVillaOrCommercialHouse = activePills.includes("빌라/연립") || activePills.includes("상가주택");
      const hasDetachedOrRural = activePills.includes("단독/다가구") || activePills.includes("전원주택");
      
      if (hasDetachedOrRural && !hasVillaOrCommercialHouse) {
        return ["거래유형", "면적", "사용승인일", "방/욕실수", "방향", "기타옵션", "등록자", "중개보수", "테마"];
      }
      return ["거래유형", "면적", "사용승인일", "세대수", "방/욕실수", "방향", "기타옵션", "등록자", "중개보수", "테마"];
    }
    if (activeCategory === "one") {
      return ["거래유형", "면적", "방/욕실수", "방향", "관리비", "기타옵션", "등록자", "중개보수", "테마"];
    }
    if (activeCategory === "biz") {
      return ["거래유형", "면적", "층수", "관리비", "주차", "기타옵션", "등록자", "중개보수", "테마"];
    }
    if (activeCategory === "sale") {
      return ["거래유형", "면적", "세대수", "등록자", "중개보수", "테마"];
    }
    if (activeCategory === "auction") {
      return ["감정가", "최저입찰가", "할인율", "유찰횟수", "입찰일"];
    }
    return ["거래유형", "면적", "사용승인일", "세대수", "방/욕실수", "방향", "기타옵션", "등록자", "중개보수", "테마"];
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
    setFilterParking(null);
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

    // temp 필터 상태도 함께 초기화 (getTradeTypeFilterLabel이 temp 우선 참조하므로 필수)
    setTempFilterTradeTypes([]);
    setTempMaemaeMin(null);
    setTempMaemaeMax(null);
    setTempDepositMin(null);
    setTempDepositMax(null);
    setTempRentMin(null);
    setTempRentMax(null);

    // 슬라이더/인터랙션 상태 초기화
    setSliderInteractions({});
    setRoomBathInteractions({ room: false, bath: false });

    setFilterAuctionDiscount(0);
    setFilterAuctionBidCount(0);
    setFilterAuctionStartDate("all");
    setFilterAuctionAppraisalMin(null);
    setFilterAuctionAppraisalMax(null);
    setFilterAuctionBidPriceMin(null);
    setFilterAuctionBidPriceMax(null);
    setPopoverSearchKeyword("");
    setFilterSearchKeyword("");
  };

  const handleCategoryChange = (key: string) => {
    if (activeCategory === key) {
      // 이미 선택된 탭을 다시 눌렀을 때도 일반 공실 탭이면 안내 오버레이 다시 노출
      if (["apart", "villa", "one", "biz", "sale"].includes(key)) {
        setShowRegisterPromoOverlay(true);
      }
      return;
    }
    // 현재 탭의 pill 상태를 sessionStorage에 저장
    sessionStorage.setItem(`gongsil_pills_${activeCategory}`, JSON.stringify(activePills));

    const newKey = key;
    setActiveCategory(newKey);
    setIsAuctionMode(newKey === "auction");
    setActiveMode(newKey === "auction" ? "경매" : "공실");

    // 아파트~신축분양 탭 선택 시 공실 등록 유도 오버레이 노출
    if (["apart", "villa", "one", "biz", "sale"].includes(newKey)) {
      setShowRegisterPromoOverlay(true);
    } else {
      setShowRegisterPromoOverlay(false);
    }
    
    // sessionStorage에서 이전 pill 상태 복원, 없으면 전체선택
    const savedPills = sessionStorage.getItem(`gongsil_pills_${newKey}`);
    let pills: string[] = [];
    if (savedPills) {
      try { pills = JSON.parse(savedPills); } catch {}
    }
    if (pills.length === 0) {
      const c = CATEGORY_CONFIG[newKey];
      pills = c && c.pills ? c.pills.filter(p => p !== "오피스텔만 보기") : [];
    }
    setActivePills(pills);

    setShowDetail(false);
    setShowDetailFilters(false);
    setSelectedClusterIds(null);
    setIsWizardOpen(false);
    resetAllFilters();
    sessionStorage.setItem("gongsil_category", newKey);
  };

  const togglePill = (p: string) => {
    setActivePills((prev) => {
      let next;
      if (p === "오피스텔만 보기") {
        next = prev.includes(p) ? [] : [p];
      } else {
        const withoutOfficetel = prev.filter(x => x !== "오피스텔만 보기");
        next = withoutOfficetel.includes(p) ? withoutOfficetel.filter((x) => x !== p) : [...withoutOfficetel, p];
      }
      // sessionStorage에도 반영 (새로고침 시 유지)
      sessionStorage.setItem(`gongsil_pills_${activeCategory}`, JSON.stringify(next));
      return next;
    });
  };

  const toggleTradeType = (t: string) => {
    setFilterTradeTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const handleSearch = async (keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      setFilterSearchKeyword("");
      return;
    }

    // 공실번호(숫자) 형식인 경우 글로벌 DB 검색 수행
    const isNum = /^\d+$/.test(trimmed);
    if (isNum) {
      const numVal = parseInt(trimmed, 10);
      
      // 1) 이미 로드된 매물 중에서 먼저 찾기
      let target = dbVacancies.find((v) => v.vacancy_no === numVal);
      
      // 2) 로드되어 있지 않다면 서버에서 직접 가져오기
      if (!target) {
        beginFetchingIndicator();
        try {
          const res = await getVacancyByVacancyNo(numVal);
          if (res.success && res.data) {
            const data = res.data;
            const withImages = {
              ...data,
              images: data.vacancy_photos
                ? [...data.vacancy_photos].sort((a: any, b: any) => a.sort_order - b.sort_order).map((p: any) => p.url)
                : [],
            };
            target = withImages;
            // dbVacancies에 추가
            setDbVacancies((prev) => {
              if (prev.some((v) => String(v.id) === String(withImages.id))) return prev;
              return [withImages, ...prev];
            });
          }
        } catch (err) {
          console.error("Failed to query global vacancy by number:", err);
        } finally {
          endFetchingIndicator();
        }
      }

      // 3) 매물을 찾았을 경우 상세창 활성화, 카테고리/Pill 동기화, 지도 이동 처리
      if (target) {
        setActiveProperty(target.id);
        setShowDetail(true);

        if (target.trade_type === "경매") {
          setActiveCategory("auction");
          setIsAuctionMode(true);
          setActiveMode("경매");
          setActiveDetailTab("auction_detail");
          localStorage.setItem("gongsil_category", "auction");
          
          const savedPills = localStorage.getItem("gongsil_pills_auction");
          let pills: string[] = [];
          if (savedPills) { try { pills = JSON.parse(savedPills); } catch {} }
          if (pills.length === 0) {
            pills = CATEGORY_CONFIG["auction"]?.pills || [];
          }
          setActivePills(pills);
          localStorage.setItem("gongsil_pills", JSON.stringify(pills));
        } else {
          setActiveDetailTab("info");
          const catEntry = Object.entries(CATEGORY_TO_PROPERTY_TYPE).find(
            ([, pType]) => pType === target!.property_type
          );
          if (catEntry) {
            setActiveCategory(catEntry[0]);
            setIsAuctionMode(false);
            setActiveMode("공실");
            
            const savedPills = localStorage.getItem(`gongsil_pills_${catEntry[0]}`);
            let pills: string[] = [];
            if (savedPills) { try { pills = JSON.parse(savedPills); } catch {} }
            if (pills.length === 0) {
              pills = target.sub_category ? [target.sub_category] : (CATEGORY_CONFIG[catEntry[0]]?.pills || []);
            }
            setActivePills(pills);
            localStorage.setItem("gongsil_pills", JSON.stringify(pills));
            sessionStorage.setItem("gongsil_category", catEntry[0]);
          }
        }

        // 지도 중심 이동
        if (target.lat && target.lng) {
          if (kakaoMapRef.current) {
            const kakao = (window as any).kakao;
            if (kakao?.maps) {
              kakaoMapRef.current.panTo(new kakao.maps.LatLng(target.lat, target.lng));
              kakaoMapRef.current.setLevel(5);
            }
          } else {
            setPendingPan({ lat: target.lat, lng: target.lng });
          }
        }
        setSelectedClusterIds([String(target.id)]);
        setFilterSearchKeyword(trimmed);
      } else {
        setToastMessage("입력하신 공실번호에 해당하는 활성 매물을 찾을 수 없습니다.");
        setFilterSearchKeyword(trimmed);
      }
    } else {
      // 일반 주소/지하철/텍스트 검색어인 경우 기존처럼 텍스트 필터링 수행
      setFilterSearchKeyword(trimmed);
    }
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
    const activeMaemaeMin = tempMaemaeMin !== null ? tempMaemaeMin : appliedMaemaeMin;
    const activeMaemaeMax = tempMaemaeMax !== null ? tempMaemaeMax : appliedMaemaeMax;
    const activeDepositMin = tempDepositMin !== null ? tempDepositMin : appliedDepositMin;
    const activeDepositMax = tempDepositMax !== null ? tempDepositMax : appliedDepositMax;
    const activeRentMin = tempRentMin !== null ? tempRentMin : appliedRentMin;
    const activeRentMax = tempRentMax !== null ? tempRentMax : appliedRentMax;

    const hasPriceFilter =
      activeMaemaeMin !== null ||
      activeMaemaeMax !== null ||
      activeDepositMin !== null ||
      activeDepositMax !== null ||
      activeRentMin !== null ||
      activeRentMax !== null;

    if (filterTradeTypes.length === 0 && !hasPriceFilter) return "거래유형";
    
    // 사용자가 '매매/전세' 버튼은 안 누르고 슬라이더만 만졌을 때도 금액 표시
    if (filterTradeTypes.length === 0 && hasPriceFilter) {
      const parts: string[] = [];
      if (activeMaemaeMin !== null || activeMaemaeMax !== null) {
        parts.push(`매매 ${formatPriceLabel(activeMaemaeMin) || "~"}~${formatPriceLabel(activeMaemaeMax) || ""}`);
      }
      if (activeDepositMin !== null || activeDepositMax !== null) {
        parts.push(`보증금 ${formatPriceLabel(activeDepositMin) || "~"}~${formatPriceLabel(activeDepositMax) || ""}`);
      }
      if (activeRentMin !== null || activeRentMax !== null) {
        parts.push(`월세 ${formatPriceLabel(activeRentMin) || "~"}~${formatPriceLabel(activeRentMax) || ""}`);
      }
      return parts.join(" / ");
    }
    
    const typesStr = filterTradeTypes.join(",");
    if (!hasPriceFilter) return typesStr;
    
    if (filterTradeTypes.length === 1) {
      const t = filterTradeTypes[0];
      if (t === "매매") {
        if (activeMaemaeMin === null && activeMaemaeMax === null) return "매매";
        return `매매 ${formatPriceLabel(activeMaemaeMin) || "~"}~${formatPriceLabel(activeMaemaeMax) || ""}`;
      } else if (t === "전세") {
        if (activeDepositMin === null && activeDepositMax === null) return "전세";
        return `전세 ${formatPriceLabel(activeDepositMin) || "~"}~${formatPriceLabel(activeDepositMax) || ""}`;
      } else if (t === "월세") {
        const depStr = activeDepositMin !== null || activeDepositMax !== null 
          ? `보증금 ${formatPriceLabel(activeDepositMin) || "~"}~${formatPriceLabel(activeDepositMax) || ""}`
          : "";
        const rentStr = activeRentMin !== null || activeRentMax !== null
          ? `월세 ${formatPriceLabel(activeRentMin) || "~"}~${formatPriceLabel(activeRentMax) || ""}`
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
    window.history.pushState({ ...window.history.state, gongsilView: "gallery" }, "", window.location.href);
    setShowGalleryModal(true);
  };

  const closeGalleryModal = () => {
    if (window.history.state?.gongsilView === "gallery") {
      window.history.back();
    } else {
      setShowGalleryModal(false);
    }
  };

  const handleDetailBack = () => {
    if (window.history.state?.gongsilView === "detail") {
      window.history.back();
    } else {
      setShowDetail(false);
    }
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
        style={{ background: "#fff", width: "100%", zIndex: 2000, position: "relative", borderBottom: "1px solid #ccc", flexShrink: 0 }}
      >
        <GongsilFilterBar
          activeCategory={activeCategory}
          handleCategoryChange={handleCategoryChange}
          popoverSearchKeyword={popoverSearchKeyword}
          setPopoverSearchKeyword={setPopoverSearchKeyword}
          handleSearch={handleSearch}
        />

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
            {config.pills.length > 0 && (
              <button
                onClick={() => {
                  const selectablePills = config.pills.filter(p => p !== "오피스텔만 보기");
                  const allSelected = selectablePills.length > 0 && selectablePills.every(p => activePills.includes(p));
                  if (allSelected) {
                    setActivePills([]);
                  } else {
                    setActivePills([...selectablePills]);
                  }
                }}
                style={{
                  background: (config.pills.filter(p => p !== "오피스텔만 보기").length > 0 && config.pills.filter(p => p !== "오피스텔만 보기").every(p => activePills.includes(p))) ? (isAuctionMode ? "#f3f0ff" : "#e8f0fe") : "#fff",
                  border: `1px solid ${(config.pills.filter(p => p !== "오피스텔만 보기").length > 0 && config.pills.filter(p => p !== "오피스텔만 보기").every(p => activePills.includes(p))) ? (isAuctionMode ? "#7048e8" : "#1a73e8") : "#ccc"}`,
                  fontSize: 13,
                  color: (config.pills.filter(p => p !== "오피스텔만 보기").length > 0 && config.pills.filter(p => p !== "오피스텔만 보기").every(p => activePills.includes(p))) ? (isAuctionMode ? "#7048e8" : "#1a73e8") : "#333",
                  cursor: "pointer",
                  padding: "6px 14px",
                  borderRadius: 20,
                  whiteSpace: "nowrap",
                  fontWeight: (config.pills.filter(p => p !== "오피스텔만 보기").length > 0 && config.pills.filter(p => p !== "오피스텔만 보기").every(p => activePills.includes(p))) ? "bold" : "normal",
                  fontFamily: "inherit",
                  flexShrink: 0,
                  transition: "all 0.15s",
                }}
              >
                {(config.pills.filter(p => p !== "오피스텔만 보기").length > 0 && config.pills.filter(p => p !== "오피스텔만 보기").every(p => activePills.includes(p))) ? "✓ 전체선택" : "전체선택"}
              </button>
            )}
            {config.pills.map((p, idx) => {
              let activeBg = "#e8f0fe";
              let activeBorder = "#1a73e8";
              let activeColor = "#1a73e8";

              if (isAuctionMode) {
                if (["빌딩/사무실", "공장/창고", "토지"].includes(p)) {
                  activeBg = "#f3f0ff";
                  activeBorder = "#7048e8";
                  activeColor = "#7048e8";
                }
              }

              const isSelected = activePills.includes(p);

              return (
                <React.Fragment key={p}>
                  <button
                    onClick={() => togglePill(p)}
                    style={{
                      background: isSelected ? activeBg : "#fff",
                      border: `1px solid ${isSelected ? activeBorder : "#ccc"}`,
                      fontSize: 13,
                      color: isSelected ? activeColor : "#333",
                      cursor: "pointer",
                      padding: "6px 14px",
                      borderRadius: 20,
                      whiteSpace: "nowrap",
                      fontWeight: isSelected ? "bold" : "normal",
                      fontFamily: "inherit",
                      flexShrink: 0,
                      transition: "all 0.15s",
                    }}
                  >
                    {isSelected ? `✓ ${p}` : p}
                  </button>
                  {isAuctionMode && (p === "빌라/주택" || p === "토지") && (
                    <div style={{ width: 1, height: 16, background: "#ddd", margin: "0 6px", flexShrink: 0 }} />
                  )}
                </React.Fragment>
              );
            })}


            {/* Active filter text badges removed per user request, replaced by short summary next to search toggle */}

            {config.basicFilters.map((f: string) => {
              let filterName: string = String(f);
              // 대표님 지시: 나머지 알약 버튼 다 없애고, "검색열기" 버튼 딱 하나만 렌더링!
              if (!["거래유형"].includes(filterName)) return null;

              const isPremiumWizard = true;

              const tradeLabel = getTradeTypeFilterLabel();
              const areaLabel = areaFilterLabel;
              
              const summaryTexts = [];
              if (tradeLabel !== "거래유형") summaryTexts.push(tradeLabel);
              if (areaLabel !== "면적") summaryTexts.push(areaLabel);
              if (yearFilterLabel !== "사용승인일") summaryTexts.push(yearFilterLabel);
              if (unitFilterLabel !== "세대수") summaryTexts.push(unitFilterLabel);
              if (filterRoomCount !== null || filterBathCount !== null) {
                const roomStr = filterRoomCount ? `${filterRoomCount}룸` : "";
                const bathStr = filterBathCount ? `${filterBathCount}욕실` : "";
                summaryTexts.push(`방/욕실수: ${[roomStr, bathStr].filter(Boolean).join(", ")}`);
              }
              if (filterDirection !== null) summaryTexts.push(`방향: ${filterDirection}`);
              if (filterOwnerRole !== null) summaryTexts.push(`등록자: ${filterOwnerRole}`);
              if (filterCommissionType !== null) {
                const labelMap: Record<string, string> = {
                  "공동중개": "공동중개 가능",
                  "25": "수수료 25%이상",
                  "50": "수수료 50%이상",
                  "100": "수수료 100%(법정가)",
                };
                summaryTexts.push(`중개보수: ${labelMap[filterCommissionType] || filterCommissionType}`);
              }
              filterThemes.forEach((t) => summaryTexts.push(`#${t}`));
              
              const summaryString = summaryTexts.join(" · ");

              return (
                <div 
                  key={f} 
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center"
                  }}
                >
                  <button
                    onClick={() => {
                      if (isWizardOpen) {
                        setIsWizardOpen(false);
                      } else {
                        setActiveSection("거래유형");
                        setIsWizardOpen(true);
                      }
                    }}
                    style={{
                      background: isWizardOpen ? "#e8f0fe" : "#fff",
                      border: `1px solid ${isWizardOpen ? "#1a73e8" : "#ccc"}`,
                      fontSize: 13,
                      color: isWizardOpen ? "#1a73e8" : "#333",
                      cursor: "pointer",
                      padding: "6px 14px",
                      borderRadius: 20,
                      whiteSpace: "nowrap",
                      fontWeight: isWizardOpen ? "bold" : "normal",
                      fontFamily: "inherit",
                      transition: "all 0.15s",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: isWizardOpen ? "none" : "0 1px 2px rgba(0,0,0,0.05)"
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line>
                      <line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line>
                      <line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line>
                      <line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line>
                      <line x1="17" y1="16" x2="23" y2="16"></line>
                    </svg>
                    {isWizardOpen ? "상세검색 ▲" : "상세검색 ▼"}
                  </button>
                  
                  {summaryString && (
                    <span style={{ fontSize: 14, color: "#111", fontWeight: 600, marginLeft: 4 }}>
                      {summaryString}
                    </span>
                  )}

                  {/* 드롭다운 필터 내용 */}
                  <GongsilFilterPanel
                    panel={{
                      filterName,
                      isWizardOpen,
                      handleDragStart,
                      isPremiumWizard,
                      setIsWizardOpen,
                      setActiveFilterDropdown,
                      filterOffset,
                      isDraggingFilter,
                      getWizardTabs,
                      activeSection,
                      tempFilterTradeTypes,
                      tempMaemaeMin,
                      tempMaemaeMax,
                      tempDepositMin,
                      tempDepositMax,
                      tempRentMin,
                      tempRentMax,
                      filterAreaMin,
                      filterAreaMax,
                      filterYearMin,
                      filterYearMax,
                      filterUnitMin,
                      filterUnitMax,
                      filterRoomCount,
                      filterBathCount,
                      filterDirection,
                      filterOwnerRole,
                      filterCommissionType,
                      filterThemes,
                      scrollToSection,
                      scrollDebounceRef,
                      setActiveSection,
                      isAuctionMode,
                      setTempFilterTradeTypes,
                      activeCategory,
                      setTempMaemaeMin,
                      formatPriceLabel,
                      handleSliderRelease,
                      setTempMaemaeMax,
                      setTempDepositMin,
                      setTempDepositMax,
                      setTempRentMin,
                      setTempRentMax,
                      setFilterAreaMin,
                      setFilterAreaMax,
                      setFilterFloor,
                      filterFloor,
                      setFilterYearMin,
                      setFilterYearMax,
                      setFilterUnitMin,
                      setFilterUnitMax,
                      setRoomBathInteractions,
                      setFilterRoomCount,
                      setFilterBathCount,
                      setFilterDirection,
                      setFilterMaintIdx,
                      filterMaintIdx,
                      setFilterParking,
                      filterParking,
                      activePills,
                      setFilterOptions,
                      filterOptions,
                      setFilterAuctionAppraisalMin,
                      setFilterAuctionAppraisalMax,
                      filterAuctionAppraisalMin,
                      filterAuctionAppraisalMax,
                      setFilterAuctionBidPriceMin,
                      setFilterAuctionBidPriceMax,
                      filterAuctionBidPriceMin,
                      filterAuctionBidPriceMax,
                      filterAuctionDiscount,
                      setFilterAuctionDiscount,
                      filterAuctionBidCount,
                      setFilterAuctionBidCount,
                      filterAuctionStartDate,
                      setFilterAuctionStartDate,
                      setFilterOwnerRole,
                      setFilterCommissionType,
                      getThemesByCategory,
                      setFilterThemes,
                      setPopoverSearchKeyword,
                      setFilterSearchKeyword,
                      setFilterTradeTypes,
                      setFilterPriceMin,
                      setFilterPriceMax,
                      setFilterSaleStage,
                      setFilterSaleType,
                      setAppliedMaemaeMin,
                      setAppliedMaemaeMax,
                      setAppliedDepositMin,
                      setAppliedDepositMax,
                      setAppliedRentMin,
                      setAppliedRentMax,
                      setIsFilterCollapsed,
                    }}
                  />
                      {filterName === "거래방식" && (
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

                      {(filterName === "가격대" || filterName === "분양가/보증금") && (
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

                      {filterName === "면적" && (
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

                      {filterName === "사용승인일" && (
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

                      {filterName === "세대수" && (
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

                      {filterName === "관리비" && (
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

                      {filterName === "방/욕실수" && (
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

                      {filterName === "방향" && (
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

                      {filterName === "등록자" && (
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

                      {filterName === "중개보수" && (
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

                      {filterName === "테마" && (
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
          onBack={handleDetailBack}
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

        {/* 매물 조회 지연 시에만 표시하는 로딩 인디케이터 */}
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
              gap: 10,
              padding: "10px 14px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.96)",
              boxShadow: "0 3px 12px rgba(15,23,42,0.14)",
              border: "1px solid rgba(226,232,240,0.9)",
              pointerEvents: "none",
            }}
          >
            <style>{`
              @keyframes pcMapLoadingDot {
                0%, 60%, 100% { transform: translateY(0); opacity: 0.45; }
                30% { transform: translateY(-7px); opacity: 1; }
              }
            `}</style>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 16 }}>
              {[0, 1, 2].map((index) => (
                <span key={index} style={{ width: 6, height: 6, borderRadius: "50%", background: "#2563eb", animation: `pcMapLoadingDot 1s ease-in-out ${index * 0.15}s infinite` }} />
              ))}
            </div>
            <span style={{ color: "#334155", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>매물을 불러오는 중</span>
          </div>
        )}

        {/* 일반 공실 탭 선택 시 노출되는 '내 공동중개 물건 무료 등록' 흰색 오버레이 */}
        {showRegisterPromoOverlay && (
          <GongsilRegisterPromoOverlay
            categoryName={CATEGORY_CONFIG[activeCategory]?.name || "공실"}
            onClose={() => setShowRegisterPromoOverlay(false)}
            onGoAuction={() => handleCategoryChange("auction")}
            currentUser={currentUser}
          />
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
              onClick={(e) => {
                e.stopPropagation();
                closeGalleryModal();
              }}
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
