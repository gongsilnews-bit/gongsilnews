/* eslint-disable @typescript-eslint/no-explicit-any */
import { CATEGORY_TO_PROPERTY_TYPE, MAINT_PRESETS } from "./gongsilHelpers";

type FilterVacanciesOptions = {
  dbVacancies: any[];
  activeCategory: string;
  activePills: string[];
  filterTradeTypes: string[];
  appliedMaemaeMin: number | null;
  appliedMaemaeMax: number | null;
  appliedDepositMin: number | null;
  appliedDepositMax: number | null;
  appliedRentMin: number | null;
  appliedRentMax: number | null;
  filterPriceMin: number | null;
  filterPriceMax: number | null;
  filterAreaMin: number | null;
  filterAreaMax: number | null;
  filterMaintIdx: number;
  filterRoomCount: number | null;
  filterBathCount: number | null;
  filterDirection: string | null;
  filterParking: string | null;
  filterYearMin: number | null;
  filterYearMax: number | null;
  filterUnitMin: number | null;
  filterUnitMax: number | null;
  filterOwnerRole: string | null;
  filterCommissionType: string | null;
  filterThemes: string[];
  filterSearchKeyword: string;
  wishTab: string;
  recentViews: any[];
  wishlist: any[];
  wishlistData: any[];
  selectedCategoryId: string | null;
  isAuctionMode: boolean;
  filterAuctionAppraisalMin: number | null;
  filterAuctionAppraisalMax: number | null;
  filterAuctionBidPriceMin: number | null;
  filterAuctionBidPriceMax: number | null;
  filterAuctionDiscount: number;
  filterAuctionBidCount: number;
  filterAuctionStartDate: string;
};

