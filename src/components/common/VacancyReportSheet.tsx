"use client";
// 공실 오류제보 창 — 직방처럼 사유 4가지 중 하나를 골라 [제보하기] (2026-11-17 사장님: "허위공실광고신고" 대신)
//  모바일: 아래에서 올라오는 창 / PC(wide): 가운데 창. 로그인한 회원만 — 로그인 전이면 로그인 화면으로
//  저장은 actions/vacancyReport → utils/vacancyReport (1:1 문의 [오류제보] + 최고관리자·등록 회원 알림)
import React, { useState } from "react";
import { reportVacancyError } from "@/app/actions/vacancyReport";

export const REPORT_REASONS = [
  "거래 완료되었거나 의뢰가 철회된 매물입니다.",
  "매매가, 보증금, 월세 등 금액이 다릅니다.",
  "등록된 사진이 실제 매물과 다릅니다.",
  "방, 화장실 수, 구조, 방향, 옵션 및 용도 등의 정보가 다릅니다.",
];

export default function VacancyReportSheet({ vacancyId, open, onClose, loggedIn, loginHref, wide }: {
  vacancyId: string; open: boolean; onClose: () => void; loggedIn: boolean; loginHref: string; wide?: boolean;
}) {
  const [pick, setPick] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  if (!open) return null;

  const close = () => { setPick(null); onClose(); };
  const send = async () => {
    if (!pick || sending) return;
    if (!loggedIn) { window.location.href = loginHref; return; }
    setSending(true);
    const res = await reportVacancyError(vacancyId, pick).catch(() => ({ success: false, error: "제보하지 못했습니다." } as { success: boolean; error?: string; needLogin?: boolean }));
    setSending(false);
    if ("needLogin" in res && res.needLogin) { window.location.href = loginHref; return; }
    if (!res.success) { alert(res.error || "제보하지 못했습니다."); return; }
    alert("제보해 주셔서 감사합니다. 확인하여 조치하겠습니다.");
    close();
  };

  return (
    <div onClick={close} style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: wide ? "center" : "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: wide ? 440 : 640, background: "#fff", borderRadius: wide ? 14 : "16px 16px 0 0", padding: "20px 20px 24px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: "#111" }}>오류 제보하기</span>
          <button onClick={close} aria-label="닫기" style={{ background: "none", border: "none", fontSize: 22, color: "#9ca3af", cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ background: "#f4f5f7", borderRadius: 8, padding: "10px 12px", fontSize: 12.5, color: "#6b7280", lineHeight: 1.5, marginBottom: 14 }}>
          매물 정보가 실제와 다른 경우, 사유를 선택해주시면 확인하여 조치하겠습니다.
        </div>
        {REPORT_REASONS.map((r) => (
          <label key={r} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 2px", cursor: "pointer", fontSize: 14, color: "#111", lineHeight: 1.45 }}>
            <input type="radio" name="vacancy-report" checked={pick === r} onChange={() => setPick(r)} style={{ marginTop: 3, width: 17, height: 17, accentColor: "#ff6a3d", flexShrink: 0 }} />
            <span>{r}</span>
          </label>
        ))}
        <button onClick={send} disabled={!pick || sending}
          style={{ width: "100%", height: 48, marginTop: 14, border: "none", borderRadius: 8, background: pick ? "#ff6a3d" : "#ffd9cc", color: "#fff", fontSize: 15, fontWeight: 800, cursor: pick ? "pointer" : "default" }}>
          {sending ? "보내는 중..." : "제보하기"}
        </button>
      </div>
    </div>
  );
}
