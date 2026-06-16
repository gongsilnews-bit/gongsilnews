import React from 'react';
import { PropertyInfo, FlyerColor, FlyerLayout } from '../../types';
import { EditableText, ReportPage, EditableImage } from '../shared';

interface Page4PhotosProps {
  info: PropertyInfo;
  pageString: string;
  isHidden: boolean;
  layoutTheme: FlyerLayout;
  colorTheme: FlyerColor;
  mainImage: string;
  subImage1: string;
  subImage2: string;
  featureImage1: string;
  featureImage2: string;
  onUpdateInfo?: (info: any) => void;
  onImageUpload?: (key: string, file: File) => Promise<string | undefined>;
  onDeleteImage?: (key: string) => void;
  isUploadingImage?: Record<string, boolean>;
}

const Page4Photos: React.FC<Page4PhotosProps> = ({
  info,
  pageString,
  isHidden,
  layoutTheme,
  colorTheme,
  mainImage,
  subImage1,
  subImage2,
  featureImage1,
  featureImage2,
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
        pageNumber={4} 
        pageString={pageString}
        isHidden={isHidden}
        title={info.page4Title || "매물 사진"} 
        onUpdateTitle={(val) => handleTextChange('page4Title', val)}
        subtitle={info.page4Subtitle || "Property Photo"} 
        onUpdateSubtitle={(val) => handleTextChange('page4Subtitle', val)}
        badgeText={info.pageBadges?.page4 || "GALLERY"}
        exportId="page-4"
        onUpdateBadge={(val) => {
            if (onUpdateInfo) {
                onUpdateInfo({
                    ...info,
                    pageBadges: { ...(info.pageBadges || {}), page4: val }
                });
            }
        }}
        footerText={info.footerText || "PROPERTY REPORT"}
        onUpdateFooter={(val) => handleTextChange('footerText', val)}
    >
        {(() => {
            // Group active uploaded photos
            const activePhotos = [
                { src: mainImage, key: 'mainImage', captionKey: 'main', label: "Exterior" },
                { src: subImage1, key: 'subImage1', captionKey: 'sub1', label: "Side View" },
                { src: subImage2, key: 'subImage2', captionKey: 'sub2', label: "Entrance" },
                { src: featureImage1, key: 'featureImage1', captionKey: 'feat1', label: "Interior" },
                { src: featureImage2, key: 'featureImage2', captionKey: 'feat2', label: "Rooftop" }
            ].filter(p => p.src);

            const count = activePhotos.length;

            // Case 0: No photos uploaded
            if (count === 0) {
                return (
                    <div className="w-full h-[550px] border-4 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-50 hover:border-amber-400 transition-all p-8 relative cursor-pointer group">
                        <EditableImage 
                            src="" 
                            alt="No Photos" 
                            imageKey="mainImage"
                            onImageUpload={onImageUpload}
                            isUploading={isUploadingImage?.mainImage}
                            aspectRatioClass="object-cover"
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center">
                            <span className="text-4xl mb-3">📸</span>
                            <h3 className="text-base font-bold text-gray-700 mb-1">등록된 현장 사진이 없습니다</h3>
                            <p className="text-xs text-gray-400 max-w-sm">마우스를 올려 [사진 업로드] 버튼을 누르거나 좌측 사이드바에서 사진을 추가해 주세요. (최대 5장 등록 가능)</p>
                        </div>
                    </div>
                );
            }

            // Case 1: Single photo (100% full height & width)
            if (count === 1) {
                const p = activePhotos[0];
                const captionValue = info.photoCaptions?.[p.captionKey] !== undefined ? info.photoCaptions[p.captionKey] : p.label;
                return (
                    <div className="w-full h-[550px] relative rounded-2xl overflow-hidden shadow-md group">
                        <EditableImage 
                            src={p.src || ""} 
                            alt={p.label} 
                            imageKey={p.key}
                            onImageUpload={onImageUpload}
                            onDelete={() => onDeleteImage && onDeleteImage(p.key)}
                            isUploading={isUploadingImage?.[p.key]}
                            aspectRatioClass="object-cover"
                        />
                        <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/85 to-transparent z-20">
                            <span className="text-white font-bold relative z-30 text-sm">
                                <EditableText 
                                    value={captionValue} 
                                    onChange={(val) => {
                                        if (onUpdateInfo) {
                                            onUpdateInfo({
                                                ...info,
                                                photoCaptions: { ...(info.photoCaptions || {}), [p.captionKey]: val }
                                            });
                                        }
                                    }}
                                    className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 text-white"
                                />
                            </span>
                        </div>
                    </div>
                );
            }

            // Case 2: 2 photos (50/50 tall side-by-side columns)
            if (count === 2) {
                return (
                    <div className="flex gap-4 h-[550px] w-full">
                        {activePhotos.map((p, idx) => {
                            const captionValue = info.photoCaptions?.[p.captionKey] !== undefined ? info.photoCaptions[p.captionKey] : p.label;
                            return (
                                <div key={idx} className="w-1/2 relative h-full rounded-2xl overflow-hidden shadow-md group">
                                    <EditableImage 
                                        src={p.src || ""} 
                                        alt={p.label} 
                                        imageKey={p.key}
                                        onImageUpload={onImageUpload}
                                        onDelete={() => onDeleteImage && onDeleteImage(p.key)}
                                        isUploading={isUploadingImage?.[p.key]}
                                        aspectRatioClass="object-cover"
                                    />
                                    <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/85 to-transparent z-20">
                                        <span className="text-white font-bold relative z-30 text-sm">
                                            <EditableText 
                                                value={captionValue} 
                                                onChange={(val) => {
                                                    if (onUpdateInfo) {
                                                        onUpdateInfo({
                                                            ...info,
                                                            photoCaptions: { ...(info.photoCaptions || {}), [p.captionKey]: val }
                                                        });
                                                    }
                                                }}
                                                className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 text-white"
                                            />
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            }

            // Case 3: 3 photos (Left 1 large 60%, Right 2 stacked vertically 40%)
            if (count === 3) {
                const largePhoto = activePhotos[0];
                const small1 = activePhotos[1];
                const small2 = activePhotos[2];
                
                const largeCaption = info.photoCaptions?.[largePhoto.captionKey] !== undefined ? info.photoCaptions[largePhoto.captionKey] : largePhoto.label;
                
                return (
                    <div className="flex gap-4 h-[550px] w-full">
                        <div className="w-[60%] relative h-full rounded-2xl overflow-hidden shadow-md group">
                            <EditableImage 
                                src={largePhoto.src || ""} 
                                alt={largePhoto.label} 
                                imageKey={largePhoto.key}
                                onImageUpload={onImageUpload}
                                onDelete={() => onDeleteImage && onDeleteImage(largePhoto.key)}
                                isUploading={isUploadingImage?.[largePhoto.key]}
                                aspectRatioClass="object-cover"
                            />
                            <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/85 to-transparent z-20">
                                <span className="text-white font-bold relative z-30 text-sm">
                                    <EditableText 
                                        value={largeCaption} 
                                        onChange={(val) => {
                                            if (onUpdateInfo) {
                                                onUpdateInfo({
                                                    ...info,
                                                    photoCaptions: { ...(info.photoCaptions || {}), [largePhoto.captionKey]: val }
                                                });
                                            }
                                        }}
                                        className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 text-white"
                                    />
                                </span>
                            </div>
                        </div>
                        
                        <div className="w-[40%] flex flex-col gap-4 h-full">
                            {[small1, small2].map((p, idx) => {
                                const captionValue = info.photoCaptions?.[p.captionKey] !== undefined ? info.photoCaptions[p.captionKey] : p.label;
                                return (
                                    <div key={idx} className="h-[calc(50%-8px)] relative rounded-2xl overflow-hidden shadow-md group">
                                        <EditableImage 
                                            src={p.src || ""} 
                                            alt={p.label} 
                                            imageKey={p.key}
                                            onImageUpload={onImageUpload}
                                            onDelete={() => onDeleteImage && onDeleteImage(p.key)}
                                            isUploading={isUploadingImage?.[p.key]}
                                            aspectRatioClass="object-cover"
                                        />
                                        <div className="absolute bottom-0 left-0 w-full p-3 bg-gradient-to-t from-black/85 to-transparent z-20">
                                            <span className="text-white font-bold relative z-30 text-xs">
                                                <EditableText 
                                                    value={captionValue} 
                                                    onChange={(val) => {
                                                        if (onUpdateInfo) {
                                                            onUpdateInfo({
                                                                ...info,
                                                                photoCaptions: { ...(info.photoCaptions || {}), [p.captionKey]: val }
                                                            });
                                                        }
                                                    }}
                                                    className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 text-white"
                                                />
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            }

            // Case 4: 4 photos (2x2 grid)
            if (count === 4) {
                return (
                    <div className="grid grid-cols-2 grid-rows-2 gap-4 h-[550px] w-full">
                        {activePhotos.map((p, idx) => {
                            const captionValue = info.photoCaptions?.[p.captionKey] !== undefined ? info.photoCaptions[p.captionKey] : p.label;
                            return (
                                <div key={idx} className="relative rounded-2xl overflow-hidden shadow-md group">
                                    <EditableImage 
                                        src={p.src || ""} 
                                        alt={p.label} 
                                        imageKey={p.key}
                                        onImageUpload={onImageUpload}
                                        onDelete={() => onDeleteImage && onDeleteImage(p.key)}
                                        isUploading={isUploadingImage?.[p.key]}
                                        aspectRatioClass="object-cover"
                                    />
                                    <div className="absolute bottom-0 left-0 w-full p-3 bg-gradient-to-t from-black/85 to-transparent z-20">
                                        <span className="text-white font-bold relative z-30 text-xs">
                                            <EditableText 
                                                value={captionValue} 
                                                onChange={(val) => {
                                                    if (onUpdateInfo) {
                                                        onUpdateInfo({
                                                            ...info,
                                                            photoCaptions: { ...(info.photoCaptions || {}), [p.captionKey]: val }
                                                        });
                                                    }
                                                }}
                                                className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 text-white"
                                            />
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            }

            // Case 5: 5 photos (Magazine layout: Left 1 large, Right 4 small)
            const mainP = activePhotos[0];
            const mainCaption = info.photoCaptions?.[mainP.captionKey] !== undefined ? info.photoCaptions[mainP.captionKey] : mainP.label;
            return (
                <div className="flex gap-4 h-[550px] w-full">
                    {/* Main Large Photo */}
                    <div className="w-1/2 relative h-full group">
                        <EditableImage 
                            src={mainP.src || ""} 
                            alt={mainP.label} 
                            imageKey={mainP.key}
                            onImageUpload={onImageUpload}
                            onDelete={() => onDeleteImage && onDeleteImage(mainP.key)}
                            isUploading={isUploadingImage?.[mainP.key]}
                            aspectRatioClass="object-cover"
                        />
                        <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/85 to-transparent z-20">
                            <span className="text-white font-bold relative z-30">
                                <EditableText 
                                    value={mainCaption} 
                                    onChange={(val) => {
                                        if (onUpdateInfo) {
                                            onUpdateInfo({
                                                ...info,
                                                photoCaptions: { ...(info.photoCaptions || {}), [mainP.captionKey]: val }
                                            });
                                        }
                                    }}
                                    className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 text-white"
                                />
                            </span>
                        </div>
                    </div>
                    
                    {/* 4 Grid Photos */}
                    <div className="w-1/2 grid grid-cols-2 grid-rows-2 gap-4">
                        {[activePhotos[1], activePhotos[2], activePhotos[3], activePhotos[4]].map((p, i) => {
                            const captionValue = info.photoCaptions?.[p.captionKey] !== undefined ? info.photoCaptions[p.captionKey] : p.label;
                            return (
                                <div key={i} className="relative rounded-xl overflow-hidden shadow-md bg-gray-200 group">
                                    <EditableImage 
                                        src={p.src || ""} 
                                        alt={p.label || ""} 
                                        imageKey={p.key}
                                        onImageUpload={onImageUpload}
                                        onDelete={() => onDeleteImage && onDeleteImage(p.key)}
                                        isUploading={isUploadingImage?.[p.key]}
                                        aspectRatioClass="object-cover"
                                    />
                                    <div className="absolute bottom-0 left-0 w-full p-3 bg-gradient-to-t from-[var(--theme-dark)]/90 to-transparent z-20">
                                        <span className="text-white font-bold text-sm relative z-30">
                                            <EditableText 
                                                value={captionValue} 
                                                onChange={(val) => {
                                                    if (onUpdateInfo) {
                                                        onUpdateInfo({
                                                            ...info,
                                                            photoCaptions: { ...(info.photoCaptions || {}), [p.captionKey]: val }
                                                        });
                                                    }
                                                }}
                                                className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 text-white"
                                            />
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        })()}
    </ReportPage>
  );
};

export default Page4Photos;
