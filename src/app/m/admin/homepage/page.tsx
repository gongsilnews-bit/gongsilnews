"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useHomepageEditor } from "@/hooks/useHomepageEditor";
import HeroSlidesEditor from "@/components/admin/homepage/HeroSlidesEditor";
import SiteClient from "@/app/sites/[subdomain]/SiteClient";
import { INTRO_MAX } from "@/app/sites/[subdomain]/theme";

/** 물건보고서 편집기와 같은 색 구성 */
const THEME_COLORS = [
  { id: "teal", name: "틸", primary: "#00788c" },
  { id: "gold", name: "골드", primary: "#bfa068" },
  { id: "green", name: "그린", primary: "#005f4d" },
  { id: "burgundy", name: "버건디", primary: "#7c1f2d" },
  { id: "orange", name: "오렌지", primary: "#f27405" },
];

type PanelKey = "basic" | "design" | "sections" | "fields" | "company";

const PANELS: { key: PanelKey; label: string; icon: string }[] = [
  { key: "basic", label: "기본설정", icon: "🔗" },
  { key: "design", label: "디자인", icon: "🎨" },
  { key: "sections", label: "섹션", icon: "🧱" },
  { key: "fields", label: "접수항목", icon: "📝" },
  { key: "company", label: "회사정보", icon: "🏢" },
];

const border = "#e5e7eb";
const text = "#111827";
const sub = "#6b7280";

const field: React.CSSProperties = {
  width: "100%",
  padding: "12px 13px",
  fontSize: 15,
  border: `1px solid ${border}`,
  borderRadius: 9,
  background: "#fff",
  color: text,
  outline: "none",
  boxSizing: "border-box",
};
const label: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 700, color: sub, marginBottom: 7 };

/**
 * 폰에서 하는 물건접수웹페이지 관리.
 *
 * 속(불러오기·저장·사진·슬라이드)은 PC 편집기와 같은 훅을 쓴다. 화면만 폰에 맞춘다.
 *
 * 편집과 미리보기를 위 토글로 갈아 끼우고, 둘 중 하나만 그린다. 좁은 화면에 폼과
 * 홈페이지를 같이 띄우면 유튜브·매물 사진이 폼을 치는 내내 돌아간다.
 */
export default function MobileHomepageAdminPage() {
  const router = useRouter();
  const [memberId, setMemberId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        // 로그인 후 이 화면으로 되돌아온다. 홈페이지 푸터의 admin 을 누르고 온 사람은
        // 고칠 데가 정해져 있어서, 로그인하고 메인에 떨어지면 다시 찾아 들어와야 한다.
        router.push(`/m/login?returnTo=${encodeURIComponent("/m/admin/homepage")}`);
        return;
      }
      setMemberId(data.user.id);
    })();
  }, [router]);

  if (!memberId) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: sub, fontSize: 14 }}>
        불러오는 중…
      </div>
    );
  }

  return <Editor memberId={memberId} />;
}

