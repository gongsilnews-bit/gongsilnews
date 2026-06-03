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
import { getAuctionInfo, getJitteredCoords, getMaskedAddress, getCleanAddrText } from "@/app/(map)/gongsil/gongsilHelpers";
import { GongsilMobileDetailPanel } from "./GongsilMobileDetailPanel";
import { GongsilMobileDrawerList } from "./GongsilMobileDrawerList";

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc";

// ?ŒŸ ê¸€ë¡œë²Œ ê¸ˆì•¡ ?¬ë§·??(ê²½ê³µë§??¼ë°˜ ?„ì²´ ?¬ì‚¬??
export const formatAmount = (amt: number) => {
  if (!amt) return "";
  const m = Math.round(amt / 10000);
  if (m === 0) return "";

  const e = Math.floor(m / 10000);
  const r = m % 10000;

  let result = "";
  if (e > 0) result += `${e}??;
  if (r > 0) {
    const c = Math.floor(r / 1000);
    const rem = r % 1000;
    let rest = "";
    if (c > 0) rest += `${c}ì²?;
    if (rem > 0) rest += `${rem}`;
    result += (result ? " " : "") + rest + "ë§?;
  }
  return result || "";
};

// ?µì…˜ ?„ì´ì½??¬í¼
const OptionIcon = ({ name }: { name: string }) => {
  const sz = 24;
  const str = 1.8;
  switch (name) {
    case "?ì–´ì»?: return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="8" rx="2"/><path d="M7 14v4"/><path d="M17 14v4"/><path d="M12 14v4"/></svg>;
    case "ì¹¨ë?": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>;
    case "?„ì–´??: case "?„ì?„ì–´??: return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
    case "?„ì?Œì?": case "?„ì?ˆì¸ì§€": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="12" rx="2"/><path d="M17 10h.01"/><path d="M17 14h.01"/><path d="M7 12h5"/></svg>;
    case "ë¹„ë°": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z"/><path d="M7 12.5L10 15.5L17 8.5"/></svg>;
    case "TV": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>;
    case "?·ì¥": return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M12 2v20"/><path d="M8 12h.01"/><path d="M16 12h.01"/></svg>;
    case "?¸íƒê¸?: return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="13" r="5"/><path d="M8 6h.01"/><path d="M10 6h.01"/></svg>;
    case "?‰ì¥ê³?: return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M5 10h14"/><path d="M9 14v2"/><path d="M9 5v2"/></svg>;
    case "ê°€?¤ë ˆ?¸ì?": case "?¸ë•??: return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 10h16"/><circle cx="8" cy="15" r="2"/><circle cx="16" cy="15" r="2"/></svg>;
    default: return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={str} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
  }
};

