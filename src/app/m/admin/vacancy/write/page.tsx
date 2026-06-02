"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { createVacancy, updateVacancy, getVacancyDetail, syncVacancyPhotos, uploadVacancyPhoto } from "@/app/actions/vacancy";
import { getPhotoLibrary, togglePhotoFavorite } from "@/app/actions/article";
import { geocodeAddress } from "@/app/actions/geocode";
import imageCompression from "browser-image-compression";

const SUB_CATEGORIES: Record<string, string[]> = {
  "아파트·오피스텔": ["아파트", "아파트분양권", "오피스텔", "오피스텔분양권"],
  "빌라·주택": ["빌라/연립", "단독/다가구", "전원주택", "상가주택"],
  "원룸·투룸(풀옵션)": ["원룸", "1.5룸", "투룸"],
  "상가·사무실·건물·공장·토지": ["상가", "사무실", "공장/창고", "건물", "토지"],
};

/* ── WebP 압축 (browser-image-compression 활용) ── */
const compressToWebP = async (file: File, maxWidth = 1920, quality = 0.8): Promise<File> => {
  if (!file.type.startsWith("image/") && !file.name.toLowerCase().endsWith(".heic")) {
    return file;
  }
  try {
    const options = {
      maxSizeMB: 1, // 최대 1MB 이하로 압축
      maxWidthOrHeight: maxWidth, // 최대 해상도 제한
      useWebWorker: true,
      fileType: "image/webp", // WebP 변환 강제
      initialQuality: quality
    };
    const compressedBlob = await imageCompression(file, options);
    const newName = file.name.replace(/\.[^.]+$/, ".webp");
    return new File([compressedBlob], newName, { type: "image/webp" });
  } catch (error) {
    console.error("Image compression failed, returning original file:", error);
    return file;
  }
};

