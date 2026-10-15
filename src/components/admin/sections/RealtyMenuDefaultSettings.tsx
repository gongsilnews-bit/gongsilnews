"use client";

import React, { useEffect, useState } from "react";
import { FACTORY_LAYOUT, normalizeLayout, MenuLayoutEditor, type MenuLayout } from "@/components/admin/realtyMenu";
import { getRealtyMenu, saveRealtyMenuDefault } from "@/app/actions/realtyMenu";

/**
 * 최고관리자: 중개사 관리자 메뉴 기본값 (회원관리 > 중개사 메뉴 기본값)
 * 메뉴를 직접 바꾸지 않은 모든 중개사 회원에게 이 구성이 보인다.
 * 직접 바꾼 회원은 자기 구성을 그대로 쓰고, 새로 생긴 메뉴만 이 기본값의 자리에 붙는다.
 */
type Theme = { cardBg: string; textPrimary: string; textSecondary: string; border: string; bg?: string };

export default function RealtyMenuDefaultSettings({ theme }: { theme: Theme }) {
  const [layout, setLayout] = useState<MenuLayout | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    getRealtyMenu().then((r) => setLayout(normalizeLayout(r.defaultLayout)));
  }, []);

  const save = async () => {
    if (!layout) return;
    setSaving(true);
    setMsg(null);
    const res = await saveRealtyMenuDefault(layout);
    setSaving(false);
    setMsg(res.success ? { ok: true, text: "저장했습니다. 메뉴를 직접 바꾸지 않은 회원에게 바로 적용됩니다." } : { ok: false, text: res.error || "저장하지 못했습니다." });
  };

  return (
    <div style={{ background: theme.cardBg, borderRadius: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", padding: "22px 24px" }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800, color: theme.textPrimary }}>중개사 메뉴 기본값</h3>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: theme.textSecondary, lineHeight: 1.7 }}>
        중개사 관리자 화면(웹·PC 앱) 왼쪽 메뉴의 기본 구성입니다. 회원은 [메뉴 편집]으로 자기 메뉴를 따로 바꿀 수 있고,
        바꾼 회원에게는 회원 구성이 우선합니다. 새 기능 메뉴를 모든 회원 화면 위쪽에 올리고 싶을 때 여기서 업무로 옮기세요.
      </p>
      {!layout ? (
        <div style={{ fontSize: 14, color: theme.textSecondary }}>불러오는 중…</div>
      ) : (
        <>
          <MenuLayoutEditor theme={theme} value={layout} onChange={setLayout} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
            <button onClick={save} disabled={saving}
              style={{ padding: "10px 18px", borderRadius: 8, border: 0, background: "#1a3a6b", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
              {saving ? "저장 중…" : "기본값 저장"}
            </button>
            <button onClick={() => setLayout({ main: [...FACTORY_LAYOUT.main], more: [...FACTORY_LAYOUT.more] })} disabled={saving}
              style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${theme.border}`, background: "transparent", color: theme.textSecondary, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              처음 구성으로
            </button>
            {msg && <span style={{ fontSize: 13, color: msg.ok ? "#16a34a" : "#c53030" }}>{msg.text}</span>}
          </div>
        </>
      )}
    </div>
  );
}
