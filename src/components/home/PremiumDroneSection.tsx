export default function PremiumDroneSection() {
  return (
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
  );
}
