import React from 'react';
import { PropertyInfo, FlyerColor, FlyerLayout } from '../../types';
import { EditableText, EditableBlock, ReportPage, EditableImage, KakaoMap } from '../shared';

interface Page5AreaAnalysisProps {
  info: PropertyInfo;
  pageString: string;
  isHidden: boolean;
  layoutTheme: FlyerLayout;
  colorTheme: FlyerColor;
  mapImage: string;
  onUpdateInfo?: (info: any) => void;
  onImageUpload?: (key: string, file: File) => Promise<string | undefined>;
  onDeleteImage?: (key: string) => void;
  isUploadingImage?: Record<string, boolean>;
}

const Page5AreaAnalysis: React.FC<Page5AreaAnalysisProps> = ({
  info,
  pageString,
  isHidden,
  layoutTheme,
  colorTheme,
  mapImage,
  onUpdateInfo,
  onImageUpload,
  onDeleteImage,
  isUploadingImage,
}) => {
  const handleTextChange = (key: string, value: string) => {
    if (onUpdateInfo) {
      onUpdateInfo({
        ...info,
        [key]: value
      });
    }
  };

  return (
    <ReportPage layoutTheme={layoutTheme} colorTheme={colorTheme}
        pageNumber={5} 
        pageString={pageString}
        isHidden={isHidden}
        title={info.page5Title || "입지 및 위치도"} 
        onUpdateTitle={(val) => handleTextChange('page5Title', val)}
        subtitle={info.page5Subtitle || "Strategic Connectivity"} 
        onUpdateSubtitle={(val) => handleTextChange('page5Subtitle', val)}
        badgeText={info.pageBadges?.page5 || "AREA ANALYSIS"}
        exportId="page-5"
        onUpdateBadge={(val) => {
            if (onUpdateInfo) {
                onUpdateInfo({
                    ...info,
                    pageBadges: { ...(info.pageBadges || {}), page5: val }
                });
            }
        }}
        footerText={info.footerText || "PROPERTY REPORT"}
        onUpdateFooter={(val) => handleTextChange('footerText', val)}
    >
        <div className="flex flex-col h-[550px] gap-6">
            <div className="flex gap-6 h-3/4">
                {/* Map Box */}
                <div className="w-2/3 border border-gray-200 rounded-2xl overflow-hidden relative shadow-sm bg-gray-50 flex items-center justify-center group/map z-10">
                    {/* Map Mode Picker Overlay (print:hidden, visible on hover) */}
                    <div className="absolute top-4 left-4 z-[40] flex items-center gap-1 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl p-1 shadow-md opacity-0 group-hover/map:opacity-100 transition-opacity duration-200 print:hidden">
                        {[
                            { type: "kakao", label: "카카오" },
                            { type: "google", label: "구글" },
                            { type: "upload", label: "이미지 업로드" }
                        ].map(opt => (
                            <button
                                key={opt.type}
                                type="button"
                                onClick={() => handleTextChange('mapType', opt.type)}
                                className={`px-2 py-1 rounded-lg text-[9px] font-extrabold transition-colors cursor-pointer border-none ${
                                    (info.mapType || "kakao") === opt.type 
                                        ? "bg-[#cc5a27] text-white" 
                                        : "hover:bg-gray-100 text-gray-600 bg-transparent"
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {(!info.mapType || info.mapType === "kakao") && (
                        (info.mapAddress || info.address) ? (
                            <KakaoMap 
                                address={info.mapAddress || info.address} 
                                lat={info.page5Lat}
                                lng={info.page5Lng}
                                onCoordsChange={(lat, lng) => {
                                    if (onUpdateInfo) {
                                        onUpdateInfo({
                                            ...info,
                                            page5Lat: lat,
                                            page5Lng: lng
                                        });
                                    }
                                }}
                            />
                        ) : (
                            <div className="text-gray-400 font-bold">주소를 입력하면 지도가 표시됩니다.</div>
                        )
                    )}

                    {info.mapType === "google" && (
                        (info.mapAddress || info.address) ? (
                            <iframe 
                                title="Location Map"
                                width="100%" 
                                height="100%" 
                                frameBorder="0" 
                                style={{ border: 0 }}
                                src={`https://maps.google.com/maps?q=${encodeURIComponent(info.mapAddress || info.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                allowFullScreen
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="text-gray-400 font-bold">주소를 입력하면 지도가 표시됩니다.</div>
                        )
                    )}

                    {info.mapType === "upload" && (
                        <div className="w-full h-full relative">
                            <EditableImage 
                                src={mapImage || ""} 
                                alt="Uploaded Location Map" 
                                imageKey="mapImage"
                                onImageUpload={onImageUpload}
                                onDelete={() => onDeleteImage && onDeleteImage('mapImage')}
                                isUploading={isUploadingImage?.mapImage}
                                aspectRatioClass="object-cover"
                            />
                            {!mapImage && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 text-center">
                                    <svg className="w-8 h-8 text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-[10px] text-gray-400 font-bold">마우스를 올려 지도를 업로드하세요</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Direct Naver Map link on canvas (print:hidden) */}
                    {info.address && (
                        <a 
                            href={`https://map.naver.com/p/search/${encodeURIComponent(info.address.split('\n')[0])}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="absolute bottom-4 left-4 bg-white/95 text-slate-800 hover:bg-white active:scale-95 font-extrabold px-3 py-1.5 rounded-xl shadow-lg text-[10px] flex items-center gap-1.5 transition-all border border-gray-200 z-20 print:hidden"
                            title="네이버 지도로 자세히 보기"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 text-green-600">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25z" />
                            </svg>
                            <span>네이버 지도로 보기</span>
                        </a>
                    )}

                    <div className="absolute top-4 right-4 bg-[var(--theme-dark)] text-white p-3 rounded-lg shadow-lg border border-gray-700 z-20">
                        <div className="text-[#e29d45] text-[10px] font-bold tracking-widest uppercase mb-1">
                            <EditableText 
                                value={info.page4TargetLocationHeader || "TARGET LOCATION"} 
                                onChange={(val) => handleTextChange('page4TargetLocationHeader', val)} 
                                className="text-[#e29d45]"
                            />
                        </div>
                        <div className="font-bold text-sm whitespace-pre-wrap">
                            <EditableBlock 
                                value={info.areaTargetName || ""} 
                                onChange={(val) => handleTextChange('areaTargetName', val)}
                                className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 text-white"
                            />
                        </div>
                    </div>
                </div>
                {/* Info Box */}
                <div className="w-1/3 bg-[var(--theme-dark)] rounded-2xl p-8 flex flex-col shadow-md text-white">
                    <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-6">
                        <svg className="w-6 h-6 text-[#e29d45]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    </div>
                    <h3 className="text-[#e29d45] text-2xl font-bold mb-4 leading-snug whitespace-pre-wrap">
                        <EditableBlock 
                            value={info.page4TargetTitle || ((info.areaTargetName?.split('\n')[0] || "") + " 클러스터")} 
                            onChange={(val) => handleTextChange('page4TargetTitle', val)}
                            className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 text-[#e29d45]"
                        />
                    </h3>
                    <div className="text-gray-300 text-sm leading-relaxed mb-auto">
                        <EditableBlock 
                            value={info.areaTargetDesc || ""} 
                            onChange={(val) => handleTextChange('areaTargetDesc', val)}
                            className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 text-gray-300"
                        />
                    </div>
                </div>
            </div>

            {/* Bottom 3 Boxes */}
            <div className="flex gap-4 h-1/4">
                {[1,2,3].map(i => (
                    <div key={i} className={`flex-1 border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-center ${i===3 ? 'bg-[#f8fafc]' : 'bg-white'}`}>
                        <div className={`font-bold text-xs uppercase tracking-widest mb-2 ${i===1 ? 'text-[#cc5a27]' : 'text-gray-400'}`}>
                            <EditableText 
                                value={(info as any)[`areaBox${i}Title`] || ""} 
                                onChange={(val) => handleTextChange(`areaBox${i}Title`, val)} 
                            />
                        </div>
                        <div className="text-gray-800 font-bold text-sm">
                            <EditableText 
                                value={(info as any)[`areaBox${i}Text`] || ""} 
                                onChange={(val) => handleTextChange(`areaBox${i}Text`, val)} 
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </ReportPage>
  );
};

export default Page5AreaAnalysis;
