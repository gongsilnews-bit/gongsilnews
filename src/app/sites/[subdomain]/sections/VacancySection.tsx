"use client";

import React, { useMemo, useState } from "react";
import Carousel from "./Carousel";
import SectionTitle from "./SectionTitle";
import { vacancyPrice, toPyeong, type Theme } from "../theme";

interface Props {
  officeName: string;
  theme: Theme;
  /** 잠긴 매물을 눌렀을 때 바로 걸 수 있게 */
  phone?: string;
  /** 접수 폼으로 보낸다 */
  onJump: (id: string) => void;
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
 * 추천공실.
 *
 * 공실등록에 올려둔 것을 그대로 끌어온다. 홈페이지 때문에 같은 매물을 두 번
 * 입력하게 만들면 두 곳 다 관리가 안 된다.
 *
 * 주소는 카드에서 동까지만 쓴다. 상세주소 공개 여부는 매물마다 다르고,
 * 카드처럼 목록으로 깔리는 자리에서 정책을 어기기 가장 쉽다.
 */
export default function VacancySection({ officeName, theme, vacancies, hrefFor, phone, onJump }: Props) {
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
  // 잠긴 매물을 눌렀을 때 띄울 안내. 어떤 매물인지 같이 들고 있는다.
  const [locked, setLocked] = useState<any>(null);

  /**
   * 중개업소끼리만 공유하는 매물인가.
   *
   * 공실등록에서 고르는 값이 둘이다 — "부동산노출"(중개업소만), "부동산노출 +
   * 일반인노출"(모두에게). 앞의 것만 가린다. 기사에 공실을 붙일 때 쓰는 기준과 같다.
   */
  const isLocked = (v: any) => !String(v?.exposure_type || "").includes("일반인노출");

  const openDetail = (v: any) => {
    // 가려진 매물은 상세로 보내지 않는다. 포털의 잠금 화면으로 넘기면 중개사가
    // 데려온 손님에게 "중개업소로 가입하세요"라고 말하는 꼴이 된다.
    if (isLocked(v)) {
      setLocked(v);
      return;
    }
    const isPhone = typeof window !== "undefined" && window.innerWidth < 821;
    if (isPhone) {
      // 같은 탭으로 이동해야 뒤로가기로 원래 홈페이지와 스크롤 위치에 복귀한다.
      window.location.assign(hrefFor(`/m/gongsil/detail/${v.id}`));
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
        title="추천공실"
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

          const lockedCard = isLocked(v);
          // 2차 카테고리를 쓴다 — "아파트", "원룸", "사무실", "단독/다가구" 처럼
          // 사람이 매물을 부르는 이름이다. 1차는 "상가·사무실·건물·공장·토지" 같은
          // 묶음이라 알약에 넣으면 넘치고, 무슨 물건인지도 흐려진다.
          const kindLabel =
            String(v.sub_category || "").trim() ||
            String(v.property_type || "").split("·")[0].trim();

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

                {/* 중개업소끼리만 보는 매물 — 사진만 덮는다. 지역·면적·가격은 그대로 둔다 */}
                {lockedCard && (
                  <>
                    <span
                      aria-hidden
                      style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.88)" }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 11.5,
                        fontWeight: 800,
                      }}
                    >
                      <span style={{ padding: "3px 7px", borderRadius: 3, background: "#fff7ed", border: "1px solid #fed7aa", color: "#ea580c" }}>
                        공동중개
                      </span>
                      <span style={{ color: theme.primary, fontWeight: 900 }}>{v.vacancy_no}</span>
                    </span>
                    <span
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                        color: "#16202b",
                        fontSize: 15,
                        fontWeight: 800,
                        letterSpacing: "-0.4px",
                        textAlign: "center",
                        padding: "0 16px",
                      }}
                    >
                      비공개물건입니다
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#6b7684" }}>아래로 연락주세요</span>
                    </span>
                  </>
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

                {/* 무엇을 · 어떻게 · 얼마에 — 한 줄로 읽히게. 상세보기는 곁들이는 정도 */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: "9px 12px",
                      background: theme.secondary,
                      color: theme.dark,
                      fontSize: 15,
                      fontWeight: 900,
                      borderRadius: 3,
                      letterSpacing: "-0.4px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {[kindLabel, v.trade_type, vacancyPrice(v)].filter(Boolean).join(" ")}
                  </span>
                  <span
                    style={{
                      flexShrink: 0,
                      padding: "7px 9px",
                      color: "#8b95a1",
                      fontSize: 12,
                      fontWeight: 700,
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

      {/* 가려진 매물을 눌렀을 때. 포털 잠금 화면(중개업소 가입 유도)으로 보내지 않는다 */}
      {locked && (
        <div
          onClick={() => setLocked(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(16,32,43,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(ev) => ev.stopPropagation()}
            style={{ width: "100%", maxWidth: 380, background: "#fff", borderRadius: 10, padding: "30px 24px 22px", textAlign: "center", boxShadow: "0 12px 40px rgba(0,0,0,.25)" }}
          >
            <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 3, background: "#fff7ed", border: "1px solid #fed7aa", color: "#ea580c", fontSize: 11.5, fontWeight: 800, marginBottom: 14 }}>
              공동중개 {locked.vacancy_no}
            </span>
            <h3 style={{ margin: "0 0 10px 0", fontSize: 19, fontWeight: 900, color: "#16202b", letterSpacing: "-0.5px" }}>
              일반인 비공개 물건입니다
            </h3>
            <p style={{ margin: "0 0 22px 0", fontSize: 14.5, lineHeight: 1.75, color: "#6b7684", wordBreak: "keep-all" }}>
              중개업소끼리만 공유하는 물건이라 자세한 내용은 공개하지 않습니다.
              <br />
              궁금하신 점은 바로 연락 주시면 알려드리겠습니다.
            </p>

            <div style={{ display: "flex", gap: 8 }}>
              {phone && (
                <a
                  href={`tel:${phone}`}
                  style={{ flex: 1, padding: "14px 10px", background: "#16202b", color: "#fff", borderRadius: 6, fontSize: 15, fontWeight: 800, textDecoration: "none" }}
                >
                  전화하기
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  setLocked(null);
                  onJump("intake");
                }}
                style={{ flex: 1, padding: "14px 10px", background: theme.primary, color: "#fff", border: "none", borderRadius: 6, fontSize: 15, fontWeight: 800, cursor: "pointer" }}
              >
                문의 남기기
              </button>
            </div>

            <button
              type="button"
              onClick={() => setLocked(null)}
              style={{ marginTop: 12, background: "none", border: "none", color: "#98a2ad", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
