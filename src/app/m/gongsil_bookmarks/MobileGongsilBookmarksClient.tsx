"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { toggleWishlistToDB } from "@/app/actions/vacancyUserData";

function formatPrice(v: any): string {
  const dep = v.deposit || 0;
  const rent = v.monthly_rent || 0;
  const trade = v.trade_type || "";
  
  const formatAmount = (amt: number) => {
    if (!amt) return "";
    const m = Math.round(amt / 10000);
    if (m === 0) return "";

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
      
      if (rest) {
        result += (result && !result.endsWith(" ") ? " " : "") + rest;
        if (e === 0 && c === 0 && rem > 0) result += "만";
      }
    }
    return result || "";
  };

  if (trade === "월세" && rent > 0) {
    const monthlyManwon = Math.round(rent / 10000);
    return `${formatAmount(dep)}/${monthlyManwon}만`;
  }
  if (dep > 0) return `${formatAmount(dep)}`;
  if (v.sale_price > 0) return `${formatAmount(v.sale_price)}`;
  return "-";
}

export default function MobileGongsilBookmarksClient() {
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function fetchBookmarks() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("로그인이 필요합니다.");
        router.push("/m");
        return;
      }
      setUser(user);

      // Fetch wishlist IDs from Supabase
      const { data: wishData } = await supabase
        .from("vacancy_wishlist")
        .select("vacancy_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const wishIds = (wishData || []).map((row: any) => row.vacancy_id);

      if (wishIds.length > 0) {
        const { data: props } = await supabase
          .from("vacancies")
          .select("*, vacancy_photos(url, sort_order)")
          .in("id", wishIds)
          .neq("status", "DELETED");

        if (props) {
          const sortedProps = wishIds.map((id: string) => props.find((p: any) => p.id === id)).filter(Boolean);
          const withImages = sortedProps.map((p: any) => ({
            ...p,
            images: p.vacancy_photos ? [...p.vacancy_photos].sort((a:any, b:any) => a.sort_order - b.sort_order).map((pt:any) => pt.url) : []
          }));
          
          setProperties(withImages);
        }
      }
      setLoading(false);
    }
    fetchBookmarks();
  }, [router]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f9fafb", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "#fff", display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 10 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", marginLeft: "-4px", marginRight: "8px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#111", margin: 0 }}>매물 <span style={{ color: "#f97316" }}>{properties.length}</span>개</h2>
      </div>

      {/* List */}
      <div style={{ padding: "0 16px 20px", background: "#fff", flex: 1 }}>
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#9ca3af" }}>로딩 중...</div>
        ) : properties.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>🏢</div>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "#333", marginBottom: "8px" }}>찜한 매물이 없습니다.</p>
            <p style={{ fontSize: "14px" }}>지도에서 관심있는 매물의 하트를 눌러보세요.</p>
          </div>
        ) : (
          properties.map((v: any) => {
            const cardAddr = v.building_name || [v.dong, v.sigungu].filter(Boolean).join(" ");
            return (
              <div
                key={v.id}
                onClick={() => router.push(`/m/gongsil?id=${v.id}`)}
                style={{ display: "flex", gap: "12px", padding: "16px 0", borderBottom: "1px solid #f3f4f6", cursor: "pointer", transition: "background 0.15s", background: "#fff" }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#ef4444" }}>{v.vacancy_no || '-'}</span>
                    <span style={{ fontSize: "12px", color: "#9ca3af" }}>{v.created_at ? new Date(v.created_at).toLocaleDateString("ko-KR").slice(0, -1) : ""}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <p style={{ fontSize: "16px", fontWeight: 800, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {cardAddr}
                    </p>
                  </div>
                  
                  <p style={{ fontSize: "18px", fontWeight: 800, color: "#1a73e8", marginBottom: "6px" }}>
                    {v.trade_type} {formatPrice(v)}
                  </p>
                  
                  <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {[v.property_type || "건물", v.direction, v.exclusive_m2 && `${v.exclusive_m2}㎡`].filter(Boolean).join(" | ")}
                  </p>
                  
                  <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {[v.room_count !== undefined ? `룸 ${v.room_count}개` : null, v.bath_count !== undefined ? `욕실 ${v.bath_count}개` : null, ...(v.options || [])].filter(Boolean).join(", ")}
                  </p>

                  {v.themes && v.themes.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                      {v.themes.map((theme: string, idx: number) => (
                        <span key={idx} style={{ background: "#f8fafc", color: "#3b82f6", fontSize: "12px", padding: "2px 8px", borderRadius: "12px", fontWeight: 700, border: "1px solid #bfdbfe" }}>
                          {theme.startsWith('#') ? theme : `# ${theme}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" style={{ flexShrink: 0, alignSelf: "center" }}><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
