// AI 편집 스타일 팩 (2026-10-20 사장님: AI 자동 편집이 촌스럽지 않게 — 정해진 디자인 한 벌을 일관되게, 적게)
//  팩 하나가 자막 모양 · 핵심 정보 바(템플릿) · 제목 띠 · 화면 전환 · 그래픽·효과음 양 · 배경 음악 분위기 · AI 그림 스타일 · 끝 화면 디자인을 정한다.
//  AI 는 "어디에 넣을지"만 고르고, 모양은 팩이 정한다. [자동]이면 AI 가 대본을 읽고 팩도 고른다.
//  쓰는 것은 모두 이미 있는 요소 — SubPresets(자막) · Templates(자막바·제목·부동산 표시광고) · transitions · 음악 분위기 · imageStyles
import type { LayerAnim } from "./types";

export type Amount = "none" | "some" | "many";
export type StylePack = {
  id: string;
  label: string;
  desc: string; // 어울리는 영상 (AI 에게도 보낸다)
  sub: string; // 자막 사전설정 id (SubPresets)
  subIn: NonNullable<LayerAnim["in"]>; // 자막 나타나기
  word?: boolean; // 쇼츠 — 한 단어씩 + 말하는 단어 강조
  key: { tpl: string; color: string; label?: string }; // 핵심 정보 바 — 템플릿 이름 (칸이 두 개면 첫 칸 = label)
  title: { fg: string; box: string; op: number }; // 왼쪽 위 제목 띠
  trans: string[]; // 화면 전환 종류 (차례로 돌려 씀)
  graphics: Amount; // 강조 그래픽(스티커)
  sfx: Amount; // 효과음 (전환 소리 포함)
  music: string; // 배경 음악 분위기 (MUSIC_MOODS)
  img: string; // AI 그림 스타일 id (imageStyles)
  end: string; // 끝 화면 — 부동산 표시광고 디자인 이름
  swatch: [string, string]; // 고르기 칸 색 (바탕, 포인트)
};

