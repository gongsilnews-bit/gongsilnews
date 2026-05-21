
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
  userOpinion: string;
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
}
