"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import SiteClient from "@/app/sites/[subdomain]/SiteClient";
import HeroSlidesEditor from "@/components/admin/homepage/HeroSlidesEditor";
import { useHomepageEditor } from "@/hooks/useHomepageEditor";
import { INTRO_MAX } from "@/app/sites/[subdomain]/theme";

/**
 * 물건접수웹페이지 편집기
 *
 * 전단지 편집기(marketing/ai-detail)와 같은 구조 — 좌측에서 고치면 우측 미리보기가
 * 즉시 바뀐다. 다만 미리보기를 따로 그리지 않고 실제 공개 페이지 컴포넌트를
 * 그대로 렌더한다. 편집 화면과 실물이 어긋날 일이 없다.
 *
 * 배치는 고르지 못하게 하고 색만 고르게 한다. 물건접수웹페이지는 배치가 곧 성능이라
 * 열어두면 보기 좋은 쪽을 고르지 접수가 잘 되는 쪽을 고르지 않는다.
 */

/** 물건보고서(report-generator)와 같은 색 구성 */
const THEME_COLORS = [
  { id: "teal", name: "틸", primary: "#00788c" },
  { id: "gold", name: "골드", primary: "#bfa068" },
  { id: "green", name: "그린", primary: "#005f4d" },
  { id: "burgundy", name: "버건디", primary: "#7c1f2d" },
  { id: "orange", name: "오렌지", primary: "#f27405" },
];

interface Props {
  theme: any;
  memberId: string;
  planType?: string;
}

type PanelKey = "basic" | "design" | "sections" | "fields" | "company";

const PANELS: { key: PanelKey; label: string; icon: string }[] = [
  { key: "basic", label: "기본설정", icon: "🔗" },
  { key: "design", label: "디자인", icon: "🎨" },
  { key: "sections", label: "섹션", icon: "🧱" },
  { key: "fields", label: "접수항목", icon: "📝" },
  { key: "company", label: "회사정보", icon: "🏢" },
];

