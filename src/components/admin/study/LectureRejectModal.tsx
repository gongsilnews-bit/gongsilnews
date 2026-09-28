"use client";

import React, { useState } from "react";

/** 반려 사유 입력창. 사유는 회원에게 알림과 목록으로 그대로 보인다 */
export default function LectureRejectModal({
  count,
  darkMode,
  onClose,
  onSubmit,
}: {
  count: number;
  darkMode: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!reason.trim()) { alert("반려 사유를 입력해 주세요."); return; }
    setSending(true);
    await onSubmit(reason.trim());
    setSending(false);
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, background: darkMode ? "#1f2023" : "#fff", borderRadius: 14, padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: darkMode ? "#e5e7eb" : "#111" }}>강의 반려 ({count}건)</h3>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "#6b7280" }}>사유는 강의를 올린 회원에게 알림으로 전달됩니다. 회원이 고쳐서 다시 승인 요청할 수 있습니다.</p>
        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="예: 강의 소개 이미지가 없습니다. 대표 이미지를 올려 주세요."
          style={{ width: "100%", height: 120, padding: 12, border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, resize: "vertical", boxSizing: "border-box", background: darkMode ? "#2c2d31" : "#fff", color: darkMode ? "#e5e7eb" : "#111" }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <button type="button" onClick={onClose} style={{ height: 38, padding: "0 16px", background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>취소</button>
          <button type="button" onClick={submit} disabled={sending} style={{ height: 38, padding: "0 18px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: sending ? "wait" : "pointer", opacity: sending ? 0.6 : 1 }}>
            {sending ? "처리 중..." : "반려하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
