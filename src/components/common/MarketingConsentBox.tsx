"use client";

import React, { useEffect, useState } from "react";
import { getMarketingConsent, updateMyMarketingConsent } from "@/app/actions/member";

/**
 * 광고성 정보 수신 동의 — 문자 · 카카오톡 (2026-11-09 사장님)
 *  회원 정보 수정 화면에 붙여 쓴다. 누르면 바로 저장하고 marketing_agreed_at 을 새로 남긴다.
 *  칸이 아직 없으면(SQL 실행 전) 아무것도 그리지 않는다.
 */
export default function MarketingConsentBox({ memberId, dark = false }: { memberId: string; dark?: boolean }) {
  const [v, setV] = useState<{ sms: boolean; kakao: boolean; at: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let off = false;
    void getMarketingConsent(memberId).then((r) => { if (!off && r.success) setV({ sms: r.sms, kakao: r.kakao, at: r.at }); });
    return () => { off = true; };
  }, [memberId]);

  if (!v) return null;

  const toggle = async (k: "sms" | "kakao") => {
    if (busy) return;
    const next = { ...v, [k]: !v[k] };
    setBusy(true);
    setMsg("");
    const r = await updateMyMarketingConsent(memberId, next.sms, next.kakao);
    setBusy(false);
    if (r.success) {
      setV({ ...next, at: new Date().toISOString() });
      setMsg("저장했어요");
    } else setMsg(r.error || "저장하지 못했어요");
  };

  const text = dark ? "#e5e7eb" : "#374151";
  const dim = dark ? "#9ca3af" : "#6b7280";
  const at = v.at ? new Date(v.at) : null;
  return (
    <div style={{ margin: "16px 0", padding: "14px 16px", border: `1px solid ${dark ? "#374151" : "#e5e7eb"}`, borderRadius: 8, background: dark ? "#1f2937" : "#fff" }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: text, marginBottom: 10 }}>소식·혜택 받기 <span style={{ fontSize: 12, fontWeight: 500, color: dim }}>(선택)</span></div>
      {([["sms", "공실뉴스 소식·혜택 문자 받기"], ["kakao", "카카오톡 받기"]] as const).map(([k, label]) => (
        <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: busy ? "default" : "pointer", userSelect: "none" }}>
          <input type="checkbox" checked={v[k]} disabled={busy} onChange={() => void toggle(k)} style={{ width: 16, height: 16, accentColor: "#1a3a6b" }} />
          <span style={{ fontSize: 13.5, color: text }}>{label}</span>
        </label>
      ))}
      <div style={{ fontSize: 11.5, color: dim, marginTop: 4 }}>
        광고성 정보 수신 동의 · 언제든 끌 수 있어요
        {at && ` · 마지막 변경 ${at.getFullYear()}.${at.getMonth() + 1}.${at.getDate()}`}
        {msg && <span style={{ marginLeft: 8, fontWeight: 700, color: msg === "저장했어요" ? "#16a34a" : "#dc2626" }}>{msg}</span>}
      </div>
    </div>
  );
}
