import React, { useState, useRef } from 'react';
import { PropertyInfo, FlyerColor, FlyerLayout } from '../../types';
import { EditableText, EditableBlock, ReportPage } from '../shared';

interface Page3LeaseStatusProps {
  info: PropertyInfo;
  pageString: string;
  isHidden: boolean;
  layoutTheme: FlyerLayout;
  colorTheme: FlyerColor;
  onUpdateInfo?: (info: any) => void;
}

const Page3LeaseStatus: React.FC<Page3LeaseStatusProps> = ({
  info, pageString, isHidden, layoutTheme, colorTheme, onUpdateInfo,
}) => {
  const [localWidths, setLocalWidths] = useState<number[] | null>(null);
  const dragRef = useRef<{ startX: number; colIdx: number; startWidths: number[]; tableWidth: number } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const handleDragStart = (e: React.MouseEvent, colIdx: number, currentWidths: number[], leaseTableData: any) => {
      if (!tableRef.current || !onUpdateInfo) return;
      e.preventDefault();
      
      dragRef.current = {
          startX: e.clientX,
          colIdx,
          startWidths: currentWidths,
          tableWidth: tableRef.current.getBoundingClientRect().width
      };
      setLocalWidths([...currentWidths]);

      const handleMouseMove = (moveEvent: MouseEvent) => {
          if (!dragRef.current) return;
          const { startX, colIdx: cIdx, startWidths, tableWidth } = dragRef.current;
          const deltaX = moveEvent.clientX - startX;
          const deltaPct = (deltaX / tableWidth) * 100;
          
          const newWidths = [...startWidths];
          if (newWidths[cIdx] + deltaPct > 5 && newWidths[cIdx + 1] - deltaPct > 5) {
              newWidths[cIdx] = startWidths[cIdx] + deltaPct;
              newWidths[cIdx + 1] = startWidths[cIdx + 1] - deltaPct;
              setLocalWidths(newWidths);
          }
      };

      const handleMouseUp = () => {
          if (dragRef.current && onUpdateInfo) {
              setLocalWidths(currentLocal => {
                  if (currentLocal) {
                      onUpdateInfo({ ...info, leaseTable: { ...leaseTableData, widths: currentLocal } });
                  }
                  return null;
              });
          }
          dragRef.current = null;
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTextChange = (key: string, value: any) => {
    if (onUpdateInfo) onUpdateInfo({ ...info, [key]: value });
  };

  return (
    <ReportPage layoutTheme={layoutTheme} colorTheme={colorTheme}
        pageNumber={3} pageString={pageString} isHidden={isHidden}
        title={info.page3Title || "임대 상세 현황"} 
        onUpdateTitle={(val) => handleTextChange('page3Title', val)}
        subtitle={info.page3Subtitle || "Rent Roll"} 
        onUpdateSubtitle={(val) => handleTextChange('page3Subtitle', val)}
        badgeText={info.pageBadges?.page3 || "RENT ROLL"} exportId="page-3"
        onUpdateBadge={(val) => {
            if (onUpdateInfo) onUpdateInfo({ ...info, pageBadges: { ...(info.pageBadges || {}), page3: val } });
        }}
        footerText={info.footerText || "PROPERTY REPORT"}
        onUpdateFooter={(val) => handleTextChange('footerText', val)}
    >
        {(() => {
            const leaseTable = info.leaseTable || {
                headers: ["층수", "호실", "면적", "금액", "현용도", "기타"],
                rows: [
                    ["지상 5층", "501호", "165.2㎡", "보증금 1억 / 월세 450만", "사무실", "즉시입주"],
                    ["지상 4층", "401호", "165.2㎡", "보증금 1억 / 월세 450만", "학원", "임대중"],
                ]
            };
            const headers = leaseTable.headers;
            const rows = leaseTable.rows;

            const updateCell = (rIdx: number, cIdx: number, val: string) => {
                if (!onUpdateInfo) return;
                const newRows = rows.map((r: string[], ri: number) => ri === rIdx ? r.map((c: string, ci: number) => ci === cIdx ? val : c) : r);
                onUpdateInfo({ ...info, leaseTable: { ...leaseTable, rows: newRows } });
            };

            const updateHeader = (cIdx: number, val: string) => {
                if (!onUpdateInfo) return;
                const newHeaders = headers.map((h: string, ci: number) => ci === cIdx ? val : h);
                onUpdateInfo({ ...info, leaseTable: { ...leaseTable, headers: newHeaders } });
            };

            const addColumn = (insertIdx: number) => {
                if (!onUpdateInfo) return;
                const newHeaders = [...headers]; newHeaders.splice(insertIdx, 0, "새 열");
                const newRows = rows.map((r: string[]) => { const newR = [...r]; newR.splice(insertIdx, 0, ""); return newR; });
                const currentWidths = leaseTable.widths || new Array(headers.length).fill(Math.round(100 / headers.length));
                const newWidths = [...currentWidths]; newWidths.splice(insertIdx, 0, 15);
                onUpdateInfo({ ...info, leaseTable: { ...leaseTable, headers: newHeaders, rows: newRows, widths: newWidths } });
            };

            const deleteColumn = (colIdx: number) => {
                if (!onUpdateInfo || headers.length <= 1) return;
                const newHeaders = headers.filter((_: string, ci: number) => ci !== colIdx);
                const newRows = rows.map((r: string[]) => r.filter((_: string, ci: number) => ci !== colIdx));
                const currentWidths = leaseTable.widths || new Array(headers.length).fill(Math.round(100 / headers.length));
                const newWidths = currentWidths.filter((_: number, ci: number) => ci !== colIdx);
                onUpdateInfo({ ...info, leaseTable: { ...leaseTable, headers: newHeaders, rows: newRows, widths: newWidths } });
            };

            const addRow = () => {
                if (!onUpdateInfo) return;
                onUpdateInfo({ ...info, leaseTable: { ...leaseTable, rows: [...rows, new Array(headers.length).fill("")] } });
            };

            const deleteRow = (rIdx: number) => {
                if (!onUpdateInfo) return;
                onUpdateInfo({ ...info, leaseTable: { ...leaseTable, rows: rows.filter((_: string[], ri: number) => ri !== rIdx) } });
            };

            return (
                <div className="flex flex-col h-full w-full">
                    <div className="text-gray-600 font-bold text-sm mb-4">
                        <EditableText 
                            value={(info as any).page3HighlightHeader || "PROPERTY RENTAL REPORT"} 
                            onChange={(val) => handleTextChange('page3HighlightHeader', val)} 
                        />
                    </div>
                    <div className="w-full flex-1 flex flex-col justify-between bg-white rounded-2xl border border-slate-100 p-6 shadow-sm overflow-visible relative group/table">
                        {/* Toolbar for Rent Roll */}
                        <div className="absolute top-4 right-6 gap-2 print:hidden z-10 hidden group-hover/table:flex">
                            <button type="button" onClick={() => addRow()} className="px-3 py-1.5 bg-[#008299] text-white text-[11px] font-bold rounded shadow-sm hover:bg-[#006f82] transition-colors flex items-center gap-1">
                                <span className="text-sm leading-none">+</span> 행 추가
                            </button>
                            <button type="button" onClick={() => addColumn(headers.length)} className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 text-[11px] font-bold rounded shadow-sm hover:bg-blue-100 transition-colors flex items-center gap-1">
                                <span className="text-sm leading-none">+</span> 열 추가
                            </button>
                            <button type="button" onClick={() => {
                                if (onUpdateInfo && window.confirm("모든 내용을 지우시겠습니까?")) {
                                    onUpdateInfo({ ...info, leaseTable: { ...leaseTable, rows: rows.map((r: string[]) => r.map(() => "")) } });
                                }
                            }} className="px-3 py-1.5 bg-red-50 text-red-500 border border-red-200 text-[11px] font-bold rounded shadow-sm hover:bg-red-100 transition-colors flex items-center gap-1">
                                <span className="text-[10px]">🗑</span> 내용 지우기
                            </button>
                        </div>
                    <div className="overflow-visible flex-1 pr-1 mt-6">
                        <table ref={tableRef} className="w-full text-left border-collapse table-fixed">
                            <thead>
                                <tr>
                                    {headers.map((h: string, colIdx: number) => {
                                        const currentWidths = localWidths || leaseTable.widths || new Array(headers.length).fill(Math.round(100 / headers.length));
                                        const colWidth = currentWidths[colIdx] || Math.round(100 / headers.length);
                                        return (
                                            <th 
                                                key={colIdx} 
                                                className="border border-slate-200 p-2.5 text-xs font-extrabold text-white text-center uppercase relative group/header overflow-visible select-none"
                                                style={{ backgroundColor: colorTheme.primary, width: `${colWidth}%` }}
                                            >
                                                <EditableText value={h} onChange={(val) => updateHeader(colIdx, val)} />
                                                {headers.length > 1 && (
                                                    <button type="button" onClick={() => deleteColumn(colIdx)}
                                                        className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold shadow-md hover:bg-red-600 print:hidden hidden group-hover/header:flex z-50"
                                                        title="열 삭제">✕</button>
                                                )}
                                                {colIdx < headers.length - 1 && (
                                                    <div 
                                                        className="absolute top-0 -right-2 w-4 h-full cursor-col-resize z-40 print:hidden group-hover/header:bg-white/20 hover:!bg-white/50 transition-colors"
                                                        onMouseDown={(e) => handleDragStart(e, colIdx, currentWidths, leaseTable)}
                                                    />
                                                )}
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row: string[], rowIdx: number) => (
                                    <tr key={rowIdx} className="hover:bg-slate-50/50 transition-colors group/row relative">
                                        {row.map((cell: string, colIdx: number) => (
                                            <td key={colIdx} className="border border-slate-200 p-2.5 text-xs text-slate-700 font-semibold relative text-center whitespace-normal break-all">
                                                <EditableText value={cell || ""} onChange={(val) => updateCell(rowIdx, colIdx, val)} />
                                                {colIdx === row.length - 1 && rows.length > 1 && (
                                                    <button type="button" onClick={() => deleteRow(rowIdx)}
                                                        className="absolute top-1/2 -right-2 transform -translate-y-1/2 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold shadow-md hover:bg-red-600 print:hidden hidden group-hover/row:flex z-50"
                                                        title="행 삭제">✕</button>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Custom Total / Summary Block & Explanation */}
                    <div className="flex justify-between items-stretch mt-3 pt-2 gap-4">
                        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col justify-center shadow-sm">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Total Summary</span>
                            <div className="text-sm font-bold text-slate-800">
                                <EditableText value={(info as any).leaseSummaryText || "총 6세대 / 보증금 0원 / 월세 0원"} onChange={(val) => handleTextChange('leaseSummaryText', val)} />
                            </div>
                        </div>
                        {(info as any).showLeaseSummaryDesc !== false && (
                            <div className="flex-1 bg-white border border-slate-200 rounded-lg p-4 text-xs text-slate-600 shadow-sm flex flex-col justify-center">
                                <EditableText multiline value={(info as any).leaseSummaryDesc || "임대 수익률 및 상세 조건은 협의 가능합니다."} onChange={(val) => handleTextChange('leaseSummaryDesc', val)} />
                            </div>
                        )}
                    </div>

                    {/* Notice text block */}
                    <div className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100 leading-normal shrink-0">
                        <EditableBlock value={info.leaseNotice || ""} onChange={(val) => handleTextChange('leaseNotice', val)} />
                    </div>
                    </div>
                    </div>
            );
        })()}
    </ReportPage>
  );
};

export default Page3LeaseStatus;
