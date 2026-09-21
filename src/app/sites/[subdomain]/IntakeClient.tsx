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

const PROPERTY_TYPES = ["아파트", "빌라·주택", "상가", "사무실", "토지", "기타"];
const TRADE_TYPES = ["매매", "전세", "월세", "단기"];

/** 공실등록과 같은 금액 빠른입력 단위 (만원) */
const AMOUNT_STEPS = [
  { label: "+50억", val: 500000 },
  { label: "+5억", val: 50000 },
  { label: "+1억", val: 10000 },
  { label: "+5000만", val: 5000 },
  { label: "+1000만", val: 1000 },
  { label: "+500만", val: 500 },
  { label: "+100만", val: 100 },
  { label: "+50만", val: 50 },
  { label: "+10만", val: 10 },
];
/** 입주 시점. 달력에서 날짜를 고르게 하면 대부분 대충 찍거나 그냥 건너뛴다. */
const MOVE_IN_LISTING = ["공실", "1주 이내", "1달 이내", "협의"];
const MOVE_IN_SEEKING = ["즉시", "1주 이내", "1달 이내", "협의"];

/** 다음 우편번호 위젯. 공실등록과 같은 것을 쓰되 접수장에는 주소만 있으면 된다. */
function openPostcode(onPick: (addr: string) => void) {
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

/** 만원 단위 숫자만 남긴다 */
function onlyDigits(v: string): string {
  return v.replace(/[^0-9]/g, "").slice(0, 9);
}

/** 천 단위 쉼표 */
function withComma(v: string): string {
  return v ? Number(v).toLocaleString("ko-KR") : "";
}

/** 제곱미터를 평으로. 부동산에서는 평으로 말하는 사람이 여전히 많다. */
function toPyeong(m2: string): string {
  const n = Number(m2 || 0);
  if (!n) return "";
  return `${(n / 3.3058).toFixed(1)}평`;
}

/** 만원 단위를 사람이 읽는 말로. 5000 -> "5,000만원", 15000 -> "1억 5,000만원" */
function readMoney(v: string): string {
  const n = Number(v || 0);
  if (!n) return "";
  const eok = Math.floor(n / 10000);
  const man = n % 10000;
  if (eok && man) return `${eok}억 ${man.toLocaleString("ko-KR")}만원`;
  if (eok) return `${eok}억원`;
  return `${man.toLocaleString("ko-KR")}만원`;
}

/** 숫자만 받아 하이픈을 끼워 넣는다. 접수자가 직접 "-" 를 치게 만들 이유가 없다. */
function formatPhone(v: string): string {
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
  const agentMobile = companyProfile?.cell || member?.phone || "";
  const agentRepresentative = companyProfile?.ceo_name ? `대표 공인중개사 ${companyProfile.ceo_name}` : "";
  const intro = settings?.company_intro || "";

  const formRef = useRef<HTMLDivElement>(null);
  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  // ── 폼 상태 ──
  const [type, setType] = useState<IntakeType>("매물내놔요");
  const [name, setName] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [area, setArea] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [tradeType, setTradeType] = useState("");
  const [deposit, setDeposit] = useState("");   // 만원 단위
  const [monthly, setMonthly] = useState("");   // 만원 단위
  const [rooms, setRooms] = useState("");
  const [baths, setBaths] = useState("");
  const [exclusiveM2, setExclusiveM2] = useState("");
  const [supplyM2, setSupplyM2] = useState("");
  const [maintenance, setMaintenance] = useState("");
  const [exclusivePy, setExclusivePy] = useState("");
  const [supplyPy, setSupplyPy] = useState("");
  const [floor, setFloor] = useState("");
  const [totalFloor, setTotalFloor] = useState("");
  const [detailAddr, setDetailAddr] = useState("");
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

      // 고객문의 상세 화면이 읽는 형식에 맞춰 조립한다.
      //   area   = "매물종류 / 지역 / 입주조건"
      //   budget = "[거래구분] 금액"
      const fullAddr = [area, detailAddr].filter(Boolean).join(" ").trim();
      const moveInLabel = moveInDate ? `${isSeeking ? "입주희망" : "입주가능"} ${moveInDate}` : "";
      // moveInDate 는 이제 날짜가 아니라 "1주 이내" 같은 문구라 date 컬럼으로 보내지 않는다.
      // 고객문의 목록의 [입주일] 칸은 area 의 세 번째 조각을 읽으므로 그대로 보인다.
      const composedArea = propertyType
        ? [propertyType, fullAddr || "지역 미정", moveInLabel].filter(Boolean).join(" / ")
        : fullAddr;

      let priceText = "";
      if (tradeType === "월세" || tradeType === "단기") {
        priceText = [deposit && `보증금 ${withComma(deposit)}만원`, monthly && `월 ${withComma(monthly)}만원`].filter(Boolean).join(" / ");
      } else if (deposit) {
        priceText = `${readMoney(deposit)}`;
      }
      if (maintenance) priceText = `${priceText} (관리비 ${withComma(maintenance)}만원)`.trim();
      const composedBudget = tradeType ? `[${tradeType}] ${priceText}`.trim() : priceText;

      // 방·욕실·면적은 담을 컬럼이 없어 메모(crm_logs)에 붙여 보낸다.
      // 중개사는 고객문의 상세의 이력에서 그대로 읽는다.
      const specLines: string[] = [];
      if (rooms || baths) specLines.push(`방/욕실: ${rooms || 0} / ${baths || 0}`);
      if (supplyM2) specLines.push(`공급면적: ${supplyM2}㎡ (${supplyPy || toPyeong(supplyM2).replace("평", "")}평)`);
      if (exclusiveM2) specLines.push(`전용면적: ${exclusiveM2}㎡ (${exclusivePy || toPyeong(exclusiveM2).replace("평", "")}평)`);
      if (floor || totalFloor) specLines.push(`층수: ${floor || "-"}층 / 총 ${totalFloor || "-"}층`);
      const composedNotes = [specLines.join("\n"), notes.trim()].filter(Boolean).join("\n\n");

      const res = await submitPropertyIntake(subdomain, {
        type,
        name,
        phone: phoneInput,
        area: composedArea,
        budget: composedBudget,
        notes: composedNotes,
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

  /** 공실등록의 금액 빠른입력과 같은 버튼 묶음 */
  const AmountKeypad = ({ value, setter }: { value: string; setter: (v: string) => void }) => (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
      {AMOUNT_STEPS.map((b) => (
        <button
          key={b.label}
          type="button"
          onClick={() => setter(String(Number(value || 0) + b.val))}
          style={{ padding: "5px 9px", fontSize: 12, background: "#f1f3f5", border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer", color: "#64748b", fontWeight: 700 }}
        >
          {b.label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setter("")}
        style={{ padding: "5px 9px", fontSize: 12, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6, cursor: "pointer", color: "#ef4444", fontWeight: 700 }}
      >
        초기화
      </button>
    </div>
  );

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
      <section id="intake" ref={formRef} style={{ padding: "64px 20px", background: "#f6f8fa", scrollMarginTop: 60 }}>
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
                  <input style={inputStyle} value={phoneInput} onChange={(e) => setPhoneInput(formatPhone(e.target.value))} placeholder="010-0000-0000" inputMode="numeric" maxLength={13} />
                </div>

                {/* 주소 — 직접 치는 것보다 검색해서 고르는 편이 빠르고 정확하다 */}
                <div>
                  <label style={labelStyle}>{isSeeking ? "희망 지역" : "물건 소재지"}</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      style={{ ...inputStyle, flex: 1, background: "#f8fafc", cursor: "pointer" }}
                      value={area}
                      readOnly
                      onClick={() => openPostcode(setArea)}
                      placeholder="주소를 검색해 주세요"
                    />
                    <button
                      type="button"
                      onClick={() => openPostcode(setArea)}
                      style={{ flexShrink: 0, padding: "0 18px", borderRadius: 10, border: "none", background: "#1e293b", color: "#fff", fontSize: 14.5, fontWeight: 800, cursor: "pointer" }}
                    >
                      주소 검색
                    </button>
                  </div>
                  {area && (
                    <input
                      style={{ ...inputStyle, marginTop: 8 }}
                      value={detailAddr}
                      onChange={(e) => setDetailAddr(e.target.value)}
                      placeholder="상세주소 (동·호수 등)"
                    />
                  )}
                </div>

                {/* 매물 종류 — 타이핑보다 탭 한 번이 빠르다 */}
                <div>
                  <label style={labelStyle}>매물 종류</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {PROPERTY_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setPropertyType(propertyType === t ? "" : t)}
                        style={{
                          padding: "10px 16px",
                          borderRadius: 999,
                          border: propertyType === t ? `2px solid ${theme.primary}` : "1px solid #d7dde3",
                          background: propertyType === t ? `${theme.primary}12` : "#fff",
                          color: propertyType === t ? theme.primary : "#64748b",
                          fontSize: 14.5,
                          fontWeight: propertyType === t ? 800 : 600,
                          cursor: "pointer",
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 거래 구분 — 고르면 아래 금액 칸이 그에 맞게 바뀐다 */}
                <div style={{ display: showBudget ? "block" : "none" }}>
                  <label style={labelStyle}>거래 구분</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {TRADE_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => { setTradeType(tradeType === t ? "" : t); setMonthly(""); }}
                        style={{
                          flex: 1,
                          padding: "12px 10px",
                          borderRadius: 10,
                          border: tradeType === t ? `2px solid ${theme.primary}` : "1px solid #d7dde3",
                          background: tradeType === t ? `${theme.primary}12` : "#fff",
                          color: tradeType === t ? theme.primary : "#64748b",
                          fontSize: 15,
                          fontWeight: tradeType === t ? 800 : 600,
                          cursor: "pointer",
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 금액 — 공실등록과 같은 방식. 거래유형에 따라 칸이 바뀐다 */}
                {showBudget && (
                  <div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ flex: "1 1 200px", minWidth: 180 }}>
                        <label style={labelStyle}>
                          {tradeType === "매매" ? "매매가" : tradeType ? "보증금" : "금액"}
                          {readMoney(deposit) && (
                            <span style={{ marginLeft: 8, color: theme.primary, fontSize: 13, fontWeight: 800 }}>{readMoney(deposit)}</span>
                          )}
                        </label>
                        <div style={{ position: "relative" }}>
                          <input
                            style={{ ...inputStyle, paddingRight: 54, textAlign: "right", fontWeight: 700 }}
                            value={withComma(deposit)}
                            onChange={(e) => setDeposit(onlyDigits(e.target.value))}
                            placeholder={tradeType === "매매" ? "예: 30000" : "예: 20000"}
                            inputMode="numeric"
                          />
                          <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", fontSize: 14, fontWeight: 700, color: "#94a3b8" }}>만원</span>
                        </div>
                        <AmountKeypad value={deposit} setter={setDeposit} />
                      </div>

                      {(tradeType === "월세" || tradeType === "단기") && (
                        <div style={{ flex: "1 1 200px", minWidth: 180 }}>
                          <label style={labelStyle}>
                            월세
                            {readMoney(monthly) && (
                              <span style={{ marginLeft: 8, color: theme.primary, fontSize: 13, fontWeight: 800 }}>{readMoney(monthly)}</span>
                            )}
                          </label>
                          <div style={{ position: "relative" }}>
                            <input
                              style={{ ...inputStyle, paddingRight: 54, textAlign: "right", fontWeight: 700 }}
                              value={withComma(monthly)}
                              onChange={(e) => setMonthly(onlyDigits(e.target.value))}
                              placeholder="예: 50"
                              inputMode="numeric"
                            />
                            <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", fontSize: 14, fontWeight: 700, color: "#94a3b8" }}>만원</span>
                          </div>
                          <AmountKeypad value={monthly} setter={setMonthly} />
                        </div>
                      )}
                    </div>

                    {/* 관리비 */}
                    <div style={{ marginTop: 18 }}>
                      <label style={labelStyle}>
                        관리비
                        {readMoney(maintenance) && (
                          <span style={{ marginLeft: 8, color: theme.primary, fontSize: 13, fontWeight: 800 }}>{readMoney(maintenance)}</span>
                        )}
                      </label>
                      <div style={{ position: "relative", maxWidth: 260 }}>
                        <input
                          style={{ ...inputStyle, paddingRight: 54, textAlign: "right", fontWeight: 700 }}
                          value={withComma(maintenance)}
                          onChange={(e) => setMaintenance(onlyDigits(e.target.value))}
                          placeholder="예: 10"
                          inputMode="numeric"
                        />
                        <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", fontSize: 14, fontWeight: 700, color: "#94a3b8" }}>만원</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 방 · 욕실 */}
                <div>
                  <label style={labelStyle}>방 / 욕실</label>
                  <div style={{ display: "flex", gap: 12 }}>
                    {([
                      { key: "rooms", label: "방", value: rooms, set: setRooms },
                      { key: "baths", label: "욕실", value: baths, set: setBaths },
                    ] as const).map((f) => (
                      <div key={f.key} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #d7dde3", borderRadius: 10, padding: "8px 10px" }}>
                        <span style={{ fontSize: 14.5, fontWeight: 700, color: "#64748b" }}>{f.label}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <button
                            type="button"
                            aria-label={f.label + " 줄이기"}
                            onClick={() => f.set(String(Math.max(0, Number(f.value || 0) - 1)))}
                            style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #d7dde3", background: "#fff", color: "#475569", fontSize: 17, fontWeight: 800, cursor: "pointer", lineHeight: 1 }}
                          >
                            −
                          </button>
                          <span style={{ minWidth: 22, textAlign: "center", fontSize: 16, fontWeight: 800, color: f.value ? "#1e293b" : "#cbd5e1" }}>
                            {f.value || 0}
                          </span>
                          <button
                            type="button"
                            aria-label={f.label + " 늘리기"}
                            onClick={() => f.set(String(Math.min(20, Number(f.value || 0) + 1)))}
                            style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #d7dde3", background: "#fff", color: "#475569", fontSize: 17, fontWeight: 800, cursor: "pointer", lineHeight: 1 }}
                          >
                            +
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 면적 — 평과 ㎡ 중 아무 쪽이나 치면 반대쪽이 따라온다 */}
                <div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {([
                      { key: "sp", label: "공급면적", py: supplyPy, setPy: setSupplyPy, m2: supplyM2, setM2: setSupplyM2, phPy: "예: 25.4", phM2: "예: 84" },
                      { key: "ex", label: "전용면적", py: exclusivePy, setPy: setExclusivePy, m2: exclusiveM2, setM2: setExclusiveM2, phPy: "예: 18.8", phM2: "예: 59" },
                    ] as const).map((f) => (
                      <div key={f.key} style={{ flex: "1 1 220px", minWidth: 200 }}>
                        <label style={labelStyle}>{f.label}</label>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input
                            style={{ ...inputStyle, flex: 1, textAlign: "right", fontWeight: 700 }}
                            value={f.py}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9.]/g, "").slice(0, 7);
                              f.setPy(v);
                              f.setM2(v ? (Number(v) * 3.3058).toFixed(1) : "");
                            }}
                            placeholder={f.phPy}
                            inputMode="decimal"
                          />
                          <span style={{ color: "#94a3b8", fontSize: 13.5, fontWeight: 700, flexShrink: 0 }}>평</span>
                          <span style={{ color: "#cbd5e1", fontSize: 13.5, flexShrink: 0 }}>=</span>
                          <input
                            style={{ ...inputStyle, flex: 1, textAlign: "right", fontWeight: 700 }}
                            value={f.m2}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9.]/g, "").slice(0, 7);
                              f.setM2(v);
                              f.setPy(v ? (Number(v) / 3.3058).toFixed(1) : "");
                            }}
                            placeholder={f.phM2}
                            inputMode="decimal"
                          />
                          <span style={{ color: "#94a3b8", fontSize: 13.5, fontWeight: 700, flexShrink: 0 }}>m²</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 층수 */}
                <div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 160px", minWidth: 140 }}>
                      <label style={labelStyle}>해당층</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          style={{ ...inputStyle, flex: 1, fontWeight: 700 }}
                          value={floor}
                          onChange={(e) => setFloor(e.target.value.slice(0, 10))}
                          placeholder="예: 3, 저층, 고층"
                        />
                        <span style={{ color: "#94a3b8", fontSize: 13.5, fontWeight: 700, flexShrink: 0 }}>층</span>
                      </div>
                    </div>
                    <div style={{ flex: "1 1 160px", minWidth: 140 }}>
                      <label style={labelStyle}>전체층</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          style={{ ...inputStyle, flex: 1, textAlign: "right", fontWeight: 700 }}
                          value={totalFloor}
                          onChange={(e) => setTotalFloor(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                          placeholder="예: 5"
                          inputMode="numeric"
                        />
                        <span style={{ color: "#94a3b8", fontSize: 13.5, fontWeight: 700, flexShrink: 0 }}>층</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 입주 시점 — 내놓는 쪽은 '가능일', 구하는 쪽은 '희망일' */}
                <div>
                  <label style={labelStyle}>{isSeeking ? "입주 희망일" : "입주 가능일"}</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(isSeeking ? MOVE_IN_SEEKING : MOVE_IN_LISTING).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setMoveInDate(moveInDate === t ? "" : t)}
                        style={{
                          flex: 1,
                          minWidth: 78,
                          padding: "12px 10px",
                          borderRadius: 10,
                          border: moveInDate === t ? `2px solid ${theme.primary}` : "1px solid #d7dde3",
                          background: moveInDate === t ? `${theme.primary}12` : "#fff",
                          color: moveInDate === t ? theme.primary : "#64748b",
                          fontSize: 14.5,
                          fontWeight: moveInDate === t ? 800 : 600,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

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
                    placeholder="세부정보를 적어주세요"
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

      {/* ── 3. 오시는길 ── */}
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
      {/* ── 4. 연락처 — 온라인 전단지의 CONTACT AGENT 와 같은 블록 ── */}
      <section style={{ background: "#1c1c1c", padding: "64px 20px" }}>
        <div style={{ maxWidth: 620, margin: "0 auto", background: "#ffffff", borderRadius: 4, padding: "48px 32px", textAlign: "center" }}>
          <span style={{ display: "block", fontSize: 13, fontWeight: 800, letterSpacing: "3px", color: theme.primary, marginBottom: 22 }}>
            CONTACT AGENT
          </span>

          <p style={{ margin: "0 0 8px 0", fontSize: 27, fontWeight: 900, color: "#111827", letterSpacing: "-0.5px" }}>
            {officeName}
          </p>

          {agentRepresentative && (
            <p style={{ margin: "0 0 22px 0", fontSize: 15, fontWeight: 600, color: "#6b7280" }}>{agentRepresentative}</p>
          )}

          <div style={{ width: 40, height: 2, background: "#d1d5db", margin: "0 auto 24px" }} />

          {(phone || agentMobile) && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
              <span
                aria-hidden
                style={{ width: 44, height: 44, borderRadius: "50%", background: theme.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                {phone && (
                  <a href={`tel:${phone}`} style={{ fontSize: 26, fontWeight: 900, color: "#111827", textDecoration: "none", letterSpacing: "-0.5px" }}>
                    {phone}
                  </a>
                )}
                {phone && agentMobile && <span style={{ color: "#d1d5db", fontSize: 24, fontWeight: 300 }}>|</span>}
                {agentMobile && (
                  <a href={`tel:${agentMobile}`} style={{ fontSize: 26, fontWeight: 900, color: "#111827", textDecoration: "none", letterSpacing: "-0.5px" }}>
                    {agentMobile}
                  </a>
                )}
              </span>
            </div>
          )}

          {companyProfile?.reg_num && (
            <p style={{ margin: "0 0 4px 0", fontSize: 14, color: "#6b7280" }}>등록번호: {companyProfile.reg_num}</p>
          )}
          {address && (
            <p style={{ margin: "0 0 28px 0", fontSize: 14, color: "#6b7280", wordBreak: "keep-all" }}>소재지: {address}</p>
          )}

          {(agentMobile || phone) && (
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <a
                href={`tel:${agentMobile || phone}`}
                style={{ flex: "1 1 160px", maxWidth: 220, padding: "16px 10px", background: theme.primary, color: "#fff", borderRadius: 10, fontSize: 16, fontWeight: 800, textDecoration: "none", letterSpacing: "1px" }}
              >
                전화하기
              </a>
              <a
                href={`sms:${agentMobile || phone}`}
                style={{ flex: "1 1 160px", maxWidth: 220, padding: "16px 10px", background: theme.secondary, color: "#fff", borderRadius: 10, fontSize: 16, fontWeight: 800, textDecoration: "none", letterSpacing: "1px" }}
              >
                문자보내기
              </a>
            </div>
          )}
        </div>
      </section>

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
