import React, { useEffect, useRef } from "react";
import MapSearchBar from "@/components/MapSearchBar";
import { getJitteredCoords } from "./gongsilHelpers";

interface KakaoMapViewProps {
  kakaoMapRef: React.MutableRefObject<any>;
  mapLoaded: boolean;
  mapError: string | null;
  initialVacancies: any[];
  filteredVacancies: any[];
  activeCategory: string;
  activeProperty: string | number | null;
  isAuctionMode: boolean;
  setIsAuctionMode: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveMode: React.Dispatch<React.SetStateAction<"공실" | "분양" | "경매">>;
  setActiveCategory: React.Dispatch<React.SetStateAction<string>>;
  setActivePills: React.Dispatch<React.SetStateAction<any[]>>;
  showDetail: boolean;
  setShowDetail: React.Dispatch<React.SetStateAction<boolean>>;
  selectedClusterIds: string[] | null;
  setSelectedClusterIds: React.Dispatch<React.SetStateAction<string[] | null>>;
  selectedRegion: any;
  setSelectedRegion: React.Dispatch<React.SetStateAction<any>>;
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  mapCenterRegion: any;
  setMapCenterRegion: React.Dispatch<React.SetStateAction<any>>;
  setMapBounds: React.Dispatch<React.SetStateAction<any>>;
  handleLocationPermissionDenied: () => void;
  handleLocationUnavailable: () => void;
  activeFilterDropdown: string | null;
  dbVacancies: any[];
}

