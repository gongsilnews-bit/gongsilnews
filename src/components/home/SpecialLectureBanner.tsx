import Link from "next/link";

export default function SpecialLectureBanner() {
  const lectures = [
    { cat: "실무/마케팅", title: "[2026] 부동산이 쉽게 활용하는 유튜브 쇼츠 운영법", instructor: "공실마스터 특강", rating: "4.9 (137)", price: "2,000 P", isNew: true },
    { cat: "경매/특수물건", title: "[2026] 부동산이 알아야 하는 민법 활용법", instructor: "공실마스터 특강", rating: "4.8 (198)", price: "3,000 P", isNew: true },
    { cat: "재개발/투자", title: "[2026] 부동산 중개에 필요한 재개발 활용법", instructor: "공실마스터 특강", rating: "4.9 (154)", price: "5,000 P", isNew: false },
  ];

  return (
    <div className="container px-20 mt-50 mb-50">
      <div className="sec-title-wrap">
        <h2 className="sec-title" id="special-lecture" style={{ scrollMarginTop: 150 }}>부동산특강</h2>
      </div>
      <div className="lecture-grid mb-50">
        {lectures.map((item, i) => (
          <Link href="/study_read" key={i} className="lecture-card" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div className="lecture-thumb">
              <div style={{ width: "100%", height: "100%", background: "#eee" }}></div>
              {item.isNew && <span className="badge-new">NEW🔥</span>}
              <div className="bookmark-btn">🔖</div>
            </div>
            <div className="lecture-info" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div className="lecture-cat">{item.cat}</div>
              <h3 className="lecture-title" style={{ wordBreak: "keep-all" }}>{item.title}</h3>
              <div className="lecture-meta">
                <span className="instructor">{item.instructor}</span>
                <div className="rating">★ {item.rating}</div>
              </div>
              <div style={{ marginTop: "auto" }}>
                <div style={{ fontWeight: 800, color: "#111", fontSize: 17, background: "#f8fafc", padding: "10px 14px", borderRadius: 8, display: "inline-block", border: "1px solid #e2e8f0" }}>
                  {item.price}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
