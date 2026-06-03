import sys

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add toggle to Tab 3
    old_text1 = '''          {/* 3. 임대현황 */}
          {(activeTab === 3 || activeTab === 'all') && (
              <div className={nimate-fadeIn relative }>
                  <div className="space-y-6">
                      <div className="pb-2 border-b-[3px] border-black mb-4 flex justify-between items-end">
                          <h2 className="text-xl font-black text-black tracking-tight">3. 임대현황</h2>
                      </div>'''
    
    new_text1 = '''          {/* 3. 임대현황 */}
          {(activeTab === 3 || activeTab === 'all') && (
              <div className={nimate-fadeIn relative }>
                  <div className="space-y-6">
                      <div className="pb-2 border-b-[3px] border-black mb-4 flex justify-between items-center">
                          <h2 className="text-xl font-black text-black tracking-tight">3. 임대현황</h2>
                          <label className="flex items-center cursor-pointer bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
                              <div className="relative">
                                  <input type="checkbox" className="sr-only" checked={!info.hideRentRoll} onChange={(e) => setInfo({ ...info, hideRentRoll: !e.target.checked })} />
                                  <div className={lock w-10 h-6 rounded-full transition-colors }></div>
                                  <div className={dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform }></div>
                              </div>
                              <div className="ml-3 text-xs font-bold text-gray-700">
                                  {!info.hideRentRoll ? '페이지 포함' : '페이지 제외됨'}
                              </div>
                          </label>
                      </div>'''

    content = content.replace(old_text1.replace('\r\n', '\n'), new_text1)
    content = content.replace(old_text1, new_text1)

    # Add toggle to Tab 6
    old_text2 = '''          {/* 6. 로드맵 */}
          {(activeTab === 6 || activeTab === 'all') && (
              <div className={nimate-fadeIn relative }>
                  <div className="space-y-6">
                      <div className="pb-2 border-b-[3px] border-black mb-4 flex justify-between items-end">
                          <h2 className="text-xl font-black text-black tracking-tight">6. 로드맵 / 가치 제안</h2>
                      </div>'''
                      
    new_text2 = '''          {/* 6. 로드맵 */}
          {(activeTab === 6 || activeTab === 'all') && (
              <div className={nimate-fadeIn relative }>
                  <div className="space-y-6">
                      <div className="pb-2 border-b-[3px] border-black mb-4 flex justify-between items-center">
                          <h2 className="text-xl font-black text-black tracking-tight">6. 로드맵 / 가치 제안</h2>
                          <label className="flex items-center cursor-pointer bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
                              <div className="relative">
                                  <input type="checkbox" className="sr-only" checked={!info.hideRoadmap} onChange={(e) => setInfo({ ...info, hideRoadmap: !e.target.checked })} />
                                  <div className={lock w-10 h-6 rounded-full transition-colors }></div>
                                  <div className={dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform }></div>
                              </div>
                              <div className="ml-3 text-xs font-bold text-gray-700">
                                  {!info.hideRoadmap ? '페이지 포함' : '페이지 제외됨'}
                              </div>
                          </label>
                      </div>'''

    content = content.replace(old_text2.replace('\r\n', '\n'), new_text2)
    content = content.replace(old_text2, new_text2)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Done")

replace_in_file('marketing/report/components/FlyerForm.tsx')
