import React from 'react';
import EditableText from './EditableText';

const ReportPage = ({ 
    children, 
    pageNumber, 
    pageString,
    isHidden,
    title, 
    subtitle, 
    badgeText,
    exportId,
    onUpdateTitle,
    onUpdateSubtitle,
    onUpdateBadge,
    footerText = "CONFIDENTIAL | INFORMATION MEMORANDUM",
    onUpdateFooter,
    layoutTheme,
    colorTheme
}: { 
    children: React.ReactNode, 
    pageNumber: number, 
    pageString?: string,
    isHidden?: boolean,
    title: string, 
    subtitle: string, 
    badgeText?: string,
    exportId?: string,
    onUpdateTitle?: (text: string) => void,
    onUpdateSubtitle?: (text: string) => void,
    onUpdateBadge?: (text: string) => void,
    footerText?: string,
    onUpdateFooter?: (text: string) => void,
    layoutTheme?: any,
    colorTheme?: any
}) => {
    const layoutType = layoutTheme?.type || 'type1';
    const headingFont = layoutTheme?.headingFont || 'font-sans';
    const bodyFont = layoutTheme?.bodyFont || 'font-sans';

    const renderHeader = () => {
        if (layoutType === 'type2') {
            return (
                <div className={`h-[120px] bg-white text-[var(--theme-dark)] border-b-2 border-[var(--theme-dark)] px-10 py-6 flex flex-col justify-center items-center shrink-0 ${headingFont}`}>
                    <h1 className="text-3xl font-extrabold tracking-widest uppercase">
                        {onUpdateTitle ? <EditableText value={title} onChange={onUpdateTitle} className="text-center hover:bg-gray-100 focus:bg-gray-200 px-2" /> : title}
                    </h1>
                    <span className="text-gray-500 text-sm tracking-widest mt-1">
                        {onUpdateSubtitle ? <EditableText value={subtitle} onChange={onUpdateSubtitle} className="text-center hover:bg-gray-100 focus:bg-gray-200 px-2" /> : subtitle}
                    </span>
                    {badgeText && <div className="absolute top-6 right-10 border border-[var(--theme-dark)] text-[var(--theme-dark)] px-3 py-1 text-xs font-bold tracking-widest uppercase">{onUpdateBadge ? <EditableText value={badgeText} onChange={onUpdateBadge} /> : badgeText}</div>}
                </div>
            );
        }
        if (layoutType === 'type3') {
            return (
                <div className={`h-[120px] bg-gray-50 px-10 py-6 flex flex-col justify-end shrink-0 border-l-[12px] border-[var(--theme-primary)] ${headingFont}`}>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                        {onUpdateTitle ? <EditableText value={title} onChange={onUpdateTitle} className="hover:bg-gray-200 focus:bg-gray-300 px-1" /> : title}
                    </h1>
                    <span className="text-[var(--theme-primary)] font-bold tracking-widest mt-1 text-sm">
                        {onUpdateSubtitle ? <EditableText value={subtitle} onChange={onUpdateSubtitle} className="hover:bg-[var(--theme-primary)]/10 focus:bg-[var(--theme-primary)]/20 px-1" /> : subtitle}
                    </span>
                    {badgeText && <div className="absolute top-6 right-10 bg-[var(--theme-primary)] text-white px-3 py-1 text-xs font-bold tracking-widest uppercase shadow-sm">{onUpdateBadge ? <EditableText value={badgeText} onChange={onUpdateBadge} /> : badgeText}</div>}
                </div>
            );
        }
        if (layoutType === 'type4') {
            return (
                <div className={`h-[120px] bg-[var(--theme-dark)] text-white px-10 py-6 flex justify-between items-center shrink-0 ${headingFont}`}>
                    <div className="flex items-center gap-6 w-full">
                        <div className="text-5xl font-black opacity-20">0{pageNumber}</div>
                        <div className="flex-1">
                            <h1 className="text-3xl font-black uppercase tracking-tight">
                                {onUpdateTitle ? <EditableText value={title} onChange={onUpdateTitle} className="hover:bg-white/10 focus:bg-white/20 px-1" /> : title}
                            </h1>
                            <span className="text-white/70 font-bold tracking-widest uppercase text-xs mt-1 block">
                                {onUpdateSubtitle ? <EditableText value={subtitle} onChange={onUpdateSubtitle} className="hover:bg-white/10 focus:bg-white/20 px-1" /> : subtitle}
                            </span>
                        </div>
                        {badgeText && (
                            <div className="bg-[var(--theme-primary)] text-white px-4 py-2 font-black tracking-widest shadow-md text-sm">
                                {onUpdateBadge ? <EditableText value={badgeText} onChange={onUpdateBadge} className="hover:bg-white/20 focus:bg-white/30" /> : badgeText}
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        if (layoutType === 'type5') {
            return (
                <div className={`h-[120px] bg-white px-10 py-8 flex justify-between items-center shrink-0 border-b border-gray-100 ${headingFont}`}>
                    <div className="flex-1">
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                            {onUpdateTitle ? <EditableText value={title} onChange={onUpdateTitle} className="hover:bg-gray-100 focus:bg-gray-200 px-1" /> : title}
                        </h1>
                    </div>
                    <div className="text-right flex flex-col items-end justify-center">
                        {badgeText && (
                            <div className="bg-[var(--theme-primary)] text-white px-4 py-2 font-black tracking-widest uppercase text-sm shadow-sm">
                                {onUpdateBadge ? <EditableText value={badgeText} onChange={onUpdateBadge} className="hover:bg-[var(--theme-primary)]/80 focus:bg-[var(--theme-primary)]/60 px-1 text-center" /> : badgeText}
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        
        // Default Type 1 (Current)
        return (
            <div className={`h-[120px] bg-[var(--theme-dark)] text-white px-10 py-6 flex justify-between items-end shrink-0 ${headingFont}`}>
                <div>
                    <h1 className="text-3xl font-extrabold mb-1 tracking-tight">
                        {onUpdateTitle ? (
                            <EditableText 
                              value={title} 
                              onChange={onUpdateTitle} 
                              className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 text-white px-1" 
                            />
                        ) : title}
                    </h1>
                    <div className="flex items-center gap-4">
                        <span className="text-gray-400 text-sm">
                            {onUpdateSubtitle ? (
                                <EditableText 
                                  value={subtitle} 
                                  onChange={onUpdateSubtitle} 
                                  className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 text-gray-300 px-1" 
                                />
                            ) : subtitle}
                        </span>
                    </div>
                </div>
                {badgeText && (
                    <div className="flex items-center gap-4 h-full pb-2">
                        <div className="w-px h-8 bg-gray-600"></div>
                        <span className={`text-2xl font-black tracking-widest text-white`}>
                            {onUpdateBadge ? (
                                <EditableText 
                                  value={badgeText} 
                                  onChange={onUpdateBadge} 
                                  className="hover:bg-white/10 hover:ring-white/20 focus:bg-white/20 focus:ring-white/50 px-1" 
                                />
                            ) : badgeText}
                        </span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div data-export-id={exportId} className={`relative bg-white w-[1122px] h-[794px] overflow-hidden flex flex-col shadow-2xl mb-8 ${bodyFont}`} style={{ pageBreakAfter: 'always' }}>
            {isHidden && (
                <div className="absolute top-0 left-0 right-0 z-50 bg-red-500/90 text-white py-1.5 text-center text-sm font-bold shadow-md tracking-wider backdrop-blur-sm">
                    ⚠️ 현재 출력(PDF/인쇄)에서 제외된 페이지입니다. (좌측 폼 메뉴에서 설정을 변경할 수 있습니다.)
                </div>
            )}
            {renderHeader()}

            {/* Content Body */}
            <div className="flex-1 p-10 relative">
                {children}
            </div>

            {/* Footer */}
            <div className="h-[50px] px-10 flex justify-between items-center shrink-0 border-t border-gray-100">
                <div className="text-gray-400 text-xs font-bold tracking-widest">
                    {onUpdateFooter ? (
                        <EditableText 
                            value={footerText} 
                            onChange={onUpdateFooter} 
                            className="hover:bg-amber-100/50 hover:ring-1 hover:ring-amber-300 focus:bg-amber-100/80 focus:ring-1 focus:ring-amber-500 rounded px-1 transition-all cursor-text min-w-[280px] inline-block uppercase text-gray-400"
                        />
                    ) : footerText}
                </div>
                <div className="text-gray-400 text-xs font-bold tracking-widest">
                    {pageString || `PAGE 0${pageNumber} / 06`}
                </div>
            </div>
        </div>
    );
};

export default ReportPage;
