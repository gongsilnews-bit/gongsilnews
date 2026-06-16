import React from 'react';

interface KakaoMapProps {
  address: string;
  lat?: number | null;
  lng?: number | null;
  onCoordsChange?: (lat: number, lng: number) => void;
}

const KakaoMap = ({ address, lat, lng, onCoordsChange }: KakaoMapProps) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadScript = () => {
      if ((window as any).kakao && (window as any).kakao.maps && (window as any).kakao.maps.services) {
        setLoaded(true);
        return;
      }

      // Check if another script is already adding it
      const existingScript = document.querySelector('script[src*="dapi.kakao.com"]');
      if (existingScript) {
        const handleScriptLoad = () => {
          (window as any).kakao.maps.load(() => {
            setLoaded(true);
          });
        };
        existingScript.addEventListener('load', handleScriptLoad);
        return;
      }

      const script = document.createElement("script");
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=435d3602201a49ea712e5f5a36fe6efc&libraries=services&autoload=false`;
      script.async = true;
      script.onload = () => {
        (window as any).kakao.maps.load(() => {
          setLoaded(true);
        });
      };
      script.onerror = () => {
        setErrorMsg("지도 스크립트 로드 실패");
      };
      document.head.appendChild(script);
    };

    loadScript();
  }, []);

  React.useEffect(() => {
    if (!loaded || !containerRef.current || !address) return;

    try {
      const container = containerRef.current;
      container.innerHTML = "";

      const initMapWithCoords = (coords: any, labelText: string) => {
        const options = {
          center: coords,
          level: 3
        };

        const map = new (window as any).kakao.maps.Map(container, options);

        // Add a custom styled marker
        const marker = new (window as any).kakao.maps.Marker({
          map: map,
          position: coords,
          draggable: !!onCoordsChange
        });

        // Add a beautiful custom styled info bubble overlay
        const contentStr = `
          <div style="
            padding: 6px 12px;
            background-color: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            font-size: 11px;
            font-weight: 800;
            color: #1e293b;
            text-align: center;
            white-space: nowrap;
          ">
            📌 ${labelText}
          </div>
        `;
        
        const customOverlay = new (window as any).kakao.maps.CustomOverlay({
          position: coords,
          content: contentStr,
          yAnchor: 2.2
        });

        customOverlay.setMap(map);

        if (onCoordsChange) {
          (window as any).kakao.maps.event.addListener(marker, 'drag', () => {
            customOverlay.setPosition(marker.getPosition());
          });
          (window as any).kakao.maps.event.addListener(marker, 'dragend', () => {
            const latlng = marker.getPosition();
            customOverlay.setPosition(latlng);
            onCoordsChange(latlng.getLat(), latlng.getLng());
          });
        }
        
        // Disable interactive behaviors if not in editor mode
        map.setZoomable(!!onCoordsChange);
        map.setDraggable(!!onCoordsChange);
      };

      // Clean up search query for label text
      let cleanAddress = address.split('\n')[0];
      const cleanPatterns = [/(매매|전세|월세|임대).*/g, /\d+억.*/g, /\s+([지상하B]*\d+[층호]).*$/g];
      cleanPatterns.forEach(pat => {
        cleanAddress = cleanAddress.replace(pat, "").trim();
      });
      const labelText = cleanAddress.split(' ').slice(0, 3).join(' ');

      if (lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
        const coords = new (window as any).kakao.maps.LatLng(Number(lat), Number(lng));
        setErrorMsg(null);
        initMapWithCoords(coords, labelText);
      } else {
        const geocoder = new (window as any).kakao.maps.services.Geocoder();
        geocoder.addressSearch(cleanAddress, (result: any, status: any) => {
          if (status === (window as any).kakao.maps.services.Status.OK) {
            setErrorMsg(null);
            const coords = new (window as any).kakao.maps.LatLng(result[0].y, result[0].x);
            initMapWithCoords(coords, labelText);
            if (onCoordsChange) onCoordsChange(Number(result[0].y), Number(result[0].x));
          } else {
            // Progressive fallback: try broader address parts (시/구/동)
            const parts = cleanAddress.replace(/\d+[-\d]*/g, '').trim().split(/\s+/).filter(Boolean);
            const fallbackQueries = [];
            if (parts.length >= 3) fallbackQueries.push(parts.slice(0, 3).join(' '));
            if (parts.length >= 2) fallbackQueries.push(parts.slice(0, 2).join(' '));
            if (parts.length >= 1) fallbackQueries.push(parts[0]);
            
            const tryFallback = (index: number) => {
              if (index >= fallbackQueries.length) {
                // All fallbacks failed — show Seoul center silently
                setErrorMsg(null);
                const defaultCoords = new (window as any).kakao.maps.LatLng(37.5665, 126.978);
                initMapWithCoords(defaultCoords, parts[0] || "서울");
                return;
              }
              geocoder.addressSearch(fallbackQueries[index], (fbResult: any, fbStatus: any) => {
                if (fbStatus === (window as any).kakao.maps.services.Status.OK) {
                  setErrorMsg(null);
                  const coords = new (window as any).kakao.maps.LatLng(fbResult[0].y, fbResult[0].x);
                  initMapWithCoords(coords, fallbackQueries[index]);
                  if (onCoordsChange) onCoordsChange(Number(fbResult[0].y), Number(fbResult[0].x));
                } else {
                  tryFallback(index + 1);
                }
              });
            };
            tryFallback(0);
          }
        });
      }
    } catch (e) {
      console.error("Kakao Map init error", e);
      // Even on exception, don't show error to user — show blank map container
      setErrorMsg(null);
    }
  }, [loaded, address, lat, lng, onCoordsChange]);

  return (
    <div className="w-full h-full relative" style={{ minHeight: "100%" }}>
      <div ref={containerRef} className="w-full h-full relative" />
    </div>
  );
};

export default KakaoMap;
