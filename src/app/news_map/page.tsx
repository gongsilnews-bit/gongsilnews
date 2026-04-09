"use client";

import React, { useState } from "react";
import Link from "next/link";

// 더미 뉴스 데이터 (사이드바)
const sidebarArticles = [
  { id: 1, tag: "우리동네 샘플", section: "[우리동네부동산] NEWS ♥", title: "우리동네 샘플", desc: "우리동네 샘플 우리동네 샘플 우리동네 샘플 우리동네뉴스 샘플...", date: "2026. 4. 6.", reporter: "김미숙", hasLink: true },
  { id: 2, tag: "아파트·오피스텔", section: "[우리동네부동산] NEWS ♥", title: "강남역 도보권, 다용도 투자 가치 높은 다가구 매물 등장", desc: "오피스 수요 증가 지역... 미래가치 주목 다양한 개발 전략 가능... 투자자 맞춤형 활용도", date: "2026. 4. 5.", reporter: "김미숙", hasLink: true },
  { id: 3, tag: "아파트·오피스텔", section: "[우리동네부동산] NEWS ♥", title: "강남3구 아파트, 여전히 서울 집값 상승을 이끌다", desc: "재건축·브랜드 아파트, 매물 나오면 '즉시 계약' 급매·전세가율 높은 단지...", date: "2026. 4. 5.", reporter: "김미숙", hasLink: true },
  { id: 4, tag: "빌라·주택", section: "[빌라·주택·오피스텔] NEWS", title: "강남 아파트 전세가율 38%... 매매·전세 격차 확대", desc: "\"거품 우려\" 속에서도 수요는 강남으로 집중 전세가율이 높으면 투자가치가...", date: "2026. 4. 5.", reporter: "김미숙", hasLink: true },
  { id: 5, tag: "스포츠·연예·Car", section: "[스포츠(연예)] NEWS", title: "한국 대표팀, 3월 14일 미국 마이애미서 8강 격돌", desc: "한국, 3월 14일 미국 마이애미에서 8강전 및 총리 회의...", date: "2026. 4. 5.", reporter: "김미숙", hasLink: true },
  { id: 6, tag: "건강·헬스", section: "[스포츠(연예)] NEWS", title: '\"올림픽 아는지도 몰란다\"...월러 노의 영성, 한국에선 \'무관심적 칼럭\'', desc: "세계 시건대 종가 걸도적 스단 부재에 그불 것 를 건의로 검회...", date: "2026. 4. 5.", reporter: "김미숙", hasLink: true },
];

// 기사 상세 데이터
const articleDetail = {
  category: "상가·업무·공장·토지",
  title: "강남역 도보권, 다용도 투자 가치 높은 다가구 매물 등장",
  reporter: "김미숙",
  date: "입력 2026. 4. 5. 오후 9:57:18",
  views: 19,
  subtitle: "오피스 수요 증가 지역... 미래가치 주목\n다양한 개발 전략 가능... 투자자 맞춤형 활용도",
  content: [
    "서울 강남 핵심 지역에 위치한 다가구 건물이 59억에 나왔다.",
    "[공실뉴스] 역삼동 매매 물건은 강남역과 보로(도보로) 이동 가능한 입지를 자랑하며, 자가 활용은 물론 일부 임대, 리모델링 및 신축까지 다양한 활용이 가능한 것이 특징이다.",
    "해당 부동산의 주요 정보에 따르면, 매매가는 59억 원, 대지면적은 59평, 연면적은 169평이며 지하 1층~지상 3층 규모로 구성되어 있다.",
    "특히 눈길을 끄는 부분은 '명도 가능' 매물이라는 점이다. 명도 이슈는 재건축이나 용도 변경 시 큰 걸림돌로 작용하는데, 본 건물의 경우 소유주 측에서 명도 협의를 마친 상태이다.",
  ],
  boldSubheadings: ["오피스 수요 증가 지역… 미래가치 주목", "다양한 개발 전략 가능… 투자자 맞춤형 활용도"],
  contentParts: [
    "위 건물은 신분당선 연장과 광역 교통망 확장에 따라, IT, 스타트업, 금융 기업 등 강남 오피스 수요가 집중되고 있는 지역에 위치해 있다.",
    "또한 강남역, 버스 중앙차로, 관공서, 병의원, 세무서 등 생활 및 업무 인프라가 모두 갖춰져 있어, 단순 오피스 건물 이상의 가치를 제공한다.",
    "위 물건은 현 상태 그대로 보유하여 안정적인 월세 수익을 얻는 방식, 또는 상가주택으로의 용도 변경, 더 나아가 신축 및 리모델링을 통한 가치 극대화 등 다양한 전략적 활용이 가능하다.",
  ],
};

