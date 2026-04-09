"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

// 더미 기사 데이터 (원본 사이트에서 실제로 보이는 기사 목록과 동일)
const allDummyArticles = [
  { id: 1, title: '대법원, 신반포2차 재건축 상가 분쟁에 마침표..."조합원 전원 동의 불필요"', desc: '대법원, 상가 산정 비율 관련 소송서 조합 승소 판결...\'전원 동의\' 족쇄 풀었다 신반포2차, 1572가구에서 2056가구 대단지로 탈바꿈...사업 추진에 청신호 은...', section1: '뉴스/칼럼', section2: '부동산·주식·재테크', date: '2026. 04. 05. 오후 09:20', reporter: '김미숙', isVideo: false },
  { id: 2, title: '서울 아파트 공시가 18.7% 급등... "한강벨트" 보유세 50% 이상 오를 듯', desc: '서울 공동주택 공시가 \'어깨\' 단계에서 18.7% 급등...건전 공동주택(3.7%) 3배 수준, 특히 압(특히)여의도 풀러...', section1: '뉴스/칼럼', section2: '부동산·주식·재테크', date: '2026. 04. 05. 오후 09:18', reporter: '김미숙', isVideo: false },
  { id: 3, title: '이란, "공격 중단" 하루 만에 번복... 중동 확전 위기 최고조', desc: '이란 대통령의, 핵무기 소설 용의 불안감 마음 부침에 중교 역심리 반발 수...핵능 3000 여색 시별리안지점되지마 중발통 확성되어 길 민', section1: '뉴스/칼럼', section2: '정치·경제·사회', date: '2026. 04. 05. 오후 09:17', reporter: '김미숙', isVideo: false },
  { id: 4, title: '중동 지정학적 리스크 격화, "고유가-주가 하락" 한국 경제 어떻게 되나', desc: '중동 분쟁 심화로 국제 유가 급등 전망 가능, 내년 물가기 둔화 허위연체 모소 압작 신뢰격 하락세, 내각 응식 허...', section1: '뉴스/칼럼', section2: '정치·경제·사회', date: '2026. 04. 05. 오후 09:16', reporter: '김미숙', isVideo: false },
  { id: 5, title: '한국 대표팀, 3월 14일 미국 마이애미서 8강 격돌', desc: '한국, 3월 14일 미국 마이애미에서 8강전 및 총리...첫 한의 기회인 문원한건 대분 위리, 칸사 사건...', section1: '뉴스/칼럼', section2: '스포츠·연예·Car', date: '2026. 04. 05. 오후 09:15', reporter: '김미숙', isVideo: false },
  { id: 6, title: '언제 어디서나 진료!... 상시 비대면 진료 공식 허용으로 의료 패러다임 전환', desc: '의료법 개정 통해 비대면 진료 상시화... 감염병 위기 단계 무관하게 법적 근거 마련 재진 환자 중심 원칙 속 취약계층 예외 확대 및 야간·휴일 진료 접근성 향상 디지털 헬스케어 산업 급성장 기대 속 약 배송 및 수가 체...', section1: '뉴스/칼럼', section2: '건강·헬스', date: '2026. 04. 05. 오후 09:13', reporter: '김미숙', isVideo: false },
  { id: 7, title: '"내 취향 맞춤형 AI 가이드와 함께"... 북한산 \'K-등산\', 스마트 관광으로 진화', desc: '편리한 대중교통과 장비 대여 넘어 \'스마트 관광 서비스\' 본격 도입 및 확산 개인별 체력과 취향 분석해 최적의 등산 코스 및 하산 후 맛집까지 AI가 추천 디지털 기술 결합된 \'K-등산\' 콘텐츠로 외국인 관광객 만족도와 편의성 ...', section1: '뉴스/칼럼', section2: '여행·맛집', date: '2026. 04. 05. 오후 09:12', reporter: '김미숙', isVideo: false },
  { id: 8, title: '"사망 전 10년 기록 다 본다"... 국세청 상속세 정밀 타격 포인트 7가지', desc: '사망 전 10년치 계좌이체 및 가족 계좌 전액 변동 집중 추적 최근 1~2년 내 인출된 수천만 원대 현금, 영수증 없으면 상속재산 간주 부동산 평가액 및 가족 간 채무 공제 시 실질적인 증빙 서류 필수', section1: '뉴스/칼럼', section2: '세무·법률', date: '2026. 04. 05. 오후 09:09', reporter: '김미숙', isVideo: true },
  { id: 9, title: '부모님 자산 형태에 따른 세무 가이드 현금 있다면 \'증방\' 필수, 부동산만 있다면 \'채무\'로 인정받아야', desc: '"부모님 병원비, 그냥 내면 손해?"... 상속세 줄이는 \'증빙의 기술\' 현금 있으면 \'이체 메모\', 부동산뿐이면 \'차용 증... 자녀 대납금 \'채무\' 인정받아야 효도 비용 2억이 상속 재산 2억 공제로... "영수증 하나가 수천만 원 아낀다"', section1: '뉴스/칼럼', section2: '세무·법률', date: '2026. 04. 05. 오후 09:08', reporter: '김미숙', isVideo: true },
  { id: 10, title: '"올림픽 아는지도 몰란다"...월러 노의 영성, 한국에선 \'무관심적 칼럭\'', desc: '세계 시건대 종가 걸도적 스단 부재에 그불 것 를 건의로 검회 한안 워...', section1: '뉴스/칼럼', section2: 'IT·가전·가구', date: '2026. 04. 05. 오후 09:05', reporter: '김미숙', isVideo: false },
];