export function filterVacancies({
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
}: FilterVacanciesOptions): any[] {
  let list = dbVacancies;

  if (filterSearchKeyword && /^\d+$/.test(filterSearchKeyword.trim())) {
    const kw = filterSearchKeyword.trim();
    return list.filter((v) => String(v.vacancy_no) === kw);
  }

  if (isAuctionMode) {
    let auctionList = list.filter((v) => v.trade_type === "경매");
    if (activePills.length === 0) return [];
    auctionList = auctionList.filter((v) => {
      const meta = (v as any).metadata || {};
      const mcls = meta.cltrUsgMclsCtgrNm || "";
      const scls = meta.cltrUsgSclsCtgrNm || "";
      return activePills.some((pill) => {
        if (pill === "아파트") return scls.includes("아파트") || scls.includes("오피스텔") || scls.includes("공동주택");
        if (pill === "단독/다가구") return scls.includes("단독") || scls.includes("다가구") || scls.includes("주택");
        if (pill === "빌라/주택") return (mcls.includes("주거") || scls.includes("주택") || scls.includes("빌라") || scls.includes("다세대") || scls.includes("연립")) && !scls.includes("아파트");
        if (pill === "빌딩/사무실") return mcls.includes("상업") || scls.includes("상가") || scls.includes("점포") || scls.includes("판매") || scls.includes("사무") || mcls.includes("업무") || scls.includes("오피스텔") || scls.includes("아파트형") || scls.includes("지식산업") || mcls.includes("근린생활") || scls.includes("상가주택") || scls.includes("빌딩") || mcls.includes("숙박") || mcls.includes("의료") || scls.includes("업무시설") || mcls.includes("업무시설");
        if (pill === "공장/창고") return (scls.includes("공장") || scls.includes("창고") || scls.includes("제조") || mcls.includes("산업") || mcls.includes("공장")) && !scls.includes("아파트형") && !scls.includes("지식산업");
        if (pill === "토지") return mcls.includes("토지") || scls.includes("토지") || mcls.includes("대지") || scls.includes("대지") || mcls.includes("임야") || mcls.includes("전") || mcls.includes("답") || mcls.includes("잡종지") || mcls.includes("과수원");
        return false;
      });
    });

    if (filterSearchKeyword) {
      const kw = filterSearchKeyword.trim().toLowerCase();
      auctionList = auctionList.filter((v) => {
        const meta = (v as any).metadata || {};
        const cltrNo = String(meta.cltrMngNo || meta.cltr_mng_no || "").toLowerCase();
        const bldName = String(v.building_name || "").toLowerCase();
        const dongName = String(v.dong || "").toLowerCase();
        const sigungu = String(v.sigungu || "").toLowerCase();
        const addr = String(v.detail_addr || "").toLowerCase();
        const scls = String(meta.cltrUsgSclsCtgrNm || "").toLowerCase();
        const mcls = String(meta.cltrUsgMclsCtgrNm || "").toLowerCase();
        return cltrNo.includes(kw) || bldName.includes(kw) || dongName.includes(kw) || sigungu.includes(kw) || addr.includes(kw) || scls.includes(kw) || mcls.includes(kw);
      });
    }

    if (filterAuctionAppraisalMin !== null || filterAuctionAppraisalMax !== null) {
      auctionList = auctionList.filter((v) => {
        const meta = (v as any).metadata || {};
        const appraisal = meta.appraisal_price || parseInt(meta.apslEvlAmt || "0", 10) || 0;
        if (filterAuctionAppraisalMin !== null && appraisal < filterAuctionAppraisalMin) return false;
        if (filterAuctionAppraisalMax !== null && appraisal > filterAuctionAppraisalMax) return false;
        return true;
      });
    }
    if (filterAuctionBidPriceMin !== null || filterAuctionBidPriceMax !== null) {
      auctionList = auctionList.filter((v) => {
        const meta = (v as any).metadata || {};
        const bidPrice = meta.lowest_bid_price || parseInt(meta.lowstBidPrcIndctCont || "0", 10) || 0;
        if (filterAuctionBidPriceMin !== null && bidPrice < filterAuctionBidPriceMin) return false;
        if (filterAuctionBidPriceMax !== null && bidPrice > filterAuctionBidPriceMax) return false;
        return true;
      });
    }
    if (filterAuctionDiscount > 0) {
      auctionList = auctionList.filter((v) => {
        const meta = (v as any).metadata || {};
        const appraisal = meta.appraisal_price || parseInt(meta.apslEvlAmt || "0", 10) || 0;
        const bidPrice = meta.lowest_bid_price || parseInt(meta.lowstBidPrcIndctCont || "0", 10) || 0;
        if (!appraisal || !bidPrice) return false;
        return ((appraisal - bidPrice) / appraisal) * 100 >= filterAuctionDiscount;
      });
    }
    if (filterAuctionBidCount > 0) {
      auctionList = auctionList.filter((v) => {
        const meta = (v as any).metadata || {};
        return (meta.bid_count || meta.pbctCnt || 0) >= filterAuctionBidCount;
      });
    }
    if (filterAuctionStartDate !== "all") {
      const now = new Date();
      auctionList = auctionList.filter((v) => {
        const meta = (v as any).metadata || {};
        const dateStr = meta.pbctBegnDtm || meta.pblctBgnDtm || meta.bid_start_date || "";
        if (!dateStr) return false;
        const diffDays = (new Date(dateStr).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        switch (filterAuctionStartDate) {
          case "1w": return diffDays >= -7 && diffDays <= 7;
          case "2w": return diffDays >= -14 && diffDays <= 14;
          case "1m": return diffDays >= -30 && diffDays <= 30;
          case "1_3m": return diffDays >= 30 && diffDays <= 90;
          case "over_3m": return diffDays > 90;
          default: return true;
        }
      });
    }
    if (filterAreaMin !== null || filterAreaMax !== null) {
      auctionList = auctionList.filter((v) => {
        const meta = (v as any).metadata || {};
        const area = parseFloat(meta.bldSqms || meta.cltrAr || v.exclusive_m2 || "0") || 0;
        if (filterAreaMin !== null && area < filterAreaMin) return false;
        if (filterAreaMax !== null && area > filterAreaMax) return false;
        return true;
      });
    }
    return auctionList;
  }

  list = list.filter((v) => v.trade_type !== "경매");
  if (activeCategory === "wish") {
    if (wishTab === "recent") return recentViews.map((id) => dbVacancies.find((v) => v.id === id)).filter(Boolean) as any[];
    if (wishTab === "wish") {
      let wishList = wishlist.map((id) => dbVacancies.find((v) => v.id === id)).filter(Boolean) as any[];
      if (selectedCategoryId !== "ALL") {
        wishList = wishList.filter((v) => {
          const b = wishlistData.find((wd) => String(wd.vacancy_id) === String(v.id));
          return Boolean(b) && b.category_id === selectedCategoryId;
        });
      }
      return wishList;
    }
    return [];
  }

  const dbPropType = CATEGORY_TO_PROPERTY_TYPE[activeCategory];
  if (dbPropType) list = list.filter((v) => v.property_type === dbPropType);
  if (activeCategory !== "all") {
    if (activePills.length === 0) return [];
    list = list.filter((v) => {
      if (activeCategory === "apart" && activePills.includes("기타") && ["아파트분양권", "재건축", "오피스텔분양권", "재개발"].includes(v.sub_category)) return true;
      if (activeCategory === "one" && activePills.length === 1 && activePills.includes("오피스텔만 보기")) return Boolean(v.themes && Array.isArray(v.themes) && v.themes.includes("오피스텔"));
      if (activeCategory === "biz" && activePills.includes("건물/빌딩") && (v.sub_category === "건물" || v.sub_category === "빌딩/건물" || v.sub_category === "건물/빌딩")) return true;
      if (activeCategory === "villa" && activePills.includes("단독/다가구") && v.sub_category === "상가주택") return true;
      if (activeCategory === "one" && activePills.includes("원룸") && (["원룸", "원룸/투룸", "원룸·투룸"].includes(v.sub_category) || (v.property_type === "원룸·투룸(풀옵션)" && !v.sub_category))) return true;
      return activePills.includes(v.sub_category);
    });
  }

  if (activeCategory === "apart" || activeCategory === "villa") {
    if (filterTradeTypes.length > 0) list = list.filter((v) => filterTradeTypes.includes(v.trade_type));
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
    if (filterTradeTypes.length > 0) list = list.filter((v) => filterTradeTypes.includes(v.trade_type));
    list = list.filter((v) => {
      const depositMin = v.trade_type === "매매" ? (appliedMaemaeMin ?? filterPriceMin) : appliedDepositMin ?? filterPriceMin;
      const depositMax = v.trade_type === "매매" ? (appliedMaemaeMax ?? filterPriceMax) : appliedDepositMax ?? filterPriceMax;
      const deposit = v.deposit || 0;
      if (depositMin !== null && deposit < depositMin) return false;
      if (depositMax !== null && deposit > depositMax) return false;
      if (v.trade_type === "월세" || v.trade_type === "단기") {
        if (appliedRentMin !== null && (v.monthly_rent || 0) < appliedRentMin) return false;
        if (appliedRentMax !== null && (v.monthly_rent || 0) > appliedRentMax) return false;
      }
      return true;
    });
  }

  if (filterAreaMin !== null || filterAreaMax !== null) list = list.filter((v) => {
    const area = v.exclusive_m2 || v.supply_m2 || 0;
    return !(filterAreaMin !== null && area < filterAreaMin) && !(filterAreaMax !== null && area > filterAreaMax);
  });
  if (filterMaintIdx > 0) {
    const m = MAINT_PRESETS[filterMaintIdx];
    list = list.filter((v) => (v.maintenance_fee || 0) >= m.min && (v.maintenance_fee || 0) < (m.max === Infinity ? 99999999 : m.max));
  }
  if (filterRoomCount !== null) list = list.filter((v) => (v.room_count || 0) >= filterRoomCount);
  if (filterBathCount !== null) list = list.filter((v) => (v.bath_count || 0) >= filterBathCount);
  if (filterDirection) list = list.filter((v) => v.direction === filterDirection);
  if (filterParking) list = list.filter((v) => Boolean(v.parking) && v.parking.includes(filterParking));
  if (filterYearMin !== null || filterYearMax !== null) list = list.filter((v) => {
    const year = v.approval_year || 0;
    return Boolean(year) && !(filterYearMin !== null && year < filterYearMin) && !(filterYearMax !== null && year > filterYearMax);
  });
  if (filterUnitMin !== null || filterUnitMax !== null) list = list.filter((v) => {
    const units = v.total_units || 0;
    return Boolean(units) && !(filterUnitMin !== null && units < filterUnitMin) && !(filterUnitMax !== null && units > filterUnitMax);
  });
  if (filterOwnerRole) list = list.filter((v) => v.owner_role === filterOwnerRole);
  if (filterCommissionType) list = list.filter((v) => {
    const vc = v.realtor_commission || v.commission_type || "";
    const percentMatch = vc.match(/(\d+)%/);
    const vcPercent = percentMatch ? parseInt(percentMatch[1], 10) : (vc.includes("100") || vc === "법정수수료" || vc.includes("법정")) ? 100 : vc.includes("50") ? 50 : vc.includes("25") ? 25 : 0;
    if (filterCommissionType === "공동중개") return vc.includes("공동") || vcPercent >= 0;
    const minPercent = parseInt(filterCommissionType, 10);
    return !isNaN(minPercent) ? vcPercent >= minPercent : true;
  });
  if (filterThemes.length > 0) list = list.filter((v) => Boolean(v.themes && Array.isArray(v.themes) && filterThemes.some((t) => v.themes.includes(t))));
  if (filterSearchKeyword) {
    const kw = filterSearchKeyword.trim().toLowerCase();
    list = list.filter((v) => String(v.vacancy_no || "").toLowerCase().includes(kw) || String(v.building_name || "").toLowerCase().includes(kw) || String(v.dong || "").toLowerCase().includes(kw) || String(v.sigungu || "").toLowerCase().includes(kw) || String(v.detail_addr || "").toLowerCase().includes(kw));
  }
  return list;
}