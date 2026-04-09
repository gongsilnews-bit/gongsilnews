"use client";

export default function MarketTickerBar() {
  const tickerItems = [
    { name: "매매가격지수 (서울)", value: "102.4", change: "▲ 0.15%", color: "#d32f2f" },
    { name: "전세가격지수 (서울)", value: "105.2", change: "▲ 0.28%", color: "#d32f2f" },
    { name: "전세가격지수 (부산)", value: "96.5", change: "▼ 0.08%", color: "#1976d2" },
    { name: "매매가격지수 (서울)", value: "102.4", change: "▲ 0.15%", color: "#d32f2f" },
    { name: "코스피", value: "5,522.75", change: "▲ 0.8%", color: "#d32f2f" },
    { name: "코스닥", value: "812.45", change: "▼ 0.3%", color: "#1976d2" },
  ];

  return (
    <div className="ticker-bar">
      <a href="#" className="ticker-label">
        실시간 부동산 지수 <span style={{ fontSize: 12, marginLeft: 8 }}>&gt;</span>
      </a>
      <div className="ticker-wrap">
        <div className="ticker">
          {Array.from({ length: 30 }).map((_, repeatIdx) =>
            tickerItems.map((item, i) => (
              <div className="ticker-item" key={`${repeatIdx}-${i}`}>
                <span>{item.name}</span>
                <span className="ticker-val" style={{ color: item.color }}>
                  {item.value} {item.change}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
