import { formatAmount } from "@/app/(map)/gongsil/gongsilHelpers";

/**
 * 중개사 홈페이지 공용 값
 *
 * 색과 숫자 표기는 섹션마다 제각각이면 한 페이지처럼 안 보인다. 여기 모아두고
 * 섹션들은 가져다 쓰기만 한다.
 */

/** 물건보고서(report-generator)의 색 구성을 그대로 따른다 */
export const THEMES: Record<string, { primary: string; secondary: string; dark: string }> = {
  teal: { primary: "#00788c", secondary: "#00c6d7", dark: "#003845" },
  gold: { primary: "#bfa068", secondary: "#e6cc9f", dark: "#3e301b" },
  green: { primary: "#005f4d", secondary: "#4fb89e", dark: "#002820" },
  burgundy: { primary: "#7c1f2d", secondary: "#ff9ea7", dark: "#380d13" },
  orange: { primary: "#f27405", secondary: "#ffac63", dark: "#5e2609" },
};

export type Theme = (typeof THEMES)[string];

export function pickTheme(name?: string): Theme {
  return THEMES[name || ""] || THEMES.teal;
}

/** 헤더(로고줄 + 칩바) 높이. 앵커로 뛸 때 이만큼 비워둬야 제목이 안 가린다. */
export const HEADER_H = 104;

/** 만원 단위 숫자만 남긴다 */
export function onlyDigits(v: string): string {
  return v.replace(/[^0-9]/g, "").slice(0, 9);
}

/** 천 단위 쉼표 */
export function withComma(v: string | number): string {
  return v ? Number(v).toLocaleString("ko-KR") : "";
}

/** 제곱미터를 평으로. 부동산에서는 평으로 말하는 사람이 여전히 많다. */
export function toPyeong(m2: string | number): string {
  const n = Number(m2 || 0);
  if (!n) return "";
  return `${(n / 3.3058).toFixed(1)}평`;
}

/** 만원 단위를 사람이 읽는 말로. 5000 -> "5,000만원", 15000 -> "1억 5,000만원" */
export function readMoney(v: string | number): string {
  const n = Number(v || 0);
  if (!n) return "";
  const eok = Math.floor(n / 10000);
  const man = n % 10000;
  if (eok && man) return `${eok}억 ${man.toLocaleString("ko-KR")}만원`;
  if (eok) return `${eok}억원`;
  return `${man.toLocaleString("ko-KR")}만원`;
}

/**
 * 매물 카드 한 줄짜리 금액.
 *
 * vacancies 의 deposit·monthly_rent 는 만원이 아니라 **원** 단위로 들어있다.
 * 공실열람·지도와 같은 formatAmount 를 쓴다. 여기서 따로 계산하면 같은 매물이
 * 홈페이지에서만 다른 가격으로 보인다.
 */
export function vacancyPrice(v: any): string {
  const dep = formatAmount(Number(v?.deposit || 0));
  const monthly = Number(v?.monthly_rent || 0);
  if (monthly) return `${dep || 0}/${Math.round(monthly / 10000)}만`;
  return dep || "가격 문의";
}

