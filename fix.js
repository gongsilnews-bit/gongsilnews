const fs = require('fs');
const path = 'c:/Users/user/Desktop/gongsilnews/src/app/(main)/homepage/page.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

const originalReturnIndex = 498;

if (lines[originalReturnIndex].includes('return (')) {
  let code = lines.slice(0, originalReturnIndex).join('\n') + '\n' + `  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", paddingBottom: 60 }}>
      <div style={{ maxWidth: 1300, margin: "20px auto 0", padding: "0 20px", display: "flex", gap: 24, alignItems: "flex-start" }}>
        
        {/* ── Left Sidebar (LNB) ── */}
        <div style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* User Info Block */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", padding: 16, borderRadius: 8, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 13, color: "#777", marginBottom: 8 }}>회원정보</div>
            {userLevel >= 2 ? (
              <>
                <div style={{ fontWeight: "bold", color: "#111", fontSize: 15 }}>부동산 중개회원</div>
                <div style={{ fontSize: 12, color: "#2563eb", marginTop: 4 }}>모든 매물 열람 가능</div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: "bold", color: "#111", fontSize: 15 }}>일반회원</div>
                <div style={{ fontSize: 12, color: "#fa5252", marginTop: 4 }}>일부 매물 열람 제한됨</div>
                <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                  <button onClick={() => setIsAuthModalOpen(true)} style={{ flex: 1, background: BRAND, color: "#fff", border: "none", padding: "6px 0", fontSize: 12, borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}>중개사회원 인증</button>
                </div>
              </>
            )}
          </div>

          {/* Quick Filters (Property Type) */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
            <div style={{ padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e5e7eb", fontWeight: "bold", fontSize: 14, color: "#111" }}>매물종류</div>
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10, fontSize: 14, color: "#444" }}>
              {CATEGORY_OPTIONS.map(opt => (
                 <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={category === opt.value || (!category && opt.value === "")} onChange={() => setCategory(opt.value)} style={{ zoom: 1.2 }} /> 
                    {opt.label || "전체매물"}
                 </label>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Main Area ── */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
          
          {/* ── Top Search Filter Panel ── */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#111" }}>매물 상세검색</span>
              <span style={{ fontSize: 13, color: "#777" }}>다양한 조건으로 원하시는 매물을 빠르게 찾아보세요.</span>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <select style={{ border: "1px solid #cbd5e1", padding: "10px 14px", borderRadius: 4, width: 140, fontSize: 14, outline: "none", color: "#333" }} value={sido} onChange={e => setSido(e.target.value)}>
                  {SIDO_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select style={{ border: "1px solid #cbd5e1", padding: "10px 14px", borderRadius: 4, width: 140, fontSize: 14, outline: "none", color: "#333" }} value={sigungu} onChange={e => setSigungu(e.target.value)}>
                  <option value="">시/구/군 전체</option>
                  {sigunguList.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div style={{ width: 1, height: 20, background: "#e2e8f0", margin: "0 4px" }} />
                <input type="text" placeholder="번지수 또는 건물명 입력 (예: 논현동 123)" style={{ flex: 1, minWidth: 200, border: "1px solid #cbd5e1", padding: "10px 14px", borderRadius: 4, fontSize: 14, outline: "none" }} />
                <button style={{ background: BRAND, color: "#fff", border: "none", padding: "10px 32px", borderRadius: 4, fontWeight: "bold", fontSize: 14, cursor: "pointer" }}>조건검색</button>
              </div>

              <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center", fontSize: 14, background: "#f8fafc", padding: "16px 20px", borderRadius: 6, border: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700, color: "#333", width: 50 }}>보증금</span>
                  <input type="text" style={{ width: 70, border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4 }} /> 만원 ~ 
                  <input type="text" style={{ width: 70, border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4 }} /> 만원
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700, color: "#333", width: 50 }}>월세</span>
                  <input type="text" style={{ width: 70, border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4 }} /> 만원 ~ 
                  <input type="text" style={{ width: 70, border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4 }} /> 만원
                </div>
                <div style={{ width: 1, height: 20, background: "#cbd5e1", margin: "0 4px" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700, color: "#333", width: 60 }}>전용면적</span>
                  <input type="text" style={{ width: 60, border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4 }} /> 평 ~ 
                  <input type="text" style={{ width: 60, border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: 4 }} /> 평
                </div>
              </div>
              
              <div style={{ display: "flex", gap: 20, alignItems: "center", fontSize: 14, padding: "0 4px" }}>
                 <span style={{ fontWeight: 700, color: "#333", width: 60 }}>거래방식</span>
                 {TRADE_OPTIONS.map(opt => (
                   <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "#555" }}>
                     <input type="checkbox" checked={tradeType === opt.value || (!tradeType && opt.value === "")} onChange={() => setTradeType(opt.value)} style={{ zoom: 1.1 }} /> 
                     {opt.label || "전체"}
                   </label>
                 ))}
                 <div style={{ flex: 1 }} />
                 <button style={{ background: "#fff", border: "1px solid #cbd5e1", color: "#555", padding: "8px 16px", borderRadius: 4, fontSize: 13, cursor: "pointer", fontWeight: "bold" }}>옵션 초기화</button>
              </div>
            </div>
          </div>

          {/* ── Grid List (Data Table) ── */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
             <div style={{ padding: "16px 20px", borderBottom: "2px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
               <div style={{ fontSize: 15, fontWeight: "bold", color: "#111" }}>총 <span style={{ color: BRAND }}>{filtered.length.toLocaleString()}</span>건의 공실 매물</div>
               <select style={{ border: "1px solid #cbd5e1", padding: "6px 12px", fontSize: 13, borderRadius: 4, outline: "none" }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                 <option value="latest">최신 등록순</option>
                 <option value="price_asc">가격 낮은순</option>
                 <option value="price_desc">가격 높은순</option>
               </select>
             </div>
             
             {/* Table Header */}
             <div style={{ 
               display: "grid", 
               gridTemplateColumns: "40px 60px 80px 1fr 100px 60px 80px 80px 60px 140px 100px", 
               gap: 12, padding: "14px 16px", background: "#fff", fontSize: 13, fontWeight: 700, color: "#555", textAlign: "center", borderBottom: "1px solid #cbd5e1" 
             }}>
               <div>선택</div>
               <div>사진</div>
               <div>거래/종류</div>
               <div style={{ textAlign: "left", paddingLeft: 10 }}>소재지 / 건물명</div>
               <div>면적(전용)</div>
               <div>해당층</div>
               <div>중개보수</div>
               <div>등록일</div>
               <div>구분</div>
               <div style={{ textAlign: "right", paddingRight: 10 }}>금액(보증/월세)</div>
               <div>등록자</div>
             </div>

             {/* Table Body (Listings) */}
             <div style={{ display: "flex", flexDirection: "column" }}>
               {loading ? (
                 <div style={{ padding: "80px 0", textAlign: "center", color: "#888" }}>데이터를 불러오고 있습니다...</div>
               ) : paged.length === 0 ? (
                 <div style={{ padding: "80px 0", textAlign: "center", color: "#aaa" }}>검색된 매물이 없습니다.</div>
               ) : (
                 paged.map((v, idx) => {
                   const isMasked = v.exposure_type === '부동산노출' && userLevel < 2;
                   const showCommission = userLevel >= 2;
                   const addrText = v.building_name || \`\${v.sigungu || ""} \${v.dong || ""} 공실광고\`;
                   
                   const m = v.members;
                   let registrant = v.client_name || "-";
                   if (m) {
                     if (m.role === 'REALTOR' && m.agencies && m.agencies.length > 0) registrant = m.agencies[0].agency_name || m.name || v.client_name || "-";
                     else registrant = m.name || v.client_name || "-";
                   }

                   return (
                     <div key={v.id} onClick={() => { if (isMasked) setIsAuthModalOpen(true); else router.push(\`/homepage/\${v.id}\`); }} style={{ 
                       display: "grid", gridTemplateColumns: "40px 60px 80px 1fr 100px 60px 80px 80px 60px 140px 100px", 
                       gap: 12, padding: "12px 16px", fontSize: 13, color: "#333", textAlign: "center", alignItems: "center", 
                       borderBottom: "1px solid #f1f5f9", cursor: "pointer", transition: "background 0.1s" 
                     }} onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                       
                       <div onClick={e => e.stopPropagation()}><input type="checkbox" style={{ zoom: 1.2, cursor: "pointer" }} /></div>
                       
                       <div style={{ height: 44, background: "#f1f5f9", borderRadius: 4, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                         {v.photos?.length > 0 ? <img src={v.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 10, color: "#bbb", lineHeight: "44px" }}>No Photo</span>}
                       </div>
                       
                       <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                         <span style={{ fontWeight: 700, color: BRAND }}>{v.trade_type || "-"}</span>
                         <span style={{ fontSize: 11, color: "#777" }}>{v.property_type || "-"}</span>
                       </div>
                       
                       <div style={{ textAlign: "left", paddingLeft: 10, overflow: "hidden" }}>
                         <div style={{ fontWeight: 700, color: isMasked ? "#bbb" : "#111", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>
                           {isMasked ? addrText.replace(/[^\s]/g, "X") : addrText}
                         </div>
                         <div style={{ fontSize: 11, color: "#777", marginTop: 2, textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>
                           {isMasked ? "상세 주소 비공개" : \`\${v.sido} \${v.sigungu} \${v.dong}\`.trim()}
                         </div>
                       </div>
                       
                       <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                         <span>{v.area_m2 ? Math.round(v.area_m2 / 3.3) : 0}평</span>
                         <span style={{ fontSize: 11, color: "#888" }}>{v.area_m2 || 0}m²</span>
                       </div>
                       
                       <div>{v.floor || "-"}층</div>
                       
                       <div>
                         {showCommission && (v.realtor_commission || v.commission_type) ? (
                           <span style={{ display: "inline-block", background: "#fa5252", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 3 }}>
                             {v.realtor_commission || v.commission_type}
                           </span>
                         ) : "-"}
                       </div>
                       
                       <div style={{ color: "#777", fontSize: 12 }}>
                         {new Date(v.created_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace('.', '/').replace('.', '')}
                       </div>
                       
                       <div>
                         <span style={{ fontSize: 11, color: "#fa5252", border: "1px solid #fa5252", padding: "1px 5px", fontWeight: "bold", borderRadius: 3 }}>
                           {v.owner_role === 'REALTOR' || v.members?.role === 'REALTOR' ? '부동산' : '일반'}
                         </span>
                       </div>
                       
                       <div style={{ textAlign: "right", paddingRight: 10, fontWeight: 800, color: "#111" }}>
                         {getPriceText(v).replace('만', '').replace('억', '')}
                       </div>
                       
                       <div style={{ fontSize: 11, color: "#555", display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
                         <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{registrant}</div>
                         <button onClick={(e) => { e.stopPropagation(); }} style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "2px 6px", borderRadius: 3, cursor: "pointer" }}>전화</button>
                       </div>
                     </div>
                   );
                 })
               )}
             </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "24px 0" }}>
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} style={{ ...pageBtn(false), opacity: currentPage === 1 ? 0.4 : 1 }}>«</button>
              <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} style={{ ...pageBtn(false), opacity: currentPage === 1 ? 0.4 : 1 }}>‹</button>
              {Array.from({ length: Math.min(10, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(currentPage - 5, totalPages - 9));
                const p = start + i;
                if (p > totalPages) return null;
                return <button key={p} onClick={() => setCurrentPage(p)} style={pageBtn(p === currentPage)}>{p}</button>;
              })}
              <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} style={{ ...pageBtn(false), opacity: currentPage === totalPages ? 0.4 : 1 }}>›</button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} style={{ ...pageBtn(false), opacity: currentPage === totalPages ? 0.4 : 1 }}>»</button>
            </div>
          )}

        </div>
      </div>
      {isAuthModalOpen && <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />}
    </div>
  );
}
`;

  fs.writeFileSync(path, code);
  console.log('Fixed successfully');
} else {
  console.log('Could not find original return at 498');
}
