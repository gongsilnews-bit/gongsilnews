import React from "react";
import { Metadata } from "next";
import { getVacancyDetail } from "@/app/actions/vacancy";

interface FlyerPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: FlyerPageProps): Promise<Metadata> {
  const { id } = await params;
  const res = await getVacancyDetail(id);
  
  if (!res.success || !res.flyer) {
    return {
      title: "매물 전단지 - 공실뉴스",
      description: "존재하지 않거나 삭제된 매물 전단지입니다.",
    };
  }

  const state = res.flyer.flyer_state;
  const title = `${state.info.address || "매물"} - ${state.info.promotionText || "부동산 상세 정보"}`;
  const description = state.info.subTitle || "공실뉴스에서 제공하는 검증된 매물 정보입니다.";

  return {
    title: `${title} | 공실뉴스`,
    description,
    openGraph: {
      title,
      description,
      images: state.mainImage ? [{ url: state.mainImage }] : [],
    },
  };
}

export default async function FlyerDetailPage({ params }: FlyerPageProps) {
  const { id } = await params;
  const res = await getVacancyDetail(id);

  if (!res.success || !res.flyer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full border border-gray-100">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">전단지를 찾을 수 없습니다</h1>
          <p className="text-gray-500 text-sm mb-6">
            존재하지 않거나 비공개 처리된 매물 전단지입니다. 주소를 다시 확인해 주세요.
          </p>
          <a
            href="/"
            className="inline-flex justify-center items-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors w-full shadow-sm"
          >
            공실뉴스 홈으로 가기
          </a>
        </div>
      </div>
    );
  }

  const state = res.flyer.flyer_state;
  const { info, mainImage, colorTheme, layoutTheme } = state;
  const primaryColor = colorTheme?.primary || "#00788c";
  const secondaryColor = colorTheme?.secondary || "#00c6d7";
  const darkColor = colorTheme?.dark || "#003845";
  const layout = layoutTheme?.type || "type1";

  const placeholder = "https://placehold.co/860x600/e2e8f0/1e293b?text=Property";
  const mainImgSrc = mainImage || placeholder;

  const formatPrice = (value: string) => {
    if (!value) return "";
    const num = parseInt(value.replace(/[^0-9]/g, ""), 10);
    if (isNaN(num)) return value;
    if (value.includes("억")) return value;
    if (num >= 10000) {
      const eok = Math.floor(num / 10000);
      const man = num % 10000;
      return `${eok}억${man > 0 ? ` ${man.toLocaleString()}` : ""}`;
    }
    return value;
  };

  const getPriceLabel = (type: string) => {
    if (type === "매매") return "매매가";
    if (type === "전세") return "전세금";
    if (type === "월세" || type === "단기임대") return "보증금 / 월세";
    return "가격";
  };

  const isRent = info.transactionType === "월세" || info.transactionType === "단기임대";

  // Formatted Stats
  const statsItems = [
    { label: "Price", value: `${formatPrice(info.priceMain)}${isRent && info.priceSub ? ` / ${info.priceSub}` : ""}`, sub: getPriceLabel(info.transactionType) },
    { label: "Area", value: info.area ? info.area.split("/")[0] : "-", sub: "전용면적" },
    { label: "Rooms", value: info.roomCount || "-", sub: "방 / 욕실" },
    { label: "Move-in", value: info.moveInDate ? info.moveInDate.split(" ")[0] : "-", sub: "입주가능일" }
  ];

  // Helper for rendering section header
  const renderSectionHeader = (title: string, intro?: string, description?: string) => {
    if (layout === "type2") {
      return (
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="text-sm font-medium mb-1 tracking-wide" style={{ color: secondaryColor }}>{intro}</div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">{title}</h2>
          <div className="w-10 h-0.5" style={{ backgroundColor: primaryColor }}></div>
          {description && <p className="mt-4 text-gray-500 max-w-xl text-sm md:text-base">{description}</p>}
        </div>
      );
    }
    if (layout === "type3") {
      return (
        <div className="mb-8 border-b pb-4 border-gray-200">
          <span className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-1 block">{intro}</span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800" style={{ color: primaryColor }}>{title}</h2>
          {description && <p className="mt-2 text-gray-600 text-sm md:text-base">{description}</p>}
        </div>
      );
    }
    if (layout === "type4") {
      return (
        <div className="mb-10 flex items-center gap-4">
          <div className="w-3.5 h-10" style={{ backgroundColor: primaryColor }}></div>
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 uppercase">{title}</h2>
            <span className="text-xs font-bold text-gray-400 tracking-widest">{intro}</span>
          </div>
        </div>
      );
    }
    if (layout === "type5") {
      return (
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-light text-gray-900 mb-2">{title}</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">{intro}</p>
          {description && <p className="mt-4 text-base font-light text-gray-600">{description}</p>}
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center mb-10 text-center">
        <div className="text-sm font-medium mb-1 tracking-wide" style={{ color: primaryColor }}>{intro}</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{title}</h2>
        <div className="w-10 h-px" style={{ backgroundColor: primaryColor }}></div>
        {description && <p className="mt-4 text-gray-500 max-w-xl text-sm md:text-base">{description}</p>}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 py-0 md:py-8 pb-24 md:pb-32 font-sans antialiased">
      {/* Container to enforce exact Max-Width responsive mockup */}
      <div className="bg-white shadow-lg md:shadow-2xl flex flex-col w-full max-w-[860px] mx-auto min-h-screen overflow-hidden">
        
        {/* 1. HERO SECTION */}
        <div>
          {layout === "type1" && (
            <div className="relative h-[420px] md:h-[580px] flex flex-col justify-center">
              <div className="absolute inset-0 z-0">
                <img src={mainImgSrc} className="w-full h-full object-cover" alt="Main cover" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to right, ${darkColor}E6, transparent)` }}></div>
              </div>
              <div className="relative z-10 p-8 md:p-16 flex flex-col text-white items-start text-left max-w-2xl">
                <div className="w-12 h-1 mb-6" style={{ backgroundColor: secondaryColor }}></div>
                <div className="inline-block px-3 py-1 border border-white/30 text-xs font-medium mb-4 rounded-sm tracking-wider uppercase">
                  {info.transactionType || "거래 유형"}
                </div>
                <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-2 tracking-tight drop-shadow-sm">{info.address}</h1>
                <p className="text-xl md:text-3xl font-bold mb-4 drop-shadow-md">{info.promotionText}</p>
                <p className="text-sm md:text-lg font-medium opacity-90" style={{ color: secondaryColor }}>{info.subTitle}</p>
              </div>
            </div>
          )}

          {layout === "type2" && (
            <div className="relative h-[420px] md:h-[580px] flex flex-col justify-center">
              <div className="absolute inset-0 z-0">
                <img src={mainImgSrc} className="w-full h-full object-cover" alt="Main cover" />
                <div className="absolute inset-0 bg-black/40"></div>
              </div>
              <div className="relative z-10 p-6 md:p-12 h-full flex items-center justify-center">
                <div className="border border-white/40 p-6 md:p-12 w-full h-full flex flex-col items-center justify-center text-center text-white">
                  <span className="mb-4 text-lg font-serif italic" style={{ color: secondaryColor }}>Prestige Collection</span>
                  <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight">{info.address}</h1>
                  <div className="w-16 h-px bg-white/50 my-6"></div>
                  <p className="text-xl md:text-3xl font-bold mb-4 drop-shadow-md">{info.promotionText}</p>
                  <p className="text-xs md:text-sm font-light tracking-widest uppercase">{info.subTitle}</p>
                </div>
              </div>
            </div>
          )}

          {layout === "type3" && (
            <div className="relative h-[420px] md:h-[580px] flex flex-col bg-white">
              <div className="h-[70%] md:h-[80%] w-full absolute bottom-0 right-0 z-0">
                <img src={mainImgSrc} className="w-full h-full object-cover" alt="Main cover" />
              </div>
              <div className="relative z-10 p-6 md:p-12 bg-white/95 w-[90%] md:w-2/3 shadow-md rounded-br-3xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-8" style={{ backgroundColor: primaryColor }}></div>
                  <span className="text-lg md:text-2xl font-bold text-gray-800 tracking-wider">PREMIUM</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-2">{info.address}</h1>
                <p className="text-lg md:text-2xl text-gray-600 font-medium mb-1">{info.promotionText}</p>
                <p className="text-xs md:text-sm text-gray-400">{info.subTitle}</p>
              </div>
            </div>
          )}

          {layout === "type4" && (
            <div className="relative h-[420px] md:h-[580px] flex flex-col">
              <div className="absolute inset-0 z-0">
                <img src={mainImgSrc} className="w-full h-full object-cover" alt="Main cover" />
              </div>
              <div className="absolute bottom-6 right-6 md:bottom-12 md:right-12 z-10 bg-white/95 p-6 md:p-10 max-w-[90%] md:max-w-xl shadow-2xl border-l-8" style={{ borderColor: primaryColor }}>
                <div className="text-xs font-bold tracking-widest mb-1 text-gray-500 uppercase">{info.transactionType}</div>
                <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-2 leading-tight">{info.address}</h1>
                <p className="text-lg md:text-2xl font-bold mb-4" style={{ color: primaryColor }}>{info.promotionText}</p>
                <p className="text-gray-600 text-xs md:text-sm leading-relaxed border-t pt-4 border-gray-200">{info.subTitle}</p>
              </div>
            </div>
          )}

          {layout === "type5" && (
            <div className="relative h-[420px] md:h-[580px] flex flex-col justify-end">
              <div className="absolute inset-0 z-0">
                <img src={mainImgSrc} className="w-full h-full object-cover grayscale-[30%] contrast-125" alt="Main cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
              </div>
              <div className="relative z-10 p-8 md:p-12 flex flex-col justify-end h-full">
                <p className="text-white/80 text-xs md:text-sm tracking-[0.5em] mb-3 uppercase font-light">Residence</p>
                <h1 className="text-4xl md:text-7xl font-black text-white mb-2 tracking-tighter">{info.address}</h1>
                <p className="text-xl md:text-3xl font-light text-white tracking-tight">{info.promotionText}</p>
              </div>
            </div>
          )}
        </div>

        {/* 2. STATS BAR */}
        <div>
          {layout === "type1" && (
            <div className="relative z-20 -mt-10 mx-4 md:mx-12 bg-white shadow-xl flex flex-wrap md:flex-nowrap rounded-sm overflow-hidden border border-gray-100">
              {statsItems.map((item, i) => (
                <div key={i} className="w-1/2 md:flex-1 py-4 md:py-6 px-4 border-r border-b md:border-b-0 border-gray-100 flex flex-col items-center justify-center text-center hover:bg-gray-50/50">
                  <span className="text-[9px] text-gray-400 font-bold tracking-wider mb-1 uppercase">{item.label}</span>
                  <span className="text-base md:text-lg font-bold whitespace-nowrap" style={{ color: primaryColor }}>{item.value}</span>
                  <span className="text-[9px] text-gray-400 mt-1">{item.sub}</span>
                </div>
              ))}
            </div>
          )}

          {layout === "type2" && (
            <div className="bg-white py-8 border-b border-gray-100">
              <div className="flex flex-col md:flex-row justify-center md:divide-x divide-gray-200 gap-6 md:gap-0">
                {statsItems.map((item, i) => (
                  <div key={i} className="px-10 text-center">
                    <span className="block text-xl font-bold text-gray-800 mb-0.5">{item.value}</span>
                    <span className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {layout === "type3" && (
            <div className="py-6 text-white flex flex-wrap md:flex-nowrap justify-around items-center gap-4" style={{ backgroundColor: primaryColor }}>
              {statsItems.map((item, i) => (
                <div key={i} className="text-center w-1/2 md:w-auto">
                  <span className="block text-[11px] opacity-70 mb-0.5">{item.sub}</span>
                  <span className="block text-lg md:text-xl font-bold">{item.value}</span>
                </div>
              ))}
            </div>
          )}

          {layout === "type4" && (
            <div className="bg-gray-50 p-4 md:p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statsItems.map((item, i) => (
                  <div key={i} className="bg-white p-4 md:p-6 border-t-4 shadow-sm" style={{ borderColor: primaryColor }}>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{item.label}</span>
                    <span className="block text-base md:text-lg font-extrabold text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {layout === "type5" && (
            <div className="bg-black text-white py-10 px-6 md:px-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-0">
              {statsItems.map((item, i) => (
                <div key={i} className="flex flex-col">
                  <span className="text-2xl md:text-3xl font-light tracking-tight mb-0.5" style={{ color: i === 0 ? secondaryColor : "white" }}>{item.value}</span>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. INFO TABLE SECTION */}
        <div className="py-16 px-6 md:px-12 bg-white">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
            <div>
              <span className="font-bold text-xs tracking-widest block mb-1" style={{ color: primaryColor }}>PROPERTY INFO</span>
              <h2 className="text-2xl font-bold text-gray-800">매물 상세 정보</h2>
            </div>
            <div className="text-left md:text-right">
              <span className="text-gray-400 text-xs block mb-1">월 관리비</span>
              <span className="text-xl font-bold text-gray-800">{info.managementFee || "없음"}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-sm">
            {[
              { l: "공급/전용면적", v: info.area || "-" },
              { l: "해당층/총층", v: info.floor || "-" },
              { l: "방향", v: info.direction || "-" },
              { l: "주차가능대수", v: info.parking || "-" },
              { l: "옵션 정보", v: (info.options && info.options.length > 0) ? info.options : "없음", full: true }
            ].map((item, i) => (
              <div key={i} className={`flex justify-between border-b border-gray-100 pb-3 ${item.full ? "col-span-1 md:col-span-2" : ""}`}>
                <span className="text-gray-400">{item.l}</span>
                <span className="font-semibold text-gray-800">{item.v}</span>
              </div>
            ))}

            {/* Notice Box */}
            {info.noticeContent && (
              <div className={`col-span-1 md:col-span-2 p-5 mt-4 ${layout === "type4" ? "border-2 border-gray-100 bg-white" : "bg-gray-50 rounded-lg"}`}>
                <span className="font-bold block mb-2 text-xs" style={{ color: primaryColor }}>
                  {info.noticeTitle || "추가 상세 설명"}
                </span>
                <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-wrap">
                  {info.noticeContent}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 4. DYNAMIC SECTIONS */}
        <div className="bg-white border-t border-gray-50">
          {info.sections && info.sections.map((section: any) => {
            const itemCount = section.items ? section.items.length : 0;
            let gridColsClass = "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
            if (itemCount === 1) gridColsClass = "grid-cols-1";
            else if (itemCount === 2) gridColsClass = "grid-cols-1 md:grid-cols-2";
            else if (itemCount === 3) gridColsClass = "grid-cols-1 md:grid-cols-3";

            if (section.type === "grid") {
              return (
                <div key={section.id} className={`py-16 px-6 md:px-12 ${layout === "type4" ? "bg-white" : "bg-gray-50"}`}>
                  {renderSectionHeader(section.title, section.intro)}
                  <div className={`grid ${gridColsClass} gap-6`}>
                    {section.items && section.items.map((item: any, idx: number) => {
                      const imgVal = state[item.imageKey];
                      const imgSrc = typeof imgVal === "string" ? imgVal : placeholder;
                      return (
                        <div key={item.id} className="relative h-60 rounded-xl overflow-hidden shadow-sm group hover:shadow-md transition-shadow">
                          <img src={imgSrc} className="w-full h-full object-cover" alt={item.text} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent"></div>
                          <div className="absolute bottom-0 left-0 w-full p-4 text-white">
                            <span className="text-[10px] font-bold tracking-wider mb-1 block" style={{ color: secondaryColor }}>0{idx + 1}</span>
                            <span className="font-bold text-base block">{item.text}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            if (section.type === "list") {
              return (
                <div key={section.id} className="py-16 bg-white border-t border-gray-50">
                  <div className="px-6 md:px-12">
                    {renderSectionHeader(section.title, section.intro, section.description)}
                  </div>
                  {section.items && section.items.map((item: any, idx: number) => {
                    const imgVal = state[item.imageKey];
                    const imgSrc = typeof imgVal === "string" ? imgVal : placeholder;
                    const isReversed = idx % 2 === 1;

                    return (
                      <div key={item.id} className={`flex flex-col ${isReversed ? "md:flex-row-reverse" : "md:flex-row"} items-stretch border-t border-gray-100 first:border-none`}>
                        <div className="w-full md:w-1/2 h-64 md:h-auto min-h-[280px] relative overflow-hidden">
                          <img src={imgSrc} className="w-full h-full object-cover" alt={item.title} />
                        </div>
                        <div className="w-full md:w-1/2 flex flex-col justify-center px-6 md:px-12 py-10 bg-gray-50/20">
                          <div className="w-6 h-px mb-4" style={{ backgroundColor: primaryColor }}></div>
                          <h4 className="text-lg md:text-xl font-bold text-gray-800 mb-3">{item.title}</h4>
                          <p className="text-gray-500 text-sm leading-relaxed whitespace-pre-wrap">{item.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }

            if (section.type === "table") {
              return (
                <div key={section.id} className="py-16 px-6 md:px-12 bg-white border-t border-gray-50">
                  {renderSectionHeader(section.title, section.intro)}
                  <div className="border-t border-gray-200 overflow-hidden rounded-lg border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2">
                      {section.items && section.items.map((item: any, idx: number) => (
                        <div key={item.id} className="flex border-b border-gray-100 last:border-none md:[&:nth-last-child(2)]:border-none md:border-r border-gray-100">
                          <div className="w-28 md:w-32 p-4 text-xs font-bold bg-gray-50 text-gray-500 flex items-center justify-center shrink-0 border-r border-gray-100 text-center">
                            {item.title}
                          </div>
                          <div className="flex-1 p-4 text-xs text-gray-700 flex items-center">
                            {(item.title === "주소" || item.title === "소재지" || item.title === "위치") && item.text ? (
                              <a
                                href={`https://map.naver.com/p/search/${encodeURIComponent(item.text)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline flex items-center gap-1 text-blue-600 font-medium"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                                  <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.155-1.155A15.75 15.75 0 0018 12a6 6 0 10-12 0c0 3.342 1.22 6.002 2.64 7.646a17.078 17.078 0 001.9 1.705zM12 13.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" clipRule="evenodd" />
                                </svg>
                                <span>{item.text}</span>
                              </a>
                            ) : (
                              item.text
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            if (section.type === "sns") {
              return (
                <div key={section.id} className={`py-12 px-6 md:px-12 ${layout === "type4" ? "bg-white" : "bg-gray-50"} border-t border-gray-100`}>
                  {renderSectionHeader(section.title, section.intro)}
                  <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-3">
                    {section.items && section.items.map((item: any) => {
                      const type = item.imageKey; // 'youtube', 'blog', 'news'
                      let badgeClass = "bg-gray-50 text-gray-500 border border-gray-200/50";
                      let label = "LINK";
                      if (type === "youtube") { badgeClass = "bg-red-50 text-red-500 border border-red-100"; label = "유튜브"; }
                      else if (type === "blog") { badgeClass = "bg-green-50 text-green-500 border border-green-100"; label = "블로그"; }
                      else if (type === "news") { badgeClass = "bg-blue-50 text-blue-500 border border-blue-100"; label = "뉴스"; }

                      return (
                        <div key={item.id} className="flex items-center justify-between gap-4 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                          <a
                            href={item.text}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-gray-700 hover:text-blue-600 hover:underline flex-1 truncate"
                          >
                            ↳ {item.title || item.text}
                          </a>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${badgeClass}`}>
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>

        {/* 5. FOOTER / AGENT INFO */}
        <div className={`py-16 px-6 md:px-12 text-white ${layout === "type5" ? "bg-black" : "bg-gray-900"}`}>
          <div className="max-w-2xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-8 md:p-10 flex flex-col items-center text-center">
            <span className="text-[10px] font-bold tracking-widest mb-4 uppercase opacity-50">CONTACT AGENT</span>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xl md:text-2xl font-bold">{info.agentName}</p>
              {info.agentMapUrl && (
                <a
                  href={info.agentMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  title="중개업소 위치 지도 보기"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-white">
                    <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.155-1.155A15.75 15.75 0 0018 12a6 6 0 10-12 0c0 3.342 1.22 6.002 2.64 7.646a17.078 17.078 0 001.9 1.705zM12 13.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" clipRule="evenodd" />
                  </svg>
                </a>
              )}
            </div>
            {info.agentRepresentative && (
              <p className="text-xs opacity-60 mb-4">{info.agentRepresentative}</p>
            )}
            <div className="w-8 h-px bg-white/20 mb-6"></div>

            <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
              <a
                href={`tel:${info.agentPhone}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-gray-900 font-bold hover:bg-gray-50 transition-colors shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l.548 2.196c.19.758-.014 1.56-.537 2.127l-.83.902a14.975 14.975 0 006.275 6.275l.902-.83c.568-.523 1.37-.727 2.127-.537l2.196.548c.843.209 1.42.96 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
                </svg>
                <span>유선 전화 ({info.agentPhone})</span>
              </a>
              {info.agentMobile && (
                <a
                  href={`tel:${info.agentMobile}`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 border border-white/15 text-white font-bold hover:bg-white/15 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l.548 2.196c.19.758-.014 1.56-.537 2.127l-.83.902a14.975 14.975 0 006.275 6.275l.902-.83c.568-.523 1.37-.727 2.127-.537l2.196.548c.843.209 1.42.96 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
                  </svg>
                  <span>휴대폰 ({info.agentMobile})</span>
                </a>
              )}
            </div>

            {info.agentAdditionalInfo && info.agentAdditionalInfo.map((line: string, idx: number) => (
              <p key={idx} className="text-xs opacity-50 mb-1">{line}</p>
            ))}

            {info.consultationUrl && (
              <a
                href={info.consultationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 mt-8 text-white text-sm font-bold tracking-wider hover:opacity-90 transition-colors block text-center rounded-xl shadow-md"
                style={{ backgroundColor: primaryColor }}
              >
                간편 모바일 상담 신청하기
              </a>
            )}
          </div>
        </div>

      </div>

      {/* Floating Bottom Bar for Mobile Device Action */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-100 py-3.5 px-4 shadow-[0_-8px_30px_rgb(0,0,0,0.06)] flex items-center justify-between gap-3 max-w-[860px] mx-auto">
        <div className="flex-1">
          <div className="text-[10px] font-bold text-gray-400">공실뉴스 추천 매물</div>
          <div className="text-sm font-bold text-gray-800 truncate max-w-[200px] sm:max-w-xs">{info.address}</div>
        </div>
        <div className="flex items-center gap-2">
          {/* Copy Link Button */}
          <button
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href);
                alert("공유 링크가 클립보드에 복사되었습니다! 카카오톡이나 문자에 붙여넣어 공유하세요.");
              }
            }}
            className="p-3 text-gray-600 bg-gray-50 border border-gray-200/60 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center"
            title="공유 링크 복사"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M15.75 2.25a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V3.75h-1.5a.75.75 0 010-1.5h2.25zM18 8.25a.75.75 0 01-.75.75h-1.5v1.5a.75.75 0 01-1.5 0v-2.25A.75.75 0 0115 7.5h2.25a.75.75 0 01.75.75zM12.75 12a.75.75 0 01.75-.75h1.5v-1.5a.75.75 0 011.5 0v2.25a.75.75 0 01-.75.75h-2.25a.75.75 0 01-.75-.75z" />
              <path d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935-2.186 2.25 2.25 0 00-3.935 2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
          </button>
          
          {/* Direct Call Button */}
          <a
            href={`tel:${info.agentMobile || info.agentPhone}`}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-bold text-sm shadow-sm transition-all"
            style={{ backgroundColor: primaryColor }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l.548 2.196c.19.758-.014 1.56-.537 2.127l-.83.902a14.975 14.975 0 006.275 6.275l.902-.83c.568-.523 1.37-.727 2.127-.537l2.196.548c.843.209 1.42.96 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
            </svg>
            <span>전화 문의</span>
          </a>
        </div>
      </div>
    </div>
  );
}
