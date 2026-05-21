export enum Tone {
  OFFICIAL = '공식 뉴스',
  ON_SITE = '현장중계',
  WARNING = '경고형',
  DATA_CENTRIC = '데이터 중심',
}

export enum Audience {
  GENERAL = '일반 독자',
  REALTOR = '공인중개사',
  INVESTOR = '투자자',
}

export enum WritingStyle {
    FORMAL = '존댓말',
    INFORMAL = '반말',
}

export enum ImageAspectRatio {
  RATIO_16_9 = '16:9',
  RATIO_1_1 = '1:1',
  RATIO_9_16 = '9:16',
}

export enum ImageStyle {
  PHOTOGRAPHY = '실사',
  ILLUSTRATION = '일러스트',
  PIXEL_ART = '픽셀 아트',
  VECTOR = '벡터',
  ANIME = '애니메이션',
}

export enum PropertyType {
    APARTMENT = '아파트/분양권',
    SHORT_TERM_RENTAL = '단기임대/에어비앤비',
    HIGH_END_HOUSE = '하이앤드/주택',
    BUILDING_OFFICE = '빌딩/사무실/상가',
    LAND_RURAL_HOUSE = '토지/전원주택/펜션',
    ETC = '기타',
}

export enum TransactionType {
    SALE = '매매',
    JEONSE = '전세',
    MONTHLY_RENT = '월세',
    SHORT_TERM = '단기',
}

export interface UploadedFile {
  data: string; // base64 encoded data
  mimeType: string;
  name: string;
}

export interface GeneratedImage {
  url: string; // data URL
  prompt: string;
}

export interface GeneratedPrompt {
  text: string;
  settings: {
    aspectRatio: ImageAspectRatio;
    style: ImageStyle;
    count: number;
  };
  images: GeneratedImage[];
  isLoading: boolean;
}


export interface FormData {
  sourceText: string;
  tone: Tone;
  audience: Audience;
  file: UploadedFile | null;
  contentTypes: {
    shorts: boolean;
    article: boolean;
    cardNews: boolean;
    factCheck: boolean;
    blog: boolean;
    prompts: boolean;
  };
  writingStyle: WritingStyle;
  articleLength: number;
  blogLength: number;
  channelName: string;
  promptCount: number;
  propertyKeywords: string[];
  // New Fields
  propertyType: PropertyType | '';
  transactionType: TransactionType | '';
  address: string;
  salePrice: string;
  jeonsePrice: string;
  deposit: string;
  monthlyRent: string;
  shortTermDeposit: string;
  shortTermRent: string;
  area: string;
  features: string;
}