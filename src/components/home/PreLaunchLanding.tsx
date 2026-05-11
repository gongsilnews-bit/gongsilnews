"use client";

import React, { useState, useEffect, useRef } from "react";
import AuthModal from "@/components/AuthModal";

export default function PreLaunchLanding() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  // 타겟 모드: 상권(동) vs 아파트단지
  const [targetMode, setTargetMode] = useState<"DONG" | "APT">("DONG");
  const targetModeRef = useRef<"DONG" | "APT">("DONG");
  useEffect(() => { targetModeRef.current = targetMode; }, [targetMode]);

  // 지역 검색 상태
  const [sido, setSido] = useState("");
  const [gugun, setGugun] = useState("");
  const [dong, setDong] = useState("");
  const [aptName, setAptName] = useState("");
  const [checkResult, setCheckResult] = useState<null | "AVAILABLE" | "TAKEN" | "REVIEW">(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // 카카오맵 스크립트 로드
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

  // 카카오맵 초기화
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const kakao = (window as any).kakao;
    
    // 기본 위치: 강남역
    const defaultPos = new kakao.maps.LatLng(37.498095, 127.027610);
    
    if (!kakaoMapRef.current) {
      const map = new kakao.maps.Map(mapRef.current, {
        center: defaultPos,
        level: 5,
      });
      kakaoMapRef.current = map;

      // 마커 생성
      const marker = new kakao.maps.Marker({
        position: defaultPos,
        map: map
      });
      markerRef.current = marker;

      // 지도 클릭 이벤트: 주소 변환 (Reverse Geocoding) 및 아파트 검색
      const geocoder = new kakao.maps.services.Geocoder();
      const places = new kakao.maps.services.Places();

      kakao.maps.event.addListener(map, 'click', function(mouseEvent: any) {
        const latlng = mouseEvent.latLng;
        marker.setPosition(latlng);
        
        // 1. 공통: 지번/도로명 주소 가져오기
        geocoder.coord2RegionCode(latlng.getLng(), latlng.getLat(), (result: any, status: any) => {
          if (status === kakao.maps.services.Status.OK) {
            const region = result.find((r: any) => r.region_type === 'B') || result[0];
            if (region) {
              setSido(region.region_1depth_name);
              setGugun(region.region_2depth_name);
              setDong(region.region_3depth_name);
              
              if (targetModeRef.current === "DONG") {
                setAptName(""); // 아파트 초기화
                checkAvailability(region.region_3depth_name, "");
              }
            }
          }
        });

        // 2. 아파트 모드일 경우: 클릭한 곳 주변의 아파트 찾기
        if (targetModeRef.current === "APT") {
          places.keywordSearch('아파트', (result: any, status: any) => {
            if (status === kakao.maps.services.Status.OK && result.length > 0) {
              // 가장 가까운 아파트 이름 가져오기
              const nearestApt = result[0].place_name;
              setAptName(nearestApt);
              checkAvailability("아파트모드", nearestApt);
            } else {
              setAptName("주변에 아파트가 없습니다");
              setCheckResult(null);
            }
          }, { location: latlng, radius: 200, sort: kakao.maps.services.SortBy.DISTANCE });
        }
      });
    }
  }, [mapLoaded]);

  // 모드가 바뀔 때 상태 초기화
  useEffect(() => {
    setCheckResult(null);
    setAptName("");
    setDong("");
  }, [targetMode]);

  const checkAvailability = (targetDong: string, targetApt: string = "") => {
    // 1. 아파트 모드
    if (targetMode === "APT" || targetApt) {
      if (!targetApt || targetApt === "주변에 아파트가 없습니다") {
        setCheckResult(null);
        return;
      }
      if (targetApt.includes("자이") || targetApt.includes("래미안") || targetApt.includes("푸르지오")) {
        setCheckResult("TAKEN");
      } else if (targetApt.includes("힐스테이트") || targetApt.includes("롯데캐슬")) {
        setCheckResult("REVIEW");
      } else {
        setCheckResult("AVAILABLE");
      }
      return;
    }

    // 2. 동네/상권 모드
    if (!targetDong) {
      setCheckResult(null);
      return;
    }
    if (targetDong.includes("역삼") || targetDong.includes("서초") || targetDong.includes("반포")) {
      setCheckResult("TAKEN");
    } else if(targetDong.includes("혜화") || targetDong.includes("여의도")) {
      setCheckResult("REVIEW");
    } else {
      setCheckResult("AVAILABLE");
    }
  };

  const handleManualCheck = () => {
    const kakao = (window as any).kakao;
    if (!kakao) return;

    if (targetMode === "APT") {
      if (!aptName) {
        alert("아파트 이름을 입력해주세요.");
        return;
      }
      const places = new kakao.maps.services.Places();
      places.keywordSearch(aptName + ' 아파트', (result: any, status: any) => {
        if (status === kakao.maps.services.Status.OK && result.length > 0) {
          const apt = result[0];
          const coords = new kakao.maps.LatLng(apt.y, apt.x);
          if (kakaoMapRef.current) {
            kakaoMapRef.current.panTo(coords);
            kakaoMapRef.current.setLevel(4);
          }
          if (markerRef.current) markerRef.current.setPosition(coords);
          
          setAptName(apt.place_name);
          // 주소 분리 대략적으로 설정
          const addrParts = apt.address_name.split(' ');
          if(addrParts.length >= 3) {
             setSido(addrParts[0]);
             setGugun(addrParts[1]);
             setDong(addrParts[2]);
          }
          checkAvailability("", apt.place_name);
        } else {
          alert("아파트를 찾을 수 없습니다.");
        }
      });

    } else {
      if (!dong) {
        alert("검색할 동/읍/면 이름을 입력해주세요.");
        return;
      }
      const geocoder = new kakao.maps.services.Geocoder();
      const searchQuery = `${sido} ${gugun} ${dong}`.trim();
      geocoder.addressSearch(searchQuery, (result: any, status: any) => {
        if (status === kakao.maps.services.Status.OK && result[0]) {
          const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
          if (kakaoMapRef.current) kakaoMapRef.current.panTo(coords);
          if (markerRef.current) markerRef.current.setPosition(coords);
          checkAvailability(dong);
        } else {
           alert("주소를 찾을 수 없습니다.");
        }
      });
    }
  };

  return (
    <div style={{ 
      minHeight: "calc(100vh - 160px)", 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center", 
      padding: "80px 20px", 
      background: "url('/images/pattern-bg.png'), linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)", 
      textAlign: "center",
      fontFamily: "'Inter', 'Pretendard', sans-serif"
    }}>
      <div style={{ display: "inline-block", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "6px 16px", borderRadius: "20px", fontSize: "14px", fontWeight: "800", marginBottom: "24px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
        🚨 {targetMode === "DONG" ? "동/블럭별 단 1곳" : "아파트 단지별 단 1곳"}, 선착순 마감 진행 중
      </div>
      
      <h1 style={{ fontSize: "52px", fontWeight: "800", color: "#0f172a", marginBottom: "24px", letterSpacing: "-1.5px", lineHeight: "1.2" }}>
        {targetMode === "DONG" ? "지역 공실을 장악할" : "대단지 독점 매물을 싹쓸이할"}<br/> 
        단 한 곳, <span style={{ color: "#f97316" }}>'공실뉴스부동산'</span> 파트너를 모십니다.
      </h1>
      
      <p style={{ fontSize: "20px", color: "#475569", marginBottom: "50px", lineHeight: "1.7", maxWidth: "650px", wordBreak: "keep-all" }}>
        <strong>{targetMode === "DONG" ? "1개 상권(블럭)당" : "1개 대단지 아파트당"} 오직 1개의 중개사무소</strong>와만 파트너십을 맺습니다.<br/>
        해당 구역의 모든 매물 정보와 고객 문의를 독점할 수 있는 기회를 선점하세요.
      </p>
      
      <div style={{ display: "flex", gap: "24px", marginBottom: "60px", flexWrap: "wrap", justifyContent: "center" }}>
        <div style={{ background: "#fff", padding: "32px 24px", borderRadius: "20px", boxShadow: "0 10px 40px rgba(0,0,0,0.06)", width: "280px", border: "1px solid rgba(255,255,255,0.5)", position: "relative", overflow: "hidden" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>👑</div>
          <h3 style={{ fontSize: "22px", fontWeight: "700", color: "#1e293b", marginBottom: "12px" }}>완벽한 구역 독점권</h3>
          <p style={{ color: "#64748b", fontSize: "15px", lineHeight: "1.6" }}>{targetMode === "DONG" ? "선택하신 동네 블럭에" : "선택하신 아파트 대단지에"}<br/><strong>오직 단 한 곳의 파트너</strong>에게만<br/>'공실뉴스부동산' 타이틀을 부여합니다.</p>
        </div>
        
        <div style={{ background: "#fff", padding: "32px 24px", borderRadius: "20px", boxShadow: "0 10px 40px rgba(0,0,0,0.06)", width: "280px", border: "2px solid #f97316", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 12, right: -30, background: "#f97316", color: "#fff", fontSize: "12px", fontWeight: 800, padding: "4px 30px", transform: "rotate(45deg)" }}>BEST</div>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>🎯</div>
          <h3 style={{ fontSize: "22px", fontWeight: "700", color: "#1e293b", marginBottom: "12px" }}>고객 문의 100% 몰아주기</h3>
          <p style={{ color: "#64748b", fontSize: "15px", lineHeight: "1.6" }}>해당 {targetMode === "DONG" ? "지역" : "단지"}에서 발생하는<br/>모든 매물 열람 및 중개 문의를<br/><strong>독점 파트너에게 전건 연결</strong>해 드립니다.</p>
        </div>

        <div style={{ background: "#fff", padding: "32px 24px", borderRadius: "20px", boxShadow: "0 10px 40px rgba(0,0,0,0.06)", width: "280px", border: "1px solid rgba(255,255,255,0.5)", position: "relative", overflow: "hidden" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>🔥</div>
          <h3 style={{ fontSize: "22px", fontWeight: "700", color: "#1e293b", marginBottom: "12px" }}>파격적인 초기 지원</h3>
          <p style={{ color: "#64748b", fontSize: "15px", lineHeight: "1.6" }}>최우선 구역 선점 시<br/><strong>6개월 프리미엄 무료 지원</strong> 및<br/>지역 전문기자 권한을 부여합니다.</p>
        </div>
      </div>

      {/* 지역 조회 UI */}
      <div style={{ background: "#fff", padding: "40px 32px", borderRadius: "24px", boxShadow: "0 20px 50px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0", marginBottom: "40px", width: "100%", maxWidth: "900px" }}>
        
        {/* 모드 전환 토글 */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "32px" }}>
          <div style={{ display: "flex", background: "#f1f5f9", padding: "6px", borderRadius: "100px", position: "relative" }}>
            <button 
              onClick={() => setTargetMode("DONG")}
              style={{ padding: "12px 32px", fontSize: "16px", fontWeight: "800", borderRadius: "100px", border: "none", cursor: "pointer", transition: "all 0.3s",
                background: targetMode === "DONG" ? "#0f172a" : "transparent", color: targetMode === "DONG" ? "#fff" : "#64748b", zIndex: 1
              }}
            >🏢 상가/주택 전문 (동네 독점)</button>
            <button 
              onClick={() => setTargetMode("APT")}
              style={{ padding: "12px 32px", fontSize: "16px", fontWeight: "800", borderRadius: "100px", border: "none", cursor: "pointer", transition: "all 0.3s",
                background: targetMode === "APT" ? "#f97316" : "transparent", color: targetMode === "APT" ? "#fff" : "#64748b", zIndex: 1
              }}
            >🏙️ 대단지 아파트 전문 (단지 독점)</button>
          </div>
        </div>

        <h3 style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          🗺️ 지도를 클릭하여 {targetMode === "DONG" ? "우리 동네" : "우리 단지"} 독점 권한 확인하기
        </h3>
        <p style={{ color: "#64748b", marginBottom: "24px", fontSize: "15px" }}>
          {targetMode === "DONG" 
            ? "원하시는 상권이나 지역을 지도에서 직접 찍어보세요!" 
            : "지도에서 아파트를 클릭하거나, 직접 아파트 이름을 검색해보세요!"}
        </p>
        
        {/* 카카오 지도 영역 */}
        <div style={{ width: "100%", height: "400px", borderRadius: "16px", overflow: "hidden", marginBottom: "24px", border: "1px solid #cbd5e1", position: "relative" }}>
          <div ref={mapRef} style={{ width: "100%", height: "100%" }}></div>
          {!mapLoaded && <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "#94a3b8" }}>지도를 불러오는 중입니다...</div>}
        </div>

        {/* 선택된 결과 표시 영역 */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginBottom: "12px", background: "#f8fafc", padding: "20px", borderRadius: "16px" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "700", marginBottom: "4px" }}>
              {targetMode === "DONG" ? "선택된 지역" : "선택된 아파트 단지"}
            </span>
            <div style={{ fontSize: "20px", fontWeight: "800", color: targetMode === "APT" ? "#f97316" : "#0f172a" }}>
              {targetMode === "DONG" 
                ? (sido || gugun || dong ? `${sido} ${gugun} ${dong}` : "지도를 클릭해주세요")
                : (aptName ? `${sido} ${gugun} ${dong} | ${aptName}` : "지도에서 아파트를 클릭해주세요")
              }
            </div>
          </div>
          
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
             <input 
              type="text" 
              placeholder={targetMode === "DONG" ? "예: 역삼동" : "예: 반포자이"} 
              value={targetMode === "DONG" ? dong : aptName} 
              onChange={e => {
                if (targetMode === "DONG") setDong(e.target.value);
                else setAptName(e.target.value);
                setCheckResult(null);
              }}
              style={{ padding: "12px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "15px", outline: "none", width: "180px", fontWeight: "bold" }}
              onKeyDown={e => e.key === 'Enter' && handleManualCheck()}
            />
            <button 
              onClick={handleManualCheck}
              style={{ padding: "12px 24px", background: targetMode === "APT" ? "#f97316" : "#475569", color: "#fff", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "700", cursor: "pointer" }}
            >
              직접 검색
            </button>
          </div>
        </div>

        {checkResult === "TAKEN" && (
          <div style={{ marginTop: "24px", padding: "20px", background: "#fef2f2", color: "#991b1b", borderRadius: "12px", fontWeight: "700", border: "1px solid #fecaca", animation: "fadeIn 0.3s ease-out" }}>
            ⚠️ 죄송합니다. 해당 구역({targetMode === "APT" ? aptName : `${sido} ${gugun} ${dong}`})은 이미 파트너 선점이 마감되었습니다.
          </div>
        )}
        {checkResult === "REVIEW" && (
          <div style={{ marginTop: "24px", padding: "20px", background: "#fffbeb", color: "#b45309", borderRadius: "12px", fontWeight: "700", border: "1px solid #fde68a", animation: "fadeIn 0.3s ease-out", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            <span>⏳ 해당 구역({targetMode === "APT" ? aptName : `${sido} ${gugun} ${dong}`})은 현재 다른 파트너와 우선 협의 중입니다.</span>
            <button onClick={() => setIsAuthModalOpen(true)} style={{ padding: "10px 24px", background: "#d97706", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}>대기자로 사전 등록하기</button>
          </div>
        )}
        {checkResult === "AVAILABLE" && (
          <div style={{ marginTop: "24px", padding: "24px", background: "#f0fdf4", border: "2px solid #22c55e", borderRadius: "16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", animation: "fadeIn 0.3s ease-out" }}>
            <div style={{ color: "#166534", fontWeight: "800", fontSize: "20px" }}>
              🎉 축하합니다! 해당 구역({targetMode === "APT" ? aptName : `${sido} ${gugun} ${dong}`})은 지금 바로 독점 선점이 가능합니다.
            </div>
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              style={{ padding: "16px 40px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "50px", fontSize: "18px", fontWeight: "800", cursor: "pointer", boxShadow: "0 10px 20px rgba(22, 163, 74, 0.3)", transition: "all 0.2s" }}
              onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              지금 바로 선점하기
            </button>
          </div>
        )}
      </div>

      {/* 실시간 신청 현황 */}
      <div style={{ background: "#fff", padding: "32px", borderRadius: "24px", boxShadow: "0 10px 30px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", marginBottom: "40px", width: "100%", maxWidth: "900px", textAlign: "left" }}>
        <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ position: "relative", display: "flex", width: "12px", height: "12px" }}>
            <span style={{ animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite", position: "absolute", display: "inline-flex", height: "100%", width: "100%", borderRadius: "50%", backgroundColor: "#ef4444", opacity: "0.7" }}></span>
            <span style={{ position: "relative", display: "inline-flex", borderRadius: "50%", height: "12px", width: "12px", backgroundColor: "#ef4444" }}></span>
          </span>
          실시간 독점 파트너 신청 현황
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[
            { region: "서울 강남구 역삼동", name: "황*O 중개사무소", status: "심사 대기중", badge: "#f1f5f9", color: "#64748b", time: "10분 전" },
            { region: "서울 서초구 반포자이", name: "공*O 부동산", status: "파트너 확정", badge: "#f0fdf4", color: "#16a34a", time: "1시간 전" },
            { region: "경기 분당구 정자동", name: "김*O 중개사님", status: "우선 협의중", badge: "#fffbeb", color: "#d97706", time: "2시간 전" },
            { region: "서울 송파구 잠실엘스", name: "이*O 공인중개사", status: "파트너 확정", badge: "#f0fdf4", color: "#16a34a", time: "3시간 전" },
            { region: "부산 해운대구 마린시티", name: "박*O 중개사님", status: "심사 대기중", badge: "#f1f5f9", color: "#64748b", time: "5시간 전" },
          ].map((item, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <span style={{ background: item.badge, color: item.color, padding: "6px 12px", borderRadius: "6px", fontSize: "13px", fontWeight: "800" }}>{item.status}</span>
                <span style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b" }}>[{item.region}]</span>
                <span style={{ fontSize: "15px", color: "#475569" }}>{item.name}</span>
              </div>
              <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: "600" }}>{item.time}</span>
            </div>
          ))}
        </div>
      </div>
      
      <p style={{ marginTop: "12px", color: "#64748b", fontSize: "14px" }}>
        이미 파트너이신가요? <span onClick={() => setIsAuthModalOpen(true)} style={{ color: "#0f172a", fontWeight: "700", cursor: "pointer", textDecoration: "underline" }}>로그인하기</span>
      </p>

      {isAuthModalOpen && <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialTab="signup" />}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}} />
    </div>
  );
}