function Editor({ memberId }: { memberId: string }) {
  const router = useRouter();
  const e = useHomepageEditor(memberId);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [open, setOpen] = useState<PanelKey>("design");

  const toggle = (key: string, title: string, desc: string) => (
    <label key={key} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "13px 0", borderBottom: `1px solid ${border}`, cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={e.intake[key] !== false}
        onChange={(ev) => e.setIntake({ ...e.intake, [key]: ev.target.checked })}
        style={{ width: 18, height: 18, marginTop: 2, accentColor: "#059669", flexShrink: 0 }}
      />
      <span>
        <span style={{ display: "block", fontSize: 14.5, fontWeight: 700, color: text }}>{title}</span>
        <span style={{ display: "block", fontSize: 12.5, color: sub, marginTop: 2 }}>{desc}</span>
      </span>
    </label>
  );

  if (e.loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: sub, fontSize: 14 }}>
        불러오는 중…
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f8", paddingBottom: 96 }}>
      {/* ── 상단 ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: `1px solid ${border}`, padding: "0 12px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <button onClick={() => router.back()} aria-label="뒤로" style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <h1 style={{ fontSize: 17, fontWeight: 800, color: text, margin: 0, whiteSpace: "nowrap" }}>물건접수웹페이지</h1>
          {/* PC 와 같은 자리, 같은 역할. 딱지가 아니라 눌러서 여닫는 스위치다 */}
          <button
            type="button"
            role="switch"
            aria-checked={e.isActive}
            onClick={() => e.setIsActive(!e.isActive)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
              marginLeft: 4,
              padding: "6px 11px",
              border: `1px solid ${e.isActive ? "#86efac" : border}`,
              borderRadius: 999,
              background: e.isActive ? "#f0fdf4" : "#f8fafc",
              color: e.isActive ? "#047857" : "#6b7280",
              fontSize: 11.5,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            <span aria-hidden style={{ width: 7, height: 7, borderRadius: "50%", background: e.isActive ? "#10b981" : "#9ca3af" }} />
            {e.isActive ? "사용 중" : "사용 안 함"}
          </button>
        </div>

        <button
          onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
          style={{ flexShrink: 0, height: 36, padding: "0 13px", background: "#f3f4f6", color: "#374151", border: `1px solid #d1d5db`, borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          {mode === "edit" ? "◀ 편집 접기" : "▶ 편집 열기"}
        </button>
      </div>

      {e.error && (
        <p style={{ margin: "12px 12px 0", padding: "11px 13px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 9, color: "#dc2626", fontSize: 13.5, fontWeight: 700 }}>
          {e.error}
        </p>
      )}

      {/* ── 편집 ── */}
      {mode === "edit" && (
        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {PANELS.map((p) => {
            const on = open === p.key;
            return (
              <div key={p.key} style={{ background: "#fff", border: `1px solid ${border}`, borderRadius: 12, overflow: "hidden" }}>
                <button
                  onClick={() => setOpen(on ? ("" as PanelKey) : p.key)}
                  style={{ width: "100%", padding: "15px 16px", background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 15, fontWeight: 800, color: text }}>
                    <span>{p.icon}</span>
                    {p.label}
                  </span>
                  <span style={{ color: sub, fontSize: 12 }}>{on ? "▲" : "▼"}</span>
                </button>

                {on && (
                  <div style={{ padding: "0 16px 18px", borderTop: `1px solid ${border}` }}>
                    {p.key === "basic" && (
                      <div style={{ paddingTop: 16, display: "flex", flexDirection: "column", gap: 18 }}>
                        <div>
                          <label style={label}>웹페이지 주소</label>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <input style={field} value={e.subdomain} onChange={(ev) => e.onSubdomainChange(ev.target.value)} placeholder="myoffice" />
                            <span style={{ flexShrink: 0, fontSize: 12.5, color: sub, fontWeight: 700 }}>.gongsilnews.com</span>
                          </div>
                          <p style={{ margin: "7px 0 0", fontSize: 12.5, fontWeight: 700, color: e.subStatus === "taken" || e.subStatus === "invalid" ? "#ef4444" : e.subStatus === "ok" ? "#059669" : sub }}>
                            {e.subStatus === "checking" && "확인 중…"}
                            {e.subStatus === "ok" && "쓸 수 있는 주소입니다"}
                            {e.subStatus === "taken" && "이미 사용 중입니다"}
                            {e.subStatus === "invalid" && "영문 소문자·숫자·하이픈으로 2~30자"}
                            {e.subStatus === "idle" && (e.addressMessage || (e.initialSubdomain ? "현재 사용 중인 주소입니다" : "명함이나 문자로 보낼 주소입니다"))}
                          </p>
                          {e.subStatus === "ok" && (
                            <button
                              onClick={e.handleAddressChange}
                              disabled={e.requestingAddress}
                              style={{ marginTop: 9, width: "100%", padding: "11px", borderRadius: 9, border: "none", background: "#111827", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer" }}
                            >
                              {e.requestingAddress ? "변경 중…" : "이 주소로 변경"}
                            </button>
                          )}
                        </div>

                        <div>
                          <label style={label}>상호</label>
                          <input style={field} value={e.siteTitle} onChange={(ev) => e.setSiteTitle(ev.target.value)} placeholder="OO공인중개사사무소" />
                        </div>

                        <div>
                          <label style={label}>헤더 표시 방식</label>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                            {([
                              ["text", "텍스트만"],
                              ["logo", "로고만"],
                              ["both", "로고 + 텍스트"],
                            ] as const).map(([value, title]) => {
                              const on = (e.intake.brand_mode || "both") === value;
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => e.setIntake({ ...e.intake, brand_mode: value })}
                                  style={{ padding: "11px 4px", border: on ? "2px solid #059669" : `1px solid ${border}`, borderRadius: 9, background: on ? "#ecfdf5" : "#fff", color: on ? "#059669" : sub, fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                                >
                                  {title}
                                </button>
                              );
                            })}
                          </div>
                          {!e.logoUrl && e.intake.brand_mode === "logo" && (
                            <p style={{ margin: "7px 0 0", fontSize: 12, color: "#d97706", fontWeight: 700 }}>로고를 올리기 전까지 상호가 대신 표시됩니다.</p>
                          )}
                        </div>

                        <div>
                          <label style={label}>로고</label>
                          {e.logoUrl ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={e.logoUrl} alt="" style={{ height: 40, maxWidth: 140, objectFit: "contain", border: `1px solid ${border}`, borderRadius: 8, padding: 4, background: "#fff" }} />
                              <button
                                onClick={() => e.setLogoUrl(null)}
                                style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${border}`, background: "#fff", color: sub, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                              >
                                로고 빼기
                              </button>
                            </div>
                          ) : e.allowLogo ? (
                            <label style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 56, border: `1px dashed ${border}`, borderRadius: 9, fontSize: 13.5, fontWeight: 700, color: sub, background: "#fafbfc" }}>
                              + 로고 올리기
                              <input type="file" accept="image/*" hidden onChange={e.onLogoPick} />
                            </label>
                          ) : (
                            <div style={{ padding: "12px 14px", border: `1px dashed ${border}`, borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: sub, lineHeight: 1.6, textAlign: "center" }}>
                              로고를 올리면 상호 글자 대신 내 로고가 걸립니다
                              <br />
                              <span style={{ fontWeight: 600, fontSize: 12 }}>공실뉴스부동산 · 공실스터디부동산 요금제에서 열립니다</span>
                            </div>
                          )}
                          {e.allowLogo && <p style={{ margin: "7px 0 0", fontSize: 11.5, color: sub, lineHeight: 1.5 }}>PNG · WebP · SVG 권장 · 최대 2MB · 표시 최대 너비 180px</p>}
                        </div>

                        <div>
                          <label style={label}>헤더 크기</label>
                          <div style={{ display: "flex", gap: 6 }}>
                            {([
                              ["small", "작게", "36px"],
                              ["medium", "보통", "48px"],
                              ["large", "크게", "60px"],
                            ] as const).map(([value, title, size]) => {
                              const on = (e.intake.logo_size || "medium") === value;
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => e.setIntake({ ...e.intake, logo_size: value })}
                                  style={{ flex: 1, padding: "10px 4px", border: on ? "2px solid #059669" : `1px solid ${border}`, borderRadius: 9, background: on ? "#ecfdf5" : "#fff", color: on ? "#059669" : sub, fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                                >
                                  {title}<span style={{ display: "block", marginTop: 2, fontSize: 10.5, fontWeight: 600 }}>{size}</span>
                                </button>
                              );
                            })}
                          </div>
                          <p style={{ margin: "7px 0 0", fontSize: 11.5, color: sub, lineHeight: 1.5 }}>로고와 상호가 함께 커집니다. px 는 로고 높이입니다.</p>
                        </div>

                      </div>
                    )}

                    {p.key === "design" && (
                      <div style={{ paddingTop: 16, display: "flex", flexDirection: "column", gap: 18 }}>
                        <div>
                          <label style={label}>색상</label>
                          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            {THEME_COLORS.map((c) => {
                              const on2 = e.intake.theme_color === c.id;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  aria-label={c.name}
                                  onClick={() => e.setIntake({ ...e.intake, theme_color: c.id })}
                                  style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: "50%",
                                    background: c.primary,
                                    border: on2 ? `2px solid ${text}` : "2px solid transparent",
                                    boxShadow: on2 ? "0 0 0 3px #e5e7eb" : "0 1px 3px rgba(0,0,0,.15)",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  {on2 && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <HeroSlidesEditor
                          skin={{ field, label, border, text, sub }}
                          slides={e.slides}
                          setSlide={e.setSlide}
                          setCta={e.setCta}
                          addSlide={e.addSlide}
                          maxSlides={e.maxSlides}
                          allowVideo={e.allowHeroVideo}
                          removeSlide={e.removeSlide}
                          onSlidePhoto={e.onSlidePhoto}
                          vacancies={e.vacancies}
                          articles={e.articles}
                        />
                      </div>
                    )}

                    {p.key === "sections" && (
                      <div style={{ paddingTop: 10 }}>
                        <p style={{ margin: "6px 0 4px", fontSize: 12.5, color: sub, lineHeight: 1.6 }}>
                          순서는 고정입니다 — 첫 화면 → 추천공실 → 기사 → 오시는 길 → 접수 → 문의하기.
                          내용이 없는 섹션은 켜 두어도 자동으로 숨습니다.
                        </p>
                        {toggle("show_vacancy", "추천공실", "공실등록에 올린 매물을 그대로 보여줍니다")}
                        {toggle("show_article", "기사 · 칼럼", "승인된 기사 최신 4건을 보여줍니다")}
                        {toggle("show_location", "오시는 길", "주소 · 전화 · 영업시간과 길찾기 버튼")}
                      </div>
                    )}

                    {p.key === "fields" && (
                      <div style={{ paddingTop: 10 }}>
                        <p style={{ margin: "6px 0 4px", fontSize: 12.5, color: sub, lineHeight: 1.6 }}>
                          이름과 연락처는 항상 받습니다. 나머지는 접수 후에 묻는 칸입니다.
                        </p>
                        {toggle("show_seeking", "구하는 물건도 받기", "‘구하는 물건이 있어요’ 선택지를 함께 보여줍니다")}
                        {toggle("show_photos", "사진 첨부", "선택 항목입니다. 없어도 접수됩니다")}
                        {toggle("show_budget", "희망 금액", "보증금·월세 등")}
                        {toggle("show_notes", "남기실 말씀", "자유 입력란")}
                      </div>
                    )}

                    {p.key === "company" && (
                      <div style={{ paddingTop: 16, display: "flex", flexDirection: "column", gap: 18 }}>
                        {/* 상호·대표·등록번호는 [정보설정]에서 온다. 여기서는 확인만 하고, 고치러는 새 창으로 간다 */}
                        <div style={{ background: "#f8fafc", border: `1px solid ${border}`, borderRadius: 12, padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                            <span style={{ fontSize: 12.5, fontWeight: 800, color: sub }}>정보설정에서 자동으로 가져옵니다</span>
                            <a
                              href="/m/admin/settings"
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ flexShrink: 0, padding: "6px 11px", borderRadius: 999, border: `1px solid ${border}`, background: "#fff", color: text, fontSize: 11.5, fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap" }}
                            >
                              정보설정 ↗
                            </a>
                          </div>
                          {e.agency ? (
                            <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "62px 1fr", gap: "8px 10px", fontSize: 13 }}>
                              {([
                                ["상호", e.agency.name],
                                ["대표", e.agency.ceo_name],
                                ["대표전화", e.agency.phone],
                                ["휴대폰", e.agency.cell],
                                ["등록번호", e.agency.reg_num],
                                ["소재지", [e.agency.address, e.agency.address_detail].filter(Boolean).join(" ")],
                              ] as const).map(([k, v]) => (
                                <React.Fragment key={k}>
                                  <dt style={{ color: sub, fontWeight: 700 }}>{k}</dt>
                                  <dd style={{ margin: 0, color: v ? text : "#cbd5e1", fontWeight: 700, wordBreak: "keep-all" }}>{v || "미입력"}</dd>
                                </React.Fragment>
                              ))}
                            </dl>
                          ) : (
                            <p style={{ margin: 0, fontSize: 13, color: sub, lineHeight: 1.6 }}>
                              등록된 부동산 정보가 없습니다. <strong style={{ color: text }}>정보설정 → 부동산정보</strong>에서 먼저 넣어 주세요.
                            </p>
                          )}
                        </div>

                        <div>
                          <label style={label}>전화번호</label>
                          <p style={{ margin: "0 0 10px", fontSize: 12.5, color: sub, lineHeight: 1.6 }}>
                            <strong>사무실</strong>은 표시·광고법상 밝혀야 하는 중개사무소 연락처라 반드시 나옵니다
                            — 비우면 [정보설정]의 번호가 대신 나옵니다.
                            <br />
                            <strong>휴대폰</strong>은 선택입니다. 비우면 안 나옵니다.
                          </p>
                          {([
                            { key: "office" as const, label: "사무실", value: e.contactPhone, set: (v: string) => e.setContactPhone(v), ph: e.agency?.phone || "02-000-0000" },
                            { key: "mobile" as const, label: "휴대폰", value: e.intake.contact_mobile || "", set: (v: string) => e.setIntake({ ...e.intake, contact_mobile: v }), ph: e.agency?.cell || "010-0000-0000" },
                          ]).map((row) => {
                            const picked = (e.intake.call_target || "mobile") === row.key;
                            return (
                              <div key={row.key} style={{ marginBottom: 12 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ flexShrink: 0, width: 46, fontSize: 13, fontWeight: 700, color: sub }}>{row.label}</span>
                                  <input
                                    style={{ ...field, flex: 1 }}
                                    value={row.value}
                                    onChange={(ev) => row.set(ev.target.value)}
                                    placeholder={row.ph}
                                    inputMode="tel"
                                  />
                                </div>
                                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 7, marginLeft: 54, fontSize: 13, color: picked ? text : sub, fontWeight: picked ? 700 : 600 }}>
                                  <input
                                    type="checkbox"
                                    checked={picked}
                                    onChange={() => e.setIntake({ ...e.intake, call_target: row.key })}
                                    style={{ width: 16, height: 16, accentColor: "#059669" }}
                                  />
                                  하단 [전화] 버튼을 이 번호로
                                </label>
                              </div>
                            );
                          })}
                        </div>

                        <div>
                          <label style={label}>사무소 소개</label>
                          <textarea
                            style={{ ...field, minHeight: 84, resize: "vertical", fontFamily: "inherit" }}
                            value={e.companyIntro}
                            onChange={(ev) => e.setCompanyIntro(ev.target.value.slice(0, INTRO_MAX))}
                            maxLength={INTRO_MAX}
                            placeholder="어떤 물건을 주로 다루는지 100자 이내로 짧게 적어주세요"
                          />
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, margin: "7px 0 0" }}>
                            <p style={{ margin: 0, flex: 1, fontSize: 12.5, color: sub, lineHeight: 1.6 }}>
                              맨 아래 문의하기에 상호·대표 이름 밑으로 나옵니다. 비우면 [정보설정]의 부동산 소개가 쓰입니다.
                            </p>
                            <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: e.companyIntro.length >= INTRO_MAX ? "#dc2626" : sub }}>
                              {e.companyIntro.length}/{INTRO_MAX}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <p style={{ margin: "4px 2px 0", fontSize: 12.5, color: sub, lineHeight: 1.7 }}>
            회사 정보(대표·등록번호·주소)는 <strong>[정보설정]</strong>에 넣은 내용을 그대로 씁니다.
            여기서 고칠 수 없습니다.
          </p>
        </div>
      )}

      {/* ── 미리보기 ── */}
      {mode === "preview" && (
        <div style={{ padding: 12 }}>
          <div style={{ background: "#fff", border: `1px solid ${border}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${border}`, fontSize: 12.5, fontWeight: 800, color: sub }}>
              ● 미리보기 — 저장 전 상태도 그대로 보입니다
            </div>
            <SiteClient
              subdomain={e.liveSubdomain || "preview"}
              settings={e.previewSettings}
              member={e.member}
              companyProfile={e.agency}
              vacancies={e.vacancies}
              articles={e.articles}
              preview="mobile"
            />
          </div>
        </div>
      )}

      {/* ── 하단 고정 ── */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 60,
          background: "rgba(255,255,255,0.97)",
          borderTop: `1px solid ${border}`,
          padding: "10px 12px calc(10px + env(safe-area-inset-bottom))",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {(e.savedAt || e.shareNotice) && (
          <p style={{ margin: 0, textAlign: "center", fontSize: 12.5, fontWeight: 700, color: "#059669" }}>
            {e.shareNotice || `${e.savedAt} 저장됨`}
          </p>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={e.handleSave}
            disabled={e.saving}
            style={{ flex: 1, padding: "15px", background: e.saving ? "#9ca3af" : "#059669", color: "#fff", border: "none", borderRadius: 9, fontSize: 15.5, fontWeight: 900, cursor: "pointer" }}
          >
            {e.saving ? "저장 중…" : "저장하기"}
          </button>
          <a
            href={e.liveUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: "0 0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "15px 14px",
              background: "#111827",
              color: "#fff",
              borderRadius: 9,
              fontSize: 14,
              fontWeight: 800,
              textDecoration: "none",
              opacity: e.liveUrl ? 1 : 0.4,
              pointerEvents: e.liveUrl ? "auto" : "none",
              whiteSpace: "nowrap",
            }}
          >
            홈페이지 보기
          </a>
          <button
            onClick={e.handleShare}
            disabled={!e.liveUrl}
            aria-label="주소 복사"
            style={{ flex: "0 0 auto", width: 52, padding: "15px 0", background: "#f3f4f6", color: "#374151", border: `1px solid #d1d5db`, borderRadius: 9, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
