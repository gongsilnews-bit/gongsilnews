"use client";

interface GongsilMobileAccessOverlayProps {
  isAuctionProperty: boolean;
  onbidCount: number | null;
  currentUser: unknown;
  vacancyId?: string;
  onClose: () => void;
}

export default function GongsilMobileAccessOverlay({
  isAuctionProperty,
  onbidCount,
  currentUser,
  vacancyId,
  onClose,
}: GongsilMobileAccessOverlayProps) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(255, 255, 255, 0.96)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", zIndex: 999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "30px 20px", textAlign: "center", boxSizing: "border-box" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)", border: "2px solid #f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, marginBottom: 16, boxShadow: "0 8px 20px rgba(245, 158, 11, 0.2)" }}>
        🔒
      </div>
      <h3 style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", margin: "0 0 10px", letterSpacing: "-0.5px", lineHeight: 1.35 }}>
        {isAuctionProperty ? <>회원가입하시면<br />무료 열람</> : <>중개업소 회원만<br />열람할 수 있습니다</>}
      </h3>
      <p style={{ fontSize: 13.5, color: "#64748b", lineHeight: 1.6, margin: "0 0 24px", wordBreak: "keep-all", maxWidth: 300 }}>
        {isAuctionProperty ? (
          <>매물 최신일자로 업데이트됩니다.<br />전국 <strong style={{ color: "#dc2626" }}>{onbidCount !== null ? onbidCount.toLocaleString() : "-"}건</strong> 경매 물건 ({String(new Date().getFullYear()).slice(-2)}년{new Date().getMonth() + 1}월{new Date().getDate()}일)</>
        ) : (
          <>부동산 대표님이시라면 <strong>100% 무료 중개업소 등록</strong> 후 실매물을 즉시 열람하실 수 있습니다.</>
        )}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280 }}>
        <button onClick={() => {
          if (isAuctionProperty) {
            window.location.href = "/m/login?returnTo=" + encodeURIComponent(`/m/gongsil?id=${vacancyId}`);
          } else if (!currentUser) {
            localStorage.setItem("signup_member_type", "broker");
            window.location.href = "/m/newsrealty";
          } else {
            window.location.href = "/m/admin/settings?tab=agency";
          }
        }} style={{ width: "100%", padding: "13px 0", background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", color: "#fff", border: "none", borderRadius: 10, fontSize: 14.5, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)" }}>
          {isAuctionProperty ? "무료 회원가입하기" : "✨ 중개업소 무료 가입하기 →"}
        </button>
        {!currentUser && !isAuctionProperty && (
          <button onClick={() => window.location.replace("/m/login?returnTo=" + encodeURIComponent(`/m/gongsil?id=${vacancyId}`))} style={{ width: "100%", padding: "11px 0", background: "#fff", color: "#475569", border: "1px solid #cbd5e1", borderRadius: 10, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
            🔑 로그인
          </button>
        )}
        <button onClick={onClose} style={{ width: "100%", padding: "8px 0", background: "transparent", color: "#94a3b8", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          닫기 (뒤로가기)
        </button>
      </div>
    </div>
  );
}
