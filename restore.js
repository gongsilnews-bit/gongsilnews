const fs = require('fs');
const path = 'c:/Users/user/Desktop/gongsilnews/src/app/(main)/homepage/page.tsx';
let code = fs.readFileSync(path, 'utf8');

const tableStart = code.indexOf('{/* ── Grid List (Data Table) ── */}');
const tableEnd = code.indexOf('{/* Pagination */}');

if (tableStart !== -1 && tableEnd !== -1) {
  const head = code.substring(0, tableStart);
  const tail = code.substring(tableEnd);

  const newCards = `        {/* ── Wide Card Listings ── */}
        <div style={{ display: "flex", gap: 24 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ padding: "16px 20px", borderBottom: "2px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#111" }}>총 <span style={{ color: BRAND }}>{filtered.length.toLocaleString()}</span>건의 공실 매물</div>
              <select style={{ border: "1px solid #cbd5e1", padding: "6px 12px", fontSize: 13, borderRadius: 4, outline: "none" }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="latest">최신 등록순</option>
                <option value="price_asc">가격 낮은순</option>
                <option value="price_desc">가격 높은순</option>
              </select>
            </div>

            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", color: "#888" }}>
                <span style={{ display: "inline-block", width: 28, height: 28, border: "3px solid #ddd", borderTop: \`3px solid \${BRAND}\`, borderRadius: "50%", animation: "spin 1s linear infinite", marginRight: 12 }}></span>
                공실광고 데이터를 불러오고 있습니다...
              </div>
            ) : paged.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#aaa" }}>
                <span style={{ fontSize: 40, display: "block", marginBottom: 12 }}>🏠</span>
                검색 조건에 해당하는 공실광고가 없습니다.
              </div>
            ) : (
              <div style={{ borderTop: "1px solid #1e293b" }}>
                {paged.map((v, idx) => {
                  const isMasked = v.exposure_type === '부동산노출' && userLevel < 2;
                  const showCommission = userLevel >= 2;
                  const addrText = v.building_name || \`\${v.sigungu || ""} \${v.dong || ""} 공실광고\`;
                  
                  return (
                    <div key={v.id} style={{ borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
                      <div onClick={() => { 
                        if (isMasked) { setIsAuthModalOpen(true); return; }
                        setExpandedIds(prev => prev.includes(v.id) ? prev.filter(x => x !== v.id) : [...prev, v.id]); 
                      }} style={{ display: "flex", padding: "16px 0", alignItems: "center", cursor: "pointer", transition: "background 0.15s" }} onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      
                      {/* 1. Checkbox */}
                      <div style={{ width: 40, display: "flex", justifyContent: "center", alignItems: "center", flexShrink: 0 }}>
                        <input type="checkbox" onClick={e => e.stopPropagation()} style={{ zoom: 1.3, cursor: "pointer" }} />
                      </div>

                      {/* 2. Photo */}
                      <div style={{ width: 140, height: 105, overflow: "hidden", flexShrink: 0, background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 4 }}>
                        {v.photos?.length > 0 ? (
                          <img src={v.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : v.lat && v.lng && mapLoaded ? (
                          <ThumbnailRoadview lat={v.lat} lng={v.lng} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", fontSize: 12 }}>No Photo</div>
                        )}
                      </div>
                      
                      {/* 3. Main Info */}
                      <div style={{ flex: 1, minWidth: 0, paddingLeft: 20 }}>
                        <div style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "center" }}>
                          {showCommission && (v.realtor_commission || v.commission_type) && (
                            <span style={{ display: "inline-block", background: "#fff", color: "#fa5252", border: "1px solid #fa5252", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>
                              {v.realtor_commission || v.commission_type}
                            </span>
                          )}
                          <span style={{ display: "inline-block", fontSize: 11, color: "#fa5252", border: "1px solid #fa5252", padding: "2px 6px", fontWeight: "bold", borderRadius: 4, background: "#fff" }}>
                            {v.owner_role === 'REALTOR' || v.members?.role === 'REALTOR' ? '부동산' : '일반'}
                          </span>
                          {isMasked && (
                            <span onClick={(e) => { e.stopPropagation(); setIsAuthModalOpen(true); }} style={{ fontSize: 11, color: "#3b82f6", fontWeight: 700, background: "#eef6ff", padding: "3px 8px", borderRadius: 4, cursor: "pointer" }}>🔒 부동산회원 가입 시 무료 열람</span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <span style={{ fontSize: 17, fontWeight: 800, color: isMasked ? "#bbb" : "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: isMasked ? 1 : 0 }}>
                            {isMasked ? addrText.replace(/[^\s]/g, "X") : addrText} {v.property_type && \`(\${v.property_type})\`}
                          </span>
                          <span style={{ background: "#fbbf24", color: "#fff", fontSize: 10, fontWeight: "bold", padding: "1px 4px", borderRadius: 2 }}>N</span>
                        </div>
                        <div style={{ fontSize: 14, color: "#444", lineHeight: 1.5, fontWeight: 500 }}>
                          공급 {v.area_m2 ? Math.round(v.area_m2 * 1.2) : 0}m²({v.area_m2 ? Math.round(v.area_m2 * 1.2 / 3.3) : 0}P) / 
                          전용 {v.area_m2 || 0}m²({v.area_m2 ? Math.round(v.area_m2 / 3.3) : 0}P) 
                          <span style={{ color: "#1a365d", marginLeft: 4, fontWeight: 700 }}>{v.property_type}{v.sub_category ? \`/\${v.sub_category}\` : ""}</span> 공실
                        </div>
                        <div style={{ fontSize: 13, color: "#777", marginTop: 4 }}>
                          {v.floor || "해당층"}/{v.total_floors || "전체층"}, 
                          {v.parking_spots ? \` 주차\${v.parking_spots}\` : " 주차불가"}, 
                          {v.completion_year ? \` \${v.completion_year}년\` : " 연식미상"}
                          {(v.realtor_commission || v.commission_type) && \`, \${v.realtor_commission || v.commission_type}\`}
                        </div>
                      </div>

                      {/* 4. Price */}
                      <div style={{ width: 160, flexShrink: 0, textAlign: "center", borderLeft: "1px solid #f1f5f9", borderRight: "1px solid #f1f5f9", padding: "0 10px" }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#111", marginBottom: 6 }}>
                          {getPriceLabel(v)} {getPriceText(v).replace('만', '').replace('억', '')}
                        </div>
                        <div style={{ fontSize: 12, color: "#888" }}>
                          관리비 {Math.floor((v.maintenance_fee || 0)/10000)}만
                        </div>
                      </div>

                      {/* 5. Actions */}
                      <div style={{ width: 140, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, paddingRight: 10 }}>
                        <button onClick={e => e.stopPropagation()} style={{ width: 110, background: "#1a365d", color: "#fff", border: "none", padding: "8px 0", fontSize: 13, fontWeight: "bold", borderRadius: 4, cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                          연락처보기
                        </button>
                        <div style={{ display: "flex", width: 110 }}>
                          <button onClick={(e) => { e.stopPropagation(); router.push(\`/homepage/\${v.id}\`); }} style={{ width: "100%", background: "#fff", color: "#555", border: "1px solid #cbd5e1", padding: "6px 0", fontSize: 12, fontWeight: 600, cursor: "pointer", borderRadius: 4 }}>
                            상세보기
                          </button>
                        </div>
                      </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedIds.includes(v.id) && (
                        <div style={{ padding: "0 24px 24px 40px", background: "#fff", cursor: "default" }} onClick={e => e.stopPropagation()}>
                          <div style={{ borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", borderLeft: "1px solid #e2e8f0", display: "grid", gridTemplateColumns: "130px 1fr 130px 1fr", fontSize: 14 }}>
                            {[
                              { l1: "공실광고번호", v1: String(v.id).split('-')[0].toUpperCase(), l2: "방/욕실수", v2: \`\${v.rooms || 0}개 / \${v.bathrooms || 0}개\` },
                              { l1: "소재지", v1: \`\${v.sido} \${v.sigungu} \${v.dong} \${v.detail_addr || ""}\`.trim(), l2: "방향", v2: v.direction || "남향" },
                              { l1: "공실광고특징", v1: v.building_name || "특징 없음", l2: "주차가능 여부", v2: v.parking_spots ? \`\${v.parking_spots}대\` : "불가" },
                              { l1: "공급/전용면적", v1: \`\${Math.round((v.area_m2 || 0) * 1.3)}m² / \${v.area_m2 || 0}m²\`, l2: "입주가능일", v2: v.move_in_date || "1개월 이내" },
                              { l1: "해당층/총층", v1: \`\${v.floor || "해당층"} / \${v.total_floors || "전체층"}\`, l2: "관리비", v2: v.maintenance_fee ? \`\${Math.round(v.maintenance_fee/10000)}만원\` : "10만원" },
                              { l1: "등록자명", v1: (() => {
                                const m = v.members;
                                if (!m) return v.client_name || "-";
                                if (m.role === 'REALTOR' && m.agencies && m.agencies.length > 0) return m.agencies[0].agency_name || m.name || v.client_name || "-";
                                return m.name || v.client_name || "-";
                              })(), l2: "연락처", v2: (() => {
                                const m = v.members;
                                if (!m) return v.client_phone || "-";
                                if (m.role === 'REALTOR' && m.agencies && m.agencies.length > 0) return m.agencies[0].phone || m.phone || v.client_phone || "-";
                                return m.phone || v.client_phone || "-";
                              })() }
                            ].map((row, i, arr) => (
                              <div key={i} style={{ display: "contents" }}>
                                <div style={{ background: "#f8f9fa", padding: "12px 16px", fontWeight: "bold", color: "#555", borderBottom: i === arr.length - 1 ? "none" : "1px solid #f1f5f9", display: "flex", alignItems: "center" }}>{row.l1}</div>
                                <div style={{ padding: "12px 16px", color: "#111", borderBottom: i === arr.length - 1 ? "none" : "1px solid #f1f5f9", display: "flex", alignItems: "center" }}>{row.v1}</div>
                                <div style={{ background: "#f8f9fa", padding: "12px 16px", fontWeight: "bold", color: "555", borderBottom: i === arr.length - 1 ? "none" : "1px solid #f1f5f9", borderLeft: "1px solid #f1f5f9", display: "flex", alignItems: "center" }}>{row.l2}</div>
                                <div style={{ padding: "12px 16px", color: "#111", borderBottom: i === arr.length - 1 ? "none" : "1px solid #f1f5f9", display: "flex", alignItems: "center" }}>{row.v2}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
`;

  fs.writeFileSync(path, head + newCards + tail);
  console.log('Restored original wide cards');
} else {
  console.log('Could not find markers');
}
