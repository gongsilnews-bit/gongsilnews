/* eslint-disable @typescript-eslint/no-explicit-any */
import { CATEGORY_TO_PROPERTY_TYPE, MAINT_PRESETS, getAuctionInfo, getGroupTab, matchGroupPill } from "./gongsilHelpers";

type FilterVacanciesOptions = {
  dbVacancies: any[];
  activeCategory: string;
  /** 위쪽 칸(GROUP_TABS id) — 아파트·오피스텔·빌라/주택 … 공장/토지/기타. 없으면 예전처럼 큰 칸으로만 */
  activeGroup?: string | null;
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
  /** 층수 (2026-11-17 3줄 칩) — 1층·저층·중간층·고층·탑층, 상세검색 창 값(지하·2층·3~5층·6층이상)도 */
  filterFloor?: string | null;
  /** 기타옵션 — 고른 것을 다 가진 물건만 */
  filterOptions?: string[];
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
  filterAuctionBidCount: number | string;
  filterAuctionStartDate: string;
};

export function filterVacancies({
  dbVacancies,
  activeCategory,
  activeGroup,
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
  filterFloor,
  filterOptions,
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
      const info = getAuctionInfo(v);
      return activePills.includes(info.category);
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
    if (filterAuctionBidCount !== undefined && filterAuctionBidCount !== null && filterAuctionBidCount !== "all") {
      auctionList = auctionList.filter((v) => {
        const meta = (v as any).metadata || {};
        const count = Number(meta.fail_count ?? meta.usbdNft ?? meta.pbctCnt ?? meta.pbct_cnt ?? meta.bid_count ?? 0) || 0;
        const valStr = String(filterAuctionBidCount);
        if (valStr === "0") return count === 0;
        if (valStr === "1") return count === 1;
        if (valStr === "2") return count === 2;
        if (valStr === "3") return count === 3;
        if (valStr === "4" || valStr === "4+" || valStr === "4회이상") return count >= 4;
        if (typeof filterAuctionBidCount === "number" && filterAuctionBidCount > 0) {
          return count >= filterAuctionBidCount;
        }
        return true;
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
  const group = getGroupTab(activeGroup);
  if (group && group.base === activeCategory) {
    // 새 칸 나눔 (2026-11-17) — 칸이 큰 칸 property_type 을 넘나들 수 있어(빌라/주택 · 빌딩/건물 매매 · 신축/분양/재건축) 알약마다 맞힌다.
    //  .filter 한 번이라 알약 두 개에 걸려도 한 번만 나온다
    if (activePills.length === 0) return [];
    list = list.filter((v) => activePills.some((p) => matchGroupPill(v, p, { fallbackType: dbPropType || "" })));
  } else {
  if (dbPropType) list = list.filter((v) => v.property_type === dbPropType);
  if (activeCategory !== "all") {
    if (activePills.length === 0) return [];
    list = list.filter((v) => {
      if (activeCategory === "apart" && activePills.includes("기타") && ["아파트분양권", "재건축", "오피스텔분양권", "재개발"].includes(v.sub_category)) return true;
      // [아파트] 칸 "분양권·재건축" 알약 (2026-11-16) — 오피스텔분양권은 [오피스텔] 칸의 같은 이름 알약이 바로 맞힌다
      if (activeCategory === "apart" && activePills.includes("분양권·재건축") && ["아파트분양권", "재건축", "재개발"].includes(v.sub_category)) return true;
      if (activeCategory === "one" && activePills.length === 1 && activePills.includes("오피스텔만 보기")) return Boolean(v.themes && Array.isArray(v.themes) && v.themes.includes("오피스텔"));
      if (activeCategory === "biz" && activePills.includes("건물/빌딩") && (v.sub_category === "건물" || v.sub_category === "빌딩/건물" || v.sub_category === "건물/빌딩")) return true;
      if (activeCategory === "villa" && activePills.includes("단독/다가구") && v.sub_category === "상가주택") return true;
      if (activeCategory === "one" && activePills.includes("원룸") && (["원룸", "원룸/투룸", "원룸·투룸"].includes(v.sub_category) || (v.property_type === "원룸·투룸(풀옵션)" && !v.sub_category))) return true;
      return activePills.includes(v.sub_category);
    });
  }
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
  // 등록자 — 중개사(REALTOR) / 임대인·일반(OWNER·USER: 중개사 아닌 등록자 — 상세검색 창의 "임대인"이 OWNER 라 DB 값 USER 와 안 맞던 것 함께 고침)
  if (filterOwnerRole) list = list.filter((v) => (filterOwnerRole === "OWNER" || filterOwnerRole === "USER") ? v.owner_role !== "REALTOR" : v.owner_role === filterOwnerRole);
  if (filterFloor) list = list.filter((v) => matchFloor(v, filterFloor));
  if (filterOptions && filterOptions.length > 0) list = list.filter((v) => {
    const raw = v.options || v.facilities || [];
    const all: string[] = Array.isArray(raw) ? raw.map((x: unknown) => String(x).trim()) : String(raw).split(",").map((x) => x.trim());
    return filterOptions.every((o) => all.some((x) => x.includes(o)));
  });
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

/**
 * 층수 맞히기 (2026-11-17) — current_floor(해당 층) · total_floor(전체 층) 기준.
 *  3줄 칩: 1층 · 저층(전체의 아래 1/3) · 중간층 · 고층(위 1/3, 탑층 제외) · 탑층(해당 층 = 전체 층)
 *  상세검색 창: 지하 · 1층 · 2층 · 3~5층 · 6층이상
 */
export function matchFloor(v: any, floor: string): boolean {
  const raw = String(v.current_floor ?? v.floor ?? "").trim();
  if (!raw) return false;
  const under = /^(B|b|지하|반지하)/.test(raw);
  const n = parseInt(raw.replace(/[^0-9-]/g, ""), 10);
  const total = parseInt(String(v.total_floor ?? "").replace(/[^0-9]/g, ""), 10);
  if (floor === "지하") return under;
  if (under || isNaN(n)) return false;
  if (floor === "1층") return n === 1;
  if (floor === "2층") return n === 2;
  if (floor === "3~5층") return n >= 3 && n <= 5;
  if (floor === "6층이상") return n >= 6;
  if (floor === "탑층") return !isNaN(total) && total > 0 && n === total;
  if (isNaN(total) || total <= 0) return false;
  const r = n / total;
  if (floor === "저층") return n >= 2 && r <= 1 / 3;
  if (floor === "중간층") return r > 1 / 3 && r <= 2 / 3;
  if (floor === "고층") return r > 2 / 3 && n < total;
  return true;
}
