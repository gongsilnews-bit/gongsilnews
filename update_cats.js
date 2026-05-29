const fs = require('fs');
const path = 'c:/Users/user/Desktop/gongsilnews/src/app/(main)/homepage/page.tsx';
let code = fs.readFileSync(path, 'utf8');

const detailedCategories = `const DETAILED_CATEGORIES = [
  { name: "아파트/주상복합", types: ["매", "전", "월", "단"] },
  { name: "아파트분양권", types: ["매", "전", "월", "단"] },
  { name: "오피스텔", types: ["매", "전", "월", "단"] },
  { name: "오피스텔분양권", types: ["매", "전", "월", "단"] },
  { name: "재건축", types: ["매", "전", "월", "단"] },
  { name: "재개발", types: ["매"] },
  { name: "풀옵션(주택)", types: ["매", "전", "월", "단"] },
  { name: "빌라/주택", types: ["매", "전", "월", "단"] },
  { name: "단독/다가구", types: ["매", "전", "월", "단"] },
  { name: "원룸/도시형주택", types: ["매", "전", "월", "단"] },
  { name: "사무실", types: ["매", "전", "월", "단"] },
  { name: "상가/점포", types: ["매", "전", "월", "단"] },
  { name: "빌딩/건물", types: ["매", "전", "월", "단"] },
  { name: "토지/임야", types: ["매", "전", "월", "단"] },
  { name: "공장/창고", types: ["매", "전", "월", "단"] },
  { name: "숙박/콘도/펜션", types: ["매", "전", "월"] },
  { name: "전원/농가주택", types: ["매", "전", "월"] },
  { name: "기타매물", types: ["매", "전", "월"] }
];`;

const replacement = `            <div style={{ display: "flex", flexDirection: "column", fontSize: 13, color: "#333" }}>
              {DETAILED_CATEGORIES.map((opt, i) => (
                 <div key={opt.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: i === DETAILED_CATEGORIES.length - 1 ? "none" : "1px solid #f1f5f9", cursor: "pointer", transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"} onClick={() => setCategory(opt.name)}>
                    <div style={{ fontWeight: category === opt.name ? 800 : 500, color: category === opt.name ? "#2563eb" : "#333", letterSpacing: -0.5 }}>
                      {opt.name}
                    </div>
                    <div style={{ display: "flex", gap: 3 }}>
                      {opt.types.includes("매") && <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, fontSize: 10, fontWeight: "bold", background: "#ea4335", color: "#fff", borderRadius: 2 }}>매</span>}
                      {opt.types.includes("전") && <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, fontSize: 10, fontWeight: "bold", background: "#f97316", color: "#fff", borderRadius: 2 }}>전</span>}
                      {opt.types.includes("월") && <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, fontSize: 10, fontWeight: "bold", background: "#f59e0b", color: "#fff", borderRadius: 2 }}>월</span>}
                      {opt.types.includes("단") && <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, fontSize: 10, fontWeight: "bold", background: "#a855f7", color: "#fff", borderRadius: 2 }}>단</span>}
                    </div>
                 </div>
              ))}
            </div>`;

// Insert detailedCategories after CATEGORY_OPTIONS
if (!code.includes('DETAILED_CATEGORIES')) {
  code = code.replace('const CATEGORY_OPTIONS = [', detailedCategories + '\n\nconst CATEGORY_OPTIONS = [');
}

// Replace the JSX block
const startIdx = code.indexOf('<div style={{ display: "flex", flexDirection: "column", fontSize: 13, color: "#333" }}>');
const endIdx = code.indexOf('</div>', code.indexOf('))}')) + 6;

if (startIdx !== -1 && endIdx !== -1) {
  code = code.substring(0, startIdx) + replacement + code.substring(endIdx);
  fs.writeFileSync(path, code);
  console.log('Update successful');
} else {
  console.log('Could not find the target block');
}
