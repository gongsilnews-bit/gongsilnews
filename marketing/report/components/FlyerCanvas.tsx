import React, { forwardRef } from 'react';
import { FlyerState } from '../types';
import Page0Cover from './canvas/Page0Cover';
import Page1Overview from './canvas/Page1Overview';
import Page2StatusValuation from './canvas/Page2StatusValuation';
import Page3LeaseStatus from './canvas/Page3LeaseStatus';
import Page4Photos from './canvas/Page4Photos';
import { photoPageCount, extraPhotoSlots } from './canvas/photoPages';
import { pageOrder } from './canvas/pageOrder';
import { Page8Cadastral, Page9Building, Page10Floors, Page11Trades } from './canvas/Page8Land';
import Page5AreaAnalysis from './canvas/Page5AreaAnalysis';
import Page6Roadmap from './canvas/Page6Roadmap';
import Page7Ending from './canvas/Page7Ending';
import PageSim from './canvas/PageSim';
import { ReportContext } from './shared/ReportContext';

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
  const order = pageOrder(info);
  // 사진 쪽이 늘면(2~5쪽) 뒤 쪽 번호도 밀린다 (2026-10-24)
  const photoPages = photoPageCount(info);
  const extraPhoto = visiblePages.includes(4) ? photoPages - 1 : 0;
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const getPageStatus = (pageNum: number, photoNo = 1) => {
      const isVisible = visiblePages.includes(pageNum);
      const shouldRender = (activeTab === 'all' && isVisible) || activeTab === pageNum;
      
      let pageString = `PAGE ${pad2(pageNum)} / 06`;
      if (isVisible) {
          // 쪽 차례 — 회원이 바꾼 차례 (info.pageOrder)
          const rank = (p: number) => { const i = order.indexOf(p); return i < 0 ? 99 + p : i; };
          const before = visiblePages.filter((p) => rank(p) < rank(pageNum) && p !== 4).length + (visiblePages.includes(4) && rank(pageNum) > rank(4) ? photoPages : 0);
          const idx = pageNum === 4 ? visiblePages.filter((p) => rank(p) < rank(4)).length + photoNo : before + 1;
          const total = visiblePages.length + extraPhoto;
          pageString = `PAGE ${pad2(idx)} / ${pad2(total)}`;
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

  // 쪽마다 그릴 것 — 아래에서 정한 차례대로 놓는다
  const blocks: Record<number, React.ReactNode> = {};
  blocks[0] = (<>
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
  </>);
  blocks[1] = (<>
        {/* PAGE 1: OVERVIEW */}
        {getPageStatus(1).shouldRender && (
            <Page1Overview
                info={info}
                pageString={getPageStatus(1).pageString}
                isHidden={getPageStatus(1).isHidden}
                layoutTheme={layoutTheme}
                colorTheme={colorTheme}
                mainImage={mainImage}
                customQrImage={customQrImage || null}
                onUpdateInfo={onUpdateInfo}
                onImageUpload={onImageUpload}
                isUploadingImage={isUploadingImage}
            />
        )}
  </>);
  blocks[2] = (<>
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
  </>);
  blocks[3] = (<>
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
  </>);
  blocks[4] = (<>
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
        {/* PAGE 4-2 ~ 4-5: 늘린 사진 쪽 */}
        {getPageStatus(4).shouldRender && Array.from({ length: photoPages - 1 }, (_, i) => i + 2).map((n) => (
            <Page4Photos
                key={`photo-page-${n}`}
                info={info}
                pageString={getPageStatus(4, n).pageString}
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
                extraSlots={extraPhotoSlots(n, data as Record<string, any>)}
                photoPageNo={n}
            />
        ))}
  </>);
  blocks[5] = (<>
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
  </>);
  blocks[6] = (<>
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
  </>);
  blocks[8] = (<>
        {/* PAGE 8: 지적도 · PAGE 9: 건축물대장 요약 (로드맵 뒤) */}
        {getPageStatus(8).shouldRender && (
            <Page8Cadastral info={info} pageString={getPageStatus(8).pageString} isHidden={getPageStatus(8).isHidden}
                layoutTheme={layoutTheme} colorTheme={colorTheme} onUpdateInfo={onUpdateInfo} />
        )}
  </>);
  blocks[9] = (<>
        {getPageStatus(9).shouldRender && (
            <Page9Building info={info} pageString={getPageStatus(9).pageString} isHidden={getPageStatus(9).isHidden}
                layoutTheme={layoutTheme} colorTheme={colorTheme} onUpdateInfo={onUpdateInfo} />
        )}
  </>);
  blocks[10] = (<>
        {getPageStatus(10).shouldRender && (
            <Page10Floors info={info} pageString={getPageStatus(10).pageString} isHidden={getPageStatus(10).isHidden}
                layoutTheme={layoutTheme} colorTheme={colorTheme} onUpdateInfo={onUpdateInfo} />
        )}
  </>);
  blocks[11] = (<>
        {getPageStatus(11).shouldRender && (
            <Page11Trades info={info} pageString={getPageStatus(11).pageString} isHidden={getPageStatus(11).isHidden}
                layoutTheme={layoutTheme} colorTheme={colorTheme} onUpdateInfo={onUpdateInfo} />
        )}
  </>);
  // 12. 인테리어 전후 · 13. 리모델링 전후 (AI시뮬레이션, 2026-10-24)
  ([['interior', 12], ['remodel', 13]] as const).forEach(([kind, id]) => {
    blocks[id] = getPageStatus(id).shouldRender ? (
      <PageSim kind={kind} info={info} pageString={getPageStatus(id).pageString} isHidden={getPageStatus(id).isHidden}
          layoutTheme={layoutTheme} colorTheme={colorTheme} onUpdateInfo={onUpdateInfo} />
    ) : null;
  });
  blocks[7] = (<>
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
                isUploadingImage={isUploadingImage}
            />
        )}
  </>);

  return (
    <ReportContext.Provider value={{ isAdClosed: !!info.isAdClosed, info, colorTheme }}>
      <div className="flex flex-col items-center p-8 bg-gray-100" ref={ref} style={themeStyles}>

        {/* 쪽은 info.pageOrder 차례대로 (표지는 늘 맨 앞) — 내보내기·인쇄도 이 차례 (2026-10-24) */}
        {order.map((id) => <React.Fragment key={id}>{blocks[id]}</React.Fragment>)}
      </div>
    </ReportContext.Provider>
  );
});

FlyerCanvas.displayName = 'FlyerCanvas';

export default FlyerCanvas;
