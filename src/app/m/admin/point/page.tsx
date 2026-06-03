"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { 
  getPointBalance, getPointTransactions, transferPoints, searchMembersForTransfer,
  getPointSettings, updatePointSetting, getAllMembersWithBalance, adminAdjustPoints 
} from "@/app/actions/point";

const SETTING_LABELS: Record<string, { label: string; unit: string; desc: string }> = {
  SIGNUP_BONUS: { label: "가입 축하 포인트", unit: "P", desc: "신규 회원가입 시 자동 지급" },
  VACANCY_REWARD: { label: "공실 등록 보상", unit: "P", desc: "공실 등록 시 자동 지급" },
  COMMISSION_RATE: { label: "콘텐츠 판매 수수료", unit: "%", desc: "자료실/특강 판매 시 플랫폼 수수료" },
  TRANSFER_FEE_RATE: { label: "P2P 전송 수수료", unit: "%", desc: "회원 간 포인트 전송 수수료" },
  TRANSFER_MAX_ONCE: { label: "1회 최대 전송 한도", unit: "P", desc: "1회에 전송 가능한 최대 포인트" },
  TRANSFER_MAX_DAILY: { label: "1일 최대 전송 한도", unit: "P", desc: "하루 동안 전송 가능한 최대 포인트" },
  CHARGE_RATIO: { label: "결제 포인트 비율", unit: "P/원", desc: "1원당 지급되는 포인트" },
};

