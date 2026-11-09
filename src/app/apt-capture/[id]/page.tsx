"use client";
/**
 * 단지 시세 캡처용 화면 (2026-11-03 사장님: "단지/시세도 3~5장 정도 캡쳐해줘", "시세 캡쳐 로드뷰 캡쳐 실거래 금액 캡쳐")
 *  앱이 안 보이는 창으로 이 주소를 열어 찍는다 (video:capture-page).
 *  ?part=chart — 시세·그래프 · ?part=trades — 실거래 내역 · ?part=roadview — 로드뷰 크게 · ?part=map — 위치 지도 크게 · 없으면 전체(시세·실거래·단지 정보)
 *  ?part=sky — 스카이뷰(위성) 단지 전경 · ?part=wide — 넓은 지도(역·학교·큰길) · ?part=street — 단지 쪽을 보는 로드뷰 — 웹 기사쓰기 실제 화면 찍기용 (2026-11-09)
 */
import { use, useEffect, useRef, useState } from "react";
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
    if (part !== "roadview" && part !== "map" && part !== "sky" && part !== "wide" && part !== "street") return;
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
  if (part === "street") {
    return (
      <main style={{ width: "100vw", height: "100vh", background: "#111" }}>
        {kakao && Number.isFinite(detail.lat) && <StreetView lat={detail.lat} lng={detail.lng} />}
      </main>
    );
  }
  if (part === "sky" || part === "wide") {
    return (
      <main style={{ width: "100vw", height: "100vh", background: "#fff" }}>
        {kakao && Number.isFinite(detail.lat) && <BigMap lat={detail.lat} lng={detail.lng} name={detail.name} sky={part === "sky"} />}
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

/** 화면 가득 지도 — sky: 스카이뷰(위성+이름) 가까이 · 아니면 일반 지도 한 단계 넓게(역·학교·큰길 이름이 보이게). 다 그려지면 data-map-ready */
function BigMap({ lat, lng, name, sky }: { lat: number; lng: number; name: string; sky: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const kakao = (window as unknown as { kakao?: any }).kakao; // eslint-disable-line @typescript-eslint/no-explicit-any
    const box = ref.current;
    if (!kakao?.maps || !box) return;
    const pos = new kakao.maps.LatLng(lat, lng);
    const map = new kakao.maps.Map(box, { center: pos, level: sky ? 2 : 5 });
    if (sky) map.setMapTypeId(kakao.maps.MapTypeId.SKYVIEW); // 글자 없는 위성 — 단지 동 배치가 잘 보이게
    new kakao.maps.Marker({ position: pos, map, title: name });
    kakao.maps.event.addListener(map, "tilesloaded", () => { box.dataset.mapReady = "1"; });
  }, [lat, lng, name, sky]);
  return <div ref={ref} style={{ width: "100%", height: "100%" }} />;
}

/** 단지 쪽을 보는 로드뷰 — 가까운 로드뷰 지점을 찾아(50m→300m) 카메라를 단지 방향으로 돌린다. 다 뜨면 data-roadview-status="ready"
 *  (공실 상세와 같이 쓰는 utils/kakaoRoadview 는 건드리지 않으려고 따로 둔다) */
function StreetView({ lat, lng }: { lat: number; lng: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const kakao = (window as unknown as { kakao?: any }).kakao; // eslint-disable-line @typescript-eslint/no-explicit-any
    const box = ref.current;
    if (!kakao?.maps || !box) return;
    const target = new kakao.maps.LatLng(lat, lng);
    const client = new kakao.maps.RoadviewClient();
    const rv = new kakao.maps.Roadview(box);
    const bearing = (from: { getLat: () => number; getLng: () => number }) => {
      const r = Math.PI / 180, p1 = from.getLat() * r, p2 = lat * r, dl = (lng - from.getLng()) * r;
      const y = Math.sin(dl) * Math.cos(p2), x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
      return (Math.atan2(y, x) / r + 360) % 360;
    };
    let alive = true;
    kakao.maps.event.addListener(rv, "init", () => {
      if (!alive) return;
      rv.setViewpoint({ pan: bearing(rv.getPosition()), tilt: 8, zoom: 0 });
      setTimeout(() => { if (alive) box.dataset.roadviewStatus = "ready"; }, 1500);
    });
    const tryAt = (radii: number[]) => {
      if (!radii.length) { box.dataset.roadviewStatus = "failed"; return; }
      client.getNearestPanoId(target, radii[0], (id: number | null) => {
        if (!alive) return;
        if (id) rv.setPanoId(id, target); else tryAt(radii.slice(1));
      });
    };
    tryAt([50, 100, 200, 300]);
    return () => { alive = false; };
  }, [lat, lng]);
  return <div ref={ref} style={{ width: "100%", height: "100%" }} />;
}

