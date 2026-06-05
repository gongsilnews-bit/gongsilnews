import React, { forwardRef } from 'react';
import { FlyerState } from '../types';
import Page0Cover from './canvas/Page0Cover';
import Page1Overview from './canvas/Page1Overview';
import Page2StatusValuation from './canvas/Page2StatusValuation';
import Page3LeaseStatus from './canvas/Page3LeaseStatus';
import Page4Photos from './canvas/Page4Photos';
import Page5AreaAnalysis from './canvas/Page5AreaAnalysis';
import Page6Roadmap from './canvas/Page6Roadmap';
import Page7Ending from './canvas/Page7Ending';

interface FlyerCanvasProps {
  data: FlyerState;
  activeTab?: number | 'all';
  onUpdateInfo?: (info: any) => void;
  onImageUpload?: (key: string, file: File) => Promise<string | undefined>;
  onDeleteImage?: (key: string) => void;
  isUploadingImage?: Record<string, boolean>;
  onOpenTableEditor?: () => void;
}

// ─── MAIN CANVAS COMPONENT ────────────────────────────────────────────────────

const FlyerCanvas = forwardRef<HTMLDivElement, FlyerCanvasProps>(({ data, activeTab = 'all', onUpdateInfo, onImageUpload, onDeleteImage, isUploadingImage, onOpenTableEditor }, ref) => {
  const { info, mainImage, agentImage, customQrImage, subImage1, subImage2, featureImage1, featureImage2, mapImage, colorTheme, layoutTheme } = data; 

  const visiblePages = info.visiblePages || [1, 2, 3, 4, 5, 6];
  const getPageStatus = (pageNum: number) => {
      const isVisible = visiblePages.includes(pageNum);
      const shouldRender = (activeTab === 'all' && isVisible) || activeTab === pageNum;
      
      let pageString = `PAGE 0${pageNum} / 06`;
      if (isVisible) {
          const idx = visiblePages.indexOf(pageNum) + 1;
          const total = visiblePages.length;
          pageString = `PAGE 0${idx} / 0${total}`;
      } else {
          pageString = `EXCLUDED`;
      }
      
      return { isVisible, shouldRender, pageString, isHidden: !isVisible };
  };

  const themeStyles = {
    '--theme-primary': colorTheme.primary,
    '--theme-secondary': colorTheme.secondary,
    '--theme-dark': colorTheme.dark,
  } as React.CSSProperties;

  return (
    <div className="flex flex-col items-center p-8 bg-gray-100" ref={ref} style={themeStyles}>
        {info.isAdClosed ? (
            <Page7Ending
                info={info}
                pageString=""
                isHidden={false}
                layoutTheme={layoutTheme}
                colorTheme={colorTheme}
                onUpdateInfo={onUpdateInfo}
                agentImage={agentImage || null}
                onImageUpload={onImageUpload}
                onDeleteImage={onDeleteImage}
                isUploading={isUploadingImage?.['agentImage'] || false}
            />
        ) : (
            <>
        {/* PAGE 0: COVER */}
        {getPageStatus(0).shouldRender && (
            <Page0Cover
                info={info}
                pageString={getPageStatus(0).pageString}
                isHidden={getPageStatus(0).isHidden}
                layoutTheme={layoutTheme}
                colorTheme={colorTheme}
                onUpdateInfo={onUpdateInfo}
                coverImage={mainImage || null}
                customQrImage={customQrImage || null}
                onImageUpload={onImageUpload}
                onDeleteImage={onDeleteImage}
                isUploading={isUploadingImage?.['mainImage'] || false}
                isUploadingQr={isUploadingImage?.['customQrImage'] || false}
            />
        )}

        {/* PAGE 1: OVERVIEW */}
        {getPageStatus(1).shouldRender && (
            <Page1Overview
                info={info}
                pageString={getPageStatus(1).pageString}
                isHidden={getPageStatus(1).isHidden}
                layoutTheme={layoutTheme}
                colorTheme={colorTheme}
                mainImage={mainImage}
                onUpdateInfo={onUpdateInfo}
                onImageUpload={onImageUpload}
                isUploadingImage={isUploadingImage}
            />
        )}
 
        {/* PAGE 2: STATUS & VALUATION */}
        {getPageStatus(2).shouldRender && (
            <Page2StatusValuation
                info={info}
                pageString={getPageStatus(2).pageString}
                isHidden={getPageStatus(2).isHidden}
                layoutTheme={layoutTheme}
                colorTheme={colorTheme}
                onUpdateInfo={onUpdateInfo}
            />
        )}

        {/* PAGE 3: LEASE STATUS */}
        {getPageStatus(3).shouldRender && (
            <Page3LeaseStatus
                info={info}
                pageString={getPageStatus(3).pageString}
                isHidden={getPageStatus(3).isHidden}
                layoutTheme={layoutTheme}
                colorTheme={colorTheme}
                onUpdateInfo={onUpdateInfo}
            />
        )}

        {/* PAGE 4: PHOTOS */}
        {getPageStatus(4).shouldRender && (
            <Page4Photos
                info={info}
                pageString={getPageStatus(4).pageString}
                isHidden={getPageStatus(4).isHidden}
                layoutTheme={layoutTheme}
                colorTheme={colorTheme}
                mainImage={mainImage}
                subImage1={subImage1}
                subImage2={subImage2}
                featureImage1={featureImage1}
                featureImage2={featureImage2}
                onUpdateInfo={onUpdateInfo}
                onImageUpload={onImageUpload}
                onDeleteImage={onDeleteImage}
                isUploadingImage={isUploadingImage}
            />
        )}

        {/* PAGE 5: AREA ANALYSIS */}
        {getPageStatus(5).shouldRender && (
            <Page5AreaAnalysis
                info={info}
                pageString={getPageStatus(5).pageString}
                isHidden={getPageStatus(5).isHidden}
                layoutTheme={layoutTheme}
                colorTheme={colorTheme}
                mapImage={mapImage}
                onUpdateInfo={onUpdateInfo}
                onImageUpload={onImageUpload}
                onDeleteImage={onDeleteImage}
                isUploadingImage={isUploadingImage}
            />
        )}

        {/* PAGE 6: ROADMAP */}
        {getPageStatus(6).shouldRender && (
            <Page6Roadmap
                info={info}
                pageString={getPageStatus(6).pageString}
                isHidden={getPageStatus(6).isHidden}
                layoutTheme={layoutTheme}
                colorTheme={colorTheme}
                onUpdateInfo={onUpdateInfo}
            />
        )}

        {/* PAGE 7: ENDING (CONTACT) */}
        {getPageStatus(7).shouldRender && (
            <Page7Ending
                info={info}
                pageString={getPageStatus(7).pageString}
                isHidden={getPageStatus(7).isHidden}
                layoutTheme={layoutTheme}
                colorTheme={colorTheme}
                onUpdateInfo={onUpdateInfo}
                agentImage={agentImage || null}
                onImageUpload={onImageUpload}
                onDeleteImage={onDeleteImage}
                isUploading={isUploadingImage?.['agentImage'] || isUploadingImage?.['agentCardFront'] || false}
            />
        )}
            </>
        )}
    </div>
  );
});

FlyerCanvas.displayName = 'FlyerCanvas';

export default FlyerCanvas;
