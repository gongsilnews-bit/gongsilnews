import React, { useState, useEffect } from 'react';

interface Props {
  onLocationMove: (lat: number, lng: number, zoom: number) => void;
  onClose: () => void;
  locLabel: string;
  setLocLabel: (label: string) => void;
}

export default function LocationFilterPanel({ onLocationMove, onClose, locLabel, setLocLabel }: Props) {
  const [locTab, setLocTab] = useState<"region" | "keyword">("region");
  const [sidoList, setSidoList] = useState<any[]>([]);
  const [gugunList, setGugunList] = useState<any[]>([]);
  const [dongList, setDongList] = useState<any[]>([]);
  const [selSido, setSelSido] = useState("");
  const [selGugun, setSelGugun] = useState("");
  const [selSidoCode, setSelSidoCode] = useState("");
  const [selGugunCode, setSelGugunCode] = useState("");
  const [locKeyword, setLocKeyword] = useState("");
  const [locResults, setLocResults] = useState<any[]>([]);
  const [regTab, setRegTab] = useState<"sido"|"gugun"|"dong">("sido");

  useEffect(() => { loadSido(); }, []);

  const loadSido = async () => {
    try {
      const res = await fetch('https://grpc-proxy-server-mkvo6j4wsq-du.a.run.app/v1/regcodes?regcode_pattern=*00000000');
      const data = await res.json();
      setSidoList(data.regcodes || []);
    } catch (e) { console.error(e); }
  };

  const loadGugun = async (code: string) => {
    setGugunList([]);
    try {
      const res = await fetch(`https://grpc-proxy-server-mkvo6j4wsq-du.a.run.app/v1/regcodes?regcode_pattern=${code.substring(0,2)}*00000&is_ignore_zero=true`);
      const data = await res.json();
      setGugunList((data.regcodes || []).sort((a:any,b:any) => a.name.localeCompare(b.name)).map((c:any) => ({ code: c.code, name: c.name.split(' ').slice(1).join(' ') })));
    } catch (e) { console.error(e); }
  };

  const loadDong = async (code: string) => {
    setDongList([]);
    try {
      const res = await fetch(`https://grpc-proxy-server-mkvo6j4wsq-du.a.run.app/v1/regcodes?regcode_pattern=${code.substring(0,5)}*&is_ignore_zero=true`);
      const data = await res.json();
      setDongList((data.regcodes || []).filter((c:any) => c.code !== code).sort((a:any,b:any) => a.name.localeCompare(b.name)).map((c:any) => { const p = c.name.split(' '); return { code: c.code, name: p[p.length-1] }; }));
    } catch (e) { console.error(e); }
  };

  const moveMap = (keyword: string, zoom: number) => {
    const kakao = (window as any).kakao;
    if (!kakao?.maps?.services) return;
    const ps = new kakao.maps.services.Places();
    ps.keywordSearch(keyword, (data: any, status: any) => {
      if (status === kakao.maps.services.Status.OK && data.length > 0) {
        onLocationMove(parseFloat(data[0].y), parseFloat(data[0].x), zoom);
      }
    });
  };

  const doLocKeywordSearch = () => {
    if (!locKeyword.trim()) return;
    const kakao = (window as any).kakao;
    if (!kakao?.maps?.services) return;
    const ps = new kakao.maps.services.Places();
    ps.keywordSearch(locKeyword, (data: any, status: any) => {
      if (status === kakao.maps.services.Status.OK) setLocResults(data);
      else setLocResults([]);
    });
  };

  const gridBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 4px", borderRadius: "8px", fontSize: "13px", fontWeight: active ? 700 : 500, textAlign: "center",
    border: active ? "1.5px solid #4b89ff" : "1px solid #e5e7eb",
    background: active ? "#eef4ff" : "#fff", color: active ? "#4b89ff" : "#374151",
    cursor: "pointer", transition: "all 0.15s",
  });

  return (
    <div>
      <div style={{ display: "flex", borderBottom: "2px solid #f3f4f6", marginBottom: "16px" }}>
        <button onClick={() => setLocTab("region")} style={{ flex: 1, padding: "10px", fontSize: "14px", fontWeight: locTab === "region" ? 700 : 500, color: locTab === "region" ? "#4b89ff" : "#9ca3af", borderBottom: locTab === "region" ? "2px solid #4b89ff" : "2px solid transparent", background: "none", border: "none", cursor: "pointer" }}>지역선택</button>
        <button onClick={() => setLocTab("keyword")} style={{ flex: 1, padding: "10px", fontSize: "14px", fontWeight: locTab === "keyword" ? 700 : 500, color: locTab === "keyword" ? "#4b89ff" : "#9ca3af", borderBottom: locTab === "keyword" ? "2px solid #4b89ff" : "2px solid transparent", background: "none", border: "none", cursor: "pointer" }}>키워드검색</button>
      </div>
      
      {locTab === "region" ? (
        <div>
          <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
            {(["sido","gugun","dong"] as const).map(t => (
              <button key={t} onClick={() => setRegTab(t)} style={{ flex: 1, padding: "8px 4px", fontSize: "13px", fontWeight: regTab === t ? 700 : 500, background: regTab === t ? "#4b89ff" : "#f3f4f6", color: regTab === t ? "#fff" : "#6b7280", borderRadius: "6px", border: "none", cursor: "pointer" }}>
                {t === "sido" ? "시/도" : t === "gugun" ? "시/군/구" : "읍/면/동"}
              </button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
            {regTab === "sido" && (sidoList.length > 0 ? sidoList.map(c => (
              <button key={c.code} onClick={() => { setSelSidoCode(c.code); setSelSido(c.name); setSelGugun(""); setRegTab("gugun"); loadGugun(c.code); moveMap(c.name, 8); setLocLabel(c.name); }} style={gridBtnStyle(selSido === c.name)}>{c.name}</button>
            )) : <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px", color: "#9ca3af" }}>로딩중...</div>)}
            {regTab === "gugun" && (!selSidoCode ? <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px", color: "#9ca3af" }}>시/도를 먼저 선택하세요</div> : gugunList.length > 0 ? gugunList.map(c => (
              <button key={c.code} onClick={() => { setSelGugunCode(c.code); setSelGugun(c.name); setRegTab("dong"); loadDong(c.code); moveMap(`${selSido} ${c.name}`, 6); setLocLabel(`${c.name}`); }} style={gridBtnStyle(selGugun === c.name)}>{c.name}</button>
            )) : <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px", color: "#9ca3af" }}>로딩중...</div>)}
            {regTab === "dong" && (!selGugunCode ? <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px", color: "#9ca3af" }}>시/군/구를 먼저 선택하세요</div> : dongList.length > 0 ? dongList.map(c => (
              <button key={c.code} onClick={() => { moveMap(`${selSido} ${selGugun} ${c.name}`, 4); setLocLabel(`${selGugun} ${c.name}`); onClose(); }} style={gridBtnStyle(false)}>{c.name}</button>
            )) : <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px", color: "#9ca3af" }}>로딩중...</div>)}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <input type="text" placeholder="동, 읍, 면 또는 랜드마크 검색" value={locKeyword} onChange={e => setLocKeyword(e.target.value)} onKeyDown={e => e.key === "Enter" && doLocKeywordSearch()} style={{ flex: 1, padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", outline: "none" }} />
            <button onClick={doLocKeywordSearch} style={{ padding: "10px 16px", background: "#4b89ff", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}>이동</button>
          </div>
          <div style={{ maxHeight: "180px", overflowY: "auto" }}>
            {locResults.map((r, i) => (
              <div key={i} onClick={() => { onLocationMove(parseFloat(r.y), parseFloat(r.x), 5); setLocLabel(r.place_name || r.address_name); onClose(); }} style={{ padding: "12px 4px", borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#111" }}>{r.place_name || r.address_name}</div>
                <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>{r.address_name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
