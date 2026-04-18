"use client";

import React, { useState, useEffect } from "react";
import { AdminSectionProps } from "./types";
import {
  getPointBalance,
  getPointTransactions,
  transferPoints,
  searchMembersForTransfer,
  getPointSettings,
} from "@/app/actions/point";

interface MyPointSectionProps extends AdminSectionProps {
  memberId: string;
  role?: string;
}

export default function MyPointSection({ theme, memberId, role }: MyPointSectionProps) {
  const { bg, cardBg, textPrimary, textSecondary, darkMode, border } = theme;

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [txFilter, setTxFilter] = useState<"ALL" | "EARN" | "SPEND">("ALL");

  // 전송 모달
  const [showTransfer, setShowTransfer] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedReceiver, setSelectedReceiver] = useState<any>(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [feeRate, setFeeRate] = useState(0);
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    loadData();
  }, [memberId]);

  async function loadData() {
    setLoading(true);
    const [balRes, txRes, settingsRes] = await Promise.all([
      getPointBalance(memberId),
      getPointTransactions({ memberId, limit: 50 }),
      getPointSettings(),
    ]);
    if (balRes.success) setBalance(balRes.balance);
    if (txRes.success) setTransactions(txRes.data);
    if (settingsRes.success) setFeeRate(settingsRes.data.TRANSFER_FEE_RATE || 0);
    setLoading(false);
  }

  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const res = await searchMembersForTransfer(q, memberId);
    if (res.success) setSearchResults(res.data);
  }

  async function handleTransfer() {
    if (!selectedReceiver || !transferAmount) return;
    const amt = parseInt(transferAmount);
    if (isNaN(amt) || amt <= 0) { alert("유효한 금액을 입력하세요."); return; }
    setTransferring(true);
    const res = await transferPoints(memberId, selectedReceiver.id, amt);
    setTransferring(false);
    if (res.success) {
      alert(`${selectedReceiver.name}님에게 ${amt.toLocaleString()}P 전송 완료! (수수료: ${res.fee?.toLocaleString() || 0}P)`);
      setShowTransfer(false);
      setSelectedReceiver(null);
      setTransferAmount("");
      setSearchQuery("");
      loadData();
    } else {
      alert("전송 실패: " + res.error);
    }
  }

  const fee = Math.floor((parseInt(transferAmount) || 0) * feeRate / 100);
  const totalDeduct = (parseInt(transferAmount) || 0) + fee;

  const reasonMap: Record<string, string> = {
    "가입축하": "🎁 가입축하", "공실등록보상": "🏠 공실등록보상", "자료열람": "📂 자료열람",
    "특강구매": "🎓 특강구매", "콘텐츠수익": "💰 수익", "P2P전송": "📤 전송",
    "P2P수신": "📥 수신", "관리자지급": "💚 관리자지급", "관리자차감": "🔴 관리자차감",
  };

  const inputStyle: React.CSSProperties = {
    padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 8,
    fontSize: 14, color: textPrimary, background: darkMode ? "#1a1b1e" : "#fff",
    outline: "none", boxSizing: "border-box",
  };

  if (loading) {
    return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: bg }}><span style={{ color: textSecondary }}>포인트 정보 로딩 중...</span></div>;
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", background: bg }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0, marginBottom: 20 }}>💰 내 포인트</h1>

      {/* 잔액 카드 */}
      <div style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", borderRadius: 16, padding: "32px 36px", marginBottom: 24, color: "#fff", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -20, top: -20, fontSize: 120, opacity: 0.1 }}>💰</div>
        <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.85, marginBottom: 6 }}>현재 잔액</div>
        <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 16 }}>{balance.toLocaleString()} <span style={{ fontSize: 20 }}>P</span></div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setShowTransfer(true)}
            style={{ padding: "10px 24px", background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(4px)" }}>
            🔄 포인트 전송
          </button>
        </div>
      </div>

      {/* 거래 내역 */}
      <div style={{ background: cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: textPrimary }}>거래 내역</span>
          <div style={{ display: "flex", gap: 6 }}>
            {(["ALL", "EARN", "SPEND"] as const).map(f => (
              <button key={f} onClick={() => setTxFilter(f)}
                style={{ padding: "4px 14px", border: `1px solid ${txFilter === f ? "#3b82f6" : border}`, borderRadius: 20, background: txFilter === f ? "#3b82f6" : "transparent", color: txFilter === f ? "#fff" : textSecondary, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {f === "ALL" ? "전체" : f === "EARN" ? "적립" : "사용"}
              </button>
            ))}
          </div>
        </div>

        <div>
          {transactions
            .filter(t => txFilter === "ALL" || t.type === txFilter)
            .map(t => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", padding: "16px 24px", borderBottom: `1px solid ${darkMode ? "#2c2d31" : "#f3f4f6"}`, gap: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: t.type === "EARN" ? "#d1fae5" : "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                {t.type === "EARN" ? "✅" : "💸"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>{reasonMap[t.reason] || t.reason}</div>
                <div style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
                  {new Date(t.created_at).toLocaleString("ko-KR")}
                  {t.counterpart?.name && <span> · {t.type === "EARN" ? "← " : "→ "}{t.counterpart.name}</span>}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: t.type === "EARN" ? "#10b981" : "#ef4444" }}>
                  {t.type === "EARN" ? "+" : "-"}{t.amount.toLocaleString()} P
                </div>
                <div style={{ fontSize: 11, color: textSecondary }}>잔액 {t.balance_after.toLocaleString()} P</div>
              </div>
            </div>
          ))}
          {transactions.filter(t => txFilter === "ALL" || t.type === txFilter).length === 0 && (
            <div style={{ padding: "40px 0", textAlign: "center", color: textSecondary, fontSize: 14 }}>거래 내역이 없습니다.</div>
          )}
        </div>
      </div>

      {/* ═══════ P2P 전송 모달 ═══════ */}
      {showTransfer && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowTransfer(false)}>
          <div style={{ background: cardBg, borderRadius: 16, padding: 32, width: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: textPrimary, marginBottom: 20 }}>🔄 포인트 전송</h3>

            {/* 받는 사람 검색 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>받는 사람</label>
              {selectedReceiver ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, border: `1px solid ${border}`, borderRadius: 8, background: darkMode ? "#1a1b1e" : "#f8fafc" }}>
                  <span style={{ fontWeight: 700, color: textPrimary }}>{selectedReceiver.name}</span>
                  <span style={{ fontSize: 12, color: textSecondary }}>{selectedReceiver.email}</span>
                  <button onClick={() => { setSelectedReceiver(null); setSearchQuery(""); }}
                    style={{ marginLeft: "auto", background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>✕</button>
                </div>
              ) : (
                <div style={{ position: "relative" }}>
                  <input type="text" value={searchQuery} onChange={e => handleSearch(e.target.value)} placeholder="이름 또는 이메일 검색"
                    style={{ ...inputStyle, width: "100%" }} autoFocus />
                  {searchResults.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: cardBg, border: `1px solid ${border}`, borderRadius: "0 0 8px 8px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 10, maxHeight: 200, overflowY: "auto" }}>
                      {searchResults.map(r => (
                        <button key={r.id} onClick={() => { setSelectedReceiver(r); setSearchResults([]); }}
                          style={{ display: "block", width: "100%", padding: "10px 14px", background: "none", border: "none", borderBottom: `1px solid ${border}`, textAlign: "left", cursor: "pointer", fontSize: 13, color: textPrimary, fontFamily: "inherit" }}
                          onMouseEnter={e => { e.currentTarget.style.background = darkMode ? "#2c2d31" : "#f3f4f6"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "none"; }}>
                          <span style={{ fontWeight: 700 }}>{r.name || "-"}</span>
                          <span style={{ marginLeft: 8, color: textSecondary, fontSize: 12 }}>{r.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 금액 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: textPrimary, display: "block", marginBottom: 6 }}>전송 금액</label>
              <input type="number" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} placeholder="예: 500"
                style={{ ...inputStyle, width: "100%" }} />
            </div>

            {/* 수수료 안내 */}
            {parseInt(transferAmount) > 0 && (
              <div style={{ padding: 16, background: darkMode ? "#1a1b1e" : "#fffbeb", border: `1px solid ${darkMode ? "#444" : "#fde68a"}`, borderRadius: 10, marginBottom: 20, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: textSecondary }}>전송 금액</span><span style={{ fontWeight: 700, color: textPrimary }}>{(parseInt(transferAmount) || 0).toLocaleString()} P</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: textSecondary }}>수수료 ({feeRate}%)</span><span style={{ fontWeight: 700, color: "#f59e0b" }}>{fee.toLocaleString()} P</span>
                </div>
                <div style={{ borderTop: `1px solid ${border}`, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, color: textPrimary }}>총 차감액</span><span style={{ fontWeight: 900, color: "#ef4444", fontSize: 16 }}>{totalDeduct.toLocaleString()} P</span>
                </div>
                <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: textSecondary }}>전송 후 내 잔액</span><span style={{ fontWeight: 700, color: textPrimary }}>{Math.max(0, balance - totalDeduct).toLocaleString()} P</span>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowTransfer(false)} style={{ padding: "10px 20px", background: darkMode ? "#374151" : "#f3f4f6", color: textPrimary, border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>취소</button>
              <button onClick={handleTransfer} disabled={!selectedReceiver || !transferAmount || transferring}
                style={{ padding: "10px 20px", background: !selectedReceiver || !transferAmount ? "#9ca3af" : "#3b82f6", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: transferring ? 0.7 : 1 }}>
                {transferring ? "전송 중..." : "전송하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
