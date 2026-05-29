const fs = require('fs');
const path = 'c:/Users/user/Desktop/gongsilnews/src/app/(main)/homepage/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Remove accordion categories and expandedMenu state
code = code.replace(/const ACCORDION_CATEGORIES = \[[\s\S]*?\];\n\n/, '');
code = code.replace(/  const \[expandedMenu, setExpandedMenu\] = useState<string \| null>\("아파트·오피스텔"\);\n/, '');

// 2. The flat category replacement
const flatCategories = `            <div style={{ display: "flex", flexDirection: "column", fontSize: 13, color: "#333" }}>
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

const startIdx = code.indexOf('<div style={{ display: "flex", flexDirection: "column", fontSize: 14 }}>');
const endIdx = code.indexOf('</div>', code.indexOf('))}')) + 6;

if (startIdx !== -1 && endIdx !== -1) {
  code = code.substring(0, startIdx) + flatCategories + code.substring(endIdx);
  fs.writeFileSync(path, code);
  console.log('Revert successful');
} else {
  console.log('Failed to find block');
}
