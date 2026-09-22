"use client";

import React, { useEffect, useRef, useState } from "react";
import { submitPropertyIntake, type IntakeType } from "@/app/actions/intake";
import { uploadHomepageFile } from "@/app/actions/homepage";
import SectionTitle from "./SectionTitle";
import {
  formatPhone,
  onlyDigits,
  openPostcode,
  readMoney,
  shrinkToWebp,
  toPyeong,
  withComma,
  type Theme,
} from "../theme";

interface Props {
  subdomain: string;
  theme: Theme;
  cfg: any;
  /** 접수 후 "이 번호로 연락드립니다" 에 쓴다 */
  phone?: string;
}

const MAX_PHOTOS = 5;
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

/**
 * 물건 접수 — 두 걸음으로 받는다.
 *
 * 1) 이름·연락처만 받고 곧바로 저장한다. 여기서 이미 중개사 폰에 알림이 간다.
 * 2) 저장된 뒤에 물건 내용을 묻는다. 채우면 같은 고객 기록에 붙고, 그냥 나가도
 *    연락처는 이미 남아 있다.
 *
 * 폼의 목적은 물건 정보를 다 받는 것이 아니라 연락처를 받는 것이다. 나머지는
 * 전화로 물으면 된다. 열여섯 칸을 한 번에 세워두면 대부분 세 번째 칸에서 나간다.
 */
