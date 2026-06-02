import re

with open('src/components/admin/VacancyRegisterForm.tsx', 'r', encoding='utf-8') as f:
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

# 4. Update fetchBuildingLedger to set states instead of dumping to description
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
# Replace the old logic
content = re.sub(r'let p = ledger\.mainPurpsCdNm \|\| "";[\s\S]*?alert\("건축물대장.*?입니다\."\);', new_ledger_logic.strip(), content)

# 5. Add UI inputs in Section 2 (around parking and floor)
ui_injection = '''
            {/* 상업용 건물 전용 추가 스펙 (API 연동 항목) */}
            {propertyType === "상가·사무실·건물·공장·토지" && subCategory !== "토지" && (
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16, marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>🏢 상업용/건물 추가 상세 정보</span>
                  <span style={{ fontSize: 11, background: "#dbeafe", color: "#1e40af", padding: "2px 6px", borderRadius: 4 }}>대장 연동 권장</span>
                </div>
                
                <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{...labelStyle, marginBottom: 6}}>건축물 주용도</label>
                    <input type="text" placeholder="예: 제2종근린생활시설" value={mainUsage} onChange={(e) => setMainUsage(e.target.value)} style={{...inputStyle, background: "#fff"}} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{...labelStyle, marginBottom: 6}}>건물 구조</label>
                    <input type="text" placeholder="예: 철근콘크리트구조" value={buildingStructure} onChange={(e) => setBuildingStructure(e.target.value)} style={{...inputStyle, background: "#fff"}} />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{...labelStyle, marginBottom: 6}}>승강기 대수</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input type="number" placeholder="예: 2" value={elevatorCnt} onChange={(e) => setElevatorCnt(e.target.value)} style={{...inputStyle, background: "#fff", width: "100%"}} />
                      <span style={{ fontSize: 14, color: textSecondary }}>대</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: "#fff", border: "1px solid #e2e8f0", height: 46, padding: "0 12px", borderRadius: 8 }}>
                      <input type="checkbox" checked={isIllegal} onChange={(e) => setIsIllegal(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#ef4444" }} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: isIllegal ? "#ef4444" : textPrimary }}>⚠️ 위반건축물 여부 (체크)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
'''
# Insert after parking field
content = content.replace('{/* 주차 */}', ui_injection + '\n            {/* 주차 */}')

with open('src/components/admin/VacancyRegisterForm.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("VacancyRegisterForm.tsx updated successfully!")