/** 숫자만 받아 하이픈을 끼워 넣는다. 접수자가 직접 "-" 를 치게 만들 이유가 없다. */
export function formatPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.startsWith("02")) {
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}-${d.slice(2)}`;
    if (d.length <= 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}`;
  }
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`;
}

/** 다음 우편번호 위젯. 공실등록과 같은 것을 쓰되 접수장에는 주소만 있으면 된다. */
export function openPostcode(onPick: (addr: string) => void) {
  if (typeof window === "undefined") return;
  const run = () => {
    const daum = (window as any).daum;
    if (!daum?.Postcode) return;
    new daum.Postcode({
      oncomplete: (data: any) => onPick(data.roadAddress || data.jibunAddress || data.address || ""),
    }).open();
  };
  if ((window as any).daum?.Postcode) return run();
  const id = "daum-postcode-script";
  const existing = document.getElementById(id) as HTMLScriptElement | null;
  if (existing) return existing.addEventListener("load", run);
  const sc = document.createElement("script");
  sc.id = id;
  sc.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
  sc.onload = run;
  document.head.appendChild(sc);
}

/**
 * 저장 경로에 쓸 확장자만 뽑는다.
 *
 * 스토리지 키에는 한글·공백이 들어갈 수 없다. 사람들이 올리는 파일은
 * "ChatGPT Image 2026년 9월 20일 오후 06_10_48.png" 같은 이름이라, 원래 이름은
 * 버리고 확장자만 남긴다.
 */
export function safeExt(file: File): string {
  const fromName = (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const ok = ["png", "jpg", "jpeg", "webp", "gif", "svg", "avif"];
  if (ok.includes(fromName)) return fromName === "jpeg" ? "jpg" : fromName;
  const fromType = (file.type.split("/").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return ok.includes(fromType) ? (fromType === "jpeg" ? "jpg" : fromType) : "png";
}

/**
 * 올리기 전에 긴 변을 줄이고 WebP 로 바꾼다.
 *
 * 폰 사진과 ChatGPT 이미지는 장당 4~8MB 다. 그대로 올리면 방문자가 그걸 다 받고
 * 나서야 화면이 뜬다. 1280px WebP 로 줄이면 장당 0.1~0.3MB 가 된다.
 *
 * SVG 는 그대로 둔다. 캔버스로 굽는 순간 벡터가 픽셀이 되어 로고가 뭉갠다.
 */
export function shrinkToWebp(file: File, maxEdge = 1280, quality = 0.75): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return resolve(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(file);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(img.src);
          if (!blob) return resolve(file);
          resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", { type: "image/webp" }));
        },
        "image/webp",
        quality
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

/** 히어로 슬라이드 한 장. 사진이나 유튜브 중 하나를 배경으로 깐다 */
export interface HeroSlide {
  image?: string;
  youtube?: string;
  title?: string;
  highlight?: string;
  desc?: string;
}

export const MAX_HERO_SLIDES = 3;

/**
 * 첫 화면 기본 문구.
 *
 * 편집기가 처음 열릴 때 이 값을 칸에 미리 채워 넣는다. 화면에서 다시 기본값으로
 * 되돌리지는 않는다 — 그러면 중개사가 칸을 비워도 문구가 계속 살아나서
 * "지울 수가 없다".
 */
export const HERO_DEFAULTS = {
  title: "내놓을 물건이 있으신가요?",
  highlight: "여기에 접수해 주세요",
  desc: "연락처만 남겨 주시면 확인 후 바로 연락드립니다. 사진이 없어도 접수됩니다.",
  cta: "1분이면 접수 끝",
};

/**
 * 유튜브 주소에서 영상 id 만 뽑는다.
 * 중개사는 주소창에 있는 것을 그대로 붙여넣는다 — watch, youtu.be, shorts, embed 가 다 온다.
 */
export function youtubeId(url?: string): string {
  if (!url) return "";
  const s = url.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : "";
}

/**
 * 편집기가 저장한 값을 슬라이드 목록으로 바꾼다.
 *
 * 슬라이드가 생기기 전에 저장한 중개사는 hero_image·hero_title 같은 낱개 값만
 * 가지고 있다. 그 값들을 1번 슬라이드로 읽어 줘야 어제까지 쓰던 화면이 그대로 뜬다.
 */
export function heroSlides(cfg: any): HeroSlide[] {
  const raw: any[] = Array.isArray(cfg?.hero_slides) ? cfg.hero_slides : [];

  if (raw.length) {
    // 새 형식 — 저장된 그대로 쓴다. 비워둔 줄은 비워둔 대로 화면에서 빠진다.
    return raw
      .slice(0, MAX_HERO_SLIDES)
      .map((s) => ({
        image: s?.image || "",
        youtube: s?.youtube || "",
        title: s?.title || "",
        highlight: s?.highlight || "",
        desc: s?.desc || "",
      }))
      .filter((s) => s.image || s.youtube || s.title || s.highlight || s.desc);
  }

  // 슬라이드가 생기기 전에 저장한 중개사는 hero_image·hero_title 같은 낱개 값만
  // 가지고 있다. 그때는 비워둔 것이 아니라 아직 손대지 않은 것이므로 기본 문구를 채운다.
  return [
    {
      image: cfg?.hero_image || "",
      youtube: cfg?.hero_youtube || "",
      title: cfg?.hero_title || HERO_DEFAULTS.title,
      highlight: cfg?.hero_highlight || HERO_DEFAULTS.highlight,
      desc: cfg?.hero_desc || HERO_DEFAULTS.desc,
    },
  ];
}
