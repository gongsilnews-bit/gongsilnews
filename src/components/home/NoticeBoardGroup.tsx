export default function NoticeBoardGroup() {
  return (
    <div className="mt-50 mb-50">
      <div className="hot-issue-wrap">
        <div className="hi-left">
          <div className="sec-title-wrap">
            <h2 className="sec-title">기타</h2>
          </div>
          <div className="hi-list">
             {[
                { title: '한국 대표팀, 3월 14일 미국 마이애미서 8강 격돌', desc: '한국, 3월 14일 미국 마이애미에서 8강전 및 총리...' },
                { title: '"올림픽 아는지도 모른다"... 한국에선 무관심', desc: '세계 시대 올림픽적 스단 부재에 그불 것...' },
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
  );
}