// 더미 인기 뉴스 (사이드바 "많이 본 뉴스")
const popularNews = [
  { id: 1, title: '대법원, 신반포2차 재건축 상가 분쟁에 마침표..."조합원 전원 동의 불필요"' },
  { id: 2, title: '서울 아파트 공시가 18.7% 급등... "한강벨트" 보유세 50% 이상 오를 듯' },
  { id: 3, title: '이란, "공격 중단" 하루 만에 번복... 중동 확전 위기 최고조' },
  { id: 4, title: '중동 지정학적 리스크 격화, "고유가-주가 하락" 한국 경제 어떻게 되나' },
  { id: 5, title: '"사망 전 10년 기록 다 본다"... 국세청 상속세 정밀 타격 포인트 7가지' },
];

// 더미 추천 공실
const recommendProps = [
  { title: "관악드림타운 132동 8층호", price: "매매 11억 5000", area: "면적 82.91㎡(25.1평) / 59.83㎡(18.1평)", detail: "룸 3개, 욕실 1개", badge: "공동중개" },
  { title: "동부센트레빌 101동 101호", price: "매매 10억", area: "면적 84㎡(25.4평) / 59㎡(17.8평)", detail: "룸 3개, 욕실 1개", badge: "공동중개" },
];

interface NewsListLayoutProps {
  category: string;
  title: string;
}

export default function NewsListLayout({ category, title }: NewsListLayoutProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 2;
  const [filteredArticles, setFilteredArticles] = useState(allDummyArticles);

  useEffect(() => {
    if (category === "all") {
      setFilteredArticles(allDummyArticles);
    } else {
      setFilteredArticles(allDummyArticles.filter(a => a.section2 === category));
    }
  }, [category]);

  const handlePageChange = (delta: number) => {
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <>
      <main className="container px-20" style={{ position: "relative" }}>
        <div className="news-layout">
          {/* 좌측 뉴스 리스트 */}
          <div className="news-list-area">
            <div className="list-header">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              {title}
            </div>

            {/* 기사 카드 리스트 */}
            {filteredArticles.length > 0 ? filteredArticles.map((article) => (
              <Link key={article.id} href={`/news_read?article_id=${article.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div className="an-card">
                  <div className="an-img" style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{ width: "100%", height: "100%", background: "#f4f6fa", borderRadius: 6 }}></div>
                    {article.isVideo && (
                      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 44, height: 44, background: "rgba(0,0,0,0.4)", borderRadius: "50%", border: "2.5px solid white", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="white" style={{ marginLeft: 4 }}><path d="M8 5v14l11-7z"/></svg>
                      </div>
                    )}
                  </div>
                  <div className="an-body">
                    <div className="an-title">{article.title}</div>
                    <div className="an-desc">{article.desc}</div>
                    <div className="an-meta">
                      <span style={{ color: "#508bf5", fontWeight: "bold", marginRight: 8 }}>
                        [{article.section1} &gt; {article.section2}]
                      </span>
                      {article.date} · {article.reporter}
                    </div>
                  </div>
                </div>
              </Link>
            )) : (
              <div style={{ padding: "60px 0", textAlign: "center", color: "#888", fontSize: 15 }}>
                해당 카테고리에 등록된 기사가 없습니다.
              </div>
            )}

            {/* 페이지네이션 */}
            {filteredArticles.length > 0 && (
              <div className="pagination">
                <button className="page-btn" disabled={currentPage <= 1} onClick={() => handlePageChange(-1)}>&lt; 이전</button>
                <span className="page-info">{currentPage} / {totalPages}</span>
                <button className="page-btn" disabled={currentPage >= totalPages} onClick={() => handlePageChange(1)}>다음 &gt;</button>
              </div>
            )}
          </div>

          {/* 우측 사이드바 */}
          <div className="news-sidebar">
            {/* 배너 영역 */}
            <div className="sb-banner">배너 1</div>

            {/* 많이 본 뉴스 5개 */}
            <div className="sb-widget">
              <div className="sb-title">많이 본 뉴스</div>
              <ul className="pop-list">
                {popularNews.map((item, i) => (
                  <li key={item.id} className="pop-item">
                    <span className="pop-ranking">{i + 1}</span>
                    <span className="pop-title">{item.title}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 추천공실 매물리스트 */}
            <div className="sb-widget">
              <div className="sb-title">
                추천 공실
                <span className="sb-title-more" onClick={() => {}}>더보기 &gt;</span>
              </div>
              {recommendProps.map((prop, i) => (
                <div key={i} className="prop-item">
                  <div className="prop-info" style={{ minWidth: 0, overflow: "hidden" }}>
                    <div className="prop-title" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{prop.title}</div>
                    <div className="prop-price">{prop.price}</div>
                    <div className="prop-meta">{prop.area}<br />{prop.detail}</div>
                    <span className="prop-badge">{prop.badge}</span>
                  </div>
                  <div className="prop-img-wrapper" style={{ flexShrink: 0 }}>
                    <div style={{ width: "100%", height: "100%", background: "#eee" }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
