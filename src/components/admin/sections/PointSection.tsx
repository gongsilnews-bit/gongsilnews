"use client";

import React, { useState, useEffect } from "react";
import { AdminSectionProps } from "./types";
import {
  getPointSettings,
  updatePointSetting,
  getAllMembersWithBalance,
  getPointTransactions,
  adminAdjustPoints,
} from "@/app/actions/point";
import { memberTier, TIER_NAME, PRO_ORANGE, type Tier } from "@/utils/tier";
import { groupPointTx } from "@/utils/pointGroup";

/** 등급 딱지 색 — 공실뉴스부동산(유료)은 주황 */
const TIER_STYLE: Record<Tier, { bg: string; fg: string }> = {
  admin: { bg: "#111827", fg: "#fff" },
  pro: { bg: "#fff1e0", fg: PRO_ORANGE },
  biz: { bg: "#ede9fe", fg: "#6d28d9" },
  free: { bg: "#dbeafe", fg: "#2563eb" },
  user: { bg: "#f3f4f6", fg: "#6b7280" },
};
const TIER_ORDER: Tier[] = ["pro", "free", "biz", "user", "admin"];

interface PointSectionProps extends AdminSectionProps {
  activeSubmenu?: string;
  onSubmenuChange?: (s: string) => void;
}

const SETTING_LABELS: Record<string, { label: string; unit: string; desc: string }> = {
  SIGNUP_BONUS: { label: "가입 축하 포인트", unit: "P", desc: "신규 회원가입 시 자동 지급" },
  VACANCY_REWARD: { label: "공실 등록 보상", unit: "P", desc: "공실 등록 시 자동 지급" },
  COMMISSION_RATE: { label: "콘텐츠 판매 수수료", unit: "%", desc: "자료실/특강 판매 시 플랫폼 수수료" },
  TRANSFER_FEE_RATE: { label: "P2P 전송 수수료", unit: "%", desc: "회원 간 포인트 전송 수수료" },
  TRANSFER_MAX_ONCE: { label: "1회 최대 전송 한도", unit: "P", desc: "1회에 전송 가능한 최대 포인트" },
  TRANSFER_MAX_DAILY: { label: "1일 최대 전송 한도", unit: "P", desc: "하루 동안 전송 가능한 최대 포인트" },
  CHARGE_RATIO: { label: "결제 포인트 비율", unit: "P/원", desc: "1원당 지급되는 포인트" },
};

