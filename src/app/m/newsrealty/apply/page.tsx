"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { submitNewsrealtyApplication } from "@/app/actions/newsrealtyApply";

const SERVICE_OPTIONS = [
  { id: "기사작성", label: "AI 공실뉴스 기사 발행 & 포털 송출", icon: "📰", desc: "지역 공실·상권 소식을 기사화하여 포털 독점 배포" },
  { id: "유튜브쇼츠", label: "유튜브 쇼츠 & 릴스 숏폼 제작", icon: "🎬", desc: "매물과 상권 분석 60초 영상 및 자동 대본 생성" },
  { id: "블로그", label: "네이버 블로그 상위노출 마케팅 원고", icon: "✍️", desc: "검색 유입에 최적화된 지역 전문 부동산 블로그" },
  { id: "인스타그램", label: "인스타그램 카드뉴스 & 브랜딩", icon: "📸", desc: "비주얼 중심 공실 홍보 및 인스타 계정 브랜딩" },
  { id: "쓰레드", label: "쓰레드(Threads) 실시간 인사이트", icon: "💬", desc: "텍스트 기반 바이럴 및 건물주·투자자 인맥 형성" },
];

export default function MobileNewsRealtyApplyPage() {
  const router = useRouter();
  const [loadingUser, setLoadingUser] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [member, setMember] = useState<any>(null);
  const [agency, setAgency] = useState<any>(null);

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

          const { data: memberData } = await supabase
            .from("members")
            .select("*")
            .eq("id", authUser.id)
            .maybeSingle();

          setMember(memberData);

          const { data: agencyData } = await supabase
            .from("agencies")
            .select("*")
            .eq("owner_id", authUser.id)
            .maybeSingle();

          setAgency(agencyData);

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
      setErrorMsg("연락처 번호를 입력해 주세요.");
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

  // 접수 완료 화면
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center px-4 py-12">
        <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border border-emerald-500/30">
            ✓
          </div>
          <span className="inline-block text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full mb-2">
            접수 완료
          </span>
          <h1 className="text-xl font-extrabold text-white mb-2">
            파트너 신청이 접수되었습니다!
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            <strong className="text-emerald-300 font-semibold">{submittedInfo?.name} 대표님</strong> ({submittedInfo?.agencyName}),<br />
            담당 매니저가 기재해주신 내용을 검토 후<br />
            <strong>1영업일 이내</strong> 등록해주신 연락처로 유선 안내드리겠습니다.
          </p>

          <div className="bg-slate-950 rounded-2xl p-4 text-xs text-left mb-6 space-y-2 border border-slate-800">
            <div className="flex justify-between">
              <span className="text-slate-400">사무소명</span>
              <span className="text-slate-200 font-medium">{submittedInfo?.agencyName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">연락처</span>
              <span className="text-slate-200 font-medium">{submittedInfo?.phone}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <span className="text-slate-400">확인 문자(SMS)</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                {submittedInfo?.smsSent ? "발송 완료" : "발송 중"}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Link
              href="/m/newsrealty"
              className="block w-full py-3 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700"
            >
              소개 페이지로 돌아가기
            </Link>
            <Link
              href="/m"
              className="block w-full py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-lg shadow-emerald-950/40"
            >
              공실뉴스 메인 홈으로
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
      {/* 모바일 상단 바 */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <Link href="/m/newsrealty" className="text-slate-400 text-sm font-semibold flex items-center gap-1">
          ‹ 뒤로
        </Link>
        <span className="text-sm font-bold text-white">공실뉴스부동산 신청</span>
        <div className="w-8" />
      </header>

      <main className="px-4 py-6">
        {/* 인트로 안내 */}
        <div className="mb-6 text-center">
          <span className="inline-block text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full mb-2">
            공인중개사 전용 파트너십
          </span>
          <h1 className="text-2xl font-extrabold text-white">
            파트너 입점 신청서
          </h1>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            지역 대표 미디어 공인중개사로 선정되면<br />
            AI 기사 발행 및 5대 채널 콘텐츠를 독점 지원합니다.
          </p>
        </div>

        {/* 비로그인 회원 가입 안내 카드 */}
        {!loadingUser && !user && (
          <div className="mb-6 bg-gradient-to-b from-slate-900 to-emerald-950/30 border border-emerald-500/40 rounded-2xl p-5 text-center shadow-lg">
            <div className="text-3xl mb-2">🏢</div>
            <h2 className="text-base font-bold text-white mb-1">
              부동산회원 가입 후 신청해주세요
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              공실뉴스부동산은 공인중개사 회원 전용 서비스입니다. 먼저 부동산회원으로 가입하거나 로그인해주세요.
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href="/m/signup?type=realtor&returnTo=/m/newsrealty/apply"
                className="py-3 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black shadow-md shadow-emerald-950/50"
              >
                ✨ 부동산회원 가입하기
              </Link>
              <Link
                href="/m/login?returnTo=/m/newsrealty/apply"
                className="py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700"
              >
                기존 계정으로 로그인
              </Link>
            </div>
          </div>
        )}

        {/* 폼 본문 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 섹션 1: 대표자 정보 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold flex items-center justify-center">1</span>
              대표자 기본 정보
            </h3>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                대표자 성함 <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="홍길동"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                연락처 <span className="text-emerald-400">*</span> (안내 문자 수신)
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="010-0000-0000"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                이메일 (선택)
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="example@email.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 섹션 2: 중개사무소 정보 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold flex items-center justify-center">2</span>
              중개사무소 정보
            </h3>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                중개사무소 명칭 <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.agencyName}
                onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                placeholder="공실뉴스 공인중개사사무소"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">시/도</label>
                <input
                  type="text"
                  value={formData.regionCity}
                  onChange={(e) => setFormData({ ...formData, regionCity: e.target.value })}
                  placeholder="서울시"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">구/군</label>
                <input
                  type="text"
                  value={formData.regionDistrict}
                  onChange={(e) => setFormData({ ...formData, regionDistrict: e.target.value })}
                  placeholder="강남구"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">동/읍/면</label>
                <input
                  type="text"
                  value={formData.regionDong}
                  onChange={(e) => setFormData({ ...formData, regionDong: e.target.value })}
                  placeholder="역삼동"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                사무소 주소
              </label>
              <input
                type="text"
                value={formData.agencyAddress}
                onChange={(e) => setFormData({ ...formData, agencyAddress: e.target.value })}
                placeholder="서울특별시 강남구 테헤란로 123"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 섹션 3: 관심 서비스 선택 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold flex items-center justify-center">3</span>
              관심 서비스 선택 (다중 선택)
            </h3>
            <p className="text-[11px] text-slate-400">희망하시는 미디어 채널을 체크해주세요.</p>

            <div className="space-y-2">
              {SERVICE_OPTIONS.map((item) => {
                const checked = formData.interests.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleInterestToggle(item.id)}
                    className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition select-none ${
                      checked
                        ? "bg-emerald-950/40 border-emerald-500/60"
                        : "bg-slate-950 border-slate-800"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      className="mt-0.5 w-4 h-4 rounded text-emerald-500 border-slate-700 bg-slate-900"
                    />
                    <div className="flex-1">
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 추가 메모 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <label className="block text-xs font-bold text-white">
              기타 문의 및 요청사항 (선택)
            </label>
            <textarea
              rows={2}
              value={formData.memo}
              onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
              placeholder="추가로 궁금하신 사항을 적어주세요."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
            />
          </div>

          {/* 에러 메시지 */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* 하단 고정 액션 바 */}
          <div className="fixed bottom-0 left-0 right-0 p-3 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 z-40">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 text-slate-950 font-black text-sm shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  접수 처리 중...
                </>
              ) : (
                "공실뉴스부동산 파트너 신청하기 ➔"
              )}
            </button>
          </div>
        </form>

        {/* 하단 안내 */}
        <div className="mt-8 text-center text-[11px] text-slate-500 leading-relaxed">
          고객센터: 1555-5343 | gongsilnews@naver.com<br />
          신청 완료 즉시 확인 문자가 발송됩니다.
        </div>
      </main>
    </div>
  );
}
