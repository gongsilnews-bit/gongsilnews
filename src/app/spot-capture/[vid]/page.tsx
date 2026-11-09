"use client";
/**
 * 매물 실제 화면 찍기용 (2026-11-09 사장님: 매물 분석도 단지처럼 5장) — 웹 뉴스·SNS자동화가 창 전체에 띄워 찍는다
 *  ?part=street — 매물 쪽을 보는 로드뷰 · sky — 스카이뷰 · wide — 넓은 지도(역·학교·큰길)
 *  주소 비공개 매물은 street·sky 를 그리지 않고(data-spot="private"), wide 는 표시 없이 한 단계 더 넓게
 */
import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getVacancySpot } from "@/app/actions/spotCapture";
import { BigMap, StreetView } from "@/components/capture/SpotViews";

const KAKAO = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc";

export default function SpotCapturePage({ params }: { params: Promise<{ vid: string }> }) {
  const { vid } = use(params);
  const part = useSearchParams().get("part") || "wide";
  const [spot, setSpot] = useState<{ lat: number; lng: number; name: string; private: boolean } | null | false>(null);
  const [kakao, setKakao] = useState(false);
  useEffect(() => {
    void getVacancySpot(decodeURIComponent(vid)).then((r) => setSpot(r.ok ? { lat: r.lat!, lng: r.lng!, name: r.name || "", private: Boolean(r.private) } : false)).catch(() => setSpot(false));
  }, [vid]);
  useEffect(() => {
    const w = window as unknown as { kakao?: { maps?: { load: (f: () => void) => void } } };
    if (w.kakao?.maps) { w.kakao.maps.load(() => setKakao(true)); return; }
    const s = document.createElement("script");
    s.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO}&libraries=services&autoload=false`;
    s.onload = () => w.kakao?.maps?.load(() => setKakao(true));
    document.head.appendChild(s);
  }, []);
  if (spot === false) return <main data-spot="none" style={{ padding: 80, textAlign: "center", color: "#6b7280" }}>위치를 찾지 못했습니다.</main>;
  if (!spot || !kakao) return <main style={{ padding: 80, textAlign: "center", color: "#6b7280" }}>불러오는 중…</main>;
  if (spot.private && part !== "wide") return <main data-spot="private" style={{ padding: 80, textAlign: "center", color: "#6b7280" }}>주소 비공개 매물</main>;
  return (
    <main style={{ width: "100vw", height: "100vh", background: part === "street" ? "#111" : "#fff" }}>
      {part === "street" ? <StreetView lat={spot.lat} lng={spot.lng} />
        : <BigMap lat={spot.lat} lng={spot.lng} name={spot.name} sky={part === "sky"} marker={!spot.private} level={part === "wide" && spot.private ? 6 : undefined} />}
    </main>
  );
}
