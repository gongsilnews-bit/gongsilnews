const fs = require('fs');
const path = 'c:/Users/user/Desktop/gongsilnews/src/app/(main)/homepage/page.tsx';
let code = fs.readFileSync(path, 'utf8');

const accordionCategories = `const ACCORDION_CATEGORIES = [
  {
    label: "아파트·오피스텔",
    subItems: ["아파트", "아파트분양권", "재건축", "오피스텔", "오피스텔분양권", "재개발"]
  },
  {
    label: "빌라·주택",
    subItems: ["빌라/주택", "단독/다가구", "전원/농가주택"]
  },
  {
    label: "원룸·투룸(풀옵션)",
    subItems: ["원룸/도시형주택", "풀옵션(주택)"]
  },
  {
    label: "상가·사무실·건물·공장·토지",
    subItems: ["상가/점포", "사무실", "빌딩/건물", "공장/창고", "토지/임야", "숙박/콘도/펜션"]
  },
  {
    label: "분양",
    subItems: ["분양"]
  }
];`;

if (!code.includes('ACCORDION_CATEGORIES')) {
  code = code.replace('const DETAILED_CATEGORIES = [', accordionCategories + '\n\nconst DETAILED_CATEGORIES = [');
}

if (!code.includes('const [expandedMenu, setExpandedMenu] = useState<string | null>')) {
  code = code.replace('const [category, setCategory] = useState("");', 'const [category, setCategory] = useState("");\n  const [expandedMenu, setExpandedMenu] = useState<string | null>("아파트·오피스텔");');
}

// Now replace the sidebar UI.
const newSidebar = `            <div style={{ display: "flex", flexDirection: "column", fontSize: 14 }}>
              {ACCORDION_CATEGORIES.map((cat, i) => (
                 <div key={cat.label} style={{ borderBottom: i === ACCORDION_CATEGORIES.length - 1 ? "none" : "1px solid #f1f5f9" }}>
                   <div 
                     onClick={() => setExpandedMenu(prev => prev === cat.label ? null : cat.label)}
                     style={{ 
                       padding: "12px 16px", 
                       cursor: "pointer", 
                       display: "flex", 
                       justifyContent: "space-between", 
                       alignItems: "center",
                       background: expandedMenu === cat.label ? "#f8fafc" : "#fff",
                       fontWeight: expandedMenu === cat.label ? "bold" : "500",
                       color: expandedMenu === cat.label ? "#1e293b" : "#444"
                     }}
                   >
                     <span>{cat.label}</span>
                     <span style={{ fontSize: 11, color: "#94a3b8" }}>{expandedMenu === cat.label ? "▲" : "▼"}</span>
                   </div>
                   
                   {expandedMenu === cat.label && (
                     <div style={{ background: "#f8fafc", padding: "8px 0" }}>
                       {cat.subItems.map(sub => {
                         // Find matching DETAILED_CATEGORY to display badges
                         const detailInfo = DETAILED_CATEGORIES.find(d => d.name === sub);
                         const isSelected = category === sub;
                         
                         return (
                           <div 
                             key={sub}
                             onClick={() => setCategory(sub)}
                             style={{ 
                               padding: "8px 16px 8px 30px", 
                               cursor: "pointer",
                               display: "flex",
                               justifyContent: "space-between",
                               alignItems: "center",
                               transition: "background 0.1s"
                             }}
                             onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
                             onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                           >
                              <div style={{ fontWeight: isSelected ? 800 : 500, color: isSelected ? "#2563eb" : "#555", letterSpacing: -0.5, fontSize: 13 }}>
                                {sub}
                              </div>
                              {detailInfo && (
                                <div style={{ display: "flex", gap: 3 }}>
                                  {detailInfo.types.includes("매") && <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, fontSize: 10, fontWeight: "bold", background: "#ea4335", color: "#fff", borderRadius: 2 }}>매</span>}
                                  {detailInfo.types.includes("전") && <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, fontSize: 10, fontWeight: "bold", background: "#f97316", color: "#fff", borderRadius: 2 }}>전</span>}
                                  {detailInfo.types.includes("월") && <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, fontSize: 10, fontWeight: "bold", background: "#f59e0b", color: "#fff", borderRadius: 2 }}>월</span>}
                                  {detailInfo.types.includes("단") && <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, fontSize: 10, fontWeight: "bold", background: "#a855f7", color: "#fff", borderRadius: 2 }}>단</span>}
                                </div>
                              )}
                           </div>
                         );
                       })}
                     </div>
                   )}
                 </div>
              ))}
            </div>`;

const startIdx = code.indexOf('<div style={{ display: "flex", flexDirection: "column", fontSize: 13, color: "#333" }}>');
const endIdx = code.indexOf('</div>', code.indexOf('))}')) + 6;

if (startIdx !== -1 && endIdx !== -1) {
  code = code.substring(0, startIdx) + newSidebar + code.substring(endIdx);
  fs.writeFileSync(path, code);
  console.log('Update successful');
} else {
  console.log('Could not find the target block');
}
