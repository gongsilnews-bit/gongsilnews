"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import NewsrealtyApplyView, { type ApplyStage } from "@/components/newsrealty/NewsrealtyApplyView";
import { submitNewsrealtyApplication, checkExistingNewsrealtyApplication } from "@/app/actions/newsrealtyApply";

export default function MobileNewsRealtyApplyPage() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);

  // 이메일 분리
  const [emailLocal, setEmailLocal] = useState("");
  const [emailDomain, setEmailDomain] = useState("");
  const [customDomain, setCustomDomain] = useState("");

  // 폼 상태: 신청자 정보 위주
  const [applicantName, setApplicantName] = useState("");
  const [phone, setPhone] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [termsAccordionOpen, setTermsAccordionOpen] = useState(false);

  // 기존 신청 내역 상태
  const [existingApplication, setExistingApplication] = useState<any>(null);

  // 모달 및 서브밋 상태
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadUserData() {
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setAuthLoading(false);

        if (authUser) {
          setUser(authUser);

          const { data: memberData } = await supabase
            .from("members")
            .select("*")
            .eq("id", authUser.id)
            .maybeSingle();

          const { data: agencyData } = await supabase
            .from("agencies")
            .select("*")
            .eq("owner_id", authUser.id)
            .maybeSingle();

          const currentPhone = memberData?.phone || authUser.user_metadata?.phone || "";

          if (memberData?.name || authUser.user_metadata?.name) {
            setApplicantName(memberData?.name || authUser.user_metadata?.name || "");
          }
          if (agencyData?.name || memberData?.company_name) {
            setAgencyName(agencyData?.name || memberData?.company_name || "");
          }
          if (currentPhone) {
            setPhone(currentPhone);
          }

          const userEmail = authUser.email || "";
          if (userEmail.includes("@")) {
            const [local, dom] = userEmail.split("@");
            setEmailLocal(local);
            if (["naver.com", "gmail.com", "daum.net", "kakao.com", "nate.com"].includes(dom)) {
              setEmailDomain(dom);
            } else {
              setEmailDomain("direct");
              setCustomDomain(dom);
            }
          }

          // 기존 신청 내역 확인
          try {
            const checkRes = await checkExistingNewsrealtyApplication(authUser.id, currentPhone);
            if (checkRes.exists && checkRes.application && checkRes.application.status !== "반려") {
              setExistingApplication(checkRes.application);
            }
          } catch (e) {
            console.error("Error checking existing application:", e);
          }
        }
      } catch (err) {
        console.error("Error loading user info:", err);
        setAuthLoading(false);
      }
    }
    loadUserData();
  }, []);

  const getFullEmail = () => {
    if (!emailLocal) return "";
    const dom = emailDomain === "direct" ? customDomain : emailDomain;
    return dom ? `${emailLocal}@${dom}` : emailLocal;
  };

  const handleGoogleSignup = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("signup_member_type", "broker");
      }
      setGoogleLoading(true);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent("/m/newsrealty/apply")}`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      alert("Google 로그인 오류: " + (err?.message || String(err)));
      setGoogleLoading(false);
    }
  };

  const handleKakaoSignup = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("signup_member_type", "broker");
      }
      setKakaoLoading(true);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent("/m/newsrealty/apply")}`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      alert("카카오 로그인 오류: " + (err?.message || String(err)));
      setKakaoLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!applicantName.trim()) {
      setErrorMsg("신청자 성함을 입력해 주세요.");
      return;
    }
    if (!phone.trim()) {
      setErrorMsg("연락처를 입력해 주세요.");
      return;
    }
    const finalEmail = getFullEmail();
    if (!finalEmail.trim()) {
      setErrorMsg("E-mail을 입력해 주세요.");
      return;
    }
    if (!agencyName.trim()) {
      setErrorMsg("중개사무소 정보를 입력해 주세요.");
      return;
    }
    if (!agreeTerms) {
      setErrorMsg("약관에 동의해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitNewsrealtyApplication({
        memberId: user?.id,
        name: applicantName.trim(),
        phone: phone.trim(),
        email: finalEmail,
        agencyName: agencyName.trim(),
        interests: ["로컬기자", "부동산중개"],
        memo: `[모바일 공실뉴스부동산 신청] 신청자: ${applicantName.trim()} / 연락처: ${phone.trim()} / 이메일: ${finalEmail} / 중개사무소: ${agencyName.trim()}`,
      });

      if (res.success) {
        setSubmittedData({
          applicantName: applicantName.trim(),
          agencyName: agencyName.trim(),
          phone: phone.trim(),
          email: finalEmail,
          smsSent: res.smsSent,
        });
        setIsSubmitted(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setErrorMsg(res.message || "신청 처리 중 오류가 발생했습니다.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "서버 통신 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const stage: ApplyStage = authLoading
    ? "loading"
    : !user
      ? "login"
      : existingApplication && !isSubmitted
        ? "existing"
        : isSubmitted
          ? "submitted"
          : "form";

  return (
    <NewsrealtyApplyView
      stage={stage}
      mobile={true}
      header={(
        <>
          {/* 모바일 고정 헤더 (사이트 body 에 overflow-x:hidden 이 있어 sticky 대신 fixed) */}
          <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999990, height: 50, padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", borderBottom: "1px solid #eef0f3", boxSizing: "border-box" }}>
            <Link href="/m/newsrealty" style={{ color: "#444", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>‹ 뒤로</Link>
            <Link href="/m/newsrealty" style={{ fontWeight: 800, fontSize: 16, color: "#111", textDecoration: "none" }}>공실뉴스부동산</Link>
            <div style={{ width: 32 }} />
          </header>
          <div style={{ height: 50 }} />
        </>
      )}
      links={{ intro: "/m/newsrealty", home: "/m", approvedAdmin: "/admin", findAccount: `/login?returnTo=${encodeURIComponent("/m/newsrealty/apply")}` }}
      googleLoading={googleLoading}
      kakaoLoading={kakaoLoading}
      onGoogle={handleGoogleSignup}
      onKakao={handleKakaoSignup}
      existingApplication={existingApplication}
      submittedData={submittedData}
      applicantName={applicantName}
      setApplicantName={setApplicantName}
      phone={phone}
      setPhone={setPhone}
      emailLocal={emailLocal}
      setEmailLocal={setEmailLocal}
      emailDomain={emailDomain}
      setEmailDomain={setEmailDomain}
      customDomain={customDomain}
      setCustomDomain={setCustomDomain}
      agencyName={agencyName}
      setAgencyName={setAgencyName}
      agreeTerms={agreeTerms}
      setAgreeTerms={setAgreeTerms}
      termsAccordionOpen={termsAccordionOpen}
      setTermsAccordionOpen={setTermsAccordionOpen}
      errorMsg={errorMsg}
      submitting={submitting}
      onSubmit={handleSubmit}
      showGuideModal={showGuideModal}
      setShowGuideModal={setShowGuideModal}
    />
  );
}
