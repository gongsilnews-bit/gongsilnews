export default function CategoryNewsGrid() {
  const newsCategories = [
    { title: "부동산·주식·재테크" },
    { title: "우리동네부동산", isVideo: true },
    { title: "정치·경제·사회" },
    { title: "세무·법률", flex: 1 },
    { title: "여행·건강·생활", flex: 1 },
  ];

  return (
    <>
      {/* 5. Hot Issue: 부동산·주식·재테크 */}
      <div className="mt-50 mb-50">
        <div className="sec-title-wrap">
          <h2 className="sec-title">부동산·주식·재테크</h2>
        </div>
        <div className="hot-issue-wrap">
          <div className="hi-left">
            <div className="hi-list">
              {[
                { title: '대법원, 신반포2차 재건축 상가 분쟁에 마침표..."조합원 전원 동의 불필요"', desc: '대법원, 상가 산정 비율 관련 소송서 조합 승소 판결...\'전원 동의\' 족쇄 풀었다...' },
                { title: '서울 아파트 공시가 18.7% 급등... "한강벨트" 보유세 50% 이상 오를 듯', desc: '서울 공동주택 공시가 \'어깨\' 단계에서 18.7% 급등...건전 공동주택(3.7%) 3배 수준...' },
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

      {/* 6. Video News: 우리동네부동산 */}
      <div className="video-wrap mb-50">
        <div className="sec-title-wrap">
          <h2 className="sec-title">우리동네부동산</h2>
        </div>
        <div className="video-grid">
          {["우리동네 생활", "강남역 도보권, 다용도 투자 가치 매물 동향", "강남3구 아파트, 서울 집값 상승을 이끌다"].map((title, i) => (
            <div key={i} className="vid-item">
              <div className="vid-thumb">
                <div className="vid-play"></div>
              </div>
              <div className="vid-title">{title}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 7-2. 정치·경제·사회 */}
      <div className="mt-50 mb-50">
        <div className="sec-title-wrap">
          <h2 className="sec-title">정치·경제·사회</h2>
        </div>
        <div className="hot-issue-wrap">
          <div className="hi-left">
            <div className="hi-list">
              {[
                { title: '이란, "공격 중단" 하루 만에 번복... 중동 확전 위기 최고조', desc: '이란 대통령, 핵무기 시설 용인 불안감...' },
                { title: '중동 지정학적 리스크 격화, "고유가-주가 하락" 한국 경제 어떻게 되나', desc: '중동 분쟁 심화로 국제 유가 급등 전망 가능...' },
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

      {/* 7-3. 세무·법률 + 여행·건강·생활 (2단 병렬) */}
      <div className="mt-50 mb-50">
        <div className="hot-issue-wrap" style={{ gap: 40 }}>
          <div className="hi-left" style={{ flex: 1 }}>
            <div className="sec-title-wrap">
              <h2 className="sec-title">세무·법률</h2>
            </div>
            <div className="hi-list">
              {[
                { title: '"사망 전 10년 기록 더 본다"...상속세 쟁점 타격 포인트 7가지', desc: '사망 전 상속세 레이더...' },
                { title: '부모님 자산 형태에 따른 세무 가이드', desc: '"부모님 명의든, 그냥 내줘 손색해"...' },
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
                { title: '어디서나 진료... 비대면 진료 의료 패러다임 전환', desc: '의원급이상 비대면진료...' },
                { title: '"AI 가이드와 함께"...북한산, 스마트 관광으로 진화', desc: '국내 명산의 스마트 트래킹...' },
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
    </>
  );
}
