"use client";

import React, { useState, useEffect } from "react";


// 더미 기사 데이터 (원본 article_id=158 기반)
const dummyArticle = {
  id: 158,
  category: "[우리동네부동산 > 상가·업무·공장·토지]",
  title: "강남역 도보권, 다용도 투자 가치 높은 다가구 매물 등장",
  reporter: "김미숙",
  date: "입력 2026. 04. 05. 오후 09:57",
  views: 18,
  subtitle: "오피스 수요 증가 지역... 미래가치 주목\n다양한 개발 전략 가능... 투자자 맞춤형 활용도",
  content: [
    "서울 강남 핵심 지역에 위치한 다가구 건물이 59억에 나왔다.",
    "[공실뉴스] 역삼동 매매 물건은 강남역과 보로(도보로) 이동 가능한 입지를 자랑하며, 자가 활용은 물론 일부 임대, 리모델링 및 신축까지 다양한 활용이 가능한 것이 특징이다.",
    "해당 부동산의 주요 정보에 따르면, 매매가는 59억 원, 대지면적은 59평, 연면적은 169평이며 지하 1층~지상 3층 규모로 구성되어 있다. 현재는 이종 일반 주거지역에 속해 있으며, 모든 세대가 월세 임차 중으로 만실 상태를 유지 중이다.",
    "특히 눈길을 끄는 부분은 '명도 가능' 매물이라는 점이다. 명도 이슈는 재건축이나 용도 변경 시 큰 걸림돌로 작용하는데, 본 건물의 경우 소유주 측에서 명도 협의를 마친 상태로, 신축 리모델링 진행이 원활하다는 강점을 가진다.",
  ],
  boldSubheadings: [
    "오피스 수요 증가 지역… 미래가치 주목",
    "다양한 개발 전략 가능… 투자자 맞춤형 활용도",
  ],
  contentParts: [
    "위 건물은 신분당선 연장과 광역 교통망 확장에 따라, IT, 스타트업, 금융 기업 등 강남 오피스 수요가 집중되고 있는 지역에 위치해 있다. 실제로 최근 강남권 오피스 공실률은 빠르게 낮아지고 있으며, 해당 건물을 오피스 용도로 전환할 경우 높은 임차 수요를 기대할 수 있다.",
    "또한 강남역, 버스 중앙차로, 관공서, 병의원, 세무서 등 생활 및 업무 인프라가 모두 갖춰져 있어, 단순 오피스 건물 이상의 가치를 제공한다.",
    "위 물건은 현 상태 그대로 보유하여 안정적인 월세 수익을 얻는 방식, 또는 상가주택으로의 용도 변경, 더 나아가 신축 및 리모델링을 통한 가치 극대화 등 다양한 전략적 활용이 가능하다.",
    "특히 층별 임대 전략을 통해, 수요층에 맞춘 임대구성이 가능하며 공실 리스크를 낮출 수 있다는 것이 전문가들의 분석이다. 단일 목적이 아닌 자가 거주+수익형 임대+신축 개발을 모두 고려할 수 있어 법인·개인 투자자 모두에게 적합한 상품으로 평가된다.",
  ],
};

// 사이드바 데이터
const popularNews = [
  { id: 1, title: '대법원, 신반포2차 재건축 상가 분쟁에 마침표..."조합원 전원 동의 불필요"' },
  { id: 2, title: '서울 아파트 공시가 18.7% 급등... "한강벨트" 보유세 50% 이상 오를 듯' },
  { id: 3, title: "강남역 도보권, 다용도 투자 가치 높은 다가구 매물 등장" },
  { id: 4, title: '"사망 전 10년 기록 다 본다"... 국세청 상속세 정밀 타격 포인트 7가지' },
  { id: 5, title: '부모님 자산 형태에 따른 세무 가이드 현금 있다면 \'증방\' 필수, 부동산만 있다면 \'채무\'로 인정받아야' },
];

const recommendProps = [
  { title: "힐데스하임", price: "매매 67억", area: "면적 288.9㎡(87.4평) / 244.55㎡(74.0평)", detail: "룸 1개, 욕실 3+개", badge: "공동중개" },
  { title: "논현 e편한세상 101동 101호", price: "매매 10억", area: "면적 84㎡(25.4평)", detail: "룸 3개, 욕실 2개", badge: "공동중개" },
  { title: "관악드림타운 132동 8층호", price: "매매 11억 5000", area: "면적 82.91㎡(25.1평) / 59.83㎡(18.1평)", detail: "룸 3개, 욕실 1개", badge: "공동중개" },
  { title: "동부센트레빌 101동 101호", price: "매매 10억", area: "면적 84㎡(25.4평) / 59㎡(17.8평)", detail: "룸 3개, 욕실 1개", badge: "공동중개" },
];

