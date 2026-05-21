"use client";

import React, { useState } from "react";
import { submitInquiry } from "@/app/actions/inquiry";

export default function InquiryFormClient() {
  const [category, setCategory] = useState("AI온라인전단지");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [agree, setAgree] = useState(false);

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // 전화번호 자동 하이픈 포맷터
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    let formatted = value;

    if (value.length > 3 && value.length <= 7) {
      formatted = `${value.slice(0, 3)}-${value.slice(3)}`;
    } else if (value.length > 7) {
      formatted = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`;
    }
    setPhone(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("성함 또는 상호명을 입력해 주세요.");
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      alert("올바른 연락처를 입력해 주세요.");
      return;
    }
    if (!content.trim() || content.length < 10) {
      alert("문의 내용을 최소 10자 이상 입력해 주세요.");
      return;
    }
    if (!agree) {
      alert("개인정보 수집 및 이용에 동의해 주세요.");
      return;
    }

    setLoading(true);
    const res = await submitInquiry({
      name,
      phone,
      email,
      category,
      title: title || undefined,
      content
    });

    if (res.success) {
      setSubmitted(true);
    } else {
      alert("등록 실패: " + res.message);
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div
        style={{
          maxWidth: 600,
          margin: "80px auto",
          padding: "50px 30px",
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
          textAlign: "center",
          fontFamily: "'Pretendard', sans-serif"
        }}
      >
        <div style={{ fontSize: 60, marginBottom: 20 }}>🎉</div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: "#1e293b", marginBottom: 12 }}>
          문의가 정상적으로 접수되었습니다
        </h2>
        <p style={{ fontSize: 15, color: "#64748b", lineHeight: 1.6, marginBottom: 30 }}>
          보내주신 소중한 문의 내용을 관리자가 확인 중입니다.<br />
          검토 후 신속하게 기재해주신 연락처({phone}) 또는 이메일로 답변해 드리겠습니다.
        </p>
        <button
          onClick={() => (window.location.href = "/")}
          style={{
            height: 48,
            padding: "0 30px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(37,99,235,0.2)",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 6px 18px rgba(37,99,235,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(37,99,235,0.2)";
          }}
        >
          메인페이지로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 650,
        margin: "40px auto 80px",
        background: "#fff",
        borderRadius: 20,
        boxShadow: "0 12px 40px rgba(0,0,0,0.06)",
        overflow: "hidden",
        fontFamily: "'Pretendard', sans-serif"
      }}
    >
      {/* 폼 상단 디자인 데코레이션 */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
          padding: "40px 30px",
          color: "#fff",
          textAlign: "center"
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1, margin: "0 0 10px 0" }}>1:1 맞춤 문의하기</h1>
        <p style={{ fontSize: 14, color: "#bfdbfe", margin: 0, fontWeight: 500, lineHeight: 1.5 }}>
          공실뉴스 플랫폼 매물 등록 및 AI온라인전단지 제작 등<br />
          궁금한 점을 남겨주시면 성심성의껏 답변드리겠습니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: "40px 30px", display: "flex", flexDirection: "column", gap: 24 }}>
        {/* 1. 문의 분류 */}
        <div>
          <label style={{ display: "block", fontSize: 14, fontWeight: 800, color: "#1e293b", marginBottom: 12 }}>
            문의 구분 <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {["AI온라인전단지", "매물 등록", "제휴/제안", "오류 신고", "기타"].map((cat) => {
              const isSelected = category === cat;
              return (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  style={{
                    height: 44,
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: `2px solid ${isSelected ? "#2563eb" : "#e2e8f0"}`,
                    background: isSelected ? "#eff6ff" : "#fff",
                    color: isSelected ? "#2563eb" : "#475569",
                    transition: "all 0.2s"
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. 이름 / 상호명 */}
        <div>
          <label
            htmlFor="name"
            style={{ display: "block", fontSize: 14, fontWeight: 800, color: "#1e293b", marginBottom: 8 }}
          >
            성함 / 상호명 <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름 또는 공인중개사 상호명을 입력해 주세요."
            required
            style={{
              width: "100%",
              height: 46,
              padding: "0 16px",
              border: "1px solid #cbd5e1",
              borderRadius: 10,
              fontSize: 14,
              outline: "none",
              transition: "border-color 0.2s"
            }}
            onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
            onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
          />
        </div>

        {/* 3. 연락처 및 이메일 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label
              htmlFor="phone"
              style={{ display: "block", fontSize: 14, fontWeight: 800, color: "#1e293b", marginBottom: 8 }}
            >
              연락처 <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="010-0000-0000"
              required
              maxLength={13}
              style={{
                width: "100%",
                height: 46,
                padding: "0 16px",
                border: "1px solid #cbd5e1",
                borderRadius: 10,
                fontSize: 14,
                outline: "none",
                transition: "border-color 0.2s"
              }}
              onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
              onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
            />
          </div>
          <div>
            <label
              htmlFor="email"
              style={{ display: "block", fontSize: 14, fontWeight: 800, color: "#1e293b", marginBottom: 8 }}
            >
              이메일 주소 <span style={{ color: "#94a3b8", fontWeight: 500 }}>(선택)</span>
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              style={{
                width: "100%",
                height: 46,
                padding: "0 16px",
                border: "1px solid #cbd5e1",
                borderRadius: 10,
                fontSize: 14,
                outline: "none",
                transition: "border-color 0.2s"
              }}
              onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
              onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
            />
          </div>
        </div>

        {/* 4. 문의 제목 */}
        <div>
          <label
            htmlFor="title"
            style={{ display: "block", fontSize: 14, fontWeight: 800, color: "#1e293b", marginBottom: 8 }}
          >
            문의 제목 <span style={{ color: "#94a3b8", fontWeight: 500 }}>(선택)</span>
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="문의 제목을 입력해 주세요. (미입력 시 본문 요약으로 대체)"
            style={{
              width: "100%",
              height: 46,
              padding: "0 16px",
              border: "1px solid #cbd5e1",
              borderRadius: 10,
              fontSize: 14,
              outline: "none",
              transition: "border-color 0.2s"
            }}
            onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
            onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
          />
        </div>

        {/* 5. 문의 내용 */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <label htmlFor="content" style={{ fontSize: 14, fontWeight: 800, color: "#1e293b" }}>
              문의 내용 <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <span style={{ fontSize: 12, color: content.length >= 10 ? "#10b981" : "#94a3b8", fontWeight: 600 }}>
              {content.length}자 / 최소 10자
            </span>
          </div>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="궁금하신 내용이나 요청 사항을 최대한 구체적으로 작성해 주시면 빠르고 정확한 답변에 큰 도움이 됩니다. (최소 10자 이상)"
            required
            style={{
              width: "100%",
              height: 180,
              padding: "14px 16px",
              border: "1px solid #cbd5e1",
              borderRadius: 10,
              fontSize: 14,
              outline: "none",
              resize: "none",
              lineHeight: 1.6,
              transition: "border-color 0.2s"
            }}
            onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
            onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
          />
        </div>

        {/* 6. 약관 동의 */}
        <div
          style={{
            background: "#f8fafc",
            padding: "16px 20px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: 12
          }}
        >
          <input
            type="checkbox"
            id="agree"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: "#2563eb", cursor: "pointer" }}
          />
          <label htmlFor="agree" style={{ fontSize: 13, color: "#475569", fontWeight: 600, cursor: "pointer" }}>
            [필수] 개인정보 수집 및 이용 동의 (답변 및 연락 목적)
          </label>
        </div>

        {/* 7. 제출 버튼 */}
        <button
          type="submit"
          disabled={loading}
          style={{
            height: 52,
            background: loading ? "#93c5fd" : "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 800,
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: "0 4px 12px rgba(37,99,235,0.2)",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.background = "#1d4ed8";
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.background = "#2563eb";
            }
          }}
        >
          {loading ? "등록 처리 중..." : "문의하기 등록 완료"}
        </button>
      </form>
    </div>
  );
}
