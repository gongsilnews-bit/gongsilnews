"use client";
/**
 * 단지 시세 캡처용 화면 (2026-11-03 사장님: "단지/시세도 3~5장 정도 캡쳐해줘", "시세 캡쳐 로드뷰 캡쳐 실거래 금액 캡쳐")
 *  앱이 안 보이는 창으로 이 주소를 열어 찍는다 (video:capture-page).
 *  ?part=chart — 시세·그래프 · ?part=trades — 실거래 내역 · ?part=roadview — 로드뷰 크게 · ?part=map — 위치 지도 크게 · 없으면 전체(시세·실거래·단지 정보)
 */
import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AptDetailPanel, { MiniMap, Roadview, type AptDetail } from "@/app/(map)/gongsil/AptDetailPanel";

const KAKAO = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc";

export default function AptCapturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const part = useSearchParams().get("part") || "";
  const [detail, setDetail] = useState<AptDetail | null>(null);
  const [err, setErr] = useState("");
  const [kakao, setKakao] = useState(false);
  useEffect(() => {
    fetch(`/api/apt-prices?id=${encodeURIComponent(decodeURIComponent(id))}`)
      .then((r) => r.json())
      .then((j) => (j?.success ? setDetail(j.complex) : setErr(j?.error || "단지를 찾지 못했습니다.")))
      .catch(() => setErr("단지를 불러오지 못했습니다."));
  }, [id]);
  // 로드뷰는 카카오 지도 프로그램이 있어야 그린다
  useEffect(() => {
    if (part !== "roadview" && part !== "map") return;
    const w = window as unknown as { kakao?: { maps?: { load: (f: () => void) => void } } };
    if (w.kakao?.maps) { w.kakao.maps.load(() => setKakao(true)); return; }
    const s = document.createElement("script");
    s.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO}&libraries=services&autoload=false`;
    s.onload = () => w.kakao?.maps?.load(() => setKakao(true));
    document.head.appendChild(s);
  }, [part]);

  if (!detail) return <main style={{ textAlign: "center", padding: 80, color: "#6b7280" }}>{err || "불러오는 중…"}</main>;
  if (part === "map") {
    return (
      <main style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", background: "#fff" }}>
        <div style={{ flex: 1, position: "relative" }} className="gs-rv-big">
          <style>{`.gs-rv-big > div { height: 100% !important; }`}</style>
          {kakao && Number.isFinite(detail.lat) && <MiniMap lat={detail.lat} lng={detail.lng} name={detail.name} />}
        </div>
      </main>
    );
  }
  if (part === "roadview") {
    return (
      <main style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", background: "#111" }}>
        <div style={{ flex: 1, position: "relative" }} className="gs-rv-big">
          <style>{`.gs-rv-big > div { height: 100% !important; }`}</style>
          {kakao && Number.isFinite(detail.lat) && <Roadview lat={detail.lat} lng={detail.lng} />}
        </div>
      </main>
    );
  }
  return (
    <main style={{ minHeight: "100vh", background: "#e5e7eb", padding: part ? "56px 0 60px" : "24px 0 60px", position: "relative" }}>
      {/* 이름표 — 캡처가 이 글자를 찾아 그 자리부터 찍는다 (사진마다 제목이 달라 파일이 겹치지 않게) */}
      {(part === "trades" || part === "chart") && (
        <h2 style={{ position: "absolute", left: "calc(50% - 500px)", top: 14, margin: 0, padding: "5px 12px", borderRadius: 14, background: "rgba(55,65,81,.88)", color: "#fff", fontSize: 14, fontWeight: 800 }}>
          {part === "trades" ? "실거래가" : "시세 그래프"} · {detail.name}
        </h2>
      )}
      <AptDetailPanel flat part={part === "chart" || part === "trades" ? part : undefined} detail={detail} onClose={() => {}} />
    </main>
  );
}
