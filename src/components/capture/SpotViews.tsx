"use client";

import { useEffect, useRef } from "react";

/* 실제 화면 찍기용 지도·로드뷰 (2026-11-09) — 단지(/apt-capture)·매물(/spot-capture)이 같이 쓴다 */

/** 화면 가득 지도 — sky: 스카이뷰(위성+이름) 가까이 · 아니면 일반 지도 한 단계 넓게(역·학교·큰길 이름이 보이게). 다 그려지면 data-map-ready */
export function BigMap({ lat, lng, name, sky, marker = true, level }: { lat: number; lng: number; name: string; sky: boolean; marker?: boolean; level?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const kakao = (window as unknown as { kakao?: any }).kakao; // eslint-disable-line @typescript-eslint/no-explicit-any
    const box = ref.current;
    if (!kakao?.maps || !box) return;
    const pos = new kakao.maps.LatLng(lat, lng);
    const map = new kakao.maps.Map(box, { center: pos, level: level ?? (sky ? 2 : 5) });
    if (sky) map.setMapTypeId(kakao.maps.MapTypeId.SKYVIEW); // 글자 없는 위성 — 단지 동 배치가 잘 보이게
    if (marker) new kakao.maps.Marker({ position: pos, map, title: name });
    kakao.maps.event.addListener(map, "tilesloaded", () => { box.dataset.mapReady = "1"; });
  }, [lat, lng, name, sky, marker, level]);
  return <div ref={ref} style={{ width: "100%", height: "100%" }} />;
}

/** 단지 쪽을 보는 로드뷰 — 가까운 로드뷰 지점을 찾아(50m→300m) 카메라를 단지 방향으로 돌린다. 다 뜨면 data-roadview-status="ready"
 *  (공실 상세와 같이 쓰는 utils/kakaoRoadview 는 건드리지 않으려고 따로 둔다) */
export function StreetView({ lat, lng }: { lat: number; lng: number }) {
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

