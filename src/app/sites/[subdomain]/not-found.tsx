/**
 * 없는 주소로 들어왔을 때.
 *
 * 화면은 page.tsx 의 안내와 같지만, 이 파일로 그리면 응답이 404 로 나간다.
 * 페이지가 그냥 JSX 를 돌려주면 200 이라, 검색엔진이 "페이지를 찾을 수 없습니다"를
 * 멀쩡한 페이지로 색인한다.
 *
 * 닫힌 홈페이지(결제 만료·중지)는 여기가 아니라 503 이다 — middleware 참고.
 */
export default function SubdomainNotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f6f8fa",
        fontFamily: "'Pretendard Variable', -apple-system, sans-serif",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: "100%",
          background: "#fff",
          border: "1px solid #e8ecf0",
          borderRadius: 12,
          padding: "44px 26px",
          boxShadow: "0 1px 3px rgba(16,24,40,.08)",
        }}
      >
        <h1 style={{ fontSize: 21, fontWeight: 800, color: "#16202b", margin: "0 0 14px 0", letterSpacing: "-0.5px" }}>
          페이지를 찾을 수 없습니다
        </h1>
        <p style={{ fontSize: 15, color: "#6b7684", lineHeight: 1.75, margin: "0 0 26px 0", wordBreak: "keep-all" }}>
          존재하지 않는 주소입니다. 주소를 다시 확인해 주세요.
        </p>
        <a
          href="https://gongsilnews.com"
          style={{ display: "inline-block", padding: "13px 24px", background: "#16202b", color: "#fff", borderRadius: 8, fontSize: 15, fontWeight: 800, textDecoration: "none" }}
        >
          공실뉴스로 가기
        </a>
      </div>
    </div>
  );
}
