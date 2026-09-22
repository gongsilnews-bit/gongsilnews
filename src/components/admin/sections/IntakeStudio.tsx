"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  getHomepageSettings,
  saveHomepageSettings,
  checkSubdomainAvailable,
  changeHomepageSubdomain,
  uploadHomepageFile,
} from "@/app/actions/homepage";
import SiteClient from "@/app/sites/[subdomain]/SiteClient";
import { heroSlides, youtubeId, safeExt, shrinkToWebp, HERO_DEFAULTS, MAX_HERO_SLIDES, type HeroSlide } from "@/app/sites/[subdomain]/theme";
import { adminGetMemberDetail } from "@/app/admin/actions";
import { getVacanciesByOwnerId } from "@/app/actions/vacancy";
import { getMyArticles } from "@/app/actions/article";

/**
 * 물건접수장 편집기
 *
 * 전단지 편집기(marketing/ai-detail)와 같은 구조 — 좌측에서 고치면 우측 미리보기가
 * 즉시 바뀐다. 다만 미리보기를 따로 그리지 않고 실제 공개 페이지 컴포넌트를
 * 그대로 렌더한다. 편집 화면과 실물이 어긋날 일이 없다.
 *
 * 배치는 고르지 못하게 하고 색만 고르게 한다. 접수장은 배치가 곧 성능이라
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string>("");
  const [shareNotice, setShareNotice] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState<PanelKey>("basic");
  const [device, setDevice] = useState<"pc" | "mobile">("pc");
  const [member, setMember] = useState<any>(null);
  const [agency, setAgency] = useState<any>(null);
  // 미리보기에도 실제 매물·기사를 넣는다. 빈 화면을 보고 "안 나온다"는 문의가 온다.
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);

  const [subdomain, setSubdomain] = useState("");
  const [initialSubdomain, setInitialSubdomain] = useState("");
  const [requestingAddress, setRequestingAddress] = useState(false);
  const [addressMessage, setAddressMessage] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [subStatus, setSubStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  const subTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [siteTitle, setSiteTitle] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [companyIntro, setCompanyIntro] = useState("");

  const [intake, setIntake] = useState<Record<string, any>>({
    theme_color: "teal",
    brand_mode: "both",
    logo_size: "medium",
    // 첫 화면 슬라이드. 칸 세 개를 미리 깔아두고 중개사가 채우는 만큼만 화면에 나간다.
    // 첫 장에는 기본 문구를 미리 적어 둔다 — 화면에서 되살리지 않으므로, 여기서
    // 지우면 그대로 사라진다.
    hero_slides: [
      { title: HERO_DEFAULTS.title, highlight: HERO_DEFAULTS.highlight, desc: HERO_DEFAULTS.desc },
      {},
      {},
    ],
    cta_label: "",
    show_seeking: true,
    show_photos: true,
    show_budget: true,
    show_notes: true,
  });

  // ── 불러오기 ──
  useEffect(() => {
    (async () => {
      const res = await getHomepageSettings(memberId);
      if (res.success && res.data) {
        const d: any = res.data;
        setSubdomain(d.subdomain || "");
        setInitialSubdomain(d.subdomain || "");
        setIsActive(d.is_active !== false);
        setLogoUrl(d.logo_url || null);
        setSiteTitle(d.site_title || "");
        setContactPhone(d.contact_phone || "");
        setCompanyIntro(d.company_intro || "");
        if (d.intake) {
          // 슬라이드가 생기기 전에 저장한 중개사는 hero_image·hero_title 만 가지고 있다.
          // 그 값을 1번 칸으로 옮겨줘야 편집기에서 지금 쓰는 화면이 그대로 보인다.
          const filled = heroSlides(d.intake);
          const padded: HeroSlide[] = [0, 1, 2].map((i) => filled[i] || {});
          setIntake((prev) => ({ ...prev, ...d.intake, hero_slides: padded }));
        }
      }
      // 회사 정보는 [정보설정]의 부동산 등록 내용을 그대로 쓴다. 여기서 따로 입력받지 않는다.
      const md = await adminGetMemberDetail(memberId);
      if (md.success) {
        setMember((md as any).member || null);
        setAgency((md as any).agency || null);
        // 대표 전화를 아직 안 정했으면 부동산 정보의 번호를 기본값으로 쓴다
        const ag: any = (md as any).agency;
        if (ag) {
          setContactPhone((prev) => prev || ag.phone || ag.cell || "");
        }
      }

      const [vacRes, artRes] = await Promise.all([
        getVacanciesByOwnerId(memberId),
        getMyArticles(memberId),
      ]);
      if (vacRes.success && vacRes.data) setVacancies((vacRes.data as any[]).slice(0, 12));
      if (artRes.success && artRes.data) {
        setArticles((artRes.data as any[]).filter((a: any) => a.status === "APPROVED").slice(0, 4));
      }

      setLoading(false);
    })();
  }, [memberId]);

  // ── 서브도메인 중복 검사 (타이핑 멈추면) ──
  const onSubdomainChange = (v: string) => {
    const next = v.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSubdomain(next);
    setAddressMessage("");
    if (subTimer.current) clearTimeout(subTimer.current);
    if (next === initialSubdomain) return setSubStatus("idle");
    if (!next) return setSubStatus("idle");
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(next) || next.length < 2 || next.length > 30) {
      return setSubStatus("invalid");
    }
    setSubStatus("checking");
    subTimer.current = setTimeout(async () => {
      const res = await checkSubdomainAvailable(next, memberId);
      setSubStatus(res.success && (res as any).available ? "ok" : "taken");
    }, 450);
  };

  const handleAddressChange = async () => {
    setError("");
    setAddressMessage("");
    if (subStatus !== "ok") return;
    setRequestingAddress(true);
    const res = await changeHomepageSubdomain(memberId, subdomain);
    setRequestingAddress(false);
    if (!res.success) return setError(res.error || "주소 변경에 실패했습니다.");
    setInitialSubdomain(subdomain);
    setSubStatus("idle");
    setAddressMessage("홈페이지 주소가 변경되었습니다.");
  };

  const onLogoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    if (file.size > 2 * 1024 * 1024) {
      setError("로고 파일은 2MB 이하만 업로드할 수 있습니다.");
      return;
    }
    // 로고는 작게 쓰이므로 512px 로 줄이되 화질은 높게 잡는다. SVG 는 원본 그대로 올린다.
    const shrunk = await shrinkToWebp(file, 512, 0.92);
    const ext = shrunk.type === "image/webp" ? "webp" : safeExt(file);
    const fd = new FormData();
    fd.append("file", shrunk);
    fd.append("path", `logo/${memberId}_${Date.now()}.${ext}`);
    const up = await uploadHomepageFile(fd);
    if (up.success) setLogoUrl((up as any).url);
    else setError((up as any).error || "로고 업로드에 실패했습니다.");
  };

  const slides: HeroSlide[] = Array.isArray(intake.hero_slides) && intake.hero_slides.length
    ? intake.hero_slides.slice(0, MAX_HERO_SLIDES)
    : [{}, {}, {}];

  const setSlide = (i: number, patch: Partial<HeroSlide>) => {
    setIntake((prev) => {
      const list: HeroSlide[] = [0, 1, 2].map((n) => (prev.hero_slides?.[n] as HeroSlide) || {});
      list[i] = { ...list[i], ...patch };
      return { ...prev, hero_slides: list };
    });
  };

  const onSlidePhoto = async (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    // 첫 화면은 화면을 가득 채우는 자리다. 폰으로 찍은 4~8MB 사진을 그대로 올리면
    // 방문자가 그걸 다 받고 나서야 문구가 보인다. 긴 변 1280px WebP 로 줄여 보낸다.
    const shrunk = await shrinkToWebp(file);
    const fd = new FormData();
    fd.append("file", shrunk);
    fd.append("path", `hero/${memberId}_${i}_${Date.now()}.webp`);
    const up = await uploadHomepageFile(fd);
    if (up.success) setSlide(i, { image: (up as any).url });
    else setError((up as any).error || "사진 업로드에 실패했습니다.");
  };

  const handleSave = async () => {
    setError("");
    if (!subdomain) return setError("주소(서브도메인)를 입력해 주세요.");
    if (subStatus === "taken") return setError("이미 사용 중인 주소입니다.");
    if (subStatus === "invalid") return setError("주소는 영문 소문자·숫자·하이픈으로 2~30자입니다.");

    setSaving(true);
    const res = await saveHomepageSettings(memberId, {
      subdomain,
      theme_name: "intake",
      logo_url: logoUrl,
      site_title: siteTitle,
      contact_phone: contactPhone,
      company_intro: companyIntro,
      is_active: isActive,
      intake,
    });
    setSaving(false);
    if (!res.success) return setError(res.error || "저장에 실패했습니다.");
    setSavedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
  };

  const handleShare = async () => {
    if (!liveUrl) return;
    setShareNotice("");
    try {
      if (navigator.share) {
        await navigator.share({
          title: siteTitle || "물건접수장",
          text: `${siteTitle || "물건접수장"} 홈페이지`,
          url: liveUrl,
        });
        setShareNotice("공유 완료");
      } else {
        await navigator.clipboard.writeText(liveUrl);
        setShareNotice("주소 복사됨");
      }
      window.setTimeout(() => setShareNotice(""), 2000);
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(liveUrl);
        setShareNotice("주소 복사됨");
        window.setTimeout(() => setShareNotice(""), 2000);
      } catch {
        setError("공유하지 못했습니다. URL 바로가기를 길게 눌러 주소를 복사해 주세요.");
      }
    }
  };

  // 미리보기에 넘길 값. 저장 전에도 편집 중인 값이 그대로 보인다.
  const previewSettings = {
    site_title: siteTitle,
    logo_url: logoUrl,
    contact_phone: contactPhone,
    company_intro: companyIntro,
    intake,
  };

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

  const liveSubdomain = initialSubdomain || subdomain;
  const liveUrl = liveSubdomain ? `https://${liveSubdomain}.gongsilnews.com` : "";

  return (
    <div style={{ flex: 1, display: "flex", gap: 16, margin: 16, marginBottom: 0, minHeight: 0 }}>
      {/* ── 좌측: 편집 패널 ── */}
      <div style={{ width: 400, flexShrink: 0, display: "flex", flexDirection: "column", background: cardBg, border: `1px solid ${border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${border}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: text }}>물건접수장</h2>
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
                          <label style={label}>접수장 주소</label>
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
                          <label style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 44, border: `1px dashed ${border}`, borderRadius: 8, fontSize: 13.5, fontWeight: 700, color: sub, cursor: "pointer" }}>
                            {logoUrl ? "로고 바꾸기" : "+ 로고 올리기"}
                            <input type="file" accept="image/*" hidden onChange={onLogoPick} />
                          </label>
                          <p style={{ margin: "7px 0 0", fontSize: 11.5, color: sub, lineHeight: 1.5 }}>PNG · WebP · SVG 권장 · 최대 2MB · 표시 최대 너비 160px</p>
                        </div>

                        <div style={group}>
                          <label style={label}>로고 크기</label>
                          <div style={{ display: "flex", gap: 6 }}>
                            {([
                              ["small", "작게", "30px"],
                              ["medium", "보통", "40px"],
                              ["large", "크게", "50px"],
                            ] as const).map(([value, title, size]) => {
                              const selected = (intake.logo_size || "medium") === value;
                              return (
                                <button key={value} type="button" onClick={() => setIntake({ ...intake, logo_size: value })} style={{ flex: 1, padding: "9px 4px", border: selected ? "2px solid #059669" : `1px solid ${border}`, borderRadius: 8, background: selected ? (dark ? "#063d31" : "#ecfdf5") : "transparent", color: selected ? "#059669" : sub, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                                  {title}<span style={{ display: "block", marginTop: 2, fontSize: 10.5, fontWeight: 600 }}>{size}</span>
                                </button>
                              );
                            })}
                          </div>
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
                          <label style={label}>첫 화면 (최대 3장)</label>
                          <p style={{ margin: "0 0 12px", fontSize: 12.5, color: sub, lineHeight: 1.6 }}>
                            사진이나 유튜브 주소를 넣으면 6초(영상은 14초)마다 넘어갑니다.
                            한 장만 채우면 넘어가지 않고 그 장만 뜹니다. 아무것도 안 넣으면 고른 색으로 채워집니다.
                            <br />
                            <strong>문구 칸을 비우면 그 줄은 화면에 나오지 않습니다.</strong> 사진만 크게 보이게 하려면 세 칸을 모두 비우세요.
                          </p>

                          {slides.map((sl, i) => {
                            const vid = youtubeId(sl.youtube);
                            return (
                              <div
                                key={i}
                                style={{ border: `1px solid ${border}`, borderRadius: 10, padding: "14px 14px 4px", marginBottom: 12, background: dark ? "#111827" : "#fcfdfe" }}
                              >
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 800, color: text }}>
                                    <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#059669", color: "#fff", fontSize: 11.5, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                      {i + 1}
                                    </span>
                                    {i === 0 ? "첫 장" : `${i + 1}번째 장`}
                                  </span>
                                  {(sl.image || sl.youtube || sl.title || sl.highlight || sl.desc) && (
                                    <button
                                      type="button"
                                      onClick={() => setSlide(i, { image: "", youtube: "", title: "", highlight: "", desc: "" })}
                                      style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${border}`, background: "transparent", color: sub, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                                    >
                                      비우기
                                    </button>
                                  )}
                                </div>

                                {sl.image && !vid ? (
                                  <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: `1px solid ${border}`, marginBottom: 12 }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={sl.image} alt="" style={{ width: "100%", height: 104, objectFit: "cover", display: "block" }} />
                                    <button
                                      type="button"
                                      onClick={() => setSlide(i, { image: "" })}
                                      style={{ position: "absolute", top: 8, right: 8, padding: "5px 10px", borderRadius: 6, border: "none", background: "rgba(0,0,0,.66)", color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                                    >
                                      사진 빼기
                                    </button>
                                  </div>
                                ) : vid ? (
                                  <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: `1px solid ${border}`, marginBottom: 12 }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`} alt="" style={{ width: "100%", height: 104, objectFit: "cover", display: "block" }} />
                                    <span style={{ position: "absolute", left: 8, top: 8, padding: "4px 9px", borderRadius: 5, background: "#ef4444", color: "#fff", fontSize: 11.5, fontWeight: 800 }}>
                                      유튜브
                                    </span>
                                  </div>
                                ) : (
                                  <label
                                    style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 64, border: `1px dashed ${border}`, borderRadius: 8, fontSize: 13, fontWeight: 700, color: sub, cursor: "pointer", marginBottom: 12 }}
                                  >
                                    + 사진 올리기
                                    <input type="file" accept="image/*" hidden onChange={(e) => onSlidePhoto(i, e)} />
                                  </label>
                                )}

                                <div style={{ marginBottom: 12 }}>
                                  <label style={{ ...label, marginBottom: 5 }}>유튜브 주소 (넣으면 영상이 먼저입니다)</label>
                                  <input
                                    style={field}
                                    value={sl.youtube || ""}
                                    onChange={(e) => setSlide(i, { youtube: e.target.value })}
                                    placeholder="https://youtu.be/..."
                                  />
                                  {sl.youtube && !vid && (
                                    <p style={{ margin: "6px 0 0", fontSize: 12, color: "#ef4444", fontWeight: 700 }}>
                                      유튜브 주소가 아닌 것 같습니다. 주소창에 있는 것을 그대로 붙여넣어 주세요.
                                    </p>
                                  )}
                                </div>

                                <div style={{ marginBottom: 12 }}>
                                  <label style={{ ...label, marginBottom: 5 }}>첫 줄</label>
                                  <input style={field} value={sl.title || ""} onChange={(e) => setSlide(i, { title: e.target.value })} placeholder="내놓을 물건이 있으신가요?" />
                                </div>
                                <div style={{ marginBottom: 12 }}>
                                  <label style={{ ...label, marginBottom: 5 }}>둘째 줄 (강조)</label>
                                  <input style={field} value={sl.highlight || ""} onChange={(e) => setSlide(i, { highlight: e.target.value })} placeholder="여기에 접수해 주세요" />
                                </div>
                                <div style={{ marginBottom: 14 }}>
                                  <label style={{ ...label, marginBottom: 5 }}>설명</label>
                                  <textarea
                                    style={{ ...field, minHeight: 60, resize: "vertical", fontFamily: "inherit" }}
                                    value={sl.desc || ""}
                                    onChange={(e) => setSlide(i, { desc: e.target.value })}
                                    placeholder="연락처만 남겨 주시면 확인 후 바로 연락드립니다."
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div style={group}>
                          <label style={label}>버튼 문구</label>
                          <input style={field} value={intake.cta_label || ""} onChange={(e) => setIntake({ ...intake, cta_label: e.target.value })} placeholder="1분이면 접수 끝" />
                        </div>
                      </>
                    )}

                    {p.key === "sections" && (
                      <>
                        <p style={{ margin: "0 0 6px", fontSize: 12.5, color: sub, lineHeight: 1.6 }}>
                          순서는 고정입니다 — 첫 화면 → 매물 → 기사 → 접수 → 연락처.
                          내용이 없는 섹션은 켜 두어도 자동으로 숨습니다.
                        </p>
                        {toggle("show_vacancy", "우리 매물", "공실등록에 올린 매물을 그대로 보여줍니다")}
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
                          <div style={{ fontSize: 12.5, fontWeight: 800, color: sub, marginBottom: 10 }}>정보설정에서 자동으로 가져옵니다</div>
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
                          <label style={label}>대표 전화 <span style={{ fontWeight: 600 }}>(비워두면 위 번호를 씁니다)</span></label>
                          <input style={field} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder={agency?.phone || "02-000-0000"} />
                        </div>
                        <div style={group}>
                          <label style={label}>사무소 소개</label>
                          <textarea style={{ ...field, minHeight: 88, resize: "vertical", fontFamily: "inherit" }} value={companyIntro} onChange={(e) => setCompanyIntro(e.target.value)} placeholder="어떤 물건을 주로 다루는지 짧게 적어주세요" />
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
