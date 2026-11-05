// 지도 검색 — 주소(지번·도로명)를 먼저, 그 다음 장소(가게·건물 이름) (2026-11-05 사장님: "역삼동 685-19" 위치가 정확히 안 잡히던 것)
// 고른 자리는 "gs-map-pin" 이벤트로 알린다 → 공실열람 지도(AptPriceLayer)가 주소 말풍선 핀을 꽂고, 그 번지 단지가 있으면 단지 창을 연다

export type MapSearchItem = {
  lat: number;
  lng: number;
  title: string; // 목록 굵은 줄
  sub: string; // 목록 회색 줄
  isAddr: boolean; // 주소 검색 결과 (가까이 level 2) · 장소 결과 (level 3)
  label: string; // 핀 말풍선에 적을 글
  dong?: string; // 법정동 — 그 번지 단지 찾기
  jibun?: string; // "685-19"
};

/** 주소 결과는 가까이(건물 하나), 장소 결과는 조금 넓게 */
export const levelFor = (it: MapSearchItem) => (it.isAddr ? 2 : 3);

const jibunOf = (main?: string, sub?: string) => (main ? (sub && sub !== "0" ? `${main}-${sub}` : main) : "");

/** "서울 강남구 역삼동 685-19" → 역삼동, 685-19 (장소 결과에서) */
function splitAddr(addr: string) {
  const m = /(\S+(?:동|가|리|읍|면))\s+(?:산\s*)?(\d+(?:-\d+)?)\s*$/.exec(addr || "");
  return m ? { dong: m[1], jibun: m[2] } : {};
}

export function searchMapPlaces(keyword: string): Promise<MapSearchItem[]> {
  const kakao = (window as any).kakao;
  const q = keyword.trim();
  if (!q || !kakao?.maps?.services) return Promise.resolve([]);
  const OK = kakao.maps.services.Status.OK;
  const addrs = new Promise<MapSearchItem[]>((done) => {
    new kakao.maps.services.Geocoder().addressSearch(q, (data: any[], status: any) => {
      if (status !== OK) return done([]);
      // 행정구역(REGION)은 빼고 — 번지·도로명까지 맞은 것만
      done(data.filter((d) => d.address_type !== "REGION").slice(0, 3).map((d) => {
        const a = d.address || {};
        const road = d.road_address?.address_name || "";
        const jibunAddr = a.address_name || d.address_name;
        const jibun = a.mountain_yn === "Y" ? "" : jibunOf(a.main_address_no, a.sub_address_no);
        return {
          lat: parseFloat(d.y), lng: parseFloat(d.x), isAddr: true,
          title: `📍 ${jibunAddr}`,
          sub: road ? `도로명 ${road}` : "주소",
          label: `${a.region_3depth_name || ""} ${jibun || jibunAddr}`.trim(),
          dong: a.region_3depth_name || undefined, jibun: jibun || undefined,
        };
      }));
    });
  });
  const places = new Promise<MapSearchItem[]>((done) => {
    new kakao.maps.services.Places().keywordSearch(q, (data: any[], status: any) => {
      if (status !== OK) return done([]);
      done(data.map((p) => ({
        lat: parseFloat(p.y), lng: parseFloat(p.x), isAddr: false,
        title: p.place_name || p.address_name, sub: p.address_name,
        label: p.place_name || p.address_name, ...splitAddr(p.address_name),
      })));
    });
  });
  return Promise.all([addrs, places]).then(([a, p]) => [...a, ...p]);
}

/** 고른 자리를 지도에 알린다 (핀 + 그 번지 단지 창) */
export function announceMapPin(it: MapSearchItem) {
  window.dispatchEvent(new CustomEvent("gs-map-pin", { detail: { lat: it.lat, lng: it.lng, label: it.label, dong: it.dong, jibun: it.jibun } }));
}
