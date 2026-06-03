import sys

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add 0. 커버 & 엔딩 to Tabs array
    old_text1 = '''      <div className="grid grid-cols-3 gap-2.5 bg-gray-100/80 p-3 rounded-xl mb-6 shrink-0 shadow-inner">
          {[
              { id: 'all' as const, label: '전체' },
              { id: 1, label: '1. 개요' },
              { id: 2, label: '2. 매물설명 & 시세' },
              { id: 3, label: '3. 임대현황' },
              { id: 4, label: '4. 사진' },
              { id: 5, label: '5. 입지' },
              { id: 6, label: '6. 로드맵' },
          ].map(tab => {
              const visiblePages = info.visiblePages || [1, 2, 3, 4, 5, 6];
              
              let isVisible = false;
              let isAllSelected = false;
              if (tab.id === 'all') {
                  isAllSelected = visiblePages.length === 6;
                  isVisible = isAllSelected;
              } else {
                  isVisible = visiblePages.includes(tab.id as number);
              }'''
              
    new_text1 = '''      <div className="grid grid-cols-3 gap-2.5 bg-gray-100/80 p-3 rounded-xl mb-6 shrink-0 shadow-inner">
          {[
              { id: 'all' as const, label: '전체' },
              { id: 0, label: '0. 커버 & 엔딩' },
              { id: 1, label: '1. 개요' },
              { id: 2, label: '2. 매물설명 & 시세' },
              { id: 3, label: '3. 임대현황' },
              { id: 4, label: '4. 사진' },
              { id: 5, label: '5. 입지' },
              { id: 6, label: '6. 로드맵' },
          ].map(tab => {
              let visiblePages = [...(info.visiblePages || [0, 1, 2, 3, 4, 5, 6, 7])];
              if (!visiblePages.includes(0)) visiblePages.push(0);
              if (!visiblePages.includes(7)) visiblePages.push(7);
              
              let isVisible = false;
              let isAllSelected = false;
              if (tab.id === 'all') {
                  isAllSelected = visiblePages.length >= 6;
                  isVisible = isAllSelected;
              } else {
                  isVisible = visiblePages.includes(tab.id as number) || (tab.id === 0 && (visiblePages.includes(0) || visiblePages.includes(7)));
              }'''
              
    content = content.replace(old_text1.replace('\r\n', '\n'), new_text1)
    content = content.replace(old_text1, new_text1)

    # 2. Add Cover form fields
    old_text2 = '''      <div className="flex-1 overflow-y-auto pr-2 pb-10 space-y-6">
          
          {/* 1. 개요 */}
          {(activeTab === 1 || activeTab === 'all') && ('''
          
    new_text2 = '''      <div className="flex-1 overflow-y-auto pr-2 pb-10 space-y-6">
          
          {/* 0. 커버 & 엔딩 */}
          {(activeTab === 0 || activeTab === 'all') && (
              <div className={nimate-fadeIn relative }>
                  <div className="space-y-6">
                      <div className="pb-2 border-b-[3px] border-black mb-4">
                          <h2 className="text-xl font-black text-black tracking-tight">0. 커버 & 엔딩</h2>
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                          <h4 className="font-bold text-blue-800 mb-2">프리셋(Pre-fill) 템플릿 선택</h4>
                          <select
                              value={info.propertyType || 'commercial_sales'}
                              onChange={(e) => {
                                  const type = e.target.value as any;
                                  setInfo({ ...info, propertyType: type });
                              }}
                              className="w-full border-blue-200 rounded p-2 text-sm text-blue-900 bg-white focus:ring-blue-500"
                          >
                              <option value="commercial_sales">상업용 매매 (건물/빌딩)</option>
                              <option value="commercial_rent">상업용 임대 (상가/사무실)</option>
                              <option value="residential">주거용 (매매/전월세)</option>
                          </select>
                      </div>

                      <div>
                          <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">커버 (표지) 설정</h4>
                          <div className="space-y-3">
                              <div>
                                  <label className="text-xs text-gray-500">커버 메인 타이틀</label>
                                  <input type="text" name="coverTitle" value={info.coverTitle || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm" placeholder="INVESTMENT MEMORANDUM" />
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500">커버 서브 타이틀</label>
                                  <input type="text" name="coverSubtitle" value={info.coverSubtitle || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm" placeholder="부동산 투자 분석 보고서" />
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500">매물 상세 보기 QR 링크 (VR/홈페이지)</label>
                                  <input type="text" name="coverQRLink" value={info.coverQRLink || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm" placeholder="https://" />
                              </div>
                          </div>
                      </div>

                      <div>
                          <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">엔딩 (마지막장) 설정</h4>
                          <div className="grid grid-cols-2 gap-4">
                              {renderImageUpload('agentPhoto', '담당자 프로필 / 증명 사진')}
                              {renderImageUpload('agencyLogo', '중개법인 로고 (하단)')}
                          </div>
                          <div className="space-y-3 mt-3">
                              <div>
                                  <label className="text-xs text-gray-500">유튜브 링크</label>
                                  <input type="text" name="contactYoutube" value={info.contactYoutube || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm" />
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500">블로그 링크</label>
                                  <input type="text" name="contactBlog" value={info.contactBlog || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm" />
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500">홈페이지 링크</label>
                                  <input type="text" name="contactWebsite" value={info.contactWebsite || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm" />
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500">모바일 명함 / 오픈채팅 QR 링크</label>
                                  <input type="text" name="contactQRLink" value={info.contactQRLink || ""} onChange={handleChange} className="w-full border rounded p-2 text-sm" placeholder="https://" />
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* 1. 개요 */}
          {(activeTab === 1 || activeTab === 'all') && ('''
    
    content = content.replace(old_text2.replace('\r\n', '\n'), new_text2)
    content = content.replace(old_text2, new_text2)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Done")

replace_in_file('marketing/report/components/FlyerForm.tsx')