export default function IntakeStudio({ theme, memberId }: Props) {
  const dark = theme?.darkMode;
  const cardBg = dark ? "#1f2937" : "#ffffff";
  const border = dark ? "#374151" : "#e5e7eb";
  const text = dark ? "#f3f4f6" : "#111827";
  const sub = dark ? "#9ca3af" : "#6b7280";

  /*
   * [정보설정]으로 가는 주소.
   *
   * 이 편집기는 /realty_admin, /admin, /user_admin 세 관리자에 같이 얹혀 있다.
   * 주소를 박아두면 다른 관리자에서 남의 화면으로 튀므로, 지금 서 있는 관리자의
   * 정보설정으로 보낸다.
   */
  const pathname = usePathname();
  const settingsHref = `${pathname || "/realty_admin"}?menu=settings`;

  // 속은 PC·폰 편집기가 같이 쓴다. 여기서는 화면만 그린다.
  const {
    loading,
    saving,
    savedAt,
    shareNotice,
    error,
    setError,
    member,
    agency,
    vacancies,
    articles,
    subdomain,
    initialSubdomain,
    onSubdomainChange,
    subStatus,
    requestingAddress,
    addressMessage,
    handleAddressChange,
    isActive,
    setIsActive,
    logoUrl,
    setLogoUrl,
    onLogoPick,
    siteTitle,
    setSiteTitle,
    contactPhone,
    setContactPhone,
    companyIntro,
    setCompanyIntro,
    intake,
    setIntake,
    slides,
    maxSlides,
    allowLogo,
    allowHeroVideo,
    setSlide,
    setCta,
    addSlide,
    removeSlide,
    onSlidePhoto,
    handleSave,
    handleShare,
    previewSettings,
    liveSubdomain,
    liveUrl,
  } = useHomepageEditor(memberId);

  const [open, setOpen] = useState<PanelKey>("basic");
  const [device, setDevice] = useState<"pc" | "mobile">("pc");

  const field: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    fontSize: 14,
    border: `1px solid ${border}`,
    borderRadius: 8,
    background: dark ? "#111827" : "#fff",
    color: text,
    outline: "none",
    boxSizing: "border-box",
  };
  const label: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 700, color: sub, marginBottom: 7 };
  const group: React.CSSProperties = { marginBottom: 18 };

  const toggle = (key: string, title: string, desc: string) => (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 0", borderBottom: `1px solid ${border}`, cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={intake[key] !== false}
        onChange={(e) => setIntake({ ...intake, [key]: e.target.checked })}
        style={{ width: 17, height: 17, marginTop: 2, accentColor: "#059669", flexShrink: 0 }}
      />
      <span>
        <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: text }}>{title}</span>
        <span style={{ display: "block", fontSize: 12.5, color: sub, marginTop: 2 }}>{desc}</span>
      </span>
    </label>
  );

  if (loading) {
    return (
      <div style={{ flex: 1, margin: 16, display: "flex", alignItems: "center", justifyContent: "center", color: sub }}>
        불러오는 중…
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", gap: 16, margin: 16, marginBottom: 0, minHeight: 0 }}>
      {/* ── 좌측: 편집 패널 ── */}
      <div style={{ width: 400, flexShrink: 0, display: "flex", flexDirection: "column", background: cardBg, border: `1px solid ${border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${border}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: text }}>물건접수웹페이지</h2>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive((current) => !current)}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0, padding: "6px 10px", border: `1px solid ${isActive ? "#86efac" : border}`, borderRadius: 999, background: isActive ? (dark ? "#052e24" : "#f0fdf4") : (dark ? "#111827" : "#f8fafc"), color: isActive ? "#059669" : sub, fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}
            >
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: isActive ? "#10b981" : "#9ca3af" }} />
              {isActive ? "사용 중" : "사용 안 함"}
            </button>
          </div>
          <p style={{ margin: "5px 0 0", fontSize: 12.5, color: sub }}>임대인이 물건을 맡기는 페이지입니다</p>
          {liveUrl && (
            <div style={{ display: "flex", alignItems: "stretch", gap: 7, marginTop: 13 }}>
              <a href={liveUrl} target="_blank" rel="noreferrer" title={liveUrl} style={{ minWidth: 0, flex: 1, display: "flex", alignItems: "center", gap: 6, padding: "9px 11px", border: `1px solid ${border}`, borderRadius: 8, background: dark ? "#111827" : "#f8fafc", color: text, fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}>
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{liveUrl}</span>
                <span aria-hidden style={{ flexShrink: 0 }}>↗</span>
              </a>
              <button type="button" onClick={handleShare} style={{ flexShrink: 0, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 8, background: cardBg, color: text, fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}>
                공유하기
              </button>
            </div>
          )}
          {shareNotice && <p role="status" style={{ margin: "7px 0 0", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#059669" }}>{shareNotice}</p>}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {PANELS.map((p) => {
            const isOpen = open === p.key;
            return (
              <div key={p.key} style={{ borderBottom: `1px solid ${border}` }}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? ("" as any) : p.key)}
                  style={{
                    width: "100%",
                    padding: "14px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 14.5,
                    fontWeight: 800,
                    color: isOpen ? "#059669" : text,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span>{p.icon}</span>
                    {p.label}
                  </span>
                  <span style={{ fontSize: 12, color: sub, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▾</span>
                </button>

                {isOpen && (
                  <div style={{ padding: "4px 20px 22px" }}>
                    {p.key === "basic" && (
                      <>
                        <div style={group}>
                          <label style={label}>웹페이지 주소</label>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <input
                              style={{ ...field, flex: 1 }}
                              value={subdomain}
                              onChange={(e) => onSubdomainChange(e.target.value)}
                              placeholder="gongsilmarketing"
                            />
                            <span style={{ fontSize: 12.5, color: sub, whiteSpace: "nowrap" }}>.gongsilnews.com</span>
                          </div>
                          <p style={{ margin: "7px 0 0", fontSize: 12.5, fontWeight: 700, color: subStatus === "ok" || addressMessage ? "#059669" : subStatus === "idle" || subStatus === "checking" ? sub : "#dc2626" }}>
                            {subStatus === "checking" && "확인 중…"}
                            {subStatus === "ok" && "사용할 수 있는 주소입니다"}
                             {subStatus === "taken" && "이미 사용 중입니다"}
                             {subStatus === "invalid" && "영문 소문자·숫자·하이픈 2~30자"}
                             {subStatus === "idle" && (addressMessage || (initialSubdomain ? "현재 사용 중인 주소입니다" : "명함이나 문자로 보낼 주소입니다"))}
                           </p>
                          {initialSubdomain && subdomain !== initialSubdomain && (
                            <button
                              type="button"
                              disabled={requestingAddress || subStatus !== "ok"}
                              onClick={handleAddressChange}
                              style={{ width: "100%", marginTop: 10, padding: "10px 12px", border: "none", borderRadius: 8, background: "#059669", color: "#fff", fontSize: 13, fontWeight: 800, cursor: requestingAddress || subStatus !== "ok" ? "not-allowed" : "pointer", opacity: requestingAddress || subStatus !== "ok" ? 0.5 : 1 }}
                            >
                              {requestingAddress ? "변경 중…" : "변경하기"}
                            </button>
                          )}
                        </div>

                        <div style={group}>
                          <label style={label}>상호</label>
                          <input style={field} value={siteTitle} onChange={(e) => setSiteTitle(e.target.value)} placeholder="OO공인중개사사무소" />
                        </div>

                        <div style={group}>
                          <label style={label}>헤더 표시 방식</label>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                            {([
                              ["text", "텍스트만"],
                              ["logo", "로고만"],
                              ["both", "로고 + 텍스트"],
                            ] as const).map(([value, title]) => {
                              const selected = (intake.brand_mode || "both") === value;
                              return (
                                <button key={value} type="button" onClick={() => setIntake({ ...intake, brand_mode: value })} style={{ padding: "9px 5px", border: selected ? "2px solid #059669" : `1px solid ${border}`, borderRadius: 8, background: selected ? (dark ? "#063d31" : "#ecfdf5") : "transparent", color: selected ? "#059669" : sub, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                                  {title}
                                </button>
                              );
                            })}
                          </div>
                          {!logoUrl && intake.brand_mode === "logo" && (
                            <p style={{ margin: "7px 0 0", fontSize: 12, color: "#d97706", fontWeight: 700 }}>로고를 올리기 전까지 상호가 대신 표시됩니다.</p>
                          )}
                        </div>

                        <div style={group}>
                          <label style={label}>로고</label>
                          {logoUrl && (
                            <div style={{ position: "relative", display: "inline-flex", alignItems: "center", marginBottom: 8, padding: "4px 7px", border: `1px solid ${border}`, borderRadius: 7, background: dark ? "#111827" : "#f8fafc" }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={logoUrl} alt="업로드된 로고" style={{ height: 50, maxWidth: 220, objectFit: "contain" }} />
                              <button
                                type="button"
                                aria-label="로고 삭제"
                                title="로고 삭제"
                                onClick={() => setLogoUrl(null)}
                                style={{ position: "absolute", top: -8, right: -8, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", padding: 0, border: `2px solid ${dark ? "#111827" : "#fff"}`, borderRadius: "50%", background: "#dc2626", color: "#fff", fontSize: 15, fontWeight: 900, lineHeight: 1, cursor: "pointer" }}
                              >
                                ×
                              </button>
                            </div>
                          )}
                          {allowLogo ? (
                            <>
                              <label style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 44, border: `1px dashed ${border}`, borderRadius: 8, fontSize: 13.5, fontWeight: 700, color: sub, cursor: "pointer" }}>
                                {logoUrl ? "로고 바꾸기" : "+ 로고 올리기"}
                                <input type="file" accept="image/*" hidden onChange={onLogoPick} />
                              </label>
                              <p style={{ margin: "7px 0 0", fontSize: 11.5, color: sub, lineHeight: 1.5 }}>PNG · WebP · SVG 권장 · 최대 2MB · 표시 최대 너비 180px</p>
                            </>
                          ) : (
                            <div style={{ padding: "12px 14px", border: `1px dashed ${border}`, borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: sub, lineHeight: 1.6, textAlign: "center" }}>
                              로고를 올리면 상호 글자 대신 내 로고가 걸립니다
                              <br />
                              <span style={{ fontWeight: 600, fontSize: 12 }}>공실뉴스부동산 · 공실스터디부동산 요금제에서 열립니다</span>
                            </div>
                          )}
                        </div>

                        <div style={group}>
                          <label style={label}>헤더 크기</label>
                          <div style={{ display: "flex", gap: 6 }}>
                            {([
                              ["small", "작게", "36px"],
                              ["medium", "보통", "48px"],
                              ["large", "크게", "60px"],
                            ] as const).map(([value, title, size]) => {
                              const selected = (intake.logo_size || "medium") === value;
                              return (
                                <button key={value} type="button" onClick={() => setIntake({ ...intake, logo_size: value })} style={{ flex: 1, padding: "9px 4px", border: selected ? "2px solid #059669" : `1px solid ${border}`, borderRadius: 8, background: selected ? (dark ? "#063d31" : "#ecfdf5") : "transparent", color: selected ? "#059669" : sub, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                                  {title}<span style={{ display: "block", marginTop: 2, fontSize: 10.5, fontWeight: 600 }}>{size}</span>
                                </button>
                              );
                            })}
                          </div>
                          <p style={{ margin: "7px 0 0", fontSize: 11.5, color: sub, lineHeight: 1.5 }}>로고와 상호가 함께 커집니다. px 는 로고 높이입니다.</p>
                        </div>

                      </>
                    )}

                    {p.key === "design" && (
                      <>
                        <div style={group}>
                          <label style={label}>색상</label>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            {THEME_COLORS.map((c) => {
                              const on = intake.theme_color === c.id;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  title={c.name}
                                  onClick={() => setIntake({ ...intake, theme_color: c.id })}
                                  style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: "50%",
                                    background: c.primary,
                                    border: on ? `2px solid ${text}` : "2px solid transparent",
                                    boxShadow: on ? `0 0 0 3px ${dark ? "#4b5563" : "#e5e7eb"}` : "0 1px 3px rgba(0,0,0,.15)",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transform: on ? "scale(1.08)" : "none",
                                    transition: "all .15s",
                                  }}
                                >
                                  {on && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div style={group}>
                          <HeroSlidesEditor
                            skin={{ field, label, border, text, sub, dark }}
                            slides={slides}
                            setSlide={setSlide}
                            setCta={setCta}
                            addSlide={addSlide}
                            maxSlides={maxSlides}
                            allowVideo={allowHeroVideo}
                            removeSlide={removeSlide}
                            onSlidePhoto={onSlidePhoto}
                            vacancies={vacancies}
                            articles={articles}
                          />
                        </div>

                      </>
                    )}

                    {p.key === "sections" && (
                      <>
                        <p style={{ margin: "0 0 6px", fontSize: 12.5, color: sub, lineHeight: 1.6 }}>
                          순서는 고정입니다 — 첫 화면 → 추천공실 → 기사 → 접수 → 문의하기.
                          내용이 없는 섹션은 켜 두어도 자동으로 숨습니다.
                        </p>
                        {toggle("show_vacancy", "추천공실", "공실등록에 올린 매물을 그대로 보여줍니다")}
                        {toggle("show_article", "기사 · 칼럼", "승인된 기사 최신 4건을 보여줍니다")}
                      </>
                    )}

                    {p.key === "fields" && (
                      <>
                        <p style={{ margin: "0 0 6px", fontSize: 12.5, color: sub, lineHeight: 1.6 }}>
                          이름과 연락처는 항상 받습니다. 칸이 적을수록 접수가 많아집니다.
                        </p>
                        {toggle("show_seeking", "구하는 물건도 받기", "‘구하는 물건이 있어요’ 선택지를 함께 보여줍니다")}
                        {toggle("show_photos", "사진 첨부", "선택 항목입니다. 없어도 접수됩니다")}
                        {toggle("show_budget", "희망 금액", "보증금·월세 등")}
                        {toggle("show_notes", "남기실 말씀", "자유 입력란")}
                      </>
                    )}

                    {p.key === "company" && (
                      <>
                        {/* 상호·대표·등록번호·주소는 [정보설정]에서 한 번 넣은 것을 그대로 가져온다 */}
                        <div style={{ ...group, background: dark ? "#111827" : "#f8fafc", border: `1px solid ${border}`, borderRadius: 10, padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 800, color: sub }}>정보설정에서 자동으로 가져옵니다</div>
                            {/*
                              고치려면 [정보설정]으로 가야 하는 값들이다. 새 창으로 여는 건
                              편집 중인 내용을 두고 나갔다가 저장을 잃는 일이 없게 하려는 것.
                              돌아와서 [새로고침]을 누르면 고친 값이 들어온다.
                            */}
                            <a
                              href={settingsHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                flexShrink: 0,
                                padding: "5px 10px",
                                borderRadius: 999,
                                border: `1px solid ${border}`,
                                background: dark ? "#1f2937" : "#fff",
                                color: text,
                                fontSize: 11.5,
                                fontWeight: 800,
                                textDecoration: "none",
                                whiteSpace: "nowrap",
                              }}
                            >
                              정보설정 ↗
                            </a>
                          </div>
                          {agency ? (
                            <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "72px 1fr", gap: "8px 10px", fontSize: 13.5 }}>
                              {([
                                ["상호", agency.name],
                                ["대표", agency.ceo_name],
                                ["대표전화", agency.phone],
                                ["휴대폰", agency.cell],
                                ["등록번호", agency.reg_num],
                                ["소재지", [agency.address, agency.address_detail].filter(Boolean).join(" ")],
                              ] as const).map(([k, v]) => (
                                <React.Fragment key={k}>
                                  <dt style={{ color: sub, fontWeight: 700 }}>{k}</dt>
                                  <dd style={{ margin: 0, color: v ? text : "#cbd5e1", fontWeight: 700, wordBreak: "keep-all" }}>{v || "미입력"}</dd>
                                </React.Fragment>
                              ))}
                            </dl>
                          ) : (
                            <p style={{ margin: 0, fontSize: 13, color: sub, lineHeight: 1.6 }}>
                              등록된 부동산 정보가 없습니다. <strong style={{ color: text }}>정보설정 → 부동산정보</strong>에서 먼저 입력해 주세요.
                            </p>
                          )}
                        </div>

                        <div style={group}>
                          <label style={label}>전화번호</label>
                          <p style={{ margin: "0 0 10px", fontSize: 12.5, color: sub, lineHeight: 1.6 }}>
                            홈페이지 <strong>문의하기</strong>에 나옵니다. 두 번호가 같으면 한 줄만 나옵니다.
                            <br />
                            <strong>사무실</strong>은 표시·광고법상 밝혀야 하는 중개사무소 연락처라 반드시 나옵니다
                            — 비우면 [정보설정]의 번호({agency?.phone || "미등록"})가 대신 나옵니다.
                            <br />
                            <strong>휴대폰</strong>은 선택입니다. 비우면 안 나옵니다.
                          </p>

                          {([
                            { key: "office" as const, label: "사무실", value: contactPhone, set: setContactPhone, ph: agency?.phone || "02-000-0000" },
                            { key: "mobile" as const, label: "휴대폰", value: intake.contact_mobile || "", set: (v: string) => setIntake({ ...intake, contact_mobile: v }), ph: agency?.cell || "010-0000-0000" },
                          ]).map((row) => {
                            const picked = (intake.call_target || "mobile") === row.key;
                            return (
                              <div key={row.key} style={{ marginBottom: 10 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ flexShrink: 0, width: 46, fontSize: 13, fontWeight: 700, color: sub }}>{row.label}</span>
                                  <input
                                    style={{ ...field, flex: 1 }}
                                    value={row.value}
                                    onChange={(e) => row.set(e.target.value)}
                                    placeholder={row.ph}
                                  />
                                </div>
                                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6, marginLeft: 54, fontSize: 12.5, color: picked ? text : sub, fontWeight: picked ? 700 : 600, cursor: "pointer" }}>
                                  <input
                                    type="checkbox"
                                    checked={picked}
                                    onChange={() => setIntake({ ...intake, call_target: row.key })}
                                    style={{ width: 15, height: 15, accentColor: "#059669" }}
                                  />
                                  폰 [전화] 버튼을 이 번호로
                                </label>
                              </div>
                            );
                          })}
                        </div>
                        <div style={group}>
                          <label style={label}>사무소 소개</label>
                          <textarea
                            style={{ ...field, minHeight: 88, resize: "vertical", fontFamily: "inherit" }}
                            value={companyIntro}
                            onChange={(e) => setCompanyIntro(e.target.value.slice(0, INTRO_MAX))}
                            maxLength={INTRO_MAX}
                            placeholder="어떤 물건을 주로 다루는지 100자 이내로 짧게 적어주세요"
                          />
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, margin: "7px 0 0" }}>
                            <p style={{ margin: 0, flex: 1, fontSize: 12.5, color: sub, lineHeight: 1.6 }}>
                              홈페이지 맨 아래 <strong>문의하기</strong>에 상호·대표 이름 밑으로 나옵니다.
                              비우면 [정보설정]의 부동산 소개가 대신 쓰입니다.
                            </p>
                            <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: companyIntro.length >= INTRO_MAX ? "#dc2626" : sub }}>
                              {companyIntro.length}/{INTRO_MAX}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ padding: "14px 20px", borderTop: `1px solid ${border}`, background: dark ? "#111827" : "#fafafa" }}>
          {error && <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#dc2626" }}>{error}</p>}
          {savedAt && !error && <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#059669" }}>{savedAt} 저장됨</p>}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{ width: "100%", padding: "13px", background: saving ? "#9ca3af" : "#059669", color: "#fff", border: "none", borderRadius: 9, fontSize: 15, fontWeight: 800, cursor: saving ? "default" : "pointer" }}
          >
            {saving ? "저장 중…" : "저장하기"}
          </button>
        </div>
      </div>

      {/* ── 우측: 실시간 미리보기 ── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: cardBg, border: `1px solid ${border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "11px 16px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: sub }}>미리보기</span>
          <div style={{ display: "flex", gap: 6 }}>
            {(["pc", "mobile"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDevice(d)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 7,
                  border: `1px solid ${device === d ? "#059669" : border}`,
                  background: device === d ? "#059669" : "transparent",
                  color: device === d ? "#fff" : sub,
                  fontSize: 12.5,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {d === "pc" ? "PC" : "모바일"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", background: dark ? "#0b0f19" : "#eef1f5", padding: 16 }}>
          <div
            style={{
              width: device === "mobile" ? 390 : "100%",
              margin: "0 auto",
              background: "#fff",
              borderRadius: 10,
              overflow: "hidden",
              boxShadow: "0 4px 18px rgba(0,0,0,.12)",
            }}
          >
            {/* 실제 공개 페이지를 그대로 그린다 — 편집 화면과 실물이 어긋나지 않는다 */}
            <SiteClient
              subdomain={subdomain || "preview"}
              settings={previewSettings}
              member={member}
              companyProfile={agency}
              vacancies={vacancies}
              articles={articles}
              preview={device}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