export default function KakaoMapView({
  kakaoMapRef,
  mapLoaded,
  mapError,
  initialVacancies,
  filteredVacancies,
  activeCategory,
  activeProperty,
  isAuctionMode,
  setIsAuctionMode,
  setActiveMode,
  setActiveCategory,
  setActivePills,
  showDetail,
  setShowDetail,
  selectedClusterIds,
  setSelectedClusterIds,
  selectedRegion,
  setSelectedRegion,
  zoomLevel,
  setZoomLevel,
  mapCenterRegion,
  setMapCenterRegion,
  setMapBounds,
  handleLocationPermissionDenied,
  handleLocationUnavailable,
  activeFilterDropdown,
  dbVacancies,
}: KakaoMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  // Refs for high-performance map marker layer management
  const markersRef = useRef<any[]>([]);
  const clustererRef = useRef<any>(null);
  const markerIdMapRef = useRef<Map<any, string>>(new Map());
  const filteredVacanciesRef = useRef<any[]>([]);
  const selectedClusterIdsRef = useRef<string[] | null>(null);
  const dbVacanciesRef = useRef<any[]>(initialVacancies);
  const lastZoomWasInRef = useRef<boolean>(false);

  // Sync state to refs for standard non-stale callback references inside Kakao Map events
  useEffect(() => {
    filteredVacanciesRef.current = filteredVacancies;
  }, [filteredVacancies]);

  useEffect(() => {
    selectedClusterIdsRef.current = selectedClusterIds;
  }, [selectedClusterIds]);

  useEffect(() => {
    dbVacanciesRef.current = dbVacancies;
  }, [dbVacancies]);

  // 1. Initialize Kakao Map immediately without waiting for data
  useEffect(() => {
    if (!mapLoaded) return;
    const kakao = (window as any).kakao;
    if (!mapRef.current || kakaoMapRef.current) return;

    let initialLat = 37.498095;
    let initialLng = 127.027610;
    if (initialVacancies && initialVacancies.length > 0) {
      const firstValid = initialVacancies.find((v: any) => v.lat && v.lng);
      if (firstValid) {
        initialLat = firstValid.lat;
        initialLng = firstValid.lng;
      }
    }

    kakaoMapRef.current = new kakao.maps.Map(mapRef.current, {
      center: new kakao.maps.LatLng(initialLat, initialLng),
      level: 6,
      draggable: true,
    });

    const map = kakaoMapRef.current;
    setZoomLevel(map.getLevel());
    setMapBounds(map.getBounds()); // 🚀 최초 맵 로드 시 Bounds를 즉각 주입하여 첫 화면 freeze 해결!

    // 제한된 범위 지정 (3: 가장 확대된 상태, 14: 전국 범위)
    map.setMinLevel(3);
    map.setMaxLevel(14);

    // 🚀 PC 페이지를 태블릿/모바일에서 열 때 터치 드래그 강제 활성화
    // Kakao Maps SDK가 데스크톱 모드에서 마우스 이벤트만 수신하므로,
    // 터치 이벤트를 마우스 이벤트로 변환하여 지도에 전달
    if (mapRef.current && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
      const container = mapRef.current;
      const forwardTouch = (e: TouchEvent, mouseType: string) => {
        if (e.touches.length > 1) return; // 핀치줌은 SDK 기본 동작에 위임
        const touch = e.touches[0] || e.changedTouches[0];
        const mouseEvent = new MouseEvent(mouseType, {
          bubbles: true, cancelable: true,
          clientX: touch.clientX, clientY: touch.clientY,
          screenX: touch.screenX, screenY: touch.screenY,
        });
        container.dispatchEvent(mouseEvent);
        if (mouseType !== 'mouseup') e.preventDefault();
      };
      container.addEventListener('touchstart', (e) => forwardTouch(e, 'mousedown'), { passive: false });
      container.addEventListener('touchmove', (e) => forwardTouch(e, 'mousemove'), { passive: false });
      container.addEventListener('touchend', (e) => forwardTouch(e, 'mouseup'), { passive: false });
    }

    kakao.maps.event.addListener(map, "idle", () => {
      setMapBounds(map.getBounds());
      // Reverse Geocoder for the center
      const center = map.getCenter();
      const geocoder = new kakao.maps.services.Geocoder();
      geocoder.coord2RegionCode(center.getLng(), center.getLat(), (result: any, status: any) => {
        if (status === kakao.maps.services.Status.OK) {
          const bCode = result.find((res: any) => res.region_type === "B");
          if (bCode) {
            setMapCenterRegion({
              sido: bCode.region_1depth_name,
              gugun: bCode.region_2depth_name,
              dong: bCode.region_3depth_name,
            });
          }
        }
      });
    });

    kakao.maps.event.addListener(map, "dragstart", () => {
      setSelectedClusterIds(null);
      setSelectedRegion(null);
    });

    kakao.maps.event.addListener(map, "zoom_start", () => {
      setSelectedClusterIds(null);
    });

    kakao.maps.event.addListener(map, "zoom_changed", () => {
      setSelectedClusterIds(null);
      const currentLevel = map.getLevel();
      setZoomLevel(currentLevel);
    });
  }, [mapLoaded]);

  // 숫자 크기(매물 밀집도)에 따라 마커의 버블 크기와 폰트 크기를 다이내믹하게 결정하는 헬퍼 함수
  const getMarkerDimensions = (count: number) => {
    if (count === 1) {
      return { size: 38, radius: 17, fontSize: 13 };
    } else if (count < 10) {
      return { size: 44, radius: 20, fontSize: 14 };
    } else if (count < 100) {
      return { size: 50, radius: 23, fontSize: 15 };
    } else {
      return { size: 58, radius: 27, fontSize: 17 };
    }
  };

  // 가격 및 원형 마커 SVG를 줌 레벨과 밀집도에 따라 동적 생성하는 헬퍼 함수
  const getMarkerSvg = (
    prop: any,
    group: any[],
    isSelected: boolean,
    isZoomedIn: boolean,
    isHover: boolean = false
  ) => {
    const overlappingCount = group.length;
    const color = isAuctionMode ? "%231a4282" : "%234b89ff";
    const textVal = overlappingCount.toString();
    const { size, radius, fontSize } = getMarkerDimensions(overlappingCount);

    const svgSize = isHover ? size + 6 : size;
    const center = svgSize / 2;
    const finalRadius = isHover ? radius + 3 : radius;
    const finalFontSize = isHover ? fontSize + 1 : fontSize;

    if (isHover) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}"><circle cx="${center}" cy="${center}" r="${finalRadius}" fill="${color}" stroke="white" stroke-width="2"/><text x="50%25" y="50%25" dy="1px" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="${finalFontSize}" font-weight="bold" font-family="sans-serif">${textVal}</text></svg>`;
    } else {
      if (isSelected) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}"><circle cx="${center}" cy="${center}" r="${finalRadius}" fill="white" stroke="${color}" stroke-width="2"/><text x="50%25" y="50%25" dy="1px" text-anchor="middle" dominant-baseline="middle" fill="${color}" font-size="${finalFontSize}" font-weight="bold" font-family="sans-serif">${textVal}</text></svg>`;
      } else {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}"><circle cx="${center}" cy="${center}" r="${finalRadius}" fill="${color}" stroke="white" stroke-width="2"/><text x="50%25" y="50%25" dy="1px" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="${finalFontSize}" font-weight="bold" font-family="sans-serif">${textVal}</text></svg>`;
      }
    }
  };

  // Reactive Update of selection markers state for smooth transitions
  useEffect(() => {
    if (markersRef.current && (window as any).kakao?.maps && kakaoMapRef.current) {
      const map = kakaoMapRef.current;
      const isZoomedIn = map.getLevel() <= 5;

      markersRef.current.forEach((marker: any) => {
        const idStr = markerIdMapRef.current.get(marker);
        const prop = filteredVacanciesRef.current.find((v: any) => String(v.id) === idStr);
        if (!prop) return;

        const coordsProp = getJitteredCoords(prop, isZoomedIn);
        const group = filteredVacanciesRef.current.filter((v: any) => {
          const coordsV = getJitteredCoords(v, isZoomedIn);
          return Math.abs(coordsV.lat - coordsProp.lat) < 0.000001 && Math.abs(coordsV.lng - coordsProp.lng) < 0.000001;
        });
        const isSelected = group.some(
          (v) => selectedClusterIds?.includes(String(v.id)) || String(activeProperty) === String(v.id)
        );

        const { size } = getMarkerDimensions(group.length);
        const width = size;
        const height = size;

        const normalSvg = getMarkerSvg(prop, group, isSelected, isZoomedIn, false);
        const activeSvg = getMarkerSvg(prop, group, true, isZoomedIn, false);

        marker.setImage(
          new (window as any).kakao.maps.MarkerImage(
            `data:image/svg+xml,${isSelected ? activeSvg : normalSvg}`,
            new (window as any).kakao.maps.Size(width, height),
            { offset: new (window as any).kakao.maps.Point(width / 2, height / 2) }
          )
        );
        marker.setZIndex(isSelected ? 99 : 0);
      });
    }
  }, [activeProperty, selectedClusterIds]);

  // Main effect to cluster and render vacancies markers
  useEffect(() => {
    if (!kakaoMapRef.current) return;

    // 기존 마커 및 클러스터러를 항상 제거하여 완벽하게 초기화 (메모리 누수 및 중복 렌더링 방지)
    if (clustererRef.current) {
      clustererRef.current.clear();
      clustererRef.current = null;
    }
    if (markersRef.current && markersRef.current.length > 0) {
      markersRef.current.forEach((m: any) => {
        if (m && typeof m.setMap === "function") {
          m.setMap(null);
        }
      });
    }
    markersRef.current = [];
    markerIdMapRef.current.clear();

    // 1. 성능 최적화: 마커는 클러스터 선택에 영향받지 않고 전체 화면/선택지역 범위를 기준으로 노출하여 다른 마커 소멸 방지
    let targetVacancies = filteredVacancies;
    if (activeCategory !== "wish") {
      if (selectedRegion) {
        targetVacancies = targetVacancies.filter((v) => {
          if (selectedRegion.sido && selectedRegion.sido !== "시/도 선택" && selectedRegion.sido !== "-") {
            const vSido = v.sido || "";
            const matchSido =
              vSido.includes(selectedRegion.sido) ||
              selectedRegion.sido.includes(vSido) ||
              selectedRegion.sido.substring(0, 2) === vSido.substring(0, 2);
            if (!matchSido) return false;
          }
          if (selectedRegion.gugun && selectedRegion.gugun !== "-") {
            const vGugun = v.sigungu || "";
            const matchGugun = vGugun.includes(selectedRegion.gugun) || selectedRegion.gugun.includes(vGugun);
            if (!matchGugun) return false;
          }
          if (selectedRegion.dong && selectedRegion.dong !== "-") {
            const vDong = v.dong || "";
            const matchDong = vDong.includes(selectedRegion.dong) || selectedRegion.dong.includes(vDong);
            if (!matchDong) return false;
          }
          return true;
        });
      }
    }
    const currentLevel = kakaoMapRef.current?.getLevel() || 6;

    // [대표님 지침] 지도가 멀리 줌아웃된 상태(레벨 >= 9)에서는 직방처럼 지도 위에 아무런 매물/클러스터 마커도 노출하지 않고 메모리/성능을 극대화합니다.
    if (currentLevel >= 9 && activeCategory !== "wish") {
      if (clustererRef.current) {
        clustererRef.current.clear();
      }
      return;
    }

    // 2. 멀리 줌아웃된 상태에서 레벨별 그리드 최적화 (성능 60fps 극대화)
    let dynamicGridSize = 60;

    if (currentLevel >= 8) {
      dynamicGridSize = 100; // 매우 강력한 클러스터링으로 싱글 마커 생성 억제
    } else if (currentLevel === 7) {
      dynamicGridSize = 80; // 중간 수준 클러스터링
    } else if (currentLevel <= 5) {
      dynamicGridSize = 40; // 상세 동네 단위: 정밀 클러스터링
    }

    if (targetVacancies.length === 0) return;

    const kakao = (window as any).kakao;
    const map = kakaoMapRef.current;

    clustererRef.current = new kakao.maps.MarkerClusterer({
      map: map,
      averageCenter: true,
      minLevel: 4,
      gridSize: dynamicGridSize,
      disableClickZoom: true,
      calculator: [10, 30, 50],
      texts: (count: number) => count.toString(),
      styles: isAuctionMode
        ? [
            {
              width: "38px",
              height: "38px",
              background: "rgba(26, 66, 130, 0.85)",
              color: "#fff",
              textAlign: "center",
              lineHeight: "34px",
              borderRadius: "50%",
              fontWeight: "900",
              fontSize: "13px",
              border: "2px solid #ffffff",
              boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
            },
            {
              width: "46px",
              height: "46px",
              background: "rgba(26, 66, 130, 0.85)",
              color: "#fff",
              textAlign: "center",
              lineHeight: "42px",
              borderRadius: "50%",
              fontWeight: "900",
              fontSize: "14px",
              border: "2px solid #ffffff",
              boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
            },
            {
              width: "54px",
              height: "54px",
              background: "rgba(26, 66, 130, 0.85)",
              color: "#fff",
              textAlign: "center",
              lineHeight: "50px",
              borderRadius: "50%",
              fontWeight: "900",
              fontSize: "15px",
              border: "2px solid #ffffff",
              boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
            },
            {
              width: "62px",
              height: "62px",
              background: "rgba(26, 66, 130, 0.85)",
              color: "#fff",
              textAlign: "center",
              lineHeight: "58px",
              borderRadius: "50%",
              fontWeight: "900",
              fontSize: "16px",
              border: "2px solid #ffffff",
              boxShadow: "0 3px 8px rgba(0,0,0,0.18)",
            },
          ]
        : [
            {
              width: "38px",
              height: "38px",
              background: "rgba(75, 137, 255, 0.75)",
              color: "#fff",
              textAlign: "center",
              lineHeight: "34px",
              borderRadius: "50%",
              fontWeight: "900",
              fontSize: "13px",
              border: "2px solid #ffffff",
              boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
            },
            {
              width: "46px",
              height: "46px",
              background: "rgba(75, 137, 255, 0.75)",
              color: "#fff",
              textAlign: "center",
              lineHeight: "42px",
              borderRadius: "50%",
              fontWeight: "900",
              fontSize: "14px",
              border: "2px solid #ffffff",
              boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
            },
            {
              width: "54px",
              height: "54px",
              background: "rgba(75, 137, 255, 0.75)",
              color: "#fff",
              textAlign: "center",
              lineHeight: "50px",
              borderRadius: "50%",
              fontWeight: "900",
              fontSize: "15px",
              border: "2px solid #ffffff",
              boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
            },
            {
              width: "62px",
              height: "62px",
              background: "rgba(75, 137, 255, 0.75)",
              color: "#fff",
              textAlign: "center",
              lineHeight: "58px",
              borderRadius: "50%",
              fontWeight: "900",
              fontSize: "16px",
              border: "2px solid #ffffff",
              boxShadow: "0 3px 8px rgba(0,0,0,0.18)",
            },
          ],
    });

    // Add cluster events only once
    kakao.maps.event.addListener(clustererRef.current, "clusterover", (cluster: any) => {
      const overlay = cluster.getClusterMarker().getContent();
      if (overlay && overlay.style) {
        overlay.style.transform = "scale(1.15)";
        overlay.style.transition = "transform 0.2s";
        overlay.style.zIndex = "100";
      }
    });

    kakao.maps.event.addListener(clustererRef.current, "clusterout", (cluster: any) => {
      const overlay = cluster.getClusterMarker().getContent();
      if (overlay && overlay.style) {
        overlay.style.transform = "scale(1)";
        overlay.style.zIndex = "0";
      }
    });

    kakao.maps.event.addListener(clustererRef.current, "clusterclick", (cluster: any) => {
      const markers = cluster.getMarkers();
      const ids = markers.flatMap((m: any) => {
        const pos = m.getPosition();
        const isZoom = kakaoMapRef.current ? kakaoMapRef.current.getLevel() <= 5 : true;
        return filteredVacanciesRef.current
          .filter((v: any) => {
            const coords = getJitteredCoords(v, isZoom);
            return Math.abs(coords.lat - pos.getLat()) < 0.00001 && Math.abs(coords.lng - pos.getLng()) < 0.00001;
          })
          .map((v: any) => String(v.id));
      });
      setSelectedClusterIds(Array.from(new Set(ids)));
      setShowDetail(false);
    });

    kakao.maps.event.addListener(clustererRef.current, "clustered", (clusters: any[]) => {
      clusters.forEach((cluster) => {
        const markers = cluster.getMarkers();
        // Sum the counts of all coordinate groups inside this cluster
        let totalCount = 0;
        markers.forEach((m: any) => {
          const pos = m.getPosition();
          // Find the number of properties at this marker's coordinate
          const isZoom = kakaoMapRef.current ? kakaoMapRef.current.getLevel() <= 5 : true;
          const count = filteredVacanciesRef.current.filter((v: any) => {
            const coords = getJitteredCoords(v, isZoom);
            return Math.abs(coords.lat - pos.getLat()) < 0.00001 && Math.abs(coords.lng - pos.getLng()) < 0.00001;
          }).length;
          totalCount += count;
        });

        const overlay = cluster.getClusterMarker().getContent();
        if (overlay) {
          overlay.innerText = totalCount.toString();

          // Dynamically adjust cluster marker size proportional to the total property count
          let size = "38px";
          let lh = "34px";
          let fs = "13px";
          if (totalCount >= 100) {
            size = "62px";
            lh = "58px";
            fs = "16px";
          } else if (totalCount >= 30) {
            size = "54px";
            lh = "50px";
            fs = "15px";
          } else if (totalCount >= 10) {
            size = "46px";
            lh = "42px";
            fs = "14px";
          }
          overlay.style.width = size;
          overlay.style.height = size;
          overlay.style.lineHeight = lh;
          overlay.style.fontSize = fs;
        }

        // Apply selected cluster styles if match
        if (selectedClusterIdsRef.current && selectedClusterIdsRef.current.length > 0) {
          const ids = markers.flatMap((m: any) => {
            const pos = m.getPosition();
            const isZoom = kakaoMapRef.current ? kakaoMapRef.current.getLevel() <= 5 : true;
            return filteredVacanciesRef.current
              .filter((v: any) => {
                const coords = getJitteredCoords(v, isZoom);
                return Math.abs(coords.lat - pos.getLat()) < 0.00001 && Math.abs(coords.lng - pos.getLng()) < 0.00001;
              })
              .map((v: any) => String(v.id));
          });
          const isMatch = ids.some((id: any) => id && selectedClusterIdsRef.current?.includes(id));
          if (isMatch && overlay && overlay.style) {
            overlay.style.background = "#ffffff";
            overlay.style.color = isAuctionMode ? "#1a4282" : "#4b89ff";
            overlay.style.border = isAuctionMode ? "2px solid #1a4282" : "2px solid #4b89ff";
            overlay.style.zIndex = "999";
          }
        }
      });
    });

    const isZoomedIn = currentLevel <= 5;
    lastZoomWasInRef.current = isZoomedIn;

    // 1. Group vacancies by unique coordinate (with dynamic snap-to-landmark for private listings)
    const coordinateGroups = new Map<string, any[]>();
    targetVacancies.forEach((v) => {
      const coords = getJitteredCoords(v, isZoomedIn);
      if (coords.lat && coords.lng) {
        const key = `${coords.lat.toFixed(6)}_${coords.lng.toFixed(6)}`;
        if (!coordinateGroups.has(key)) {
          coordinateGroups.set(key, []);
        }
        coordinateGroups.get(key)!.push({ ...v, lat: coords.lat, lng: coords.lng });
      }
    });

    const newMarkers: any[] = [];

    coordinateGroups.forEach((group, coordKey) => {
      if (group.length === 0) return;

      // Select the active/selected property as representative if present, otherwise the first one
      const activeInGroup = group.find((v) => String(v.id) === String(activeProperty));
      const selectedInGroup = group.find((v) => selectedClusterIdsRef.current?.includes(String(v.id)));
      const prop = activeInGroup || selectedInGroup || group[0];

      const position = new kakao.maps.LatLng(prop.lat, prop.lng);
      const strId = String(prop.id);

      // Group selection check: if ANY property in the group is active or selected, draw in active state
      const isSelected = group.some(
        (v) => selectedClusterIdsRef.current?.includes(String(v.id)) || String(activeProperty) === String(v.id)
      );

      const { size } = getMarkerDimensions(group.length);
      const width = size;
      const height = size;

      const normalSvg = getMarkerSvg(prop, group, isSelected, isZoomedIn, false);
      const activeSvg = getMarkerSvg(prop, group, true, isZoomedIn, false);
      const hoverSvg = getMarkerSvg(prop, group, isSelected, isZoomedIn, true);

      const markerImage = new kakao.maps.MarkerImage(
        `data:image/svg+xml,${isSelected ? activeSvg : normalSvg}`,
        new kakao.maps.Size(width, height),
        { offset: new kakao.maps.Point(width / 2, height / 2) }
      );

      const hoverImage = new kakao.maps.MarkerImage(
        `data:image/svg+xml,${hoverSvg}`,
        new kakao.maps.Size(width + 6, height + 6),
        { offset: new kakao.maps.Point((width + 6) / 2, (height + 6) / 2) }
      );

      const marker = new kakao.maps.Marker({ position, image: markerImage, title: strId });
      markerIdMapRef.current.set(marker, strId);

      kakao.maps.event.addListener(marker, "mouseover", () => {
        marker.setImage(hoverImage);
        marker.setZIndex(100);
      });
      kakao.maps.event.addListener(marker, "mouseout", () => {
        const currentSelected = group.some(
          (v) => selectedClusterIdsRef.current?.includes(String(v.id)) || String(activeProperty) === String(v.id)
        );
        const updatedSvg = currentSelected ? activeSvg : normalSvg;
        const currentWidth = size;
        const currentHeight = size;
        marker.setImage(
          new kakao.maps.MarkerImage(
            `data:image/svg+xml,${updatedSvg}`,
            new kakao.maps.Size(currentWidth, currentHeight),
            { offset: new kakao.maps.Point(currentWidth / 2, currentHeight / 2) }
          )
        );
        marker.setZIndex(currentSelected ? 99 : 0);
      });

      kakao.maps.event.addListener(marker, "click", () => {
        setSelectedClusterIds(group.map((v) => String(v.id)));
        setShowDetail(false);
      });

      newMarkers.push(marker);
      markersRef.current.push(marker);
    });

    if (clustererRef.current && newMarkers.length > 0) {
      clustererRef.current.addMarkers(newMarkers);
    }
  }, [
    filteredVacancies,
    selectedRegion,
    activeCategory,
    activeProperty,
    mapLoaded,
    isAuctionMode,
    zoomLevel,
  ]);

  return (
    <div style={{ flex: 1, height: "100%", position: "relative", minWidth: 0, background: "#eee" }}>
      {/* 서울블럭지도 / 지도검색 Floating Header at Top Right */}
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 16,
          zIndex: 10,
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          background: "rgba(255,255,255,0.95)",
          padding: "8px 14px",
          borderRadius: 6,
          boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
          border: "1px solid #e5e7eb",
        }}
      >
        <span
          onClick={() => window.location.href = '/homepage'}
          style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", cursor: "pointer" }}
        >
          리스트검색
        </span>
        <span style={{ color: "#d1d5db", fontSize: 14 }}>|</span>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: "#2845B3", margin: 0 }}>지도검색</h2>
      </div>

      <MapSearchBar
        mapCenterRegion={mapCenterRegion}
        onSearchCoord={(lat: any, lng: any, zoomLevel: any) => {
          if (!kakaoMapRef.current) return;
          const kakao = (window as any).kakao;
          if (zoomLevel) kakaoMapRef.current.setLevel(zoomLevel);
          kakaoMapRef.current.panTo(new kakao.maps.LatLng(lat, lng));
        }}
        onRegionSelect={(sido: any, gugun: any, dong: any) => {
          setSelectedRegion({ sido, gugun, dong });
        }}
        themeColor="#1a73e8"
        isPushedDown={activeFilterDropdown !== null}
      />

      <div ref={mapRef} style={{ width: "100%", height: "100%", background: "#e8eaed", touchAction: "none" }}>
        {mapError && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "#ffefef",
              color: "#d32f2f",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              zIndex: 10,
            }}
          >
            <span style={{ fontSize: 40 }}>⚠️</span>
            <span style={{ fontSize: 16, fontWeight: "bold" }}>지도 로드 오류</span>
            <span style={{ fontSize: 14 }}>{mapError}</span>
          </div>
        )}
      </div>

      {/* Right Map Controls: Zoom controls (+, -) and Location Pictogram (내 위치) below it */}
      <div
        style={{
          position: "absolute",
          right: 20,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        {/* Zoom In / Out Container */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: "#fff",
            borderRadius: 4,
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => {
              if (kakaoMapRef.current) kakaoMapRef.current.setLevel(kakaoMapRef.current.getLevel() - 1);
            }}
            style={{
              width: 36,
              height: 36,
              border: "none",
              borderBottom: "1px solid #e0e0e0",
              background: "#fff",
              fontSize: 20,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#666",
            }}
          >
            ＋
          </button>
          <button
            onClick={() => {
              if (kakaoMapRef.current) kakaoMapRef.current.setLevel(kakaoMapRef.current.getLevel() + 1);
            }}
            style={{
              width: 36,
              height: 36,
              border: "none",
              background: "#fff",
              fontSize: 24,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
              color: "#666",
            }}
          >
            －
          </button>
        </div>

        {/* Location Pictogram Button */}
        <button
          onClick={() => {
            setSelectedClusterIds(null);
            setSelectedRegion(null);
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const lat = pos.coords.latitude;
                  const lng = pos.coords.longitude;
                  if (kakaoMapRef.current) {
                    const kakao = (window as any).kakao;
                    kakaoMapRef.current.panTo(new kakao.maps.LatLng(lat, lng));
                  }
                },
                (err) => {
                  console.error("Geolocation error:", err);
                  handleLocationPermissionDenied();
                },
                { enableHighAccuracy: true }
              );
            } else {
              handleLocationUnavailable();
            }
          }}
          style={{
            width: 36,
            height: 36,
            border: "none",
            borderRadius: 4,
            background: "#fff",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s",
          }}
          title="내 위치로 이동"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 18, height: 18, color: "#1a4282" }}
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" fill="#1a4282" />
            <line x1="12" y1="1" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="23" />
            <line x1="1" y1="12" x2="4" y2="12" />
            <line x1="20" y1="12" x2="23" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
