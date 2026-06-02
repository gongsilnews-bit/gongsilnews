import re

with open('src/app/m/admin/vacancy/write/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add states
state_injection = '''
  const [mainUsage, setMainUsage] = useState("");
  const [elevatorCnt, setElevatorCnt] = useState("");
  const [isIllegal, setIsIllegal] = useState(false);
  const [buildingStructure, setBuildingStructure] = useState("");
'''
content = content.replace('const [propertyType, setPropertyTypeRaw] = useState("아파트·오피스텔");', state_injection + '  const [propertyType, setPropertyTypeRaw] = useState("아파트·오피스텔");')

# 2. Load from editData
load_injection = '''
      if (editData.metadata?.main_usage) setMainUsage(editData.metadata.main_usage);
      if (editData.metadata?.elevator_cnt) setElevatorCnt(editData.metadata.elevator_cnt);
      if (editData.metadata?.is_illegal) setIsIllegal(editData.metadata.is_illegal);
      if (editData.metadata?.building_structure) setBuildingStructure(editData.metadata.building_structure);
'''
content = content.replace('if (editData.dong) setDong(editData.dong);', 'if (editData.dong) setDong(editData.dong);' + load_injection)

# 3. Save to metadata
save_injection = '''
          main_usage: mainUsage,
          elevator_cnt: elevatorCnt,
          is_illegal: isIllegal,
          building_structure: buildingStructure,
'''
content = content.replace('land_share_py: landSharePy ? parseFloat(landSharePy) : undefined,', 'land_share_py: landSharePy ? parseFloat(landSharePy) : undefined,' + save_injection)

# 4. Update fetchBuildingLedger
new_ledger_logic = '''
        let p = ledger.mainPurpsCdNm || "";
        if (p.includes("단독주택") || p.includes("다세대") || p.includes("연립")) {
           setPropertyType("빌라·주택");
           setSubCategory("빌라/연립");
        } else if (p.includes("근린생활") || p.includes("상업") || p.includes("업무") || p.includes("공장") || p.includes("창고")) {
           setPropertyType("상가·사무실·건물·공장·토지");
           setSubCategory(p.includes("업무") ? "사무실" : p.includes("공장") ? "공장/창고" : "상가");
        }

        if (p) setMainUsage(p);
        if (ledger.strctCdNm) setBuildingStructure(ledger.strctCdNm);
        const elvt = (Number(ledger.rideUseElvtCnt) || 0) + (Number(ledger.emgenUseElvtCnt) || 0);
        if (elvt > 0) setElevatorCnt(elvt.toString());
        
        const addInfo = [];
        if (addInfo.length > 0) {
          setDescription(prev => (prev ? prev + "\\n" : "") + "[건축물대장 추가 정보]\\n" + addInfo.join("\\n"));
        }
        
        alert("✨ AI 건축물대장 분석 완료!\\n면적, 층수, 주용도, 승강기 정보가 자동 입력되었습니다.");
'''
content = re.sub(r'let p = ledger\.mainPurpsCdNm \|\| "";[\s\S]*?alert\("건축물대장.*?\."\);', new_ledger_logic.strip(), content)

# 5. Add UI inputs in Step 2
ui_injection = '''
        {/* 상업용 건물 전용 추가 스펙 (API 연동 항목) */}
        {propertyType === "상가·사무실·건물·공장·토지" && subCategory !== "토지" && (
          <div style={{ background: "#f8fafc", borderRadius: 14, padding: 16, marginBottom: 12, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
              <span>🏢 상업용 추가 스펙</span>
              <span style={{ fontSize: 11, background: "#dbeafe", color: "#1e40af", padding: "2px 6px", borderRadius: 4 }}>대장 연동 권장</span>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#4b5563", marginBottom: 6, display: "block" }}>건축물 주용도</label>
              <input type="text" placeholder="예: 제2종근린생활시설" value={mainUsage} onChange={(e) => setMainUsage(e.target.value)} style={{ width: "100%", height: 46, borderRadius: 8, border: "1px solid #d1d5db", padding: "0 14px", fontSize: 14, background: "#fff" }} />
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#4b5563", marginBottom: 6, display: "block" }}>건물 구조</label>
              <input type="text" placeholder="예: 철근콘크리트구조" value={buildingStructure} onChange={(e) => setBuildingStructure(e.target.value)} style={{ width: "100%", height: 46, borderRadius: 8, border: "1px solid #d1d5db", padding: "0 14px", fontSize: 14, background: "#fff" }} />
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#4b5563", marginBottom: 6, display: "block" }}>승강기 (대수)</label>
                <div style={{ position: "relative" }}>
                  <input type="number" placeholder="0" value={elevatorCnt} onChange={(e) => setElevatorCnt(e.target.value)} style={{ width: "100%", height: 46, borderRadius: 8, border: "1px solid #d1d5db", padding: "0 30px 0 14px", fontSize: 14, background: "#fff", textAlign: "right" }} />
                  <span style={{ position: "absolute", right: 14, top: 14, fontSize: 14, color: "#6b7280" }}>대</span>
                </div>
              </div>
              <div style={{ flex: 1.2 }}>
                <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 46, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                  <input type="checkbox" checked={isIllegal} onChange={(e) => setIsIllegal(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#ef4444" }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: isIllegal ? "#ef4444" : "#4b5563" }}>⚠️ 위반건축물</span>
                </label>
              </div>
            </div>
          </div>
        )}
'''
# Insert after fetchingLedger button code in STEP 2
button_marker = '{fetchingLedger ? "AI 데이터 불러오는 중..." : "AI 건축물대장 자동완성"}\n            </button>\n          </div>\n        )}'
content = content.replace(button_marker, button_marker + '\n\n' + ui_injection)

with open('src/app/m/admin/vacancy/write/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("page.tsx (mobile) updated successfully!")
