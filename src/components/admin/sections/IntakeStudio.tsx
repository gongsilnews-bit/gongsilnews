"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  getHomepageSettings,
  saveHomepageSettings,
  checkSubdomainAvailable,
  uploadHomepageFile,
} from "@/app/actions/homepage";
import IntakeClient from "@/app/sites/[subdomain]/IntakeClient";

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

type PanelKey = "basic" | "design" | "fields" | "company";

const PANELS: { key: PanelKey; label: string; icon: string }[] = [
  { key: "basic", label: "기본설정", icon: "🔗" },
  { key: "design", label: "디자인", icon: "🎨" },
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
  const [error, setError] = useState("");
  const [open, setOpen] = useState<PanelKey>("basic");
  const [device, setDevice] = useState<"pc" | "mobile">("pc");

  const [subdomain, setSubdomain] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [subStatus, setSubStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  const subTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [siteTitle, setSiteTitle] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [companyIntro, setCompanyIntro] = useState("");

  const [intake, setIntake] = useState<Record<string, any>>({
    theme_color: "teal",
    hero_title: "",
    hero_highlight: "",
    hero_desc: "",
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
        setIsActive(d.is_active !== false);
        setLogoUrl(d.logo_url || null);
        setSiteTitle(d.site_title || "");
        setContactPhone(d.contact_phone || "");
        setCompanyIntro(d.company_intro || "");
        if (d.intake) setIntake((prev) => ({ ...prev, ...d.intake }));
      }
      setLoading(false);
    })();
  }, [memberId]);

  // ── 서브도메인 중복 검사 (타이핑 멈추면) ──
  const onSubdomainChange = (v: string) => {
    const next = v.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSubdomain(next);
    if (subTimer.current) clearTimeout(subTimer.current);
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

  const onLogoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("path", `logo/${memberId}_${Date.now()}_${file.name}`);
    const up = await uploadHomepageFile(fd);
    if (up.success) setLogoUrl((up as any).url);
    else setError((up as any).error || "로고 업로드에 실패했습니다.");
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

  const liveUrl = subdomain ? `https://${subdomain}.gongsilnews.com` : "";

  return (
    <div style={{ flex: 1, display: "flex", gap: 16, margin: 16, marginBottom: 0, minHeight: 0 }}>
      {/* ── 좌측: 편집 패널 ── */}
      <div style={{ width: 400, flexShrink: 0, display: "flex", flexDirection: "column", background: cardBg, border: `1px solid ${border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "18px 20px", borderBottom: `1px solid ${border}` }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: text }}>물건접수장</h2>
          <p style={{ margin: "5px 0 0", fontSize: 12.5, color: sub }}>임대인이 물건을 맡기는 페이지입니다</p>
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
                            <input style={{ ...field, flex: 1 }} value={subdomain} onChange={(e) => onSubdomainChange(e.target.value)} placeholder="gongsilmarketing" />
                            <span style={{ fontSize: 12.5, color: sub, whiteSpace: "nowrap" }}>.gongsilnews.com</span>
                          </div>
                          <p style={{ margin: "7px 0 0", fontSize: 12.5, fontWeight: 700, color: subStatus === "ok" ? "#059669" : subStatus === "idle" || subStatus === "checking" ? sub : "#dc2626" }}>
                            {subStatus === "checking" && "확인 중…"}
                            {subStatus === "ok" && "사용할 수 있는 주소입니다"}
                            {subStatus === "taken" && "이미 사용 중입니다"}
                            {subStatus === "invalid" && "영문 소문자·숫자·하이픈 2~30자"}
                            {subStatus === "idle" && "명함이나 문자로 보낼 주소입니다"}
                          </p>
                        </div>

                        <div style={group}>
                          <label style={label}>상호</label>
                          <input style={field} value={siteTitle} onChange={(e) => setSiteTitle(e.target.value)} placeholder="OO공인중개사사무소" />
                        </div>

                        <div style={group}>
                          <label style={label}>로고</label>
                          {logoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={logoUrl} alt="" style={{ height: 34, marginBottom: 8, objectFit: "contain" }} />
                          )}
                          <label style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 44, border: `1px dashed ${border}`, borderRadius: 8, fontSize: 13.5, fontWeight: 700, color: sub, cursor: "pointer" }}>
                            {logoUrl ? "로고 바꾸기" : "+ 로고 올리기"}
                            <input type="file" accept="image/*" hidden onChange={onLogoPick} />
                          </label>
                        </div>

                        <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
                          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} style={{ width: 17, height: 17, accentColor: "#059669" }} />
                          <span style={{ fontSize: 14, fontWeight: 700, color: text }}>접수 받는 중</span>
                        </label>
                        <p style={{ margin: "5px 0 0 26px", fontSize: 12.5, color: sub }}>끄면 주소로 들어와도 접수가 되지 않습니다</p>
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
                          <label style={label}>첫 줄</label>
                          <input style={field} value={intake.hero_title || ""} onChange={(e) => setIntake({ ...intake, hero_title: e.target.value })} placeholder="내놓을 물건이 있으신가요?" />
                        </div>
                        <div style={group}>
                          <label style={label}>둘째 줄 (강조)</label>
                          <input style={field} value={intake.hero_highlight || ""} onChange={(e) => setIntake({ ...intake, hero_highlight: e.target.value })} placeholder="여기에 접수해 주세요" />
                        </div>
                        <div style={group}>
                          <label style={label}>설명</label>
                          <textarea style={{ ...field, minHeight: 72, resize: "vertical", fontFamily: "inherit" }} value={intake.hero_desc || ""} onChange={(e) => setIntake({ ...intake, hero_desc: e.target.value })} placeholder="연락처만 남겨 주시면 확인 후 바로 연락드립니다." />
                        </div>
                        <div style={group}>
                          <label style={label}>버튼 문구</label>
                          <input style={field} value={intake.cta_label || ""} onChange={(e) => setIntake({ ...intake, cta_label: e.target.value })} placeholder="1분이면 접수 끝" />
                        </div>
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
                        <div style={group}>
                          <label style={label}>대표 전화</label>
                          <input style={field} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="02-000-0000" />
                        </div>
                        <div style={group}>
                          <label style={label}>사무소 소개</label>
                          <textarea style={{ ...field, minHeight: 88, resize: "vertical", fontFamily: "inherit" }} value={companyIntro} onChange={(e) => setCompanyIntro(e.target.value)} placeholder="어떤 물건을 주로 다루는지 짧게 적어주세요" />
                        </div>
                        <p style={{ margin: 0, fontSize: 12.5, color: sub, lineHeight: 1.6 }}>
                          주소·영업시간은 <strong style={{ color: text }}>정보설정</strong>의 부동산 정보를 그대로 씁니다.
                        </p>
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
          {liveUrl && (
            <a href={liveUrl} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 9, textAlign: "center", fontSize: 12.5, fontWeight: 700, color: sub, textDecoration: "none" }}>
              {liveUrl} ↗
            </a>
          )}
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
            <IntakeClient
              subdomain={subdomain || "preview"}
              settings={previewSettings}
              member={null}
              companyProfile={null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
