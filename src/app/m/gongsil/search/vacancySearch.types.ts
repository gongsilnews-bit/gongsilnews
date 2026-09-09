export type VacancyMode = "공실" | "경매";
export type VacancySearchType = "map" | "filter";

export interface FilterState {
  propertyTypes: string[];
  tradeTypes: string[];
  keyword: string;
  priceMin: number | null;
  priceMax: number | null;
  salePriceMin?: number | null;
  salePriceMax?: number | null;
  depositMin?: number | null;
  depositMax?: number | null;
  monthlyRentMin?: number | null;
  monthlyRentMax?: number | null;
  areaMin: number | null;
  areaMax: number | null;
  yearMin: number | null;
  yearMax: number | null;
  floor: string | null;
  roomCount: number | null;
  bathCount: number | null;
  direction: string | null;
  directions?: string[];
  unitsMin: number | null;
  unitsMax?: number | null;
  maintMax: number | null;
  parking: string | null;
  parkings?: string[];
  moveInDate?: string | null;
  options: string[];
  ownerRole: string | null;
  commissionType: string | null;
  themes: string[];
  sido: string | null;
  sigungu: string | null;
  dong: string | null;
  locationSearchType?: VacancySearchType;
  auctionAppraisalMin: number | null;
  auctionAppraisalMax: number | null;
  auctionBidPriceMin: number | null;
  auctionBidPriceMax: number | null;
  auctionDiscount: number;
  auctionBidCount: number;
  auctionStartDate: string;
}

export interface VacancyRecord {
  [key: string]: unknown;
  id?: string;
  building_name?: string | null;
  sido?: string | null;
  sigungu?: string | null;
  dong?: string | null;
  property_type?: string | null;
  sub_category?: string | null;
  trade_type?: string | null;
  vacancy_no?: string | null;
}

export interface VacancySearchResult<T extends VacancyRecord = VacancyRecord> {
  items: T[];
  total: number;
  loading: boolean;
  error: string | null;
}