function MobileUserPointView({ memberId, userName, balance, transactions, loading, setBalance, setTransactions }: any) {
  const router = useRouter();
  const [filter, setFilter] = useState<"전체" | "적립" | "사용">("전체");

  const [showTransfer, setShowTransfer] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedReceiver, setSelectedReceiver] = useState<any>(null);
  const [transferring, setTransferring] = useState(false);
  const [searching, setSearching] = useState(false);

  const filtered = transactions.filter((t: any) => {
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

  return (
    <>
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
          style={{ marginTop: 16, padding: "10px 20px", background: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          💸 포인트 전송
        </button>
      </div>

      <div style={{ margin: "16px 16px 0", background: "#fff", borderRadius: 12, padding: 4, display: "flex", gap: 4, border: "1px solid #e5e7eb" }}>
        {(["전체", "적립", "사용"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: filter === f ? "#111" : "transparent", color: filter === f ? "#fff" : "#6b7280", fontSize: 14, fontWeight: filter === f ? 700 : 500, cursor: "pointer", transition: "all 0.2s" }}>
            {f}
          </button>
        ))}
      </div>

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
          filtered.map((tx: any, i: number) => {
            const isEarn = tx.type === "EARN";
            const counterpartName = tx.counterpart?.name;
            return (
              <div key={tx.id || i} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", marginBottom: 8, border: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: isEarn ? "#ecfdf5" : "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
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

      {showTransfer && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "flex-end" }}>
          <div style={{ width: "100%", background: "#fff", borderRadius: "20px 20px 0 0", padding: "24px 20px 32px", maxHeight: "85dvh", overflowY: "auto", animation: "slideUp 0.3s ease" }}>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: 0 }}>💸 포인트 전송</h2>
              <button onClick={() => { setShowTransfer(false); setSelectedReceiver(null); setSearchResults([]); setSearchQuery(""); setTransferAmount(""); }} style={{ background: "none", border: "none", fontSize: 24, color: "#9ca3af", cursor: "pointer" }}>✕</button>
            </div>
            
            <div style={{ background: "#f8f9fa", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>보유 포인트</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#7c3aed" }}>{balance.toLocaleString()}P</span>
            </div>

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
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleSearch(); }} placeholder="이름 또는 이메일 검색" style={{ flex: 1, height: 44, padding: "0 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14, outline: "none" }} />
                    <button onClick={handleSearch} disabled={searching} style={{ height: 44, padding: "0 16px", background: "#374151", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>{searching ? "..." : "검색"}</button>
                  </div>
                  {searchResults.length > 0 && (
                    <div style={{ marginTop: 8, border: "1px solid #e5e7eb", borderRadius: 10, maxHeight: 200, overflowY: "auto" }}>
                      {searchResults.map(m => (
                        <button key={m.id} onClick={() => { setSelectedReceiver(m); setSearchResults([]); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "none", border: "none", borderBottom: "1px solid #f3f4f6", cursor: "pointer", textAlign: "left" }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#6b7280", flexShrink: 0 }}>{(m.name || "?")[0]}</div>
                          <div><div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{m.name}</div><div style={{ fontSize: 11, color: "#9ca3af" }}>{m.email}</div></div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>전송 금액</label>
              <div style={{ position: "relative" }}>
                <input type="number" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} placeholder="0" style={{ width: "100%", height: 52, padding: "0 40px 0 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 22, fontWeight: 700, outline: "none", boxSizing: "border-box" }} />
                <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, fontWeight: 700, color: "#9ca3af" }}>P</span>
              </div>
            </div>

            <button onClick={handleTransfer} disabled={transferring || !selectedReceiver || !transferAmount} style={{ width: "100%", height: 52, borderRadius: 12, border: "none", background: (selectedReceiver && transferAmount) ? "linear-gradient(135deg, #7c3aed, #6366f1)" : "#d1d5db", color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: (selectedReceiver && transferAmount) ? "0 4px 12px rgba(99,102,241,0.3)" : "none" }}>
              {transferring ? "전송 중..." : "전송하기"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function MobileAdminPointView({ userName, activeKeyword }: { userName: string, activeKeyword: string }) {
  const [tab, setTab] = useState<"members" | "transactions" | "settings">("members");

  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [adjustModal, setAdjustModal] = useState<{ id: string; name: string } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txFilter, setTxFilter] = useState<"ALL" | "EARN" | "SPEND">("ALL");

  const [settings, setSettings] = useState<Record<string, number>>({});
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    loadMembers();
    loadTransactions();
    loadSettings();
  }, []);

  async function loadMembers() {
    setMembersLoading(true);
    const res = await getAllMembersWithBalance();
    if (res.success) setMembers(res.data);
    setMembersLoading(false);
  }

  async function loadTransactions() {
    setTxLoading(true);
    const res = await getPointTransactions({ limit: 100 });
    if (res.success) setTransactions(res.data);
    setTxLoading(false);
  }

  async function loadSettings() {
    setSettingsLoading(true);
    const res = await getPointSettings();
    if (res.success) setSettings(res.data);
    setSettingsLoading(false);
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
      loadTransactions();
    } else {
      alert("실패: " + res.error);
    }
  }

  const roleMap: Record<string, string> = { ADMIN: "최고관리자", REALTOR: "부동산회원", USER: "일반회원" };

  return (
    <>
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", position: "sticky", top: 56, zIndex: 40 }}>
        {(["members", "transactions", "settings"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "14px 0", background: "none", border: "none", borderBottom: tab === t ? "3px solid #111" : "3px solid transparent", color: tab === t ? "#111" : "#6b7280", fontSize: 14, fontWeight: tab === t ? 800 : 600, cursor: "pointer" }}>
            {t === "members" ? "회원 현황" : t === "transactions" ? "거래 내역" : "정책 설정"}
          </button>
        ))}
      </div>

      <div style={{ padding: "16px", paddingBottom: "100px" }}>
        {tab === "members" && (
          <div>
            <div style={{ background: "#fff", borderRadius: 12, padding: "16px", marginBottom: 16, display: "flex", justifyContent: "space-between", border: "1px solid #e5e7eb" }}>
              <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>총 회원</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>{members.length}</div>
              </div>
              <div style={{ width: 1, background: "#e5e7eb", margin: "0 10px" }} />
              <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>총 유통 포인트</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#10b981" }}>{members.reduce((s, m) => s + (m.point_balance || 0), 0).toLocaleString()}P</div>
              </div>
            </div>

            {membersLoading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>불러오는 중...</div>
            ) : (
              members.filter(m => !activeKeyword || 
                (m.name || "").includes(activeKeyword) || 
                (m.email || "").includes(activeKeyword) ||
                (m.memberNumber && m.memberNumber.toString().includes(activeKeyword)) ||
                (m.id && String(m.id).includes(activeKeyword))
              ).map(m => (
                <div key={m.id} style={{ background: "#fff", borderRadius: 12, padding: "16px", marginBottom: 12, border: "1px solid #e5e7eb", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: "#111" }}>{m.name || "이름없음"}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: m.role === 'ADMIN' ? "#111827" : m.role === 'REALTOR' ? "#dbeafe" : "#f3f4f6", color: m.role === 'ADMIN' ? "#fff" : m.role === 'REALTOR' ? "#1e40af" : "#4b5563" }}>
                          {roleMap[m.role] || m.role}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: (m.point_balance || 0) > 0 ? "#10b981" : "#111" }}>{(m.point_balance || 0).toLocaleString()} P</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setAdjustModal({ id: m.id, name: m.name }); setAdjustAmount(""); setAdjustReason(""); }} style={{ flex: 1, height: 36, background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>💚 지급</button>
                    <button onClick={() => { setAdjustModal({ id: m.id, name: m.name }); setAdjustAmount("-"); setAdjustReason(""); }} style={{ flex: 1, height: 36, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>🔴 차감</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "transactions" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {(["ALL", "EARN", "SPEND"] as const).map(f => (
                <button key={f} onClick={() => setTxFilter(f)} style={{ flex: 1, height: 36, borderRadius: 18, border: f === txFilter ? "none" : "1px solid #e5e7eb", background: f === txFilter ? "#111" : "#fff", color: f === txFilter ? "#fff" : "#6b7280", fontSize: 13, fontWeight: 700 }}>
                  {f === "ALL" ? "전체" : f === "EARN" ? "적립" : "사용"}
                </button>
              ))}
            </div>
            {txLoading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>불러오는 중...</div>
            ) : (
              transactions.filter(t => txFilter === "ALL" || t.type === txFilter).map(tx => {
                const isEarn = tx.type === "EARN";
                return (
                  <div key={tx.id} style={{ background: "#fff", borderRadius: 12, padding: "16px", marginBottom: 12, border: "1px solid #e5e7eb" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>{new Date(tx.created_at).toLocaleString()}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: isEarn ? "#059669" : "#dc2626" }}>{isEarn ? "적립" : "사용"}</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#111" }}>{tx.member?.name || "알수없음"}</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: isEarn ? "#10b981" : "#ef4444" }}>{isEarn ? "+" : "-"}{tx.amount.toLocaleString()} P</div>
                    </div>
                    <div style={{ fontSize: 13, color: "#4b5563" }}>사유: {tx.reason}</div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "settings" && (
          <div>
            {settingsLoading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>불러오는 중...</div>
            ) : (
              Object.entries(SETTING_LABELS).map(([key, meta]) => (
                <div key={key} style={{ background: "#fff", borderRadius: 12, padding: "16px", marginBottom: 12, border: "1px solid #e5e7eb" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#111", marginBottom: 4 }}>{meta.label}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>{meta.desc}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ position: "relative", flex: 1 }}>
                      <input type="number" value={settings[key] ?? ""} onChange={e => setSettings(p => ({ ...p, [key]: Number(e.target.value) }))} style={{ width: "100%", height: 40, padding: "0 40px 0 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 15, fontWeight: 700, outline: "none", boxSizing: "border-box" }} />
                      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#9ca3af", fontWeight: 700 }}>{meta.unit}</span>
                    </div>
                    <button onClick={() => handleSaveSetting(key)} disabled={savingKey === key} style={{ height: 40, padding: "0 16px", background: "#111", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      {savingKey === key ? "..." : "저장"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {adjustModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "flex-end" }}>
          <div style={{ width: "100%", background: "#fff", borderRadius: "20px 20px 0 0", padding: "24px 20px 32px", animation: "slideUp 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>💰 포인트 지급/차감</h2>
              <button onClick={() => setAdjustModal(null)} style={{ background: "none", border: "none", fontSize: 24, color: "#9ca3af", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>대상: <span style={{ color: "#3b82f6" }}>{adjustModal.name}</span></div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>금액 (양수:지급, 음수:차감)</label>
              <input type="number" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} placeholder="예: 1000 또는 -500" style={{ width: "100%", height: 44, padding: "0 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 16, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>사유</label>
              <input type="text" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="예: 이벤트 당첨" style={{ width: "100%", height: 44, padding: "0 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <button onClick={handleAdjust} style={{ width: "100%", height: 48, background: "#111", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function MobilePointMain() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [memberInfo, setMemberInfo] = useState<any>(null);

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 상단 검색 
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/m"); return; }
      const { data: m } = await supabase.from("members").select("id, name, email, role").eq("id", user.id).single();
      
      if (m) {
        setMemberInfo(m);
        const role = m.role?.trim().toUpperCase() || '';
        const adminCheck = role === 'ADMIN' || role === '최고관리자' || role.includes('관리자');
        setIsAdmin(adminCheck);

        if (!adminCheck) {
          const [balRes, txRes] = await Promise.all([
            getPointBalance(m.id),
            getPointTransactions({ memberId: m.id, limit: 100 }),
          ]);
          if (balRes.success) setBalance(balRes.balance);
          if (txRes.success) setTransactions(txRes.data);
        }
      }
      setLoading(false);
      setAuthChecked(true);
    })();
  }, [router]);

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
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push('/m?menu=open')} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>{isAdmin ? "포인트 관리" : "내 포인트"}</h1>
        </div>
        {isAdmin && (
          <button onClick={() => setSearchOpen(!searchOpen)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
        )}
      </div>

      {searchOpen && isAdmin && (
        <div style={{ background: "#fff", padding: "12px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", gap: 8 }}>
          <input
            type="text"
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") setActiveKeyword(searchKeyword); }}
            placeholder="이름, 이메일 또는 회원번호 검색"
            style={{ flex: 1, height: 40, padding: "0 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none" }}
          />
          <button onClick={() => setActiveKeyword(searchKeyword)} style={{ height: 40, padding: "0 16px", background: "#374151", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>검색</button>
          {activeKeyword && (
            <button onClick={() => { setSearchKeyword(""); setActiveKeyword(""); }} style={{ height: 40, padding: "0 12px", background: "#fff", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>초기화</button>
          )}
        </div>
      )}

      {isAdmin ? (
        <MobileAdminPointView userName={memberInfo?.name || "관리자"} activeKeyword={activeKeyword} />
      ) : (
        <MobileUserPointView memberId={memberInfo?.id} userName={memberInfo?.name} balance={balance} transactions={transactions} loading={loading} setBalance={setBalance} setTransactions={setTransactions} />
      )}
    </div>
  );
}

export default function MobilePointPage() {
  return (
    <Suspense fallback={null}>
      <MobilePointMain />
    </Suspense>
  );
}
