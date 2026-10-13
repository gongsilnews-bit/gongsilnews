"use client";

import React, { useEffect, useState } from "react";
import {
  DEFAULT_WATERMARK_CHOICE,
  loadWatermarkChoice,
  saveWatermarkChoice,
  type WatermarkChoice,
  type WatermarkKind,
} from "@/utils/centerWatermark";

/** 복사방지 로고 설정 — 지난번 고른 값을 기억한다 */
export function useWatermarkChoice() {
  const [choice, setChoice] = useState<WatermarkChoice>(DEFAULT_WATERMARK_CHOICE);
  useEffect(() => {
    // 브라우저 저장소는 화면이 뜬 뒤에만 읽을 수 있다
    const timer = window.setTimeout(() => setChoice(loadWatermarkChoice()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const update = (next: WatermarkChoice) => {
    setChoice(next);
    saveWatermarkChoice(next);
  };
  return [choice, update] as const;
}

interface Props {
  choice: WatermarkChoice;
  onChange: (next: WatermarkChoice) => void;
  /** 비어 있으면 [상호명] 대신 공실뉴스 로고만 고를 수 있다 */
  companyName: string;
  darkMode?: boolean;
  mobile?: boolean;
}

export default function WatermarkPicker({ choice, onChange, companyName, darkMode = false, mobile = false }: Props) {
  const hasCompany = !!companyName.trim();
  const kind: WatermarkKind = hasCompany ? choice.kind : "logo";
  const text = darkMode ? "#e1e4e8" : "#111827";
  const sub = darkMode ? "#9ca3af" : "#6b7280";

  const chip = (value: WatermarkKind, label: string) => {
    const active = choice.on && kind === value;
    return (
      <button
        type="button"
        disabled={!choice.on}
        onClick={() => onChange({ ...choice, kind: value })}
        style={{
          height: 32, padding: "0 12px", borderRadius: 16, fontSize: 13, fontWeight: 700,
          maxWidth: mobile ? "100%" : 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          border: active ? "1.5px solid #2563eb" : `1px solid ${darkMode ? "#444" : "#d1d5db"}`,
          background: active ? (darkMode ? "#1e3a5f" : "#eff6ff") : (darkMode ? "#2c2d31" : "#fff"),
          color: active ? "#2563eb" : sub,
          cursor: choice.on ? "pointer" : "not-allowed", opacity: choice.on ? 1 : 0.5,
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700, color: text, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={choice.on}
          onChange={(e) => onChange({ ...choice, on: e.target.checked })}
          style={{ width: 17, height: 17, accentColor: "#2563eb" }}
        />
        사진 가운데에 복사방지 로고 넣기
      </label>
      {hasCompany && chip("company", `우리 사무소 상호명 (${companyName.trim()})`)}
      {chip("logo", "공실뉴스 로고")}
      <div style={{ width: "100%", fontSize: 12, color: sub }}>
        새로 올리는 사진에 반투명 로고가 새겨집니다. 이미 올린 사진은 바뀌지 않아요.
      </div>
    </div>
  );
}
