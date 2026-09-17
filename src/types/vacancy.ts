/** 기사에 연결할 수 있는 공실 매물 ('부동산노출 + 일반인노출' 진행중 매물) */
export type EligibleVacancy = {
  id: string;
  vacancy_no?: number | null;
  building_name?: string | null;
  sido?: string | null;
  sigungu?: string | null;
  dong?: string | null;
  detail_addr?: string | null;
  trade_type: string;
  property_type?: string | null;
  deposit?: number | null;
  monthly_rent?: number | null;
  maintenance_fee?: number | null;
  exclusive_m2?: number | null;
  supply_m2?: number | null;
  room_count?: number | null;
  bath_count?: number | null;
  themes?: unknown;
  exposure_type?: string | null;
  owner_id?: string;
  vacancy_photos?: { url: string; sort_order?: number | null }[];
};

/** 작성자 id → 유료 여부와 연결 가능 공실 목록 */
export type AuthorVacancyOptions = Record<
  string,
  { isPaid: boolean; vacancies: EligibleVacancy[] }
>;
