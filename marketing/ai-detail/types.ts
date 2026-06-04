
export type SectionType = 'grid' | 'list' | 'table' | 'sns';

export type TransactionType = '매매' | '전세' | '월세' | '단기임대';

export interface SectionItem {
  id: string;
  text: string;      
  title?: string;    
  imageKey: string;
}

export interface FlyerSection {
  id: string;
  type: SectionType;
  intro?: string;       
  title: string;        
  description?: string; 
  items: SectionItem[];
}

export interface PropertyInfo {
  // Hero Section
  promotionText: string;    // e.g. "햇살 가득한 남향, 올수리 완료"
  address: string;          // e.g. "반포 자이 30평형" (Main Title)
  subTitle: string;         // e.g. "특올수리 | 입주협의 | 로얄동" (Sub Title beneath Main Title)
  
  // Real Estate Specifics
  transactionType: TransactionType; // 매매, 전세, 월세, 단기
  priceMain: string;        // 매매가 or 보증금 (e.g. "10억 5천" or "5,000")
  priceSub: string;         // 월세 (e.g. "120") - Optional
  managementFee: string;    // 관리비 (e.g. "20만원 (인터넷 포함)")
  
  // Specs
  area: string;             // 전용/공급 면적 e.g. "84㎡ / 59㎡"
  floor: string;            // 층수 info e.g. "15층 / 총 20층"
  direction: string;        // 방향 e.g. "남향 (거실 기준)"
  roomCount: string;        // 방/욕실 e.g. "3개 / 2개"
  parking: string;          // 주차 e.g. "세대당 1.2대"
  moveInDate: string;       // 입주가능일 e.g. "즉시 입주 가능"
  options: string;          // 옵션 정보 e.g. "에어컨, 세탁기, 냉장고 풀옵션"

  // Dynamic Sections (Photos & Highlights)
  sections: FlyerSection[];

  // Agent / Notice Section
  agentName: string;        // 공인중개사 이름/사무소명
  agentRepresentative: string; // 대표자 성명 e.g. "대표 공인중개사 홍길동"
  agentPhone: string;       // 연락처 (일반전화)
  agentMobile?: string;     // 휴대전화 (스마트폰)
  agentMapUrl?: string;     // 네이버 지도 링크
  consultationUrl?: string; // 문의하기 버튼 링크
  agentAdditionalInfo?: string[]; // 추가 정보 (주소, 등록번호 등)
  
  // Social Media
  socialYoutube?: string;
  socialBlog?: string;
  socialInstagram?: string;
  socialFacebook?: string;
  socialKakao?: string;
  socialThreads?: string;
  
  // Footer Notice (Textarea)
  noticeTitle: string;      // e.g. "중개사 코멘트" or "위치적 특징"
  noticeContent: string;    // Multiline
}

export interface GeneratedContent {
  promotionText: string;
  summary: string;
  gridInfo?: {
    title: string;
    intro: string;
    features: string[];
  };
  listInfo?: {
    title: string;
    intro: string;
    description: string;
    items: { title: string; description: string }[];
  };
}

export interface FlyerColor {
  id: string;
  name: string;
  primary: string;   // Main Brand Color
  secondary: string; // Lighter Accent
  dark: string;      // Darker shade for gradients/backgrounds
}

export interface FlyerLayout {
  id: string;
  name: string;
  type: 'type1' | 'type2' | 'type3' | 'type4' | 'type5';
  headingFont: string; // Tailwind class for headings
  bodyFont: string;    // Tailwind class for body text
}

export interface FlyerState {
  info: PropertyInfo;
  generated: GeneratedContent;
  mainImage: string | null;
  colorTheme: FlyerColor;
  layoutTheme: FlyerLayout;
  [key: string]: any;
}
