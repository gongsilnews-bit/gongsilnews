export default function HeroSideContent() {
  const hotNews = [
    { title: "부동산 규제지역 추가 해제... 주택시장 훈풍 부나", date: "2026.04.01", img: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80" },
    { title: "로또청약은 옛말이다 분양가 상한제 개편 이후", date: "2026.03.31", img: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80" },
    { title: "강남 재건축 단지 신고가 속출... 하반기 전망은", date: "2026.03.30", img: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80" },
  ];

  return (
    <div className="hero-right" style={{ marginTop: 0 }}>
      <div style={{ marginTop: 0, marginBottom: 30, width: "100%", height: 180, background: "#f0f0f0", border: "1px solid #ccc", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#555" }}>
        배너 1
      </div>
      <div className="hn-header">
        <h2>HOT 공실뉴스</h2>
        <a href="#">더보기 &gt;</a>
      </div>
      <div className="hn-list" style={{ marginBottom: 0 }}>
        {hotNews.map((item, i) => (
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
  );
}