function formatPrice(v: any): string {
  const dep = v.deposit || 0;
  const rent = v.monthly_rent || 0;
  const trade = v.trade_type || "";

  if (trade === "ê²½ë§¤") {
    const meta = v.metadata || {};
    const appraisalPrice = meta.appraisal_price || parseInt(meta.apslEvlAmt || "0", 10) || (dep && dep > 100000 ? dep : dep * 10000);
    const lowestBidPrice = meta.lowest_bid_price || parseInt(meta.lowstBidPrcIndctCont || "0", 10) || 0;
    const displayPrice = lowestBidPrice > 0 ? lowestBidPrice : appraisalPrice;
    return `${formatAmount(displayPrice)}`;
  }
  if (trade === "?”ì„¸" && rent > 0) {
    const monthlyManwon = Math.round(rent / 10000);
    return `${formatAmount(dep)}/${monthlyManwon}ë§?;
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
  
  // ?? ?„ì¹˜ ????¤ì½”??& ?ë‹¨ ?¼ë²¨ ?¤ì‹œê°?ê°±ì‹ ??React State
  const [locLabel, setLocLabel] = useState("?„ì¹˜");
  const geocoderRef = useRef<any>(null);
  
  // ?? ì´ˆê³ ??Bbox ?°ì´???¤ì‹œê°?ê°±ì‹ ??React State
  const [mapBounds, setMapBounds] = useState<any>(null);
  const [isFetchingVacancies, setIsFetchingVacancies] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(7);
  const [activeMode, setActiveMode] = useState<"ê³µì‹¤" | "ê²½ë§¤">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("mode") === "auction") return "ê²½ë§¤";
    }
    return "ê³µì‹¤";
  });
  const [isAuctionMode, setIsAuctionMode] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("mode") === "auction";
    }
    return false;
  });
  
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
  const [realtorFilter, setRealtorFilter] = useState("?„ì²´");

  // ê¶Œí•œ ê´€??State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userLevel, setUserLevel] = useState<number>(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // ê¶Œí•œ ?Œìƒ ê°?
  const showCommission = userLevel >= 2;

  // ?„í„° State ë°??„í„°ë§?ë¡œì§ (Hook?¼ë¡œ ë¶„ë¦¬)
  const { filters, filteredVacancies, updateFilter, activeFilterCount, resetFilters, setFilters } = useVacancyFilters(vacancies);

  // ë§ˆì?ë§?ê²€??ì¡°ê±´ ë°?ì§€???íƒœ ?€???¬í¼
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

  // ?„í„° ë°?ëª¨ë“œ ë³€ê²????¤ì‹œê°??íƒœ ?€??
  useEffect(() => {
    if (currentUser && currentUser.id) {
      saveLastSearchState(filters, activeMode, currentUser);
    }
  }, [filters, activeMode, currentUser]);

  // ë§ˆì?ë§?ê²€??ì¡°ê±´ ë°?ëª¨ë“œ ë³µêµ¬
  useEffect(() => {
    // URL??modeê°€ ëª…ì‹œ??ê²½ìš° ë¡œì»¬?¤í† ë¦¬ì?ë¥??µí•œ ë³µêµ¬ë¥??°íšŒ?˜ê³  ê°•ì œë¡??ìš©
    const modeParam = searchParams.get("mode");
    if (modeParam === "auction") {
      setActiveMode("ê²½ë§¤");
      setIsAuctionMode(true);
      return;
    }

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
            setIsAuctionMode(parsed.activeMode === "ê²½ë§¤");
          }
        } catch (e) {
          console.error("Failed to restore search filters:", e);
        }
      }
    }
  }, [currentUser, searchParams]);

  // ì§€??ê°ì²´ ë¡œë“œ ?„ë£Œ ??ë§ˆì?ë§??„ì¹˜ ë³µêµ¬
  useEffect(() => {
    if (!mapLoaded || !kakaoMapRef.current) return;

    // URL??ì¢Œí‘œê°€ ëª…ì‹œ??ê²½ìš° ë¡œì»¬?¤í† ë¦¬ì? ë³µêµ¬ë¥??°íšŒ?˜ê³  ?´ë‹¹ ì¢Œí‘œë¥?ìµœìš°???ìš©
    const urlLat = searchParams.get("lat");
    const urlLng = searchParams.get("lng");
    const urlLevel = searchParams.get("level");

    if (urlLat && urlLng) {
      const kakao = (window as any).kakao;
      if (kakao) {
        const latVal = parseFloat(urlLat);
        const lngVal = parseFloat(urlLng);
        kakaoMapRef.current.setCenter(new kakao.maps.LatLng(latVal, lngVal));
        if (urlLevel) {
          kakaoMapRef.current.setLevel(parseInt(urlLevel, 10));
        }
        setMapBounds(kakaoMapRef.current.getBounds());
        setZoomLevel(kakaoMapRef.current.getLevel());
      }
      return;
    }

    if (currentUser && currentUser.id) {
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
  }, [mapLoaded, currentUser, searchParams]);

  // ?„ì¬ ì§€???”ë©´ ?´ì— ë³´ì´??ê³µì‹¤ê´‘ê³  ê°œìˆ˜ ?íƒœ
  const [visibleCount, setVisibleCount] = useState(0);
  const [visibleVacancies, setVisibleVacancies] = useState<any[]>([]);

  // ?¼ë°˜ ë¦¬ìŠ¤??ë·??íƒœ
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

  // ?¤ì´?‰íŠ¸ ë·??íƒœ (URL??idê°€ ?ˆëŠ” ê²½ìš° ì§€?„ë? ê°€ë¦¬ê³  ?ì„¸ ?•ë³´ë¥?ë³´ì—¬ì¤?
  const [isDirectView, setIsDirectView] = useState(searchParams.has("id"));
  const [isEmbedded, setIsEmbedded] = useState(searchParams.get("embed") === "true");
  const [isLocating, setIsLocating] = useState(false);

  // ?¬ìš©??ê¶Œí•œ ?•ì¸
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

      const coords = getJitteredCoords(selectedVacancy, true);
      const pos = new kakao.maps.LatLng(coords.lat, coords.lng);
      
      const exp = selectedVacancy.address_exposure;
      const propType = selectedVacancy.property_type || "";
      const subCategory = selectedVacancy.sub_category || "";
      const isApt = ["?„íŒŒ??, "?¤í”¼?¤í…”", "?„ì‹œ?•ìƒ?œì£¼??].some(t => propType.includes(t) || subCategory.includes(t));
      const isPrivateAddr = exp && exp !== "ë²ˆì?ê³µê°œ" && exp !== "ì§€ë²ˆê³µê°? && exp !== "???¸ìˆ˜ê³µê°œ";
      const useCircle = isPrivateAddr && !isApt;
      
      setTimeout(() => {
        if (itemMapRef.current) {
          itemMapRef.current.innerHTML = "";
          const map = new kakao.maps.Map(itemMapRef.current, { center: pos, level: useCircle ? 5 : 3 });
          if (useCircle) {
            map.setMinLevel(5);
            map.setMaxLevel(8);
            new kakao.maps.Circle({
              center: pos, radius: 500, strokeWeight: 2, strokeColor: '#3b82f6', strokeOpacity: 0.6,
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

          rvClient.getNearestPanoId(pos, 50, (panoId: any) => {
            if (panoId) { rv.setPanoId(panoId, pos); }
            else if (roadviewRef.current) { roadviewRef.current.innerHTML = '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#999; font-size:13px;">?´ë‹¹ ?„ì¹˜ ê·¼ì²˜??ë¡œë“œë·°ë? ?œê³µ?????†ìŠµ?ˆë‹¤.</div>'; }
          });
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
      alert("ì°œí•˜?¤ë©´ ë¡œê·¸?¸ì´ ?„ìš”?©ë‹ˆ??");
      setIsAuthModalOpen(true);
      return;
    }
    
    const res = await toggleVacancyBookmark(currentUser.id, selectedVacancy.id);
    if (res.success) {
      setIsBookmarked(res.isBookmarked!);
      alert(res.isBookmarked ? "ê¸°ë³¸ ?´ë”???€?¥ë˜?ˆìŠµ?ˆë‹¤." : "ì°œì„ ?´ì œ?ˆìŠµ?ˆë‹¤.");
      if (res.isBookmarked) {
        setShowCategoryModal(true);
      }
    } else {
      alert("ì²˜ë¦¬ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.");
    }
  };

  const handleKakaoShare = () => {
    if (!selectedVacancy) return;
    const Kakao = (window as any).Kakao;
    if (!Kakao || !Kakao.isInitialized()) {
      alert("ì¹´ì¹´??SDK ë¡œë“œ ì¤‘ì…?ˆë‹¤. ? ì‹œ ???œë„??ì£¼ì„¸??");
      return;
    }
    // ë¬´ì¡°ê±??´ì˜ ?œë²„ ?„ë©”?¸ìœ¼ë¡??˜ë“œì½”ë”©
    const shareUrl = `https://gongsilnews.com/m/gongsil?id=${selectedVacancy.id}`;
    Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: getCleanAddrText(selectedVacancy) || "ê³µì‹¤ê´‘ê³  ?ì„¸",
        description: `${selectedVacancy.trade_type} ${formatPrice(selectedVacancy)}`,
        imageUrl: selectedVacancy.images?.[0] || "https://gongsilnews.com/new_logo.png",
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [{ title: "ê³µì‹¤ê´‘ê³  ë³´ê¸°", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
    });
    setShowShareDropdown(false);
  };

  const handleCopyUrl = () => {
    if (!selectedVacancy) return;
    // ë¬´ì¡°ê±??´ì˜ ?œë²„ ?„ë©”?¸ìœ¼ë¡??˜ë“œì½”ë”©
    const shareUrl = `https://gongsilnews.com/m/gongsil?id=${selectedVacancy.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("URL??ë³µì‚¬?˜ì—ˆ?µë‹ˆ??");
    }).catch(() => {
      alert("URL ë³µì‚¬???¤íŒ¨?ˆìŠµ?ˆë‹¤.");
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

  // ?¤ë¡œ ê°€ê¸??ˆë“œë¡œì´???˜ë“œ?¨ì–´ ë°±ë²„???? ì²˜ë¦¬
  useEffect(() => {
    const handlePopState = (e: any) => {
      // ê°¤ëŸ¬ë¦??€?¤í¬ë¦?ëª¨ë‹¬???«íˆ??popstate??ê²½ìš°, ?ì„¸?¨ë„ ?«ê¸° ?™ì‘??ë°©ì?
      if (e?.state?.modal === "gallery-m" || window.history.state?.modal === "gallery-m" || showGalleryFullscreen) {
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
  }, [selectedVacancy, selectedCluster, isEmbedded, showListView, showGalleryFullscreen]);

  // ?’¡ [?€?œë‹˜ ì§€ì¹? Bbox(ì§€?„ì˜ ?”ë©´ ?ì—­) ë³€?”ì— ?°ë¼ Supabase?ì„œ ?¤ì‹œê°„ìœ¼ë¡?ë²”ìœ„ ??ë§¤ë¬¼ë§?ì´ˆê³ ???¨ì¹˜!
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

        // getVacanciesForMap Server Action???œìš©??0.1ì´?ë¯¸ë§Œ ì´ˆê³ ??ì§€???ì—­ ì¿¼ë¦¬ ?¤í–‰
        const res = await getVacanciesForMap({
          bbox: { swLat, swLng, neLat, neLng },
          is_auction: activeMode === "ê²½ë§¤" // ?? ê²½ê³µë§?ëª¨ë“œ????ê²½ê³µë§?ë§¤ë¬¼ë§?ì´ˆê³ ??ì¿¼ë¦¬!
        });

        if (res.success && res.data) {
          const withImages = res.data.map((v: any) => ({
            ...v,
            images: v.vacancy_photos
              ? [...v.vacancy_photos].sort((a: any, b: any) => a.sort_order - b.sort_order).map((p: any) => p.url)
              : [],
          }));
          setVacancies(withImages);

          // URL??id ?Œë¼ë¯¸í„°ê°€ ?ˆëŠ” ê²½ìš°???¤ì´?‰íŠ¸ ?”í…Œ??ì¡°íšŒ ì§€??
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

  // ?’¡ ìµœì´ˆ ì§„ì… ?? ë§Œì•½ URL??id ?Œë¼ë¯¸í„°ê°€ ?ˆì–´???¤ì´?‰íŠ¸ ë·?ëª¨ë“œ??ê²½ìš° 1??ê°•ì œ ?¨ì¼ ?ì„¸ ë¡œë“œ
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

  // ì¹´ì¹´??ì§€??ì´ˆê¸°??
  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current || kakaoMapRef.current) return;
      const kakao = (window as any).kakao;
      if (!kakao?.maps) return;

      let initialLat = 37.5665;
      let initialLng = 126.978;
      let initialLevel = 7;

      const urlLat = searchParams.get("lat");
      const urlLng = searchParams.get("lng");
      const urlLevel = searchParams.get("level");

      if (urlLat && urlLng) {
        initialLat = parseFloat(urlLat);
        initialLng = parseFloat(urlLng);
        if (urlLevel) {
          initialLevel = parseInt(urlLevel, 10);
        }
      } else if (vacancies && vacancies.length > 0) {
        const firstValid = vacancies.find((v: any) => v.lat && v.lng);
        if (firstValid) {
          initialLat = firstValid.lat;
          initialLng = firstValid.lng;
        }
      }

      const map = new kakao.maps.Map(mapRef.current, {
        center: new kakao.maps.LatLng(initialLat, initialLng),
        level: initialLevel,
      });

      kakao.maps.event.addListener(map, "click", () => {
        vacancyStackRef.current = [];
        setSelectedCluster(null);
        setSelectedVacancy(null);
      });

      // ?? ì§€?„ê? ?ì„±?˜ìë§ˆì mapBounds?€ zoomLevel??ì¦‰ê° ?‹íŒ…?˜ì—¬ ìµœì´ˆ 1??ë¡œë“œ ?„ë¦¬ì§??´ê²°!
      setZoomLevel(map.getLevel());
      setMapBounds(map.getBounds());

      // ?? ?„ì¹˜ ????¤ì½”?©ìš© Geocoder ?¸ìŠ¤?´ìŠ¤ ?ì„±
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

  // ì¹´ì¹´??Share SDK ë¡œë“œ (ê³µìœ  ê¸°ëŠ¥??
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

  // ë§ˆì»¤ ê·¸ë¦¬ê¸?
  useEffect(() => {
    if (!kakaoMapRef.current || !mapLoaded) return;
    const kakao = (window as any).kakao;
    const map = kakaoMapRef.current;
    const currentLevel = map.getLevel();

    // ?? ëª¨ë“œ ?„í™˜ ??ê¸°ì¡´ ?´ëŸ¬?¤í„°???¤í????™ì  ê°±ì‹ 
    if (clustererRef.current) {
      clustererRef.current.clear();
      clustererRef.current.setStyles([
        { width: '56px', height: '56px', background: activeMode === "ê²½ë§¤" ? "#1a4282" : '#1a73e8', color: '#fff', textAlign: 'center', lineHeight: '50px', borderRadius: '50%', fontWeight: 'bold', fontSize: '18px', border: '3px solid #ffffff', boxShadow: activeMode === "ê²½ë§¤" ? '0 4px 12px rgba(26,66,130,0.35)' : '0 4px 12px rgba(0,0,0,0.25)' }
      ]);
    }
    markersRef.current.forEach((m: any) => m.setMap(null));
    markersRef.current = [];

    // [?€?œë‹˜ ì§€ì¹? ì¤Œì•„???ˆë²¨ 9 ?´ìƒ?ì„œ??ëª¨ë°”???Œë”ë§?ë¶€?˜ë? ë§‰ê¸° ?„í•´ ë§ˆì»¤ ?ì„±???„ë©´ ?ëµ!
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
          { width: '56px', height: '56px', background: activeMode === "ê²½ë§¤" ? "#1a4282" : '#1a73e8', color: '#fff', textAlign: 'center', lineHeight: '50px', borderRadius: '50%', fontWeight: 'bold', fontSize: '18px', border: '3px solid #ffffff', boxShadow: activeMode === "ê²½ë§¤" ? '0 4px 12px rgba(26,66,130,0.35)' : '0 4px 12px rgba(0,0,0,0.25)' }
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
      const isZoomedIn = zoomLevel <= 5;
      const coords = getJitteredCoords(v, isZoomedIn);
      if (!coords.lat || !coords.lng) return;
      const size = 50;
      const color = activeMode === "ê²½ë§¤" ? "#1a4282" : "#1a73e8";

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
        position: new kakao.maps.LatLng(coords.lat, coords.lng),
        image: img,
      });
      marker.customData = { ...v, lat: coords.lat, lng: coords.lng };

      kakao.maps.event.addListener(marker, "click", () => {
        window.history.pushState({ panel: "cluster" }, "");
        setSelectedVacancy(null);
        setSelectedCluster([{ ...v, lat: coords.lat, lng: coords.lng }]);
      });
      markersRef.current.push(marker);
    });

    clustererRef.current.addMarkers(markersRef.current);
  }, [filteredVacancies, mapLoaded, zoomLevel, activeMode]);

  // ì§€??ë²”ìœ„ ??ê³µì‹¤ê´‘ê³  ê°œìˆ˜ ?…ë°?´íŠ¸ ë°?ì§€??ë³€???´ë²¤?? ?°ë™
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

      // [?€?œë‹˜ ì§€ì¹? ì¹´ì¹´??LatLng ?¸ìŠ¤?´ìŠ¤ 5,000ê°??™ì  ?œì‚¬ ?‰ì„ ?„ì „??ë°•ë©¸?˜ê³  ?¨ìˆœ ?€??ë¹„êµ ?°ì‚°?¼ë¡œ 60 FPS ?¬ì„±!
      const isZoomedIn = zoomLevel <= 5;
      const visible = filteredVacancies.filter((v) => {
        const coords = getJitteredCoords(v, isZoomedIn);
        if (!coords.lat || !coords.lng) return false;
        return coords.lat >= swLat && coords.lat <= neLat && coords.lng >= swLng && coords.lng <= neLng;
      });
      setVisibleVacancies(visible);
      setVisibleCount(visible.length);
    };

    // ?? ì§€?„ì˜ bounds ë°?zoomLevel ë³€????ë¶€ëª??íƒœë¡??™ê¸°??
    const handleMapIdle = () => {
      const center = map.getCenter();
      setMapBounds(map.getBounds());
      setZoomLevel(map.getLevel());
      updateVisibleCount();

      // ?? [?€?œë‹˜ ê¸°íš ì§€ì¹? ì§€???œë˜ê·??´ë™ ??ì¤‘ì‹¬??ì£¼ì†Œë¥??ë“?˜ì—¬ ?ë‹¨ ?“ ?„ì¹˜ ??ë°??„í„° ?‰ì •êµ¬ì—­ ?ë™ ?™ê¸°??
      if (geocoderRef.current) {
        geocoderRef.current.coord2RegionCode(center.getLng(), center.getLat(), (result: any, status: any) => {
          if (status === (window as any).kakao.maps.services.Status.OK) {
            const region = result.find((r: any) => r.region_type === 'B') || result[0];
            if (region) {
              const sido = region.region_1depth_name; // ?? "?œìš¸?¹ë³„??
              const sigungu = region.region_2depth_name; // ?? "ê°•ë‚¨êµ?
              const dong = region.region_3depth_name; // ?? "?¼í˜„??
              
              const label = [sigungu, dong].filter(Boolean).join(" ");
              setLocLabel(label || "?„ì¹˜");

              // ì§€???„ì¹˜ ?´ë™??ë§ì¶° ?„í„° ?íƒœ???‰ì •êµ¬ì—­???„ë²½ ?™ê¸°??
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

    // ì´ˆê¸° ê³„ì‚°
    updateVisibleCount();

    // ì§€?„ì˜ ?´ë™/?•ë?ì¶•ì†Œê°€ ?ë‚¬?????…ë°?´íŠ¸ ?±ë¡
    kakao.maps.event.addListener(map, "idle", handleMapIdle);

    return () => {
      kakao.maps.event.removeListener(map, "idle", handleMapIdle);
    };
  }, [filteredVacancies, mapLoaded]);

  // ?ì„¸ ì¡°íšŒ
  const handleVacancyClick = async (v: any, isDirect: boolean = false) => {
    if (!isDirect) {
      window.history.pushState({ panel: "detail", t: Date.now() }, "");
    }
    if (detailScrollRef.current) {
      detailScrollRef.current.scrollTop = 0;
    }
    setDetailLoading(true);
    setSelectedVacancy(v); // ë¨¼ì? ê¸°ë³¸ ?•ë³´ ?œì‹œ
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
          onSuccess={() => alert("?´ë” ?´ë™???„ë£Œ?˜ì—ˆ?µë‹ˆ??")}
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

        {/* ?? [?€?œë‹˜ ?¹ì¸?? ?¤ì‹œê°?ê³µì‹¤ vs ë²•ì› ê²½ê³µë§??€???Œì•½ ?¸ê·¸ë¨¼íŠ¸ ?¤ìœ„ì¹?*/}
        {!isEmbedded && !isDirectView && (
          <div style={{ padding: "8px 16px", backgroundColor: "#fff", display: "flex", justifyContent: "center", borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ display: "flex", width: "100%", background: "#f1f5f9", borderRadius: "12px", padding: "4px" }}>
              <button
                onClick={() => {
                  setActiveMode("ê³µì‹¤");
                  setIsAuctionMode(false);
                  setVacancies([]);
                  setSelectedVacancy(null);
                  setSelectedCluster(null);
                  // ?? [?€?œë‹˜ ì§€ì¹? ê³µì‹¤ ?„í™˜ ???„í„° ë¦¬ì…‹ ë°??„ì²´? í˜• ê¸°ë³¸ ? íƒ
                  updateFilter({
                    propertyTypes: [
                      "?„íŒŒ??, "ë¹Œë¼/?°ë¦½", "?¤í”¼?¤í…”", "?ë£¸", "?¬ë£¸", "?¨ë…/?¤ê?êµ?,
                      "?„ì›ì£¼íƒ", "?ê?ì£¼íƒ", "?¬ê±´ì¶?, "?¬ê°œë°?,
                      "?ê?", "?¬ë¬´??, "? ì?", "ê±´ë¬¼", "ê³µì¥/ì°½ê³ ", "ì§€?ì‚°?…ì„¼??
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
                  backgroundColor: activeMode === "ê³µì‹¤" ? "#1a73e8" : "transparent",
                  color: activeMode === "ê³µì‹¤" ? "#ffffff" : "#64748b",
                  boxShadow: activeMode === "ê³µì‹¤" ? "0 4px 12px rgba(26,115,232,0.25)" : "none"
                }}
              >
                ???¤ì‹œê°?ê³µì‹¤
              </button>
              <button
                onClick={() => {
                  setActiveMode("ê²½ë§¤");
                  setIsAuctionMode(true);
                  setVacancies([]);
                  setSelectedVacancy(null);
                  setSelectedCluster(null);
                  // ?? [?€?œë‹˜ ì§€ì¹? ê²½ë§¤ ?„í™˜ ???„í„° ë¦¬ì…‹ ë°??„ì²´? í˜• ê¸°ë³¸ ? íƒ
                  updateFilter({
                    propertyTypes: [
                      "?„íŒŒ??, "?¨ë…/?¤ê?êµ?, "ë¹Œë¼/ì£¼íƒ", "ë¹Œë”©/?¬ë¬´??, "ê³µì¥/ì°½ê³ ", "? ì?"
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
                  backgroundColor: activeMode === "ê²½ë§¤" ? "#1a4282" : "transparent",
                  color: activeMode === "ê²½ë§¤" ? "#ffffff" : "#64748b",
                  boxShadow: activeMode === "ê²½ë§¤" ? "0 4px 12px rgba(26,66,130,0.25)" : "none"
                }}
              >
                ?”¨ ë²•ì› ê²½Â·ê³µë§?
              </button>
            </div>
          </div>
        )}

        {/* ?„í„° ë°?*/}
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

        {/* ì§€??ë°??¤ë²„?ˆì´ ì»¨í…Œ?´ë„ˆ */}
        <div style={{ position: "relative", flex: 1, display: isDirectView ? "none" : "flex", flexDirection: "column", backgroundColor: "#fff" }}>
          {/* ì¹´ì¹´??ì§€??*/}
          <div ref={mapRef} style={{ width: "100%", flex: 1 }} />

          {/* [?€?œë‹˜ ì§€ì¹? ëª¨ë°”??ì¤Œì¸(Zoom In) ?ˆë‚´ ?¤ë²„?ˆì´ (?•ì¤‘???„ìŠ¤ ?¨ê³¼) */}
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
                  ì§€?„ë? ì¡°ê¸ˆë§????•ë???ì£¼ì„¸??
                </span>
              </div>
            </div>
          )}

          {/* [?€?œë‹˜ ì§€ì¹? ?¤ì‹œê°?Supabase API ê°±ì‹  Pearl Loader ?¤í”¼??*/}
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

        {/* ì§€??ë¡œë”© ì¤?*/}
        {!mapLoaded && (
          <div style={{ position: "absolute", inset: 0, background: "#e8ecf0", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>?—ºï¸?/div>
              <p style={{ color: "#6b7280", fontSize: "14px" }}>ì§€?„ë? ë¶ˆëŸ¬?¤ëŠ” ì¤?..</p>
            </div>
          </div>
        )}

        {/* ì´ˆê¸°??ë²„íŠ¼ (ì¢Œì¸¡ ?ë‹¨ ì»´íŒ©?¸í•˜ê²? */}
        {mapLoaded && (
          <div style={{ position: "absolute", top: "16px", left: "16px", zIndex: 20 }}>
            <button 
              onClick={resetFilters}
              style={{ background: "rgba(255,255,255,0.9)", borderRadius: "20px", padding: "8px 14px", border: "1px solid #ddd", fontSize: "13px", fontWeight: 700, color: "#1a73e8", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
            >
              <span style={{ fontSize: "15px", lineHeight: 1 }}>??/span>
              ì´ˆê¸°??
            </button>
          </div>
        )}

        {/* ?¢ ?˜ë‹¨ ë²„íŠ¼ ?ì—­: ì§€????ê³µì‹¤ + ê³µì‹¤?±ë¡ ?˜ë???(activeMode ?°ë™ ?¤ë Œì§€/ë¸”ë£¨ ?™ì  ?Œë§ˆ ?¤ìœ„ì¹? */}
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
                background: activeMode === "ê²½ë§¤" ? "linear-gradient(135deg, #1a4282, #0f172a)" : "linear-gradient(135deg, #1a73e8, #3b82f6)",
                borderRadius: "28px",
                padding: "14px 24px",
                fontSize: "15px",
                fontWeight: 800,
                color: "#ffffff",
                boxShadow: activeMode === "ê²½ë§¤" ? "0 6px 20px rgba(26, 66, 130, 0.4)" : "0 6px 20px rgba(26, 115, 232, 0.4)",
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
              {activeMode === "ê²½ë§¤" ? (
                // ?”¨ ê²½ê³µë§??„ìš© ë²•ë¥  ?™ì°° ë§ì¹˜ SVG ?„ì´ì½?
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="m14 13-5 5m6-6-2.5 2.5m6.5-6.5a2.5 2.5 0 0 0-3.5-3.5L8.5 8 5.7 5.2a1 1 0 0 0-1.4 0L2.8 6.6a1 1 0 0 0 0 1.4L5.6 10.8l-4.2 4.2a1 1 0 0 0 0 1.4l1.4 1.4a1 1 0 0 0 1.4 0l4.2-4.2 2.8 2.8a1 1 0 0 0 1.4 0l1.4-1.4a1 1 0 0 0 0-1.4L11.2 12l6.8-6.8a2.5 2.5 0 0 0 3.5 3.5Z" />
                </svg>
              ) : (
                // ?¢ ?¼ë°˜ ê³µì‹¤ ë¹Œë”© SVG ?„ì´ì½?
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                  <line x1="9" y1="22" x2="9" y2="16" />
                  <line x1="15" y1="22" x2="15" y2="16" />
                  <line x1="9" y1="16" x2="15" y2="16" />
                  <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z" />
                </svg>
              )}
              {activeMode === "ê²½ë§¤" ? `ê²½ê³µë§?ë¬¼ê±´ ${visibleCount}ê±? : `ê²€?‰ëœ ê³µì‹¤ ${visibleCount}ê°?}
            </button>
            {activeMode !== "ê²½ë§¤" && (
              <button
                onClick={() => {
                  if (!currentUser) {
                    alert("ê³µì‹¤???±ë¡?˜ë ¤ë©?ë¡œê·¸?¸ì´ ?„ìš”?©ë‹ˆ??");
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
                  ê³µì‹¤?±ë¡
                </span>
              </button>
            )}
          </div>
        )}

        {/* ???„ì¹˜ ë²„íŠ¼ */}
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
            ???„ì¹˜
          </button>
        )}

        {/* ?„ì¹˜ ê²€??ë¡œë”© ?¤ë²„?ˆì´ */}
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
              <div style={{ position: "relative", width: "32px", height: "32px", borderRadius: "50%", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.12)", border: "1px solid rgba(0,0,0,0.06)" }}>
                <style>{`
                  @keyframes spinCircleLocating {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}</style>
                <div style={{
                  width: 18,
                  height: 18,
                  border: "2.5px solid rgba(26, 115, 232, 0.15)",
                  borderTop: "2.5px solid #1a73e8",
                  borderRadius: "50%",
                  animation: "spinCircleLocating 0.8s linear infinite"
                }} />
              </div>
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#1a2e50", marginBottom: "8px" }}>?„ì¬ ?„ì¹˜ë¥?ì°¾ê³  ?ˆìŠµ?ˆë‹¤</h3>
            <p style={{ fontSize: "14px", color: "#6b7280", textAlign: "center", lineHeight: 1.5 }}>
              GPS ?íƒœ???°ë¼<br/>??ì´??•ë„ ?Œìš”?????ˆìŠµ?ˆë‹¤.
            </p>
          </div>
        )}
      </div>
    </div>

      {/* ?ì„¸ ?¨ë„ */}
      <div ref={detailPanelRef} className={`detail-panel ${selectedVacancy ? "open" : ""} ${isDirectView ? "direct-view" : ""}`} onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* ?ë‹¨ ?¤ë” (ê²½ë§¤ ëª¨ë“œ?ì„œë§??œì‹œ?˜ì—¬ ?¼ë°˜ ê³µì‹¤ê³?ë¶„ë¦¬) */}
        {selectedVacancy?.trade_type === "ê²½ë§¤" && (
          <div style={{ zIndex: 10, background: "#fff", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", position: "sticky", top: 0 }}>
            <button onClick={goBack} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", marginLeft: "-4px" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#111827", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {getCleanAddrText(selectedVacancy) || "ê³µì‹¤ê´‘ê³  ?ì„¸"}
            </h2>
            {/* Action Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              {/* ì°œí•˜ê¸?*/}
              <button onClick={toggleBookmark} style={{ background: "none", border: "none", cursor: "pointer", padding: "0", display: "flex", alignItems: "center", color: isBookmarked ? "#1a73e8" : "#6b7280" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
              </button>
              {/* ê³µìœ (?„ë‹¬) */}
              <div style={{ position: "relative" }} ref={shareDropdownRef}>
                <button onClick={() => setShowShareDropdown(!showShareDropdown)} style={{ background: "none", border: "none", cursor: "pointer", padding: "0", display: "flex", alignItems: "center", color: showShareDropdown ? "#1a73e8" : "#6b7280" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line>
                  </svg>
                </button>
                {showShareDropdown && (
                  <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "8px", background: "#fff", border: "1px solid #e0e0e0", borderRadius: "10px", boxShadow: "0 6px 24 rgba(0,0,0,0.15)", width: "200px", zIndex: 9999, overflow: "hidden" }}>
                    <button onClick={handleKakaoShare} style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", background: "none", border: "none", borderBottom: "1px solid #f0f0f0", cursor: "pointer", fontSize: "14px", color: "#333", fontWeight: 600 }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#FEE500", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#3C1E1E"><path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.8 5.2 4.4 6.5l-1 3.7c-.1.3.3.6.5.4l4.3-2.9c.6.1 1.2.1 1.8.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z"></path></svg>
                      </div>
                      ì¹´ì¹´?¤í†¡ ê³µìœ 
                    </button>
                    <button onClick={handleCopyUrl} style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "#333", fontWeight: 600 }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                      </div>
                      URL ë³µì‚¬
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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


      {/* ê°¤ëŸ¬ë¦??€?¤í¬ë¦?ëª¨ë‹¬ */}
      {showGalleryFullscreen && selectedVacancy?.images && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#000", zIndex: 10000, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff" }}>
            <div style={{ fontSize: "15px", fontWeight: 600 }}>{galleryIndex + 1} / {selectedVacancy.images.length}</div>
            <button onClick={() => closeGalleryFullscreen()} style={{ background: "none", border: "none", color: "#fff", fontSize: "24px", cursor: "pointer", padding: "4px" }}>??/button>
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
              alt="ê°¤ëŸ¬ë¦??•ë?" 
            />
            {selectedVacancy.images.length > 1 && (
              <>
                <button onClick={() => setGalleryIndex(Math.max(0, galleryIndex - 1))} style={{ position: "absolute", top: "50%", left: 0, transform: "translateY(-50%)", background: "none", color: "#fff", border: "none", fontSize: "36px", padding: "20px", cursor: "pointer" }}>??/button>
                <button onClick={() => setGalleryIndex(Math.min(selectedVacancy.images.length - 1, galleryIndex + 1))} style={{ position: "absolute", top: "50%", right: 0, transform: "translateY(-50%)", background: "none", color: "#fff", border: "none", fontSize: "36px", padding: "20px", cursor: "pointer" }}>??/button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ê¶Œí•œ ?¸ì¦ ëª¨ë‹¬ */}
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