export default function IntakeFormSection({ subdomain, theme, cfg, phone }: Props) {
  // 받을 항목 on/off. 저장된 적 없으면 전부 켠 상태가 기본이다.
  const showSeeking = cfg?.show_seeking !== false;
  const showPhotos = cfg?.show_photos !== false;
  const showBudget = cfg?.show_budget !== false;
  const showNotes = cfg?.show_notes !== false;

  const [step, setStep] = useState<"lead" | "detail" | "done">("lead");
  // 1걸음에서 만들어진 접수 건. 2걸음은 새 건을 만들지 않고 여기에 붙는다.
  const [customerId, setCustomerId] = useState<string>("");

  const [type, setType] = useState<IntakeType>("매물내놔요");
  const [name, setName] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [agreed, setAgreed] = useState(false);

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

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const cardRef = useRef<HTMLDivElement>(null);
  const isSeeking = type === "매물구해요";

  useEffect(() => {
    // 미리보기 URL 정리
    return () => previews.forEach((u) => URL.revokeObjectURL(u));
  }, [previews]);

  // 걸음이 바뀌면 카드 머리로 올려준다. 안 그러면 바뀐 화면의 중간이 보인다.
  useEffect(() => {
    if (step === "lead") return;
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

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

  /** 1걸음 — 연락처만 받고 곧바로 저장한다 */
  const handleLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) return setError("이름을 입력해 주세요.");
    if (!phoneInput.trim()) return setError("연락처를 입력해 주세요.");
    if (!agreed) return setError("개인정보 수집 · 이용에 동의해 주세요.");

    setSubmitting(true);
    try {
      const res = await submitPropertyIntake(subdomain, {
        type,
        name,
        phone: phoneInput,
        phase: "lead",
      });
      if (!res.success) {
        setError((res as any).message || "접수에 실패했습니다.");
        return;
      }
      setCustomerId((res as any).customerId || "");
      setStep("detail");
    } catch {
      setError("접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  /** 2걸음 — 물건 내용. 같은 번호라 1걸음에서 만든 고객 기록에 붙는다 */
  const handleDetail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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
      // moveInDate 는 날짜가 아니라 "1주 이내" 같은 문구라 date 컬럼으로 보내지 않는다.
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

      const nothingFilled = !composedArea && !composedBudget && !composedNotes && !photoUrls.length;
      if (nothingFilled) {
        // 아무것도 안 채우고 눌렀다. 이미 접수는 끝났으니 그냥 넘긴다.
        setStep("done");
        return;
      }

      const res = await submitPropertyIntake(subdomain, {
        type,
        name,
        phone: phoneInput,
        area: composedArea,
        budget: composedBudget,
        notes: composedNotes,
        photoUrls,
        phase: "detail",
        customerId,
      });

      if (!res.success) {
        setError((res as any).message || "추가 정보 저장에 실패했습니다. 접수는 이미 끝났으니 전화로 알려주셔도 됩니다.");
        return;
      }
      setStep("done");
    } catch {
      setError("저장 중 오류가 발생했습니다. 접수는 이미 끝났으니 전화로 알려주셔도 됩니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "14px 16px",
    fontSize: 16,
    border: "1px solid #d7dde3",
    borderRadius: 8,
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
  const cardStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: 4,
    padding: "30px 22px 34px",
    border: "1px solid #e8ecf0",
    boxShadow: "0 1px 3px rgba(16,24,40,.08)",
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

  const errorBox = error ? (
    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 14px" }}>
      {error}
    </p>
  ) : null;

  return (
    <section id="intake" style={{ background: "#fff", padding: "56px 0 64px", scrollMarginTop: 54 }}>
      <SectionTitle
        theme={theme}
        label="SUBMIT"
        title={step === "detail" ? "접수되었습니다" : "물건 접수"}
        desc={
          step === "detail"
            ? "조금만 더 알려주시면 더 빠르게 맞춰드릴 수 있습니다"
            : step === "done"
            ? undefined
            : "이름과 연락처만 남겨 주시면 됩니다"
        }
      />

      <div style={{ padding: "0 16px" }}>
        <div ref={cardRef} style={{ maxWidth: 560, margin: "0 auto", scrollMarginTop: 120 }}>
          {/* ── 끝 ── */}
          {step === "done" && (
            <div style={{ ...cardStyle, padding: "48px 26px", textAlign: "center" }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>✅</div>
              <h3 style={{ fontSize: 23, fontWeight: 900, color: theme.dark, margin: "0 0 12px 0" }}>접수되었습니다</h3>
              <p style={{ fontSize: 16, color: "#475569", lineHeight: 1.7, margin: "0 0 26px 0", wordBreak: "keep-all" }}>
                확인 후 {phone ? <strong>{phone}</strong> : "담당자"} 번호로 연락드리겠습니다.
              </p>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "18px 20px", textAlign: "left" }}>
                <p style={{ fontSize: 14.5, fontWeight: 800, color: theme.dark, margin: "0 0 6px 0" }}>사진을 못 올리셨나요?</p>
                <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7, margin: 0, wordBreak: "keep-all" }}>
                  괜찮습니다. 연락드릴 때 문자나 카카오톡으로 보내 주셔도 됩니다.
                </p>
              </div>
            </div>
          )}

          {/* ── 1걸음 · 연락처 ── */}
          {step === "lead" && (
            <form onSubmit={handleLead} style={cardStyle}>
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
                        borderRadius: 8,
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

                {errorBox}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: "100%",
                    padding: "17px",
                    background: submitting ? "#94a3b8" : theme.primary,
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 17,
                    fontWeight: 900,
                    cursor: submitting ? "default" : "pointer",
                    boxShadow: submitting ? "none" : `0 8px 20px ${theme.primary}44`,
                  }}
                >
                  {submitting ? "접수 중…" : "접 수 하 기"}
                </button>

                <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", textAlign: "center" }}>
                  물건 정보는 접수 후에 여쭤봅니다. 안 쓰셔도 됩니다.
                </p>
              </div>
            </form>
          )}

          {/* ── 2걸음 · 물건 내용 ── */}
          {step === "detail" && (
            <form onSubmit={handleDetail} style={cardStyle}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", background: `${theme.primary}0d`, border: `1px solid ${theme.primary}33`, borderRadius: 8, padding: "16px 18px", marginBottom: 24 }}>
                <span style={{ fontSize: 20, lineHeight: 1.2 }}>✅</span>
                <p style={{ margin: 0, fontSize: 14.5, color: "#334155", lineHeight: 1.7, wordBreak: "keep-all" }}>
                  <strong style={{ color: theme.dark }}>{name}</strong>님, 접수가 끝났습니다. 확인 후 연락드리겠습니다.
                  <br />
                  <strong>상세정보</strong>를 입력해 주시면, 더욱 빠르게 물건을 홍보할 수 있습니다.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
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
                      style={{ flexShrink: 0, padding: "0 18px", borderRadius: 8, border: "none", background: "#16202b", color: "#fff", fontSize: 14.5, fontWeight: 800, cursor: "pointer" }}
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
                          borderRadius: 8,
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
                      <div key={f.key} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #d7dde3", borderRadius: 8, padding: "8px 10px" }}>
                        <span style={{ fontSize: 14.5, fontWeight: 700, color: "#64748b" }}>{f.label}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <button
                            type="button"
                            aria-label={f.label + " 줄이기"}
                            onClick={() => f.set(String(Math.max(0, Number(f.value || 0) - 1)))}
                            style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid #d7dde3", background: "#fff", color: "#475569", fontSize: 17, fontWeight: 800, cursor: "pointer", lineHeight: 1 }}
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
                            style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid #d7dde3", background: "#fff", color: "#475569", fontSize: 17, fontWeight: 800, cursor: "pointer", lineHeight: 1 }}
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
                          borderRadius: 8,
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
                            <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 6, border: "1px solid #e2e8f0" }} />
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
                          borderRadius: 8,
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

                {errorBox}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: "100%",
                    padding: "17px",
                    background: submitting ? "#94a3b8" : theme.primary,
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 17,
                    fontWeight: 900,
                    cursor: submitting ? "default" : "pointer",
                    boxShadow: submitting ? "none" : `0 8px 20px ${theme.primary}44`,
                  }}
                >
                  {submitting ? "보내는 중…" : "등록완료"}
                </button>

                <button
                  type="button"
                  onClick={() => setStep("done")}
                  style={{ width: "100%", padding: "14px", background: "transparent", color: "#8b95a1", border: "none", fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}
                >
                  나중에 할게요
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