// 인기 뉴스
const popularNews = [
  "강남역 도보권, 다용도 투자 가치 높은 다가구 매물 등장",
  "대법원, 신반포2차 재건축 상가 분쟁 마침표",
  "부모님 자산 형태에 따른 세무 가이드",
  "강남 아파트값 3년 만에 최고 상승률",
  "다주택자 양도세 중과 완화 정책 분석",
];

export default function NewsLocalPage() {
  const [activeArticle, setActiveArticle] = useState(2);
  const [showDetail, setShowDetail] = useState(true);
  const [commentText, setCommentText] = useState("");

  const [section1, setSection1] = useState("");
  const [section2, setSection2] = useState("");

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Pretendard', sans-serif" }}>
      {/* ===== 슬림 헤더 ===== */}
      <header style={{ display: "flex", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #ddd", background: "#fff", zIndex: 100, position: "relative", flexShrink: 0 }}>
        <Link href="/" style={{ marginRight: 15, display: "flex", alignItems: "center", textDecoration: "none" }}>
          <img src="/logo.png" alt="공실뉴스" style={{ height: 34 }} onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/100x34?text=LOGO"; }} />
        </Link>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, marginRight: 20, color: "#111" }}>우리동네뉴스</h1>
        <select 
          value={section1} 
          onChange={(e) => { setSection1(e.target.value); setSection2(""); }}
          style={{ padding: "6px 10px", border: "1px solid #ccc", borderRadius: 4, outline: "none", fontSize: 14, minWidth: 130, fontWeight: 600, cursor: "pointer" }}
        >
          <option value="">1차섹션 전체</option>
          <option value="우리동네부동산">우리동네부동산</option>
          <option value="뉴스/칼럼">뉴스/칼럼</option>
        </select>
        <select 
          value={section2}
          onChange={(e) => setSection2(e.target.value)}
          style={{ padding: "6px 10px", border: "1px solid #ccc", borderRadius: 4, outline: "none", fontSize: 14, minWidth: 130, fontWeight: 600, cursor: "pointer", marginLeft: 8 }}
        >
          <option value="">2차섹션 전체</option>
          {section1 === "우리동네부동산" && (
            <>
              <option value="아파트·오피스텔">아파트·오피스텔</option>
              <option value="빌라·주택">빌라·주택</option>
              <option value="원룸·투룸">원룸·투룸</option>
              <option value="상가·업무·공장·토지">상가·업무·공장·토지</option>
              <option value="분양">분양</option>
            </>
          )}
        </select>
      </header>

      {/* ===== 메인 콘텐츠 (3단 레이아웃) ===== */}
      <main style={{ display: "flex", flex: 1, minHeight: 0, position: "relative" }}>
        {/* 좌측 사이드바: 뉴스 리스트 */}
        <aside style={{ width: 380, minWidth: 380, height: "100%", background: "#fff", borderRight: "1px solid #eee", display: "flex", flexDirection: "column", zIndex: 20 }}>
          <h2 style={{ padding: "15px 20px", margin: 0, fontSize: 15, fontWeight: 800, color: "#111", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", flexShrink: 0 }}>
            1차섹션 전체 지도기사 1개
          </h2>
          <div style={{ flex: 1, overflowY: "auto", padding: 0 }}>
            {sidebarArticles.map((item) => {
              const isActiveAndShowing = activeArticle === item.id && showDetail;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (isActiveAndShowing) {
                      setShowDetail(false);
                    } else {
                      setActiveArticle(item.id);
                      setShowDetail(true);
                    }
                  }}
                  style={{
                    padding: 16,
                    borderBottom: "1px solid #eee",
                    cursor: "pointer",
                    transition: "background 0.2s",
                    background: activeArticle === item.id ? "#eaf4ff" : "#fff",
                    borderLeft: activeArticle === item.id ? "4px solid #508bf5" : "4px solid transparent",
                  }}
                >
                  <div style={{ fontSize: 11, color: "#508bf5", fontWeight: "bold", marginBottom: 4 }}>{item.section}</div>
                  <div style={{ fontSize: 15, fontWeight: "bold", lineHeight: 1.4, wordBreak: "keep-all", marginBottom: 8, color: "#111" }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: "#666", marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.desc}</div>
                  <div style={{ fontSize: 12, color: "#999", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{item.date} · {item.reporter}</span>
                    {item.hasLink && (
                      <span style={{ color: isActiveAndShowing ? "#d32f2f" : "#3b82f6", fontSize: 12, fontWeight: "bold" }}>
                        {isActiveAndShowing ? "기사닫기 X" : "기사상세보기 >"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* 지도 + 기사 상세 래퍼 */}
        <div style={{ flex: 1, height: "100%", position: "relative", minWidth: 0, background: "#eee" }}>
          {/* 기사 상세 뷰 (플로팅) */}
          {showDetail && (
            <div style={{ position: "absolute", top: 0, left: 0, width: 750, maxWidth: "100%", height: "100%", borderRight: "1px solid #ddd", boxShadow: "5px 0 20px rgba(0,0,0,0.1)", background: "#fff", zIndex: 2000, overflowY: "auto", animation: "fadeIn 0.2s ease" }}>
              <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 40px 40px", position: "relative" }}>
                {/* X 닫기 버튼 */}
                <button onClick={() => setShowDetail(false)} style={{ position: "absolute", top: -10, right: 0, background: "none", border: "none", fontSize: 32, color: "#999", cursor: "pointer", padding: 10, lineHeight: 1, zIndex: 10, transition: "color 0.15s" }} title="닫기">✕</button>

                {/* 카테고리 */}
                <div style={{ fontSize: 14, color: "#666", marginBottom: 8, fontWeight: 600 }}>{articleDetail.category}</div>

                {/* 제목 */}
                <h1 style={{ fontSize: 36, fontWeight: 800, color: "#111", lineHeight: 1.3, marginBottom: 16, letterSpacing: -1.5, wordBreak: "keep-all" }}>{articleDetail.title}</h1>

                {/* 메타 정보 바 */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #ddd", paddingBottom: 16, marginBottom: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#666" }}>
                    <span style={{ color: "#111", fontWeight: "bold" }}>{articleDetail.reporter}</span>
                    <span style={{ display: "inline-block", width: 1, height: 12, background: "#ddd" }}></span>
                    <span>{articleDetail.date}</span>
                    <span style={{ display: "inline-block", width: 1, height: 12, background: "#ddd" }}></span>
                    <span>조회수 {articleDetail.views}</span>
                  </div>
                  <div style={{ display: "flex", gap: 16, alignItems: "center", color: "#333", fontSize: 20 }}>
                    {/* 원문보기 */}
                    <a href="#" className="text-[13px] font-bold text-[#508bf5] border border-[#508bf5] rounded-full px-[14px] py-[4px] no-underline transition-all duration-200 hover:bg-[#508bf5] hover:text-white">원문보기</a>
                    {/* 찜 */}
                    <span className="meta-icon" title="스크랩">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"></path></svg>
                    </span>
                    {/* 공유 */}
                    <span className="meta-icon" title="공유">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                    </span>
                    {/* 글자크기 */}
                    <span className="meta-icon" title="글자 크기" style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "baseline", gap: 1, letterSpacing: -1 }}>
                      <span style={{ fontSize: 13 }}>가</span><span style={{ fontSize: 17 }}>가</span>
                    </span>
                    {/* 인쇄 */}
                    <span className="meta-icon" title="인쇄" onClick={() => window.print()}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    </span>
                  </div>
                </div>

                {/* 본문 */}
                <div style={{ paddingTop: 0, marginTop: 30 }}>
                  {/* 서브타이틀 */}
                  <div className="article-subtitle-box">{articleDetail.subtitle}</div>

                  <div className="article-body">
                    {/* 영상 */}
                    <div className="article-img-wrap">
                      <div style={{ width: "100%", height: 380, background: "#222", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 60, height: 60, background: "rgba(255,0,0,0.8)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg viewBox="0 0 24 24" width="30" height="30" fill="white" style={{ marginLeft: 3 }}><path d="M8 5v14l11-7z"/></svg>
                        </div>
                        <span style={{ color: "#666", fontSize: 14 }}>동영상 프리뷰</span>
                      </div>
                    </div>

                    {articleDetail.content.map((p, i) => (<p key={i}>{p}</p>))}
                    <b>{articleDetail.boldSubheadings[0]}</b>
                    {articleDetail.contentParts.slice(0, 2).map((p, i) => (<p key={`b1-${i}`}>{p}</p>))}
                    <b>{articleDetail.boldSubheadings[1]}</b>
                    {articleDetail.contentParts.slice(2).map((p, i) => (<p key={`b2-${i}`}>{p}</p>))}

                    {/* 추가 이미지 */}
                    <div className="article-img-wrap">
                      <div style={{ width: "100%", height: 340, background: "#444", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "#999" }}>기사 이미지</span>
                      </div>
                    </div>
                  </div>

                  {/* 기자 저작권 */}
                  <div className="article-footer-bar" style={{ marginTop: 40 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontWeight: 800, color: "#111" }}>{articleDetail.reporter}</span>
                      <a href="#" style={{ color: "#aaa", textDecoration: "none", fontSize: 14 }}>다른기사 보기</a>
                    </div>
                    <div style={{ color: "#888", fontSize: 13 }}>저작권자 © 공실뉴스 무단전재 및 재배포 금지</div>
                  </div>

                  {/* 댓글 */}
                  <div className="comments-section">
                    <div className="comment-header">
                      <div className="comment-count">0개의 댓글</div>
                      <div style={{ fontSize: 14, color: "#555", cursor: "pointer" }}>내 댓글 〉</div>
                    </div>
                    <div className="comment-box">
                      <div className="comment-user-name">로그인이 필요합니다</div>
                      <textarea className="comment-textarea" placeholder="댓글을 남겨보세요" value={commentText} onChange={(e) => setCommentText(e.target.value.slice(0, 400))} />
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
                    <div style={{ padding: 20, textAlign: "center", color: "#999", fontSize: 14 }}>첫 댓글을 남겨보세요.</div>
                  </div>

                  {/* 함께 보면 좋은 뉴스 */}
                  <div style={{ marginTop: 60, paddingTop: 40, borderTop: "2px solid #111" }}>
                    <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 25 }}>함께 보면 좋은 뉴스</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                      <div style={{ display: "flex", gap: 15, cursor: "pointer" }}>
                        <div style={{ width: 100, height: 70, background: "#eee", borderRadius: 4, flexShrink: 0 }}></div>
                        <div style={{ fontSize: 14, fontWeight: "bold", lineHeight: 1.4 }}>은마·목동 등 재건축 단지 불확실성 해소 전망...</div>
                      </div>
                      <div style={{ display: "flex", gap: 15, cursor: "pointer" }}>
                        <div style={{ width: 100, height: 70, background: "#eee", borderRadius: 4, flexShrink: 0 }}></div>
                        <div style={{ fontSize: 14, fontWeight: "bold", lineHeight: 1.4 }}>2024년 부동산 전망 전문가 심층 토론회 개최...</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 우측 사이드바 (포털 모드) */}
                <div style={{ position: "absolute", top: 20, right: -340, width: 300 }}>
                  {/* HOT 매물/광고 */}
                  <div style={{ background: "#f9f9f9", padding: 15, border: "1px solid #eee", marginBottom: 20, borderRadius: 8 }}>
                    <div className="sidebar-hot-title">HOT 매물/광고</div>
                    <div className="sidebar-hot-map">공실가이드맵 (지도 이미지)</div>
                    <div className="sidebar-hot-label">강남구 역삼동 신축 빌딩 (수익률 6%)</div>
                  </div>
                  {/* CTA */}
                  <div className="sidebar-cta-btn" style={{ background: "#00b894" }}>공실알림<br /><span>(관심도 1,000개 부동산 가입)</span></div>
                  <div className="sidebar-cta-btn" style={{ background: "#00cec9", marginBottom: 30 }}>신축/분양/권리조회<br /><span>(부동산 전문가에게 의뢰)</span></div>
                  {/* 많이 본 뉴스 */}
                  <h3 style={{ fontSize: 16, fontWeight: 800, borderBottom: "2px solid #111", paddingBottom: 10, marginBottom: 15 }}>상가·업무·공장·토지 많이 본 뉴스</h3>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {popularNews.map((title, i) => (
                      <li key={i} style={{ display: "flex", fontSize: 14, marginBottom: 16, lineHeight: 1.4, cursor: "pointer" }}>
                        <span style={{ fontWeight: 900, color: "#508bf5", width: 24, flexShrink: 0, fontSize: 15 }}>{i + 1}</span>
                        <span style={{ fontWeight: 600, color: "#555" }}>{title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 지도 영역 플로팅 필터 */}
          <div style={{ display: "flex", position: "absolute", top: 15, left: showDetail ? 770 : 20, zIndex: 10, background: "#fff", padding: "5px 15px", borderRadius: 30, boxShadow: "0 4px 10px rgba(0,0,0,0.1)", border: "1px solid #ddd", alignItems: "center", gap: 10, fontSize: 14, color: "#333", transition: "left 0.3s" }}>
            <span style={{ background: "none", border: "none", cursor: "pointer", fontWeight: "bold", padding: "5px 10px" }}>경기도 ▼</span>
            <div style={{ width: 1, height: 12, background: "#ddd" }}></div>
            <span style={{ background: "none", border: "none", cursor: "pointer", fontWeight: "bold", padding: "5px 10px" }}>고양시 ▼</span>
            <div style={{ width: 1, height: 12, background: "#ddd" }}></div>
            <span style={{ background: "none", border: "none", cursor: "pointer", fontWeight: "bold", padding: "5px 10px" }}>가좌동 ▼</span>
            <div style={{ width: 1, height: 12, background: "#ddd" }}></div>
            <span style={{ background: "none", border: "none", cursor: "pointer", fontWeight: "bold", padding: "5px 10px", color: "#508bf5" }}>검색 🔍</span>
          </div>

          {/* 지도 placeholder */}
          <div style={{ width: "100%", height: "100%", background: "#e8eaed", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 18 }}>
            🗺️ 카카오맵 영역 (향후 연동)
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
