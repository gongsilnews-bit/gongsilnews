"use client";

export default function HeroMapSection() {
  const mockProperties = [
    { title: "한양아파트 101동 101호", price: "매매 50억", type: "오피스텔 |", detail: "룸 1개, 욕실 1개, 세탁기,인덕션,주차가능", badge: "공동중개", phone: "010-8831-9450" },
    { title: "동부센트레빌", price: "매매 10억", type: "아파트 |", detail: "룸 1개, 욕실 1개, 에어컨,싱크대", badge: "공동중개", phone: "010-8831-9450" },
    { title: "동부센트레빌 101 101", price: "매매 50억", type: "아파트 |", detail: "룸 3개, 욕실 1개, 에어컨,붙박이장,싱크대...", badge: "공동중개", phone: "010-8831-9450" },
    { title: "가평타운오피스텔 101 101", price: "매매 10억", type: "아파트 |", detail: "룸 1개, 욕실 1개, 에어컨", badge: "공동중개", phone: "010-8831-9450" },
  ];

  return (
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

        {mockProperties.map((item, i) => (
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
  );
}
