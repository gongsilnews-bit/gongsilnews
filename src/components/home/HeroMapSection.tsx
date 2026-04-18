"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getVacanciesForMap } from "@/app/actions/vacancy";

const CATEGORY_OPTIONS = [
  { label: "전체", value: "" },
  { label: "아파트·오피스텔", value: "아파트·오피스텔" },
  { label: "빌라·주택", value: "빌라·주택" },
  { label: "원룸·투룸", value: "원룸·투룸(풀옵션)" },
  { label: "상가·사무실", value: "상가·사무실·건물·공장·토지" },
  { label: "분양", value: "분양" },
];

export default function HeroMapSection({ initialVacancies }: { initialVacancies?: any[] }) {
  const router = useRouter();
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [category, setCategory] = useState("");
  const [showList, setShowList] = useState(true);
  const mapRef = useRef<any>(null);
  const kakaoMapRef = useRef<any>(null);
  const clustererRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const markerIdMapRef = useRef<Map<any, string>>(new Map());
  const dbVacanciesRef = useRef<any[]>([]);

  const [selectedClusterIds, setSelectedClusterIds] = useState<string[] | null>(null);
  const selectedClusterIdsRef = useRef<string[] | null>(null);
  const [mapBounds, setMapBounds] = useState<any>(null);

  useEffect(() => {
    dbVacanciesRef.current = vacancies;
  }, [vacancies]);

  useEffect(() => {
    selectedClusterIdsRef.current = selectedClusterIds;
    
    if (markersRef.current && (window as any).kakao?.maps) {
       const size = 36;
       const normalSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="%234b89ff" stroke="white" stroke-width="2"/><text x="50%25" y="50%25" dy="1px" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="14" font-weight="bold" font-family="sans-serif">1</text></svg>`;
       const activeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="white" stroke="%234b89ff" stroke-width="2"/><text x="50%25" y="50%25" dy="1px" text-anchor="middle" dominant-baseline="middle" fill="%234b89ff" font-size="14" font-weight="bold" font-family="sans-serif">1</text></svg>`;

       markersRef.current.forEach((marker: any) => {
          const idStr = markerIdMapRef.current.get(marker);
          const isSelected = selectedClusterIds && idStr && selectedClusterIds.includes(idStr);
          marker.setImage(new (window as any).kakao.maps.MarkerImage(
             `data:image/svg+xml,${isSelected ? activeSvg : normalSvg}`,
             new (window as any).kakao.maps.Size(size, size),
             { offset: new (window as any).kakao.maps.Point(size / 2, size / 2) }
          ));
          marker.setZIndex(isSelected ? 99 : 0);
       });
    }

    if (clustererRef.current) {
       clustererRef.current.redraw();
    }
  }, [selectedClusterIds]);

  // Fetch vacancies from DB via server action if not provided via props
  useEffect(() => {
    const processData = (data: any[]) => {
      const withImages = data.map((v: any) => ({
        ...v,
        photos: v.vacancy_photos ? [...v.vacancy_photos].sort((a: any, b: any) => a.sort_order - b.sort_order).map((p: any) => p.url) : [],
      }));
      const filtered = withImages.filter((v: any) => v.status === 'ACTIVE' && v.lat && v.lng);
      setVacancies(filtered);
    };

    if (initialVacancies && initialVacancies.length > 0) {
      processData(initialVacancies);
    } else {
      const fetchData = async () => {
        const res = await getVacanciesForMap();
        if (res.success && res.data) {
          processData(res.data);
        }
      };
      fetchData();
    }
  }, [initialVacancies]);

  // Preload Kakao Map script immediately on mount
  const [mapLoaded, setMapLoaded] = useState(false);
  useEffect(() => {
    if ((window as any).kakao && (window as any).kakao.maps && typeof (window as any).kakao.maps.LatLng === "function") {
      setMapLoaded(true);
      return;
    }
    const scriptId = "kakao-map-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      const kakaoApiKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc";
      script.id = scriptId;
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoApiKey}&libraries=services,clusterer&autoload=false`;
      document.head.appendChild(script);
      script.onload = () => {
        (window as any).kakao.maps.load(() => {
          setMapLoaded(true);
        });
      };
    } else {
      const check = setInterval(() => {
        if ((window as any).kakao && (window as any).kakao.maps && typeof (window as any).kakao.maps.LatLng === "function") {
          clearInterval(check);
          setMapLoaded(true);
        }
      }, 100);
    }
  }, []);

  const filteredVacancies = useMemo(() => {
    if (!category) return vacancies;
    return vacancies.filter(v => v.property_type === category);
  }, [vacancies, category]);

  // Format price
  const formatAmount = (amt: number) => {
    if (!amt) return "0";
    const m = Math.round(amt / 10000);
    if (m === 0) return "0";
    const e = Math.floor(m / 10000);
    const r = m % 10000;
    let result = "";
    if (e > 0) result += `${e}억`;
    if (r > 0) {
      const c = Math.floor(r / 1000);
      const rem = r % 1000;
      let rest = "";
      if (c > 0) rest += `${c}천`;
      if (rem > 0) rest += `${rem}`;
      if (rest) result += result ? " " + rest : rest;
      if (e === 0 && c === 0 && rem > 0) result += "만";
    }
    return result || "0";
  };

  const getPriceText = (row: any) => {
    if (!row) return "";
    return row.trade_type === "매매" ? `매매 ${formatAmount(row.deposit)}`
      : row.trade_type === "전세" ? `전세 ${formatAmount(row.deposit)}`
      : `${formatAmount(row.deposit)}/${formatAmount(row.monthly_rent)}`;
  };

  // 1. Initialize empty Kakao Map as soon as SDK loads
  useEffect(() => {
    if (!mapLoaded) return;
    const kakao = (window as any).kakao;
    const container = mapRef.current;
    if (!container || kakaoMapRef.current) return;

    // Default to Seoul
    const map = new kakao.maps.Map(container, {
      center: new kakao.maps.LatLng(37.498095, 127.027610),
      level: 7,
    });
    
    // 확대(줌인) / 축소(줌아웃) 범위 제한
    map.setMinLevel(3); // 스크린샷 참고: 너무 가깝게 확대되지 않도록 제한
    map.setMaxLevel(7); // 스크린샷 참고: 너무 멀게 축소되지 않도록 제한
    
    kakaoMapRef.current = map;

    // Initially set bounds and update on move
    setMapBounds(map.getBounds());
    kakao.maps.event.addListener(map, 'idle', () => {
      setMapBounds(map.getBounds());
    });
  }, [mapLoaded]);

  // 2. Add markers and clusterer when map is ready AND data is loaded
  useEffect(() => {
    if (!kakaoMapRef.current || filteredVacancies.length === 0) return;

    const kakao = (window as any).kakao;
    const map = kakaoMapRef.current;

    // Clear old markers
    if (clustererRef.current) clustererRef.current.clear();
    markersRef.current = [];
    markerIdMapRef.current.clear();

    const newMarkers: any[] = [];
    filteredVacancies.forEach(prop => {
      if (!prop.lat || !prop.lng) return;
      const position = new kakao.maps.LatLng(prop.lat, prop.lng);
      const size = 36;
      const strId = String(prop.id);
      const isSelected = selectedClusterIdsRef.current?.includes(strId);

      const normalSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="%234b89ff" stroke="white" stroke-width="2"/><text x="50%25" y="50%25" dy="1px" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="14" font-weight="bold" font-family="sans-serif">1</text></svg>`;
      const activeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="white" stroke="%234b89ff" stroke-width="2"/><text x="50%25" y="50%25" dy="1px" text-anchor="middle" dominant-baseline="middle" fill="%234b89ff" font-size="14" font-weight="bold" font-family="sans-serif">1</text></svg>`;
      const svgStr = isSelected ? activeSvg : normalSvg;

      const marker = new kakao.maps.Marker({
        position,
        image: new kakao.maps.MarkerImage(`data:image/svg+xml,${svgStr}`, new kakao.maps.Size(size, size), { offset: new kakao.maps.Point(size / 2, size / 2) }),
        title: strId
      });
      markerIdMapRef.current.set(marker, strId);

      kakao.maps.event.addListener(marker, 'click', () => {
          setSelectedClusterIds([strId]);
          setShowList(true);
      });

      newMarkers.push(marker);
    });

    markersRef.current = newMarkers;

    const clusterer = new kakao.maps.MarkerClusterer({
      map,
      markers: newMarkers,
      gridSize: 60,
      minLevel: 4,
      minClusterSize: 2,
      disableClickZoom: true,
      calculator: [10, 30, 50],
      styles: [
        { width: "44px", height: "44px", background: "#4b89ff", borderRadius: "50%", color: "#fff", textAlign: "center", lineHeight: "38px", fontSize: "15px", fontWeight: "bold", border: "3px solid rgba(255,255,255,0.8)", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" },
        { width: "54px", height: "54px", background: "#3a6fe0", borderRadius: "50%", color: "#fff", textAlign: "center", lineHeight: "48px", fontSize: "17px", fontWeight: "bold", border: "3px solid rgba(255,255,255,0.8)", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" },
        { width: "64px", height: "64px", background: "#2856b8", borderRadius: "50%", color: "#fff", textAlign: "center", lineHeight: "58px", fontSize: "19px", fontWeight: "bold", border: "3px solid rgba(255,255,255,0.8)", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" },
      ],
    });
    clustererRef.current = clusterer;

    // Cluster click -> Filter list without zooming
    kakao.maps.event.addListener(clusterer, 'clusterclick', (cluster: any) => {
      const markers = cluster.getMarkers();
      const ids = markers.flatMap((m: any) => {
          const pos = m.getPosition();
          return dbVacanciesRef.current.filter((v: any) => Math.abs(v.lat - pos.getLat()) < 0.00001 && Math.abs(v.lng - pos.getLng()) < 0.00001).map((v: any) => String(v.id));
      });
      setSelectedClusterIds(Array.from(new Set(ids)));
      setShowList(true);
    });

    // Retain cluster styling
    kakao.maps.event.addListener(clusterer, 'clustered', (clusters: any[]) => {
        if (!selectedClusterIdsRef.current || selectedClusterIdsRef.current.length === 0) return;
        clusters.forEach(cluster => {
          const markers = cluster.getMarkers();
          if (markers.length < 2) return;
          const ids = markers.flatMap((m: any) => {
              const pos = m.getPosition();
              return dbVacanciesRef.current.filter((v: any) => Math.abs(v.lat - pos.getLat()) < 0.00001 && Math.abs(v.lng - pos.getLng()) < 0.00001).map((v: any) => String(v.id));
          });
          const isMatch = ids.some((id: any) => id && selectedClusterIdsRef.current?.includes(id));
          if (isMatch) {
              const overlay = cluster.getClusterMarker().getContent();
              if (overlay && overlay.style) {
                  overlay.style.background = '#ffffff';
                  overlay.style.color = '#4b89ff';
                  overlay.style.border = '2px solid #4b89ff';
                  overlay.style.zIndex = '999';
              }
          }
        });
    });

    // Fit bounds
    if (newMarkers.length > 0) {
      const bounds = new kakao.maps.LatLngBounds();
      newMarkers.forEach(m => bounds.extend(m.getPosition()));
      map.setBounds(bounds);
    }
  }, [filteredVacancies, mapLoaded]);

  const handleVacancyClick = (id: string | number) => {
    router.push(`/gongsil?id=${id}`);
  };

  return (
    <div className="hero-left" style={{ display: "flex", marginTop: 0, flex: 2.8, position: "relative", minHeight: 480, padding: 0 }}>
      {/* Real Kakao Map */}
      <div ref={mapRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "#e8e8e8" }}></div>

      <button className="map-btn" onClick={() => {
        setSelectedClusterIds(null);
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            if (kakaoMapRef.current) {
               const kakao = (window as any).kakao;
               kakaoMapRef.current.panTo(new kakao.maps.LatLng(lat, lng));
            }
          }, () => {
             alert('위치 정보를 가져올 수 없습니다. 브라우저 설정에서 위치 정보 엑세스 권한을 허용해 주세요.');
          }, { enableHighAccuracy: true });
        } else {
           alert('현재 브라우저에서는 위치 기반 검색 기능을 지원하지 않습니다.');
        }
      }}>내 위치에서 검색</button>
      
      {/* Property List Overlay */}
      {showList && (
        <div style={{ display: "block", position: "absolute", top: 15, left: 15, width: 330, background: "#fff", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", zIndex: 99999, maxHeight: "calc(100% - 30px)", overflowY: "auto" }}>
          <div style={{ padding: "12px 15px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#fff", zIndex: 999999, borderRadius: "10px 10px 0 0" }}>
            <h3 style={{ margin: 0, fontSize: 16, color: "#111", display: "flex", alignItems: "center", fontWeight: 800, cursor: "pointer", letterSpacing: "-0.5px" }} onClick={() => router.push("/gongsil")}>
              실시간 공실
              <svg style={{ marginLeft: 4, color: "#1a73e8" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </h3>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #ccc", fontSize: 12, outline: "none", cursor: "pointer" }}
              >
                {CATEGORY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button onClick={() => setShowList(false)} style={{ fontSize: 16, fontWeight: "bold", color: "#999", cursor: "pointer", padding: "0 4px", background: "none", border: "none" }}>&times;</button>
            </div>
          </div>

          {(() => {
            let displayVacancies = filteredVacancies;
            if (selectedClusterIds && selectedClusterIds.length > 0) {
              displayVacancies = filteredVacancies.filter(v => selectedClusterIds.includes(String(v.id)));
            } else if (mapBounds && (window as any).kakao?.maps) {
              displayVacancies = filteredVacancies.filter(v => {
                if (!v.lat || !v.lng) return false;
                const pos = new (window as any).kakao.maps.LatLng(v.lat, v.lng);
                return mapBounds.contain(pos);
              });
            }

            if (displayVacancies.length === 0) {
              return (
                <div style={{ padding: 20, textAlign: "center", color: "#999", fontSize: 13 }}>
                  등록된 매물이 없습니다.
                </div>
              );
            }

            return displayVacancies.slice(0, 20).map((item) => {
              const photoUrl = item.photos?.[0] || null;
              const addrText = [item.dong, item.building_name, item.hosu].filter(Boolean).join(" ") || item.address || item.title || "매물";
              const typeText = [item.property_type, item.direction, item.exclusive_m2 ? `${item.exclusive_m2}㎡` : null].filter(Boolean).join(" | ");
              const optionsStr = [`룸 ${item.room_count || 0}개`, `욕실 ${item.bath_count || 0}개`, ...(item.options || [])].filter(Boolean).join(", ");
              const phoneText = item.client_phone || item.landlord_phone || (item.members?.phone) || "연락처 비공개";
              
              return (
                <div
                  key={item.id}
                  onClick={() => handleVacancyClick(item.id)}
                  style={{ padding: "16px", borderBottom: "1px solid #f2f2f2", cursor: "pointer", display: "flex", alignItems: "flex-start", justifyContent: "space-between", transition: "background 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f9f9f9")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                >
                  <div style={{ flex: 1, overflow: "hidden", paddingRight: photoUrl ? 12 : 0 }}>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: 14, color: "#111", fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "-0.5px" }}>
                      {addrText}
                    </h4>
                    <div style={{ color: "#1a73e8", fontWeight: 800, fontSize: 15, marginBottom: 4, letterSpacing: "-0.5px" }}>
                      {getPriceText(item)}
                    </div>
                    <div style={{ color: "#666", fontSize: 11.5, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "-0.3px" }}>
                      {item.property_type} <span style={{ color: "#ddd", margin: "0 4px" }}>|</span> {item.direction || "방향없음"} <span style={{ color: "#ddd", margin: "0 4px" }}>|</span> {item.exclusive_m2 ? `${item.exclusive_m2}㎡` : "면적미상"}
                    </div>
                    <div style={{ color: "#666", fontSize: 11, marginBottom: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "-0.3px" }}>
                      {optionsStr}
                    </div>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: "bold" }}>
                      <span style={{ color: "#e74c3c", border: "1px solid #e74c3c", padding: "1px 4px", borderRadius: 2, fontSize: 10, whiteSpace: "nowrap", letterSpacing: "-0.5px" }}>
                        {item.commission_comment || item.commission_type || "공동중개"}
                      </span>
                      <span style={{ color: "#c0392b", whiteSpace: "nowrap", letterSpacing: "-0.2px" }}>
                        {phoneText}
                      </span>
                    </div>
                  </div>
                  {photoUrl && (
                    <div style={{ width: 80, height: 80, borderRadius: 6, flexShrink: 0, border: "1px solid #eee", overflow: "hidden" }}>
                      <img src={photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}
      {!showList && (
        <button
          onClick={() => setShowList(true)}
          style={{ position: "absolute", top: 15, left: 15, zIndex: 99999, background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: "bold", color: "#333", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
        >
          📋 매물 목록 보기
        </button>
      )}
    </div>
  );
}

// touch