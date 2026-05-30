
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
  // Page 1: Overview
  address: string;
  subTitle: string;
  priceMain: string;
  overviewTable: {
    location?: string;
    zoning?: string;
    landArea?: string;
    totalArea?: string;
    buildingScale?: string;
    mainPurpose?: string;
    parking?: string;
    elevator?: string;
    completionYear?: string;
    [key: string]: any;
  } | {
    label: string;
    value: string;
  }[];
  agentName: string;
  agentRepresentative: string;
  agentPhone: string;
  agentMobile: string;
  investmentSummary: {
    box1Title: string; box1Text: string;
    box2Title: string; box2Text: string;
    box3Title: string; box3Text: string;
  };

  // Page 2: Status & Valuation
  floorStatus: {
    floor: string; purpose: string; lease: string; status: string; note: string;
  }[];
  floorStatusNotice: string;
  highlights: string[];
  valuationText: string;

  // Page 3: Photos (Images are in FlyerState, just add captions if needed)
  photoCaptions: {
    main: string;
    sub1: string;
    sub2: string;
    feat1: string;
    feat2: string;
  };

  // Page 4: Area Analysis
  areaTargetName: string;
  areaTargetDesc: string;
  areaBox1Title: string; areaBox1Text: string;
  areaBox2Title: string; areaBox2Text: string;
  areaBox3Title: string; areaBox3Text: string;

  // Page 5: Roadmap
  roadmap: {
    box1Title: string; box1Text: string;
    box2Title: string; box2Text: string;
    box3Title: string; box3Text: string;
    box4Title: string; box4Text: string;
  };

  // Backward compatibility fields
  promotionText?: string;
  transactionType?: TransactionType;
  priceSub?: string;
  managementFee?: string;
  area?: string;
  floor?: string;
  direction?: string;
  roomCount?: string;
  parking?: string;
  moveInDate?: string;
  options?: string;
  sections?: FlyerSection[];
  consultationUrl?: string;
  agentAdditionalInfo?: string[];
  noticeTitle?: string;
  noticeContent?: string;
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
