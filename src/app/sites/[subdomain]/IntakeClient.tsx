"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { submitPropertyIntake, type IntakeType } from "@/app/actions/intake";
import { uploadHomepageFile } from "@/app/actions/homepage";

/**
 * 물건접수장 (공개 페이지)
 *
 * 이 페이지의 일은 하나뿐이다 — 방문자가 접수 폼을 제출하게 만드는 것.
 * 위/중간/아래 세 군데에서 같은 폼으로 보내고, 사이에 놓인 섹션은 전부
 * "이 사람한테 맡겨도 되나"에 답하는 재료다.
 *
 * 배치는 고정이고, 색상만 아래 THEMES 중에서 고른다. 중개사가 배치를 고르게
 * 두면 보기 좋은 쪽을 고르지 접수가 잘 되는 쪽을 고르지 않는다.
 */

/** 물건보고서(report-generator)의 색 구성을 그대로 따른다 */
const THEMES: Record<string, { primary: string; secondary: string; dark: string }> = {
  teal: { primary: "#00788c", secondary: "#00c6d7", dark: "#003845" },
  gold: { primary: "#bfa068", secondary: "#e6cc9f", dark: "#3e301b" },
  green: { primary: "#005f4d", secondary: "#4fb89e", dark: "#002820" },
  burgundy: { primary: "#7c1f2d", secondary: "#ff9ea7", dark: "#380d13" },
  orange: { primary: "#f27405", secondary: "#ffac63", dark: "#5e2609" },
};

const MAX_PHOTOS = 5;
const MAX_EDGE = 1280;