export default function NewsReadPage() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(progress);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* 스크롤 진행 표시 바 */}
      <div className="scroll-progress" style={{ width: `${scrollProgress}%` }}></div>

      <main className="container px-20" style={{ position: "relative" }}>
        <div className="news-layout">
          {/* ===== 좌측: 기사 본문 영역 ===== */}
          <div className="news-read-area">
            {/* 카테고리 */}
            <div className="detail-breadcrumb">{dummyArticle.category}</div>

            {/* 제목 */}
            <h1 className="detail-title">{dummyArticle.title}</h1>

            {/* 메타 정보 바 */}
            <div className="detail-meta">
              <div className="meta-info">
                <span style={{ color: "#111", fontWeight: "bold" }}>{dummyArticle.reporter}</span>
                <span className="meta-divider"></span>
                <span>{dummyArticle.date}</span>
                <span className="meta-divider"></span>
                <span>조회수 {dummyArticle.views}</span>
              </div>
              <div className="meta-stats">
                {/* 찜하기 */}
                <span className="meta-icon" title="찜하기">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                </span>
                {/* 공유하기 */}
                <span className="meta-icon" title="공유하기">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                </span>
                {/* 글자크기 */}
                <span className="meta-icon" title="글자 크기" style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "baseline", gap: 1, letterSpacing: -1 }}>
                  <span style={{ fontSize: 13 }}>가</span><span style={{ fontSize: 17 }}>가</span>
                </span>
                {/* 인쇄 */}
                <span className="meta-icon" title="기사 인쇄" onClick={() => window.print()}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                </span>
              </div>
            </div>

            {/* 서브타이틀 요약 박스 */}
            <div className="article-subtitle-box">{dummyArticle.subtitle}</div>

            {/* 기사 본문 */}
            <div className="article-body">
              {/* 대표 이미지/동영상 */}
              <div className="article-img-wrap">
                <div style={{ width: "100%", height: 420, background: "#222", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 60, height: 60, background: "rgba(255,0,0,0.8)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg viewBox="0 0 24 24" width="30" height="30" fill="white" style={{ marginLeft: 3 }}><path d="M8 5v14l11-7z"/></svg>
                  </div>
                  <span style={{ color: "#666", fontSize: 14 }}>동영상 프리뷰</span>
                </div>
              </div>

              {/* 본문 텍스트 */}
              {dummyArticle.content.map((p, i) => (
                <p key={i}>{p}</p>
              ))}

              {/* 소제목 1 */}
              <b>{dummyArticle.boldSubheadings[0]}</b>
              <p>{dummyArticle.contentParts[0]}</p>
              <p>{dummyArticle.contentParts[1]}</p>

              {/* 소제목 2 */}
              <b>{dummyArticle.boldSubheadings[1]}</b>
              <p>{dummyArticle.contentParts[2]}</p>
              <p>{dummyArticle.contentParts[3]}</p>

              {/* 추가 이미지 */}
              <div className="article-img-wrap">
                <div style={{ width: "100%", height: 380, background: "#444", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#999" }}>기사 이미지</span>
                </div>
              </div>
            </div>

            {/* 기사 푸터: 기자명 + 저작권 */}
            <div className="article-footer-bar">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 800, color: "#111" }}>{dummyArticle.reporter}</span>
              </div>
              <div style={{ color: "#888", fontSize: 13 }}>
                저작권자 © 공실뉴스 무단전재 및 재배포 금지
              </div>
            </div>

            {/* 댓글 섹션 */}
            <div className="comments-section">
              <div className="comment-header">
                <div className="comment-count">0개의 댓글</div>
                <div style={{ fontSize: 14, color: "#555", cursor: "pointer" }}>내 댓글 〉</div>
              </div>

              <div className="comment-box">
                <div className="comment-user-name">로그인이 필요합니다</div>
                <textarea
                  className="comment-textarea"
                  placeholder="댓글을 남겨보세요"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value.slice(0, 400))}
                />
                <div className="comment-footer">
                  <div style={{ fontSize: 13, color: "#999", display: "flex", alignItems: "center", gap: 16 }}>
                    <span><span style={{ fontWeight: "bold", color: "#111" }}>{commentText.length}</span> / 400</span>
                    <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "#555" }}>
                      <input type="checkbox" style={{ accentColor: "#508bf5" }} /> 비밀댓글
                    </label>
                  </div>
                  <button className="comment-submit-btn">등록</button>
                </div>
              </div>

              {/* 댓글 목록 */}
              <div style={{ padding: 20, textAlign: "center", color: "#999", fontSize: 14 }}>
                첫 댓글을 남겨보세요.
              </div>
            </div>

            {/* 목록으로 돌아가기 */}
            <div style={{ marginTop: 60, paddingTop: 20, borderTop: "1px solid #ccc", textAlign: "center" }}>
              <button className="back-to-list" onClick={() => window.history.back()}>
                목록으로 돌아가기
              </button>
            </div>
          </div>

          {/* ===== 우측: 사이드바 ===== */}
          <div className="news-sidebar">
            {/* HOT 매물/광고 */}
            <div className="sb-widget">
              <div className="sidebar-hot-title">HOT 매물/광고</div>
              <div className="sidebar-hot-map">공실가이드맵 (지도 이미지)</div>
              <div className="sidebar-hot-label">강남구 역삼동 신축 빌딩 (수익률 6%)</div>
            </div>

            {/* CTA 버튼 2개 */}
            <div className="sb-widget">
              <div className="sidebar-cta-btn" style={{ background: "#00b894" }}>
                공실알림<br /><span>(관심도 1,000개 부동산 가입)</span>
              </div>
              <div className="sidebar-cta-btn" style={{ background: "#00cec9", marginBottom: 30 }}>
                신축/분양/권리조회<br /><span>(부동산 전문가에게 의뢰)</span>
              </div>
            </div>

            {/* 많이 본 뉴스 */}
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

            {/* 추천공실 */}
            <div className="sb-widget">
              <div className="sb-title">
                추천 공실
                <span className="sb-title-more">더보기 &gt;</span>
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
