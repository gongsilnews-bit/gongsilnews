export type DraftChannel = "news" | "blog";
export type DraftStyle = "narration" | "analysis";
export type DraftLength = "short" | "standard" | "long";

export interface VacancyPhoto {
  url: string;
  sort_order?: number | null;
}

export interface DraftVacancy {
  id: string;
  vacancy_no?: string | number | null;
  building_name?: string | null;
  property_type?: string | null;
  trade_type?: string | null;
  deposit?: number | null;
  monthly_rent?: number | null;
  maintenance_fee?: number | null;
  sale_price?: number | null;
  sido?: string | null;
  sigungu?: string | null;
  dong?: string | null;
  detail_addr?: string | null;
  exclusive_m2?: number | null;
  supply_m2?: number | null;
  room_count?: number | null;
  bath_count?: number | null;
  current_floor?: number | string | null;
  total_floor?: number | string | null;
  direction?: string | null;
  parking?: string | null;
  options?: string[] | string | null;
  themes?: string[] | string | null;
  move_in_date?: string | null;
  description?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  address_exposure?: string | null;
  vacancy_photos?: VacancyPhoto[] | null;
}

export interface ArticleDraftResult {
  title: string;
  subtitle: string;
  content_article: string;
  content_blog: string;
  content_shorts: string;
  content_sns: string;
  section2: string;
  keywords: string[];
  imageUrl?: string;
  imageCaption?: string;
  vacancyId: string;
}