function MobileVacancyWrite() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const [memberId, setMemberId] = useState("");
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userRole, setUserRole] = useState("USER");
  const [authChecked, setAuthChecked] = useState(false);
  const [fetchingLedger, setFetchingLedger] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const TOTAL_STEPS = 4;
  const STEP_LABELS = ["분류/주소", "가격/면적", "사진·상세", "최종확인"];

  // 공실광고 기본
  const [propertyType, setPropertyTypeRaw] = useState("아파트·오피스텔");
  const [subCategory, setSubCategory] = useState("아파트");

  // 대분류 변경 시 주소노출범위 기본값도 맞춰 갱신
  const setPropertyType = (type: string) => {
    setPropertyTypeRaw(type);
    if (type === "아파트·오피스텔") {
      setAddressExposure("비공개");
    } else {
      setAddressExposure("기본주소만공개");
    }
  };
  const [tradeType, setTradeType] = useState("매매");

  // 금액
  const [deposit, setDeposit] = useState("");
  const [monthly, setMonthly] = useState("");
  const [maintenance, setMaintenance] = useState("");

  // 면적/층
  const [exclusiveM2, setExclusiveM2] = useState("");
  const [exclusivePy, setExclusivePy] = useState("");
  const [supplyM2, setSupplyM2] = useState("");
  const [supplyPy, setSupplyPy] = useState("");
  const [landShareM2, setLandShareM2] = useState("");
  const [landSharePy, setLandSharePy] = useState("");
  const [existingMetadata, setExistingMetadata] = useState<any>({});
  const [areaUnit, setAreaUnit] = useState<"m2"|"py">("py");
  const [currentFloor, setCurrentFloor] = useState("");
  const [totalFloor, setTotalFloor] = useState("");
  const [roomCount, setRoomCount] = useState("1");
  const [bathCount, setBathCount] = useState("1");
  const [direction, setDirection] = useState("");

  // 주소
  const [sido, setSido] = useState("");
  const [sigungu, setSigungu] = useState("");
  const [dong, setDong] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [detailAddr, setDetailAddr] = useState("");
  const [aptDong, setAptDong] = useState("");
  const [hosu, setHosu] = useState("");
  const [addressExposure, setAddressExposure] = useState("비공개"); // 아파트·오피스텔 기본값

  // 기타
  const [parking, setParking] = useState("없음");
  const [moveInDate, setMoveInDate] = useState("즉시입주(공실)");
  const [description, setDescription] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [commissionType, setCommissionType] = useState("법정수수료");
  const [commissionEtc, setCommissionEtc] = useState("");
  const [ownerRelation, setOwnerRelation] = useState("본인");
  const [coords, setCoords] = useState<{lat:number;lng:number}|null>(null);

  // 옵션/테마/주변환경
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [customOptionInput, setCustomOptionInput] = useState("");
  const [customThemeInput, setCustomThemeInput] = useState("");
  const [infrastructure, setInfrastructure] = useState<any>({});

  // 부동산 전용
  const [realtorCommission, setRealtorCommission] = useState("공동중개");
  const [exposureType, setExposureType] = useState("부동산노출");
  const [landlordName, setLandlordName] = useState("");
  const [landlordPhone, setLandlordPhone] = useState("");
  const [landlordMemo, setLandlordMemo] = useState("");

  const [rCompany, setRCompany] = useState("착한임대부동산");
  const [rRegNum, setRRegNum] = useState("1666-4414411");
  const [rBoss, setRBoss] = useState("김동현");
  const [rBizNum, setRBizNum] = useState("211-33-21777");
  const [rTel, setRTel] = useState("02-541-1611");
  const [rCell, setRCell] = useState("02-541-1611");
  const [rAddr, setRAddr] = useState("서울 강남구 논현동 189-13");

  // 사진
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string[]>([]);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]); // 수정 모드: DB 기존 사진 URL

  /* ── 포토 DB 상태 ── */
  const [showPhotoDbModal, setShowPhotoDbModal] = useState(false);
  const [photoDbItems, setPhotoDbItems] = useState<any[]>([]);
  const [photoDbSearch, setPhotoDbSearch] = useState("");
  const [photoDbTab, setPhotoDbTab] = useState<"전체사진" | "즐겨찾기">("전체사진");
  const [isPhotoDbLoading, setIsPhotoDbLoading] = useState(false);

  const isCommercial = propertyType === "상가·사무실·건물·공장·토지";
  const isRealtor = userRole === "REALTOR" || userRole === "ADMIN";

  // 모바일 키보드 감지 (하단 버튼 숨김용)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const threshold = window.innerHeight * 0.75;
    const onResize = () => setIsKeyboardOpen(vv.height < threshold);
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  // PC와 동일한 주소 공개/비공개 판정 로직
  const isFieldExposed = (field: "detailAddr" | "buildingName" | "aptDong" | "hosu") => {
    if (propertyType === "아파트·오피스텔") {
      if (field === "detailAddr") return addressExposure !== "비공개";
      if (field === "buildingName") return true;
      if (field === "aptDong") return addressExposure !== "비공개";
      if (field === "hosu") return addressExposure === "동/호수공개";
    } else {
      if (field === "detailAddr") return addressExposure !== "기본주소만공개";
      if (field === "buildingName" || field === "hosu") return addressExposure === "번지공개";
    }
    return true;
  };
  const PrivateTag = () => <span style={{ color:"#f97316", fontSize:11, fontWeight:600 }}>(비공개)</span>;

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/m"); return; }
      const { data } = await supabase.from("members").select("id, name, phone, role").eq("id", user.id).single();
      if (data) { setMemberId(data.id); setUserName(data.name||""); setUserPhone(data.phone||""); setClientName(data.name||""); setClientPhone(data.phone||""); setUserRole((data as any).role || "USER"); }
      setAuthChecked(true);
    })();
  }, []);

  // 수정 모드: 데이터 로드
  useEffect(() => {
    if (!editId) return;
    (async () => {
      setLoadingEdit(true);
      const res = await getVacancyDetail(editId);
      if (res.success && res.data) {
        const d = res.data;
        if (d.property_type) setPropertyType(d.property_type);
        if (d.sub_category) setSubCategory(d.sub_category);
        if (d.trade_type) setTradeType(d.trade_type);
        if (d.deposit) setDeposit(String(d.deposit / 10000));
        if (d.monthly_rent) setMonthly(String(d.monthly_rent / 10000));
        if (d.maintenance_fee) setMaintenance(String(d.maintenance_fee / 10000));
        if (d.exclusive_m2) {
          setExclusiveM2(String(d.exclusive_m2));
          setExclusivePy((Number(d.exclusive_m2) * 0.3025).toFixed(1));
        }
        if (d.supply_m2) {
          setSupplyM2(String(d.supply_m2));
          setSupplyPy((Number(d.supply_m2) * 0.3025).toFixed(1));
        }
        if (d.metadata) {
          setExistingMetadata(d.metadata);
          if (d.metadata.land_share_m2) {
            setLandShareM2(String(d.metadata.land_share_m2));
            setLandSharePy((Number(d.metadata.land_share_m2) * 0.3025).toFixed(1));
          }
        }
        if (d.current_floor) setCurrentFloor(d.current_floor);
        if (d.total_floor) setTotalFloor(d.total_floor);
        if (d.room_count) setRoomCount(String(d.room_count));
        if (d.bath_count) setBathCount(String(d.bath_count));
        if (d.direction) setDirection(d.direction);
        if (d.sido) setSido(d.sido);
        if (d.sigungu) setSigungu(d.sigungu);
        if (d.dong) setDong(d.dong);
        if (d.building_name) setBuildingName(d.building_name);
        if (d.detail_addr) setDetailAddr(d.detail_addr);
        if (d.apt_dong) setAptDong(d.apt_dong);
        if (d.hosu) setHosu(d.hosu);
        if (d.address_exposure) setAddressExposure(d.address_exposure);
        if (d.parking) setParking(d.parking);
        if (d.move_in_date) setMoveInDate(d.move_in_date);
        if (d.description) setDescription(d.description);
        if (d.client_name) setClientName(d.client_name);
        if (d.client_phone) setClientPhone(d.client_phone);
        if (d.commission_type) setCommissionType(d.commission_type);
        if (d.commission_etc) setCommissionEtc(d.commission_etc);
        if (d.owner_relation) setOwnerRelation(d.owner_relation);
        if (d.lat && d.lng) setCoords({lat:d.lat,lng:d.lng});
        if (d.realtor_commission) setRealtorCommission(d.realtor_commission);
        if (d.exposure_type) setExposureType(d.exposure_type);
        if (d.landlord_name) setLandlordName(d.landlord_name);
        if (d.landlord_phone) setLandlordPhone(d.landlord_phone);
        if (d.landlord_memo) setLandlordMemo(d.landlord_memo);
        if (d.options) setSelectedOptions(d.options);
        if (d.themes) setSelectedThemes(d.themes);
        if (d.infrastructure) setInfrastructure(d.infrastructure);
        // 기존 사진 로드 (조인 데이터 → 별도 쿼리 폴백)
        const photoData = d.vacancy_photos && d.vacancy_photos.length > 0 
          ? d.vacancy_photos 
          : (res.photos && res.photos.length > 0 ? res.photos : []);
        if (photoData.length > 0) {
          const sorted = [...photoData].sort((a: any, b: any) => a.sort_order - b.sort_order);
          const urls = sorted.map((p: any) => p.url);
          setExistingPhotoUrls(urls);
          setPhotoPreview(urls);
        }
      }
      setLoadingEdit(false);
    })();
  }, [editId]);

  /* ── 포토DB 로직 ── */
  const openPhotoDbModal = () => {
    setShowPhotoDbModal(true);
    setPhotoDbTab("전체사진");
    setPhotoDbSearch("");
    fetchPhotoDb("", false);
  };

  const fetchPhotoDb = async (searchStr: string, favOnly: boolean) => {
    setIsPhotoDbLoading(true);
    const res = await getPhotoLibrary({ search: searchStr, isFavorite: favOnly, authorId: memberId });
    if (res.success && res.data) {
      setPhotoDbItems(res.data);
    } else {
      setPhotoDbItems([]);
    }
    setIsPhotoDbLoading(false);
  };

  useEffect(() => {
    if (showPhotoDbModal) {
      fetchPhotoDb(photoDbSearch, photoDbTab === "즐겨찾기");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoDbTab]);

  const handlePhotoDbSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPhotoDb(photoDbSearch, photoDbTab === "즐겨찾기");
  };

  const handleToggleFav = async (e: React.MouseEvent, photoId: string, currentFav: boolean) => {
    e.stopPropagation();
    const res = await togglePhotoFavorite(photoId, !currentFav);
    if (res.success) {
      setPhotoDbItems(prev => prev.map(p => p.id === photoId ? { ...p, is_favorite: !currentFav } : p));
      if (photoDbTab === "즐겨찾기") {
        fetchPhotoDb(photoDbSearch, true);
      }
    } else {
      alert("상태 변경에 실패했습니다.");
    }
  };

  const handleSelectFromPhotoDb = async (photo: any) => {
    setShowPhotoDbModal(false);
    try {
      const response = await fetch(photo.url, { cache: 'no-cache' });
      if (!response.ok) throw new Error("Network response was not ok");
      const blob = await response.blob();
      const ext = photo.filename ? photo.filename.split(".").pop() : "webp";
      const file = new File([blob], photo.filename || `db_photo_${Date.now()}.${ext}`, { type: blob.type });
      
      const compressed = await compressToWebP(file);
      const pv = URL.createObjectURL(compressed);
      setPhotos(prev => [...prev, compressed]);
      setPhotoPreview(prev => [...prev, pv]);
    } catch (err: any) {
      alert(`사진을 불러오는 중 오류가 발생했습니다.\n(${err.message || err})`);
    }
  };

  /* ── WebP 압축 변환 ── */
  const handleM2Change = useCallback((val: string, setter: (v: string) => void, pySetter: (v: string) => void) => {
    setter(val);
    if (val && !isNaN(Number(val))) {
      pySetter((Number(val) * 0.3025).toFixed(1));
    } else {
      pySetter("");
    }
  }, []);

  const handlePyChange = useCallback((val: string, pySetter: (v: string) => void, m2Setter: (v: string) => void) => {
    pySetter(val);
    if (val && !isNaN(Number(val))) {
      m2Setter((Number(val) / 0.3025).toFixed(1));
    } else {
      m2Setter("");
    }
  }, []);

  // 다이나믹 옵션 관리
  const currentOptionList = React.useMemo(() => {
    let base = ["주차", "엘리베이터"];
    if (propertyType === "아파트·오피스텔" || propertyType === "원룸·투룸(풀옵션)") {
      if (subCategory === "아파트분양권" || subCategory === "오피스텔분양권") {
        base = ["풀퍼니시드(풀옵션)", "시스템에어컨", "빌트인냉장고", "세탁기", "건조기", "스타일러", "식기세척기", "인덕션", "중문설치", "붙박이장"];
      } else {
        base = ["시스템에어컨", "세탁기", "건조기", "빌트인냉장고", "식기세척기", "인덕션", "붙박이장", "침대", "TV", "비데", "도어락", "무인택배함"];
      }
    } else if (propertyType === "상가·사무실·건물·공장·토지") {
      base = ["냉난방기", "수도설비", "가스설비", "화물용승강기", "보안시스템"];
    } else if (propertyType === "빌라·주택") {
      if (subCategory === "빌라/연립") {
        base = ["시스템에어컨", "벽걸이에어컨", "세탁기", "건조기", "냉장고", "가스레인지/인덕션", "붙박이장", "비데", "도어락", "엘리베이터", "무인택배함", "CCTV"];
      } else {
        base = ["개인차고지", "마당/정원", "옥상(루프탑)", "단독테라스", "창고", "태양광설비", "방범창", "CCTV", "시스템에어컨", "붙박이장"];
      }
    }
    return Array.from(new Set([...base, ...selectedOptions]));
  }, [propertyType, subCategory, selectedOptions]);

  const toggleOption = (opt: string) => {
    setSelectedOptions(prev => prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]);
  };

  const addCustomOption = () => {
    if (customOptionInput && customOptionInput.trim() && !currentOptionList.includes(customOptionInput.trim())) {
      setSelectedOptions(prev => [...prev, customOptionInput.trim()]);
      setCustomOptionInput("");
    }
  };

  const currentThemeList = React.useMemo(() => {
    if (propertyType === "아파트·오피스텔") {
      if (subCategory === "아파트분양권" || subCategory === "오피스텔분양권") {
        return Array.from(new Set(["마이너스피", "무피", "로열층", "중도금무이자", "전매제한없음", "하이엔드", "수익형", "역세권", "뻥뷰", "급매", ...selectedThemes]));
      }
      return Array.from(new Set(["신축첫입주", "특올수리", "로열층", "뻥뷰", "역세권", "풀옵션", "반려동물가능", "주차편리", "전세대출가능", "즉시입주", ...selectedThemes]));
    } else if (propertyType === "원룸·투룸(풀옵션)") {
      return Array.from(new Set(["가성비", "단기임대", "주차편리", "대로변안전", "여성안심", "오피스텔", "애완견가능", ...selectedThemes]));
    } else if (propertyType === "상가·사무실·건물·공장·토지") {
      return Array.from(new Set(["무권리", "코너자리", "유동인구많음", "주차대수많음", "인테리어잘됨", "층고높음", "대로변", ...selectedThemes]));
    } else if (propertyType === "빌라·주택") {
      if (subCategory === "빌라/연립") {
        return Array.from(new Set(["신축첫입주", "특올수리", "엘리베이터있음", "주차편리", "역세권", "풀옵션", "전세대출가능", "반려동물가능", "안심전세", "투룸/쓰리룸", ...selectedThemes]));
      } else {
        return Array.from(new Set(["마당있음", "테라스/옥상", "수익형부동산", "통임대/통매매", "리모델링", "조용한동네", "반려동물환영", "전원생활", "층간소음프리", "대가족추천", ...selectedThemes]));
      }
    }
    return Array.from(new Set(["급매", "추천공실광고", ...selectedThemes]));
  }, [propertyType, subCategory, selectedThemes]);

  const toggleTheme = (theme: string) => {
    setSelectedThemes(prev => prev.includes(theme) ? prev.filter(t => t !== theme) : [...prev, theme]);
  };

  const addCustomTheme = () => {
    if (customThemeInput && customThemeInput.trim() && !currentThemeList.includes(customThemeInput.trim())) {
      setSelectedThemes(prev => [...prev, customThemeInput.trim()]);
      setCustomThemeInput("");
    }
  };

  const handlePostcodeSearch = () => {
    const script = document.createElement("script");
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.onload = () => {
      new (window as any).daum.Postcode({
        oncomplete: async (data: any) => {
          const parsedSido = data.sido || "";
          const parsedSigungu = data.sigungu || "";
          const parsedDong = data.bname || "";
          setSido(parsedSido);
          setSigungu(parsedSigungu);
          setDong(parsedDong);
          setBuildingName(data.buildingName || "");
          
          let remainingAddr = data.roadAddress || data.jibunAddress || data.address || "";
          const prefixes = [parsedSido, parsedSigungu, parsedDong].filter(Boolean);
          prefixes.forEach(p => {
            if (remainingAddr.startsWith(p)) remainingAddr = remainingAddr.slice(p.length).trim();
          });
          setDetailAddr(remainingAddr);
          // 자동 좌표 설정
          const addr = data.address || data.jibunAddress || "";
          if (addr) {
            const res = await geocodeAddress(addr);
            if (res.success && res.lat && res.lng) {
              setCoords({lat:res.lat, lng:res.lng});
              try {
                const { searchNearbyInfrastructure } = await import("@/app/actions/geocode");
                const infra = await searchNearbyInfrastructure(res.lat, res.lng);
                setInfrastructure(infra);
              } catch (e) { console.error(e); }
            }
          }
        }
      }).open();
    };
    document.head.appendChild(script);
  };

  const handleGeocode = async () => {
    // sido, sigungu, dong, detailAddr 를 합쳐서 좌표 검색 (건물명은 좌표 검색 시 오류 유발 가능성이 높아 제외)
    const addr = [sido, sigungu, dong, detailAddr].filter(Boolean).join(" ");
    if (!addr.trim()) { alert("주소를 입력해주세요."); return; }
    const res = await geocodeAddress(addr);
    if (res.success && res.lat && res.lng) { 
      setCoords({lat:res.lat, lng:res.lng}); 
      try {
        const { searchNearbyInfrastructure } = await import("@/app/actions/geocode");
        const infra = await searchNearbyInfrastructure(res.lat, res.lng);
        setInfrastructure(infra);
      } catch (e) { console.error(e); }
      alert("좌표 및 주변환경(인프라) 설정 완료!"); 
    }
    else alert(`주소를 찾을 수 없습니다. (이유: ${res.error || "결과 없음"})`);
  };


  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const totalCount = existingPhotoUrls.length + photos.length;
    const files = Array.from(e.target.files).slice(0, 5 - totalCount);
    
    // WebP 압축 적용
    const compressed = await Promise.all(files.map(f => compressToWebP(f)));
    
    setPhotos(prev => [...prev, ...compressed]);
    compressed.forEach(f => { 
      const r = new FileReader(); 
      r.onload = () => setPhotoPreview(prev => [...prev, r.result as string]); 
      r.readAsDataURL(f); 
    });
  };

  const removePhoto = (i: number) => {
    const existingCount = existingPhotoUrls.length;
    if (i < existingCount) {
      // 기존 DB 사진 삭제
      setExistingPhotoUrls(prev => prev.filter((_,idx) => idx!==i));
      setPhotoPreview(prev => prev.filter((_,idx) => idx!==i));
    } else {
      // 새로 추가한 사진 삭제
      const newIdx = i - existingCount;
      setPhotos(prev => prev.filter((_,idx) => idx!==newIdx));
      setPhotoPreview(prev => prev.filter((_,idx) => idx!==i));
    }
  };

  const formatPhone = (v: string) => {
    let val = v.replace(/[^0-9]/g, "");
    if (val.startsWith("02")) {
      if (val.length < 3) return val;
      if (val.length < 6) return val.replace(/(\d{2})(\d{1,3})/, "$1-$2");
      if (val.length < 10) return val.replace(/(\d{2})(\d{3})(\d{1,4})/, "$1-$2-$3");
      return val.replace(/(\d{2})(\d{4})(\d{1,4})/, "$1-$2-$3");
    } else if (val.startsWith("15") || val.startsWith("16") || val.startsWith("18")) {
      // 1588-0000 
      if (val.length < 5) return val;
      return val.replace(/(\d{4})(\d{1,4})/, "$1-$2");
    } else {
      if (val.length < 4) return val;
      if (val.length < 7) return val.replace(/(\d{3})(\d{1,3})/, "$1-$2");
      if (val.length < 11) return val.replace(/(\d{3})(\d{3})(\d{1,4})/, "$1-$2-$3");
      return val.replace(/(\d{3})(\d{4})(\d{1,4})/, "$1-$2-$3");
    }
  };

  const formatKorean = (v: string) => {
    const n = parseInt(v); if (isNaN(n) || n<=0) return "";
    const eok = Math.floor(n/10000); const man = n%10000;
    let result = "";
    if (eok > 0) result += `${eok}억`;
    if (man > 0) {
      const cheon = Math.floor(man/1000);
      const rest = man%1000;
      let manStr = "";
      if (cheon > 0) manStr += `${cheon}천`;
      if (rest > 0) manStr += `${rest}`;
      result += (result ? " " : "") + manStr + "만";
    }
    return (result || "0") + "원";
  };

  const handleSubmit = async (status: string) => {
    if (!propertyType || !tradeType) { alert("공실광고 분류와 거래유형을 선택하세요."); return; }
    if (!sido || !dong) { alert("주소를 입력하세요."); return; }
    setSubmitting(true);
    try {
      const payload: any = {
        owner_id: memberId, owner_role: "USER",
        property_type: propertyType, sub_category: subCategory, trade_type: tradeType,
        deposit: (parseInt(deposit)||0)*10000, monthly_rent: (parseInt(monthly)||0)*10000, maintenance_fee: (parseInt(maintenance)||0)*10000,
        exclusive_m2: exclusiveM2 ? parseFloat(exclusiveM2) : undefined,
        exclusive_py: exclusiveM2 ? (parseFloat(exclusiveM2)*0.3025).toFixed(1) : undefined,
        supply_m2: supplyM2 ? parseFloat(supplyM2) : undefined,
        current_floor: currentFloor||undefined, total_floor: totalFloor||undefined,
        room_count: isCommercial ? undefined : parseInt(roomCount)||1,
        bath_count: isCommercial ? undefined : parseInt(bathCount)||1,
        direction: isCommercial ? undefined : direction,
        sido, sigungu, dong, building_name: buildingName||undefined, detail_addr: detailAddr||undefined,
        apt_dong: aptDong||undefined, hosu: hosu||undefined, address_exposure: addressExposure,
        lat: coords?.lat, lng: coords?.lng,
        parking, move_in_date: moveInDate, description: description||undefined,
        client_name: clientName, client_phone: clientPhone,
        commission_type: isRealtor ? undefined : commissionType,
        commission_etc: isRealtor ? undefined : commissionEtc,
        owner_relation: isRealtor ? undefined : ownerRelation,
        options: selectedOptions, themes: selectedThemes, infrastructure,
        realtor_commission: isRealtor ? realtorCommission : undefined,
        exposure_type: isRealtor ? exposureType : undefined,
        landlord_name: isRealtor ? landlordName : undefined,
        landlord_phone: isRealtor ? landlordPhone : undefined,
        landlord_memo: isRealtor ? landlordMemo : undefined,
        metadata: {
          ...existingMetadata,
          land_share_m2: landShareM2 ? parseFloat(landShareM2) : undefined,
          land_share_py: landSharePy ? parseFloat(landSharePy) : undefined,
        },
        consent: true, status,
      };

      let result;
      if (editId) {
        const res = await updateVacancy(editId, payload);
        result = { success: res.success, id: editId, error: res.error };
      } else {
        result = await createVacancy(payload);
      }

      if (!result.success) { alert("실패: " + result.error); return; }

      // 사진 동기화 (기존 유지 + 신규 추가 - 삭제 반영)
      let finalUrls = [...existingPhotoUrls];
      if (result.id && photos.length > 0) {
        const startIdx = existingPhotoUrls.length;
        let photoErrors: string[] = [];
        for (let i = 0; i < photos.length; i++) {
          try {
            const path = `${result.id}/${startIdx + i}_${Date.now()}.webp`;
            const formData = new FormData();
            formData.append('file', photos[i]);
            formData.append('path', path);
            const up = await uploadVacancyPhoto(formData);
            if (up.success && up.url) {
              finalUrls.push(up.url);
            } else {
              photoErrors.push(`업로드: ${up.error}`);
            }
          } catch (e: any) {
            photoErrors.push(`오류: ${e.message}`);
          }
        }
        if (photoErrors.length > 0) {
          alert(`사진 저장 오류:\n${photoErrors.join('\n')}`);
        }
      }
      if (result.id) {
        await syncVacancyPhotos(result.id, finalUrls);
      }

      alert(status === "DRAFT" ? "임시저장 완료!" : editId ? "수정 완료!" : "등록 완료! 광고가 바로 시작됩니다.");
      router.replace("/m/admin/vacancy");
    } catch (err: any) { alert("오류: " + err.message); } finally { setSubmitting(false); }
  };

  const inputStyle: React.CSSProperties = { 
    width:"100%", 
    height:44, 
    padding:"0 14px", 
    border:"1px solid #e2e8f0", 
    borderRadius:10, 
    fontSize:14, 
    outline:"none", 
    background:"#fff", 
    color:"#1f2937", 
    boxShadow:"0 1px 2px rgba(0,0,0,0.02)",
    transition:"all 0.2s" 
  };
  const labelStyle: React.CSSProperties = { 
    fontSize:13, 
    fontWeight:700, 
    color:"#4b5563", 
    marginBottom:6, 
    display:"block",
    letterSpacing:"-0.01em" 
  };
  const SBtn = ({label,sel,onClick}:{label:string;sel:boolean;onClick:()=>void}) => (
    <button 
      type="button" 
      onClick={onClick} 
      style={{ 
        flex:1, 
        minHeight:42, 
        padding:"8px 4px", 
        border: sel ? "1px solid #1a73e8" : "1px solid #e5e7eb", 
        borderRadius:10, 
        background: sel ? "#1a73e8" : "#fff", 
        color: sel ? "#fff" : "#4b5563", 
        fontSize:13, 
        fontWeight: sel ? 800 : 600, 
        cursor:"pointer", 
        wordBreak:"keep-all", 
        lineHeight:1.3, 
        textAlign:"center",
        boxShadow: sel ? "0 2px 6px rgba(26,115,232,0.15)" : "none",
        transition: "all 0.15s ease" 
      }}
    >
      {label}
    </button>
  );

  if (!authChecked || loadingEdit) return (
    <div style={{ display:"flex", height:"100dvh", alignItems:"center", justifyContent:"center", background:"#f4f5f7" }}>
      <div style={{ textAlign:"center", color:"#9ca3af" }}>
        <div style={{ fontSize:36, marginBottom:12 }}>{loadingEdit?"📋":"🔐"}</div>
        <div style={{ fontSize:14, fontWeight:600 }}>{loadingEdit?"공실광고 정보 불러오는 중...":"권한 확인 중..."}</div>
      </div>
    </div>
  );

    const fetchBuildingLedger = async () => {
    if (!sigunguCd || !bjdongCd || !bun) {
      alert("먼저 [주소 검색]을 통해 정확한 주소를 입력해주세요.");
      return;
    }
    setFetchingLedger(true);
    try {
      const url = `/api/building-ledger?sigunguCd=${sigunguCd}&bjdongCd=${bjdongCd}&bun=${bun}&ji=${ji}&platGbCd=${platGbCd}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || json.message || "건축물대장 조회에 실패했습니다.");
        return;
      }
      const ledger = json.data;
      if (ledger) {
        if (ledger.totPkngCnt !== undefined) setParking(ledger.totPkngCnt.toString());
        if (ledger.useAprDay) {
          const rawDate = ledger.useAprDay;
          if (rawDate.length === 8) {
            // YYYYMMDD -> YYYY-MM-DD (보통 입주일 대신 메모나 특징에 활용할 수도 있음)
            setMoveInDate(`${rawDate.substring(0,4)}년 ${rawDate.substring(4,6)}월 승인`);
          }
        }
        if (ledger.grndFlrCnt) setTotalFloor(ledger.grndFlrCnt.toString());
        if (ledger.totArea) {
           setSupplyM2(ledger.totArea.toString());
           setSupplyPy((Number(ledger.totArea) * 0.3025).toFixed(1));
        }
        
        let p = ledger.mainPurpsCdNm || "";
        if (p.includes("단독주택") || p.includes("다가구") || p.includes("다세대")) {
           setPropertyType("빌라·주택");
           setSubCategory("빌라/연립");
        } else if (p.includes("근린생활") || p.includes("상업") || p.includes("업무")) {
           setPropertyType("상가·사무실·건물·공장·토지");
           setSubCategory(p.includes("업무") ? "사무실" : "상가");
        }

        const addInfo = [];
        if (p) addInfo.push(`주용도: ${p}`);
        if (ledger.strctCdNm) addInfo.push(`구조: ${ledger.strctCdNm}`);
        if (ledger.rideUseElvtCnt || ledger.emgenUseElvtCnt) {
          addInfo.push(`승강기: 승용 ${ledger.rideUseElvtCnt || 0}대 / 비상용 ${ledger.emgenUseElvtCnt || 0}대`);
        }
        if (addInfo.length > 0) {
          setDescription(prev => (prev ? prev + "\n" : "") + "■ 건축물대장 정보 ■\n" + addInfo.join("\n"));
        }
        
        alert("건축물대장 정보를 성공적으로 불러와 빈칸을 채웠습니다!");
      }
    } catch (e) {
      console.error(e);
      alert("건축물대장 연동 중 오류가 발생했습니다.");
    } finally {
      setFetchingLedger(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 2) {
      if (!deposit) {
        const el = document.getElementById("input-deposit");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.focus();
        return;
      }
      if ((tradeType === "월세" || tradeType === "단기") && !monthly) {
        const el = document.getElementById("input-monthly");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.focus();
        return;
      }
      if (!exclusiveM2 && !exclusivePy) {
        const el = areaUnit === "m2" ? document.getElementById("input-exclusiveM2") : document.getElementById("input-exclusivePy");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.focus();
        return;
      }
    }
    
    if (currentStep === 1) {
      if (!sido) {
        const el = document.getElementById("input-sido");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.focus();
        return;
      }
      if (!sigungu) {
        const el = document.getElementById("input-sigungu");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.focus();
        return;
      }
      if (!dong) {
        const el = document.getElementById("input-dong");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.focus();
        return;
      }
      if (!detailAddr) {
        const el = document.getElementById("input-detailAddr");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.focus();
        return;
      }
    }
    
    setCurrentStep(s => s + 1);
  };

  const StepIndicator = () => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"16px 24px 8px", gap:0 }}>
      {STEP_LABELS.map((label, i) => {
        const step = i + 1;
        const isActive = currentStep === step;
        const isDone = currentStep > step;
        return (
          <React.Fragment key={step}>
            {i > 0 && <div style={{ width:28, height:2, background: isDone ? "#10b981" : "#e5e7eb", flexShrink:0 }} />}
            <div onClick={() => { if (isDone || isActive) setCurrentStep(step); }} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, cursor: isDone || isActive ? "pointer" : "default", minWidth: 52 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color: isActive ? "#fff" : isDone ? "#fff" : "#9ca3af", background: isActive ? "#1a73e8" : isDone ? "#10b981" : "#e5e7eb", transition:"all 0.2s" }}>
                {isDone ? "✓" : step}
              </div>
              <span style={{ fontSize:11, fontWeight: isActive ? 800 : 500, color: isActive ? "#1a73e8" : isDone ? "#10b981" : "#9ca3af", whiteSpace:"nowrap" }}>{label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );

  const BottomNav = () => (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:50, background:"#fff", borderTop:"1px solid #e5e7eb", padding:"10px 16px", paddingBottom:"max(10px, env(safe-area-inset-bottom))", display:"flex", gap:8, alignItems:"center", transform: isKeyboardOpen ? 'translateY(100%)' : 'translateY(0)', transition: 'transform 0.2s ease' }}>
      <button type="button" disabled={submitting} onClick={()=>handleSubmit("DRAFT")}
        style={{ height:46, padding:"0 14px", background:"#f9fafb", color:"#6b7280", border:"1px solid #d1d5db", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer", flexShrink:0 }}>
        💾 임시저장
      </button>
      <div style={{ flex:1 }} />
      {currentStep > 1 && (
        <button type="button" onClick={()=>setCurrentStep(s=>s-1)}
          style={{ height:46, padding:"0 20px", background:"#fff", color:"#374151", border:"1px solid #d1d5db", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer" }}>
          ← 이전
        </button>
      )}
      {currentStep < TOTAL_STEPS ? (
        <button type="button" onClick={handleNextStep}
          style={{ height:46, padding:"0 24px", background:"#1a73e8", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:800, cursor:"pointer", boxShadow:"0 4px 12px rgba(26,115,232,0.25)" }}>
          다음 →
        </button>
      ) : (
        <button type="button" disabled={submitting} onClick={()=>handleSubmit("ACTIVE")}
          style={{ height:46, padding:"0 24px", background: submitting?"#9ca3af":"linear-gradient(135deg,#10b981,#059669)", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:800, cursor: submitting?"not-allowed":"pointer", boxShadow:"0 2px 8px rgba(16,185,129,0.3)" }}>
          {submitting ? "처리중..." : editId ? "✅ 수정완료" : "✅ 광고등록"}
        </button>
      )}
    </div>
  );

  return (
    <div style={{ minHeight:"100dvh", background:"#f4f5f7", fontFamily:"'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* 헤더 */}
      <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:50, background:"#fff", borderBottom:"1px solid #e5e7eb", padding:"0 16px", height:56, display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={() => { if (currentStep > 1) { setCurrentStep(s=>s-1); } else { router.replace("/m/admin/vacancy"); }}} style={{ background:"none", border:"none", cursor:"pointer", padding:4, display:"flex" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize:18, fontWeight:800, color:"#111", margin:0, flex:1 }}>{editId ? "공실수정" : "공실등록"} <span style={{fontSize:13, color:"#6b7280", fontWeight:600}}>({currentStep}/{TOTAL_STEPS})</span></h1>
      </div>
      <div style={{ height:56 }} />

      <StepIndicator />
      <div style={{ padding:"8px 16px 100px" }}>
        {/* ═══ STEP 1: 분류/주소 ═══ */}
        {currentStep === 1 && (<>
        {/* 1. 공실광고분류 */}
        <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.03)", border:"1px solid #f3f4f6" }}>
          <div style={{ fontSize:16, fontWeight:800, color:"#111", borderLeft:"4px solid #1a73e8", paddingLeft:10, marginBottom:14 }}>공실광고분류</div>
          <label style={labelStyle}>대분류</label>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:12 }}>
            {Object.keys(SUB_CATEGORIES).map(t => <SBtn key={t} label={t} sel={propertyType===t} onClick={() => { 
              setPropertyType(t); 
              const defaultSub = SUB_CATEGORIES[t][0] || "";
              setSubCategory(defaultSub); 
              if (defaultSub === "원룸" || defaultSub === "1.5룸") setRoomCount("1");
              if (defaultSub === "투룸") setRoomCount("2");
            }} />)}
          </div>
          <label style={labelStyle}>소분류</label>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {(SUB_CATEGORIES[propertyType]||[]).map(s => <SBtn key={s} label={s} sel={subCategory===s} onClick={() => {
              setSubCategory(s);
              if (s === "원룸" || s === "1.5룸") setRoomCount("1");
              if (s === "투룸") setRoomCount("2");
            }} />)}
          </div>
        </div>

        {/* 4. 주소 */}
        <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.03)", border:"1px solid #f3f4f6" }}>
          <div style={{ fontSize:16, fontWeight:800, color:"#111", borderLeft:"4px solid #1a73e8", paddingLeft:10, marginBottom:14 }}>위치/주소</div>
          <button type="button" onClick={handlePostcodeSearch} style={{ width:"100%", height:46, background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:800, cursor:"pointer", marginBottom:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:"0 2px 8px rgba(16,185,129,0.2)" }}>
            🔍 주소 검색
          </button>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <div style={{flex:1}}><label style={labelStyle}>시/도</label><input id="input-sido" type="text" value={sido} onChange={e=>setSido(e.target.value)} placeholder="서울" style={inputStyle}/></div>
            <div style={{flex:1}}><label style={labelStyle}>시/군/구</label><input id="input-sigungu" type="text" value={sigungu} onChange={e=>setSigungu(e.target.value)} placeholder="강남구" style={inputStyle}/></div>
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <div style={{flex:1}}><label style={labelStyle}>동/읍/면</label><input id="input-dong" type="text" value={dong} onChange={e=>setDong(e.target.value)} placeholder="논현동" style={inputStyle}/></div>
            <div style={{flex:1}}><label style={labelStyle}>건물명 {!isFieldExposed("buildingName") && isRealtor && <PrivateTag/>}</label><input type="text" value={buildingName} onChange={e=>setBuildingName(e.target.value)} placeholder="건물명" style={inputStyle}/></div>
          </div>
          <label style={labelStyle}>상세주소 {!isFieldExposed("detailAddr") && isRealtor && <PrivateTag/>}</label>
          <input id="input-detailAddr" type="text" value={detailAddr} onChange={e=>setDetailAddr(e.target.value)} placeholder="상세주소 입력" style={{...inputStyle, marginBottom:10}}/>

          {/* 동/호수 (아파트인 경우) */}
          {propertyType === "아파트·오피스텔" && (
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              <div style={{flex:1}}><label style={labelStyle}>동 {!isFieldExposed("aptDong") && isRealtor && <PrivateTag/>}</label><input type="text" value={aptDong} onChange={e=>setAptDong(e.target.value)} placeholder="101동" style={inputStyle}/></div>
              <div style={{flex:1}}><label style={labelStyle}>호수 {!isFieldExposed("hosu") && isRealtor && <PrivateTag/>}</label><input type="text" value={hosu} onChange={e=>setHosu(e.target.value)} placeholder="405호" style={inputStyle}/></div>
            </div>
          )}
          {propertyType !== "아파트·오피스텔" && (
            <div style={{ marginBottom:10 }}>
              <label style={labelStyle}>호수 {!isFieldExposed("hosu") && isRealtor && <PrivateTag/>}</label>
              <input type="text" value={hosu} onChange={e=>setHosu(e.target.value)} placeholder="101호" style={inputStyle}/>
            </div>
          )}

          {/* 주소 공개 설정 */}
          {isRealtor && (
            <div style={{ background:"#f9fafb", padding:12, borderRadius:10, border:"1px solid #e5e7eb", marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#374151", marginBottom:8 }}>🔒 주소 노출 범위</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {propertyType === "아파트·오피스텔" ? (
                  <>
                    {["동/호수공개","동수공개","비공개"].map(opt => (
                      <label key={opt} style={{ display:"flex", alignItems:"center", gap:4, fontSize:13, cursor:"pointer", padding:"6px 10px", borderRadius:8, background: addressExposure===opt?"#eff6ff":"#fff", border: addressExposure===opt?"1px solid #1a73e8":"1px solid #d1d5db" }}>
                        <input type="radio" name="addrExp" checked={addressExposure===opt} onChange={()=>setAddressExposure(opt)} style={{accentColor:"#1a73e8"}}/>
                        {opt === "비공개" ? "동호수비공개" : opt}
                      </label>
                    ))}
                  </>
                ) : (
                  <>
                    {["번지공개","본번지만공개","기본주소만공개"].map(opt => (
                      <label key={opt} style={{ display:"flex", alignItems:"center", gap:4, fontSize:13, cursor:"pointer", padding:"6px 10px", borderRadius:8, background: addressExposure===opt?"#eff6ff":"#fff", border: addressExposure===opt?"1px solid #1a73e8":"1px solid #d1d5db" }}>
                        <input type="radio" name="addrExp" checked={addressExposure===opt} onChange={()=>setAddressExposure(opt)} style={{accentColor:"#1a73e8"}}/>
                        {opt}
                      </label>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          <button type="button" onClick={handleGeocode} style={{ width:"100%", height:40, background:"#374151", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>
            📍 좌표 자동설정
          </button>
          {coords && <div style={{ marginTop:6, fontSize:12, color:"#10b981", fontWeight:600 }}>✓ 좌표: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</div>}

          {/* 주변환경 (좌표 기반 자동생성) */}
          <div style={{ marginTop:12 }}>
            <label style={labelStyle}>🏙️ 주변환경 (좌표 기반 자동생성)</label>
            <div style={{ background:"#f9fafb", border:"1px solid #e5e7eb", borderRadius:8, padding:12, fontSize:13, color:"#6b7280" }}>
              {Object.keys(infrastructure).length > 0 ? (
                Object.entries(infrastructure).map(([category, items]: [string, any]) => (
                  <div key={category} style={{ marginBottom:6 }}>
                    <strong style={{ color:"#374151" }}>{category}:</strong> {Array.isArray(items) ? items.join(", ") : ""}
                  </div>
                ))
              ) : (
                "위 '좌표 자동설정' 버튼을 누르면 주변 인프라가 자동 검색됩니다."
              )}
            </div>
          </div>
        </div>
        </>)}

        {/* ═══ STEP 2: 가격/면적 ═══ */}
        {currentStep === 2 && (<>

        {propertyType !== "아파트·오피스텔" && propertyType !== "빌라·주택" && propertyType !== "원룸·투룸(풀옵션)" && subCategory !== "토지" && (
          <div style={{ padding: "0 16px 12px" }}>
            <button 
              type="button" 
              onClick={fetchBuildingLedger}
              disabled={fetchingLedger}
              style={{ 
                width: "100%", height: 46, 
                background: fetchingLedger ? "#e5e7eb" : "linear-gradient(135deg, #fef3c7, #fde68a)", 
                color: fetchingLedger ? "#9ca3af" : "#d97706", 
                border: "none", borderRadius: 10, fontSize: 15, fontWeight: 800, 
                cursor: fetchingLedger ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: fetchingLedger ? "none" : "0 4px 12px rgba(217,119,6,0.15)", transition: "all 0.2s"
              }}
            >
              <span style={{ fontSize: 18 }}>{fetchingLedger ? "⏳" : "✨"}</span>
              {fetchingLedger ? "AI 데이터 불러오는 중..." : "AI 건축물대장 자동완성"}
            </button>
          </div>
        )}
        {/* 2. 거래/금액 */}
        <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.03)", border:"1px solid #f3f4f6" }}>
          <div style={{ fontSize:16, fontWeight:800, color:"#111", borderLeft:"4px solid #1a73e8", paddingLeft:10, marginBottom:14 }}>거래정보</div>
          <label style={labelStyle}>거래유형</label>
          <div style={{ display:"flex", gap:8, marginBottom:14 }}>
            {["매매","전세","월세","단기"]
              .filter(t => !(propertyType === "원룸·투룸(풀옵션)" && t === "매매"))
              .map(t => <SBtn key={t} label={t} sel={tradeType===t} onClick={() => setTradeType(t)} />)}
          </div>

          <label style={labelStyle}>{tradeType==="매매"?"매매가":"보증금"} {deposit && <span style={{color:"#1a73e8", fontWeight:600}}>{formatKorean(deposit)}</span>}</label>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
            <input id="input-deposit" type="number" value={deposit} onChange={e=>setDeposit(e.target.value)} placeholder="만원 단위" style={inputStyle} />
            <span style={{ color:"#6b7280", fontSize:13, flexShrink:0 }}>만원</span>
          </div>

          {(tradeType==="월세"||tradeType==="단기") && (<>
            <label style={labelStyle}>월세 {monthly && <span style={{color:"#1a73e8",fontWeight:600}}>{formatKorean(monthly)}</span>}</label>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
              <input id="input-monthly" type="number" value={monthly} onChange={e=>setMonthly(e.target.value)} placeholder="만원 단위" style={inputStyle} />
              <span style={{ color:"#6b7280", fontSize:13, flexShrink:0 }}>만원</span>
            </div>
          </>)}

          <label style={labelStyle}>관리비</label>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <input type="number" value={maintenance} onChange={e=>setMaintenance(e.target.value)} placeholder="만원 단위" style={inputStyle} />
            <span style={{ color:"#6b7280", fontSize:13, flexShrink:0 }}>만원</span>
          </div>
        </div>

        {/* 3. 면적·층수 (Step 1 통합) */}
        <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.03)", border:"1px solid #f3f4f6" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div style={{ fontSize:16, fontWeight:800, color:"#111", borderLeft:"4px solid #1a73e8", paddingLeft:10 }}>면적·층수</div>
            <div style={{ display:"flex", borderRadius:8, overflow:"hidden", border:"1px solid #e5e7eb" }}>
              <button type="button" onClick={()=>setAreaUnit("m2")} style={{ padding:"6px 14px", fontSize:12, fontWeight:800, border:"none", cursor:"pointer", background: areaUnit==="m2"?"#1a73e8":"#fff", color: areaUnit==="m2"?"#fff":"#6b7280" }}>m²</button>
              <button type="button" onClick={()=>setAreaUnit("py")} style={{ padding:"6px 14px", fontSize:12, fontWeight:800, border:"none", cursor:"pointer", background: areaUnit==="py"?"#1a73e8":"#fff", color: areaUnit==="py"?"#fff":"#6b7280" }}>평</button>
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginBottom:4 }}>
            <div style={{flex:1}}>
              <label style={labelStyle}>공급면적({areaUnit==="m2"?"m²":"평"})</label>
              {areaUnit==="m2" ? (
                <input type="number" value={supplyM2} onChange={e=>handleM2Change(e.target.value, setSupplyM2, setSupplyPy)} placeholder="84" style={inputStyle}/>
              ) : (
                <input type="number" value={supplyPy} onChange={e=>handlePyChange(e.target.value, setSupplyPy, setSupplyM2)} placeholder="25.4" style={inputStyle}/>
              )}
            </div>
            <div style={{flex:1}}>
              <label style={labelStyle}>전용면적({areaUnit==="m2"?"m²":"평"})</label>
              {areaUnit==="m2" ? (
                <input id="input-exclusiveM2" type="number" value={exclusiveM2} onChange={e=>handleM2Change(e.target.value, setExclusiveM2, setExclusivePy)} placeholder="59" style={inputStyle}/>
              ) : (
                <input id="input-exclusivePy" type="number" value={exclusivePy} onChange={e=>handlePyChange(e.target.value, setExclusivePy, setExclusiveM2)} placeholder="17.8" style={inputStyle}/>
              )}
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginBottom:10, fontSize:12, color:"#1a73e8", fontWeight:600, padding:"0 2px" }}>
            <div style={{flex:1}}>{supplyM2 ? (areaUnit==="m2" ? `≈ ${(parseFloat(supplyM2)*0.3025).toFixed(1)}평` : `≈ ${parseFloat(supplyM2).toFixed(1)}m²`) : ""}</div>
            <div style={{flex:1}}>{exclusiveM2 ? (areaUnit==="m2" ? `≈ ${(parseFloat(exclusiveM2)*0.3025).toFixed(1)}평` : `≈ ${parseFloat(exclusiveM2).toFixed(1)}m²`) : ""}</div>
          </div>
          {propertyType === "빌라·주택" && tradeType === "매매" && (
            <>
              <div style={{ display:"flex", gap:10, marginBottom:4 }}>
                <div style={{flex:1}}>
                  <label style={labelStyle}>대지지분({areaUnit==="m2"?"m²":"평"})</label>
                  {areaUnit==="m2" ? (
                    <input type="number" value={landShareM2} onChange={e=>handleM2Change(e.target.value, setLandShareM2, setLandSharePy)} placeholder="33" style={inputStyle}/>
                  ) : (
                    <input type="number" value={landSharePy} onChange={e=>handlePyChange(e.target.value, setLandSharePy, setLandShareM2)} placeholder="10" style={inputStyle}/>
                  )}
                </div>
                <div style={{flex:1}}></div>
              </div>
              <div style={{ display:"flex", gap:10, marginBottom:10, fontSize:12, color:"#1a73e8", fontWeight:600, padding:"0 2px" }}>
                <div style={{flex:1}}>{landShareM2 ? (areaUnit==="m2" ? `≈ ${(parseFloat(landShareM2)*0.3025).toFixed(1)}평` : `≈ ${parseFloat(landShareM2).toFixed(1)}m²`) : ""}</div>
                <div style={{flex:1}}></div>
              </div>
            </>
          )}
          <div style={{ display:"flex", gap:10, marginBottom:10 }}>
            <div style={{flex:1}}><label style={labelStyle}>전체층</label><input type="number" value={totalFloor} onChange={e=>setTotalFloor(e.target.value)} placeholder="15" style={inputStyle}/></div>
            <div style={{flex:1}}><label style={labelStyle}>해당층 <span style={{fontSize:11, color:"#9ca3af", fontWeight:400}}>(직접입력)</span></label><input type="text" inputMode="numeric" value={currentFloor} onChange={e=>setCurrentFloor(e.target.value)} placeholder="예: 3" style={inputStyle}/></div>
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
            {['반지하', '옥탑', '지하 1층', '지하 2층', '전체층'].map(f => (
              <button 
                key={f} 
                type="button" 
                onClick={() => setCurrentFloor(f)} 
                style={{ 
                  padding:"4px 12px", borderRadius:20, 
                  border: currentFloor === f ? "1px solid #1a73e8" : "1px solid #e5e7eb", 
                  background: currentFloor === f ? "#1a73e8" : "#fff", 
                  fontSize:12, fontWeight: currentFloor === f ? 800 : 600, 
                  color: currentFloor === f ? "#fff" : "#6b7280", 
                  boxShadow: currentFloor === f ? "0 2px 6px rgba(26,115,232,0.15)" : "none",
                  cursor:"pointer", transition:"all 0.15s ease" 
                }}
              >
                {f}
              </button>
            ))}
          </div>
          {!isCommercial && (
            <div style={{ display:"flex", gap:10 }}>
              <div style={{flex:1}}>
                <label style={labelStyle}>방</label>
                <select value={roomCount} onChange={e=>setRoomCount(e.target.value)} style={{...inputStyle, cursor:"pointer"}}>
                  {["1","2","3","4개 이상"].map(n=><option key={n}>{n}</option>)}
                </select>
              </div>
              <div style={{flex:1}}>
                <label style={labelStyle}>욕실</label>
                <select value={bathCount} onChange={e=>setBathCount(e.target.value)} style={{...inputStyle, cursor:"pointer"}}>
                  {["1","2","3개 이상"].map(n=><option key={n}>{n}</option>)}
                </select>
              </div>
              <div style={{flex:1}}>
                <label style={labelStyle}>방향</label>
                <select value={direction} onChange={e=>setDirection(e.target.value)} style={{...inputStyle, cursor:"pointer"}}>
                  <option value="">선택</option>
                  {["남향","남동향","남서향","동향","서향","북향"].map(d=><option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* 주차·입주 (Step 1 통합) */}
        <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.03)", border:"1px solid #f3f4f6" }}>
          <div style={{ fontSize:16, fontWeight:800, color:"#111", borderLeft:"4px solid #1a73e8", paddingLeft:10, marginBottom:14 }}>주차·입주</div>
          <div style={{ display:"flex", gap:10 }}>
            <div style={{flex:1}}>
              <label style={labelStyle}>주차</label>
              <select value={parking} onChange={e=>setParking(e.target.value)} style={{...inputStyle,cursor:"pointer"}}>
                {["없음","가능","1대", (propertyType === "아파트·오피스텔" || propertyType === "빌라·주택") ? "2대이상" : "2대", "3대이상"].map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div style={{flex:1}}>
              <label style={labelStyle}>입주가능일</label>
              <select value={moveInDate} onChange={e=>setMoveInDate(e.target.value)} style={{...inputStyle,cursor:"pointer"}}>
                {["즉시입주(공실)","1개월 이내","2개월 이내","3개월 이내","날짜 협의"].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </div>
        </>)}

        {/* ═══ STEP 3: 사진·상세 ═══ */}
        {currentStep === 3 && (<>
        {/* 5. 추가 */}
        <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.03)", border:"1px solid #f3f4f6" }}>
          <div style={{ fontSize:16, fontWeight:800, color:"#111", borderLeft:"4px solid #1a73e8", paddingLeft:10, marginBottom:14 }}>상세정보</div>
          {/* 옵션 & 테마 & 주변환경 */}
          <div>
            {/* 테마 */}
            <label style={labelStyle}>테마 선택</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {currentThemeList.map(t => (
                <button 
                  key={t} 
                  type="button" 
                  onClick={()=>toggleTheme(t)} 
                  style={{ 
                    padding:"6px 14px", 
                    borderRadius:20, 
                    fontSize:12, 
                    fontWeight: selectedThemes.includes(t) ? 800 : 600, 
                    cursor:"pointer", 
                    border: selectedThemes.includes(t) ? "1px solid #1a73e8" : "1px solid #e5e7eb", 
                    background: selectedThemes.includes(t) ? "#1a73e8" : "#fff", 
                    color: selectedThemes.includes(t) ? "#fff" : "#6b7280",
                    boxShadow: selectedThemes.includes(t) ? "0 2px 6px rgba(26,115,232,0.15)" : "none",
                    transition:"all 0.15s ease"
                  }}
                >
                  {t.startsWith('#')?t:`#${t}`}
                </button>
              ))}
            </div>
            <div style={{ display:"flex", gap:6, marginBottom: 16 }}>
              <input type="text" value={customThemeInput} onChange={e=>setCustomThemeInput(e.target.value)} placeholder="직접 입력 (예: 반려동물)" style={{...inputStyle, flex:1}} onKeyDown={e=>{if(e.key==='Enter') {e.preventDefault(); addCustomTheme();}}} />
              <button type="button" onClick={addCustomTheme} style={{ background:"#374151", color:"#fff", border:"none", borderRadius:10, padding:"0 16px", fontWeight:700, fontSize:13 }}>추가</button>
            </div>

            {/* 옵션 */}
            <label style={labelStyle}>옵션 선택</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {currentOptionList.map(opt => (
                <button 
                  key={opt} 
                  type="button" 
                  onClick={()=>toggleOption(opt)} 
                  style={{ 
                    padding:"6px 14px", 
                    borderRadius:8, 
                    fontSize:12, 
                    fontWeight: selectedOptions.includes(opt) ? 800 : 600, 
                    cursor:"pointer", 
                    border: selectedOptions.includes(opt) ? "1px solid #1a73e8" : "1px solid #e5e7eb", 
                    background: selectedOptions.includes(opt) ? "#1a73e8" : "#fff", 
                    color: selectedOptions.includes(opt) ? "#fff" : "#6b7280",
                    boxShadow: selectedOptions.includes(opt) ? "0 2px 6px rgba(26,115,232,0.15)" : "none",
                    transition:"all 0.15s ease"
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
            <div style={{ display:"flex", gap:6, marginBottom: 16 }}>
              <input type="text" value={customOptionInput} onChange={e=>setCustomOptionInput(e.target.value)} placeholder="직접 입력 (예: 붙박이장)" style={{...inputStyle, flex:1}} onKeyDown={e=>{if(e.key==='Enter') {e.preventDefault(); addCustomOption();}}} />
              <button type="button" onClick={addCustomOption} style={{ background:"#374151", color:"#fff", border:"none", borderRadius:10, padding:"0 16px", fontWeight:700, fontSize:13 }}>추가</button>
            </div>
          </div>

          <div style={{ marginTop: 16, borderTop: "1px dashed #e5e7eb", paddingTop: 16 }}>
            <label style={labelStyle}>전달사항 / 공실광고설명</label>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="공실광고에 대한 추가 설명을 입력하세요" rows={4} style={{ ...inputStyle, height:"auto", padding:12, resize:"vertical", lineHeight:1.5 }}/>
          </div>
        </div>

        {/* 6. 사진 */}
        <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.03)", border:"1px solid #f3f4f6" }}>
          <div style={{ fontSize:16, fontWeight:800, color:"#111", borderLeft:"4px solid #1a73e8", paddingLeft:10, marginBottom:14 }}>사진 등록 ({photoPreview.length}/5)</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
            {photoPreview.map((src,i) => (
              <div key={i} style={{ position:"relative", width:80, height:80, borderRadius:10, overflow:"hidden", border:"1px solid #e5e7eb" }}>
                <img src={src} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                <button onClick={()=>removePhoto(i)} style={{ position:"absolute", top:2, right:2, width:22, height:22, borderRadius:"50%", background:"rgba(0,0,0,0.6)", color:"#fff", border:"none", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
              </div>
            ))}
            {photoPreview.length < 5 && (
              <>
                <label style={{ width:80, height:80, borderRadius:10, border:"2px dashed #d1d5db", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:28, color:"#9ca3af", background:"#f9fafb" }}>
                  +<input type="file" accept="image/*" multiple hidden onChange={handlePhotoChange}/>
                </label>
                <button type="button" onClick={openPhotoDbModal} style={{ width:80, height:80, borderRadius:10, border:"2px dashed #d1d5db", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#9ca3af", background:"#fff" }}>
                  <span style={{ fontSize:20, fontWeight:800 }}>DB</span>
                  <span style={{ fontSize:10, marginTop:4, fontWeight:700 }}>포토DB</span>
                </button>
              </>
            )}
          </div>
        </div>
        </>)}

        {/* ═══ STEP 4: 최종확인 ═══ */}
        {currentStep === 4 && (<>
        {/* 미리보기 요약 */}
        <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.03)", border:"1px solid #10b981" }}>
          <div style={{ fontSize:16, fontWeight:800, color:"#10b981", borderLeft:"4px solid #10b981", paddingLeft:10, marginBottom:14 }}>입력 정보 요약</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10, fontSize:14, color:"#374151" }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{color:"#6b7280"}}>매물유형</span><span style={{fontWeight:700}}>{propertyType} · {subCategory}</span></div>
            <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{color:"#6b7280"}}>거래유형</span><span style={{fontWeight:700}}>{tradeType}</span></div>
            <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{color:"#6b7280"}}>{tradeType==="매매"?"매매가":"보증금"}</span><span style={{fontWeight:700, color:"#ef4444"}}>{deposit ? formatKorean(deposit) : "미입력"}</span></div>
            {(tradeType==="월세"||tradeType==="단기") && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{color:"#6b7280"}}>월세</span><span style={{fontWeight:700, color:"#ef4444"}}>{monthly ? formatKorean(monthly) : "미입력"}</span></div>}
            <div style={{ borderTop:"1px dashed #e5e7eb", paddingTop:10 }} />
            <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{color:"#6b7280"}}>위치</span><span style={{fontWeight:700}}>{[sido,sigungu,dong].filter(Boolean).join(" ") || "미입력"}</span></div>
            <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{color:"#6b7280"}}>면적</span><span style={{fontWeight:700}}>{exclusiveM2 ? `전용 ${exclusiveM2}m²` : "미입력"}{supplyM2 ? ` / 공급 ${supplyM2}m²` : ""}</span></div>
            {!isCommercial && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{color:"#6b7280"}}>방/욕실/방향</span><span style={{fontWeight:700}}>{roomCount}방 {bathCount}욕실 {direction}</span></div>}
            <div style={{ borderTop:"1px dashed #e5e7eb", paddingTop:10 }} />
            <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{color:"#6b7280"}}>사진</span><span style={{fontWeight:700}}>{photoPreview.length}장 등록됨</span></div>
            <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{color:"#6b7280"}}>좌표</span><span style={{fontWeight:700, color: coords ? "#10b981" : "#ef4444"}}>{coords ? "✓ 설정됨" : "✗ 미설정"}</span></div>
            {selectedThemes.length > 0 && <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap" }}><span style={{color:"#6b7280"}}>테마</span><span style={{fontWeight:600, color:"#1a73e8"}}>{selectedThemes.map(t=>`#${t}`).join(" ")}</span></div>}
            {!isRealtor && (
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{color:"#6b7280"}}>중개보수</span>
                <span style={{fontWeight:700, color:"#1a73e8"}}>{commissionType}{commissionEtc ? ` (${commissionEtc})` : ""}</span>
              </div>
            )}
          </div>
          <div style={{ marginTop:12, display:"flex", gap:6 }}>
            {[1,2,3].map(s => (
              <button key={s} type="button" onClick={()=>setCurrentStep(s)} style={{ flex:1, height:36, background:"#eff6ff", color:"#1a73e8", border:"1px solid #bfdbfe", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                {STEP_LABELS[s-1]} 수정
              </button>
            ))}
          </div>
        </div>

        {/* 7. 등록자 / 부동산 기업 정보 */}
        {isRealtor ? (
          <div style={{ background:"#f9fafb", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.03)", border:"1px solid #e5e7eb" }}>
            <div style={{ fontSize:15, fontWeight:800, color:"#111", borderLeft:"4px solid #1a73e8", paddingLeft:10, marginBottom:14 }}>부동산 / 기업 정보</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px 10px", marginBottom:12 }}>
              <div><label style={{...labelStyle,fontSize:12,marginBottom:4}}>상호명</label><input type="text" value={rCompany} onChange={e=>setRCompany(e.target.value)} style={{...inputStyle, background:"#fff"}}/></div>
              <div><label style={{...labelStyle,fontSize:12,marginBottom:4}}>중개등록번호</label><input type="text" value={rRegNum} onChange={e=>setRRegNum(e.target.value)} style={{...inputStyle, background:"#fff"}}/></div>
              <div><label style={{...labelStyle,fontSize:12,marginBottom:4}}>대표자명</label><input type="text" value={rBoss} onChange={e=>setRBoss(e.target.value)} style={{...inputStyle, background:"#fff"}}/></div>
              <div><label style={{...labelStyle,fontSize:12,marginBottom:4}}>사업자등록번호</label><input type="text" value={rBizNum} onChange={e=>setRBizNum(e.target.value)} style={{...inputStyle, background:"#fff"}}/></div>
              <div><label style={{...labelStyle,fontSize:12,marginBottom:4}}>일반번호</label><input type="tel" value={rTel} onChange={e=>setRTel(formatPhone(e.target.value))} style={{...inputStyle, background:"#fff"}}/></div>
              <div><label style={{...labelStyle,fontSize:12,marginBottom:4}}>휴대번호</label><input type="tel" value={rCell} onChange={e=>setRCell(formatPhone(e.target.value))} style={{...inputStyle, background:"#fff"}}/></div>
            </div>
            <div>
              <label style={{...labelStyle,fontSize:12,marginBottom:4}}>부동산 주소</label>
              <input type="text" value={rAddr} onChange={e=>setRAddr(e.target.value)} style={{...inputStyle, background:"#fff"}}/>
            </div>
          </div>
        ) : (
          <>
            {/* 7-1. 중개수수료 동의 및 지급여부 설정 */}
            <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.03)", border:"1px solid #f3f4f6" }}>
              <div style={{ fontSize:16, fontWeight:800, color:"#111", borderLeft:"4px solid #1a73e8", paddingLeft:10, marginBottom:14 }}>중개수수료</div>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:14, fontWeight:600, color:"#374151", flexShrink:0 }}>
                    <input type="radio" checked readOnly style={{ accentColor:"#1a73e8", width:18, height:18 }} />
                    법정수수료 지급
                  </label>
                  <input type="text" placeholder="예: 추가사항 입력 (선택)" value={commissionEtc} onChange={(e) => setCommissionEtc(e.target.value)}
                    style={{ ...inputStyle, flex:1, height:38, fontSize:13 }} />
                </div>
                <div style={{ background:"#eff6ff", borderRadius:10, padding:"12px 14px", fontSize:12, color:"#1e40af", border:"1px solid #bfdbfe", lineHeight:1.5 }}>
                  ⓘ 공실광고의뢰서 작성자는 법정수수료를 지급하는 것에 대하여 동의하며, 중개수수료 지급관련 민원이 발생될 경우 <strong>공실뉴스</strong> 공실광고 등록에 제한이 될 수 있음을 확인합니다.
                </div>
              </div>
            </div>

            {/* 7-2. 등록자 정보 및 관계 */}
            <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.03)", border:"1px solid #f3f4f6" }}>
              <div style={{ fontSize:16, fontWeight:800, color:"#111", borderLeft:"4px solid #1a73e8", paddingLeft:10, marginBottom:14 }}>등록자 정보</div>
              <div style={{ display:"flex", gap:10, marginBottom:12 }}>
                <div style={{flex:1}}><label style={labelStyle}>이름</label><input type="text" value={clientName} onChange={e=>setClientName(e.target.value)} style={inputStyle}/></div>
                <div style={{flex:1}}><label style={labelStyle}>연락처</label><input type="tel" value={clientPhone} onChange={e=>setClientPhone(formatPhone(e.target.value))} placeholder="010-0000-0000" style={inputStyle}/></div>
              </div>
              <div>
                <label style={labelStyle}>소유주와의 관계</label>
                <select value={ownerRelation} onChange={(e) => setOwnerRelation(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option>본인</option><option>가족</option><option>지인</option><option>임차인</option><option>법인</option><option>기타</option>
                </select>
              </div>
            </div>
          </>
        )}

        {/* 8. 부동산 전용 (REALTOR/ADMIN만) */}
        {isRealtor && (
          <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.03)", border:"1px solid #f3f4f6" }}>
            <div style={{ fontSize:16, fontWeight:800, color:"#1a73e8", borderLeft:"4px solid #1a73e8", paddingLeft:10, marginBottom:14 }}>부동산 전용</div>

            <label style={labelStyle}>중개보수 지급 <span style={{color:"#ef4444"}}>*</span></label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
              {["공동중개","수수료25%","수수료50%","수수료75%","수수료100%"].map(opt => (
                <button 
                  key={opt} 
                  type="button" 
                  onClick={()=>setRealtorCommission(opt)} 
                  style={{ 
                    padding:"8px 12px", 
                    borderRadius:10, 
                    fontSize:12, 
                    fontWeight: realtorCommission===opt?800:600, 
                    border: realtorCommission===opt?"1px solid #1a73e8":"1px solid #e5e7eb", 
                    background: realtorCommission===opt?"#1a73e8":"#fff", 
                    color: realtorCommission===opt?"#fff":"#374151", 
                    cursor:"pointer",
                    boxShadow: realtorCommission===opt?"0 2px 6px rgba(26,115,232,0.15)":"none",
                    transition:"all 0.15s ease"
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>

            <label style={labelStyle}>노출선택 <span style={{color:"#ef4444"}}>*</span></label>
            <div style={{ display:"flex", gap:10, marginBottom:14 }}>
              <div onClick={()=>setExposureType("부동산노출")} style={{ flex:1, padding:12, borderRadius:10, cursor:"pointer", border: exposureType==="부동산노출"?"1px solid #1a73e8":"1px solid #e5e7eb", background: exposureType==="부동산노출"?"#eff6ff":"#fff", transition:"all 0.15s ease" }}>
                <div style={{ fontSize:14, fontWeight:800, color: exposureType==="부동산노출"?"#1a73e8":"#374151", marginBottom:4 }}>부동산노출</div>
                <div style={{ fontSize:11, color: exposureType==="부동산노출"?"#1a73e8":"#9ca3af", lineHeight:1.4 }}>
                  비로그인, 일반인로그인시 공실광고상세보기는 부동산엔 열람 가능하고<br/>
                  비회원 일반인에게는 비공개
                </div>
              </div>
              <div onClick={()=>setExposureType("부동산노출 + 일반인노출")} style={{ flex:1, padding:12, borderRadius:10, cursor:"pointer", border: exposureType==="부동산노출 + 일반인노출"?"1px solid #1a73e8":"1px solid #e5e7eb", background: exposureType==="부동산노출 + 일반인노출"?"#eff6ff":"#fff", transition:"all 0.15s ease" }}>
                <div style={{ fontSize:14, fontWeight:800, color: exposureType==="부동산노출 + 일반인노출"?"#1a73e8":"#374151", marginBottom:4 }}>부동산+일반인노출</div>
                <div style={{ fontSize:11, color: exposureType==="부동산노출 + 일반인노출"?"#1a73e8":"#9ca3af" }}>모두에게 노출</div>
              </div>
            </div>

            {/* 임대인 정보 */}
            <div style={{ background:"#fff7ed", padding:12, borderRadius:10, border:"1px solid #fed7aa", borderLeft:"4px solid #ea580c" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#ea580c", marginBottom:8 }}>🔐 임대인 정보 (비공개)</div>
              <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                <div style={{flex:1}}><label style={{...labelStyle,fontSize:12}}>임대인명</label><input type="text" value={landlordName} onChange={e=>setLandlordName(e.target.value)} placeholder="이름" style={inputStyle}/></div>
                <div style={{flex:1}}><label style={{...labelStyle,fontSize:12}}>연락처</label><input type="tel" value={landlordPhone} onChange={e=>setLandlordPhone(formatPhone(e.target.value))} placeholder="010-0000-0000" style={inputStyle}/></div>
              </div>
              <label style={{...labelStyle,fontSize:12}}>메모</label>
              <textarea value={landlordMemo} onChange={e=>setLandlordMemo(e.target.value)} placeholder="임대인 특이사항 등 중개사님만 보는 메모" rows={2} style={{...inputStyle, height:"auto", padding:10, resize:"vertical", lineHeight:1.4}}/>
            </div>
          </div>
        )}

        </>)}
      </div>

      <BottomNav />

      {/* ── 포토 DB 모달 ── */}
      {showPhotoDbModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 500, maxHeight: "90vh", borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f9fafb" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>포토DB 불러오기</h3>
              <button type="button" onClick={() => setShowPhotoDbModal(false)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#9ca3af" }}>×</button>
            </div>
            
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
              <form onSubmit={handlePhotoDbSearch} style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="이미지 검색어 입력"
                  value={photoDbSearch}
                  onChange={e => setPhotoDbSearch(e.target.value)}
                  style={{ flex: 1, padding: "0 12px", height: 40, border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none" }}
                />
                <button type="submit" style={{ padding: "0 16px", background: "#374151", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>검색</button>
              </form>
            </div>

            <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
              <button type="button" onClick={() => setPhotoDbTab("전체사진")} style={{ flex: 1, padding: "12px 0", border: "none", background: "none", fontSize: 14, fontWeight: photoDbTab === "전체사진" ? 800 : 600, color: photoDbTab === "전체사진" ? "#3b82f6" : "#6b7280", borderBottom: photoDbTab === "전체사진" ? "2px solid #3b82f6" : "2px solid transparent", cursor: "pointer" }}>전체사진</button>
              <button type="button" onClick={() => setPhotoDbTab("즐겨찾기")} style={{ flex: 1, padding: "12px 0", border: "none", background: "none", fontSize: 14, fontWeight: photoDbTab === "즐겨찾기" ? 800 : 600, color: photoDbTab === "즐겨찾기" ? "#3b82f6" : "#6b7280", borderBottom: photoDbTab === "즐겨찾기" ? "2px solid #3b82f6" : "2px solid transparent", cursor: "pointer" }}>즐겨찾기 ⭐️</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "#f3f4f6" }}>
              {isPhotoDbLoading ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#6b7280", fontSize: 14 }}>불러오는 중...</div>
              ) : photoDbItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 14 }}>검색 결과가 없습니다.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 10 }}>
                  {photoDbItems.map((item, idx) => (
                    <div key={idx} style={{ background: "#fff", borderRadius: 8, overflow: "hidden", border: "1px solid #e5e7eb", cursor: "pointer", position: "relative" }} onClick={() => handleSelectFromPhotoDb(item)}>
                      <div style={{ width: "100%", aspectRatio: "1/1", background: "#f3f4f6", backgroundImage: `url(${item.url})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                      <button type="button" onClick={(e) => handleToggleFav(e, item.id, item.is_favorite)} style={{ position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        {item.is_favorite ? "⭐️" : "☆"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function Page() { return <Suspense fallback={null}><MobileVacancyWrite/></Suspense>; }
