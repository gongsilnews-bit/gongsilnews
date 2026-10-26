"use client";

import { useRouter } from "next/navigation";

/**
 * 헤더 없는 부동산특강 화면(강의 상세·나의 강의실) 경로 줄 맨 앞 [‹] — 이전 화면으로 (2026-10-26 사장님).
 * 새 탭에서 바로 열어 이전 화면이 없으면 부동산특강 첫 화면(/study)으로.
 */
export default function StudyBackButton({ divider = true }: { divider?: boolean } = {}) {
  const router = useRouter();
  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push("/study");
  };
  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="이전 화면"
      title="이전 화면"
      style={{ background: "none", border: "none", padding: 0, marginRight: 10, cursor: "pointer", color: "#334155", fontSize: 14, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}
    >
      <span style={{ fontSize: 20, lineHeight: 1 }}>‹</span> 이전화면
      {divider && <span aria-hidden style={{ width: 1, height: 14, background: "#cbd5e1", marginLeft: 10 }} />}
    </button>
  );
}
