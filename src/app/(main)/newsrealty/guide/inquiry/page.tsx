"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NewsrealtyHeader from "@/components/newsrealty/NewsrealtyHeader";
import GuideTabs from "@/components/newsrealty/GuideTabs";
import { createClient } from "@/utils/supabase/client";
import { saveBoardPost } from "@/app/actions/board";

/** 폼의 문의 유형 → 1:1문의 게시판 카테고리
 *  게시판 카테고리로 맞춰야 관리 화면의 카테고리 필터가 동작한다.
 *  구체적인 유형은 본문 첫 줄에 남겨 정보를 잃지 않는다. */
const CATEGORY_MAP: Record<string, string> = {
  "입점 및 가입 문의": "공실뉴스부동산",
  "매물 기사 송출 문의": "공실뉴스부동산",
  "공동중개망 이용 문의": "공실뉴스부동산",
  "뉴스 광고 영업 수익 문의": "광고/협업제안",
  "결제 및 세금계산서 문의": "기타",
  "기타 일반 문의": "기타",
};

export default function GuideInquiryPage() {
  const pathname = usePathname();
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<{ id: string; name: string; phone: string; email: string } | null>(null);
  const [formData, setFormData] = useState({
    category: "입점 및 가입 문의",
    brokerName: "",
    phone: "",
    email: "",
    title: "",
    content: "",
  });

  // 문의는 회원 전용이다. 답변을 회신하고 본인이 확인할 수 있어야 하기 때문.
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (authUser) {
        const { data: member } = await supabase
          .from("members")
          .select("name, phone, email")
          .eq("id", authUser.id)
          .single();
        const info = {
          id: authUser.id,
          name: member?.name || "",
          phone: member?.phone || "",
          email: member?.email || authUser.email || "",
        };
        setUser(info);
        // 회원정보로 자동 채우되 수정할 수 있게 둔다
        setFormData(prev => ({ ...prev, brokerName: info.name, phone: info.phone, email: info.email }));
      }
      setAuthChecked(true);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving) return;

    setSaving(true);
    const boardCategory = CATEGORY_MAP[formData.category] || "기타";
    const res = await saveBoardPost({
      board_id: "inquiry",
      title: `[${boardCategory}] ${formData.title.trim()}`,
      content: `문의 유형: ${formData.category}\n\n${formData.content.trim()}`,
      author_id: user.id,
      author_name: formData.brokerName.trim() || user.name || "회원",
      author_phone: formData.phone.trim(),
      author_email: formData.email.trim(),
    });
    setSaving(false);

    if (!res.success) {
      alert("문의 접수에 실패했습니다: " + res.error);
      return;
    }
    setSubmitted(true);
  };

  return (
    <div style={{ backgroundColor: "#ffffff", color: "#1e293b", minHeight: "100vh", fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      {/* ━━━ GNB 헤더 ━━━ */}
      <NewsrealtyHeader />

      {/* ━━━ 직방 호갱노노 CEO 1:1 동일 4분할 탭 ━━━ */}
      <GuideTabs activeTab="inquiry" />

      {/* ━━━ 본문 영역 ━━━ */}
      <main style={{ maxWidth: "800px", margin: "0 auto 100px", padding: "0 20px" }}>
        {/* 타이틀 */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#111827", margin: "0 0 6px 0", letterSpacing: "-0.5px" }}>
            1:1문의
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
            시스템 이용 중 궁금하신 점이나 제휴 관련 문의를 남겨주시면 담당자가 신속히 답변해 드립니다.
          </p>
        </div>

        {/* 문의 폼 (직방 스타일 상단 굵은 실선) */}
        <div style={{ borderTop: "2px solid #111827", paddingTop: "32px" }}>
          {!authChecked ? (
            <div style={{ padding: "60px 24px", textAlign: "center", color: "#94a3b8", fontSize: "14.5px" }}>
              확인하는 중입니다...
            </div>
          ) : !user ? (
            /* 문의는 회원 전용 — 답변을 회신하고 본인이 확인할 수 있어야 한다 */
            <div style={{ backgroundColor: "#f8fafc", borderRadius: "16px", padding: "48px 24px", textAlign: "center", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "40px", marginBottom: "16px" }}>🔒</div>
              <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0" }}>
                로그인 후 이용하실 수 있습니다
              </h3>
              <p style={{ fontSize: "14.5px", color: "#64748b", margin: "0 0 24px 0", lineHeight: 1.6 }}>
                문의하신 내용과 담당자의 답변을 내 관리자페이지에서 확인하실 수 있도록<br />
                회원 로그인 후 작성해 주세요.
              </p>
              <Link
                href={`/login?returnTo=${encodeURIComponent(pathname || "/newsrealty/guide/inquiry")}`}
                style={{
                  display: "inline-block", padding: "12px 28px", backgroundColor: "#ff8e15", color: "#ffffff",
                  fontSize: "15px", fontWeight: 700, border: "none", borderRadius: "8px", textDecoration: "none",
                }}
              >
                로그인하고 문의하기
              </Link>
            </div>
          ) : submitted ? (
            <div
              style={{
                backgroundColor: "#f8fafc",
                borderRadius: "16px",
                padding: "48px 24px",
                textAlign: "center",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ fontSize: "40px", marginBottom: "16px" }}>✅</div>
              <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0" }}>
                1:1 문의가 정상적으로 접수되었습니다
              </h3>
              <p style={{ fontSize: "14.5px", color: "#64748b", margin: "0 0 24px 0", lineHeight: 1.6 }}>
                남겨주신 연락처로 담당 매니저가 확인 후 신속히 안내해 드리겠습니다.<br />
                (운영시간: 평일 10:00 ~ 18:00)
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                style={{
                  padding: "10px 24px",
                  backgroundColor: "#ff8e15",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 700,
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                추가 문의 작성하기
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* 문의 유형 */}
              <div>
                <label style={{ display: "block", fontSize: "13.5px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>
                  문의 유형 <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{
                    width: "100%",
                    height: "46px",
                    padding: "0 14px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    color: "#1f2937",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <option value="입점 및 가입 문의">입점 및 가입 문의</option>
                  <option value="매물 기사 송출 문의">매물 기사 송출 문의</option>
                  <option value="공동중개망 이용 문의">공동중개망 이용 문의</option>
                  <option value="뉴스 광고 영업 수익 문의">뉴스 광고 영업 수익 문의</option>
                  <option value="결제 및 세금계산서 문의">결제 및 세금계산서 문의</option>
                  <option value="기타 일반 문의">기타 일반 문의</option>
                </select>
              </div>

              {/* 중개업소명 & 연락처 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13.5px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>
                    중개업소명 / 성함 <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="예: 공실부동산 김대표"
                    value={formData.brokerName}
                    onChange={(e) => setFormData({ ...formData, brokerName: e.target.value })}
                    style={{
                      width: "100%",
                      height: "46px",
                      padding: "0 14px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13.5px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>
                    휴대전화 번호 <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="예: 010-1234-5678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{
                      width: "100%",
                      height: "46px",
                      padding: "0 14px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* 제목 */}
              <div>
                <label style={{ display: "block", fontSize: "13.5px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>
                  문의 제목 <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="문의하실 내용을 간략히 입력해 주세요"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{
                    width: "100%",
                    height: "46px",
                    padding: "0 14px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* 내용 */}
              <div>
                <label style={{ display: "block", fontSize: "13.5px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>
                  문의 내용 <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="궁금하신 사항을 자세히 적어주시면 더욱 정확한 상담이 가능합니다."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    lineHeight: 1.6,
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* 제출 버튼 */}
              <div style={{ textAlign: "center", marginTop: "12px" }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "14px 44px",
                    backgroundColor: saving ? "#cbd5e1" : "#ff8e15",
                    color: "#ffffff",
                    fontSize: "16px",
                    fontWeight: 800,
                    border: "none",
                    borderRadius: "8px",
                    cursor: saving ? "not-allowed" : "pointer",
                    boxShadow: saving ? "none" : "0 4px 14px rgba(255, 142, 21, 0.3)",
                  }}
                >
                  {saving ? "접수 중..." : "1:1 문의 접수하기"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* ━━━ 푸터 ━━━ */}
      <footer style={{ backgroundColor: "#0f172a", borderTop: "1px solid #1e293b", padding: "30px 20px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
        © {new Date().getFullYear()} 공실뉴스부동산. All rights reserved. 대표전화 1555-5343
      </footer>
    </div>
  );
}
