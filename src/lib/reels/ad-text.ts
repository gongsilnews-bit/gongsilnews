// 중개대상물 표시·광고 명시사항 (공인중개사법 제18조의2). 영상 아래 정보 띠와 인스타 게시글 문구가 같은 내용을 쓴다.
// 순수 함수: 화면·서버 공용
import { displayManwon } from "./korean-number";
import type { ReelAgency, ReelFacts } from "./types";

export function priceText(f: ReelFacts) {
  return f.trade === "월세" ? `보증금 ${displayManwon(f.deposit)} / 월세 ${displayManwon(f.monthlyRent)}` : `${f.trade} ${displayManwon(f.deposit)}`;
}

/** 영상 아래 정보 띠: [중개사무소, 등록번호·소재지, 매물] 세 줄 */
export function disclosureLines(f: ReelFacts, a: ReelAgency | null): string[] {
  const office = a
    ? [a.name, a.ceo ? `대표 ${a.ceo}` : null, a.phone ? `☎ ${a.phone}` : null].filter(Boolean).join(" · ")
    : "공실뉴스 gongsilnews.com";
  const reg = a ? [a.regNum ? `등록번호 ${a.regNum}` : null, a.address].filter(Boolean).join(" · ") : "";
  const item = [
    f.area,
    f.type,
    priceText(f),
    f.maintenanceFee > 0 ? `관리비 ${displayManwon(f.maintenanceFee)}` : null,
    f.exclusiveM2 ? `전용 ${f.exclusiveM2}㎡${f.exclusivePy ? `(${f.exclusivePy}평)` : ""}` : null,
    f.floor,
  ]
    .filter(Boolean)
    .join(" · ");
  return [office, reg, item].filter(Boolean);
}

/** 인스타 게시글에 붙일 문구 (매물 정보 + 중개사무소 표시 + 해시태그) */
export function instagramCaption(f: ReelFacts, a: ReelAgency | null): string {
  const tags = ["#공실뉴스", `#${f.area.split(" ").pop()}`, `#${f.area.split(" ")[0]}`, `#${f.type.replace(/\s/g, "")}`, `#${f.trade}`, "#부동산", "#매물소개", "#임장"]
    .filter((t, i, arr) => t.length > 1 && arr.indexOf(t) === i)
    .join(" ");
  const lines = [
    `📍 ${f.area} ${f.type} ${f.trade}`,
    `💰 ${priceText(f)}${f.maintenanceFee > 0 ? ` (관리비 ${displayManwon(f.maintenanceFee)})` : ""}`,
    f.exclusiveM2 ? `📐 전용 ${f.exclusiveM2}㎡${f.exclusivePy ? ` (${f.exclusivePy}평)` : ""}${f.floor ? ` · ${f.floor}` : ""}` : f.floor ? `🏢 ${f.floor}` : null,
    f.rooms ? `🚪 ${f.rooms}${f.direction ? ` · ${f.direction}` : ""}` : null,
    f.moveIn ? `📅 입주 ${f.moveIn}` : null,
    f.transit.length ? `🚇 ${f.transit.join(", ")}` : null,
    "",
    `🔎 공실뉴스에서 매물번호 ${f.vacancyNo} 검색`,
    "",
    "──────────",
    "[중개대상물 표시·광고]",
    ...(a
      ? [
          `중개사무소: ${a.name}${a.ceo ? ` (대표 ${a.ceo})` : ""}`,
          a.regNum ? `등록번호: ${a.regNum}` : null,
          a.address ? `소재지: ${a.address}` : null,
          a.phone ? `연락처: ${a.phone}` : null,
        ]
      : ["공실뉴스 gongsilnews.com"]),
    `매물: ${[f.area, f.type, priceText(f), f.exclusiveM2 ? `전용 ${f.exclusiveM2}㎡` : null, f.floor].filter(Boolean).join(" · ")}`,
    "",
    tags,
  ];
  return lines.filter((l) => l !== null).join("\n");
}
