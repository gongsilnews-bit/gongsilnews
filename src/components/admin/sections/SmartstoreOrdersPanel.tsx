"use client";

// 멤버십관리 위쪽의 "스마트스토어 결제" 목록. 결제되면 자동으로 공실뉴스부동산 1년이 켜지고,
// 주문자 연락처로 회원을 못 찾은 주문(확인 필요)만 여기서 회원을 골라 연결한다.
import React, { useEffect, useState } from "react";
import { AdminTheme } from "./types";
import {
  getSmartstoreOrders,
  ignoreSmartstoreOrder,
  linkSmartstoreOrder,
  runSmartstoreSyncNow,
  searchMembersForSmartstore,
} from "@/app/actions/smartstoreOrders";

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  granted: { label: "자동 부여", color: "#047857", bg: "#ecfdf5" },
  needs_review: { label: "확인 필요", color: "#b91c1c", bg: "#fef2f2" },
  revoked: { label: "취소·회수", color: "#6b7280", bg: "#f3f4f6" },
  revoke_review: { label: "회수 확인 필요", color: "#b91c1c", bg: "#fef2f2" },
  ignored: { label: "처리 안 함", color: "#6b7280", bg: "#f3f4f6" },
};

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("ko-KR") : "-");

export default function SmartstoreOrdersPanel({ theme }: { theme: AdminTheme }) {
  const { cardBg, textPrimary, textSecondary, border } = theme;
  const [orders, setOrders] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [linking, setLinking] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [candidates, setCandidates] = useState<any[]>([]);

  const load = async () => {
    const r = await getSmartstoreOrders();
    if (r.success) setOrders(r.orders);
    else setMsg(r.error || "불러오기 실패");
  };
  useEffect(() => {
    load();
  }, []);

  const pending = orders.filter((o) => o.status === "needs_review" || o.status === "revoke_review");
  useEffect(() => {
    if (pending.length) setOpen(true);
  }, [pending.length]);

  const syncNow = async () => {
    setBusy(true);
    setMsg("");
    const r = await runSmartstoreSyncNow();
    setMsg(r.success ? `주문 확인 완료 (새로 부여 ${r.result?.granted ?? 0}건, 확인 필요 ${r.result?.needsReview ?? 0}건)` : `실패: ${r.error}`);
    await load();
    setBusy(false);
  };

  const search = async () => setCandidates(await searchMembersForSmartstore(keyword));

  const link = async (productOrderId: string, memberId: string) => {
    if (!confirm("이 회원에게 공실뉴스부동산 1년을 켜시겠습니까?")) return;
    setBusy(true);
    const r = await linkSmartstoreOrder(productOrderId, memberId);
    setMsg(r.success ? "연결하고 멤버십을 켰습니다" : `실패: ${r.error}`);
    setLinking(null);
    setCandidates([]);
    setKeyword("");
    await load();
    setBusy(false);
  };

  const ignore = async (productOrderId: string) => {
    if (!confirm("이 주문은 처리하지 않음으로 표시할까요?")) return;
    await ignoreSmartstoreOrder(productOrderId);
    await load();
  };

  const btn: React.CSSProperties = {
    height: 30, padding: "0 12px", borderRadius: 6, border: `1px solid ${border}`,
    background: cardBg, color: textPrimary, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
  };

  return (
    <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => setOpen(!open)} style={{ ...btn, border: "none", padding: 0, fontSize: 15, fontWeight: 800 }}>
          🛒 스마트스토어 결제 {open ? "▲" : "▼"}
        </button>
        <span style={{ fontSize: 13, color: textSecondary }}>
          최근 {orders.length}건
          {pending.length > 0 && <b style={{ color: "#b91c1c" }}> · 확인 필요 {pending.length}건</b>}
        </span>
        <span style={{ flex: 1 }} />
        {msg && <span style={{ fontSize: 12.5, color: textSecondary }}>{msg}</span>}
        <button onClick={syncNow} disabled={busy} style={btn}>{busy ? "확인 중…" : "지금 주문 확인"}</button>
      </div>

      {open && (
        <div style={{ marginTop: 12, overflowX: "auto" }}>
          <p style={{ fontSize: 12.5, color: textSecondary, margin: "0 0 8px" }}>
            결제되면 주문자 연락처와 같은 번호의 회원에게 공실뉴스부동산 1년이 자동으로 켜집니다(5분마다 확인). 번호가 맞는 회원이 없으면 &quot;확인 필요&quot;로 남습니다.
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: textPrimary }}>
            <thead>
              <tr style={{ textAlign: "left", color: textSecondary, borderBottom: `1px solid ${border}` }}>
                <th style={{ padding: 8 }}>결제일</th>
                <th style={{ padding: 8 }}>주문자</th>
                <th style={{ padding: 8 }}>금액</th>
                <th style={{ padding: 8 }}>상태</th>
                <th style={{ padding: 8 }}>연결 회원</th>
                <th style={{ padding: 8 }}>종료일</th>
                <th style={{ padding: 8 }} />
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 16, textAlign: "center", color: textSecondary }}>아직 들어온 결제가 없습니다</td></tr>
              )}
              {orders.map((o) => {
                const meta = STATUS_META[o.status] || STATUS_META.needs_review;
                return (
                  <React.Fragment key={o.product_order_id}>
                    <tr style={{ borderBottom: `1px solid ${border}` }}>
                      <td style={{ padding: 8 }}>{fmtDate(o.paid_at || o.created_at)}</td>
                      <td style={{ padding: 8 }}>{o.orderer_name || "-"}<br /><span style={{ color: textSecondary }}>{o.orderer_tel || ""}</span></td>
                      <td style={{ padding: 8 }}>{o.payment_amount ? `${Number(o.payment_amount).toLocaleString()}원` : "-"}</td>
                      <td style={{ padding: 8 }}>
                        <span style={{ padding: "3px 8px", borderRadius: 6, fontWeight: 800, color: meta.color, background: meta.bg }}>{meta.label}</span>
                        {o.review_reason && <div style={{ color: textSecondary, fontSize: 12, marginTop: 4 }}>{o.review_reason}</div>}
                      </td>
                      <td style={{ padding: 8 }}>{o.members ? `${o.members.name || ""} (${o.members.email || o.members.phone || ""})` : "-"}</td>
                      <td style={{ padding: 8 }}>{fmtDate(o.granted_plan_end)}</td>
                      <td style={{ padding: 8, whiteSpace: "nowrap" }}>
                        {o.status === "needs_review" && (
                          <button onClick={() => setLinking(linking === o.product_order_id ? null : o.product_order_id)} style={btn}>회원 연결</button>
                        )}{" "}
                        {(o.status === "needs_review" || o.status === "revoke_review") && (
                          <button onClick={() => ignore(o.product_order_id)} style={btn}>처리 안 함</button>
                        )}
                      </td>
                    </tr>
                    {linking === o.product_order_id && (
                      <tr>
                        <td colSpan={7} style={{ padding: "8px 8px 14px" }}>
                          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                            <input
                              value={keyword}
                              onChange={(e) => setKeyword(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && search()}
                              placeholder="회원 이름·연락처·이메일"
                              style={{ flex: 1, maxWidth: 320, height: 32, padding: "0 10px", borderRadius: 6, border: `1px solid ${border}` }}
                            />
                            <button onClick={search} style={btn}>찾기</button>
                          </div>
                          {candidates.map((m) => (
                            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
                              <span>{m.name} · {m.phone || "-"} · {m.email || "-"} · {m.plan_type || "free"}</span>
                              <button onClick={() => link(o.product_order_id, m.id)} disabled={busy} style={btn}>이 회원에게 켜기</button>
                            </div>
                          ))}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
