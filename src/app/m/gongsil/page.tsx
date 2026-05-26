"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getVacancies, getVacancyDetail, getVacanciesForMap } from "@/app/actions/vacancy";
import { toggleVacancyBookmark, getVacancyBookmarks } from "@/app/actions/bookmark";
import { getPermissionLevel } from "@/utils/permissionCheck";
import { handleLocationPermissionDenied, handleLocationUnavailable } from "@/utils/locationPermission";
import AuthModal from "@/components/AuthModal";
import BookmarkCategoryModal from "@/components/BookmarkCategoryModal";
import MobileFilterBar from "./MobileFilterBar";
import { useVacancyFilters } from "./filters/useVacancyFilters";
import MobileTopBarHeader from "../_components/MobileTopBarHeader";
import { getAuctionInfo } from "@/app/(map)/gongsil/gongsilHelpers";
import { GongsilMobileDetailPanel } from "./GongsilMobileDetailPanel";
import { GongsilMobileDrawerList } from "./GongsilMobileDrawerList";

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc";

// 🌟 글로벌 금액 포맷터 (경공매/일반 전체 재사용)
export const formatAmount = (amt: number) => {
  if (!amt) return "";
  const m = Math.round(amt / 10000);
  if (m === 0) return "";

  const e = Math.floor(m / 10000);
  const r = m % 10000;

  let result = "";
  if (e > 0) result += `${e}억`;
  if (r > 0) {
    const c = Math.floor(r / 1000);
    const rem = r % 1000;
    let rest = "";
    if (c > 0) rest += `${c}천`;
    if (rem > 0) rest += `${rem}`;
    result += (result ? " " : "") + rest + "만";
  }
  return result || "";
};

// 옵션 아이콘 헬퍼
const OptionIcon = ({ name }: { name: string }) => {
  const sz = 24;
  const str = 1.8;
  switch (name) {
    case "에어컨": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="8" rx="2"/><path d="M7 14v4"/><path d="M17 14v4"/><path d="M12 14v4"/></svg>;
    case "침대": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>;
    case "도어락": case "전자도어락": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
    case "전자렌지": case "전자레인지": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="12" rx="2"/><path d="M17 10h.01"/><path d="M17 14h.01"/><path d="M7 12h5"/></svg>;
    case "비데": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z"/><path d="M7 12.5L10 15.5L17 8.5"/></svg>;
    case "TV": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>;
    case "옷장": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M12 2v20"/><path d="M8 12h.01"/><path d="M16 12h.01"/></svg>;
    case "세탁기": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="13" r="5"/><path d="M8 6h.01"/><path d="M10 6h.01"/></svg>;
    case "냉장고": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M5 10h14"/><path d="M9 14v2"/><path d="M9 5v2"/></svg>;
    case "가스레인지": case "인덕션": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 10h16"/><circle cx="8" cy="15" r="2"/><circle cx="16" cy="15" r="2"/></svg>;
    default: return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
  }
};

function formatPrice(v: any): string {
  const dep = v.deposit || 0;
  const rent = v.monthly_rent || 0;
  const trade = v.trade_type || "";

  if (trade === "경매") {
    return `${formatAmount(dep)}`;
  }
  if (trade === "월세" && rent > 0) {
    const monthlyManwon = Math.round(rent / 10000);
    return `${formatAmount(dep)}/${monthlyManwon}만`;
  }
  if (dep > 0) return `${formatAmount(dep)}`;
  return "-";
}

function MobileGongsilContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<any>(null);
  const clustererRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const detailPanelRef = useRef<HTMLDivElement>(null);

  const [selectedCluster, setSelectedCluster] = useState<any[] | null>(null);
  const [selectedVacancy, setSelectedVacancy] = useState<any | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // 🚀 위치 역지오코딩 & 상단 라벨 실시간 갱신용 React State
  const [locLabel, setLocLabel] = useState("위치");
  const geocoderRef = useRef<any>(null);
  
  // 🚀 초고속 Bbox 데이터 실시간 갱신용 React State
  const [mapBounds, setMapBounds] = useState<any>(null);
  const [isFetchingVacancies, setIsFetchingVacancies] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(7);
  const [activeMode, setActiveMode] = useState<"공실" | "경매">("공실");
  const [isAuctionMode, setIsAuctionMode] = useState(false);
  
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const shareDropdownRef = useRef<HTMLDivElement>(null);
  const detailScrollRef = useRef<HTMLDivElement>(null);
  
  const [showGalleryFullscreen, setShowGalleryFullscreen] = useState(false);

  // Gallery Fullscreen Modal History management for browser back button support
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (showGalleryFullscreen) {
        setShowGalleryFullscreen(false);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [showGalleryFullscreen]);

  const openGalleryFullscreen = () => {
    window.history.pushState({ modal: "gallery-m" }, "", "");
    setShowGalleryFullscreen(true);
  };

  const closeGalleryFullscreen = () => {
    if (window.history.state?.modal === "gallery-m") {
      window.history.back();
    } else {
      setShowGalleryFullscreen(false);
    }
  };

  const [detailTab, setDetailTab] = useState<"info" | "realtor">("info");
  const [activeDetailTab, setActiveDetailTab] = useState<"auction_detail" | "auction_property" | "auction_bid" | "auction_market">("auction_detail");
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [realtorFilter, setRealtorFilter] = useState("전체");

  // 권한 관련 State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userLevel, setUserLevel] = useState<number>(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // 권한 파생 값
  const showCommission = userLevel >= 2;

  // 필터 State 및 필터링 로직 (Hook으로 분리)
  const { filters, filteredVacancies, updateFilter, activeFilterCount, resetFilters, setFilters } = useVacancyFilters(vacancies);

  // 마지막 검색 조건 및 지도 상태 저장 헬퍼
  const saveLastSearchState = (currFilters: any, currMode: string, user: any) => {
    if (!user || !user.id) return;
    const storageKey = `last_gongsil_filters_${user.id}`;
    
    let centerLat = null;
    let centerLng = null;
    let mapZoom = null;
    
    if (kakaoMapRef.current) {
      const center = kakaoMapRef.current.getCenter();
      centerLat = center.getLat();
      centerLng = center.getLng();
      mapZoom = kakaoMapRef.current.getLevel();
    }
    
    const stateToSave = {
      filters: currFilters,
      activeMode: currMode,
      centerLat,
      centerLng,
      mapZoom
    };
    
    localStorage.setItem(storageKey, JSON.stringify(stateToSave));
  };

  // 필터 및 모드 변경 시 실시간 상태 저장
  useEffect(() => {
    if (currentUser && currentUser.id) {
      saveLastSearchState(filters, activeMode, currentUser);
    }
  }, [filters, activeMode, currentUser]);

  // 마지막 검색 조건 및 모드 복구
  useEffect(() => {
    if (currentUser && currentUser.id) {
      const storageKey = `last_gongsil_filters_${currentUser.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.filters) {
            setFilters(parsed.filters);
          }
          if (parsed.activeMode) {
            setActiveMode(parsed.activeMode);
          }
        } catch (e) {
          console.error("Failed to restore search filters:", e);
        }
      }
    }
  }, [currentUser]);

  // 지도 객체 로드 완료 시 마지막 위치 복구
  useEffect(() => {
    if (mapLoaded && kakaoMapRef.current && currentUser && currentUser.id) {
      const storageKey = `last_gongsil_filters_${currentUser.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const kakao = (window as any).kakao;
          if (kakao && parsed.centerLat && parsed.centerLng) {
            kakaoMapRef.current.setCenter(new kakao.maps.LatLng(parsed.centerLat, parsed.centerLng));
            if (parsed.mapZoom) {
              kakaoMapRef.current.setLevel(parsed.mapZoom);
            }
          }
        } catch (e) {
          console.error("Failed to restore map location:", e);
        }
      }
    }
  }, [mapLoaded, currentUser]);

  // 현재 지도 화면 내에 보이는 공실광고 개수 상태
  const [visibleCount, setVisibleCount] = useState(0);
  const [visibleVacancies, setVisibleVacancies] = useState<any[]>([]);

  // 일반 리스트 뷰 상태
  const [showListView, setShowListView] = useState(false);
  const [listViewMode, setListViewMode] = useState<"map" | "filter">("map");

  // Swipe gesture states
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndHandler = () => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe && selectedVacancy?.images) {
      setGalleryIndex(prev => Math.min(selectedVacancy.images.length - 1, prev + 1));
    }
    if (isRightSwipe && selectedVacancy?.images) {
      setGalleryIndex(prev => Math.max(0, prev - 1));
    }
  };

  const itemMapRef = useRef<HTMLDivElement>(null);
  const roadviewRef = useRef<HTMLDivElement>(null);
  const vacancyStackRef = useRef<any[]>([]);

  // 다이렉트 뷰 상태 (URL에 id가 있는 경우 지도를 가리고 상세 정보를 보여줌)
  const [isDirectView, setIsDirectView] = useState(searchParams.has("id"));
  const [isEmbedded, setIsEmbedded] = useState(searchParams.get("embed") === "true");
  const [isLocating, setIsLocating] = useState(false);

  // 사용자 권한 확인
  useEffect(() => {
    async function initUser() {
      const { createClient } = await import("@/utils/supabase/client");
      const client = createClient();
      const { data } = await client.auth.getUser();
      if (data?.user) {
        const { data: memberData } = await client.from('members').select('role, plan_type').eq('id', data.user.id).single();
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

  useEffect(() => {
    if (selectedVacancy && detailTab === "info") {
      const kakao = (window as any).kakao;
      if (!kakao || !kakao.maps) return;

      const pos = new kakao.maps.LatLng(selectedVacancy.lat, selectedVacancy.lng);
      
      const isAptType = (type: string) => ["아파트", "오피스텔", "도시형생활주택"].includes(type || "");
      const isPrivateAddr = selectedVacancy.address_exposure && selectedVacancy.address_exposure !== '번지공개';
      const isApt = isAptType(selectedVacancy.property_type) || isAptType(selectedVacancy.sub_category);
      const useCircle = isPrivateAddr && !isApt;
      
      setTimeout(() => {
        if (itemMapRef.current) {
          itemMapRef.current.innerHTML = "";
          const map = new kakao.maps.Map(itemMapRef.current, { center: pos, level: useCircle ? 5 : 3 });
          if (useCircle) {
            map.setMinLevel(5);
            map.setMaxLevel(8);
            new kakao.maps.Circle({
              center: pos, radius: 300, strokeWeight: 2, strokeColor: '#3b82f6', strokeOpacity: 0.6,
              strokeStyle: 'solid', fillColor: '#3b82f6', fillOpacity: 0.15, map: map
            });
          } else {
            new kakao.maps.Marker({ position: pos, map: map });
          }
        }

        if (roadviewRef.current) {
          roadviewRef.current.innerHTML = "";
          const rv = new kakao.maps.Roadview(roadviewRef.current);
          const rvClient = new kakao.maps.RoadviewClient();
          const agencyInfo = Array.isArray(selectedVacancy.members?.agencies) ? selectedVacancy.members.agencies[0] : selectedVacancy.members?.agencies;

          if (useCircle && agencyInfo?.lat && agencyInfo?.lng) {
            const agencyPos = new kakao.maps.LatLng(agencyInfo.lat, agencyInfo.lng);
            rvClient.getNearestPanoId(agencyPos, 50, (panoId: any) => {
              if (panoId) { rv.setPanoId(panoId, agencyPos); }
              else if (roadviewRef.current) { roadviewRef.current.innerHTML = '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#999; font-size:13px;">중개업소 위치의 로드뷰를 제공할 수 없습니다.</div>'; }
            });
          } else {
            rvClient.getNearestPanoId(pos, 50, (panoId: any) => {
              if (panoId) { rv.setPanoId(panoId, pos); }
              else if (roadviewRef.current) { roadviewRef.current.innerHTML = '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#999; font-size:13px;">해당 위치의 로드뷰를 제공할 수 없습니다.</div>'; }
            });
          }
        }
      }, 100);
    }
  }, [selectedVacancy, detailTab]);

  useEffect(() => {
    if (selectedVacancy && currentUser) {
      getVacancyBookmarks(currentUser.id).then(res => {
        if (res.success && res.bookmarkIds) {
          setIsBookmarked(res.bookmarkIds.includes(selectedVacancy.id));
        }
      });
    } else {
      setIsBookmarked(false);
    }
  }, [selectedVacancy, currentUser]);

  const toggleBookmark = async () => {
    if (!selectedVacancy) return;
    if (!currentUser) {
      alert("찜하려면 로그인이 필요합니다.");
      setIsAuthModalOpen(true);
      return;
    }
    
    const res = await toggleVacancyBookmark(currentUser.id, selectedVacancy.id);
    if (res.success) {
      setIsBookmarked(res.isBookmarked!);
      alert(res.isBookmarked ? "기본 폴더에 저장되었습니다." : "찜을 해제했습니다.");
      if (res.isBookmarked) {
        setShowCategoryModal(true);
      }
    } else {
      alert("처리 중 오류가 발생했습니다.");
    }
  };

  const handleKakaoShare = () => {
    if (!selectedVacancy) return;
    const Kakao = (window as any).Kakao;
    if (!Kakao || !Kakao.isInitialized()) {
      alert("카카오 SDK 로드 중입니다. 잠시 후 시도해 주세요.");
      return;
    }
    // 무조건 운영 서버 도메인으로 하드코딩
    const shareUrl = `https://gongsilnews.com/m/gongsil?id=${selectedVacancy.id}`;
    Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: selectedVacancy.building_name || [selectedVacancy.dong, selectedVacancy.sigungu].filter(Boolean).join(" ") || "공실광고 상세",
        description: `${selectedVacancy.trade_type} ${formatPrice(selectedVacancy)}`,
        imageUrl: selectedVacancy.images?.[0] || "https://gongsilnews.com/new_logo.png",
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [{ title: "공실광고 보기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
    });
    setShowShareDropdown(false);
  };

  const handleCopyUrl = () => {
    if (!selectedVacancy) return;
    // 무조건 운영 서버 도메인으로 하드코딩
    const shareUrl = `https://gongsilnews.com/m/gongsil?id=${selectedVacancy.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("URL이 복사되었습니다.");
    }).catch(() => {
      alert("URL 복사에 실패했습니다.");
    });
    setShowShareDropdown(false);
  };

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

  // 뒤로 가기(안드로이드 하드웨어 백버튼 등) 처리
  useEffect(() => {
    const handlePopState = (e: any) => {
      // 갤러리 풀스크린 모달이 닫히는 popstate인 경우, 상세패널 닫기 동작을 방지
      if (e?.state?.modal === "gallery-m" || window.history.state?.modal === "gallery-m") {
        return;
      }
      if (vacancyStackRef.current.length > 0) {
        const prev = vacancyStackRef.current.pop();
        if (prev && prev.vacancy) {
          setSelectedVacancy(prev.vacancy);
          setDetailTab("realtor");
          setTimeout(() => { if (detailScrollRef.current) detailScrollRef.current.scrollTo(0, prev.scrollY || 0); }, 50);
        } else {
          setSelectedVacancy(prev);
          setDetailTab("realtor");
          setTimeout(() => { if (detailScrollRef.current) detailScrollRef.current.scrollTo(0, 0); }, 50);
        }
      } else if (selectedVacancy) {
        if (isEmbedded) {
          window.parent.postMessage({ type: 'CLOSE_VACANCY_OVERLAY' }, '*');
          return;
        }
        vacancyStackRef.current = [];
        setSelectedVacancy(null);
        setIsDirectView(false);
        setTimeout(() => kakaoMapRef.current?.relayout(), 50);
      } else if (selectedCluster) {
        vacancyStackRef.current = [];
        setSelectedCluster(null);
      } else if (showListView) {
        setShowListView(false);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [selectedVacancy, selectedCluster, isEmbedded, showListView]);

  // 💡 [대표님 지침] Bbox(지도의 화면 영역) 변화에 따라 Supabase에서 실시간으로 범위 내 매물만 초고속 패치!
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

        // getVacanciesForMap Server Action을 활용한 0.1초 미만 초고속 지도 영역 쿼리 실행
        const res = await getVacanciesForMap({
          bbox: { swLat, swLng, neLat, neLng },
          is_auction: activeMode === "경매" // 🚀 경공매 모드일 때 경공매 매물만 초고속 쿼리!
        });

        if (res.success && res.data) {
          const withImages = res.data.map((v: any) => ({
            ...v,
            images: v.vacancy_photos
              ? [...v.vacancy_photos].sort((a: any, b: any) => a.sort_order - b.sort_order).map((p: any) => p.url)
              : [],
          }));
          setVacancies(withImages);

          // URL에 id 파라미터가 있는 경우의 다이렉트 디테일 조회 지원
          if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const idParam = params.get("id");
            if (idParam) {
              const target = withImages.find((item: any) => item.id === idParam);
              if (target) {
                setIsDirectView(true);
                handleVacancyClick(target, true);
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch mobile bbox vacancies:", err);
      } finally {
        setIsFetchingVacancies(false);
        setLoading(false);
      }
    };

    fetchBboxVacancies();
  }, [mapBounds, activeMode]);

  // 💡 최초 진입 시, 만약 URL에 id 파라미터가 있어서 다이렉트 뷰 모드인 경우 1회 강제 단일 상세 로드
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("id");
    if (!idParam) return;

    const loadSingleDirectVacancy = async () => {
      setLoading(true);
      const res = await getVacancyDetail(idParam);
      if (res.success && res.data) {
        setIsDirectView(true);
        const detail = {
          ...res.data,
          images: res.data.vacancy_photos
            ? [...res.data.vacancy_photos].sort((a: any, b: any) => a.sort_order - b.sort_order).map((p: any) => p.url)
            : [],
        };
        setSelectedVacancy(detail);
        setDetailTab("info");
      }
      setLoading(false);
    };
    loadSingleDirectVacancy();
  }, []);

  // 카카오 지도 초기화
  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current || kakaoMapRef.current) return;
      const kakao = (window as any).kakao;
      if (!kakao?.maps) return;

      let initialLat = 37.5665;
      let initialLng = 126.978;
      if (vacancies && vacancies.length > 0) {
        const firstValid = vacancies.find((v: any) => v.lat && v.lng);
        if (firstValid) {
          initialLat = firstValid.lat;
          initialLng = firstValid.lng;
        }
      }

      const map = new kakao.maps.Map(mapRef.current, {
        center: new kakao.maps.LatLng(initialLat, initialLng),
        level: 7,
      });

      kakao.maps.event.addListener(map, "click", () => {
        vacancyStackRef.current = [];
        setSelectedCluster(null);
        setSelectedVacancy(null);
      });

      // 🚀 지도가 생성되자마자 mapBounds와 zoomLevel을 즉각 셋팅하여 최초 1회 로드 프리징 해결!
      setZoomLevel(map.getLevel());
      setMapBounds(map.getBounds());

      // 🚀 위치 역지오코딩용 Geocoder 인스턴스 생성
      geocoderRef.current = new kakao.maps.services.Geocoder();

      kakaoMapRef.current = map;
      setMapLoaded(true);
    };

    if ((window as any).kakao?.maps?.LatLng) {
      initMap();
    } else {
      const scriptId = "kakao-map-script";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&libraries=services,clusterer&autoload=false`;
        script.onload = () => (window as any).kakao.maps.load(initMap);
        document.head.appendChild(script);
      } else {
        const timer = setInterval(() => {
          if ((window as any).kakao?.maps?.LatLng) { clearInterval(timer); initMap(); }
        }, 100);
      }
    }
  }, []);

  // 카카오 Share SDK 로드 (공유 기능용)
  useEffect(() => {
    const scriptId = "kakao-share-script";
    if (document.getElementById(scriptId)) return;
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
    script.onload = () => {
      const Kakao = (window as any).Kakao;
      if (Kakao && !Kakao.isInitialized()) {
        const kakaoJsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || KAKAO_APP_KEY;
        Kakao.init(kakaoJsKey);
      }
    };
    document.head.appendChild(script);
  }, []);

  // 마커 그리기
  useEffect(() => {
    if (!kakaoMapRef.current || !mapLoaded) return;
    const kakao = (window as any).kakao;
    const map = kakaoMapRef.current;
    const currentLevel = map.getLevel();

    // 🚀 모드 전환 시 기존 클러스터러 스타일 동적 갱신
    if (clustererRef.current) {
      clustererRef.current.clear();
      clustererRef.current.setStyles([
        { width: '56px', height: '56px', background: activeMode === "경매" ? "#1a4282" : '#1a73e8', color: '#fff', textAlign: 'center', lineHeight: '50px', borderRadius: '50%', fontWeight: 'bold', fontSize: '18px', border: '3px solid #ffffff', boxShadow: activeMode === "경매" ? '0 4px 12px rgba(26,66,130,0.35)' : '0 4px 12px rgba(0,0,0,0.25)' }
      ]);
    }
    markersRef.current.forEach((m: any) => m.setMap(null));
    markersRef.current = [];

    // [대표님 지침] 줌아웃 레벨 9 이상에서는 모바일 렌더링 부하를 막기 위해 마커 생성을 전면 생략!
    if (currentLevel >= 9) return;
    if (vacancies.length === 0) return;

    if (!clustererRef.current) {
      clustererRef.current = new kakao.maps.MarkerClusterer({
        map: map,
        averageCenter: true,
        minLevel: 4,
        gridSize: 60,
        disableClickZoom: true,
        calculator: [10, 30, 50],
        texts: (count: number) => count.toString(),
        styles: [
          { width: '56px', height: '56px', background: activeMode === "경매" ? "#1a4282" : '#1a73e8', color: '#fff', textAlign: 'center', lineHeight: '50px', borderRadius: '50%', fontWeight: 'bold', fontSize: '18px', border: '3px solid #ffffff', boxShadow: activeMode === "경매" ? '0 4px 12px rgba(26,66,130,0.35)' : '0 4px 12px rgba(0,0,0,0.25)' }
        ]
      });

      kakao.maps.event.addListener(clustererRef.current, 'clusterclick', (cluster: any) => {
        const mks = cluster.getMarkers();
        const items = mks.map((m: any) => m.customData);
        window.history.pushState({ panel: "cluster" }, "");
        setSelectedVacancy(null);
        setSelectedCluster(items);
      });
    }

    filteredVacancies.forEach((v) => {
      if (!v.lat || !v.lng) return;
      const size = 50;
      const color = activeMode === "경매" ? "#1a4282" : "#1a73e8";

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2-3}" fill="${color}" stroke="white" stroke-width="3"/>
        <text x="50%" y="50%" dy="1px" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="18" font-weight="bold" font-family="sans-serif">1</text>
      </svg>`;

      const img = new kakao.maps.MarkerImage(
        `data:image/svg+xml,${encodeURIComponent(svg)}`,
        new kakao.maps.Size(size, size),
        { offset: new kakao.maps.Point(size / 2, size / 2) }
      );
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(v.lat, v.lng),
        image: img,
      });
      marker.customData = v;

      kakao.maps.event.addListener(marker, "click", () => {
        window.history.pushState({ panel: "cluster" }, "");
        setSelectedVacancy(null);
        setSelectedCluster([v]);
      });
      markersRef.current.push(marker);
    });

    clustererRef.current.addMarkers(markersRef.current);
  }, [filteredVacancies, mapLoaded, zoomLevel, activeMode]);

  // 지도 범위 내 공실광고 개수 업데이트 및 지도 변화(이벤트) 연동
  useEffect(() => {
    if (!kakaoMapRef.current || !mapLoaded) return;
    const kakao = (window as any).kakao;
    const map = kakaoMapRef.current;

    const updateVisibleCount = () => {
      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const swLat = sw.getLat();
      const swLng = sw.getLng();
      const neLat = ne.getLat();
      const neLng = ne.getLng();

      // [대표님 지침] 카카오 LatLng 인스턴스 5,000개 동적 난사 렉을 완전히 박멸하고 단순 대소 비교 연산으로 60 FPS 달성!
      const visible = filteredVacancies.filter((v) => {
        if (!v.lat || !v.lng) return false;
        return v.lat >= swLat && v.lat <= neLat && v.lng >= swLng && v.lng <= neLng;
      });
      setVisibleVacancies(visible);
      setVisibleCount(visible.length);
    };

    // 🚀 지도의 bounds 및 zoomLevel 변화 시 부모 상태로 동기화
    const handleMapIdle = () => {
      const center = map.getCenter();
      setMapBounds(map.getBounds());
      setZoomLevel(map.getLevel());
      updateVisibleCount();

      // 🚀 [대표님 기획 지침] 지도 드래그 이동 시 중심점 주소를 획득하여 상단 📍 위치 탭 및 필터 행정구역 자동 동기화
      if (geocoderRef.current) {
        geocoderRef.current.coord2RegionCode(center.getLng(), center.getLat(), (result: any, status: any) => {
          if (status === (window as any).kakao.maps.services.Status.OK) {
            const region = result.find((r: any) => r.region_type === 'B') || result[0];
            if (region) {
              const sido = region.region_1depth_name; // 예: "서울특별시"
              const sigungu = region.region_2depth_name; // 예: "강남구"
              const dong = region.region_3depth_name; // 예: "논현동"
              
              const label = [sigungu, dong].filter(Boolean).join(" ");
              setLocLabel(label || "위치");

              // 지도 위치 이동에 맞춰 필터 상태의 행정구역도 완벽 동기화!
              updateFilter({
                sido: sido || null,
                sigungu: sigungu || null,
                dong: dong || null
              });

              if (currentUser && currentUser.id) {
                const nextFilters = {
                  ...filters,
                  sido: sido || null,
                  sigungu: sigungu || null,
                  dong: dong || null
                };
                saveLastSearchState(nextFilters, activeMode, currentUser);
              }
            }
          }
        });
      }

      if (currentUser && currentUser.id) {
        saveLastSearchState(filters, activeMode, currentUser);
      }
    };

    // 초기 계산
    updateVisibleCount();

    // 지도의 이동/확대축소가 끝났을 때 업데이트 등록
    kakao.maps.event.addListener(map, "idle", handleMapIdle);

    return () => {
      kakao.maps.event.removeListener(map, "idle", handleMapIdle);
    };
  }, [filteredVacancies, mapLoaded]);

  // 상세 조회
  const handleVacancyClick = async (v: any, isDirect: boolean = false) => {
    if (!isDirect) {
      window.history.pushState({ panel: "detail", t: Date.now() }, "");
    }
    if (detailScrollRef.current) {
      detailScrollRef.current.scrollTop = 0;
    }
    setDetailLoading(true);
    setSelectedVacancy(v); // 먼저 기본 정보 표시
    setDetailTab("info");
    const res = await getVacancyDetail(v.id);
    if (res.success && res.data) {
      const detail = {
        ...v,
        ...res.data,
        images: res.data.vacancy_photos
          ? [...res.data.vacancy_photos].sort((a: any, b: any) => a.sort_order - b.sort_order).map((p: any) => p.url)
          : v.images || [],
      };
      setSelectedVacancy(detail);
    }
    setDetailLoading(false);
  };

  const goBack = () => {
    if (vacancyStackRef.current.length > 0) {
      window.history.back();
      return;
    }
    if (isEmbedded) {
      if (detailPanelRef.current) detailPanelRef.current.classList.add("slide-out");
      setTimeout(() => window.parent.postMessage({ type: 'CLOSE_VACANCY_OVERLAY' }, '*'), 350);
      return;
    }
    if (isDirectView) {
      if (detailPanelRef.current) detailPanelRef.current.classList.add("slide-out");
      setTimeout(() => {
        if (window.opener) window.close();
        else window.history.back();
      }, 350);
      return;
    }
    if (selectedVacancy) { window.history.back(); return; }
    if (selectedCluster) { window.history.back(); return; }
    if (showListView) { setShowListView(false); return; }
  };

  return (
    <div style={{ width: "100%", backgroundColor: isEmbedded ? "transparent" : "#F4F6F8", height: "calc(100vh - 60px)", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      {currentUser && showCategoryModal && selectedVacancy && (
        <BookmarkCategoryModal
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          userId={currentUser.id}
          itemId={selectedVacancy.id}
          type="VACANCY"
          onSuccess={() => alert("폴더 이동이 완료되었습니다.")}
        />
      )}
      {!isEmbedded && (
        <MobileTopBarHeader />
      )}
      
      <style>{`
        ${isEmbedded ? `
          main { background: transparent !important; }
          div[style*="padding-bottom: 60px"] { padding-bottom: 0 !important; background: transparent !important; }
          nav { display: none !important; }
          body { background: transparent !important; }
          html { background: transparent !important; }
        ` : ''}
        .no-scrollbar::-webkit-scrollbar{display:none;}
        .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none;}
        .list-panel{position:fixed;top:0;left:50%;width:100%;max-width:448px;margin-left:-224px;height:100dvh;background:#fff;z-index:9998;transform:translateX(100vw);transition:transform 0.35s cubic-bezier(0.25,1,0.5,1);overflow-y:hidden;display:flex;flex-direction:column;}
        @media (max-width: 448px) { .list-panel { margin-left: -50vw; } }
        .list-panel.open{transform:translateX(0);}
        .detail-panel{position:fixed;top:0;left:50%;width:100%;max-width:448px;margin-left:-224px;height:100dvh;background:#fff;z-index:9999;transform:translateX(100vw);transition:transform 0.35s cubic-bezier(0.25,1,0.5,1);overflow-y:auto;}
        @media (max-width: 448px) { .detail-panel { margin-left: -50vw; } }
        .detail-panel.open{transform:translateX(0);}
        .detail-panel.direct-view{transform:translateX(0); ${isEmbedded ? '' : 'animation: slideInRight 0.35s cubic-bezier(0.25,1,0.5,1) forwards;'}}
        .detail-panel.slide-out{transform:translateX(100vw) !important; transition: transform 0.35s cubic-bezier(0.25,1,0.5,1) !important;}
        @keyframes slideInRight { from { transform: translateX(100vw); } to { transform: translateX(0); } }
        .skeleton{background:linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:6px;}
        @keyframes shimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}
        .v-card:active{background:#f9fafb;}
        @keyframes pulseGlow {
          0% { transform: translate(-50%, -50%) scale(0.96); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2); }
          50% { transform: translate(-50%, -50%) scale(1.02); box-shadow: 0 15px 35px rgba(96, 165, 250, 0.25); }
          100% { transform: translate(-50%, -50%) scale(0.96); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingTop: isEmbedded ? "0" : "56px" }}>
        {!isEmbedded && (
          <div style={{ height: "0px", backgroundColor: "#F4F6F8", width: "100%", flexShrink: 0 }} />
        )}

        {/* 🚀 [대표님 승인안] 실시간 공실 vs 법원 경공매 듀얼 알약 세그먼트 스위치 */}
        {!isEmbedded && !isDirectView && (
          <div style={{ padding: "8px 16px", backgroundColor: "#fff", display: "flex", justifyContent: "center", borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ display: "flex", width: "100%", background: "#f1f5f9", borderRadius: "12px", padding: "4px" }}>
              <button
                onClick={() => {
                  setActiveMode("공실");
                  setIsAuctionMode(false);
                  setVacancies([]);
                  setSelectedVacancy(null);
                  setSelectedCluster(null);
                  // 🚀 [대표님 지침] 공실 전환 시 필터 리셋 및 전체유형 기본 선택
                  updateFilter({
                    propertyTypes: [
                      "아파트", "빌라/연립", "오피스텔", "원룸", "투룸", "단독/다가구",
                      "전원주택", "상가주택", "재건축", "재개발",
                      "상가", "사무실", "토지", "건물", "공장/창고", "지식산업센터"
                    ]
                  });
                }}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "14px",
                  fontWeight: 800,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  backgroundColor: activeMode === "공실" ? "#1a73e8" : "transparent",
                  color: activeMode === "공실" ? "#ffffff" : "#64748b",
                  boxShadow: activeMode === "공실" ? "0 4px 12px rgba(26,115,232,0.25)" : "none"
                }}
              >
                ● 실시간 공실
              </button>
              <button
                onClick={() => {
                  setActiveMode("경매");
                  setIsAuctionMode(true);
                  setVacancies([]);
                  setSelectedVacancy(null);
                  setSelectedCluster(null);
                  // 🚀 [대표님 지침] 경매 전환 시 필터 리셋 및 전체유형 기본 선택
                  updateFilter({
                    propertyTypes: [
                      "아파트", "단독/다가구", "빌라/주택", "상가/점포", "사무실/지산", "빌딩/근생", "공장/창고", "토지"
                    ]
                  });
                }}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "14px",
                  fontWeight: 800,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  backgroundColor: activeMode === "경매" ? "#1a4282" : "transparent",
                  color: activeMode === "경매" ? "#ffffff" : "#64748b",
                  boxShadow: activeMode === "경매" ? "0 4px 12px rgba(26,66,130,0.25)" : "none"
                }}
              >
                🔨 법원 경·공매
              </button>
            </div>
          </div>
        )}

        {/* 필터 바 */}
        {!isEmbedded && !isDirectView && (
          <MobileFilterBar
            vacancies={vacancies}
            filteredCount={filteredVacancies.length}
            filters={filters}
            onFilterChange={updateFilter}
            onLocationMove={(lat, lng, zoom) => {
              const kakao = (window as any).kakao;
              if (kakaoMapRef.current && kakao) {
                kakaoMapRef.current.panTo(new kakao.maps.LatLng(lat, lng));
                kakaoMapRef.current.setLevel(zoom);
              }
            }}
            onShowList={(mode) => {
              setListViewMode(mode || "filter");
              window.history.pushState({ panel: "list" }, "");
              setShowListView(true);
            }}
            kakaoMapRef={kakaoMapRef}
            locLabel={locLabel}
            setLocLabel={setLocLabel}
            activeMode={activeMode}
          />
        )}

        {/* 지도 및 오버레이 컨테이너 */}
        <div style={{ position: "relative", flex: 1, display: isDirectView ? "none" : "flex", flexDirection: "column", backgroundColor: "#fff" }}>
          {/* 카카오 지도 */}
          <div ref={mapRef} style={{ width: "100%", flex: 1 }} />

          {/* [대표님 지침] 모바일 줌인(Zoom In) 안내 오버레이 (정중앙 펄스 효과) */}
          {mapLoaded && zoomLevel >= 9 && (
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 100,
              pointerEvents: "none",
              animation: "pulseGlow 2.5s infinite ease-in-out"
            }}>
              <div style={{
                background: "rgba(15, 23, 42, 0.92)",
                backdropFilter: "blur(12px)",
                borderRadius: "28px",
                padding: "12px 24px",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                whiteSpace: "nowrap"
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 4px rgba(96,165,250,0.5))" }}>
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="11" y1="8" x2="11" y2="14" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
                <span style={{
                  color: "#f8fafc",
                  fontSize: "14px",
                  fontWeight: 800,
                  fontFamily: "'Pretendard', sans-serif",
                  letterSpacing: "-0.3px"
                }}>
                  지도를 조금만 더 확대해 주세요
                </span>
              </div>
            </div>
          )}

          {/* [대표님 지침] 실시간 Supabase API 갱신 Pearl Loader 스피너 */}
          {isFetchingVacancies && (
            <div style={{
              position: "absolute",
              top: "30px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 100,
              pointerEvents: "none"
            }}>
              <div style={{
                background: "rgba(255, 255, 255, 0.85)",
                backdropFilter: "blur(8px)",
                borderRadius: "20px",
                padding: "8px 12px",
                boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                border: "1px solid rgba(255, 255, 255, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="3" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" stroke="rgba(26,115,232,0.15)" strokeWidth="3" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
              </div>
            </div>
          )}

        {/* 지도 로딩 중 */}
        {!mapLoaded && (
          <div style={{ position: "absolute", inset: 0, background: "#e8ecf0", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🗺️</div>
              <p style={{ color: "#6b7280", fontSize: "14px" }}>지도를 불러오는 중...</p>
            </div>
          </div>
        )}

        {/* 초기화 버튼 (좌측 상단 컴팩트하게) */}
        {mapLoaded && (
          <div style={{ position: "absolute", top: "16px", left: "16px", zIndex: 20 }}>
            <button 
              onClick={resetFilters}
              style={{ background: "rgba(255,255,255,0.9)", borderRadius: "20px", padding: "8px 14px", border: "1px solid #ddd", fontSize: "13px", fontWeight: 700, color: "#1a73e8", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
            >
              <span style={{ fontSize: "15px", lineHeight: 1 }}>↻</span>
              초기화
            </button>
          </div>
        )}

        {/* 🏢 하단 버튼 영역: 지도 위 공실 + 공실등록 나란히 (activeMode 연동 오렌지/블루 동적 테마 스위칭) */}
        {mapLoaded && zoomLevel < 9 && (
          <div style={{ position: "fixed", bottom: "calc(76px + env(safe-area-inset-bottom))", left: "50%", transform: "translateX(-50%)", zIndex: 20, display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setListViewMode("map");
                window.history.pushState({ panel: "list" }, "");
                setShowListView(true);
              }}
              style={{
                background: activeMode === "경매" ? "linear-gradient(135deg, #1a4282, #0f172a)" : "linear-gradient(135deg, #1a73e8, #3b82f6)",
                borderRadius: "28px",
                padding: "14px 24px",
                fontSize: "15px",
                fontWeight: 800,
                color: "#ffffff",
                boxShadow: activeMode === "경매" ? "0 6px 20px rgba(26, 66, 130, 0.4)" : "0 6px 20px rgba(26, 115, 232, 0.4)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                whiteSpace: "nowrap",
                transition: "all 0.25s cubic-bezier(0.25, 1, 0.5, 1), transform 0.1s ease"
              }}
              onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.95)"; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
              onTouchStart={(e) => { e.currentTarget.style.transform = "scale(0.95)"; }}
              onTouchEnd={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              {activeMode === "경매" ? (
                // 🔨 경공매 전용 법률 낙찰 망치 SVG 아이콘
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="m14 13-5 5m6-6-2.5 2.5m6.5-6.5a2.5 2.5 0 0 0-3.5-3.5L8.5 8 5.7 5.2a1 1 0 0 0-1.4 0L2.8 6.6a1 1 0 0 0 0 1.4L5.6 10.8l-4.2 4.2a1 1 0 0 0 0 1.4l1.4 1.4a1 1 0 0 0 1.4 0l4.2-4.2 2.8 2.8a1 1 0 0 0 1.4 0l1.4-1.4a1 1 0 0 0 0-1.4L11.2 12l6.8-6.8a2.5 2.5 0 0 0 3.5 3.5Z" />
                </svg>
              ) : (
                // 🏢 일반 공실 빌딩 SVG 아이콘
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                  <line x1="9" y1="22" x2="9" y2="16" />
                  <line x1="15" y1="22" x2="15" y2="16" />
                  <line x1="9" y1="16" x2="15" y2="16" />
                  <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z" />
                </svg>
              )}
              {activeMode === "경매" ? `경공매 물건 ${visibleCount}건` : `검색된 공실 ${visibleCount}개`}
            </button>
            {activeMode !== "경매" && (
              <button
                onClick={() => {
                  if (!currentUser) {
                    alert("공실을 등록하려면 로그인이 필요합니다.");
                    setIsAuthModalOpen(true);
                  } else {
                    router.push("/m/admin/vacancy/write");
                  }
                }}
                style={{
                  borderRadius: "28px",
                  background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                  color: "#fff",
                  border: "none",
                  boxShadow: "0 6px 20px rgba(29, 78, 216, 0.4)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "14px 20px",
                  gap: "4px",
                  whiteSpace: "nowrap",
                  transition: "all 0.25s cubic-bezier(0.25, 1, 0.5, 1), transform 0.15s ease",
                }}
                onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.92)"; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                onTouchStart={(e) => { e.currentTarget.style.transform = "scale(0.92)"; }}
                onTouchEnd={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
              >
                <span style={{ fontSize: "20px", fontWeight: 300, lineHeight: 1 }}>+</span>
                <span style={{ fontSize: "15px", fontWeight: 800 }}>
                  공실등록
                </span>
              </button>
            )}
          </div>
        )}

        {/* 내 위치 버튼 */}
        {mapLoaded && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (navigator.geolocation && kakaoMapRef.current) {
                setIsLocating(true);
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    const kakao = (window as any).kakao;
                    kakaoMapRef.current.panTo(new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude));
                    kakaoMapRef.current.setLevel(5);
                    setIsLocating(false);
                  },
                  (err) => {
                    console.error("Geolocation error:", err);
                    setIsLocating(false);
                    handleLocationPermissionDenied();
                  },
                  { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
                );
              } else {
                handleLocationUnavailable();
              }
            }}
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              zIndex: 20,
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "8px 12px",
              fontSize: "13px",
              fontWeight: 700,
              color: "#333",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
            }}
          >
            {isLocating ? (
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
            )}
            내 위치
          </button>
        )}

        {/* 위치 검색 로딩 오버레이 */}
        {isLocating && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
            <style>{`
              @keyframes pulseRing {
                0% { transform: scale(0.8); opacity: 0.5; }
                100% { transform: scale(1.5); opacity: 0; }
              }
            `}</style>
            <div style={{ position: "relative", width: "60px", height: "60px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
              <div style={{ position: "absolute", width: "100%", height: "100%", borderRadius: "50%", background: "#4b89ff", animation: "pulseRing 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite" }} />
              <div style={{ position: "relative", width: "32px", height: "32px", borderRadius: "50%", background: "#1a4282", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
              </div>
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#1a2e50", marginBottom: "8px" }}>현재 위치를 찾고 있습니다</h3>
            <p style={{ fontSize: "14px", color: "#6b7280", textAlign: "center", lineHeight: 1.5 }}>
              GPS 상태에 따라<br/>수 초 정도 소요될 수 있습니다.
            </p>
          </div>
        )}
      </div>
    </div>

      {/* 상세 패널 */}
      <div ref={detailPanelRef} className={`detail-panel ${selectedVacancy ? "open" : ""} ${isDirectView ? "direct-view" : ""}`} onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* 상단 헤더 */}
        <div style={{ zIndex: 10, background: "#fff", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", position: "sticky", top: 0 }}>
          <button onClick={goBack} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", marginLeft: "-4px" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#111827", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selectedVacancy?.building_name || [selectedVacancy?.dong, selectedVacancy?.sigungu].filter(Boolean).join(" ") || "공실광고 상세"}
          </h2>
          {/* Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {/* 찜하기 */}
            <button onClick={toggleBookmark} style={{ background: "none", border: "none", cursor: "pointer", padding: "0", display: "flex", alignItems: "center", color: isBookmarked ? "#1a73e8" : "#6b7280" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>
            {/* 공유(전달) */}
            <div style={{ position: "relative" }} ref={shareDropdownRef}>
              <button onClick={() => setShowShareDropdown(!showShareDropdown)} style={{ background: "none", border: "none", cursor: "pointer", padding: "0", display: "flex", alignItems: "center", color: showShareDropdown ? "#1a73e8" : "#6b7280" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line>
                </svg>
              </button>
              {showShareDropdown && (
                <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "8px", background: "#fff", border: "1px solid #e0e0e0", borderRadius: "10px", boxShadow: "0 6px 24px rgba(0,0,0,0.15)", width: "200px", zIndex: 9999, overflow: "hidden" }}>
                  <button onClick={handleKakaoShare} style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", background: "none", border: "none", borderBottom: "1px solid #f0f0f0", cursor: "pointer", fontSize: "14px", color: "#333", fontWeight: 600 }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#FEE500", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#3C1E1E"><path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.8 5.2 4.4 6.5l-1 3.7c-.1.3.3.6.5.4l4.3-2.9c.6.1 1.2.1 1.8.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z"></path></svg>
                    </div>
                    카카오톡 공유
                  </button>
                  <button onClick={handleCopyUrl} style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "#333", fontWeight: 600 }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                    </div>
                    URL 복사
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedVacancy && (
          <GongsilMobileDetailPanel
            selectedVacancy={selectedVacancy}
            isDirectView={isDirectView}
            goBack={goBack}
            isBookmarked={isBookmarked}
            toggleBookmark={toggleBookmark}
            showShareDropdown={showShareDropdown}
            setShowShareDropdown={setShowShareDropdown}
            shareDropdownRef={shareDropdownRef}
            handleKakaoShare={handleKakaoShare}
            handleCopyUrl={handleCopyUrl}
            detailScrollRef={detailScrollRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEndHandler={onTouchEndHandler}
            galleryIndex={galleryIndex}
            setGalleryIndex={setGalleryIndex}
            openGalleryFullscreen={openGalleryFullscreen}
            currentUser={currentUser}
            userLevel={userLevel}
            setIsAuthModalOpen={setIsAuthModalOpen}
            activeMode={activeMode}
            detailTab={detailTab}
            setDetailTab={setDetailTab}
            activeDetailTab={activeDetailTab}
            setActiveDetailTab={setActiveDetailTab}
            itemMapRef={itemMapRef}
            roadviewRef={roadviewRef}
            realtorFilter={realtorFilter}
            setRealtorFilter={setRealtorFilter}
            vacancies={vacancies}
            vacancyStackRef={vacancyStackRef}
            handleVacancyClick={handleVacancyClick}
            formatPrice={formatPrice}
            showCommission={showCommission}
          />
        )}
      </div>

      <GongsilMobileDrawerList
        selectedCluster={selectedCluster}
        showListView={showListView}
        goBack={goBack}
        activeMode={activeMode}
        listViewMode={listViewMode}
        visibleVacancies={visibleVacancies}
        filteredVacancies={filteredVacancies}
        currentUser={currentUser}
        userLevel={userLevel}
        showCommission={showCommission}
        setIsAuthModalOpen={setIsAuthModalOpen}
        handleVacancyClick={handleVacancyClick}
        formatPrice={formatPrice}
      />


      {/* 갤러리 풀스크린 모달 */}
      {showGalleryFullscreen && selectedVacancy?.images && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#000", zIndex: 10000, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff" }}>
            <div style={{ fontSize: "15px", fontWeight: 600 }}>{galleryIndex + 1} / {selectedVacancy.images.length}</div>
            <button onClick={() => closeGalleryFullscreen()} style={{ background: "none", border: "none", color: "#fff", fontSize: "24px", cursor: "pointer", padding: "4px" }}>✕</button>
          </div>
          <div 
            style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEndHandler}
          >
            <img 
              src={selectedVacancy.images[galleryIndex]} 
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} 
              alt="갤러리 확대" 
            />
            {selectedVacancy.images.length > 1 && (
              <>
                <button onClick={() => setGalleryIndex(Math.max(0, galleryIndex - 1))} style={{ position: "absolute", top: "50%", left: 0, transform: "translateY(-50%)", background: "none", color: "#fff", border: "none", fontSize: "36px", padding: "20px", cursor: "pointer" }}>〈</button>
                <button onClick={() => setGalleryIndex(Math.min(selectedVacancy.images.length - 1, galleryIndex + 1))} style={{ position: "absolute", top: "50%", right: 0, transform: "translateY(-50%)", background: "none", color: "#fff", border: "none", fontSize: "36px", padding: "20px", cursor: "pointer" }}>〉</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 권한 인증 모달 */}
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialTab="login"
        />
      )}

    </div>
  );
}

export default function MobileGongsilPage() {
  return (
    <Suspense fallback={null}>
      <MobileGongsilContent />
    </Suspense>
  );
}
