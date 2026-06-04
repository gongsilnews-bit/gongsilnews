import React from 'react';

const KakaoMap = ({ address }: { address: string }) => {
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

      const geocoder = new (window as any).kakao.maps.services.Geocoder();
      
      // Clean up search query
      let cleanAddress = address;
      const cleanPatterns = [/(매매|전세|월세|임대).*/g, /\d+억.*/g];
      cleanPatterns.forEach(pat => {
        cleanAddress = cleanAddress.replace(pat, "").trim();
      });

      geocoder.addressSearch(cleanAddress, (result: any, status: any) => {
        if (status === (window as any).kakao.maps.services.Status.OK) {
          setErrorMsg(null);
          const coords = new (window as any).kakao.maps.LatLng(result[0].y, result[0].x);
          
          const options = {
            center: coords,
            level: 3
          };

          const map = new (window as any).kakao.maps.Map(container, options);

          // Add a custom styled marker
          const marker = new (window as any).kakao.maps.Marker({
            map: map,
            position: coords
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
              📌 ${cleanAddress.split(' ').slice(0, 3).join(' ')}
            </div>
          `;
          
          const customOverlay = new (window as any).kakao.maps.CustomOverlay({
            position: coords,
            content: contentStr,
            yAnchor: 2.2
          });

          customOverlay.setMap(map);
          
          // Disable interactive behaviors
          map.setZoomable(false);
          map.setDraggable(false);
        } else {
          // Fallback to default coordinate if exact geocode fails
          geocoder.addressSearch("서울 강남구 역삼동", (fallbackResult: any, fallbackStatus: any) => {
            if (fallbackStatus === (window as any).kakao.maps.services.Status.OK) {
              const coords = new (window as any).kakao.maps.LatLng(fallbackResult[0].y, fallbackResult[0].x);
              const map = new (window as any).kakao.maps.Map(container, { center: coords, level: 3 });
              new (window as any).kakao.maps.Marker({ map, position: coords });
            }
          });
          setErrorMsg("입력한 주소의 정확한 좌표를 찾을 수 없습니다.");
        }
      });
    } catch (e) {
      console.error("Kakao Map init error", e);
      setErrorMsg("지도 초기화 오류");
    }
  }, [loaded, address]);

  if (errorMsg) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400 font-bold p-6 text-center">
        <svg className="w-8 h-8 text-red-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="text-xs text-red-500 mb-1">{errorMsg}</span>
        <span className="text-[10px] text-gray-400">사이드바 주소 설정을 정정하거나, 지도 캡처 이미지 직접 업로드를 사용하세요.</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ minHeight: "100%" }} />
  );
};

export default KakaoMap;
