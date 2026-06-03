import sys

def run():
    filepath = 'marketing/report/components/FlyerCanvas.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    page0 = """
        {/* PAGE 0: COVER */}
        {getPageStatus(0).shouldRender && (
        <ReportPage layoutTheme={layoutTheme} colorTheme={colorTheme}
            pageNumber={0} 
            pageString={getPageStatus(0).pageString}
            isHidden={getPageStatus(0).isHidden}
            title={info.coverTitle || "INVESTMENT MEMORANDUM"} 
            subtitle={info.coverSubtitle || "부동산 투자 분석 보고서"}
            badgeText="BROCHURE"
        >
            <div className="flex flex-col items-center justify-center h-full w-full relative -mt-10">
                <div className="absolute inset-0 opacity-10 flex items-center justify-center overflow-hidden">
                    <svg className="w-[120%] h-[120%] text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <polygon points="0,100 100,0 100,100" />
                    </svg>
                </div>
                
                <div className="z-10 w-full flex flex-col items-center mb-16">
                    <div className="w-24 h-2 bg-[var(--theme-primary)] mb-8"></div>
                    <h1 className="text-[64px] font-black text-gray-900 tracking-tighter leading-none mb-4 text-center px-4">
                        {info.address || "서울 강남구 논현동"}
                    </h1>
                    <h2 className="text-3xl font-bold text-[var(--theme-primary)] tracking-widest text-center px-4">
                        {info.targetName || "논현동 신축 수익형 빌딩"}
                    </h2>
                </div>

                <div className="z-10 mt-12 flex flex-col items-center">
                    {info.coverQRLink ? (
                        <div className="flex flex-col items-center bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
                            <div className="w-32 h-32 mb-4 bg-gray-50 flex items-center justify-center rounded-lg border border-dashed border-gray-300 relative overflow-hidden">
                                <svg className="w-full h-full text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 10h4a1 1 0 001-1V5a1 1 0 00-1-1H3a1 1 0 00-1 1v4a1 1 0 001 1zm0 11h4a1 1 0 001-1v-4a1 1 0 00-1-1H3a1 1 0 00-1 1v4a1 1 0 001 1zm11-11h4a1 1 0 001-1V5a1 1 0 00-1-1h-4a1 1 0 00-1 1v4a1 1 0 001 1zm0 11h4a1 1 0 001-1v-4a1 1 0 00-1-1h-4a1 1 0 00-1 1v4a1 1 0 001 1z" />
                                </svg>
                            </div>
                            <span className="text-[10px] font-black tracking-widest text-gray-400">SCAN FOR MORE</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl w-44 h-52 text-gray-400">
                            <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="text-[10px] font-black tracking-widest text-[var(--theme-primary)]">SCAN FOR MORE</span>
                        </div>
                    )}
                </div>
            </div>
        </ReportPage>
        )}
