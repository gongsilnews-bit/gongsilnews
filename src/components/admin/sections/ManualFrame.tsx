"use client";

/**
 * 관리자 화면의 [매뉴얼] 메뉴.
 *
 * 매뉴얼 내용은 앱 코드에 두지 않는다. public/manual/<kind>/ 의 독립 HTML 을 띄우기만 한다.
 * 부동산·일반·비즈니스 매뉴얼이 각자 폴더라서 한쪽을 고쳐도 다른 쪽이 흔들리지 않고,
 * 같은 주소를 로그인 없이 카톡·블로그로 공유할 수도 있다.
 */
export default function ManualFrame({ kind }: { kind: "realtor" | "user" | "biz" }) {
  const src = `/manual/${kind}/index.html?embed=1`;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, margin: 16, marginBottom: 0, borderTopLeftRadius: 12, borderTopRightRadius: 12, overflow: "hidden", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 12px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
        <a href={`/manual/${kind}/index.html`} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 700, color: "#2563eb", textDecoration: "none" }}>
          새 창에서 크게 보기 ↗
        </a>
      </div>
      <iframe src={src} title="공실뉴스 매뉴얼" style={{ flex: 1, width: "100%", border: 0 }} />
    </div>
  );
}
