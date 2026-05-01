"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getPointBalance, getPointTransactions, transferPoints, searchMembersForTransfer } from "@/app/actions/point";

function MobilePointAdmin() {
  const router = useRouter();
  const [memberId, setMemberId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [filter, setFilter] = useState<"전체" | "적립" | "사용">("전체");

  /* 전송 모달 */
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedReceiver, setSelectedReceiver] = useState<any>(null);
  const [transferring, setTransferring] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/m"); return; }
      const { data: m } = await supabase.from("members").select("id, name, email").eq("id", user.id).single();
      if (m) { setMemberId(m.id); setUserName(m.name || "회원"); }
      setAuthChecked(true);
    })();
  }, []);

  useEffect(() => {
    if (!memberId) return;
    (async () => {
      setLoading(true);
      const [balRes, txRes] = await Promise.all([
        getPointBalance(memberId),
        getPointTransactions({ memberId, limit: 100 }),
      ]);
      if (balRes.success) setBalance(balRes.balance);
      if (txRes.success) setTransactions(txRes.data);
      setLoading(false);
    })();
  }, [memberId]);

  const filtered = transactions.filter(t => {
    if (filter === "적립" && t.type !== "EARN") return false;
    if (filter === "사용" && t.type !== "SPEND") return false;
    return true;
  });

  const handleSearch = async () => {
    if (!searchQuery.trim() || !memberId) return;
    setSearching(true);
    const res = await searchMembersForTransfer(searchQuery.trim(), memberId);
    if (res.success) setSearchResults(res.data);
    setSearching(false);
  };

  const handleTransfer = async () => {
    if (!selectedReceiver || !transferAmount || !memberId) return;
    const amt = parseInt(transferAmount, 10);
    if (isNaN(amt) || amt <= 0) { alert("유효한 금액을 입력해주세요."); return; }
    if (amt > balance) { alert("잔액이 부족합니다."); return; }
    if (!confirm(`${selectedReceiver.name}님에게 ${amt.toLocaleString()}P를 전송하시겠습니까?`)) return;

    setTransferring(true);
    const res = await transferPoints(memberId, selectedReceiver.id, amt);
    if (res.success) {
      alert(`전송 완료! 수수료: ${res.fee}P`);
      setShowTransfer(false);
      setTransferAmount("");
      setSelectedReceiver(null);
      setSearchResults([]);
      setSearchQuery("");
      // 새로고침
      const [balRes, txRes] = await Promise.all([
        getPointBalance(memberId),
        getPointTransactions({ memberId, limit: 100 }),
      ]);
      if (balRes.success) setBalance(balRes.balance);
      if (txRes.success) setTransactions(txRes.data);
    } else {
      alert("전송 실패: " + res.error);
    }
    setTransferring(false);
  };

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
  };

  const getReasonIcon = (reason: string) => {
    if (reason?.includes("전송") || reason?.includes("P2P")) return "💸";
    if (reason?.includes("수신")) return "💰";
    if (reason?.includes("관리자")) return "🔧";
    if (reason?.includes("가입")) return "🎉";
    if (reason?.includes("로그인") || reason?.includes("출석")) return "📅";
    if (reason?.includes("기사")) return "📰";
    return "💎";
  };

  if (!authChecked) {
    return (
      <div style={{ display: "flex", height: "100dvh", alignItems: "center", justifyContent: "center", background: "#f4f5f7" }}>
        <div style={{ textAlign: "center", color: "#9ca3af" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>💰</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>포인트 정보를 불러오는 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#f4f5f7", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* 상단 헤더 */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>내 포인트</h1>
      </div>

      {/* 잔액 카드 */}
      <div style={{
        margin: "16px 16px 0",
        borderRadius: 16,
        padding: "28px 24px",
        background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 40%, #818cf8 100%)",
        color: "#fff",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 8px 24px rgba(99,102,241,0.3)",
      }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, marginBottom: 8 }}>현재 잔액</div>
        <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-1px", marginBottom: 4 }}>
          {loading ? "---" : balance.toLocaleString()} <span style={{ fontSize: 20, fontWeight: 700 }}>P</span>
        </div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>{userName}님의 포인트</div>
        <button
          onClick={() => setShowTransfer(true)}
          style={{
            marginTop: 16,
            padding: "10px 20px",
            background: "rgba(255,255,255,0.2)",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 10,
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          💸 포인트 전송
        </button>
      </div>

      {/* 필터 탭 */}
      <div style={{ margin: "16px 16px 0", background: "#fff", borderRadius: 12, padding: 4, display: "flex", gap: 4, border: "1px solid #e5e7eb" }}>
        {(["전체", "적립", "사용"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
              background: filter === f ? "#111" : "transparent",
              color: filter === f ? "#fff" : "#6b7280",
              fontSize: 14, fontWeight: filter === f ? 700 : 500, cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* 거래 내역 리스트 */}
      <div style={{ padding: "12px 16px 100px" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#111", marginBottom: 12 }}>거래 내역</div>
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>거래 내역이 없습니다</div>
          </div>
        ) : (
          filtered.map((tx, i) => {
            const isEarn = tx.type === "EARN";
            const counterpartName = tx.counterpart?.name;
            return (
              <div key={tx.id || i} style={{
                background: "#fff", borderRadius: 12, padding: "14px 16px", marginBottom: 8,
                border: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: isEarn ? "#ecfdf5" : "#fef2f2",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, flexShrink: 0,
                }}>
                  {isEarn ? "⬆️" : "⬇️"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
                    {getReasonIcon(tx.reason)} {tx.reason || (isEarn ? "적립" : "사용")}
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    {formatDate(tx.created_at)}
                    {counterpartName && <span> → {counterpartName}</span>}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: isEarn ? "#059669" : "#dc2626" }}>
                    {isEarn ? "+" : "-"}{tx.amount?.toLocaleString()}P
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>잔액 {tx.balance_after?.toLocaleString()}P</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 전송 모달 */}
      {showTransfer && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "flex-end" }}>
          <div style={{
            width: "100%", background: "#fff", borderRadius: "20px 20px 0 0",
            padding: "24px 20px 32px", maxHeight: "85dvh", overflowY: "auto",
            animation: "slideUp 0.3s ease",
          }}>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: 0 }}>💸 포인트 전송</h2>
              <button onClick={() => { setShowTransfer(false); setSelectedReceiver(null); setSearchResults([]); setSearchQuery(""); setTransferAmount(""); }}
                style={{ background: "none", border: "none", fontSize: 24, color: "#9ca3af", cursor: "pointer" }}>✕</button>
            </div>

            {/* 현재 잔액 */}
            <div style={{ background: "#f8f9fa", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>보유 포인트</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#7c3aed" }}>{balance.toLocaleString()}P</span>
            </div>

            {/* 받는 사람 검색 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>받는 사람</label>
              {selectedReceiver ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#eff6ff", padding: "10px 14px", borderRadius: 10, border: "1px solid #bfdbfe" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>{selectedReceiver.name}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{selectedReceiver.email}</div>
                  </div>
                  <button onClick={() => setSelectedReceiver(null)} style={{ background: "none", border: "none", fontSize: 18, color: "#9ca3af", cursor: "pointer" }}>✕</button>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleSearch(); }}
                      placeholder="이름 또는 이메일 검색"
                      style={{ flex: 1, height: 44, padding: "0 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14, outline: "none" }}
                    />
                    <button onClick={handleSearch} disabled={searching}
                      style={{ height: 44, padding: "0 16px", background: "#374151", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                      {searching ? "..." : "검색"}
                    </button>
                  </div>
                  {searchResults.length > 0 && (
                    <div style={{ marginTop: 8, border: "1px solid #e5e7eb", borderRadius: 10, maxHeight: 200, overflowY: "auto" }}>
                      {searchResults.map(m => (
                        <button key={m.id} onClick={() => { setSelectedReceiver(m); setSearchResults([]); }}
                          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "none", border: "none", borderBottom: "1px solid #f3f4f6", cursor: "pointer", textAlign: "left" }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#6b7280", flexShrink: 0 }}>
                            {(m.name || "?")[0]}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{m.name}</div>
                            <div style={{ fontSize: 11, color: "#9ca3af" }}>{m.email}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 전송 금액 */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>전송 금액</label>
              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={e => setTransferAmount(e.target.value)}
                  placeholder="0"
                  style={{ width: "100%", height: 52, padding: "0 40px 0 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 22, fontWeight: 700, outline: "none", boxSizing: "border-box" }}
                />
                <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, fontWeight: 700, color: "#9ca3af" }}>P</span>
              </div>
            </div>

            {/* 전송 버튼 */}
            <button
              onClick={handleTransfer}
              disabled={transferring || !selectedReceiver || !transferAmount}
              style={{
                width: "100%", height: 52, borderRadius: 12, border: "none",
                background: (selectedReceiver && transferAmount) ? "linear-gradient(135deg, #7c3aed, #6366f1)" : "#d1d5db",
                color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer",
                boxShadow: (selectedReceiver && transferAmount) ? "0 4px 12px rgba(99,102,241,0.3)" : "none",
              }}
            >
              {transferring ? "전송 중..." : "전송하기"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MobilePointPage() {
  return (
    <Suspense fallback={null}>
      <MobilePointAdmin />
    </Suspense>
  );
}
