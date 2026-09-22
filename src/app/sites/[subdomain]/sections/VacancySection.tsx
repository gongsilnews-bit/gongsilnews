"use client";

import React, { useMemo, useState } from "react";
import Carousel from "./Carousel";
import SectionTitle from "./SectionTitle";
import { vacancyPrice, toPyeong, type Theme } from "../theme";

interface Props {
  officeName: string;
  theme: Theme;
  vacancies: any[];
  /** 새 창 주소를 만든다. 로컬·미리보기에서는 /sites/{주소} 가 앞에 붙는다 */
  hrefFor: (path: string) => string;
}

/** 카드 스펙 칸에 쓰는 작은 아이콘. 글자만 늘어놓는 것보다 한눈에 구분된다. */
function SpecIcon({ kind }: { kind: "area" | "room" | "bath" | "floor" }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (kind === "area")
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 3v18" />
      </svg>
    );
  if (kind === "room")
    return (
      <svg {...common}>
        <path d="M2 18v-6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6M2 18h20M6 10V7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v3" />
      </svg>
    );
  if (kind === "bath")
    return (
      <svg {...common}>
        <path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3zM7 12V6a2 2 0 0 1 4 0" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 21V11h2a2 2 0 0 1 2 2v8M4 21h18" />
    </svg>
  );
}

/**
 * 추천매물.
 *
 * 공실등록에 올려둔 것을 그대로 끌어온다. 홈페이지 때문에 같은 매물을 두 번
 * 입력하게 만들면 두 곳 다 관리가 안 된다.
 *
 * 주소는 카드에서 동까지만 쓴다. 상세주소 공개 여부는 매물마다 다르고,
 * 카드처럼 목록으로 깔리는 자리에서 정책을 어기기 가장 쉽다.
 */