export default function PointSection({ theme, activeSubmenu = "members", onSubmenuChange }: PointSectionProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;
  // 회원관리와 같이 쓰는 하위 메뉴 값("members_list" 등)이 넘어오면 첫 탭으로 (2026-11-03: 포인트 화면이 비어 보이던 것)
  const [tab, setTab] = useState(["members", "transactions", "settings"].includes(activeSubmenu) ? activeSubmenu : "members");

  // ── 정책 설정 ──
  const [settings, setSettings] = useState<Record<string, number>>({});
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // ── 회원 현황 ──
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [adjustModal, setAdjustModal] = useState<{ id: string; name: string } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  // ── 거래 내역 ──
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txFilter, setTxFilter] = useState<"ALL" | "EARN" | "SPEND">("ALL");

  // ── 회원별 검색 (2026-11-06 사장님: "회원별 검색이 가능해야 함") — 이름이 같은 회원이 있어 이메일로도 찾는다 ──
  const [memberQ, setMemberQ] = useState("");
  const [txQ, setTxQ] = useState("");
  const [openTx, setOpenTx] = useState<string | null>(null); // 펼친 목소리 묶음
  const [txMember, setTxMember] = useState<{ id: string; name: string; email: string; tier: Tier } | null>(null);
  const hit = (m: any, q: string) => {
    const k = q.trim().toLowerCase();
    return !k || String(m.name || "").toLowerCase().includes(k) || String(m.email || "").toLowerCase().includes(k);
  };
  // 등급 분류 (2026-11-06 사장님: "부동산회원인지 공실뉴스부동산인지 분류") — 판정은 utils/tier.ts 한 곳
  const [tierF, setTierF] = useState<Tier | "all">("all");
  const tierCount = (t: Tier) => members.filter((m) => memberTier(m) === t).length;
  const shownMembers = members.filter((m) => hit(m, memberQ) && (tierF === "all" || memberTier(m) === tierF));
  const txPicks = txQ.trim() ? members.filter((m) => hit(m, txQ)).slice(0, 8) : [];
  /** 한 회원의 거래 내역 전부 (100건 제한 없이) */
  async function openMemberTx(m: { id: string; name?: string; email?: string }) {
    setTxMember({ id: m.id, name: m.name || "", email: m.email || "", tier: memberTier(members.find((x) => x.id === m.id)) });
    setTxQ("");
    setTab("transactions");
    onSubmenuChange?.("transactions");
    setTxLoading(true);
    const res = await getPointTransactions({ memberId: m.id });
    if (res.success) setTransactions(res.data);
    setTxLoading(false);
  }
  function clearMemberTx() {
    setTxMember(null);
    loadTransactions();
  }

  useEffect(() => {
    loadSettings();
    loadMembers();
    loadTransactions();
  }, []);

  async function loadSettings() {
    setSettingsLoading(true);
    const res = await getPointSettings();
    if (res.success) setSettings(res.data);
    setSettingsLoading(false);
  }

  async function loadMembers() {
    setMembersLoading(true);
    const res = await getAllMembersWithBalance();
    if (res.success) setMembers(res.data);
    setMembersLoading(false);
  }

  async function loadTransactions() {
    setTxLoading(true);
    const res = await getPointTransactions({ limit: 300 }); // 목소리 묶음을 1줄로 합치므로 넉넉히
    if (res.success) setTransactions(res.data);
    setTxLoading(false);
  }

  async function handleSaveSetting(key: string) {
    setSavingKey(key);
    await updatePointSetting(key, settings[key]);
    setSavingKey(null);
  }

  async function handleAdjust() {
    if (!adjustModal || !adjustAmount) return;
    const amt = parseInt(adjustAmount);
    if (isNaN(amt) || amt === 0) { alert("유효한 금액을 입력하세요."); return; }
    const res = await adminAdjustPoints(adjustModal.id, amt, adjustReason || (amt > 0 ? "관리자지급" : "관리자차감"));
    if (res.success) {
      alert(`${adjustModal.name}님에게 ${amt > 0 ? "+" : ""}${amt.toLocaleString()}P ${amt > 0 ? "지급" : "차감"} 완료`);
      setAdjustModal(null);
      setAdjustAmount("");
      setAdjustReason("");
      loadMembers();
      if (txMember) openMemberTx(txMember); else loadTransactions();
    } else {
      alert("실패: " + res.error);
    }
  }

  const tabs = [
    { key: "members", label: "회원 현황" },
    { key: "transactions", label: "거래 내역" },
    { key: "settings", label: "정책 설정" },
  ];

  const inputStyle: React.CSSProperties = {
    padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 8,
    fontSize: 14, color: textPrimary, background: darkMode ? "#1a1b1e" : "#fff",
    outline: "none", boxSizing: "border-box",
  };

  const reasonMap: Record<string, string> = {
    "가입축하": "가입축하", "공실등록보상": "공실등록보상", "자료열람": "자료열람",
    "특강구매": "특강구매", "콘텐츠수익": "콘텐츠수익", "P2P전송": "P2P전송",
    "P2P수신": "P2P수신", "관리자지급": "관리자지급", "관리자차감": "관리자차감",
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0, marginBottom: 20 }}><svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0, verticalAlign: "-2px", marginRight: 4 }}><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15 9.5c-.5-1-1.7-1.5-3-1.5-1.7 0-3 .9-3 2s1.3 1.7 3 2 3 .9 3 2-1.3 2-3 2c-1.3 0-2.5-.5-3-1.5M12 6v2M12 16v2" /></svg>포인트 관리</h1>

      {/* 탭 */}
      <div style={{ display: "flex", borderBottom: `1px solid ${border}`, marginBottom: 20, gap: 24 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); onSubmenuChange?.(t.key); }}
            style={{ padding: "0 4px 12px", background: "none", border: "none", borderBottom: tab === t.key ? "3px solid #3b82f6" : "3px solid transparent", color: tab === t.key ? "#3b82f6" : textSecondary, fontSize: 16, fontWeight: tab === t.key ? 800 : 600, cursor: "pointer", transition: "all 0.2s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════ 정책 설정 ═══════ */}
      {tab === "settings" && (
        <div style={{ background: cardBg, borderRadius: 14, padding: 28, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          {settingsLoading ? (
            <div style={{ textAlign: "center", padding: 40, color: textSecondary }}>로딩 중...</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {Object.entries(SETTING_LABELS).map(([key, meta]) => (
                <div key={key} style={{ padding: 20, border: `1px solid ${border}`, borderRadius: 12, background: darkMode ? "#1a1b1e" : "#fafbfc" }}>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: textPrimary, marginBottom: 4 }}>{meta.label}</label>
                  <p style={{ fontSize: 12, color: textSecondary, marginBottom: 12 }}>{meta.desc}</p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="number" value={settings[key] ?? ""} onChange={e => setSettings(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                      style={{ ...inputStyle, flex: 1 }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: textSecondary, whiteSpace: "nowrap" }}>{meta.unit}</span>
                    <button onClick={() => handleSaveSetting(key)} disabled={savingKey === key}
                      style={{ padding: "10px 18px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                      {savingKey === key ? "저장중..." : "저장"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════ 회원 현황 ═══════ */}
      {tab === "members" && (
        <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
          {/* 요약 카드 */}
          <div style={{ display: "flex", gap: 16, padding: "20px 24px", borderBottom: `1px solid ${border}` }}>
            {[
              { label: "전체 회원", value: members.length, color: "#3b82f6" },
              { label: "총 유통 포인트", value: members.reduce((s, m) => s + (m.point_balance || 0), 0).toLocaleString() + " P", color: "#10b981" },
              { label: "최대 보유자", value: members[0]?.name || "-", color: "#f59e0b" },
            ].map((c, i) => (
              <div key={i} style={{ flex: 1, padding: 16, background: darkMode ? "#1a1b1e" : "#f8fafc", borderRadius: 10, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: textSecondary, marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* 회원 검색 */}
          <div style={{ padding: "14px 24px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", gap: 10 }}>
            <input value={memberQ} onChange={(e) => setMemberQ(e.target.value)} placeholder="회원 이름 또는 이메일로 찾기"
              style={{ ...inputStyle, width: 320 }} />
            {memberQ && <button onClick={() => setMemberQ("")} style={{ padding: "8px 12px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, fontSize: 13, color: textSecondary, cursor: "pointer" }}>지우기</button>}
            <span style={{ fontSize: 13, color: textSecondary }}>{memberQ || tierF !== "all" ? `${shownMembers.length}명` : ""}</span>
            <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexWrap: "wrap" }}>
              {(["all", ...TIER_ORDER] as const).map((t) => {
                const on = tierF === t;
                return (
                  <button key={t} onClick={() => setTierF(t)}
                    style={{ padding: "6px 14px", border: `1px solid ${on ? "#3b82f6" : border}`, borderRadius: 20, background: on ? "#3b82f6" : "transparent", color: on ? "#fff" : textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    {t === "all" ? `전체 ${members.length}` : `${TIER_NAME[t]} ${tierCount(t)}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 테이블 */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, whiteSpace: "nowrap" }}>
              <thead>
                <tr style={{ background: darkMode ? "#2c2d31" : "#f9fafb" }}>
                  {["이름", "이메일", "구분", "포인트 잔액", "가입일", "관리"].map((h, i) => (
                    <th key={i} style={{ padding: "12px 14px", textAlign: i === 3 ? "right" : "left", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!membersLoading && shownMembers.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: "40px 0", textAlign: "center", color: textSecondary }}>찾는 회원이 없습니다.</td></tr>
                )}
                {shownMembers.map(m => (
                  <tr key={m.id} style={{ borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}` }}
                    onMouseEnter={e => { e.currentTarget.style.background = darkMode ? "#3a3b3f" : "#f1f3f5"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                    <td style={{ padding: "14px", fontWeight: 600, color: textPrimary }}>{m.name || "-"}</td>
                    <td style={{ padding: "14px", color: textSecondary }}>{m.email}</td>
                    <td style={{ padding: "14px" }}>
                      {(() => { const t = memberTier(m); return (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: TIER_STYLE[t].bg, color: TIER_STYLE[t].fg }}>
                          {TIER_NAME[t]}
                        </span>
                      ); })()}
                    </td>
                    <td style={{ padding: "14px", textAlign: "right", fontWeight: 800, fontSize: 15, color: (m.point_balance || 0) > 0 ? "#10b981" : textPrimary }}>{(m.point_balance || 0).toLocaleString()} P</td>
                    <td style={{ padding: "14px", color: textSecondary }}>{m.created_at ? new Date(m.created_at).toISOString().split("T")[0] : "-"}</td>
                    <td style={{ padding: "14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => openMemberTx(m)}
                          style={{ padding: "6px 12px", background: "transparent", color: "#3b82f6", border: "1px solid #3b82f6", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>내역</button>
                        <button onClick={() => { setAdjustModal({ id: m.id, name: m.name || m.email }); setAdjustAmount(""); }}
                          style={{ padding: "6px 12px", background: "#10b981", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}><svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0, verticalAlign: "-2px", marginRight: 4 }}><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 8v8M8 12h8" /></svg>지급</button>
                        <button onClick={() => { setAdjustModal({ id: m.id, name: m.name || m.email }); setAdjustAmount("-"); }}
                          style={{ padding: "6px 12px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}><svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0, verticalAlign: "-2px", marginRight: 4 }}><path d="M5 12h14" /></svg>차감</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════ 거래 내역 ═══════ */}
      {tab === "transactions" && (
        <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", borderBottom: `1px solid ${border}`, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {(["ALL", "EARN", "SPEND"] as const).map(f => (
              <button key={f} onClick={() => setTxFilter(f)}
                style={{ padding: "6px 16px", border: `1px solid ${txFilter === f ? "#3b82f6" : border}`, borderRadius: 20, background: txFilter === f ? "#3b82f6" : "transparent", color: txFilter === f ? "#fff" : textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {f === "ALL" ? "전체" : f === "EARN" ? "적립" : "사용"}
              </button>
            ))}
            {/* 회원 고르기 — 고르면 그 회원 내역 전부 */}
            <div style={{ position: "relative", marginLeft: 12 }}>
              {txMember ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 8px 6px 14px", borderRadius: 20, background: darkMode ? "#1e3a5f" : "#dbeafe", color: "#2563eb", fontSize: 13, fontWeight: 700 }}>
                  {txMember.name || "-"} <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: TIER_STYLE[txMember.tier].bg, color: TIER_STYLE[txMember.tier].fg }}>{TIER_NAME[txMember.tier]}</span> <span style={{ fontWeight: 500 }}>{txMember.email}</span>
                  <button onClick={clearMemberTx} title="전체 회원 내역으로" style={{ border: "none", background: "transparent", color: "#2563eb", fontSize: 15, cursor: "pointer", padding: "0 4px" }}>×</button>
                </span>
              ) : (
                <>
                  <input value={txQ} onChange={(e) => setTxQ(e.target.value)} placeholder="회원 이름 또는 이메일로 찾기"
                    style={{ ...inputStyle, width: 300, padding: "7px 12px", fontSize: 13 }} />
                  {txPicks.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, width: 360, background: cardBg, border: `1px solid ${border}`, borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 10, overflow: "hidden" }}>
                      {txPicks.map((m) => (
                        <button key={m.id} onClick={() => openMemberTx(m)}
                          style={{ display: "flex", width: "100%", justifyContent: "space-between", gap: 10, padding: "10px 14px", border: "none", borderBottom: `1px solid ${border}`, background: "transparent", cursor: "pointer", fontSize: 13, color: textPrimary, textAlign: "left" }}>
                          <span><b>{m.name || "-"}</b> <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: TIER_STYLE[memberTier(m)].bg, color: TIER_STYLE[memberTier(m)].fg }}>{TIER_NAME[memberTier(m)]}</span> <span style={{ color: textSecondary }}>{m.email}</span></span>
                          <span style={{ color: "#10b981", fontWeight: 700 }}>{(m.point_balance || 0).toLocaleString()} P</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <span style={{ fontSize: 12, color: textSecondary, marginLeft: "auto" }}>{txMember ? "이 회원 내역 전부" : "최근 300건"}</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, whiteSpace: "nowrap" }}>
              <thead>
                <tr style={{ background: darkMode ? "#2c2d31" : "#f9fafb" }}>
                  {["일시", "회원", "유형", "금액", "사유", "상대", "잔액"].map((h, i) => (
                    <th key={i} style={{ padding: "12px 14px", textAlign: [3, 6].includes(i) ? "right" : "left", fontWeight: 700, color: textSecondary, borderBottom: `2px solid ${darkMode ? "#555" : "#e5e7eb"}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupPointTx(transactions
                  .filter(t => txFilter === "ALL" || t.type === txFilter))
                  .map(t => (
                  <React.Fragment key={t.id}>
                  <tr onClick={t.items.length > 1 ? () => setOpenTx(openTx === t.id ? null : t.id) : undefined}
                    style={{ borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}`, cursor: t.items.length > 1 ? "pointer" : "default" }}>
                    <td style={{ padding: "12px 14px", color: textSecondary, fontSize: 12 }}>{new Date(t.created_at).toLocaleString("ko-KR")}</td>
                    <td style={{ padding: "12px 14px", fontWeight: 600, color: textPrimary }}>{t.member?.name || "-"}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: t.type === "EARN" ? "#d1fae5" : "#fee2e2", color: t.type === "EARN" ? "#065f46" : "#b91c1c" }}>
                        {t.type === "EARN" ? "적립" : "사용"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 800, color: t.type === "EARN" ? "#10b981" : "#ef4444" }}>
                      {t.type === "EARN" ? "+" : "-"}{t.amount.toLocaleString()} P
                    </td>
                    <td style={{ padding: "12px 14px", color: textPrimary }}>
                      {reasonMap[t.reason] || t.reason}
                      {t.items.length > 1 && <span style={{ fontSize: 12, color: textSecondary, marginLeft: 8 }}>{openTx === t.id ? "▲ 접기" : "▼ 문장별"}</span>}
                    </td>
                    <td style={{ padding: "12px 14px", color: textSecondary }}>{t.counterpart?.name || "-"}</td>
                    <td style={{ padding: "12px 14px", textAlign: "right", color: textSecondary }}>{t.balance_after.toLocaleString()} P</td>
                  </tr>
                  {openTx === t.id && t.items.length > 1 && [...t.items].sort((a, b) => b.balance_after - a.balance_after).map((x, i) => (
                    <tr key={x.id} style={{ background: darkMode ? "#1a1b1e" : "#f9fafb", borderBottom: `1px solid ${darkMode ? "#333" : "#f3f4f6"}` }}>
                      <td style={{ padding: "8px 14px", color: textSecondary, fontSize: 12 }}>{new Date(x.created_at).toLocaleTimeString("ko-KR")}</td>
                      <td colSpan={2} />
                      <td style={{ padding: "8px 14px", textAlign: "right", color: "#ef4444", fontSize: 12, fontWeight: 700 }}>-{x.amount.toLocaleString()} P</td>
                      <td style={{ padding: "8px 14px", color: textSecondary, fontSize: 12 }}>{i + 1}. {x.reason}</td>
                      <td />
                      <td style={{ padding: "8px 14px", textAlign: "right", color: textSecondary, fontSize: 12 }}>{x.balance_after.toLocaleString()} P</td>
                    </tr>
                  ))}
                  </React.Fragment>
                ))}
                {transactions.filter(t => txFilter === "ALL" || t.type === txFilter).length === 0 && (
                  <tr><td colSpan={7} style={{ padding: "40px 0", textAlign: "center", color: textSecondary }}>거래 내역이 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════ 수동 지급/차감 모달 ═══════ */}
      {adjustModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setAdjustModal(null)}>
          <div style={{ background: cardBg, borderRadius: 16, padding: 32, width: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: textPrimary, marginBottom: 20 }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0, verticalAlign: "-2px", marginRight: 4 }}><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15 9.5c-.5-1-1.7-1.5-3-1.5-1.7 0-3 .9-3 2s1.3 1.7 3 2 3 .9 3 2-1.3 2-3 2c-1.3 0-2.5-.5-3-1.5M12 6v2M12 16v2" /></svg>포인트 {adjustAmount.startsWith("-") ? "차감" : "지급"} — {adjustModal.name}
            </h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>금액 (P)</label>
              <input type="number" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} placeholder="예: 1000 또는 -500"
                style={{ ...inputStyle, width: "100%" }} autoFocus />
              <p style={{ fontSize: 11, color: textSecondary, marginTop: 4 }}>양수 = 지급, 음수 = 차감</p>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>사유</label>
              <input type="text" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="예: 이벤트 보상, 오류 정정"
                style={{ ...inputStyle, width: "100%" }} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setAdjustModal(null)} style={{ padding: "10px 20px", background: darkMode ? "#374151" : "#f3f4f6", color: textPrimary, border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>취소</button>
              <button onClick={handleAdjust} style={{ padding: "10px 20px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
