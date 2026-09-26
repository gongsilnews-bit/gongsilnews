"use client";

import React from "react";

export interface ArticleVacancySlotProps {
  /** 기사에 공실을 붙일 수 있는 회원인가 (can_article_vacancy_banner) */
  canAttach: boolean;
  /** 붙일 수 있는 공실 목록 (본인 매물 · 광고중 · 일반인노출) */
  vacancies: any[];
  /** 선택된 공실 ID. 빈 문자열이면 노출 안함 */
  attachedVacancyId: string;
  setAttachedVacancyId: (id: string) => void;
  /** 이미 연결됐지만 지금은 목록에 없는 공실(광고종료 등)의 표시 이름 */
  attachedVacancyTitle: string;
  border: string;
  textPrimary: string;
  textMuted: string;
}

/* 금액은 원 단위로 저장돼 있어 만원·억 단위로 줄여 보여준다 */
const formatMoney = (val?: number) => {
  const m = Math.round((val || 0) / 10000);
  if (m <= 0) return "0";
  const eok = Math.floor(m / 10000);
  const man = m % 10000;
  return `${eok > 0 ? `${eok}억` : ""}${man > 0 ? `${man}만` : ""}`;
};

const vacancyLabel = (v: any) => {
  const price =
    v.trade_type === "월세" || v.trade_type === "단기"
      ? `${v.trade_type} ${formatMoney(v.deposit)}/${formatMoney(v.monthly_rent)}`
      : `${v.trade_type} ${formatMoney(v.deposit)}`;
  const addr = v.building_name || [v.dong, v.sigungu].filter(Boolean).join(" ") || "공실";
  return `[${price}] ${addr}${v.exclusive_m2 ? ` (${v.exclusive_m2}㎡)` : ""}`;
};

export default function ArticleVacancySlot({
  canAttach,
  vacancies,
  attachedVacancyId,
  setAttachedVacancyId,
  attachedVacancyTitle,
  border,
  textPrimary,
  textMuted,
}: ArticleVacancySlotProps) {
  const isMissingFromList = !!attachedVacancyId && !vacancies.some(v => v.id === attachedVacancyId);

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 32, minWidth: 0 }}>
      <label style={{ fontSize: 14, fontWeight: 600, color: textPrimary, minWidth: 80, paddingTop: 10, flexShrink: 0 }}>공실광고</label>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <select
          value={attachedVacancyId}
          onChange={e => setAttachedVacancyId(e.target.value)}
          disabled={!canAttach}
          style={{
            width: "100%", padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 6, fontSize: 14,
            color: textPrimary, background: canAttach ? "#fff" : "#f3f4f6", outline: "none",
            cursor: canAttach ? "pointer" : "not-allowed",
          }}
        >
          <option value="">노출 안함</option>
          {isMissingFromList && <option value={attachedVacancyId}>{attachedVacancyTitle || "연결된 공실"} (현재 연결됨)</option>}
          {vacancies.map(v => (
            <option key={v.id} value={v.id}>{vacancyLabel(v)}</option>
          ))}
        </select>
        <div style={{ fontSize: 12, color: textMuted, lineHeight: 1.5 }}>
          {!canAttach
            ? "공실뉴스부동산 / 공실스터디부동산 유료 회원 전용 기능입니다."
            : vacancies.length === 0
              ? "연결할 수 있는 공실이 없습니다. 광고중이면서 일반인에게도 노출되는 내 공실만 선택할 수 있습니다."
              : "선택한 공실이 기사 하단에 추천 공실로 노출됩니다."}
        </div>
      </div>
    </div>
  );
}
