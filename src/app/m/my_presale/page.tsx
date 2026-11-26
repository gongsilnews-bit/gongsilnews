"use client";

// 내 분양 신청 (2026-11-26 사장님) — 모바일 MY › 내 분양 신청
//  로그인해 신청한 것 + 회원 휴대폰과 같은 번호로 신청한 것. [신청 취소]는 연락처까지 지운다 (동의 철회)
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { cancelMyPresaleRequest, listMyPresaleRequests, type MyPresaleRequest } from "@/app/actions/presale";

const PURPLE = "#6d28d9";
const STATUS: Record<string, { t: string; c: string }> = {
  new: { t: "접수됨", c: PURPLE },
  contacted: { t: "연락드림", c: "#059669" },
  done: { t: "안내 마침", c: "#6b7280" },
};

export default function MyPresalePage() {
  const router = useRouter();
  const [rows, setRows] = useState<MyPresaleRequest[] | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await createClient().auth.getUser();
      if (!data?.user) { router.replace("/m/login?returnTo=" + encodeURIComponent("/m/my_presale")); return; }
      const r = await listMyPresaleRequests();
      if (r.success) setRows(r.rows);
      else { setMsg(r.error); setRows([]); }
    })();
  }, [router]);

  const cancel = async (r: MyPresaleRequest) => {
    if (!window.confirm(`${r.presale_name} 분양자료 신청을 취소할까요?\n적어 주신 이름·연락처도 함께 지워집니다.`)) return;
    const res = await cancelMyPresaleRequest(r.id);
    if (!res.success) { setMsg(res.error || "취소하지 못했습니다."); return; }
    setRows((list) => (list || []).filter((x) => x.id !== r.id));
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f9fafb", minHeight: "100vh" }}>
      <div style={{ background: "#fff", display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 10 }}>
        <button onClick={() => router.back()} aria-label="뒤로" style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", marginLeft: -4, marginRight: 8 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111", margin: 0 }}>내 분양 신청 {rows ? <span style={{ color: PURPLE }}>{rows.length}</span> : null}</h2>
      </div>

      {msg && <div style={{ margin: "12px 16px 0", color: "#dc2626", fontWeight: 600, fontSize: 14 }}>{msg}</div>}
      {rows === null ? (
        <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>불러오는 중…</div>
      ) : !rows.length ? (
        <div style={{ padding: "48px 24px", textAlign: "center", color: "#6b7280", lineHeight: 1.7 }}>
          아직 분양자료를 신청하지 않았어요.<br />공실열람 지도에서 보라색 분양 단지를 눌러<br />[분양자료 신청하기]로 받아 보세요.
          <div><button type="button" onClick={() => router.push("/m/gongsil")} style={{ marginTop: 18, padding: "12px 20px", border: "none", borderRadius: 10, background: PURPLE, color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>공실열람 지도 열기</button></div>
        </div>
      ) : (
        <div style={{ padding: "12px 16px", display: "grid", gap: 10 }}>
          {rows.map((r) => {
            const st = STATUS[r.status] || STATUS.new;
            return (
              <div key={r.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 16, fontWeight: 800, color: "#111" }}>{r.presale_name}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: "#fff", background: st.c, borderRadius: 10, padding: "2px 9px" }}>{st.t}</span>
                </div>
                <div style={{ marginTop: 6, fontSize: 13.5, color: "#4b5563" }}>
                  {new Date(r.created_at).toLocaleDateString("ko-KR")} 신청{r.area_type ? ` · 관심 평형 ${r.area_type}` : ""}{r.agree_third ? " · 분양사 안내 동의" : ""}
                </div>
                <div style={{ marginTop: 10, textAlign: "right" }}>
                  <button type="button" onClick={() => cancel(r)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", color: "#4b5563", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>신청 취소</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