export const STYLE_PACKS: StylePack[] = [
  { id: "modern", label: "모던 화이트", desc: "아파트·빌라 매물 소개 — 깔끔하고 밝게", sub: "f-pre", subIn: "fade", key: { tpl: "포인트 자막바", color: "#2F7CF6", label: "포인트" }, title: { fg: "#111111", box: "#FFFFFF", op: 0.9 }, trans: ["fade"], graphics: "none", sfx: "none", music: "잔잔한", img: "realistic", end: "화이트 미니멀", swatch: ["#F3F4F6", "#2F7CF6"] },
  { id: "navy", label: "네이비 프리미엄", desc: "고급 매물·빌딩·상가 — 신뢰감 있게", sub: "box-navy", subIn: "fade", key: { tpl: "모던 박스 타이틀 (테두리 남색)", color: "#FFD400" }, title: { fg: "#FFFFFF", box: "#0B1A33", op: 0.85 }, trans: ["fade", "x_zoomin"], graphics: "none", sfx: "none", music: "고급스러운", img: "realistic", end: "네이비 클래식", swatch: ["#0B1A33", "#C9A86A"] },
  { id: "gold", label: "블랙 골드 럭셔리", desc: "고가 아파트·펜트하우스·단독주택", sub: "docu-gold", subIn: "fade", key: { tpl: "모던 박스 타이틀 4 (테두리)", color: "#D4AF37" }, title: { fg: "#F5E6B8", box: "#000000", op: 0.7 }, trans: ["fadeblack", "x_glow"], graphics: "none", sfx: "none", music: "고급스러운", img: "realistic", end: "골드 프리미엄", swatch: ["#0A0A0A", "#D4AF37"] },
  { id: "news", label: "뉴스 브리핑", desc: "부동산 뉴스·보도자료 해설 — 차분하게", sub: "box-news", subIn: "fade", key: { tpl: "2줄 다큐 자막바", color: "#2F7CF6", label: "공실뉴스 브리핑" }, title: { fg: "#FFFFFF", box: "#1E3A8A", op: 0.9 }, trans: ["slideleft", "wiperight"], graphics: "none", sfx: "some", music: "잔잔한", img: "flat", end: "블루 그라데이션", swatch: ["#1E3A8A", "#FFFFFF"] },
  { id: "breaking", label: "속보 뉴스", desc: "급한 소식·정책 발표·시장 급변", sub: "news-red", subIn: "slideL", key: { tpl: "포인트 자막바", color: "#E5252A", label: "속보" }, title: { fg: "#FFFFFF", box: "#E5252A", op: 0.95 }, trans: ["x_flash", "x_whipl"], graphics: "none", sfx: "some", music: "경쾌한", img: "flat", end: "도장 찍기", swatch: ["#111111", "#E5252A"] },
  { id: "warm", label: "따뜻한 감성", desc: "동네·단지 소개·생활 이야기", sub: "f-gowun", subIn: "fade", key: { tpl: "포인트 자막바", color: "#F59E0B", label: "동네" }, title: { fg: "#FFFFFF", box: "#78350F", op: 0.6 }, trans: ["fade", "x_leak"], graphics: "none", sfx: "none", music: "잔잔한", img: "realistic", end: "아이콘 목록", swatch: ["#FFFBEB", "#F59E0B"] },
  { id: "green", label: "내추럴 그린", desc: "전원주택·토지·공원 가까운 매물", sub: "dodum", subIn: "fade", key: { tpl: "포인트 자막바", color: "#0E9F6E", label: "포인트" }, title: { fg: "#FFFFFF", box: "#0E9F6E", op: 0.85 }, trans: ["fade", "circleopen"], graphics: "none", sfx: "none", music: "잔잔한", img: "realistic", end: "그린 신뢰", swatch: ["#ECFDF5", "#0E9F6E"] },
  { id: "city", label: "시티 블루", desc: "오피스·상가·지식산업센터 — 도시적으로", sub: "box-blue", subIn: "slideL", key: { tpl: "모던 박스 타이틀 2 (남색)", color: "#3B82F6" }, title: { fg: "#FFFFFF", box: "#1E40AF", op: 0.85 }, trans: ["slideleft", "x_whipl"], graphics: "none", sfx: "some", music: "힙한", img: "realistic", end: "블루 그라데이션", swatch: ["#1E40AF", "#93C5FD"] },
  { id: "docu", label: "다큐 시네마", desc: "시장 해설·칼럼·긴 설명 영상", sub: "docu", subIn: "fade", key: { tpl: "2줄 다큐 자막바", color: "#C9A86A", label: "핵심" }, title: { fg: "#FFFFFF", box: "#000000", op: 0.45 }, trans: ["fadeblack", "x_dip"], graphics: "none", sfx: "none", music: "잔잔한", img: "retro", end: "네이비 클래식", swatch: ["#1C1917", "#C9A86A"] },
  { id: "gongsil", label: "공실뉴스 기본", desc: "공실뉴스 채널 톤 — 남색 + 노랑", sub: "f-gmarket-box", subIn: "pop", key: { tpl: "모던 박스 타이틀 1 (노랑)", color: "#FFD400" }, title: { fg: "#FFFFFF", box: "#1A3A6B", op: 0.9 }, trans: ["fade", "slideleft"], graphics: "some", sfx: "some", music: "잔잔한", img: "realistic", end: "네이비 클래식", swatch: ["#1A3A6B", "#FFD400"] },
  { id: "shorts", label: "쇼츠 팝", desc: "릴스·쇼츠 — 빠르고 눈에 띄게", sub: "variety-yellow", subIn: "pop", word: true, key: { tpl: "제목 템플릿 3 (검은 띠)", color: "#FFD400" }, title: { fg: "#111111", box: "#FFD400", op: 1 }, trans: ["x_whipl", "x_whipr", "x_punch", "x_zoomin"], graphics: "some", sfx: "some", music: "경쾌한", img: "realistic", end: "명함형", swatch: ["#111111", "#FFD400"] },
  { id: "shortsmin", label: "쇼츠 미니멀", desc: "릴스·쇼츠 — 깔끔하고 세련되게", sub: "heavy", subIn: "fade", word: true, key: { tpl: "모던 박스 타이틀 1 (노랑)", color: "#FFFFFF" }, title: { fg: "#FFFFFF", box: "#000000", op: 0.6 }, trans: ["x_whipl", "x_whipu"], graphics: "none", sfx: "some", music: "힙한", img: "realistic", end: "화이트 미니멀", swatch: ["#000000", "#FFFFFF"] },
];

/** [자동]인데 AI 가 고르지 못했을 때 — 영상 종류·화면 비율로 */
export function defaultPack(kind: string, ratio: string): StylePack {
  const tall = ratio === "9:16" || ratio === "4:5";
  const id = tall ? "shortsmin" : kind === "news" ? "news" : kind === "vacancy" ? "modern" : "warm";
  return STYLE_PACKS.find((p) => p.id === id)!;
}
export const packOf = (id: string) => STYLE_PACKS.find((p) => p.id === id) || null;
