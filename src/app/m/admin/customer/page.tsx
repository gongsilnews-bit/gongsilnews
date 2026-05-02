"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getCustomers, createCustomer, getCustomerLogs, addCustomerLog, updateCustomerStatus } from "@/app/actions/customer";

type View = "list" | "create" | "detail";

function MobileCustomerAdmin() {
  const router = useRouter();
  const [view, setView] = useState<View>("list");
  const [customers, setCustomers] = useState<any[]>([]);
  const [filter, setFilter] = useState("전체");
  const [loading, setLoading] = useState(true);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [memos, setMemos] = useState<any[]>([]);
  const [newMemo, setNewMemo] = useState("");
  const [memoLoading, setMemoLoading] = useState(false);

  // 등록 폼
  const [form, setForm] = useState({ name: "", phone: "", type: "매수", budget: "", area: "", source: "오프라인(워크인)", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/m"); return; }
      const { data } = await supabase.from("members").select("id, name, role").eq("id", user.id).single();
      if (data) setMemberId(data.id);
      setAuthChecked(true);
    })();
  }, []);

  const refresh = async () => {
    if (!memberId) return;
    setLoading(true);
    const res = await getCustomers(memberId);
    if (res.success) setCustomers(res.data || []);
    setLoading(false);
  };

  useEffect(() => { if (memberId) refresh(); }, [memberId]);

  const filtered = customers.filter(c => {
    if (filter !== "전체" && c.status !== filter) return false;
    if (activeKeyword) {
      const k = activeKeyword.toLowerCase();
      if (!(c.name||"").toLowerCase().includes(k) && !(c.phone||"").includes(k)) return false;
    }
    return true;
  });

  const statusColor: Record<string, string> = { "신규": "#ef4444", "진행중": "#3b82f6", "계약완료": "#10b981", "보류/종료": "#9ca3af" };
  const tabs = [
    { key: "전체", count: customers.length },
    { key: "신규", count: customers.filter(c => c.status === "신규").length },
    { key: "진행중", count: customers.filter(c => c.status === "진행중").length },
    { key: "계약완료", count: customers.filter(c => c.status === "계약완료").length },
    { key: "보류/종료", count: customers.filter(c => c.status === "보류/종료").length },
  ];

  const openDetail = async (c: any) => {
    setSelectedCustomer(c);
    setView("detail");
    setMemoLoading(true);
    const res = await getCustomerLogs(c.id);
    if (res.success) setMemos(res.data || []);
    setMemoLoading(false);
  };

  const handleAddMemo = async () => {
    if (!newMemo.trim() || !selectedCustomer) return;
    const temp = { id: Date.now(), type: "memo", content: newMemo, created_at: new Date().toISOString() };
    setMemos(prev => [...prev, temp]);
    setNewMemo("");
    await addCustomerLog(selectedCustomer.id, "memo", newMemo);
    const res = await getCustomerLogs(selectedCustomer.id);
    if (res.success) setMemos(res.data || []);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedCustomer) return;
    const old = selectedCustomer.status;
    await updateCustomerStatus(selectedCustomer.id, newStatus);
    await addCustomerLog(selectedCustomer.id, "system", `상태를 [${old}]에서 [${newStatus}](으)로 변경함.`);
    setSelectedCustomer({ ...selectedCustomer, status: newStatus });
    const res = await getCustomerLogs(selectedCustomer.id);
    if (res.success) setMemos(res.data || []);
  };

  const handleCreate = async () => {
    if (!form.name && !form.phone) { alert("이름 또는 연락처를 입력하세요."); return; }
    setSaving(true);
    const res = await createCustomer(memberId!, form);
    setSaving(false);
    if (res.success) {
      alert("고객이 등록되었습니다!");
      setForm({ name: "", phone: "", type: "매수", budget: "", area: "", source: "오프라인(워크인)", notes: "" });
      setView("list");
      refresh();
    } else alert("오류: " + res.message);
  };

  if (!authChecked) {
    return (
      <div style={{ display: "flex", height: "100dvh", alignItems: "center", justifyContent: "center", background: "#f4f5f7" }}>
        <div style={{ textAlign: "center", color: "#9ca3af" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔐</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>권한을 확인하고 있습니다...</div>
        </div>
      </div>
    );
  }

  // ─── 상세 뷰 ───
  if (view === "detail" && selectedCustomer) {
    const sc = selectedCustomer;
    return (
      <div style={{ minHeight: "100dvh", background: "#f4f5f7", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
        <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => { setView("list"); refresh(); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0, flex: 1 }}>고객 상세</h1>
          <a href={`tel:${sc.phone}`} style={{ background: "#10b981", color: "#fff", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>📞 전화</a>
        </div>

        {/* 프로필 카드 */}
        <div style={{ margin: 16, background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>{sc.name || "이름없음"}</span>
            <span style={{ padding: "4px 10px", background: statusColor[sc.status] || "#9ca3af", color: "#fff", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>{sc.status}</span>
            <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{sc.type}</span>
          </div>
          <div style={{ fontSize: 15, color: "#374151", marginBottom: 8 }}>{sc.phone || "-"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 8, fontSize: 13 }}>
            <span style={{ color: "#9ca3af", fontWeight: 600 }}>희망지역</span><span style={{ color: "#111", fontWeight: 600 }}>{sc.area || "-"}</span>
            <span style={{ color: "#9ca3af", fontWeight: 600 }}>예산</span><span style={{ color: "#111", fontWeight: 600 }}>{sc.budget || "-"}</span>
            <span style={{ color: "#9ca3af", fontWeight: 600 }}>유입경로</span><span style={{ color: "#111", fontWeight: 600 }}>{sc.source || "-"}</span>
            <span style={{ color: "#9ca3af", fontWeight: 600 }}>등록일</span><span style={{ color: "#111", fontWeight: 600 }}>{sc.created_at ? new Date(sc.created_at).toISOString().split("T")[0] : "-"}</span>
          </div>
        </div>

        {/* 상태 변경 */}
        <div style={{ margin: "0 16px 16px", background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", marginBottom: 8 }}>진행 상태 변경</div>
          <div style={{ display: "flex", gap: 8 }}>
            {["신규", "진행중", "계약완료", "보류/종료"].map(s => (
              <button key={s} onClick={() => handleStatusChange(s)} style={{
                flex: 1, height: 36, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none",
                background: sc.status === s ? (statusColor[s] || "#9ca3af") : "#f3f4f6",
                color: sc.status === s ? "#fff" : "#6b7280",
              }}>{s}</button>
            ))}
          </div>
        </div>

        {/* 메모 입력 */}
        <div style={{ margin: "0 16px 16px", background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", marginBottom: 8 }}>📝 상담 메모 추가</div>
          <textarea value={newMemo} onChange={e => setNewMemo(e.target.value)} placeholder="상담 내용, 특이사항, 다음 약속 등..."
            style={{ width: "100%", height: 80, padding: 12, border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14, resize: "none", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
          <button onClick={handleAddMemo} style={{ marginTop: 8, width: "100%", height: 40, background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>메모 저장</button>
        </div>

        {/* 타임라인 */}
        <div style={{ margin: "0 16px", paddingBottom: 100 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 12 }}>상담 타임라인</div>
          {memoLoading ? (
            <div style={{ textAlign: "center", color: "#9ca3af", padding: 20 }}>불러오는 중...</div>
          ) : memos.length === 0 ? (
            <div style={{ textAlign: "center", color: "#9ca3af", padding: 40 }}>아직 기록이 없습니다.</div>
          ) : [...memos].reverse().map(m => {
            const dt = new Date(m.created_at);
            const ds = `${dt.getMonth()+1}/${dt.getDate()} ${dt.getHours().toString().padStart(2,'0')}:${dt.getMinutes().toString().padStart(2,'0')}`;
            return (
              <div key={m.id} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 10, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: m.type === "system" ? "#9ca3af" : "#3b82f6", flexShrink: 0 }} />
                  <div style={{ width: 2, flex: 1, background: "#e5e7eb", marginTop: 4 }} />
                </div>
                <div style={{ flex: 1, paddingBottom: 4 }}>
                  <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, marginBottom: 4 }}>{ds}</div>
                  <div style={{
                    fontSize: 13, lineHeight: 1.5, padding: m.type === "system" ? 0 : "10px 14px",
                    background: m.type === "system" ? "transparent" : "#f8fafc",
                    borderRadius: m.type === "system" ? 0 : 10,
                    border: m.type === "system" ? "none" : "1px solid #f0f0f0",
                    color: m.type === "system" ? "#9ca3af" : "#111",
                    fontStyle: m.type === "system" ? "italic" : "normal",
                  }}>{m.content}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── 등록 뷰 ───
  if (view === "create") {
    const inputStyle = { width: "100%", height: 44, padding: "0 14px", border: "1px solid #e5e7eb", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit" };
    const labelStyle = { display: "block" as const, fontSize: 13, fontWeight: 700 as const, color: "#6b7280", marginBottom: 8 };
    return (
      <div style={{ minHeight: "100dvh", background: "#f4f5f7", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
        <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setView("list")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>새 고객 등록</h1>
        </div>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div><label style={labelStyle}>고객 이름 <span style={{ color: "#ef4444" }}>*</span></label><input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="예: 홍길동" style={inputStyle} /></div>
            <div><label style={labelStyle}>연락처 <span style={{ color: "#ef4444" }}>*</span></label><input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="010-0000-0000" style={inputStyle} /></div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>상담 유형</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} style={inputStyle}>
                  <option value="매수">매수 찾음</option><option value="임차(전월세)">임차(전월세)</option><option value="매도">매도 내놓음</option><option value="임대(전월세)">임대 내놓음</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>유입 경로</label>
                <select value={form.source} onChange={e => setForm({...form, source: e.target.value})} style={inputStyle}>
                  <option value="오프라인(워크인)">오프라인(워크인)</option><option value="전화 문의">전화 문의</option><option value="지인 소개">지인 소개</option>
                </select>
              </div>
            </div>
            <div><label style={labelStyle}>희망 지역</label><input type="text" value={form.area} onChange={e => setForm({...form, area: e.target.value})} placeholder="예: 강남구 논현동, 1층 상가" style={inputStyle} /></div>
            <div><label style={labelStyle}>가용 예산</label><input type="text" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} placeholder="예: 보증금 5천 / 월세 300" style={inputStyle} /></div>
            <div><label style={labelStyle}>첫 상담 메모</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="특이사항, 빠른 입주 희망 등..." style={{ ...inputStyle, height: 100, padding: 14, resize: "none" }} /></div>
          </div>
          <button onClick={handleCreate} disabled={saving} style={{ width: "100%", height: 48, background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "등록 중..." : "고객 등록하기"}
          </button>
        </div>
      </div>
    );
  }

  // ─── 목록 뷰 ───
  return (
    <div style={{ minHeight: "100dvh", background: "#f4f5f7", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push('/m?menu=open')} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>고객관리</h1>
          <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
            진행중 {customers.filter(c => c.status === "진행중").length}명 / 전체 {customers.length}명
          </span>
        </div>
        <button onClick={() => setSearchOpen(!searchOpen)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>
      </div>

      {searchOpen && (
        <div style={{ background: "#fff", padding: "12px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", gap: 8 }}>
          <input type="text" value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { setActiveKeyword(searchKeyword); setFilter("전체"); } }}
            placeholder="이름 또는 연락처 검색" style={{ flex: 1, height: 40, padding: "0 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none" }} />
          <button onClick={() => { setActiveKeyword(searchKeyword); setFilter("전체"); }} style={{ height: 40, padding: "0 16px", background: "#374151", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>검색</button>
          {activeKeyword && <button onClick={() => { setSearchKeyword(""); setActiveKeyword(""); }} style={{ height: 40, padding: "0 12px", background: "#fff", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>초기화</button>}
        </div>
      )}

      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 12px", display: "flex", overflowX: "auto", WebkitOverflowScrolling: "touch" }} className="hide-scrollbar">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => { setFilter(tab.key); setActiveKeyword(""); setSearchKeyword(""); }}
            style={{ flexShrink: 0, border: "none", background: "none", padding: "14px 16px", fontSize: 14, fontWeight: filter === tab.key ? 800 : 500, color: filter === tab.key ? "#3b82f6" : "#6b7280", borderBottom: filter === tab.key ? "3px solid #3b82f6" : "3px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            {tab.key}
            <span style={{ background: tab.key === "전체" ? "#e5e7eb" : (statusColor[tab.key] || "#9ca3af"), color: tab.key === "전체" ? "#4b5563" : "#fff", padding: "2px 7px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{tab.count}</span>
          </button>
        ))}
      </div>

      <div style={{ margin: "12px 16px 0", padding: "10px 14px", background: "#eff6ff", borderRadius: 10, border: "1px solid #bfdbfe", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16 }}>👥</span>
        <span style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 600, lineHeight: 1.4 }}>고객을 등록하고 상담 내역을 기록하여 체계적으로 관리하세요.</span>
      </div>

      <div style={{ padding: "12px 16px 100px" }}>
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#9ca3af" }}><div style={{ fontSize: 14, fontWeight: 600 }}>불러오는 중...</div></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#9ca3af" }}><div style={{ fontSize: 40, marginBottom: 12 }}>👥</div><div style={{ fontSize: 15, fontWeight: 600 }}>등록된 고객이 없습니다.</div></div>
        ) : filtered.map(c => {
          const dateStr = c.created_at ? new Date(c.created_at).toISOString().split("T")[0] : "-";
          return (
            <div key={c.id} onClick={() => openDetail(c)} style={{ background: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: c.status === "신규" ? "2px solid #fca5a5" : "1px solid #f0f0f0", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ padding: "4px 10px", background: statusColor[c.status] || "#9ca3af", color: "#fff", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>{c.status}</span>
                  <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{c.type}</span>
                </div>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>{dateStr}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#111", marginBottom: 4 }}>{c.name || "(이름없음)"}</div>
              <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>{c.phone || "-"}</div>
              <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#9ca3af" }}>
                {c.area && <span>📍 {c.area}</span>}
                {c.budget && <span>💰 {c.budget}</span>}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={e => { e.stopPropagation(); openDetail(c); }} style={{ flex: 1, height: 36, background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>📝 상세/메모</button>
                <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} style={{ flex: 1, height: 36, background: "#10b981", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, textDecoration: "none" }}>📞 전화</a>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={() => setView("create")} style={{ position: "fixed", bottom: 80, right: 20, width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", border: "none", boxShadow: "0 4px 16px rgba(59,130,246,0.4)", fontSize: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40 }}>+</button>

      <style>{`.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>
  );
}

export default function MobileCustomerAdminPage() {
  return <Suspense fallback={null}><MobileCustomerAdmin /></Suspense>;
}
