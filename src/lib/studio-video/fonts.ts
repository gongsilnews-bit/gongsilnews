// 영상 편집기 글꼴 목록 — 앱 studio-app/src/video/fonts.js 와 같은 차례·이름 (family = 글꼴 파일 안의 이름)
// 사장님: Pretendard·나눔고딕·지마켓산스·배민체를 맨 앞에. 모두 무료·상업 이용 가능.
export const STUDIO_FONTS: { family: string; label: string }[] = [
  { family: "Pretendard", label: "Pretendard" },
  { family: "NanumGothic", label: "나눔고딕" },
  { family: "GmarketSans", label: "지마켓 산스" },
  { family: "Do Hyeon", label: "배민 도현" },
  { family: "Jua", label: "배민 주아" },
  { family: "Yeon Sung", label: "배민 연성" },
  { family: "Malgun Gothic", label: "맑은 고딕" },
  { family: "NanumMyeongjo", label: "나눔명조" },
  { family: "Black Han Sans", label: "검은고딕" },
  { family: "Gowun Dodum", label: "고운돋움" },
  { family: "Nanum Pen", label: "나눔손글씨 펜" },
  { family: "Song Myung", label: "송명" },
];
export const DEFAULT_FONT = "Malgun Gothic";
export const fontLabel = (family?: string) => STUDIO_FONTS.find((f) => f.family === family)?.label || "맑은 고딕";
/** 맑은 고딕만 굵은 글꼴이 따로 있어 굵게(700), 나머지는 받은 파일 굵기 그대로 (render.js assBold 와 같음) */
export const fontWeight = (family?: string, bold = true) => (!family || family === DEFAULT_FONT || !STUDIO_FONTS.some((f) => f.family === family) ? (bold ? 700 : 400) : 400);
export const fontCss = (family?: string) => `'${family || DEFAULT_FONT}', 'Malgun Gothic', sans-serif`;