/** 업로드 전에 긴 변 1280px 로 줄이고 WebP 로 바꾼다. 폰 사진이 장당 0.1~0.2MB 로 떨어진다. */
function shrinkToWebp(file: File): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) return resolve(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
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
        0.75
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

interface Props {
  subdomain: string;
  settings: any;
  member: any;
  companyProfile: any;
}

export default function IntakeClient({ subdomain, settings, member, companyProfile }: Props) {
  // 편집기가 저장하는 값은 settings.intake 에 모여 있다
  const cfg = settings?.intake || {};
  const theme = THEMES[cfg.theme_color as string] || THEMES.teal;

  // 받을 항목 on/off. 저장된 적 없으면 전부 켠 상태가 기본이다.
  const showSeeking = cfg.show_seeking !== false;
  const showPhotos = cfg.show_photos !== false;
  const showBudget = cfg.show_budget !== false;
  const showNotes = cfg.show_notes !== false;

  const officeName =
    settings?.site_title ||
    companyProfile?.name ||
    companyProfile?.company_name ||
    member?.name ||
    "부동산";

  const address = [companyProfile?.address, companyProfile?.address_detail].filter(Boolean).join(" ");
  const phone = settings?.contact_phone || companyProfile?.phone || member?.phone || "";
  const intro = settings?.company_intro || "";

  const formRef = useRef<HTMLDivElement>(null);
  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  // ── 폼 상태 ──
  const [type, setType] = useState<IntakeType>("매물내놔요");
  const [name, setName] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [area, setArea] = useState("");
  const [budget, setBudget] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [notes, setNotes] = useState("");
  const [agreed, setAgreed] = useState(false);

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const isSeeking = type === "매물구해요";

  useEffect(() => {
    // 미리보기 URL 정리
    return () => previews.forEach((u) => URL.revokeObjectURL(u));
  }, [previews]);

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    const room = MAX_PHOTOS - files.length;
    const next = picked.slice(0, room);
    setFiles((prev) => [...prev, ...next]);
    setPreviews((prev) => [...prev, ...next.map((f) => URL.createObjectURL(f))]);
    e.target.value = "";
  };

  const removePhoto = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) return setError("이름을 입력해 주세요.");
    if (!phoneInput.trim()) return setError("연락처를 입력해 주세요.");
    if (!agreed) return setError("개인정보 수집 · 이용에 동의해 주세요.");

    setSubmitting(true);
    try {
      // 사진은 선택 항목이다. 업로드가 실패해도 접수 자체는 막지 않는다.
      let photoUrls: string[] = [];
      if (!isSeeking && files.length) {
        const uploaded = await Promise.all(
          files.map(async (f) => {
            try {
              const webp = await shrinkToWebp(f);
              const fd = new FormData();
              fd.append("file", webp);
              fd.append("path", `intake/${subdomain}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`);
              const up = await uploadHomepageFile(fd);
              return up.success ? (up as any).url : null;
            } catch {
              return null;
            }
          })
        );
        photoUrls = uploaded.filter(Boolean) as string[];
      }

      const res = await submitPropertyIntake(subdomain, {
        type,
        name,
        phone: phoneInput,
        area,
        budget,
        moveInDate,
        notes,
        photoUrls,
      });

      if (!res.success) {
        setError(res.message || "접수에 실패했습니다.");
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch {
      setError("접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "14px 16px",
    fontSize: 16,
    border: "1px solid #d7dde3",
    borderRadius: 10,
    outline: "none",
    background: "#fff",
    color: "#1e293b",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 14,
    fontWeight: 700,
    color: "#334155",
    marginBottom: 8,
  };

  const ctaButton = (label: string) => (
    <button
      type="button"
      onClick={scrollToForm}
      style={{
        display: "inline-block",
        padding: "16px 40px",
        background: theme.primary,
        color: "#fff",
        border: "none",
        borderRadius: 12,
        fontSize: 17,
        fontWeight: 800,
        cursor: "pointer",
        boxShadow: `0 10px 24px ${theme.primary}55`,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ fontFamily: "'Pretendard Variable', -apple-system, sans-serif", color: "#1e293b", background: "#fff" }}>
      {/* ── 상단 바 ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "#fff",
          borderBottom: "1px solid #eef1f4",
          padding: "0 20px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          {settings?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logo_url} alt={officeName} style={{ height: 30, objectFit: "contain" }} />
          ) : null}
          <span style={{ fontSize: 17, fontWeight: 800, color: theme.dark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {officeName}
          </span>
        </div>
        <button
          type="button"
          onClick={scrollToForm}
          style={{ padding: "8px 16px", background: theme.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: "pointer" }}
        >
          물건 접수
        </button>
      </header>

      {/* ── 1. 메인 소개 ── */}
      <section style={{ background: theme.dark, color: "#fff", padding: "72px 20px 64px", textAlign: "center" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <p style={{ fontSize: 16, color: theme.secondary, fontWeight: 700, margin: "0 0 14px 0" }}>{officeName}</p>
          <h1 style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.4, letterSpacing: "-0.8px", margin: "0 0 18px 0", wordBreak: "keep-all" }}>
            {cfg.hero_title || "내놓을 물건이 있으신가요?"}<br />
            <span style={{ color: theme.secondary }}>{cfg.hero_highlight || "여기에 접수해 주세요"}</span>
          </h1>
          <p style={{ fontSize: 16.5, lineHeight: 1.8, color: "rgba(255,255,255,0.8)", margin: "0 0 34px 0", wordBreak: "keep-all" }}>
            {cfg.hero_desc || intro || "연락처만 남겨 주시면 확인 후 바로 연락드립니다. 사진이 없어도 접수됩니다."}
          </p>
          {ctaButton(cfg.cta_label || "1분이면 접수 끝")}
        </div>
      </section>

      {/* ── 2. 접수 폼 ── */}
      <section ref={formRef} style={{ padding: "64px 20px", background: "#f6f8fa", scrollMarginTop: 60 }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          {done ? (
            <div style={{ background: "#fff", borderRadius: 16, padding: "48px 32px", textAlign: "center", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>✅</div>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: theme.dark, margin: "0 0 12px 0" }}>접수되었습니다</h2>
              <p style={{ fontSize: 16, color: "#475569", lineHeight: 1.7, margin: "0 0 26px 0", wordBreak: "keep-all" }}>
                확인 후 {phone ? <strong>{phone}</strong> : "담당자"} 번호로 연락드리겠습니다.
              </p>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px", textAlign: "left" }}>
                <p style={{ fontSize: 14.5, fontWeight: 800, color: theme.dark, margin: "0 0 6px 0" }}>사진을 못 올리셨나요?</p>
                <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7, margin: 0, wordBreak: "keep-all" }}>
                  괜찮습니다. 연락드릴 때 문자나 카카오톡으로 보내 주셔도 됩니다.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ background: "#fff", borderRadius: 16, padding: "36px 28px", border: "1px solid #e2e8f0", boxShadow: "0 4px 18px rgba(0,0,0,0.04)" }}>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: theme.dark, margin: "0 0 24px 0", textAlign: "center" }}>
                물건 접수
              </h2>

              {/* 무엇 때문에 오셨는지 — 기본은 내놓기 */}
              <div style={{ display: showSeeking ? "flex" : "none", gap: 10, marginBottom: 24 }}>
                {(["매물내놔요", "매물구해요"] as IntakeType[]).map((t) => {
                  const on = type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      style={{
                        flex: 1,
                        padding: "13px 10px",
                        borderRadius: 10,
                        border: on ? `2px solid ${theme.primary}` : "1px solid #d7dde3",
                        background: on ? `${theme.primary}0f` : "#fff",
                        color: on ? theme.primary : "#64748b",
                        fontSize: 15,
                        fontWeight: on ? 800 : 600,
                        cursor: "pointer",
                      }}
                    >
                      {t === "매물내놔요" ? "내놓을 물건이 있어요" : "구하는 물건이 있어요"}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <label style={labelStyle}>이름 <span style={{ color: "#ef4444" }}>*</span></label>
                  <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="성함" />
                </div>

                <div>
                  <label style={labelStyle}>연락처 <span style={{ color: "#ef4444" }}>*</span></label>
                  <input style={inputStyle} value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} placeholder="010-0000-0000" inputMode="tel" />
                </div>

                <div>
                  <label style={labelStyle}>{isSeeking ? "희망 지역" : "물건 소재지"}</label>
                  <input style={inputStyle} value={area} onChange={(e) => setArea(e.target.value)} placeholder={isSeeking ? "예) 강남구 역삼동" : "예) 강남구 역삼동 OO빌딩"} />
                </div>

                <div style={{ display: showBudget ? "block" : "none" }}>
                  <label style={labelStyle}>{isSeeking ? "예산" : "희망 금액"}</label>
                  <input style={inputStyle} value={budget} onChange={(e) => setBudget(e.target.value)} placeholder={isSeeking ? "예) 보증금 3000 / 월 150" : "예) 보증금 5000 / 월 200"} />
                </div>

                {isSeeking && (
                  <div>
                    <label style={labelStyle}>입주 희망일</label>
                    <input type="date" style={inputStyle} value={moveInDate} onChange={(e) => setMoveInDate(e.target.value)} />
                  </div>
                )}

                {!isSeeking && showPhotos && (
                  <div>
                    <label style={labelStyle}>
                      사진 <span style={{ color: "#94a3b8", fontWeight: 600 }}>(선택 · 최대 {MAX_PHOTOS}장)</span>
                    </label>
                    <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 10px 0" }}>지금 없으셔도 됩니다. 나중에 보내 주셔도 돼요.</p>

                    {previews.length > 0 && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                        {previews.map((src, i) => (
                          <div key={src} style={{ position: "relative", width: 72, height: 72 }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0" }} />
                            <button
                              type="button"
                              onClick={() => removePhoto(i)}
                              aria-label="사진 빼기"
                              style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", border: "none", background: "#0f172a", color: "#fff", fontSize: 13, lineHeight: "22px", cursor: "pointer", padding: 0 }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {files.length < MAX_PHOTOS && (
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: 56,
                          border: "1px dashed #cbd5e1",
                          borderRadius: 10,
                          fontSize: 14.5,
                          fontWeight: 700,
                          color: "#64748b",
                          cursor: "pointer",
                          background: "#fafbfc",
                        }}
                      >
                        + 사진 추가
                        <input type="file" accept="image/*" multiple hidden onChange={handlePhotos} />
                      </label>
                    )}
                  </div>
                )}

                <div style={{ display: showNotes ? "block" : "none" }}>
                  <label style={labelStyle}>남기실 말씀</label>
                  <textarea
                    style={{ ...inputStyle, minHeight: 92, resize: "vertical", fontFamily: "inherit" }}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="편하게 적어 주세요"
                  />
                </div>

                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#475569", lineHeight: 1.6, cursor: "pointer" }}>
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0, accentColor: theme.primary }} />
                  <span>
                    <strong>개인정보 수집 · 이용에 동의합니다.</strong>
                    <br />
                    <span style={{ color: "#94a3b8", fontSize: 13 }}>
                      수집 항목: 이름 · 연락처 · 문의 내용 / 목적: 접수 물건 상담 / 보유: 상담 종료 후 1년
                    </span>
                  </span>
                </label>

                {error && (
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 14px" }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: "100%",
                    padding: "17px",
                    background: submitting ? "#94a3b8" : theme.primary,
                    color: "#fff",
                    border: "none",
                    borderRadius: 12,
                    fontSize: 17,
                    fontWeight: 800,
                    cursor: submitting ? "default" : "pointer",
                    boxShadow: submitting ? "none" : `0 8px 20px ${theme.primary}44`,
                  }}
                >
                  {submitting ? "접수 중…" : "접 수 하 기"}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* ── 3. 물건 현황 · 금주의 뉴스 자리 ── */}
      <section style={{ padding: "64px 20px", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", padding: "48px 20px", border: "1px dashed #cbd5e1", borderRadius: 16, color: "#94a3b8", fontSize: 14.5, fontWeight: 700 }}>
          물건 현황 · 금주의 뉴스 섹션 자리
        </div>
      </section>

      {/* ── 4. 오시는길 ── */}
      <section style={{ background: "#f6f8fa", borderTop: "1px solid #e8edf1", padding: "64px 20px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: theme.dark, margin: "0 0 24px 0" }}>오시는 길</h2>
          <dl style={{ margin: "0 0 30px 0", display: "grid", gridTemplateColumns: "88px 1fr", gap: "12px 16px", textAlign: "left", fontSize: 15.5 }}>
            <dt style={{ fontWeight: 800, color: "#64748b" }}>상호</dt>
            <dd style={{ margin: 0, color: "#1e293b" }}>{officeName}</dd>
            {address && (
              <>
                <dt style={{ fontWeight: 800, color: "#64748b" }}>주소</dt>
                <dd style={{ margin: 0, color: "#1e293b", wordBreak: "keep-all" }}>{address}</dd>
              </>
            )}
            {phone && (
              <>
                <dt style={{ fontWeight: 800, color: "#64748b" }}>전화</dt>
                <dd style={{ margin: 0 }}>
                  <a href={`tel:${phone}`} style={{ color: theme.primary, fontWeight: 800, textDecoration: "none" }}>{phone}</a>
                </dd>
              </>
            )}
            {companyProfile?.business_hours && (
              <>
                <dt style={{ fontWeight: 800, color: "#64748b" }}>영업시간</dt>
                <dd style={{ margin: 0, color: "#1e293b" }}>{companyProfile.business_hours}</dd>
              </>
            )}
          </dl>
          {ctaButton("물건 접수하기")}
        </div>
      </section>

      {/* ── 푸터 ── */}
      <footer style={{ background: theme.dark, color: "rgba(255,255,255,0.55)", padding: "30px 20px", textAlign: "center", fontSize: 13, lineHeight: 1.8 }}>
        <div>{officeName}</div>
        <div>
          powered by{" "}
          <a href="https://gongsilnews.com" style={{ color: theme.secondary, textDecoration: "none" }}>공실뉴스</a>
        </div>
      </footer>
    </div>
  );
}
