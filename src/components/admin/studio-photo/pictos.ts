// 이미지 편집 — 심플한 픽토그램 (부동산에 자주 쓰는 선 아이콘). 24칸 격자의 SVG 경로를 그대로 그려서 크기를 키워도 또렷하다
// 모양: line = 선만 · circle = 색 원 안에 흰 선
export type PictoStyle = "line" | "circle";
export type Picto = { id: string; name: string; d: string };
export const PICTOS: Picto[] = [
  { id: "pin", name: "위치", d: "M12 21s-6-5.6-6-11a6 6 0 1112 0c0 5.4-6 11-6 11z M12 7.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" },
  { id: "home", name: "집", d: "M3 11l9-7 9 7 M5 10v10h14V10 M10 20v-6h4v6" },
  { id: "apt", name: "아파트", d: "M3 21V8l6-3v16 M9 21V3h12v18 M2 21h20 M12 7h2 M16 7h2 M12 11h2 M16 11h2 M12 15h2 M16 15h2" },
  { id: "building", name: "상가·빌딩", d: "M5 21V3h14v18 M3 21h18 M9 7h2 M13 7h2 M9 11h2 M13 11h2 M9 15h2 M13 15h2 M11 21v-3h2v3" },
  { id: "subway", name: "지하철", d: "M7 3h10a2 2 0 012 2v10a3 3 0 01-3 3H8a3 3 0 01-3-3V5a2 2 0 012-2z M5 11h14 M8.5 14.5h.01 M15.5 14.5h.01 M8 18l-2 3 M16 18l2 3" },
  { id: "bus", name: "버스", d: "M5 4h14v13H5z M5 11h14 M7 20v-3 M17 20v-3 M8 14h.01 M16 14h.01" },
  { id: "parking", name: "주차", d: "M5 3h14v18H5z M9 17V7h4a3 3 0 010 6H9" },
  { id: "elevator", name: "엘리베이터", d: "M5 3h14v18H5z M12 3v18 M7 10l1.5-2 1.5 2 M14 14l1.5 2 1.5-2" },
  { id: "area", name: "면적", d: "M4 4h16v16H4z M4 9h3 M4 14h3 M9 4v3 M14 4v3" },
  { id: "bed", name: "방", d: "M3 18v-7h18v7 M3 14h18 M6 11V8h5v3 M3 18v2 M21 18v2" },
  { id: "bath", name: "욕실", d: "M4 12h16v3a4 4 0 01-4 4H8a4 4 0 01-4-4z M6 12V6a2 2 0 014 0 M7 19l-1 2 M17 19l1 2" },
  { id: "phone", name: "전화", d: "M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" },
  { id: "won", name: "가격", d: "M12 3a9 9 0 100 18 9 9 0 000-18z M7.5 8.5l2 7 2.5-6 2.5 6 2-7 M7 11.5h10" },
  { id: "key", name: "열쇠·입주", d: "M7.5 12a4.5 4.5 0 100 9 4.5 4.5 0 000-9z M10.7 13.3L20 4 M17 7l2.5 2.5 M15 9l2 2" },
  { id: "doc", name: "계약", d: "M6 3h8l4 4v14H6z M14 3v4h4 M9 12h6 M9 16h6" },
  { id: "calendar", name: "날짜", d: "M4 5h16v15H4z M4 10h16 M8 3v4 M16 3v4" },
  { id: "clock", name: "시간", d: "M12 3a9 9 0 100 18 9 9 0 000-18z M12 7v5l3 2" },
  { id: "sun", name: "채광", d: "M12 8a4 4 0 100 8 4 4 0 000-8z M12 2v2 M12 20v2 M2 12h2 M20 12h2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4" },
  { id: "tree", name: "공원", d: "M12 22v-6 M12 3l6 9h-3l4 5H5l4-5H6z" },
  { id: "school", name: "학교", d: "M3 9l9-5 9 5-9 5z M7 11v5c0 1.5 2.5 3 5 3s5-1.5 5-3v-5 M21 9v6" },
  { id: "cart", name: "마트", d: "M3 4h3l2.5 11h10l2-8H7 M9 19a1.5 1.5 0 103 0 1.5 1.5 0 10-3 0 M16 19a1.5 1.5 0 103 0 1.5 1.5 0 10-3 0" },
  { id: "wifi", name: "인터넷", d: "M2 9a15 15 0 0120 0 M5 12.5a10 10 0 0114 0 M8.5 16a5 5 0 017 0 M12 19.5h.01" },
  { id: "snow", name: "냉난방", d: "M12 2v20 M3.3 7l17.4 10 M3.3 17l17.4-10 M9 4l3 2 3-2 M9 20l3-2 3 2" },
  { id: "pet", name: "반려동물", d: "M12 20c-3 0-5-1.5-5-3.5S9.5 12 12 12s5 2.5 5 4.5-2 3.5-5 3.5z M5.5 10a1.5 1.5 0 103 0 1.5 1.5 0 10-3 0 M15.5 10a1.5 1.5 0 103 0 1.5 1.5 0 10-3 0 M8.5 6a1.5 1.5 0 103 0 1.5 1.5 0 10-3 0 M12.5 6a1.5 1.5 0 103 0 1.5 1.5 0 10-3 0" },
  { id: "people", name: "사람", d: "M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7z M2.5 20a6.5 6.5 0 0113 0 M16 4.5a3 3 0 010 6 M18 14a5 5 0 014 6" },
  { id: "camera", name: "사진", d: "M4 7h4l2-3h4l2 3h4v13H4z M12 10a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" },
  { id: "search", name: "찾기", d: "M10.5 4a6.5 6.5 0 100 13 6.5 6.5 0 000-13z M20 20l-4.8-4.8" },
  { id: "check", name: "확인", d: "M12 3a9 9 0 100 18 9 9 0 000-18z M8 12l3 3 5-6" },
  { id: "star", name: "추천", d: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" },
  { id: "heart", name: "관심", d: "M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z" },
  { id: "fire", name: "급매", d: "M12 22c-4 0-7-3-7-7 0-4 4-6 4-10 2 1 3 3 3 5 1-1 2-2 2-4 3 2 5 5 5 9 0 4-3 7-7 7z" },
  { id: "arrow", name: "화살표", d: "M4 12h15 M13 6l6 6-6 6" },
  // 명함 SNS (2026-10-30 사장님) — 선 아이콘, 명함 테마 색으로
  { id: "globe", name: "홈페이지", d: "M12 3a9 9 0 100 18 9 9 0 000-18z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18" },
  { id: "sns_blog", name: "블로그", d: "M4 4h16v12H10l-4 4v-4H4z M8 8.5h8 M8 12h5" },
  { id: "sns_insta", name: "인스타그램", d: "M8 3h8a5 5 0 015 5v8a5 5 0 01-5 5H8a5 5 0 01-5-5V8a5 5 0 015-5z M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z M17 6.8h.01" },
  { id: "sns_youtube", name: "유튜브", d: "M5 6h14a3 3 0 013 3v6a3 3 0 01-3 3H5a3 3 0 01-3-3V9a3 3 0 013-3z M10 9.5v5l4.5-2.5z" },
  { id: "sns_kakao", name: "카카오", d: "M12 4c5 0 9 3.1 9 7s-4 7-9 7c-.9 0-1.9-.1-2.7-.3L5 20.5l1.2-4C4.2 15.2 3 13.2 3 11c0-3.9 4-7 9-7z" },
  { id: "sns_cafe", name: "카페", d: "M4 9h13v5a5 5 0 01-5 5H9a5 5 0 01-5-5z M17 10.5h1.5a2.5 2.5 0 010 5H17 M8 3.5v2.5 M12 3.5v2.5" },
  { id: "sns_threads", name: "스레드", d: "M15.5 12a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z M15.5 9v4.5a2.5 2.5 0 005 0V12a8.5 8.5 0 10-3.4 6.8" },
  { id: "sns_facebook", name: "페이스북", d: "M14 21v-8h3l.5-3.5H14V7.5c0-1 .5-1.5 1.5-1.5H18V3h-3c-3 0-4.5 1.5-4.5 4.5v2H8V13h2.5v8" },
  // 명함·로고용 집 모양 (2026-10-30 사장님: 부동산 명함 샘플에 픽토그램)
  { id: "roof_line", name: "굴뚝 지붕 로고", d: "M2 13L12 4.5l10 8.5 M16.5 8.3V4.5h2.5v6" },
  { id: "house_line", name: "큰 집 선", d: "M2 11.5L12 3l10 8.5 M5 9v12 M19 9v12" },
  { id: "tower", name: "빌딩 로고", d: "M5 21V3h9v18 M14 21V9h5v12 M2 21h20 M8 6.5h3 M8 10h3 M8 13.5h3 M8 17h3 M16.5 12.5h0.01 M16.5 16h0.01" },
  { id: "roof", name: "지붕 로고", d: "M2 13L12 4l10 9 M10 10h4v4h-4z M10 12h4 M12 10v4" },
  { id: "house_smile", name: "집 · 미소 로고", d: "M7 13V8.5l5-4.5 5 4.5V13 M10.5 9h3v3h-3z M3.5 14.5c4.5 5 12.5 5 17 0" },
  { id: "houses", name: "두 집 로고", d: "M2 12l6-5 6 5 M10 9.5L16 5l6 5 M4 11v9h8v-9 M15 9v11h5V10 M6.5 15h3v5h-3z M2 20h20" },
  { id: "town", name: "건물 로고", d: "M2 21h20 M4 21V11h4v10 M8 21V5h6v16 M14 21V9l4-3 4 3v12 M10.5 8.5h1 M10.5 12h1 M10.5 15.5h1 M17.5 12h1 M17.5 15.5h1" },
  { id: "house_leaf", name: "집 · 잎 로고", d: "M3 20V11l7-6 7 6v9 M8 20v-5h4v5 M2 20h20 M16 7c0-3 2.5-5 6-5 0 3.5-2.5 5-6 5z M16 7l3-2.5" },
];
export const pictoOf = (id: string) => PICTOS.find((p) => p.id === id) || PICTOS[0];

/** 픽토그램 그림 — size 정사각형, color 선 색 (circle 이면 원 색, 선은 흰색) */
export function pictoCanvas(id: string, size: number, color: string, style: PictoStyle = "line") {
  const s = Math.max(8, Math.round(size));
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  const p = new Path2D(pictoOf(id).d);
  if (style === "circle") {
    g.fillStyle = color;
    g.beginPath();
    g.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
    g.fill();
    // 원 안에 62% 크기로
    const k = (s * 0.62) / 24;
    g.translate(s * 0.19, s * 0.19);
    g.scale(k, k);
    g.strokeStyle = "#FFFFFF";
  } else {
    const k = (s * 0.92) / 24;
    g.translate(s * 0.04, s * 0.04);
    g.scale(k, k);
    g.strokeStyle = color;
  }
  g.lineWidth = 2;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.stroke(p);
  return c;
}
