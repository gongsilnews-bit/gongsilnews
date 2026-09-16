"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { submitNewsrealtyApplication } from "@/app/actions/newsrealtyApply";

const SERVICE_OPTIONS = [
  { id: "기사작성", label: "AI 공실뉴스 기사 발행 및 포털 송출", icon: "📰", desc: "지역 공실·상권 소식을 포털 기사형태로 독점 배포" },
  { id: "유튜브쇼츠", label: "유튜브 쇼츠 & 릴스 영상 콘텐츠", icon: "🎬", desc: "매물 및 상권 분석 60초 숏폼 영상 및 대본 제작" },
  { id: "블로그", label: "네이버 블로그 전문 마케팅 원고", icon: "✍️", desc: "검색 상위 노출에 최적화된 지역 전문 부동산 블로그" },
  { id: "인스타그램", label: "인스타그램 카드뉴스 & 비주얼 브랜딩", icon: "📸", desc: "감각적인 디자인의 공실 소개 및 중개업소 브랜딩" },
  { id: "쓰레드", label: "쓰레드(Threads) 실시간 부동산 인사이트", icon: "💬", desc: "텍스트 기반 바이럴 및 건물주·투자자 네트워크 형성" },
];

export default function NewsRealtyApplyPage() {
  const router = useRouter();
  const [loadingUser, setLoadingUser] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [member, setMember] = useState<any>(null);
  const [agency, setAgency] = useState<any>(null);

  // 폼 상태
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    agencyName: "",
    agencyAddress: "",
    regionCity: "서울특별시",
    regionDistrict: "",
    regionDong: "",
    interests: ["기사작성", "유튜브쇼츠", "블로그"],
    memo: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedInfo, setSubmittedInfo] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadUserData() {
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (authUser) {
          setUser(authUser);

          // member 조회
          const { data: memberData } = await supabase
            .from("members")
            .select("*")
            .eq("id", authUser.id)
            .maybeSingle();

          setMember(memberData);

          // agency 조회
          const { data: agencyData } = await supabase
            .from("agencies")
            .select("*")
            .eq("owner_id", authUser.id)
            .maybeSingle();

          setAgency(agencyData);

          // 폼 초기값 자동 입력
          setFormData((prev) => ({
            ...prev,
            name: memberData?.name || authUser.user_metadata?.name || "",
            phone: memberData?.phone || authUser.user_metadata?.phone || "",
            email: authUser.email || "",
            agencyName: agencyData?.name || memberData?.company_name || "",
            agencyAddress: agencyData?.address || "",
            regionCity: agencyData?.region_city || "서울특별시",
            regionDistrict: agencyData?.region_district || "",
            regionDong: agencyData?.region_dong || "",
          }));
        }
      } catch (err) {
        console.error("Error loading user info:", err);
      } finally {
        setLoadingUser(false);
      }
    }
    loadUserData();
  }, []);

  const handleInterestToggle = (id: string) => {
    setFormData((prev) => {
      const exists = prev.interests.includes(id);
      return {
        ...prev,
        interests: exists
          ? prev.interests.filter((item) => item !== id)
          : [...prev.interests, id],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formData.name.trim()) {
      setErrorMsg("대표자 성함을 입력해 주세요.");
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMsg("연락처를 입력해 주세요.");
      return;
    }
    if (!formData.agencyName.trim()) {
      setErrorMsg("중개사무소 명칭을 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitNewsrealtyApplication({
        memberId: user?.id,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        agencyName: formData.agencyName,
        agencyAddress: formData.agencyAddress,
        regionCity: formData.regionCity,
        regionDistrict: formData.regionDistrict,
        regionDong: formData.regionDong,
        interests: formData.interests,
        memo: formData.memo,
      });

      if (res.success) {
        setSubmittedInfo({
          name: formData.name,
          agencyName: formData.agencyName,
          phone: formData.phone,
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

  // 1. 접수 완료 화면
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 py-16">
        <div className="max-w-xl w-full bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden text-center">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />
          
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner border border-emerald-500/40">
            ✓
          </div>

          <span className="inline-block text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full mb-3">
            신청 접수 완료
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
            공실뉴스부동산 파트너 신청이<br />성공적으로 접수되었습니다!
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-8">
            <strong className="text-emerald-300 font-semibold">{submittedInfo?.name} 대표님</strong> ({submittedInfo?.agencyName}),<br />
            보내주신 소중한 정보를 바탕으로 전담 매니저가 검토 후<br />
            <strong>1영업일 이내</strong>에 등록해주신 연락처로 유선 안내드리겠습니다.
          </p>

          <div className="bg-slate-950/70 rounded-2xl p-5 border border-slate-800 text-left mb-8 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">신청 사무소</span>
              <span className="text-slate-200 font-medium">{submittedInfo?.agencyName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">담당 연락처</span>
              <span className="text-slate-200 font-medium">{submittedInfo?.phone}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
              <span className="text-slate-400">안내 문자(SMS)</span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                {submittedInfo?.smsSent ? "발송 완료" : "순차 발송중"}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/newsrealty"
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition border border-slate-700"
            >
              소개 페이지로 돌아가기
            </Link>
            <Link
              href="/"
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-900/40 transition"
            >
              공실뉴스 메인으로
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* 상단 네비게이션 & 헤더 */}
        <div className="mb-8 text-center">
          <Link
            href="/newsrealty"
            className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 mb-4 transition"
          >
            ← 공실뉴스부동산 소개 페이지로
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            공인중개사 전용 제휴 파트너십
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            공실뉴스부동산 입점 신청서
          </h1>
          <p className="mt-3 text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            지역 1등 미디어 공인중개사로의 도약, 지금 신청하시면 전담 매니저가 기사 작성부터 5대 채널 콘텐츠 제작까지 1:1 맞춤 세팅을 지원합니다.
          </p>
        </div>

        {/* 비로그인 / 일반회원 가입 안내 카드 */}
        {!loadingUser && !user && (
          <div className="mb-8 bg-gradient-to-br from-slate-900 to-emerald-950/40 border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-8 text-center shadow-xl">
            <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 border border-emerald-500/30">
              🏢
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              부동산회원 전용 서비스입니다
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed mb-6 max-w-md mx-auto">
              공실뉴스부동산은 공인중개사 자격을 보유한 중개사무소 전용 파트너십입니다.<br />
              <strong>부동산회원으로 가입</strong>하시거나 기존 계정으로 <strong>로그인</strong> 후 신청서를 작성해 주세요.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/signup?type=realtor&returnTo=/newsrealty/apply"
                className="px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-extrabold shadow-lg shadow-emerald-900/50 transition transform hover:-translate-y-0.5"
              >
                ✨ 부동산회원 무료 가입하기
              </Link>
              <Link
                href="/login?returnTo=/newsrealty/apply"
                className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition"
              >
                기존 계정으로 로그인
              </Link>
            </div>
          </div>
        )}

        {/* 로그인되어 있으나 부동산회원이 아닌 경우 안내 */}
        {!loadingUser && user && member && member.role !== "REALTOR" && member.role !== "ADMIN" && (
          <div className="mb-8 bg-amber-950/40 border border-amber-500/40 rounded-2xl p-5 text-sm text-amber-200 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold mb-1">💡 현재 일반회원 계정으로 로그인되어 있습니다.</p>
              <p className="text-xs text-amber-300/80">부동산회원 권한 등록 시 더 많은 혜택과 전문 콘텐츠 툴이 제공됩니다. 바로 신청하셔도 담당자가 중개사무소 확인을 함께 도와드립니다.</p>
            </div>
            <Link
              href="/realty_admin?menu=settings&tab=agency"
              className="shrink-0 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition"
            >
              중개사 등록
            </Link>
          </div>
        )}

        {/* 접수 폼 */}
        <form onSubmit={handleSubmit} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-sm space-y-8">
          {/* STEP 1: 대표자 정보 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center border border-emerald-500/30">1</span>
              <h3 className="text-lg font-bold text-white">대표자 기본 정보</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  대표자 성함 <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="홍길동"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  휴대폰 번호 <span className="text-emerald-400">*</span> (안내 문자 수신)
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="010-0000-0000"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  이메일 주소
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="example@email.com"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* STEP 2: 중개사무소 정보 */}
          <div className="pt-6 border-t border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center border border-emerald-500/30">2</span>
              <h3 className="text-lg font-bold text-white">중개사무소 정보</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  중개사무소 명칭 <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.agencyName}
                  onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                  placeholder="공실뉴스 공인중개사사무소"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">시/도</label>
                  <input
                    type="text"
                    value={formData.regionCity}
                    onChange={(e) => setFormData({ ...formData, regionCity: e.target.value })}
                    placeholder="서울특별시"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">구/군</label>
                  <input
                    type="text"
                    value={formData.regionDistrict}
                    onChange={(e) => setFormData({ ...formData, regionDistrict: e.target.value })}
                    placeholder="강남구"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">동/읍/면</label>
                  <input
                    type="text"
                    value={formData.regionDong}
                    onChange={(e) => setFormData({ ...formData, regionDong: e.target.value })}
                    placeholder="역삼동"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">사무소 상세 주소</label>
                <input
                  type="text"
                  value={formData.agencyAddress}
                  onChange={(e) => setFormData({ ...formData, agencyAddress: e.target.value })}
                  placeholder="서울특별시 강남구 테헤란로 123 2층"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* STEP 3: 관심 서비스 선택 */}
          <div className="pt-6 border-t border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center border border-emerald-500/30">3</span>
              <h3 className="text-lg font-bold text-white">관심 서비스 선택 (복수 선택 가능)</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">희망하시는 미디어 마케팅 채널을 선택해주시면 맞춤 전략을 제안해 드립니다.</p>
            
            <div className="space-y-3">
              {SERVICE_OPTIONS.map((item) => {
                const checked = formData.interests.includes(item.id);
                return (
                  <label
                    key={item.id}
                    onClick={() => handleInterestToggle(item.id)}
                    className={`flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer transition select-none ${
                      checked
                        ? "bg-emerald-950/30 border-emerald-500/60 shadow-lg shadow-emerald-950/20"
                        : "bg-slate-950/50 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      className="mt-1 w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 border-slate-700 bg-slate-900"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-sm font-bold text-white">{item.label}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 추가 문의 및 요청사항 */}
          <div className="pt-6 border-t border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              기타 요청사항이나 문의사항 (선택)
            </label>
            <textarea
              rows={3}
              value={formData.memo}
              onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
              placeholder="예: 강남권 빌딩 공실 위주로 취재 기사를 발행하고 싶습니다. 유튜브 쇼츠 제작 가이드도 함께 받고 싶습니다."
              className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl p-3 text-sm text-white placeholder-slate-500 outline-none transition"
            />
          </div>

          {/* 에러 메시지 */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* 신청하기 제출 버튼 */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-extrabold text-base sm:text-lg shadow-xl shadow-emerald-950/50 transition transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  접수 처리 중...
                </>
              ) : (
                <>
                  공실뉴스부동산 파트너 신청 완료하기 →
                </>
              )}
            </button>
            <p className="text-center text-xs text-slate-500 mt-3">
              신청 접수 즉시 등록해주신 휴대폰 번호로 접수 확인 문자(SMS)가 발송됩니다.
            </p>
          </div>
        </form>

        {/* 고객센터 안내 */}
        <div className="mt-8 text-center text-xs text-slate-500">
          신청 관련 유선 문의: <strong className="text-slate-400">1555-5343</strong> (평일 09:00 ~ 18:00) | gongsilnews@naver.com
        </div>
      </div>
    </div>
  );
}
