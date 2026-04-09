"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Home() {
  // Ticker data (원본과 동일)
  const tickerItems = [
    { name: "매매가격지수 (서울)", value: "102.4", change: "▲ 0.15%", color: "#d32f2f" },
    { name: "전세가격지수 (서울)", value: "105.2", change: "▲ 0.28%", color: "#d32f2f" },
    { name: "전세가격지수 (부산)", value: "96.5", change: "▼ 0.08%", color: "#1976d2" },
    { name: "매매가격지수 (서울)", value: "102.4", change: "▲ 0.15%", color: "#d32f2f" },
    { name: "코스피", value: "5,522.75", change: "▲ 0.8%", color: "#d32f2f" },
    { name: "코스닥", value: "812.45", change: "▼ 0.3%", color: "#1976d2" },
  ];

  return (
    <>
      <Header />

      {/* ========== Main Content ========== */}
      <main className="container px-20" style={{ position: "relative" }}>
        
        {/* Quick Menu Floating */}
        <div className="quick-menu">
          <div className="qm-item"><span>📌</span>관심매물</div>
          <div className="qm-item"><span>🕒</span>최근조회</div>
          <div className="qm-item"><span>📋</span>문의내역</div>
          <div className="qm-item" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ background: "#f9f9f9" }}><span>🔝</span>TOP</div>
        </div>

        {/* ========== 3. Hero Section ========== */}
        <div className="hero-section" style={{ padding: "0 25px 0 0", border: "0.5px solid #dcdcdc", borderTop: "none", marginBottom: 0, background: "#fff" }}>
          {/* Left: Map */}
          <div className="hero-left" style={{ display: "flex", marginTop: 0, flex: 2.8, position: "relative", minHeight: 480, padding: 0 }}>
            <div id="map" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "#e8e8e8", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 16 }}>
              카카오맵 지도 영역
            </div>
            <button className="map-btn">현위치에서 재검색</button>
            {/* Property List Overlay */}
            <div style={{ display: "block", position: "absolute", top: 15, left: 15, width: 280, background: "#fff", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", zIndex: 99999, maxHeight: "calc(100% - 30px)", overflowY: "auto" }}>
              <div style={{ padding: "12px 15px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#fff", zIndex: 999999, borderRadius: "10px 10px 0 0" }}>
                <h3 style={{ margin: 0, fontSize: 15, color: "var(--brand-blue)", display: "flex", alignItems: "center", fontWeight: 800 }}>
                  우리동네공실
                  <svg style={{ marginLeft: 4 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </h3>
                <div style={{ display: "flex", gap: 8 }}>
                  <select style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #ccc", fontSize: 12, outline: "none", cursor: "pointer" }}>
                    <option>전체</option>
                  </select>
                  <button style={{ fontSize: 16, fontWeight: "bold", color: "#999", cursor: "pointer", padding: "0 4px" }}>&times;</button>
                </div>
              </div>
              {/* 매물 리스트 아이템 (원본과 동일) */}
              {[
                { title: "한양아파트 101동 101호", price: "매매 50억", type: "오피스텔 |", detail: "룸 1개, 욕실 1개, 세탁기,인덕션,주차가능", badge: "공동중개", phone: "010-8831-9450" },
                { title: "동부센트레빌", price: "매매 10억", type: "아파트 |", detail: "룸 1개, 욕실 1개, 에어컨,싱크대", badge: "공동중개", phone: "010-8831-9450" },
                { title: "동부센트레빌 101 101", price: "매매 50억", type: "아파트 |", detail: "룸 3개, 욕실 1개, 에어컨,붙박이장,싱크대...", badge: "공동중개", phone: "010-8831-9450" },
                { title: "가평타운오피스텔 101 101", price: "매매 10억", type: "아파트 |", detail: "룸 1개, 욕실 1개, 에어컨", badge: "공동중개", phone: "010-8831-9450" },
              ].map((item, i) => (
                <div key={i} style={{ padding: 12, borderBottom: "1px solid #f0f0f0", cursor: "pointer", display: "flex", alignItems: "flex-start", justifyContent: "space-between", transition: "background 0.2s" }}>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: 13, color: "#222", fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</h4>
                    <div style={{ color: "#508bf5", fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{item.price}</div>
                    <div style={{ color: "#666", fontSize: 10.5, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.type}</div>
                    <div style={{ color: "#666", fontSize: 10.5, marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.detail}</div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: "bold", color: "#ff5a5f", border: "1px solid #ff5a5f", background: "#fff", padding: "2px 4px", borderRadius: 2 }}>{item.badge}</span>
                      <span style={{ color: "#d32f2f", fontWeight: 900 }}>{item.phone}</span>
                    </div>
                  </div>
                  <div style={{ width: 55, height: 55, borderRadius: 6, background: "#ddd", marginLeft: 8, flexShrink: 0, border: "1px solid #eee" }}></div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: AD & HOT NEWS */}
          <div className="hero-right" style={{ marginTop: 0 }}>
            <div style={{ marginTop: 0, marginBottom: 30, width: "100%", height: 180, background: "#f0f0f0", border: "1px solid #ccc", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#555" }}>배너 1</div>
            <div className="hn-header">
              <h2>HOT 공실뉴스</h2>
              <a href="#">더보기 &gt;</a>
            </div>
            <div className="hn-list" style={{ marginBottom: 0 }}>
              {[
                { title: "부동산 규제지역 추가 해제... 주택시장 훈풍 부나", date: "2026.04.01", img: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80" },
                { title: "로또청약은 옛말이다 분양가 상한제 개편 이후", date: "2026.03.31", img: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80" },
                { title: "강남 재건축 단지 신고가 속출... 하반기 전망은", date: "2026.03.30", img: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80" },
              ].map((item, i) => (
                <div key={i} className="hn-item">
                  <div className="hn-img" style={{ background: `url('${item.img}') center/cover` }}></div>
                  <div className="hn-txt">
                    <h4>{item.title}</h4>
                    <span>{item.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ========== 4. Ticker Section ========== */}
        <div className="ticker-bar">
          <a href="#" className="ticker-label">
            실시간 부동산 지수 <span style={{ fontSize: 12, marginLeft: 8 }}>&gt;</span>
          </a>
          <div className="ticker-wrap">
            <div className="ticker">
              {/* 30번 반복하여 무한 루프 효과 */}
              {Array.from({ length: 30 }).map((_, repeatIdx) => (
                tickerItems.map((item, i) => (
                  <div className="ticker-item" key={`${repeatIdx}-${i}`}>
                    <span>{item.name}</span>
                    <span className="ticker-val" style={{ color: item.color }}>{item.value} {item.change}</span>
                  </div>
                ))
              ))}
            </div>
          </div>
        </div>

        {/* ========== 5. Hot Issue: 부동산·주식·재테크 ========== */}
        <div className="mt-50 mb-50">
          <div className="sec-title-wrap">
            <h2 className="sec-title">부동산·주식·재테크</h2>
          </div>
          <div className="hot-issue-wrap">
            <div className="hi-left">
              <div className="hi-list">
                {[
                  { title: '대법원, 신반포2차 재건축 상가 분쟁에 마침표..."조합원 전원 동의 불필요"', desc: '대법원, 상가 산정 비율 관련 소송서 조합 승소 판결...\'전원 동의\' 족쇄 풀었다 신반포2차, 1572가구에서 2056가구 대단지로 탈바꿈...사업 추진에 청신호 은...' },
                  { title: '서울 아파트 공시가 18.7% 급등... "한강벨트" 보유세 50% 이상 오를 듯', desc: '서울 공동주택 공시가 \'어깨\' 단계에서 18.7% 급등...건전 공동주택(3.7%) 3배 수준, 특히 압(특히)여의도 풀러...' },
                ].map((item, i) => (
                  <div key={i} className="hi-item">
                    <div className="hi-img" style={{ position: "relative" }}>
                      <div style={{ width: "100%", height: "100%", background: "#ddd", borderRadius: 4 }}></div>
                    </div>
                    <div className="hi-txt">
                      <h3>{item.title}</h3>
                      <p>{item.desc}</p>
                      <div style={{ fontSize: 12, color: "#999", marginTop: 8 }}>2026.04.05</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="hi-right">
              <div className="box-placeholder">
                <span style={{ color: "#999" }}>광고 또는 비디오 박스 영역</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========== 6. Video News: 우리동네부동산 ========== */}
        <div className="video-wrap mb-50">
          <div className="sec-title-wrap">
            <h2 className="sec-title">우리동네부동산</h2>
          </div>
          <div className="video-grid">
            {[
              "우리동네 생활",
              "강남역 도보권, 다용도 투자 가치 높은 단지구 매물 동향",
              "강남3구 아파트, 어린이 서울 집값 상승을 이끌다",
            ].map((title, i) => (
              <div key={i} className="vid-item">
                <div className="vid-thumb">
                  <div className="vid-play"></div>
                </div>
                <div className="vid-title">{title}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ========== 7. 드론영상 (자료실) - Premium Dark Section ========== */}
      <div className="premium-bg">
        <div className="container px-20">
          <div className="sec-title-wrap">
            <h2 className="sec-title" style={{ color: "#fff" }}>드론영상 (자료실)</h2>
          </div>
          <div className="prem-grid">
            {[
              { title: "강남 주요 오피스 권역 임대차 동향", desc: "2026년 1분기 GBD 테헤란로 일대 프라임급 오피스 공실률 및 임대료 변화 추이 분석" },
              { title: "수도권 물류센터 투자 시장 전망", desc: "이커머스 시장 재편에 따른 수도권 핵심 권역 물류센터 매매 및 임대차 동향보고서" },
              { title: "신흥 상권 분석: 성수동 연무장길", desc: "MZ세대의 핫플레이스로 떠오른 성수동 팝업스토어 성지, 임대료 프리미엄 분석" },
              { title: "초고가 주택 VVIP 시장 트렌드", desc: "한남, 청담 지역 100억 이상 초고급 하이엔드 주거 상품 거래 사례 및 자산가 동향" },
            ].map((item, i) => (
              <div key={i} className="prem-card">
                <div className="prem-img"></div>
                <div className="prem-title">{item.title}</div>
                <div className="prem-desc">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========== 7-2. 정치·경제·사회 ========== */}
      <div className="container px-20 mt-50 mb-50">
        <div className="sec-title-wrap">
          <h2 className="sec-title">정치·경제·사회</h2>
        </div>
        <div className="hot-issue-wrap">
          <div className="hi-left">
            <div className="hi-list">
              {[
                { title: '이란, "공격 중단" 하루 만에 번복... 중동 확전 위기 최고조', desc: '이란 대통령의, 핵무기 소설 용의 불안감 마음 부침에 중교 역심리 반발 수...핵능 3000 여색 시별리안지점되지마 중발통 확성되어 길 민' },
                { title: '중동 지정학적 리스크 격화, "고유가-주가 하락" 한국 경제 어떻게 되나', desc: '중동 분쟁 심화로 국제 유가 급등 전망 가능, 내년 물가기 둔화 허위연체 모소 압작 신뢰격 하락세, 내각 응식 허...' },
              ].map((item, i) => (
                <div key={i} className="hi-item">
                  <div className="hi-img" style={{ position: "relative" }}>
                    <div style={{ width: "100%", height: "100%", background: "#ddd", borderRadius: 4 }}></div>
                  </div>
                  <div className="hi-txt">
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                    <div style={{ fontSize: 12, color: "#999", marginTop: 8 }}>2026.04.05</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hi-right">
            <div className="box-placeholder">
              <span style={{ color: "#999" }}>광고 또는 비디오 박스 영역</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========== 7-3. 세무·법률 + 여행·건강·생활 (2단 병렬) ========== */}
      <div className="container px-20 mt-50 mb-50">
        <div className="hot-issue-wrap" style={{ gap: 40 }}>
          <div className="hi-left" style={{ flex: 1 }}>
            <div className="sec-title-wrap">
              <h2 className="sec-title">세무·법률</h2>
            </div>
            <div className="hi-list">
              {[
                { title: '"사망 전 10년 기록 더 본다"...국세청 상속세 쟁점 타격 포인트 7가지', desc: '사망 전 상속세 레이더에서 및 가족 계좌 간 금전 이동 등 관심 최근 1~2,14년간 대형 상속 산안관서 동시, 영수유 결정안이나 심가처를 근가 보전지초를 정가하제 삼...' },
                { title: '부모님 자산 형태에 따른 세무 가이드 현금 없다면 "증여" 불수, 부동산만 있다면 "해주"로 안정밀어야', desc: '"부모님 명의든, 그냥 내줘 손색해"... 납세의 봉임는 \'절약의 기가비금\' 기본적안 봉로례벌 기관라토 "시본도" 헬열방벌나에요 오코 벌레...' },
              ].map((item, i) => (
                <div key={i} className="hi-item">
                  <div className="hi-img" style={{ position: "relative" }}>
                    <div style={{ width: "100%", height: "100%", background: "#ddd", borderRadius: 4 }}></div>
                  </div>
                  <div className="hi-txt">
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                    <div style={{ fontSize: 12, color: "#999", marginTop: 8 }}>2026.04.05</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hi-left" style={{ flex: 1 }}>
            <div className="sec-title-wrap">
              <h2 className="sec-title">여행·건강·생활</h2>
            </div>
            <div className="hi-list">
              {[
                { title: '잊혀 어디서나 진료...상시 비대면 진료 공식 취용으로 의료 패러다임 전환', desc: '의원급이상 비대면진료 연속 소식해서, 2023년 지리와 의정지역임으로 소리 의무도 관련 생활해서 제도가 본격초선 어하는구...' },
                { title: '"내 허방 양곤일 AI 가이드의 함께"...북한산, 스마트 관광으로 진화', desc: '관리며 대회주의교 결은 국내 참여 명산의 \'스마트트럭, 관리 시아명, 여행 업체해여 참여 관서 관광을 최적적 관방가 일환 관광자 유업 5 유적자 무...' },
              ].map((item, i) => (
                <div key={i} className="hi-item">
                  <div className="hi-img" style={{ position: "relative" }}>
                    <div style={{ width: "100%", height: "100%", background: "#ddd", borderRadius: 4 }}></div>
                  </div>
                  <div className="hi-txt">
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                    <div style={{ fontSize: 12, color: "#999", marginTop: 8 }}>2026.04.05</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========== 7-4. 기타 + 공지사항 ========== */}
      <div className="container px-20 mt-50 mb-50">
        <div className="hot-issue-wrap">
          <div className="hi-left">
            <div className="sec-title-wrap">
              <h2 className="sec-title">기타</h2>
            </div>
            <div className="hi-list">
              {[
                { title: '한국 대표팀, 3월 14일 미국 마이애미서 8강 격돌', desc: '한국, 3월 14일 미국 마이애미에서 8강전 및 총리...첫 한의 기회인 문원한건 대분 위리, 칸사 사건...' },
                { title: '"올림픽 아는지도 몰란다"...월러 노의 영성, 한국에선 \'무관심적 칼럭\'', desc: '세계 시건대 종가 걸도적 스단 부재에 그불 것 를 건의로 검회 한안 워...' },
              ].map((item, i) => (
                <div key={i} className="hi-item">
                  <div className="hi-img" style={{ position: "relative" }}>
                    <div style={{ width: "100%", height: "100%", background: "#ddd", borderRadius: 4 }}></div>
                  </div>
                  <div className="hi-txt">
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                    <div style={{ fontSize: 12, color: "#999", marginTop: 8 }}>2026.04.05</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hi-right" style={{ position: "relative", marginTop: 52 }}>
            <div className="box-placeholder" style={{ background: "#f9f9fb", border: "1px solid #e0e0e0", borderRadius: 12, height: "auto", minHeight: 220, alignItems: "flex-start", padding: 25 }}>
              <div style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #1a4282", paddingBottom: 12, marginBottom: 15 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1a4282", margin: 0 }}>공지사항</h3>
                  <a href="#" style={{ fontSize: 12, color: "#666", textDecoration: "none" }}>더보기 &gt;</a>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12, fontSize: 13, color: "#444" }}>
                  {[
                    { text: "• 신규가입자 무료 1개월 연장 이벤트", date: "04.01" },
                    { text: "• 개인정보처리방침 개정 사전 안내", date: "03.28" },
                    { text: "• 공실뉴스 모바일 앱 업데이트 출시", date: "03.20" },
                    { text: "• 서비스 정기 점검 안내 (금일 자정)", date: "03.15" },
                  ].map((item, i) => (
                    <li key={i} style={{ display: "flex", justifyContent: "space-between", cursor: "pointer" }}>
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "70%" }}>{item.text}</span>
                      <span style={{ color: "#999", fontSize: 11 }}>{item.date}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== 9. 부동산특강 ========== */}
      <div className="container px-20 mt-50 mb-50">
        <div className="sec-title-wrap">
          <h2 className="sec-title" id="special-lecture" style={{ scrollMarginTop: 150 }}>부동산특강</h2>
        </div>
        <div className="lecture-grid mb-50">
          {[
            { cat: "실무/마케팅", title: "[2026] 부동산이 쉽게 활용하는 유튜브 소츠 운영법", instructor: "공실마스터 특강", rating: "4.9 (137)", price: "2,000 P", isNew: true },
            { cat: "경매/특수물건", title: "[2026] 부동산이 알아야 하는 민법 활용법", instructor: "공실마스터 특강", rating: "4.8 (198)", price: "3,000 P", isNew: true },
            { cat: "재개발/투자", title: "[20260] 부동산 중개에 필요한 재개발이 활용법", instructor: "공실마스터 특강", rating: "4.9 (154)", price: "5,000 P", isNew: false },
          ].map((item, i) => (
            <Link href="/study_read" key={i} className="lecture-card" style={{ display: "block" }}>
              <div className="lecture-thumb">
                <div style={{ width: "100%", height: "100%", background: "#eee" }}></div>
                {item.isNew && <span className="badge-new">NEW🔥</span>}
                <div className="bookmark-btn">🔖</div>
              </div>
              <div className="lecture-info">
                <div className="lecture-cat">{item.cat}</div>
                <h3 className="lecture-title" style={{ wordBreak: "keep-all" }}>{item.title}</h3>
                <div className="lecture-meta">
                  <span className="instructor">{item.instructor}</span>
                  <div className="rating">★ {item.rating}</div>
                </div>
                <div style={{ fontWeight: 800, color: "#111", fontSize: 17, background: "#f8fafc", padding: "10px 14px", borderRadius: 8, display: "inline-block", border: "1px solid #e2e8f0" }}>
                  {item.price}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ========== 11. Chatbot Banner ========== */}
      <div className="chat-banner">
        <div className="chat-title">GONGSIL NET</div>
        <div className="chat-sub">궁금한 내용은 뭐든지 챗봇서비스에게!</div>
        <div className="chat-mockup">
          <img src="https://via.placeholder.com/300x450/ccc/999?text=Phone+Mockup" style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="챗봇 목업" />
        </div>
      </div>

      <Footer />
    </>
  );
}
