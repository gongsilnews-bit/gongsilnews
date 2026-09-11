"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface ArticleAttachedVacancyCardProps {
  vacancy: {
    id: string;
    title: string;
    building_name?: string;
    dong?: string;
    trade_type: string;
    deposit?: number;
    monthly_rent?: number;
    property_type?: string;
    exclusive_m2?: number;
    room_count?: number;
    bath_count?: number;
    themes?: string[];
    photo_url?: string;
  };
  isMobile?: boolean;
}

function formatMoney(val?: number) {
  if (!val || val === 0) return "0";
  const m = Math.round(val / 10000);
  if (m === 0) return "0";
  const e = Math.floor(m / 10000);
  const r = m % 10000;
  let result = "";
  if (e > 0) result += `${e}억`;
  if (r > 0) {
    const c = Math.floor(r / 1000);
    const rem = r % 1000;
    let rest = "";
    if (c > 0) rest += `${c}천`;
    if (rem > 0) rest += `${rem}`;
    result += (result ? " " : "") + rest + "만";
  }
  return result || "0";
}

export default function ArticleAttachedVacancyCard({
  vacancy,
  isMobile = false,
}: ArticleAttachedVacancyCardProps) {
  const router = useRouter();
  if (!vacancy || !vacancy.id) return null;

  let priceText = vacancy.trade_type;
  if (vacancy.trade_type === "매매" || vacancy.trade_type === "전세") {
    priceText += ` ${formatMoney(vacancy.deposit)}`;
  } else if (vacancy.trade_type === "월세") {
    priceText += ` ${formatMoney(vacancy.deposit || 0)} / ${formatMoney(vacancy.monthly_rent || 0)}`;
  } else if (vacancy.trade_type === "단기") {
    priceText += ` ${formatMoney(vacancy.deposit || 0)} / ${formatMoney(vacancy.monthly_rent || 0)}`;
  }

  const py = vacancy.exclusive_m2 ? (vacancy.exclusive_m2 * 0.3025).toFixed(1) : null;
  const areaText = vacancy.exclusive_m2 ? `${vacancy.exclusive_m2}㎡ (${py}평)` : "";

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isMobile) {
      router.push(`/m/gongsil/detail/${encodeURIComponent(vacancy.id)}`);
      return;
    }

    const popupW = 620;
    const popupH = 880;
    const left = Math.max(20, window.screen.width - popupW - 40);
    const top = 60;
    const features = `width=${popupW},height=${popupH},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no,location=no`;
    window.open(`/gongsil/detail/${vacancy.id}`, `gongsil_popup_${vacancy.id}`, features);
  };

  return (
    <div
      className="sb-widget"
      style={{
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        padding: "16px",
        marginBottom: "20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: "#111827",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #f3f4f6",
          paddingBottom: 10,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#2563eb", fontSize: 16 }}>🏢</span> 추천 공실
        </span>
        <span
          style={{
            fontSize: 11,
            color: "#059669",
            background: "#ecfdf5",
            padding: "2px 8px",
            borderRadius: 12,
            fontWeight: 700,
          }}
        >
          실매물 확인
        </span>
      </div>

      <div
        onClick={handleClick}
        style={{
          cursor: "pointer",
          borderRadius: 8,
          transition: "transform 0.15s ease, background 0.15s ease",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        {vacancy.photo_url && (
          <div
            style={{
              position: "relative",
              width: "100%",
              height: 160,
              borderRadius: 8,
              overflow: "hidden",
              background: "#f3f4f6",
            }}
          >
            <Image
              src={vacancy.photo_url}
              alt={vacancy.title || "공실 사진"}
              fill
              sizes="(max-width: 768px) 100vw, 320px"
              style={{ objectFit: "cover" }}
            />
          </div>
        )}

        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#111827",
              marginBottom: 4,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={vacancy.title}
          >
            {vacancy.title}
          </div>

          <div
            style={{
              color: "#1a73e8",
              fontWeight: 800,
              fontSize: 18,
              marginBottom: 6,
            }}
          >
            {priceText}
          </div>

          <div
            style={{
              fontSize: 13,
              color: "#4b5563",
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
              marginBottom: 6,
            }}
          >
            <span>{vacancy.property_type || "부동산"}</span>
            {areaText && (
              <>
                <span style={{ color: "#d1d5db" }}>|</span>
                <span>{areaText}</span>
              </>
            )}
            {((vacancy.room_count || 0) > 0 || (vacancy.bath_count || 0) > 0) && (
              <>
                <span style={{ color: "#d1d5db" }}>|</span>
                <span>
                  룸 {vacancy.room_count || 0} / 욕실 {vacancy.bath_count || 0}
                </span>
              </>
            )}
          </div>

          {vacancy.themes && vacancy.themes.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
              {vacancy.themes.slice(0, 3).map((theme: string, idx: number) => (
                <span
                  key={idx}
                  style={{
                    background: "#eff6ff",
                    color: "#2563eb",
                    fontSize: 11,
                    padding: "2px 6px",
                    borderRadius: 4,
                    fontWeight: 600,
                  }}
                >
                  {theme.startsWith("#") ? theme : `# ${theme}`}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
