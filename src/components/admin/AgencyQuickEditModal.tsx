"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { adminUpdateAgency } from "@/app/admin/actions";

/* ──────────────────────────────────────────────
   공실 작성 중 [부동산/기업 정보 수정] 팝업
   - 작성 화면을 떠나지 않고 상호·대표자·전화번호·상세주소를 고친다
   - 등록번호·사업자번호·기본주소는 서류 확인이 필요해 정보설정을 새 창으로 연다
     (새 창이라 작성 중인 공실 내용은 그대로 남는다)
   ────────────────────────────────────────────── */

export interface AgencyQuickInfo {
  name: string;
  ceo_name: string;
  phone: string;
  cell: string;
  address: string;
  address_detail: string;
  reg_num: string;
  biz_num: string;
}

interface Props {
  open: boolean;
  ownerId: string;
  darkMode?: boolean;
  mobile?: boolean;
  settingsHref: string;
  onClose: () => void;
  onSaved: (info: AgencyQuickInfo) => void;
}

const EMPTY: AgencyQuickInfo = { name: "", ceo_name: "", phone: "", cell: "", address: "", address_detail: "", reg_num: "", biz_num: "" };

const formatPhone = (val: string) => {
  const n = val.replace(/[^0-9]/g, "");
  if (n.startsWith("02")) {
    if (n.length <= 2) return n;
    if (n.length <= 5) return `${n.slice(0, 2)}-${n.slice(2)}`;
    if (n.length <= 9) return `${n.slice(0, 2)}-${n.slice(2, 5)}-${n.slice(5)}`;
    return `${n.slice(0, 2)}-${n.slice(2, 6)}-${n.slice(6, 10)}`;
  }
  if (n.length <= 3) return n;
  if (n.length <= 7) return `${n.slice(0, 3)}-${n.slice(3)}`;
  if (n.length <= 10) return `${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6)}`;
  return `${n.slice(0, 3)}-${n.slice(3, 7)}-${n.slice(7, 11)}`;
};

export default function AgencyQuickEditModal({ open, ownerId, darkMode = false, mobile = false, settingsHref, onClose, onSaved }: Props) {
  const [info, setInfo] = useState<AgencyQuickInfo>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !ownerId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("agencies").select("*").eq("owner_id", ownerId).maybeSingle();
      if (cancelled) return;
      setInfo({
        name: data?.name || "",
        ceo_name: data?.ceo_name || "",
        phone: data?.phone || "",
        cell: data?.cell || "",
        address: data?.address || "",
        address_detail: data?.address_detail || "",
        reg_num: data?.reg_num || "",
        biz_num: data?.biz_num || "",
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, ownerId]);

  if (!open) return null;

  const set = (field: keyof AgencyQuickInfo) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === "phone" || field === "cell" ? formatPhone(e.target.value) : e.target.value;
    setInfo((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!info.name.trim() || !info.ceo_name.trim() || !info.cell.trim()) {
      alert("상호명, 대표자명, 휴대번호는 비워 둘 수 없습니다.");
      return;
    }
    setSaving(true);
    try {
      const res = await adminUpdateAgency(ownerId, {
        name: info.name.trim(),
        ceo_name: info.ceo_name.trim(),
        phone: info.phone.trim(),
        cell: info.cell.trim(),
        address_detail: info.address_detail.trim(),
      });
      if (!res.success) {
        alert("저장하지 못했습니다: " + ("error" in res ? res.error : ""));
        return;
      }
      onSaved(info);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const text = darkMode ? "#e1e4e8" : "#111827";
  const sub = darkMode ? "#9ca3af" : "#6b7280";
  const border = darkMode ? "#3f3f46" : "#e5e7eb";
  const inputStyle: React.CSSProperties = {
    width: "100%", height: 42, padding: "0 12px", borderRadius: 8, fontSize: 14, boxSizing: "border-box",
    border: `1px solid ${darkMode ? "#444" : "#d1d5db"}`, background: darkMode ? "#2c2d31" : "#fff", color: text, outline: "none",
  };
  const lockedStyle: React.CSSProperties = { ...inputStyle, background: darkMode ? "#333" : "#f3f4f6", color: sub };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: sub, marginBottom: 6 };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: mobile ? "flex-end" : "center", justifyContent: "center", zIndex: 10000 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: darkMode ? "#1f2023" : "#fff", color: text, width: mobile ? "100%" : 560, maxWidth: "100%",
          maxHeight: mobile ? "90vh" : "86vh", overflowY: "auto", boxSizing: "border-box",
          borderRadius: mobile ? "16px 16px 0 0" : 14, padding: mobile ? "20px 16px 24px" : "24px 28px", boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>🏘️ 부동산 / 기업 정보 수정</h3>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: sub, cursor: "pointer" }}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: sub, margin: "0 0 18px" }}>여기서 고친 내용은 정보설정에도 그대로 저장됩니다. 작성 중인 공실 내용은 사라지지 않아요.</p>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: sub }}>⏳ 불러오는 중...</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: "14px 16px" }}>
              <div>
                <label style={labelStyle}>상호명</label>
                <input type="text" value={info.name} onChange={set("name")} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>대표자명</label>
                <input type="text" value={info.ceo_name} onChange={set("ceo_name")} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>일반번호</label>
                <input type="text" value={info.phone} onChange={set("phone")} style={inputStyle} placeholder="02-000-0000" />
              </div>
              <div>
                <label style={labelStyle}>휴대번호</label>
                <input type="text" value={info.cell} onChange={set("cell")} style={inputStyle} placeholder="010-0000-0000" />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>부동산 주소</label>
                <input type="text" value={info.address} readOnly style={{ ...lockedStyle, marginBottom: 8 }} />
                <input type="text" value={info.address_detail} onChange={set("address_detail")} style={inputStyle} placeholder="상세주소" />
              </div>
              <div>
                <label style={labelStyle}>중개등록번호</label>
                <input type="text" value={info.reg_num} readOnly style={lockedStyle} />
              </div>
              <div>
                <label style={labelStyle}>사업자등록번호</label>
                <input type="text" value={info.biz_num} readOnly style={lockedStyle} />
              </div>
            </div>

            <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 8, background: darkMode ? "#2a2b2f" : "#f8fafc", border: `1px solid ${border}`, fontSize: 12, color: sub, lineHeight: 1.5 }}>
              중개등록번호·사업자등록번호·기본주소는 서류 확인이 필요해 정보설정에서 바꿀 수 있어요.{" "}
              <a href={settingsHref} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", fontWeight: 700 }}>정보설정 새 창으로 열기 ↗</a>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button type="button" onClick={onClose} style={{ flex: 1, height: 46, borderRadius: 8, border: `1px solid ${border}`, background: darkMode ? "#2c2d31" : "#fff", color: text, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                취소
              </button>
              <button type="button" onClick={handleSave} disabled={saving} style={{ flex: 2, height: 46, borderRadius: 8, border: "none", background: saving ? "#9ca3af" : "#2563eb", color: "#fff", fontSize: 15, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "저장 중..." : "저장하고 공실 작성으로 돌아가기"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
