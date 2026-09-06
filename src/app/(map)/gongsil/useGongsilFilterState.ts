import { useState } from "react";

export function useGongsilFilterState() {
  const [filterTradeTypes, setFilterTradeTypes] = useState<string[]>([]);
  const [tempFilterTradeTypes, setTempFilterTradeTypes] = useState<string[]>([]);
  const [tempMaemaeMin, setTempMaemaeMin] = useState<number | null>(null);
  const [tempMaemaeMax, setTempMaemaeMax] = useState<number | null>(null);
  const [tempDepositMin, setTempDepositMin] = useState<number | null>(null);
  const [tempDepositMax, setTempDepositMax] = useState<number | null>(null);
  const [tempRentMin, setTempRentMin] = useState<number | null>(null);
  const [tempRentMax, setTempRentMax] = useState<number | null>(null);
  const [filterAuctionDiscount, setFilterAuctionDiscount] = useState(0);
  const [filterAuctionBidCount, setFilterAuctionBidCount] = useState(0);
  const [filterAuctionStartDate, setFilterAuctionStartDate] = useState("all");
  const [filterAuctionAppraisalMin, setFilterAuctionAppraisalMin] = useState<number | null>(null);
  const [filterAuctionAppraisalMax, setFilterAuctionAppraisalMax] = useState<number | null>(null);
  const [filterAuctionBidPriceMin, setFilterAuctionBidPriceMin] = useState<number | null>(null);
  const [filterAuctionBidPriceMax, setFilterAuctionBidPriceMax] = useState<number | null>(null);
  const [sliderInteractions, setSliderInteractions] = useState<Record<string, { min: boolean; max: boolean }>>({});
  const [roomBathInteractions, setRoomBathInteractions] = useState({ room: false, bath: false });
  const [appliedMaemaeMin, setAppliedMaemaeMin] = useState<number | null>(null);
  const [appliedMaemaeMax, setAppliedMaemaeMax] = useState<number | null>(null);
  const [appliedDepositMin, setAppliedDepositMin] = useState<number | null>(null);
  const [appliedDepositMax, setAppliedDepositMax] = useState<number | null>(null);
  const [appliedRentMin, setAppliedRentMin] = useState<number | null>(null);
  const [appliedRentMax, setAppliedRentMax] = useState<number | null>(null);
  const [popoverSearchKeyword, setPopoverSearchKeyword] = useState("");
  const [filterSearchKeyword, setFilterSearchKeyword] = useState("");
  const [filterPriceMin, setFilterPriceMin] = useState<number | null>(null);
  const [filterPriceMax, setFilterPriceMax] = useState<number | null>(null);
  const [filterAreaMin, setFilterAreaMin] = useState<number | null>(null);
  const [filterAreaMax, setFilterAreaMax] = useState<number | null>(null);
  const [filterMaintIdx, setFilterMaintIdx] = useState(0);
  const [filterRoomCount, setFilterRoomCount] = useState<number | null>(null);
  const [filterBathCount, setFilterBathCount] = useState<number | null>(null);
  const [filterDirection, setFilterDirection] = useState<string | null>(null);
  const [filterParking, setFilterParking] = useState<string | null>(null);
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

  return {
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
  };
}
