import React from "react";
import LoadingDots from "@/components/common/LoadingDots";

export default function SearchLoading() {
  return (
    <main className="container px-20" style={{ paddingBottom: "60px" }}>
      <div style={{ marginTop: "30px", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#111" }}>
          검색결과 조회 중
        </h1>
      </div>
      <LoadingDots label="검색결과를 불러오고 있습니다" fullScreen size="lg" />
    </main>
  );
}