"""

    page7 = """
        {/* PAGE 7: CONTACT / ENDING */}
        {getPageStatus(7).shouldRender && (
        <ReportPage layoutTheme={layoutTheme} colorTheme={colorTheme}
            pageNumber={7} 
            pageString={getPageStatus(7).pageString}
            isHidden={getPageStatus(7).isHidden}
            title={info.agentName || "미래에셋공인중개사무소"} 
            subtitle="Contact Us"
            badgeText="CONTACT"
        >
            <div className="flex flex-col items-center justify-center h-full w-full relative -mt-10">
                <div className="absolute top-10 left-10 opacity-10">
                    <svg className="w-64 h-64 text-[var(--theme-primary)]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </div>

                <div className="z-10 w-full flex flex-col items-center mb-10">
                    <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-2">THANK YOU</h1>
                    <div className="w-16 h-1 bg-[var(--theme-primary)] mb-6"></div>
                    <p className="text-gray-500 font-bold text-lg tracking-widest text-center">
                        성공적인 투자를 위한 최고의 파트너가 되겠습니다
                    </p>
                </div>

                <div className="z-10 w-full max-w-4xl grid grid-cols-5 gap-8 mt-4 bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
                    <div className="col-span-2 flex flex-col items-center justify-center border-r border-gray-100 pr-8">
                        <div className="w-48 h-48 rounded-full overflow-hidden mb-6 shadow-inner border-4 border-gray-50 bg-gray-100 relative">
                            {info.agentPhotoKey ? (
                                <img src={info.agentPhotoKey} alt="Agent" className="w-full h-full object-cover" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                    <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <h3 className="text-2xl font-black text-gray-900">{info.agentRepresentative || "김민혁 과장"}</h3>
                        <p className="text-[var(--theme-primary)] font-bold mb-4">{info.agentName || "미래에셋공인 중개사무소"}</p>
                    </div>
                    
                    <div className="col-span-3 flex flex-col justify-center pl-4">
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold mb-0.5">MOBILE</p>
                                    <p className="text-lg font-bold text-gray-800">{info.agentMobile || "010-5554-4444"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold mb-0.5">OFFICE</p>
                                    <p className="text-lg font-bold text-gray-800">{info.agentPhone || "02-1234-5678"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 mt-6 p-4 bg-gray-50 rounded-xl">
                                <div className="w-16 h-16 bg-white rounded-lg p-1 border border-gray-200 shrink-0 flex items-center justify-center relative shadow-sm">
                                    {info.contactQRLink ? (
                                        <div className="w-full h-full relative border border-dashed border-gray-300 rounded overflow-hidden">
                                            <svg className="w-full h-full text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 10h4a1 1 0 001-1V5a1 1 0 00-1-1H3a1 1 0 00-1 1v4a1 1 0 001 1zm0 11h4a1 1 0 001-1v-4a1 1 0 00-1-1H3a1 1 0 00-1 1v4a1 1 0 001 1zm11-11h4a1 1 0 001-1V5a1 1 0 00-1-1h-4a1 1 0 00-1 1v4a1 1 0 001 1zm0 11h4a1 1 0 001-1v-4a1 1 0 00-1-1h-4a1 1 0 00-1 1v4a1 1 0 001 1z" />
                                            </svg>
                                        </div>
                                    ) : (
                                        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                        </svg>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="text-[11px] text-gray-500 font-bold mb-1">MORE INFORMATION</p>
                                    <div className="flex gap-2">
                                        {info.contactYoutube && <span className="bg-red-50 text-red-600 text-[10px] px-2 py-0.5 rounded font-black border border-red-100">YOUTUBE</span>}
                                        {info.contactBlog && <span className="bg-green-50 text-green-600 text-[10px] px-2 py-0.5 rounded font-black border border-green-100">BLOG</span>}
                                        {info.contactWebsite && <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded font-black border border-blue-100">WEBSITE</span>}
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1.5 break-all leading-tight">{info.contactQRLink || "https://gongsilnews.com"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="absolute bottom-12 right-0 left-0 flex justify-center z-10 opacity-70">
                    <div className="h-12 w-48 relative grayscale">
                        {info.agencyLogoKey ? (
                            <img src={info.agencyLogoKey} alt="Agency Logo" className="w-full h-full object-contain" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold text-xl tracking-widest border border-dashed border-gray-200 rounded">LOGO</div>
                        )}
                    </div>
                </div>
            </div>
        </ReportPage>
        )}
"""

    replace1 = "{/* PAGE 1: OVERVIEW */}"
    if replace1 in content:
        content = content.replace(replace1, page0 + "\n        " + replace1)
    else:
        print("Could not find PAGE 1 placeholder.")
        
    replace2 = "        )}\n    </div>\n  );\n});"
    if replace2 in content:
        content = content.replace(replace2, "        )}\n" + page7 + "\n    </div>\n  );\n});")
    else:
        # Try different line ending
        replace3 = "        )}\r\n    </div>\r\n  );\r\n});"
        if replace3 in content:
            content = content.replace(replace3, "        )}\r\n" + page7 + "\r\n    </div>\r\n  );\r\n});")
        else:
            # Fallback string replace
            parts = content.rsplit("        )}\n    </div>", 1)
            if len(parts) > 1:
                content = parts[0] + "        )}\n" + page7 + "\n    </div>" + parts[1]
            else:
                parts = content.rsplit("        )}\r\n    </div>", 1)
                if len(parts) > 1:
                    content = parts[0] + "        )}\r\n" + page7 + "\r\n    </div>" + parts[1]
                else:
                    print("Could not find ending placeholder.")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Python script executed successfully.")

run()
