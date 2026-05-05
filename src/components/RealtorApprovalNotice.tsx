"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

/**
 * RealtorApprovalNotice
 * - 부동산회원 승인 완료 시 축하 모달 표시
 * - 반려 시 재제출 안내 배너 표시
 * - 심사 중 상태 뱃지 표시
 * 
 * 이 컴포넌트를 레이아웃 또는 상위 컴포넌트에 한 번만 배치하면,
 * 로그인 시 자동으로 agencies 상태를 확인하고 적절한 알림을 표시합니다.
 */
export default function RealtorApprovalNotice() {
  const [showCelebration, setShowCelebration] = useState(false);
  const [rejectInfo, setRejectInfo] = useState<{ reason: string } | null>(null);
  const [pendingInfo, setPendingInfo] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    checkApprovalStatus();
  }, []);

  const checkApprovalStatus = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // members 정보 확인
      const { data: member } = await supabase
        .from("members")
        .select("role, signup_completed")
        .eq("id", user.id)
        .single();
      if (!member || !member.signup_completed) return;

      // agencies 정보 확인
      const { data: agency } = await supabase
        .from("agencies")
        .select("status, reject_reason")
        .eq("owner_id", user.id)
        .single();
      if (!agency) return;

      // 승인 완료 체크 (APPROVED 상태인데 축하 모달을 아직 안 본 경우)
      if (agency.status === "APPROVED" && member.role === "REALTOR") {
        const celebrationKey = `realtor_celebration_shown_${user.id}`;
        const alreadyShown = localStorage.getItem(celebrationKey);
        if (!alreadyShown) {
          setShowCelebration(true);
          localStorage.setItem(celebrationKey, "true");
        }
      }

      // 반려 상태 체크
      if (agency.status === "REJECTED") {
        setRejectInfo({ reason: agency.reject_reason || "서류를 다시 확인해 주세요" });
      }

      // 심사 중 상태 체크
      if (agency.status === "PENDING") {
        setPendingInfo(true);
      }
    } catch (err) {
      console.error("RealtorApprovalNotice error:", err);
    }
  };

  if (!mounted) return null;

  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  // 🎉 승인 완료 축하 모달
  if (showCelebration) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 99999999,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, boxSizing: "border-box"
      }}>
        <div
          onClick={() => setShowCelebration(false)}
          style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)"
          }}
        />
        <div style={{
          position: "relative", background: "#fff", width: 480, maxWidth: "100%",
          borderRadius: 16, boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
          overflow: "hidden", animation: "celebrationFadeIn 0.4s ease-out"
        }}>
          <style>{`
            @keyframes celebrationFadeIn {
              from { opacity: 0; transform: scale(0.9) translateY(20px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
          
          {/* 상단 그라데이션 헤더 */}
          <div style={{
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            padding: "36px 24px 28px", textAlign: "center", color: "#fff"
          }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 8px" }}>
              부동산회원 승인 완료!
            </h2>
            <p style={{ fontSize: 14, opacity: 0.9, margin: 0, lineHeight: 1.5 }}>
              축하합니다! 이제 모든 서비스를 이용하실 수 있습니다.
            </p>
          </div>

          {/* 혜택 안내 */}
          <div style={{ padding: "24px 28px" }}>
            <div style={{
              background: "#f0fdf4", borderRadius: 12, padding: "16px 20px",
              marginBottom: 20, border: "1px solid #bbf7d0"
            }}>
              <p style={{ fontSize: 14, color: "#166534", margin: 0, lineHeight: 1.6 }}>
                ✅ 공실광고 무료 등록<br/>
                ✅ 기사 작성 및 게재<br/>
                ✅ 고객 관리 (CRM)<br/>
                ✅ 전용 대시보드 이용
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={() => {
                  setShowCelebration(false);
                  router.push(isMobile ? "/m/admin/vacancy" : "/realty_admin?menu=vacancy");
                }}
                style={{
                  width: "100%", padding: "14px 0",
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  color: "#fff", border: "none", borderRadius: 10,
                  fontSize: 16, fontWeight: 800, cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)"
                }}
              >
                공실 등록하러 가기 →
              </button>
              <button
                onClick={() => setShowCelebration(false)}
                style={{
                  width: "100%", padding: "14px 0",
                  background: "#f5f5f5", color: "#666", border: "none",
                  borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer"
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ⚠️ 반려 시 상단 배너 (페이지 최상단에 표시)
  if (rejectInfo) {
    return (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 9990,
        background: "linear-gradient(90deg, #fef2f2, #fee2e2)",
        borderBottom: "2px solid #fca5a5",
        padding: "10px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, flexWrap: "wrap"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#b91c1c" }}>
            서류 재제출 필요: {rejectInfo.reason}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              router.push(isMobile ? "/m/admin/settings" : "/realty_admin?menu=settings&tab=agency");
              setRejectInfo(null);
            }}
            style={{
              padding: "6px 14px", background: "#ef4444", color: "#fff",
              border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700,
              cursor: "pointer"
            }}
          >
            서류 수정하기
          </button>
          <button
            onClick={() => setRejectInfo(null)}
            style={{
              padding: "6px 10px", background: "none", color: "#b91c1c",
              border: "1px solid #fca5a5", borderRadius: 6, fontSize: 12,
              fontWeight: 600, cursor: "pointer"
            }}
          >
            닫기
          </button>
        </div>
      </div>
    );
  }

  return null;
}
