import React from "react";
import NewsSection from "./_components/home/NewsSection";
import BannerAd from "./_components/home/BannerAd";
import VideoSlider from "./_components/home/VideoSlider";
import VacancyMapSummary from "./_components/home/VacancyMapSummary";

export default function MobileHomePage() {
  const politicsNews = [
    { id: "1", title: "이재명·홍준표, 청와대서 전격 오찬...'통합 행보' 속 징계 파장", date: "2026.04.29", source: "공실뉴스", imageUrl: "https://images.unsplash.com/photo-1541888081622-4a00cb9f3f4c?w=200&q=80" },
    { id: "2", title: "이란 전쟁에 막힌 호르무즈 해협...英·佛 주도 40개국 연합", date: "2026.04.29", source: "공실뉴스", imageUrl: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=200&q=80" }
  ];

  const taxNews = [
    { id: "3", title: "[세무 리포트] 사립유치원 퇴로 찾기... 문정명 세무사가 제안하는", date: "2026.04.29", source: "공실뉴스", imageUrl: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=200&q=80" },
    { id: "4", title: "5000만원 내면 매물 공유' 중개사 모임 보니...드러난 실상", date: "2026.04.28", source: "김미숙", imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200&q=80" }
  ];

  const lifeNews = [
    { id: "5", title: "'유방암 투병' 박미선, 1년 반 만에 방송 복귀 시동...", date: "2026.04.29", source: "공실뉴스", imageUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=200&q=80" },
    { id: "6", title: "\"공짜로 줘도 안먹어\"... 비만전문의가 경고한 '살찌는 음식'", date: "2026.04.28", source: "김민석", imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=200&q=80" }
  ];

  const otherNews = [
    { id: "7", title: "작년 공인중개사 신규 개업 1998년 IMF 외환위기 이후 최소", date: "2026.04.29", source: "김민석", imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=200&q=80" }
  ];

  const localVideos = [
    { id: "v1", title: "남산타워가 내 집에서!~ 이태원 어반메시 용산", imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=300&q=80" },
    { id: "v2", title: "임대인, 임차인, 불필요한 전세 분쟁은 이제 그만!", imageUrl: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=300&q=80" }
  ];

  const droneVideos = [
    { id: "d1", title: "[아파트] 서울 서초구 방배동 주변 다가구 아파트 01", subtitle: "드론 영상 자료실입니다.", imageUrl: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=300&q=80" },
    { id: "d2", title: "[아파트] 서울 서초구 방배동 주변 다가구 아파트 02", subtitle: "드론 영상 자료실입니다.", imageUrl: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=300&q=80" }
  ];

  const lectures = [
    { id: "l1", category: "중개실무", title: "매매강의 시간 5천만원 수식 투자 사용매매 올인원 강의", imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=300&q=80" },
    { id: "l2", category: "중개실무", title: "월급으로 1억 모으기! 2030 사회초년생을 위한 실전 재테크", imageUrl: "https://images.unsplash.com/photo-1556761175-5973dc0f32d7?w=300&q=80" }
  ];

  return (
    <div className="flex flex-col w-full bg-white min-h-screen pb-[80px]">
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      {/* 1. 검색창 영역 */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 sticky top-[44px] z-40">
        <div className="w-full h-11 bg-gray-50 rounded-full flex items-center px-4 cursor-pointer border border-gray-200">
          <span className="text-[#1a2e50] font-bold text-lg mr-2">G</span>
          <span className="text-gray-400 text-[14px] flex-1">지역, 지하철역, 건물명 검색</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
      </div>

      <NewsSection title="정치·경제·사회" items={politicsNews} />
      <NewsSection title="세무·법률" items={taxNews} />
      <BannerAd />
      <NewsSection title="여행·건강·생활" items={lifeNews} />
      <NewsSection title="기타" items={otherNews} />
      
      <VideoSlider title="우리동네부동산" items={localVideos} />
      <VacancyMapSummary />
      <VideoSlider title="드론영상 (자료실)" items={droneVideos} theme="dark" />
      <VideoSlider title="부동산특강" items={lectures} cardType="lecture" />
    </div>
  );
}
