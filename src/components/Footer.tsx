import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  };

  return (
    <footer className="w-full bg-[#1e293b] text-white">
      {/* ── 사이트맵 (PC 전용) ── */}
      <div className="hidden md:block bg-[#f8f9fa] py-10 border-t border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-5 grid grid-cols-5 gap-10">
          <div className="flex flex-col gap-3">
            <h4 className="text-lg font-bold text-gray-900 mb-2">공실뉴스</h4>
            <Link href="/news_gongsil" className="text-[15px] text-gray-600 hover:text-blue-600 hover:font-bold transition-colors">아파트/오피스텔</Link>
            <Link href="/news_gongsil" className="text-[15px] text-gray-600 hover:text-blue-600 hover:font-bold transition-colors">빌라/주택</Link>
            <Link href="/news_gongsil" className="text-[15px] text-gray-600 hover:text-blue-600 hover:font-bold transition-colors">원룸/투룸(풀옵션)</Link>
            <Link href="/news_gongsil" className="text-[15px] text-gray-600 hover:text-blue-600 hover:font-bold transition-colors">상가/사무실/공장/토지</Link>
            <Link href="/news_gongsil" className="text-[15px] text-gray-600 hover:text-blue-600 hover:font-bold transition-colors">신축/분양/경매</Link>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="text-lg font-bold text-gray-900 mb-2">부동산 경제</h4>
            <Link href="/news_politics" className="text-[15px] text-gray-600 hover:text-blue-600 hover:font-bold transition-colors">부동산 정책/동향</Link>
            <Link href="/news_politics" className="text-[15px] text-gray-600 hover:text-blue-600 hover:font-bold transition-colors">경제/재테크/주식</Link>
            <Link href="/news_politics" className="text-[15px] text-gray-600 hover:text-blue-600 hover:font-bold transition-colors">법률/세무 지식</Link>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="text-lg font-bold text-gray-900 mb-2">AI마케팅</h4>
            <Link href="/news_marketing" className="text-[15px] text-gray-600 hover:text-blue-600 hover:font-bold transition-colors">AI/NEWS</Link>
            <Link href="/news_marketing" className="text-[15px] text-gray-600 hover:text-blue-600 hover:font-bold transition-colors">부동산유튜브/블로그</Link>
            <Link href="/news_marketing" className="text-[15px] text-gray-600 hover:text-blue-600 hover:font-bold transition-colors">공실/임대관리</Link>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="text-lg font-bold text-gray-900 mb-2">라이프·오피니언</h4>
            <Link href="/news_etc" className="text-[15px] text-gray-600 hover:text-blue-600 hover:font-bold transition-colors">인물/인터뷰</Link>
            <Link href="/news_etc" className="text-[15px] text-gray-600 hover:text-blue-600 hover:font-bold transition-colors">부동산/인테리어 꿀팁</Link>
            <Link href="/news_etc" className="text-[15px] text-gray-600 hover:text-blue-600 hover:font-bold transition-colors">맛집/여행/건강</Link>
            <Link href="/news_etc" className="text-[15px] text-gray-600 hover:text-blue-600 hover:font-bold transition-colors">자유 에세이</Link>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="text-lg font-bold text-gray-900 mb-2">공실마케팅</h4>
            <Link href="/gongsil" className="text-[15px] text-gray-600 hover:text-blue-600 hover:font-bold transition-colors">공실열람</Link>
            <Link href="/news_map" className="text-[15px] text-gray-600 hover:text-blue-600 hover:font-bold transition-colors">우리동네뉴스</Link>
            <Link href="/#special-lecture" className="text-[15px] text-gray-600 hover:text-blue-600 hover:font-bold transition-colors">부동산특강</Link>
            <Link href="/board" className="text-[15px] text-gray-600 hover:text-blue-600 hover:font-bold transition-colors">자료실</Link>
            <Link href="/board?id=free" className="text-[15px] text-gray-600 hover:text-blue-600 hover:font-bold transition-colors">커뮤니티</Link>
          </div>
        </div>
      </div>

      {/* ── 메인 푸터 정보 ── */}
      <div className="max-w-[1200px] mx-auto px-5 py-12 md:py-16 relative">
        {/* 상단 링크 바 */}
        <div className="flex flex-wrap items-center justify-between gap-6 border-b border-slate-700 pb-6 mb-8">
          <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm text-slate-300">
            <Link href="/about" onClick={scrollToTop} className="hover:text-white transition-colors">회사소개</Link>
            <span className="text-slate-600">|</span>
            <Link href="/marketing" onClick={scrollToTop} className="hover:text-white transition-colors">광고안내</Link>
            <span className="text-slate-600">|</span>
            <Link href="/partnership" onClick={scrollToTop} className="hover:text-white transition-colors">제휴문의</Link>
            <span className="text-slate-600">|</span>
            <Link href="/terms" onClick={scrollToTop} className="hover:text-white transition-colors">이용약관</Link>
            <span className="text-slate-600">|</span>
            <Link href="#" className="font-bold text-white hover:text-white transition-colors">개인정보 처리방침</Link>
            <span className="text-slate-600">|</span>
            <Link href="/youth-policy" onClick={scrollToTop} className="hover:text-white transition-colors">청소년 보호정책</Link>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-medium text-slate-400">DATA PARTNER</span>
            <span className="text-xs font-semibold text-slate-300 px-2 py-1 border border-slate-600 rounded">공공데이터포털</span>
            <span className="text-xs font-semibold text-slate-300 px-2 py-1 border border-slate-600 rounded">국토교통부</span>
          </div>
        </div>

        {/* 하단 회사 정보 */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start">
          <div className="flex-shrink-0">
            <div className="text-2xl font-black text-white tracking-tight leading-tight">공실뉴스</div>
            <div className="text-[11px] text-slate-400 mt-1 tracking-wider">GONGSIL NEWS</div>
          </div>
          
          <div className="flex-1 text-[13px] text-slate-400 leading-relaxed tracking-wide space-y-1">
            <p>
              주소 : 서울특별시 강남구 논현로115길 31, 105호 (논현동)
              <span className="text-slate-600 mx-3">|</span>
              인터넷신문 등록번호 : 서울 아55037
              <span className="text-slate-600 mx-3">|</span>
              등록일자 : 2023.09.05
            </p>
            <p>
              제호 : 공실뉴스
              <span className="text-slate-600 mx-3">|</span>
              법인명 : (주)공실마케팅
              <span className="text-slate-600 mx-3">|</span>
              사업자등록번호 : 337-81-03010
            </p>
            <p>
              대표자·발행인 : 김윤경
              <span className="text-slate-600 mx-3">|</span>
              편집인 : 김동현
              <span className="text-slate-600 mx-3">|</span>
              이메일 : master@gongsilnews.com
            </p>
            <p className="font-semibold text-slate-300 pt-1">
              고객센터 : 1555-5343 (평일 10:00~18:00)
            </p>
            <div className="pt-4 space-y-2 text-xs text-slate-500">
              <p>공실뉴스에 게재된 모든 콘텐츠(기사)는 저작권법의 보호를 받으며, 무단 전재, 복사, 배포 등을 금합니다.(저작권 문의는 별도 안내)</p>
              <p>Copyright © GONGSIL NEWS Co., Ltd. All Rights Reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
