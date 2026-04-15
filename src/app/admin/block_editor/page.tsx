"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { getMapBlocks, createMapBlock, deleteMapBlock, type MapBlock } from "@/app/actions/map_blocks";

const BRAND = "#2845B3";

const SIDO_LIST = ["서울특별시", "경기도", "인천광역시", "부산광역시", "대구광역시", "대전광역시", "광주광역시", "울산광역시"];

export default function BlockEditorPage() {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [drawMode, setDrawMode] = useState(false);
  const [points, setPoints] = useState<{ lat: number; lng: number }[]>([]);
  const [blockName, setBlockName] = useState("");
  const [blockSido, setBlockSido] = useState("서울특별시");
  const [blockSigungu, setBlockSigungu] = useState("");
  const [blockColor, setBlockColor] = useState("#0066cc");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const mapRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<any>(null);
  const drawMarkersRef = useRef<any[]>([]);
  const drawPolylineRef = useRef<any>(null);
  const drawPolygonRef = useRef<any>(null);
  const savedPolygonsRef = useRef<any[]>([]);

  // Load kakao map
  useEffect(() => {
    if ((window as any).kakao?.maps?.LatLng) { setMapLoaded(true); return; }
    const sid = "kakao-map-script";
    if (!document.getElementById(sid)) {
      const s = document.createElement("script");
      s.id = sid;
      s.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_APP_KEY || "435d3602201a49ea712e5f5a36fe6efc"}&libraries=services,drawing&autoload=false`;
      document.head.appendChild(s);
      s.onload = () => { (window as any).kakao.maps.load(() => setMapLoaded(true)); };
    } else {
      const iv = setInterval(() => { if ((window as any).kakao?.maps?.LatLng) { clearInterval(iv); setMapLoaded(true); } }, 100);
    }
  }, []);

  // Init map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || kakaoMapRef.current) return;
    const kakao = (window as any).kakao;
    kakaoMapRef.current = new kakao.maps.Map(mapRef.current, {
      center: new kakao.maps.LatLng(37.498095, 127.02761),
      level: 5,
    });
  }, [mapLoaded]);

  // Load saved blocks
  const loadBlocks = useCallback(async () => {
    const res = await getMapBlocks();
    if (res.success && res.data) {
      setBlocks(res.data);
    }
  }, []);

  useEffect(() => { loadBlocks(); }, [loadBlocks]);

  // Render saved blocks on map
  useEffect(() => {
    if (!kakaoMapRef.current || !mapLoaded) return;
    const kakao = (window as any).kakao;
    const map = kakaoMapRef.current;

    // Clear old
    savedPolygonsRef.current.forEach(p => p.setMap(null));
    savedPolygonsRef.current = [];

    blocks.forEach(block => {
      if (!block.coordinates || block.coordinates.length < 3) return;
      const path = block.coordinates.map((c: any) => new kakao.maps.LatLng(c.lat, c.lng));
      const polygon = new kakao.maps.Polygon({
        path,
        strokeWeight: 2,
        strokeColor: block.color || "#004c80",
        strokeOpacity: 0.9,
        fillColor: block.color || "#0066cc",
        fillOpacity: 0.3,
      });
      polygon.setMap(map);
      savedPolygonsRef.current.push(polygon);

      // Label
      const cLat = block.coordinates.reduce((s: number, c: any) => s + c.lat, 0) / block.coordinates.length;
      const cLng = block.coordinates.reduce((s: number, c: any) => s + c.lng, 0) / block.coordinates.length;
      const content = document.createElement("div");
      content.style.cssText = "padding:3px 8px;background:rgba(255,255,255,0.92);border:1px solid #4a90d9;border-radius:4px;font-size:11px;font-weight:700;color:#1a365d;white-space:nowrap;pointer-events:none;";
      content.textContent = block.name;
      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(cLat, cLng), content, yAnchor: 0.5,
      });
      overlay.setMap(map);
      savedPolygonsRef.current.push(overlay);
    });
  }, [blocks, mapLoaded]);

  // Click handler for drawing
  useEffect(() => {
    if (!kakaoMapRef.current || !mapLoaded) return;
    const kakao = (window as any).kakao;
    const map = kakaoMapRef.current;

    const clickListener = (mouseEvent: any) => {
      if (!drawMode) return;
      const latLng = mouseEvent.latLng;
      const newPoint = { lat: latLng.getLat(), lng: latLng.getLng() };

      setPoints(prev => {
        const updated = [...prev, newPoint];

        // Add marker at clicked point
        const marker = new kakao.maps.Marker({
          position: latLng,
          map,
        });
        drawMarkersRef.current.push(marker);

        // Update polyline
        if (drawPolylineRef.current) drawPolylineRef.current.setMap(null);
        const linePath = updated.map(p => new kakao.maps.LatLng(p.lat, p.lng));
        drawPolylineRef.current = new kakao.maps.Polyline({
          path: linePath,
          strokeWeight: 3,
          strokeColor: "#e53e3e",
          strokeOpacity: 0.8,
          strokeStyle: "solid",
        });
        drawPolylineRef.current.setMap(map);

        // Update polygon preview (if 3+ points)
        if (drawPolygonRef.current) drawPolygonRef.current.setMap(null);
        if (updated.length >= 3) {
          drawPolygonRef.current = new kakao.maps.Polygon({
            path: linePath,
            strokeWeight: 2,
            strokeColor: "#e53e3e",
            strokeOpacity: 0.6,
            fillColor: "#fed7d7",
            fillOpacity: 0.3,
          });
          drawPolygonRef.current.setMap(map);
        }

        return updated;
      });
    };

    kakao.maps.event.addListener(map, "click", clickListener);
    return () => { kakao.maps.event.removeListener(map, "click", clickListener); };
  }, [drawMode, mapLoaded]);

  // Clear drawing
  const clearDrawing = () => {
    drawMarkersRef.current.forEach(m => m.setMap(null));
    drawMarkersRef.current = [];
    if (drawPolylineRef.current) { drawPolylineRef.current.setMap(null); drawPolylineRef.current = null; }
    if (drawPolygonRef.current) { drawPolygonRef.current.setMap(null); drawPolygonRef.current = null; }
    setPoints([]);
  };

  // Undo last point
  const undoPoint = () => {
    if (points.length === 0) return;
    const kakao = (window as any).kakao;
    const map = kakaoMapRef.current;

    // Remove last marker
    const lastMarker = drawMarkersRef.current.pop();
    if (lastMarker) lastMarker.setMap(null);

    setPoints(prev => {
      const updated = prev.slice(0, -1);

      // Redraw polyline
      if (drawPolylineRef.current) drawPolylineRef.current.setMap(null);
      if (updated.length > 0) {
        const linePath = updated.map(p => new kakao.maps.LatLng(p.lat, p.lng));
        drawPolylineRef.current = new kakao.maps.Polyline({ path: linePath, strokeWeight: 3, strokeColor: "#e53e3e", strokeOpacity: 0.8, strokeStyle: "solid" });
        drawPolylineRef.current.setMap(map);
      }

      // Redraw polygon preview
      if (drawPolygonRef.current) drawPolygonRef.current.setMap(null);
      if (updated.length >= 3) {
        const linePath = updated.map(p => new kakao.maps.LatLng(p.lat, p.lng));
        drawPolygonRef.current = new kakao.maps.Polygon({ path: linePath, strokeWeight: 2, strokeColor: "#e53e3e", strokeOpacity: 0.6, fillColor: "#fed7d7", fillOpacity: 0.3 });
        drawPolygonRef.current.setMap(map);
      }

      return updated;
    });
  };

  // Save block
  const saveBlock = async () => {
    if (!blockName.trim()) { setMessage("❌ 블럭 이름을 입력하세요"); return; }
    if (!blockSigungu.trim()) { setMessage("❌ 시군구(예: 강남구)를 입력하세요"); return; }
    if (points.length < 3) { setMessage("❌ 최소 3개의 꼭짓점이 필요합니다"); return; }

    setSaving(true);
    setMessage("");
    const res = await createMapBlock({
      name: blockName.trim(),
      sido: blockSido,
      sigungu: blockSigungu.trim(),
      coordinates: points,
      color: blockColor,
    });

    if (res.success) {
      setMessage("✅ 블럭이 저장되었습니다!");
      clearDrawing();
      setBlockName("");
      setBlockSigungu("");
      setDrawMode(false);
      await loadBlocks();
    } else {
      setMessage(`❌ 저장 실패: ${res.error}`);
    }
    setSaving(false);
  };

  // Delete block
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 블럭을 삭제하시겠습니까?`)) return;
    const res = await deleteMapBlock(id);
    if (res.success) {
      setMessage("🗑️ 블럭이 삭제되었습니다");
      await loadBlocks();
    } else {
      setMessage(`❌ 삭제 실패: ${res.error}`);
    }
  };

  const inputStyle: React.CSSProperties = { padding: "8px 12px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 6, outline: "none", width: "100%" };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Noto Sans KR', sans-serif" }}>
      {/* Left: Map */}
      <div style={{ flex: 1, position: "relative" }}>
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

        {/* Draw mode indicator */}
        {drawMode && (
          <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 10, background: "#e53e3e", color: "#fff", padding: "10px 24px", borderRadius: 8, fontWeight: 700, fontSize: 14, boxShadow: "0 4px 12px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#fff", animation: "pulse 1.5s infinite" }}></span>
            그리기 모드 — 지도를 클릭하여 꼭짓점을 추가하세요 ({points.length}개)
          </div>
        )}

        {/* Map controls */}
        {drawMode && points.length > 0 && (
          <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 10, display: "flex", gap: 8 }}>
            <button onClick={undoPoint} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#f59e0b", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
              ↩ 되돌리기
            </button>
            <button onClick={() => { clearDrawing(); setDrawMode(false); }} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#6b7280", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
              ✕ 취소
            </button>
          </div>
        )}
      </div>

      {/* Right: Control Panel */}
      <div style={{ width: 380, background: "#fff", borderLeft: "1px solid #e5e7eb", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: `3px solid ${BRAND}`, background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)" }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: BRAND, margin: 0 }}>🗺️ 블럭 에디터</h1>
          <p style={{ fontSize: 12, color: "#6b7280", margin: "6px 0 0" }}>지도 위에 커스텀 블럭(다각형)을 그려 저장합니다</p>
        </div>

        {/* Draw Section */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px", color: "#111" }}>새 블럭 그리기</h3>

          {!drawMode ? (
            <button onClick={() => { clearDrawing(); setDrawMode(true); setMessage(""); }}
              style={{ width: "100%", padding: "12px", borderRadius: 8, border: "none", background: BRAND, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.2s" }}>
              ✏️ 그리기 시작
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block" }}>블럭 이름 *</label>
                <input value={blockName} onChange={e => setBlockName(e.target.value)} placeholder="예: 강남역 삼거리 블록" style={inputStyle} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block" }}>시도</label>
                  <select value={blockSido} onChange={e => setBlockSido(e.target.value)} style={inputStyle}>
                    {SIDO_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block" }}>시군구</label>
                  <input value={blockSigungu} onChange={e => setBlockSigungu(e.target.value)} placeholder="강남구" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block" }}>블럭 색상</label>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {["#0066cc", "#e53e3e", "#38a169", "#d69e2e", "#805ad5", "#dd6b20"].map(c => (
                    <div key={c} onClick={() => setBlockColor(c)}
                      style={{ width: 28, height: 28, borderRadius: 6, background: c, cursor: "pointer", border: blockColor === c ? "3px solid #111" : "2px solid #e5e7eb", transition: "all 0.15s" }} />
                  ))}
                  <input type="color" value={blockColor} onChange={e => setBlockColor(e.target.value)} style={{ width: 28, height: 28, padding: 0, border: "none", cursor: "pointer" }} />
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", background: "#f9fafb", padding: "8px 12px", borderRadius: 6 }}>
                꼭짓점: <strong style={{ color: BRAND }}>{points.length}</strong>개 {points.length < 3 && <span style={{ color: "#e53e3e" }}>(최소 3개 필요)</span>}
              </div>
              <button onClick={saveBlock} disabled={saving || points.length < 3}
                style={{ width: "100%", padding: "12px", borderRadius: 8, border: "none", background: points.length >= 3 ? "#38a169" : "#d1d5db", color: "#fff", fontWeight: 700, fontSize: 14, cursor: points.length >= 3 ? "pointer" : "not-allowed", transition: "all 0.2s" }}>
                {saving ? "저장 중..." : "💾 블럭 저장"}
              </button>
            </div>
          )}

          {message && (
            <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600, background: message.startsWith("✅") || message.startsWith("🗑️") ? "#f0fff4" : "#fff5f5", color: message.startsWith("✅") || message.startsWith("🗑️") ? "#276749" : "#c53030" }}>
              {message}
            </div>
          )}
        </div>

        {/* Saved Blocks List */}
        <div style={{ padding: "20px 24px", flex: 1 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px", color: "#111" }}>
            저장된 블럭 ({blocks.length})
          </h3>
          {blocks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#aaa", fontSize: 13 }}>
              <span style={{ fontSize: 32, display: "block", marginBottom: 8 }}>📭</span>
              아직 저장된 블럭이 없습니다
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {blocks.map(block => (
                <div key={block.id} style={{ padding: "12px 14px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fafafa", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 4, background: block.color || "#0066cc", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{block.name}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>
                      {block.sido || ""} {block.sigungu || ""} · {block.coordinates?.length || 0}꼭짓점
                    </div>
                  </div>
                  <button onClick={() => {
                    if (kakaoMapRef.current && block.coordinates?.length > 0) {
                      const kakao = (window as any).kakao;
                      const bounds = new kakao.maps.LatLngBounds();
                      block.coordinates.forEach((c: any) => bounds.extend(new kakao.maps.LatLng(c.lat, c.lng)));
                      kakaoMapRef.current.setBounds(bounds);
                    }
                  }} style={{ fontSize: 11, padding: "4px 8px", borderRadius: 4, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", color: "#555", fontWeight: 600 }}>
                    📍
                  </button>
                  <button onClick={() => handleDelete(block.id, block.name)}
                    style={{ fontSize: 11, padding: "4px 8px", borderRadius: 4, border: "1px solid #fecaca", background: "#fff5f5", cursor: "pointer", color: "#e53e3e", fontWeight: 600 }}>
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #e5e7eb", fontSize: 11, color: "#aaa", textAlign: "center" }}>
          관리자 블럭 에디터 v1.0 · 공실뉴스
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