export default function VacancySection({ officeName, theme, vacancies, hrefFor }: Props) {
  const [filter, setFilter] = useState("전체");
  const lastCode = officeName.charCodeAt(officeName.length - 1);
  const hasBatchim = lastCode >= 0xac00 && lastCode <= 0xd7a3 && (lastCode - 0xac00) % 28 !== 0;
  const officeNameWithParticle = `${officeName}${hasBatchim ? "이" : "가"}`;

  // 실제로 가진 거래유형만 칩으로 만든다. 없는 칸을 눌러 빈 화면을 보게 할 이유가 없다.
  const tradeTypes = useMemo(() => {
    const seen: string[] = [];
    vacancies.forEach((v) => {
      const t = v.trade_type;
      if (t && !seen.includes(t)) seen.push(t);
    });
    return seen;
  }, [vacancies]);

  const shown = filter === "전체" ? vacancies : vacancies.filter((v) => v.trade_type === filter);

  /**
   * 기사에 붙는 [추천 공실] 카드와 같은 방식으로 연다 — 같은 화면, 같은 창 크기.
   * 주소는 중개사 자기 도메인이라 방문자 눈에는 이 부동산의 매물 페이지다.
   *
   * 폰에는 팝업 창이 없어 그냥 새 탭이 되므로, 폰에서는 모바일 상세로 보낸다.
   */
  const openDetail = (v: any) => {
    const isPhone = typeof window !== "undefined" && window.innerWidth < 821;
    if (isPhone) {
      window.open(hrefFor(`/m/gongsil/detail/${v.id}`), "_blank", "noopener,noreferrer");
      return;
    }
    const popupW = 620;
    const popupH = 880;
    const left = Math.max(20, window.screen.width - popupW - 40);
    const features = `width=${popupW},height=${popupH},left=${left},top=60,resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no,location=no`;
    window.open(hrefFor(`/gongsil/detail/${v.id}`), `gongsil_popup_${v.id}`, features);
  };

  return (
    <section id="vacancy" style={{ background: "#f1f3f5", padding: "56px 0 60px", scrollMarginTop: 54 }}>
      <SectionTitle
        theme={theme}
        label="OUR LISTINGS"
        title="추천매물"
        desc={`${officeNameWithParticle} 추천하는 물건입니다!\n더 많은 매물이 궁금할 땐 직접 연락주세요.`}
        badge={`${vacancies.length}건`}
      />

      {tradeTypes.length > 1 && (
        <div className="gs-scroll-x" style={{ display: "flex", justifyContent: "center", gap: 7, padding: "0 16px 18px" }}>
          {["전체", ...tradeTypes].map((t) => {
            const on = filter === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setFilter(t)}
                style={{
                  flexShrink: 0,
                  padding: "9px 17px",
                  borderRadius: 999,
                  border: on ? `1px solid ${theme.primary}` : "1px solid #dde3e9",
                  background: on ? theme.primary : "#fff",
                  color: on ? "#fff" : "#64748b",
                  fontSize: 14,
                  fontWeight: on ? 800 : 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      )}

      <Carousel theme={theme} count={shown.length} centerOnDesktop>
        {shown.map((v) => {
          const photo = v.images?.[0] || null;
          const where = [v.sigungu, v.dong].filter(Boolean).join(" ");
          const m2 = v.exclusive_m2 || v.supply_m2;
          const title = v.building_name || `${where} ${v.property_type || "매물"}`.trim();

          const specs = [
            { k: "area" as const, label: m2 ? toPyeong(m2) : null },
            { k: "room" as const, label: v.room_count ? `방 ${v.room_count}` : null },
            { k: "bath" as const, label: v.bath_count ? `욕실 ${v.bath_count}` : null },
            { k: "floor" as const, label: v.current_floor ? `${v.current_floor}층` : null },
          ].filter((s) => s.label);

          return (
            <article
              key={v.id}
              onClick={() => openDetail(v)}
              style={{
                flex: "0 0 auto",
                width: 268,
                scrollSnapAlign: "start",
                background: "#fff",
                borderRadius: 4,
                overflow: "hidden",
                boxShadow: "0 1px 3px rgba(16,24,40,.1)",
                cursor: "pointer",
              }}
            >
              {/* 사진 + 거래유형 리본 */}
              <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", background: "#e8ecf0" }}>
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#b6c0ca", fontSize: 13, fontWeight: 800 }}>
                    사진 준비중
                  </div>
                )}
                {v.trade_type && (
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      bottom: 12,
                      padding: "6px 14px 6px 12px",
                      background: theme.primary,
                      color: "#fff",
                      fontSize: 12.5,
                      fontWeight: 800,
                      letterSpacing: "0.3px",
                      borderRadius: "0 3px 3px 0",
                    }}
                  >
                    {v.trade_type}
                  </span>
                )}
              </div>

              <div style={{ padding: "14px 14px 16px" }}>
                <h3
                  style={{
                    margin: "0 0 4px 0",
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#16202b",
                    letterSpacing: "-0.4px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {title}
                </h3>
                <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#8b95a1", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {where || "위치 문의"}
                  {v.property_type ? ` · ${v.property_type}` : ""}
                </p>

                {/* 스펙 칸 — 레퍼런스처럼 칸을 나눠 한눈에 비교되게 한다 */}
                {specs.length > 0 && (
                  <div style={{ display: "flex", borderTop: "1px solid #eef1f4", borderBottom: "1px solid #eef1f4", marginBottom: 13 }}>
                    {specs.map((s, i) => (
                      <span
                        key={s.k}
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          padding: "9px 2px",
                          borderRight: i < specs.length - 1 ? "1px solid #eef1f4" : "none",
                          color: "#7b8794",
                          fontSize: 11.5,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <SpecIcon kind={s.k} />
                        {s.label}
                      </span>
                    ))}
                  </div>
                )}

                {/* 가격 뱃지 + 상세보기 */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      padding: "9px 12px",
                      background: theme.secondary,
                      color: theme.dark,
                      fontSize: 15,
                      fontWeight: 900,
                      borderRadius: 3,
                      letterSpacing: "-0.3px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {vacancyPrice(v)}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      textAlign: "center",
                      padding: "9px 10px",
                      background: "#f1f3f5",
                      color: "#4b5563",
                      fontSize: 13.5,
                      fontWeight: 800,
                      borderRadius: 3,
                      whiteSpace: "nowrap",
                    }}
                  >
                    상세보기
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </Carousel>
    </section>
  );
}
