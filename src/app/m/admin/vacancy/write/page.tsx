"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { createVacancy, updateVacancy, getVacancyDetail, syncVacancyPhotos, uploadVacancyPhoto } from "@/app/actions/vacancy";
import { getPhotoLibrary, togglePhotoFavorite } from "@/app/actions/article";
import { geocodeAddress } from "@/app/actions/geocode";
import imageCompression from "browser-image-compression";

const SUB_CATEGORIES: Record<string, string[]> = {
  "?„íŒŒ?¸Â·ì˜¤?¼ìŠ¤??: ["?„íŒŒ??, "?„íŒŒ?¸ë¶„?‘ê¶Œ", "?¤í”¼?¤í…”", "?¤í”¼?¤í…”ë¶„ì–‘ê¶?],
  "ë¹Œë¼Â·ì£¼íƒ": ["ë¹Œë¼/?°ë¦½", "?¨ë…/?¤ê?êµ?, "?„ì›ì£¼íƒ", "?ê?ì£¼íƒ"],
  "?ë£¸Â·?¬ë£¸(?€?µì…˜)": ["?ë£¸", "1.5ë£?, "?¬ë£¸"],
  "?ê?Â·?¬ë¬´?¤Â·ê±´ë¬¼Â·ê³µ?¥Â·í† ì§€": ["?ê?", "?¬ë¬´??, "ê³µì¥/ì°½ê³ ", "ê±´ë¬¼", "? ì?"],
};

/* ?€?€ WebP ?•ì¶• (browser-image-compression ?œìš©) ?€?€ */
const compressToWebP = async (file: File, maxWidth = 1920, quality = 0.8): Promise<File> => {
  if (!file.type.startsWith("image/") && !file.name.toLowerCase().endsWith(".heic")) {
    return file;
  }
  try {
    const options = {
      maxSizeMB: 1, // ìµœë? 1MB ?´í•˜ë¡??•ì¶•
      maxWidthOrHeight: maxWidth, // ìµœë? ?´ìƒ???œí•œ
      useWebWorker: true,
      fileType: "image/webp", // WebP ë³€??ê°•ì œ
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
  const STEP_LABELS = ["ë¶„ë¥˜/ì£¼ì†Œ", "ê°€ê²?ë©´ì ", "?¬ì§„Â·?ì„¸", "ìµœì¢…?•ì¸"];

  // ê³µì‹¤ê´‘ê³  ê¸°ë³¸
  
  const [mainUsage, setMainUsage] = useState("");
  const [elevatorCnt, setElevatorCnt] = useState("");
  const [isIllegal, setIsIllegal] = useState(false);
  const [buildingStructure, setBuildingStructure] = useState("");
  const [propertyType, setPropertyTypeRaw] = useState("?„íŒŒ?¸Â·ì˜¤?¼ìŠ¤??);
  const [subCategory, setSubCategory] = useState("?„íŒŒ??);

  // ?€ë¶„ë¥˜ ë³€ê²???ì£¼ì†Œ?¸ì¶œë²”ìœ„ ê¸°ë³¸ê°’ë„ ë§ì¶° ê°±ì‹ 
  const setPropertyType = (type: string) => {
    setPropertyTypeRaw(type);
    if (type === "?„íŒŒ?¸Â·ì˜¤?¼ìŠ¤??) {
      setAddressExposure("ë¹„ê³µê°?);
    } else {
      setAddressExposure("ê¸°ë³¸ì£¼ì†Œë§Œê³µê°?);
    }
  };
  const [tradeType, setTradeType] = useState("ë§¤ë§¤");

  // ê¸ˆì•¡
  const [deposit, setDeposit] = useState("");
  const [monthly, setMonthly] = useState("");
  const [maintenance, setMaintenance] = useState("");

  // ë©´ì /ì¸?
  const [exclusiveM2, setExclusiveM2] = useState("");
  const [exclusivePy, setExclusivePy] = useState("");
  const [supplyM2, setSupplyM2] = useState("");
  const [supplyPy, setSupplyPy] = useState("");
  const [landShareM2, setLandShareM2] = useState("");
  const [landSharePy, setLandSharePy] = useState("");
  const [zoning, setZoning] = useState("");
  const [landPurpose, setLandPurpose] = useState("");
  const [existingMetadata, setExistingMetadata] = useState<any>({});
  const [areaUnit, setAreaUnit] = useState<"m2"|"py">("py");
  const [currentFloor, setCurrentFloor] = useState("");
  const [totalFloor, setTotalFloor] = useState("");
  const [roomCount, setRoomCount] = useState("1");
  const [bathCount, setBathCount] = useState("1");
  const [direction, setDirection] = useState("");

  // ì£¼ì†Œ
  const [sido, setSido] = useState("");
  const [sigungu, setSigungu] = useState("");
  const [dong, setDong] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [detailAddr, setDetailAddr] = useState("");
  const [aptDong, setAptDong] = useState("");
  const [hosu, setHosu] = useState("");
  const [addressExposure, setAddressExposure] = useState("ë¹„ê³µê°?); // ?„íŒŒ?¸Â·ì˜¤?¼ìŠ¤??ê¸°ë³¸ê°?

  // ê¸°í?
  const [parking, setParking] = useState("?†ìŒ");
  const [moveInDate, setMoveInDate] = useState("ì¦‰ì‹œ?…ì£¼(ê³µì‹¤)");
  const [description, setDescription] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [commissionType, setCommissionType] = useState("ë²•ì •?˜ìˆ˜ë£?);
  const [commissionEtc, setCommissionEtc] = useState("");
  const [ownerRelation, setOwnerRelation] = useState("ë³¸ì¸");
  const [coords, setCoords] = useState<{lat:number;lng:number}|null>(null);

  // ?µì…˜/?Œë§ˆ/ì£¼ë??˜ê²½
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [customOptionInput, setCustomOptionInput] = useState("");
  const [customThemeInput, setCustomThemeInput] = useState("");
  const [infrastructure, setInfrastructure] = useState<any>({});

  // ë¶€?™ì‚° ?„ìš©
  const [realtorCommission, setRealtorCommission] = useState("ê³µë™ì¤‘ê°œ");
  const [exposureType, setExposureType] = useState("ë¶€?™ì‚°?¸ì¶œ");
  const [landlordName, setLandlordName] = useState("");
  const [landlordPhone, setLandlordPhone] = useState("");
  const [landlordMemo, setLandlordMemo] = useState("");

  const [rCompany, setRCompany] = useState("ì°©í•œ?„ë?ë¶€?™ì‚°");
  const [rRegNum, setRRegNum] = useState("1666-4414411");
  const [rBoss, setRBoss] = useState("ê¹€?™í˜„");
  const [rBizNum, setRBizNum] = useState("211-33-21777");
  const [rTel, setRTel] = useState("02-541-1611");
  const [rCell, setRCell] = useState("02-541-1611");
  const [rAddr, setRAddr] = useState("?œìš¸ ê°•ë‚¨êµ??¼í˜„??189-13");

  // ?¬ì§„
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string[]>([]);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]); // ?˜ì • ëª¨ë“œ: DB ê¸°ì¡´ ?¬ì§„ URL

  /* ?€?€ ?¬í†  DB ?íƒœ ?€?€ */
  const [showPhotoDbModal, setShowPhotoDbModal] = useState(false);
  const [photoDbItems, setPhotoDbItems] = useState<any[]>([]);
  const [photoDbSearch, setPhotoDbSearch] = useState("");
  const [photoDbTab, setPhotoDbTab] = useState<"?„ì²´?¬ì§„" | "ì¦ê²¨ì°¾ê¸°">("?„ì²´?¬ì§„");
  const [isPhotoDbLoading, setIsPhotoDbLoading] = useState(false);

  const isCommercial = propertyType === "?ê?Â·?¬ë¬´?¤Â·ê±´ë¬¼Â·ê³µ?¥Â·í† ì§€";
  const isRealtor = userRole === "REALTOR" || userRole === "ADMIN";

  // ëª¨ë°”???¤ë³´??ê°ì? (?˜ë‹¨ ë²„íŠ¼ ?¨ê???
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const threshold = window.innerHeight * 0.75;
    const onResize = () => setIsKeyboardOpen(vv.height < threshold);
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  // PC?€ ?™ì¼??ì£¼ì†Œ ê³µê°œ/ë¹„ê³µê°??ì • ë¡œì§
  const isFieldExposed = (field: "detailAddr" | "buildingName" | "aptDong" | "hosu") => {
    if (propertyType === "?„íŒŒ?¸Â·ì˜¤?¼ìŠ¤??) {
      if (field === "detailAddr") return addressExposure !== "ë¹„ê³µê°?;
      if (field === "buildingName") return true;
      if (field === "aptDong") return addressExposure !== "ë¹„ê³µê°?;
      if (field === "hosu") return addressExposure === "???¸ìˆ˜ê³µê°œ";
    } else {
      if (field === "detailAddr") return addressExposure !== "ê¸°ë³¸ì£¼ì†Œë§Œê³µê°?;
      if (field === "buildingName" || field === "hosu") return addressExposure === "ë²ˆì?ê³µê°œ";
    }
    return true;
  };
  const PrivateTag = () => <span style={{ color:"#f97316", fontSize:11, fontWeight:600 }}>(ë¹„ê³µê°?</span>;

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

  // ?˜ì • ëª¨ë“œ: ?°ì´??ë¡œë“œ
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
          if (d.metadata.zoning) setZoning(d.metadata.zoning);
          if (d.metadata.land_purpose) setLandPurpose(d.metadata.land_purpose);
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
        // ê¸°ì¡´ ?¬ì§„ ë¡œë“œ (ì¡°ì¸ ?°ì´????ë³„ë„ ì¿¼ë¦¬ ?´ë°±)
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

  /* ?€?€ ?¬í† DB ë¡œì§ ?€?€ */
  const openPhotoDbModal = () => {
    setShowPhotoDbModal(true);
    setPhotoDbTab("?„ì²´?¬ì§„");
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
      fetchPhotoDb(photoDbSearch, photoDbTab === "ì¦ê²¨ì°¾ê¸°");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoDbTab]);

  const handlePhotoDbSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPhotoDb(photoDbSearch, photoDbTab === "ì¦ê²¨ì°¾ê¸°");
  };

  const handleToggleFav = async (e: React.MouseEvent, photoId: string, currentFav: boolean) => {
    e.stopPropagation();
    const res = await togglePhotoFavorite(photoId, !currentFav);
    if (res.success) {
      setPhotoDbItems(prev => prev.map(p => p.id === photoId ? { ...p, is_favorite: !currentFav } : p));
      if (photoDbTab === "ì¦ê²¨ì°¾ê¸°") {
        fetchPhotoDb(photoDbSearch, true);
      }
    } else {
      alert("?íƒœ ë³€ê²½ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤.");
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
      alert(`?¬ì§„??ë¶ˆëŸ¬?¤ëŠ” ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.\n(${err.message || err})`);
    }
  };

  /* ?€?€ WebP ?•ì¶• ë³€???€?€ */
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

  // ?¤ì´?˜ë? ?µì…˜ ê´€ë¦?
  const currentOptionList = React.useMemo(() => {
    let base = ["ì£¼ì°¨", "?˜ë¦¬ë² ì´??];
    if (propertyType === "?„íŒŒ?¸Â·ì˜¤?¼ìŠ¤?? || propertyType === "?ë£¸Â·?¬ë£¸(?€?µì…˜)") {
      if (subCategory === "?„íŒŒ?¸ë¶„?‘ê¶Œ" || subCategory === "?¤í”¼?¤í…”ë¶„ì–‘ê¶?) {
        base = ["?€?¼ë‹ˆ?œë“œ(?€?µì…˜)", "?œìŠ¤?œì—?´ì»¨", "ë¹ŒíŠ¸?¸ëƒ‰?¥ê³ ", "?¸íƒê¸?, "ê±´ì¡°ê¸?, "?¤í??¼ëŸ¬", "?ê¸°?¸ì²™ê¸?, "?¸ë•??, "ì¤‘ë¬¸?¤ì¹˜", "ë¶™ë°•?´ì¥"];
      } else {
        base = ["?œìŠ¤?œì—?´ì»¨", "?¸íƒê¸?, "ê±´ì¡°ê¸?, "ë¹ŒíŠ¸?¸ëƒ‰?¥ê³ ", "?ê¸°?¸ì²™ê¸?, "?¸ë•??, "ë¶™ë°•?´ì¥", "ì¹¨ë?", "TV", "ë¹„ë°", "?„ì–´??, "ë¬´ì¸?ë°°??];
      }
    } else if (propertyType === "?ê?Â·?¬ë¬´?¤Â·ê±´ë¬¼Â·ê³µ?¥Â·í† ì§€") {
      if (subCategory === "?ê?") {
        base = ["ì²œì¥?•ì—?´ì»¨", "?„ìš©?”ì¥??, "?Œë¼??, "?˜ë„?¤ë¹„", "?„ì‹œê°€??, "?•íŠ¸?¤ë¹„", "?„ë©´?µìœ ë¦?];
      } else if (subCategory === "?¬ë¬´??) {
        base = ["?œìŠ¤?œì—?´ì»¨", "?•ë¹„??, "?¸í…Œë¦¬ì–´?„ë¹„", "ë£??Œì˜??", "ê°œë³„?œë°©", "?¨ë?ë¶„ë¦¬?”ì¥??, "?¹ê°•ê¸?];
      } else if (subCategory === "ê±´ë¬¼/ë¹Œë”©") {
        base = ["?¹ê°•ê¸?, "?ì£¼?ì£¼ì°?, "ê¸°ê³„?ì£¼ì°?, "?¥ìƒ?•ì›", "?œìŠ¤?œì—?´ì»¨", "?µìœ ë¦¬ì™¸ê´€", "ê´€ë¦¬ê???];
      } else if (subCategory === "ê³µì¥/ì°½ê³ ") {
        base = ["?¸ì´?¤íŠ¸", "ë§ˆë‹¹?“ìŒ", "?’ì?ì¸µê³ (5m?´ìƒ)", "?€?•ì°¨?‰ì§„??, "?™ë ¥?‰ë„‰", "?í­?œë°”??, "ì»¨í…Œ?´ë„ˆì§„ì…ê°€??];
      } else if (subCategory === "ì§€?ì‚°?…ì„¼??) {
        base = ["?œë¼?´ë¸Œ??, "?„ì–´?¬ë„??, "?”ë¬¼?˜ë¦¬ë² ì´??, "ë°œì½”??, "ì¸µê³ ?’ìŒ", "ê¸°ìˆ™??, "?œìŠ¤?œì—?´ì»¨"];
      } else if (subCategory === "? ì?") {
        base = ["?„ë¡œ??, "ê±´ì¶•?ˆê???, "ì§€?˜ìˆ˜?¤ë¹„", "?„ê¸°?¸ì…", "ë°°ìˆ˜ê´€", "?‰íƒ„?”ì™„ë£?];
      } else {
        base = ["?‰ë‚œë°©ê¸°", "?˜ë„?¤ë¹„", "ê°€?¤ì„¤ë¹?, "?”ë¬¼?©ìŠ¹ê°•ê¸°", "ë³´ì•ˆ?œìŠ¤??];
      }
    } else if (propertyType === "ë¹Œë¼Â·ì£¼íƒ") {
      if (subCategory === "ë¹Œë¼/?°ë¦½") {
        base = ["?œìŠ¤?œì—?´ì»¨", "ë²½ê±¸?´ì—?´ì»¨", "?¸íƒê¸?, "ê±´ì¡°ê¸?, "?‰ì¥ê³?, "ê°€?¤ë ˆ?¸ì?/?¸ë•??, "ë¶™ë°•?´ì¥", "ë¹„ë°", "?„ì–´??, "?˜ë¦¬ë² ì´??, "ë¬´ì¸?ë°°??, "CCTV"];
      } else {
        base = ["ê°œì¸ì°¨ê³ ì§€", "ë§ˆë‹¹/?•ì›", "?¥ìƒ(ë£¨í”„??", "?¨ë…?Œë¼??, "ì°½ê³ ", "?œì–‘ê´‘ì„¤ë¹?, "ë°©ë²”ì°?, "CCTV", "?œìŠ¤?œì—?´ì»¨", "ë¶™ë°•?´ì¥"];
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
    if (propertyType === "?„íŒŒ?¸Â·ì˜¤?¼ìŠ¤??) {
      if (subCategory === "?„íŒŒ?¸ë¶„?‘ê¶Œ" || subCategory === "?¤í”¼?¤í…”ë¶„ì–‘ê¶?) {
        return Array.from(new Set(["ë§ˆì´?ˆìŠ¤??, "ë¬´í”¼", "ë¡œì—´ì¸?, "ì¤‘ë„ê¸ˆë¬´?´ì", "?„ë§¤?œí•œ?†ìŒ", "?˜ì´?”ë“œ", "?˜ìµ??, "??„¸ê¶?, "ë»¥ë·°", "ê¸‰ë§¤", ...selectedThemes]));
      }
      return Array.from(new Set(["? ì¶•ì²«ì…ì£?, "?¹ì˜¬?˜ë¦¬", "ë¡œì—´ì¸?, "ë»¥ë·°", "??„¸ê¶?, "?€?µì…˜", "ë°˜ë ¤?™ë¬¼ê°€??, "ì£¼ì°¨?¸ë¦¬", "ì´ˆí’ˆ??, "?²ì„¸ê¶?, "?„ì„¸?€ì¶œê???, "ì¦‰ì‹œ?…ì£¼", ...selectedThemes]));
    } else if (propertyType === "?ë£¸Â·?¬ë£¸(?€?µì…˜)") {
      return Array.from(new Set(["ê°€?±ë¹„", "?¨ê¸°?„ë?", "ì£¼ì°¨?¸ë¦¬", "?€ë¡œë??ˆì „", "?¬ì„±?ˆì‹¬", "?¤í”¼?¤í…”", "? ì™„ê²¬ê???, ...selectedThemes]));
    } else if (propertyType === "?ê?Â·?¬ë¬´?¤Â·ê±´ë¬¼Â·ê³µ?¥Â·í† ì§€") {
      let defaultThemes: string[] = [];
      if (subCategory === "?ê?") {
        defaultThemes = ["?€ë¡œë??ê?", "ê°€?œì„±ìµœìƒ", "ë¬´ê¶Œë¦?, "ì¹´í˜ì¶”ì²œ", "?Œì‹?ì¶”ì²?, "ì½”ë„ˆ?ê?", "? ë™?¸êµ¬ë§ìŒ"];
      } else if (subCategory === "?¬ë¬´??) {
        defaultThemes = ["??„¸ê¶Œì‚¬ë¬´ì‹¤", "ì±„ê´‘?°ìˆ˜", "ê°€?±ë¹„?¬ë¬´??, "?¬ì˜¥ì¶”ì²œ", "?”ì?¸ì‚¬ë¬´ì‹¤", "ì¦‰ì‹œ?…ì£¼", "ì£¼ì°¨?¸ë¦¬"];
      } else if (subCategory === "ê±´ë¬¼/ë¹Œë”©") {
        defaultThemes = ["?¬ì˜¥ì¶”ì²œ", "?µì„?€", "?˜ìµ?•ê±´ë¬?, "ë©”ë””ì»¬ë¹Œ??, "ë¦¬ëª¨?¸ë§ë¹Œë”©", "ì½”ë„ˆê±´ë¬¼", "ê°€?œì„±?°ìˆ˜"];
      } else if (subCategory === "ê³µì¥/ì°½ê³ ") {
        defaultThemes = ["IC?¸ì ‘", "?€ë¡œë???, "ë¯¼ì›?†ëŠ”ê³?, "? ì¶•ê³µì¥", "ë¬¼ë¥˜ì°½ê³ ", "?¨ë…ê³µì¥", "?€?´í•œ?„ë?ë£?];
      } else if (subCategory === "ì§€?ì‚°?…ì„¼??) {
        defaultThemes = ["?œë¼?´ë¸Œ??, "?¹ì…˜?¤í”¼??, "??„¸ê¶Œì???, "ì½”ë„ˆ?¸ì‹¤", "ë¡œì–„ì¸?, "?€?¸í…Œë¦¬ì–´", "ê°€?±ë¹„ë§¤ë¬¼"];
      } else if (subCategory === "? ì?") {
        defaultThemes = ["ê³µì¥ë¶€ì§€", "ì°½ê³ ë¶€ì§€", "?„ì›ì£¼íƒì§€", "?¬ìê°€ì¹˜ìµœ??, "?ì—°?¹ì?", "ê¸‰ë§¤ë¬?, "?¨í–¥"];
      } else {
        defaultThemes = ["ë¬´ê¶Œë¦?, "ì½”ë„ˆ?ë¦¬", "? ë™?¸êµ¬ë§ìŒ", "ì£¼ì°¨?€?˜ë§??, "?¸í…Œë¦¬ì–´?˜ë¨", "ì¸µê³ ?’ìŒ", "?€ë¡œë?"];
      }
      return Array.from(new Set([...defaultThemes, ...selectedThemes]));
    } else if (propertyType === "ë¹Œë¼Â·ì£¼íƒ") {
      if (subCategory === "ë¹Œë¼/?°ë¦½") {
        return Array.from(new Set(["? ì¶•ì²«ì…ì£?, "?¹ì˜¬?˜ë¦¬", "?˜ë¦¬ë² ì´?°ìˆ??, "ì£¼ì°¨?¸ë¦¬", "??„¸ê¶?, "?€?µì…˜", "?„ì„¸?€ì¶œê???, "ë°˜ë ¤?™ë¬¼ê°€??, "?ˆì‹¬?„ì„¸", "?¬ë£¸/?°ë¦¬ë£?, ...selectedThemes]));
      } else {
        return Array.from(new Set(["ë§ˆë‹¹?ˆìŒ", "?Œë¼???¥ìƒ", "?˜ìµ?•ë??™ì‚°", "?µì„?€/?µë§¤ë§?, "ë¦¬ëª¨?¸ë§", "ì¡°ìš©?œë™??, "ë°˜ë ¤?™ë¬¼?˜ì˜", "?„ì›?í™œ", "ì¸µê°„?ŒìŒ?„ë¦¬", "?€ê°€ì¡±ì¶”ì²?, ...selectedThemes]));
      }
    }
    return Array.from(new Set(["ê¸‰ë§¤", "ì¶”ì²œê³µì‹¤ê´‘ê³ ", ...selectedThemes]));
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
          // ?ë™ ì¢Œí‘œ ?¤ì •
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
    // sido, sigungu, dong, detailAddr ë¥??©ì³??ì¢Œí‘œ ê²€??(ê±´ë¬¼ëª…ì? ì¢Œí‘œ ê²€?????¤ë¥˜ ? ë°œ ê°€?¥ì„±???’ì•„ ?œì™¸)
    const addr = [sido, sigungu, dong, detailAddr].filter(Boolean).join(" ");
    if (!addr.trim()) { alert("ì£¼ì†Œë¥??…ë ¥?´ì£¼?¸ìš”."); return; }
    const res = await geocodeAddress(addr);
    if (res.success && res.lat && res.lng) { 
      setCoords({lat:res.lat, lng:res.lng}); 
      try {
        const { searchNearbyInfrastructure } = await import("@/app/actions/geocode");
        const infra = await searchNearbyInfrastructure(res.lat, res.lng);
        setInfrastructure(infra);
      } catch (e) { console.error(e); }
      alert("ì¢Œí‘œ ë°?ì£¼ë??˜ê²½(?¸í”„?? ?¤ì • ?„ë£Œ!"); 
    }
    else alert(`ì£¼ì†Œë¥?ì°¾ì„ ???†ìŠµ?ˆë‹¤. (?´ìœ : ${res.error || "ê²°ê³¼ ?†ìŒ"})`);
  };


  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const totalCount = existingPhotoUrls.length + photos.length;
    const files = Array.from(e.target.files).slice(0, 5 - totalCount);
    
    // WebP ?•ì¶• ?ìš©
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
      // ê¸°ì¡´ DB ?¬ì§„ ?? œ
      setExistingPhotoUrls(prev => prev.filter((_,idx) => idx!==i));
      setPhotoPreview(prev => prev.filter((_,idx) => idx!==i));
    } else {
      // ?ˆë¡œ ì¶”ê????¬ì§„ ?? œ
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
    if (eok > 0) result += `${eok}??;
    if (man > 0) {
      const cheon = Math.floor(man / 1000);
      const rest = man % 1000;
      let manStr = "";
      if (cheon > 0) manStr += `${cheon}ì²?;
      if (rest > 0) manStr += `${rest}`;
      result += (result ? " " : "") + manStr + "ë§?;
    }
    return (result || "0") + "??;
  };

  const handleSubmit = async (status: string) => {
    if (!propertyType || !tradeType) { alert("ê³µì‹¤ê´‘ê³  ë¶„ë¥˜?€ ê±°ë˜? í˜•??? íƒ?˜ì„¸??"); return; }
    if (!sido || !dong) { alert("ì£¼ì†Œë¥??…ë ¥?˜ì„¸??"); return; }
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
          main_usage: mainUsage,
          elevator_cnt: elevatorCnt,
          is_illegal: isIllegal,
          building_structure: buildingStructure,
          zoning: zoning || undefined,
          land_purpose: landPurpose || undefined,
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

      if (!result.success) { alert("?¤íŒ¨: " + result.error); return; }

      // ?¬ì§„ ?™ê¸°??(ê¸°ì¡´ ? ì? + ? ê·œ ì¶”ê? - ?? œ ë°˜ì˜)
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
              photoErrors.push(`?…ë¡œ?? ${up.error}`);
            }
          } catch (e: any) {
            photoErrors.push(`?¤ë¥˜: ${e.message}`);
          }
        }
        if (photoErrors.length > 0) {
          alert(`?¬ì§„ ?€???¤ë¥˜:\n${photoErrors.join('\n')}`);
        }
      }
      if (result.id) {
        await syncVacancyPhotos(result.id, finalUrls);
      }

      alert(status === "DRAFT" ? "?„ì‹œ?€???„ë£Œ!" : editId ? "?˜ì • ?„ë£Œ!" : "?±ë¡ ?„ë£Œ! ê´‘ê³ ê°€ ë°”ë¡œ ?œì‘?©ë‹ˆ??");
      router.replace("/m/admin/vacancy");
    } catch (err: any) { alert("?¤ë¥˜: " + err.message); } finally { setSubmitting(false); }
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
        <div style={{ fontSize:36, marginBottom:12 }}>{loadingEdit?"?“‹":"?”"}</div>
        <div style={{ fontSize:14, fontWeight:600 }}>{loadingEdit?"ê³µì‹¤ê´‘ê³  ?•ë³´ ë¶ˆëŸ¬?¤ëŠ” ì¤?..":"ê¶Œí•œ ?•ì¸ ì¤?.."}</div>
      </div>
    </div>
  );

    const fetchBuildingLedger = async () => {
    if (!sigunguCd || !bjdongCd || !bun) {
      alert("ë¨¼ì? [ì£¼ì†Œ ê²€?????µí•´ ?•í™•??ì£¼ì†Œë¥??…ë ¥?´ì£¼?¸ìš”.");
      return;
    }
    setFetchingLedger(true);
    try {
      const url = `/api/building-ledger?sigunguCd=${sigunguCd}&bjdongCd=${bjdongCd}&bun=${bun}&ji=${ji}&platGbCd=${platGbCd}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || json.message || "ê±´ì¶•ë¬¼ë???ì¡°íšŒ???¤íŒ¨?ˆìŠµ?ˆë‹¤.");
        return;
      }
      const ledger = json.data;
      if (ledger) {
        if (ledger.totPkngCnt !== undefined) setParking(ledger.totPkngCnt.toString());
        if (ledger.useAprDay) {
          const rawDate = ledger.useAprDay;
          if (rawDate.length === 8) {
            // YYYYMMDD -> YYYY-MM-DD (ë³´í†µ ?…ì£¼???€??ë©”ëª¨???¹ì§•???œìš©???˜ë„ ?ˆìŒ)
            setMoveInDate(`${rawDate.substring(0,4)}??${rawDate.substring(4,6)}???¹ì¸`);
          }
        }
        if (ledger.grndFlrCnt) setTotalFloor(ledger.grndFlrCnt.toString());
        
        let p = ledger.mainPurpsCdNm || "";
        
        // ì¤‘ê°œ?¬ì˜ ì¹´í…Œê³ ë¦¬ ? íƒ??100% ì¡´ì¤‘?˜ê¸° ?„í•´ ê°•ì œ ?´ë™ ë¡œì§ ?? œ

        if (p) setMainUsage(p);
        if (ledger.strctCdNm) setBuildingStructure(ledger.strctCdNm);
        const elvt = (Number(ledger.rideUseElvtCnt) || 0) + (Number(ledger.emgenUseElvtCnt) || 0);
        if (elvt > 0) setElevatorCnt(elvt.toString());
        
        const addInfo = [];
        if (addInfo.length > 0) {
          setDescription(prev => (prev ? prev + "\n" : "") + "[ê±´ì¶•ë¬¼ë???ì¶”ê? ?•ë³´]\n" + addInfo.join("\n"));
        }
        
        alert(
          "??AI ê±´ì¶•ë¬¼ë???ë¶„ì„ ?„ë£Œ!\n" +
          "ì¸µìˆ˜, ì£¼ìš©?? ?¹ê°•ê¸??•ë³´ ?±ì´ ?ë™ ?…ë ¥?˜ì—ˆ?µë‹ˆ??\n\n" +
          "? ï¸ ì£¼ì˜?¬í•­:\n" +
          "ë¶ˆëŸ¬???°ì´?°ëŠ” ê³µê³µ?¥ë? ê¸°ì??´ë?ë¡??¤ì œ ?„í™©ê³??¤ë? ???ˆìŠµ?ˆë‹¤.\n" +
          "ë°˜ë“œ???ë™ ?…ë ¥???´ìš©???•í™•?œì? ?¤ì‹œ ?œë²ˆ ?•ì¸??ì£¼ì„¸??\n" +
          "(??ë©´ì ?€ ?°ë™?˜ì? ?Šìœ¼ë¯€ë¡??˜ê¸°ë¡?ì§ì ‘ ?…ë ¥??ì£¼ì„¸??"
        );
      }
    } catch (err) {
      console.error(err);
      alert("ê±´ì¶•ë¬¼ë???ì¡°íšŒ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.");
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
      if ((tradeType === "?”ì„¸" || tradeType === "?¨ê¸°") && !monthly) {
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
                {isDone ? "?? : step}
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
        ?’¾ ?„ì‹œ?€??
      </button>
      <div style={{ flex:1 }} />
      {currentStep > 1 && (
        <button type="button" onClick={()=>setCurrentStep(s=>s-1)}
          style={{ height:46, padding:"0 20px", background:"#fff", color:"#374151", border:"1px solid #d1d5db", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer" }}>
          ???´ì „
        </button>
      )}
      {currentStep < TOTAL_STEPS ? (
        <button type="button" onClick={handleNextStep}
          style={{ height:46, padding:"0 24px", background:"#1a73e8", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:800, cursor:"pointer", boxShadow:"0 4px 12px rgba(26,115,232,0.25)" }}>
          ?¤ìŒ ??
        </button>
      ) : (
        <button type="button" disabled={submitting} onClick={()=>handleSubmit("ACTIVE")}
          style={{ height:46, padding:"0 24px", background: submitting?"#9ca3af":"linear-gradient(135deg,#10b981,#059669)", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:800, cursor: submitting?"not-allowed":"pointer", boxShadow:"0 2px 8px rgba(16,185,129,0.3)" }}>
          {submitting ? "ì²˜ë¦¬ì¤?.." : editId ? "???˜ì •?„ë£Œ" : "??ê´‘ê³ ?±ë¡"}
        </button>
      )}
    </div>
  );

  return (
    <div style={{ minHeight:"100dvh", background:"#f4f5f7", fontFamily:"'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* ?¤ë” */}
      <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:50, background:"#fff", borderBottom:"1px solid #e5e7eb", padding:"0 16px", height:56, display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={() => { if (currentStep > 1) { setCurrentStep(s=>s-1); } else { router.replace("/m/admin/vacancy"); }}} style={{ background:"none", border:"none", cursor:"pointer", padding:4, display:"flex" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize:18, fontWeight:800, color:"#111", margin:0, flex:1 }}>{editId ? "ê³µì‹¤?˜ì •" : "ê³µì‹¤?±ë¡"} <span style={{fontSize:13, color:"#6b7280", fontWeight:600}}>({currentStep}/{TOTAL_STEPS})</span></h1>
      </div>
      <div style={{ height:56 }} />

      <StepIndicator />
      <div style={{ padding:"8px 16px 100px" }}>
        {/* ?â•??STEP 1: ë¶„ë¥˜/ì£¼ì†Œ ?â•??*/}
        {currentStep === 1 && (<>
        {/* 1. ê³µì‹¤ê´‘ê³ ë¶„ë¥˜ */}
        <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.03)", border:"1px solid #f3f4f6" }}>
          <div style={{ fontSize:16, fontWeight:800, color:"#111", borderLeft:"4px solid #1a73e8", paddingLeft:10, marginBottom:14 }}>ê³µì‹¤ê´‘ê³ ë¶„ë¥˜</div>
          <label style={labelStyle}>?€ë¶„ë¥˜</label>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:12 }}>
            {Object.keys(SUB_CATEGORIES).map(t => <SBtn key={t} label={t} sel={propertyType===t} onClick={() => { 
              setPropertyType(t); 
              const defaultSub = SUB_CATEGORIES[t][0] || "";
              setSubCategory(defaultSub); 
              if (defaultSub === "?ë£¸" || defaultSub === "1.5ë£?) setRoomCount("1");
              if (defaultSub === "?¬ë£¸") setRoomCount("2");
            }} />)}
          </div>
          <label style={labelStyle}>?Œë¶„ë¥?/label>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {(SUB_CATEGORIES[propertyType]||[]).map(s => <SBtn key={s} label={s} sel={subCategory===s} onClick={() => {
              setSubCategory(s);
              if (s === "?ë£¸" || s === "1.5ë£?) setRoomCount("1");
              if (s === "?¬ë£¸") setRoomCount("2");
            }} />)}
          </div>
        </div>

        {/* 4. ì£¼ì†Œ */}
        <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.03)", border:"1px solid #f3f4f6" }}>
          <div style={{ fontSize:16, fontWeight:800, color:"#111", borderLeft:"4px solid #1a73e8", paddingLeft:10, marginBottom:14 }}>?„ì¹˜/ì£¼ì†Œ</div>
          <button type="button" onClick={handlePostcodeSearch} style={{ width:"100%", height:46, background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:800, cursor:"pointer", marginBottom:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:"0 2px 8px rgba(16,185,129,0.2)" }}>
            ?” ì£¼ì†Œ ê²€??
          </button>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <div style={{flex:1}}><label style={labelStyle}>????/label><input id="input-sido" type="text" value={sido} onChange={e=>setSido(e.target.value)} placeholder="?œìš¸" style={inputStyle}/></div>
            <div style={{flex:1}}><label style={labelStyle}>??êµ?êµ?/label><input id="input-sigungu" type="text" value={sigungu} onChange={e=>setSigungu(e.target.value)} placeholder="ê°•ë‚¨êµ? style={inputStyle}/></div>
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <div style={{flex:1}}><label style={labelStyle}>????ë©?/label><input id="input-dong" type="text" value={dong} onChange={e=>setDong(e.target.value)} placeholder="?¼í˜„?? style={inputStyle}/></div>
            <div style={{flex:1}}><label style={labelStyle}>ê±´ë¬¼ëª?{!isFieldExposed("buildingName") && isRealtor && <PrivateTag/>}</label><input type="text" value={buildingName} onChange={e=>setBuildingName(e.target.value)} placeholder="ê±´ë¬¼ëª? style={inputStyle}/></div>
          </div>
          <label style={labelStyle}>?ì„¸ì£¼ì†Œ {!isFieldExposed("detailAddr") && isRealtor && <PrivateTag/>}</label>
          <input id="input-detailAddr" type="text" value={detailAddr} onChange={e=>setDetailAddr(e.target.value)} placeholder="?ì„¸ì£¼ì†Œ ?…ë ¥" style={{...inputStyle, marginBottom:10}}/>

          {/* ???¸ìˆ˜ (?„íŒŒ?¸ì¸ ê²½ìš°) */}
          {propertyType === "?„íŒŒ?¸Â·ì˜¤?¼ìŠ¤?? && (
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              <div style={{flex:1}}><label style={labelStyle}>??{!isFieldExposed("aptDong") && isRealtor && <PrivateTag/>}</label><input type="text" value={aptDong} onChange={e=>setAptDong(e.target.value)} placeholder="101?? style={inputStyle}/></div>
              <div style={{flex:1}}><label style={labelStyle}>?¸ìˆ˜ {!isFieldExposed("hosu") && isRealtor && <PrivateTag/>}</label><input type="text" value={hosu} onChange={e=>setHosu(e.target.value)} placeholder="405?? style={inputStyle}/></div>
            </div>
          )}
          {propertyType !== "?„íŒŒ?¸Â·ì˜¤?¼ìŠ¤?? && (
            <div style={{ marginBottom:10 }}>
              <label style={labelStyle}>?¸ìˆ˜ {!isFieldExposed("hosu") && isRealtor && <PrivateTag/>}</label>
              <input type="text" value={hosu} onChange={e=>setHosu(e.target.value)} placeholder="101?? style={inputStyle}/>
            </div>
          )}

          {/* ì£¼ì†Œ ê³µê°œ ?¤ì • */}
          {isRealtor && (
            <div style={{ background:"#f9fafb", padding:12, borderRadius:10, border:"1px solid #e5e7eb", marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#374151", marginBottom:8 }}>?”’ ì£¼ì†Œ ?¸ì¶œ ë²”ìœ„</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {propertyType === "?„íŒŒ?¸Â·ì˜¤?¼ìŠ¤?? ? (
                  <>
                    {["???¸ìˆ˜ê³µê°œ","?™ìˆ˜ê³µê°œ","ë¹„ê³µê°?].map(opt => (
                      <label key={opt} style={{ display:"flex", alignItems:"center", gap:4, fontSize:13, cursor:"pointer", padding:"6px 10px", borderRadius:8, background: addressExposure===opt?"#eff6ff":"#fff", border: addressExposure===opt?"1px solid #1a73e8":"1px solid #d1d5db" }}>
                        <input type="radio" name="addrExp" checked={addressExposure===opt} onChange={()=>setAddressExposure(opt)} style={{accentColor:"#1a73e8"}}/>
                        {opt === "ë¹„ê³µê°? ? "?™í˜¸?˜ë¹„ê³µê°œ" : opt}
                      </label>
                    ))}
                  </>
                ) : (
                  <>
                    {["ë²ˆì?ê³µê°œ","ë³¸ë²ˆì§€ë§Œê³µê°?,"ê¸°ë³¸ì£¼ì†Œë§Œê³µê°?].map(opt => (
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
            ?“ ì¢Œí‘œ ?ë™?¤ì •
          </button>
          {coords && <div style={{ marginTop:6, fontSize:12, color:"#10b981", fontWeight:600 }}>??ì¢Œí‘œ: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</div>}

          {/* ì£¼ë??˜ê²½ (ì¢Œí‘œ ê¸°ë°˜ ?ë™?ì„±) */}
          <div style={{ marginTop:12 }}>
            <label style={labelStyle}>?™ï¸?ì£¼ë??˜ê²½ (ì¢Œí‘œ ê¸°ë°˜ ?ë™?ì„±)</label>
            <div style={{ background:"#f9fafb", border:"1px solid #e5e7eb", borderRadius:8, padding:12, fontSize:13, color:"#6b7280" }}>
              {Object.keys(infrastructure).length > 0 ? (
                Object.entries(infrastructure).map(([category, items]: [string, any]) => (
                  <div key={category} style={{ marginBottom:6 }}>
                    <strong style={{ color:"#374151" }}>{category}:</strong> {Array.isArray(items) ? items.join(", ") : ""}
                  </div>
                ))
              ) : (
                "??'ì¢Œí‘œ ?ë™?¤ì •' ë²„íŠ¼???„ë¥´ë©?ì£¼ë? ?¸í”„?¼ê? ?ë™ ê²€?‰ë©?ˆë‹¤."
              )}
            </div>
          </div>
        </div>
        </>)}

        {/* ?â•??STEP 2: ê°€ê²?ë©´ì  ?â•??*/}
        {currentStep === 2 && (<>




        {/* ê±´ì¶•ë¬¼ë???ì¶”ê? ?¤í™ (API ?°ë™ ??ª©) */}
        {propertyType === "?ê?Â·?¬ë¬´?¤Â·ê±´ë¬¼Â·ê³µ?¥Â·í† ì§€" && subCategory !== "? ì?" && (
          <div style={{ background: "#f8fafc", borderRadius: 14, padding: 16, marginBottom: 12, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
              <span>?¢ ê±´ì¶•ë¬¼ë???ì¶”ê? ?¤í™</span>
              <button 
                type="button" 
                onClick={fetchBuildingLedger}
                disabled={fetchingLedger}
                style={{ 
                  height: 28, padding: "0 10px", 
                  background: fetchingLedger ? "#e5e7eb" : "linear-gradient(135deg, #fef3c7, #fde68a)", 
                  color: fetchingLedger ? "#9ca3af" : "#d97706", 
                  border: "none", borderRadius: 6, fontSize: 12, fontWeight: 800, 
                  cursor: fetchingLedger ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 4, marginLeft: "auto",
                  boxShadow: fetchingLedger ? "none" : "0 2px 8px rgba(217,119,6,0.15)", transition: "all 0.2s"
                }}
              >
                {fetchingLedger ? "???°ë™ ì¤?.." : "??AI ?°ë™"}
              </button>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#4b5563", marginBottom: 6, display: "block" }}>ê±´ì¶•ë¬?ì£¼ìš©??/label>
              <input type="text" placeholder="?? ??ì¢…ê·¼ë¦°ìƒ?œì‹œ?? value={mainUsage} onChange={(e) => setMainUsage(e.target.value)} style={{ width: "100%", height: 46, borderRadius: 8, border: "1px solid #d1d5db", padding: "0 14px", fontSize: 14, background: "#fff" }} />
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#4b5563", marginBottom: 6, display: "block" }}>ê±´ë¬¼ êµ¬ì¡°</label>
              <input type="text" placeholder="?? ì² ê·¼ì½˜í¬ë¦¬íŠ¸êµ¬ì¡°" value={buildingStructure} onChange={(e) => setBuildingStructure(e.target.value)} style={{ width: "100%", height: 46, borderRadius: 8, border: "1px solid #d1d5db", padding: "0 14px", fontSize: 14, background: "#fff" }} />
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#4b5563", marginBottom: 6, display: "block" }}>?¹ê°•ê¸?(?€??</label>
                <div style={{ position: "relative" }}>
                  <input type="number" placeholder="0" value={elevatorCnt} onChange={(e) => setElevatorCnt(e.target.value)} style={{ width: "100%", height: 46, borderRadius: 8, border: "1px solid #d1d5db", padding: "0 30px 0 14px", fontSize: 14, background: "#fff", textAlign: "right" }} />
                  <span style={{ position: "absolute", right: 14, top: 14, fontSize: 14, color: "#6b7280" }}>?€</span>
                </div>
              </div>
              <div style={{ flex: 1.2 }}>
                <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 46, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                  <input type="checkbox" checked={isIllegal} onChange={(e) => setIsIllegal(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#ef4444" }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: isIllegal ? "#ef4444" : "#4b5563" }}>? ï¸ ?„ë°˜ê±´ì¶•ë¬?/span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 2. ê±°ë˜/ê¸ˆì•¡ */}
        <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.03)", border:"1px solid #f3f4f6" }}>
          <div style={{ fontSize:16, fontWeight:800, color:"#111", borderLeft:"4px solid #1a73e8", paddingLeft:10, marginBottom:14 }}>ê±°ë˜?•ë³´</div>
          <label style={labelStyle}>ê±°ë˜? í˜•</label>
          <div style={{ display:"flex", gap:8, marginBottom:14 }}>
            {["ë§¤ë§¤","?„ì„¸","?”ì„¸","?¨ê¸°"]
              .filter(t => !(propertyType === "?ë£¸Â·?¬ë£¸(?€?µì…˜)" && t === "ë§¤ë§¤"))
              .map(t => <SBtn key={t} label={t} sel={tradeType===t} onClick={() => setTradeType(t)} />)}
          </div>

          <label style={labelStyle}>{tradeType==="ë§¤ë§¤"?"ë§¤ë§¤ê°€":"ë³´ì¦ê¸?} {deposit && <span style={{color:"#1a73e8", fontWeight:600}}>{formatKorean(deposit)}</span>}</label>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
            <input id="input-deposit" type="number" value={deposit} onChange={e=>setDeposit(e.target.value)} placeholder="ë§Œì› ?¨ìœ„" style={inputStyle} />
            <span style={{ color:"#6b7280", fontSize:13, flexShrink:0 }}>ë§Œì›</span>
          </div>

          {(tradeType==="?”ì„¸"||tradeType==="?¨ê¸°") && (<>
            <label style={labelStyle}>?”ì„¸ {monthly && <span style={{color:"#1a73e8",fontWeight:600}}>{formatKorean(monthly)}</span>}</label>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
              <input id="input-monthly" type="number" value={monthly} onChange={e=>setMonthly(e.target.value)} placeholder="ë§Œì› ?¨ìœ„" style={inputStyle} />
              <span style={{ color:"#6b7280", fontSize:13, flexShrink:0 }}>ë§Œì›</span>
            </div>
          </>)}

          <label style={labelStyle}>ê´€ë¦¬ë¹„</label>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <input type="number" value={maintenance} onChange={e=>setMaintenance(e.target.value)} placeholder="ë§Œì› ?¨ìœ„" style={inputStyle} />
            <span style={{ color:"#6b7280", fontSize:13, flexShrink:0 }}>ë§Œì›</span>
          </div>
        </div>

        {/* 3. ë©´ì Â·ì¸µìˆ˜ (Step 1 ?µí•©) */}
        <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.03)", border:"1px solid #f3f4f6" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div style={{ fontSize:16, fontWeight:800, color:"#111", borderLeft:"4px solid #1a73e8", paddingLeft:10 }}>ë©´ì Â·ì¸µìˆ˜</div>
            <div style={{ display:"flex", borderRadius:8, overflow:"hidden", border:"1px solid #e5e7eb" }}>
              <button type="button" onClick={()=>setAreaUnit("m2")} style={{ padding:"6px 14px", fontSize:12, fontWeight:800, border:"none", cursor:"pointer", background: areaUnit==="m2"?"#1a73e8":"#fff", color: areaUnit==="m2"?"#fff":"#6b7280" }}>mÂ²</button>
              <button type="button" onClick={()=>setAreaUnit("py")} style={{ padding:"6px 14px", fontSize:12, fontWeight:800, border:"none", cursor:"pointer", background: areaUnit==="py"?"#1a73e8":"#fff", color: areaUnit==="py"?"#fff":"#6b7280" }}>??/button>
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginBottom:4 }}>
            <div style={{flex:1}}>
              <label style={labelStyle}>ê³µê¸‰ë©´ì ({areaUnit==="m2"?"mÂ²":"??})</label>
              {areaUnit==="m2" ? (
                <input type="number" value={supplyM2} onChange={e=>handleM2Change(e.target.value, setSupplyM2, setSupplyPy)} placeholder="84" style={inputStyle}/>
              ) : (
                <input type="number" value={supplyPy} onChange={e=>handlePyChange(e.target.value, setSupplyPy, setSupplyM2)} placeholder="25.4" style={inputStyle}/>
              )}
            </div>
            <div style={{flex:1}}>
              <label style={labelStyle}>?„ìš©ë©´ì ({areaUnit==="m2"?"mÂ²":"??})</label>
              {areaUnit==="m2" ? (
                <input id="input-exclusiveM2" type="number" value={exclusiveM2} onChange={e=>handleM2Change(e.target.value, setExclusiveM2, setExclusivePy)} placeholder="59" style={inputStyle}/>
              ) : (
                <input id="input-exclusivePy" type="number" value={exclusivePy} onChange={e=>handlePyChange(e.target.value, setExclusivePy, setExclusiveM2)} placeholder="17.8" style={inputStyle}/>
              )}
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginBottom:10, fontSize:12, color:"#1a73e8", fontWeight:600, padding:"0 2px" }}>
            <div style={{flex:1}}>{supplyM2 ? (areaUnit==="m2" ? `??${(parseFloat(supplyM2)*0.3025).toFixed(1)}?? : `??${parseFloat(supplyM2).toFixed(1)}mÂ²`) : ""}</div>
            <div style={{flex:1}}>{exclusiveM2 ? (areaUnit==="m2" ? `??${(parseFloat(exclusiveM2)*0.3025).toFixed(1)}?? : `??${parseFloat(exclusiveM2).toFixed(1)}mÂ²`) : ""}</div>
          </div>
          {(propertyType === "ë¹Œë¼Â·ì£¼íƒ" || propertyType === "?ê?Â·?¬ë¬´?¤Â·ê±´ë¬¼Â·ê³µ?¥Â·í† ì§€") && tradeType === "ë§¤ë§¤" && (
            <>
              <div style={{ display:"flex", gap:10, marginBottom:4 }}>
                <div style={{flex:1}}>
                  <label style={labelStyle}>?€ì§€ë©´ì  ({areaUnit==="m2"?"mÂ²":"??})</label>
                  {areaUnit==="m2" ? (
                    <input type="number" value={landShareM2} onChange={e=>handleM2Change(e.target.value, setLandShareM2, setLandSharePy)} placeholder="33" style={inputStyle}/>
                  ) : (
                    <input type="number" value={landSharePy} onChange={e=>handlePyChange(e.target.value, setLandSharePy, setLandShareM2)} placeholder="10" style={inputStyle}/>
                  )}
                </div>
                <div style={{flex:1}}>
                  <label style={labelStyle}>?©ë„ì§€??/label>
                  <select value={zoning} onChange={e=>setZoning(e.target.value)} style={inputStyle}>
                    <option value="">? íƒ</option>
                    {["1ì¢…ì „?©ì£¼ê±?, "2ì¢…ì „?©ì£¼ê±?, "1ì¢…ì¼ë°˜ì£¼ê±?, "2ì¢…ì¼ë°˜ì£¼ê±?, "3ì¢…ì¼ë°˜ì£¼ê±?, "ì¤€ì£¼ê±°", "ì¤‘ì‹¬?ì—…", "?¼ë°˜?ì—…", "ê·¼ë¦°?ì—…", "? í†µ?ì—…", "ë³´ì „?¹ì?", "?ì‚°?¹ì?", "?ì—°?¹ì?", "ë³´ì „ê´€ë¦?, "?ì‚°ê´€ë¦?, "ê³„íšê´€ë¦?, "?ë¦¼ì§€??, "?ì—°?˜ê²½ë³´ì „"].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display:"flex", gap:10, marginBottom:10, fontSize:12, color:"#1a73e8", fontWeight:600, padding:"0 2px" }}>
                <div style={{flex:1}}>{landShareM2 ? (areaUnit==="m2" ? `??${(parseFloat(landShareM2)*0.3025).toFixed(1)}?? : `??${parseFloat(landShareM2).toFixed(1)}mÂ²`) : ""}</div>
                <div style={{flex:1}}></div>
              </div>
              
              {subCategory === "? ì?" && (
                <div style={{ display:"flex", gap:10, marginBottom:10 }}>
                  <div style={{flex:1}}>
                    <label style={labelStyle}>? ì? ?©ë„(ì§€ëª?</label>
                    <select value={landPurpose} onChange={e=>setLandPurpose(e.target.value)} style={inputStyle}>
                      <option value="">? íƒ</option>
                      {["??, "??, "ê³¼ìˆ˜??, "ëª©ì¥?©ì?", "?„ì•¼", "ê´‘ì²œì§€", "?¼ì „", "?€", "ê³µì¥?©ì?", "?™êµ?©ì?", "ì£¼ì°¨??, "ì£¼ìœ ?Œìš©ì§€", "ì°½ê³ ?©ì?", "?„ë¡œ", "ì² ë„?©ì?", "?œë°©", "?˜ì²œ", "êµ¬ê±°", "? ì?", "?‘ì–´??, "?˜ë„?©ì?", "ê³µì›", "ì²´ìœ¡?©ì?", "? ì›ì§€", "ì¢…êµ?©ì?", "?¬ì ì§€", "ë¬˜ì?", "?¡ì¢…ì§€"].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
          <div style={{ display:"flex", gap:10, marginBottom:10 }}>
            <div style={{flex:1}}><label style={labelStyle}>?„ì²´ì¸?/label><input type="number" value={totalFloor} onChange={e=>setTotalFloor(e.target.value)} placeholder="15" style={inputStyle}/></div>
            <div style={{flex:1}}><label style={labelStyle}>?´ë‹¹ì¸?<span style={{fontSize:11, color:"#9ca3af", fontWeight:400}}>(ì§ì ‘?…ë ¥)</span></label><input type="text" inputMode="numeric" value={currentFloor} onChange={e=>setCurrentFloor(e.target.value)} placeholder="?? 3" style={inputStyle}/></div>
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
            {['ë°˜ì???, '?¥íƒ‘', 'ì§€??1ì¸?, 'ì§€??2ì¸?, '?„ì²´ì¸?].map(f => (
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
                <label style={labelStyle}>ë°?/label>
                <select value={roomCount} onChange={e=>setRoomCount(e.target.value)} style={{...inputStyle, cursor:"pointer"}}>
                  {["1","2","3","4ê°??´ìƒ"].map(n=><option key={n}>{n}</option>)}
                </select>
              </div>
              <div style={{flex:1}}>
                <label style={labelStyle}>?•ì‹¤</label>
                <select value={bathCount} onChange={e=>setBathCount(e.target.value)} style={{...inputStyle, cursor:"pointer"}}>
                  {["1","2","3ê°??´ìƒ"].map(n=><option key={n}>{n}</option>)}
                </select>
              </div>
              <div style={{flex:1}}>
                <label style={labelStyle}>ë°©í–¥</label>
                <select value={direction} onChange={e=>setDirection(e.target.value)} style={{...inputStyle, cursor:"pointer"}}>
                  <option value="">? íƒ</option>
                  {["?¨í–¥","?¨ë™??,"?¨ì„œ??,"?™í–¥","?œí–¥","ë¶í–¥"].map(d=><option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ì£¼ì°¨Â·?…ì£¼ (Step 1 ?µí•©) */}
        <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.03)", border:"1px solid #f3f4f6" }}>
          <div style={{ fontSize:16, fontWeight:800, color:"#111", borderLeft:"4px solid #1a73e8", paddingLeft:10, marginBottom:14 }}>ì£¼ì°¨Â·?…ì£¼</div>
          <div style={{ display:"flex", gap:10 }}>
            <div style={{flex:1}}>
              <label style={labelStyle}>ì£¼ì°¨</label>
              <select value={parking} onChange={e=>setParking(e.target.value)} style={{...inputStyle,cursor:"pointer"}}>
                {propertyType === "?ê?Â·?¬ë¬´?¤Â·ê±´ë¬¼Â·ê³µ?¥Â·í† ì§€" ? (
                  ["?†ìŒ", "1?€", "2?€", "3?€", "4?€", "5?€?´ìƒ"].map(o=><option key={o} value={o}>{o}</option>)
                ) : (
                  ["?†ìŒ", "ê°€??, "1?€", "2?€~"].map(o=><option key={o} value={o}>{o}</option>)
                )}
              </select>
            </div>
            <div style={{flex:1}}>
              <label style={labelStyle}>?…ì£¼ê°€?¥ì¼</label>
              <select value={moveInDate} onChange={e=>setMoveInDate(e.target.value)} style={{...inputStyle,cursor:"pointer"}}>
                {["ì¦‰ì‹œ?…ì£¼(ê³µì‹¤)","1ê°œì›” ?´ë‚´","2ê°œì›” ?´ë‚´","3ê°œì›” ?´ë‚´","? ì§œ ?‘ì˜"].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </div>
        </>)}

        {/* ?â•??STEP 3: ?¬ì§„Â·?ì„¸ ?â•??*/}
        {currentStep === 3 && (<>
        {/* 5. ì¶”ê? */}
        <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.03)", border:"1px solid #f3f4f6" }}>
          <div style={{ fontSize:16, fontWeight:800, color:"#111", borderLeft:"4px solid #1a73e8", paddingLeft:10, marginBottom:14 }}>?ì„¸?•ë³´</div>
          {/* ?µì…˜ & ?Œë§ˆ & ì£¼ë??˜ê²½ */}
          <div>
            {/* ?Œë§ˆ */}
            <label style={labelStyle}>?Œë§ˆ ? íƒ</label>
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
              <input type="text" value={customThemeInput} onChange={e=>setCustomThemeInput(e.target.value)} placeholder="ì§ì ‘ ?…ë ¥ (?? ë°˜ë ¤?™ë¬¼)" style={{...inputStyle, flex:1}} onKeyDown={e=>{if(e.key==='Enter') {e.preventDefault(); addCustomTheme();}}} />
              <button type="button" onClick={addCustomTheme} style={{ background:"#374151", color:"#fff", border:"none", borderRadius:10, padding:"0 16px", fontWeight:700, fontSize:13 }}>ì¶”ê?</button>
            </div>

            {/* ?µì…˜ */}
            <label style={labelStyle}>?µì…˜ ? íƒ</label>
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
              <input type="text" value={customOptionInput} onChange={e=>setCustomOptionInput(e.target.value)} placeholder="ì§ì ‘ ?…ë ¥ (?? ë¶™ë°•?´ì¥)" style={{...inputStyle, flex:1}} onKeyDown={e=>{if(e.key==='Enter') {e.preventDefault(); addCustomOption();}}} />
              <button type="button" onClick={addCustomOption} style={{ background:"#374151", color:"#fff", border:"none", borderRadius:10, padding:"0 16px", fontWeight:700, fontSize:13 }}>ì¶”ê?</button>
            </div>
          </div>

          <div style={{ marginTop: 16, borderTop: "1px dashed #e5e7eb", paddingTop: 16 }}>
            <label style={labelStyle}>?„ë‹¬?¬í•­ / ê³µì‹¤ê´‘ê³ ?¤ëª…</label>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="ê³µì‹¤ê´‘ê³ ???€??ì¶”ê? ?¤ëª…???…ë ¥?˜ì„¸?? rows={4} style={{ ...inputStyle, height:"auto", padding:12, resize:"vertical", lineHeight:1.5 }}/>
          </div>
        </div>

        {/* 6. ?¬ì§„ */}
        <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.03)", border:"1px solid #f3f4f6" }}>
          <div style={{ fontSize:16, fontWeight:800, color:"#111", borderLeft:"4px solid #1a73e8", paddingLeft:10, marginBottom:14 }}>?¬ì§„ ?±ë¡ ({photoPreview.length}/5)</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
            {photoPreview.map((src,i) => (
              <div key={i} style={{ position:"relative", width:80, height:80, borderRadius:10, overflow:"hidden", border:"1px solid #e5e7eb" }}>
                <img src={src} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                <button onClick={()=>removePhoto(i)} style={{ position:"absolute", top:2, right:2, width:22, height:22, borderRadius:"50%", background:"rgba(0,0,0,0.6)", color:"#fff", border:"none", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>??/button>
              </div>
            ))}
            {photoPreview.length < 5 && (
              <>
                <label style={{ width:80, height:80, borderRadius:10, border:"2px dashed #d1d5db", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:28, color:"#9ca3af", background:"#f9fafb" }}>
                  +<input type="file" accept="image/*" multiple hidden onChange={handlePhotoChange}/>
                </label>
                <button type="button" onClick={openPhotoDbModal} style={{ width:80, height:80, borderRadius:10, border:"2px dashed #d1d5db", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#9ca3af", background:"#fff" }}>
                  <span style={{ fontSize:20, fontWeight:800 }}>DB</span>
                  <span style={{ fontSize:10, marginTop:4, fontWeight:700 }}>?¬í† DB</span>
                </button>
              </>
            )}
          </div>
        </div>
        </>)}

        {/* ?â•??STEP 4: ìµœì¢…?•ì¸ ?â•??*/}
        {currentStep === 4 && (<>
        {/* ë¯¸ë¦¬ë³´ê¸° ?”ì•½ */}
        <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.03)", border:"1px solid #10b981" }}>
          <div style={{ fontSize:16, fontWeight:800, color:"#10b981", borderLeft:"4px solid #10b981", paddingLeft:10, marginBottom:14 }}>?…ë ¥ ?•ë³´ ?”ì•½</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10, fontSize:14, color:"#374151" }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{color:"#6b7280"}}>ë§¤ë¬¼? í˜•</span><span style={{fontWeight:700}}>{propertyType} Â· {subCategory}</span></div>
            <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{color:"#6b7280"}}>ê±°ë˜? í˜•</span><span style={{fontWeight:700}}>{tradeType}</span></div>
            <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{color:"#6b7280"}}>{tradeType==="ë§¤ë§¤"?"ë§¤ë§¤ê°€":"ë³´ì¦ê¸?}</span><span style={{fontWeight:700, color:"#ef4444"}}>{deposit ? formatKorean(deposit) : "ë¯¸ì…??}</span></div>
            {(tradeType==="?”ì„¸"||tradeType==="?¨ê¸°") && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{color:"#6b7280"}}>?”ì„¸</span><span style={{fontWeight:700, color:"#ef4444"}}>{monthly ? formatKorean(monthly) : "ë¯¸ì…??}</span></div>}
            <div style={{ borderTop:"1px dashed #e5e7eb", paddingTop:10 }} />
            <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{color:"#6b7280"}}>?„ì¹˜</span><span style={{fontWeight:700}}>{[sido,sigungu,dong].filter(Boolean).join(" ") || "ë¯¸ì…??}</span></div>
            <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{color:"#6b7280"}}>ë©´ì </span><span style={{fontWeight:700}}>{exclusiveM2 ? `?„ìš© ${exclusiveM2}mÂ²` : "ë¯¸ì…??}{supplyM2 ? ` / ê³µê¸‰ ${supplyM2}mÂ²` : ""}</span></div>
            {!isCommercial && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{color:"#6b7280"}}>ë°??•ì‹¤/ë°©í–¥</span><span style={{fontWeight:700}}>{roomCount}ë°?{bathCount}?•ì‹¤ {direction}</span></div>}
            <div style={{ borderTop:"1px dashed #e5e7eb", paddingTop:10 }} />
            <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{color:"#6b7280"}}>?¬ì§„</span><span style={{fontWeight:700}}>{photoPreview.length}???±ë¡??/span></div>
            <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{color:"#6b7280"}}>ì¢Œí‘œ</span><span style={{fontWeight:700, color: coords ? "#10b981" : "#ef4444"}}>{coords ? "???¤ì •?? : "??ë¯¸ì„¤??}</span></div>
            {selectedThemes.length > 0 && <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap" }}><span style={{color:"#6b7280"}}>?Œë§ˆ</span><span style={{fontWeight:600, color:"#1a73e8"}}>{selectedThemes.map(t=>`#${t}`).join(" ")}</span></div>}
            {!isRealtor && (
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{color:"#6b7280"}}>ì¤‘ê°œë³´ìˆ˜</span>
                <span style={{fontWeight:700, color:"#1a73e8"}}>{commissionType}{commissionEtc ? ` (${commissionEtc})` : ""}</span>
              </div>
            )}
          </div>
          <div style={{ marginTop:12, display:"flex", gap:6 }}>
            {[1,2,3].map(s => (
              <button key={s} type="button" onClick={()=>setCurrentStep(s)} style={{ flex:1, height:36, background:"#eff6ff", color:"#1a73e8", border:"1px solid #bfdbfe", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                {STEP_LABELS[s-1]} ?˜ì •
              </button>
            ))}
          </div>
        </div>

        {/* 7. ?±ë¡??/ ë¶€?™ì‚° ê¸°ì—… ?•ë³´ */}
        {isRealtor ? (
          <div style={{ background:"#f9fafb", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.03)", border:"1px solid #e5e7eb" }}>
            <div style={{ fontSize:15, fontWeight:800, color:"#111", borderLeft:"4px solid #1a73e8", paddingLeft:10, marginBottom:14 }}>ë¶€?™ì‚° / ê¸°ì—… ?•ë³´</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px 10px", marginBottom:12 }}>
              <div><label style={{...labelStyle,fontSize:12,marginBottom:4}}>?í˜¸ëª?/label><input type="text" value={rCompany} onChange={e=>setRCompany(e.target.value)} style={{...inputStyle, background:"#fff"}}/></div>
              <div><label style={{...labelStyle,fontSize:12,marginBottom:4}}>ì¤‘ê°œ?±ë¡ë²ˆí˜¸</label><input type="text" value={rRegNum} onChange={e=>setRRegNum(e.target.value)} style={{...inputStyle, background:"#fff"}}/></div>
              <div><label style={{...labelStyle,fontSize:12,marginBottom:4}}>?€?œìëª?/label><input type="text" value={rBoss} onChange={e=>setRBoss(e.target.value)} style={{...inputStyle, background:"#fff"}}/></div>
              <div><label style={{...labelStyle,fontSize:12,marginBottom:4}}>?¬ì—…?ë“±ë¡ë²ˆ??/label><input type="text" value={rBizNum} onChange={e=>setRBizNum(e.target.value)} style={{...inputStyle, background:"#fff"}}/></div>
              <div><label style={{...labelStyle,fontSize:12,marginBottom:4}}>?¼ë°˜ë²ˆí˜¸</label><input type="tel" value={rTel} onChange={e=>setRTel(formatPhone(e.target.value))} style={{...inputStyle, background:"#fff"}}/></div>
              <div><label style={{...labelStyle,fontSize:12,marginBottom:4}}>?´ë?ë²ˆí˜¸</label><input type="tel" value={rCell} onChange={e=>setRCell(formatPhone(e.target.value))} style={{...inputStyle, background:"#fff"}}/></div>
            </div>
            <div>
              <label style={{...labelStyle,fontSize:12,marginBottom:4}}>ë¶€?™ì‚° ì£¼ì†Œ</label>
              <input type="text" value={rAddr} onChange={e=>setRAddr(e.target.value)} style={{...inputStyle, background:"#fff"}}/>
            </div>
          </div>
        ) : (
          <>
            {/* 7-1. ì¤‘ê°œ?˜ìˆ˜ë£??™ì˜ ë°?ì§€ê¸‰ì—¬ë¶€ ?¤ì • */}
            <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.03)", border:"1px solid #f3f4f6" }}>
              <div style={{ fontSize:16, fontWeight:800, color:"#111", borderLeft:"4px solid #1a73e8", paddingLeft:10, marginBottom:14 }}>ì¤‘ê°œ?˜ìˆ˜ë£?/div>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:14, fontWeight:600, color:"#374151", flexShrink:0 }}>
                    <input type="radio" checked readOnly style={{ accentColor:"#1a73e8", width:18, height:18 }} />
                    ë²•ì •?˜ìˆ˜ë£?ì§€ê¸?
                  </label>
                  <input type="text" placeholder="?? ì¶”ê??¬í•­ ?…ë ¥ (? íƒ)" value={commissionEtc} onChange={(e) => setCommissionEtc(e.target.value)}
                    style={{ ...inputStyle, flex:1, height:38, fontSize:13 }} />
                </div>
                <div style={{ background:"#eff6ff", borderRadius:10, padding:"12px 14px", fontSize:12, color:"#1e40af", border:"1px solid #bfdbfe", lineHeight:1.5 }}>
                  ??ê³µì‹¤ê´‘ê³ ?˜ë¢°???‘ì„±?ëŠ” ë²•ì •?˜ìˆ˜ë£Œë? ì§€ê¸‰í•˜??ê²ƒì— ?€?˜ì—¬ ?™ì˜?˜ë©°, ì¤‘ê°œ?˜ìˆ˜ë£?ì§€ê¸‰ê???ë¯¼ì›??ë°œìƒ??ê²½ìš° <strong>ê³µì‹¤?´ìŠ¤</strong> ê³µì‹¤ê´‘ê³  ?±ë¡???œí•œ???????ˆìŒ???•ì¸?©ë‹ˆ??
                </div>
              </div>
            </div>

            {/* 7-2. ?±ë¡???•ë³´ ë°?ê´€ê³?*/}
            <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.03)", border:"1px solid #f3f4f6" }}>
              <div style={{ fontSize:16, fontWeight:800, color:"#111", borderLeft:"4px solid #1a73e8", paddingLeft:10, marginBottom:14 }}>?±ë¡???•ë³´</div>
              <div style={{ display:"flex", gap:10, marginBottom:12 }}>
                <div style={{flex:1}}><label style={labelStyle}>?´ë¦„</label><input type="text" value={clientName} onChange={e=>setClientName(e.target.value)} style={inputStyle}/></div>
                <div style={{flex:1}}><label style={labelStyle}>?°ë½ì²?/label><input type="tel" value={clientPhone} onChange={e=>setClientPhone(formatPhone(e.target.value))} placeholder="010-0000-0000" style={inputStyle}/></div>
              </div>
              <div>
                <label style={labelStyle}>?Œìœ ì£¼ì???ê´€ê³?/label>
                <select value={ownerRelation} onChange={(e) => setOwnerRelation(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option>ë³¸ì¸</option><option>ê°€ì¡?/option><option>ì§€??/option><option>?„ì°¨??/option><option>ë²•ì¸</option><option>ê¸°í?</option>
                </select>
              </div>
            </div>
          </>
        )}

        {/* 8. ë¶€?™ì‚° ?„ìš© (REALTOR/ADMINë§? */}
        {isRealtor && (
          <div style={{ background:"#fff", borderRadius:14, padding:16, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.03)", border:"1px solid #f3f4f6" }}>
            <div style={{ fontSize:16, fontWeight:800, color:"#1a73e8", borderLeft:"4px solid #1a73e8", paddingLeft:10, marginBottom:14 }}>ë¶€?™ì‚° ?„ìš©</div>

            <label style={labelStyle}>ì¤‘ê°œë³´ìˆ˜ ì§€ê¸?<span style={{color:"#ef4444"}}>*</span></label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
              {["ê³µë™ì¤‘ê°œ","?˜ìˆ˜ë£?5%","?˜ìˆ˜ë£?0%","?˜ìˆ˜ë£?5%","?˜ìˆ˜ë£?00%"].map(opt => (
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

            <label style={labelStyle}>?¸ì¶œ? íƒ <span style={{color:"#ef4444"}}>*</span></label>
            <div style={{ display:"flex", gap:10, marginBottom:14 }}>
              <div onClick={()=>setExposureType("ë¶€?™ì‚°?¸ì¶œ")} style={{ flex:1, padding:12, borderRadius:10, cursor:"pointer", border: exposureType==="ë¶€?™ì‚°?¸ì¶œ"?"1px solid #1a73e8":"1px solid #e5e7eb", background: exposureType==="ë¶€?™ì‚°?¸ì¶œ"?"#eff6ff":"#fff", transition:"all 0.15s ease" }}>
                <div style={{ fontSize:14, fontWeight:800, color: exposureType==="ë¶€?™ì‚°?¸ì¶œ"?"#1a73e8":"#374151", marginBottom:4 }}>ë¶€?™ì‚°?¸ì¶œ</div>
                <div style={{ fontSize:11, color: exposureType==="ë¶€?™ì‚°?¸ì¶œ"?"#1a73e8":"#9ca3af", lineHeight:1.4 }}>
                  ë¹„ë¡œê·¸ì¸, ?¼ë°˜?¸ë¡œê·¸ì¸??ê³µì‹¤ê´‘ê³ ?ì„¸ë³´ê¸°??ë¶€?™ì‚°???´ëŒ ê°€?¥í•˜ê³?br/>
                  ë¹„íšŒ???¼ë°˜?¸ì—ê²ŒëŠ” ë¹„ê³µê°?
                </div>
              </div>
              <div onClick={()=>setExposureType("ë¶€?™ì‚°?¸ì¶œ + ?¼ë°˜?¸ë…¸ì¶?)} style={{ flex:1, padding:12, borderRadius:10, cursor:"pointer", border: exposureType==="ë¶€?™ì‚°?¸ì¶œ + ?¼ë°˜?¸ë…¸ì¶??"1px solid #1a73e8":"1px solid #e5e7eb", background: exposureType==="ë¶€?™ì‚°?¸ì¶œ + ?¼ë°˜?¸ë…¸ì¶??"#eff6ff":"#fff", transition:"all 0.15s ease" }}>
                <div style={{ fontSize:14, fontWeight:800, color: exposureType==="ë¶€?™ì‚°?¸ì¶œ + ?¼ë°˜?¸ë…¸ì¶??"#1a73e8":"#374151", marginBottom:4 }}>ë¶€?™ì‚°+?¼ë°˜?¸ë…¸ì¶?/div>
                <div style={{ fontSize:11, color: exposureType==="ë¶€?™ì‚°?¸ì¶œ + ?¼ë°˜?¸ë…¸ì¶??"#1a73e8":"#9ca3af" }}>ëª¨ë‘?ê²Œ ?¸ì¶œ</div>
              </div>
            </div>

            {/* ?„ë????•ë³´ */}
            <div style={{ background:"#fff7ed", padding:12, borderRadius:10, border:"1px solid #fed7aa", borderLeft:"4px solid #ea580c" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#ea580c", marginBottom:8 }}>?” ?„ë????•ë³´ (ë¹„ê³µê°?</div>
              <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                <div style={{flex:1}}><label style={{...labelStyle,fontSize:12}}>?„ë??¸ëª…</label><input type="text" value={landlordName} onChange={e=>setLandlordName(e.target.value)} placeholder="?´ë¦„" style={inputStyle}/></div>
                <div style={{flex:1}}><label style={{...labelStyle,fontSize:12}}>?°ë½ì²?/label><input type="tel" value={landlordPhone} onChange={e=>setLandlordPhone(formatPhone(e.target.value))} placeholder="010-0000-0000" style={inputStyle}/></div>
              </div>
              <label style={{...labelStyle,fontSize:12}}>ë©”ëª¨</label>
              <textarea value={landlordMemo} onChange={e=>setLandlordMemo(e.target.value)} placeholder="?„ë????¹ì´?¬í•­ ??ì¤‘ê°œ?¬ë‹˜ë§?ë³´ëŠ” ë©”ëª¨" rows={2} style={{...inputStyle, height:"auto", padding:10, resize:"vertical", lineHeight:1.4}}/>
            </div>
          </div>
        )}

        </>)}
      </div>

      <BottomNav />

      {/* ?€?€ ?¬í†  DB ëª¨ë‹¬ ?€?€ */}
      {showPhotoDbModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 500, maxHeight: "90vh", borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f9fafb" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>?¬í† DB ë¶ˆëŸ¬?¤ê¸°</h3>
              <button type="button" onClick={() => setShowPhotoDbModal(false)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#9ca3af" }}>Ã—</button>
            </div>
            
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
              <form onSubmit={handlePhotoDbSearch} style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="?´ë?ì§€ ê²€?‰ì–´ ?…ë ¥"
                  value={photoDbSearch}
                  onChange={e => setPhotoDbSearch(e.target.value)}
                  style={{ flex: 1, padding: "0 12px", height: 40, border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none" }}
                />
                <button type="submit" style={{ padding: "0 16px", background: "#374151", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>ê²€??/button>
              </form>
            </div>

            <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
              <button type="button" onClick={() => setPhotoDbTab("?„ì²´?¬ì§„")} style={{ flex: 1, padding: "12px 0", border: "none", background: "none", fontSize: 14, fontWeight: photoDbTab === "?„ì²´?¬ì§„" ? 800 : 600, color: photoDbTab === "?„ì²´?¬ì§„" ? "#3b82f6" : "#6b7280", borderBottom: photoDbTab === "?„ì²´?¬ì§„" ? "2px solid #3b82f6" : "2px solid transparent", cursor: "pointer" }}>?„ì²´?¬ì§„</button>
              <button type="button" onClick={() => setPhotoDbTab("ì¦ê²¨ì°¾ê¸°")} style={{ flex: 1, padding: "12px 0", border: "none", background: "none", fontSize: 14, fontWeight: photoDbTab === "ì¦ê²¨ì°¾ê¸°" ? 800 : 600, color: photoDbTab === "ì¦ê²¨ì°¾ê¸°" ? "#3b82f6" : "#6b7280", borderBottom: photoDbTab === "ì¦ê²¨ì°¾ê¸°" ? "2px solid #3b82f6" : "2px solid transparent", cursor: "pointer" }}>ì¦ê²¨ì°¾ê¸° â­ï¸</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 16, background: "#f3f4f6" }}>
              {isPhotoDbLoading ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#6b7280", fontSize: 14 }}>ë¶ˆëŸ¬?¤ëŠ” ì¤?..</div>
              ) : photoDbItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 14 }}>ê²€??ê²°ê³¼ê°€ ?†ìŠµ?ˆë‹¤.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 10 }}>
                  {photoDbItems.map((item, idx) => (
                    <div key={idx} style={{ background: "#fff", borderRadius: 8, overflow: "hidden", border: "1px solid #e5e7eb", cursor: "pointer", position: "relative" }} onClick={() => handleSelectFromPhotoDb(item)}>
                      <div style={{ width: "100%", aspectRatio: "1/1", background: "#f3f4f6", backgroundImage: `url(${item.url})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                      <button type="button" onClick={(e) => handleToggleFav(e, item.id, item.is_favorite)} style={{ position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        {item.is_favorite ? "â­ï¸" : "??}
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
