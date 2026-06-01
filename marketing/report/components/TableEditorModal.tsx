import React from 'react';
import { 
  XMarkIcon, 
  PlusIcon, 
  TrashIcon, 
  ArrowUpIcon, 
  ArrowDownIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface FloorStatusRow {
  floor: string;
  purpose: string;
  lease: string;
  status: string;
  note: string;
}

interface TableEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  floorStatus: FloorStatusRow[];
  onChange: (newStatus: FloorStatusRow[]) => void;
}

const TableEditorModal: React.FC<TableEditorModalProps> = ({
  isOpen,
  onClose,
  floorStatus = [],
  onChange
}) => {
  if (!isOpen) return null;

  // 병합 여부 판단: 첫 행이 '보증금 / 차임 내역 별도문의'이거나 특정 병합 키워드를 포함하고, 전체 행이 동일한 임대차 값을 갖는 경우
  const mergeText = floorStatus[0]?.lease || '보증금 / 차임 내역 별도문의';
  const isMerged = floorStatus.length > 0 && floorStatus.every(row => row.lease === mergeText && row.lease !== '');

  const handleToggleMerge = (checked: boolean) => {
    if (checked) {
      // 병합 텍스트로 모든 행 채우기
      const defaultMergeText = '보증금 / 차임 내역 별도문의';
      const newStatus = floorStatus.map(row => ({
        ...row,
        lease: defaultMergeText
      }));
      onChange(newStatus);
    } else {
      // 병합 해제: 각 층별로 개별 입력이 가능하도록 초기값 분배
      const newStatus = floorStatus.map((row, i) => ({
        ...row,
        lease: row.lease === mergeText ? (i === 0 ? '별도협의' : '임대중') : row.lease
      }));
      onChange(newStatus);
    }
  };

  const handleMergeTextChange = (value: string) => {
    const newStatus = floorStatus.map(row => ({
      ...row,
      lease: value
    }));
    onChange(newStatus);
  };

  const handleCellChange = (index: number, field: keyof FloorStatusRow, value: string) => {
    const newStatus = [...floorStatus];
    if (field === 'lease' && isMerged) {
      // 병합된 상태에서 임대차 열 수정 시 모든 행 동시 갱신
      newStatus.forEach(row => {
        row.lease = value;
      });
    } else {
      newStatus[index] = {
        ...newStatus[index],
        [field]: value
      };
    }
    onChange(newStatus);
  };

  const addRow = () => {
    const newStatus = [...floorStatus];
    const lastFloor = newStatus[newStatus.length - 1]?.floor || '1F';
    // 층수 자동 계산 (예: 5F -> 6F, B1 -> B2 등)
    let nextFloor = '새 층';
    const match = lastFloor.match(/^(\d+)(F|층)$/i);
    if (match) {
      nextFloor = `${parseInt(match[1]) + 1}${match[2]}`;
    } else if (lastFloor.startsWith('B')) {
      const bMatch = lastFloor.match(/^B(\d+)$/i);
      if (bMatch) {
        nextFloor = `B${parseInt(bMatch[1]) + 1}`;
      }
    }
    
    newStatus.push({
      floor: nextFloor,
      purpose: '상가',
      lease: isMerged ? mergeText : '임대완료',
      status: '점유중',
      note: '비고 없음'
    });
    onChange(newStatus);
  };

  const removeRow = (index: number) => {
    if (floorStatus.length <= 1) {
      alert("최소 1개 이상의 행이 필요합니다.");
      return;
    }
    const newStatus = floorStatus.filter((_, i) => i !== index);
    onChange(newStatus);
  };

  const moveRow = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < floorStatus.length) {
      const newStatus = [...floorStatus];
      const temp = newStatus[index];
      newStatus[index] = newStatus[targetIndex];
      newStatus[targetIndex] = temp;
      onChange(newStatus);
    }
  };

  const rowCount = floorStatus.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100">
        
        {/* Modal Header */}
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              🏢 층별 점유 및 임대 현황 표 빌더
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              출력 레이아웃의 무너짐을 안전하게 방지하는 엑셀 그리드 에디터입니다.
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-8 overflow-y-auto flex-1 space-y-6">
          
          {/* A4 Print Safety Status & Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-100">
            {/* Row Count Alert */}
            <div className="flex flex-col justify-center">
              <span className="text-xs font-semibold text-slate-500 mb-1">A4 출력 레이아웃 안전 상태</span>
              {rowCount > 10 ? (
                <div className="flex items-start gap-2 bg-red-50 text-red-700 p-3 rounded-lg border border-red-100 text-xs font-medium">
                  <span className="shrink-0 text-base">⚠️</span>
                  <div>
                    <p className="font-bold">A4 출력 범위를 초과할 우려가 있습니다.</p>
                    <p className="text-red-600/80 mt-0.5">현재 {rowCount}개 층입니다. 가급적 9~10개 행 이하로 줄여 주시면 인쇄 시 잘림이 방지됩니다.</p>
                  </div>
                </div>
              ) : rowCount >= 7 ? (
                <div className="flex items-center gap-2 bg-yellow-50 text-yellow-800 p-3 rounded-lg border border-yellow-100 text-xs font-medium">
                  <span className="shrink-0 text-base">✨</span>
                  <div>
                    <p className="font-bold">인쇄하기에 적절한 층수 구성입니다.</p>
                    <p className="text-yellow-700/80 mt-0.5">현재 {rowCount}개 행으로, 깔끔한 1페이지 레이아웃이 유지됩니다.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 p-3 rounded-lg border border-emerald-100 text-xs font-medium">
                  <span className="shrink-0 text-base">✓</span>
                  <div>
                    <p className="font-bold">아주 안전한 층수 구성입니다.</p>
                    <p className="text-emerald-700/80 mt-0.5">A4 용지 규격 내에 넉넉하게 정렬됩니다.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Merge Control Toggle */}
            <div className="flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-200/60 md:pl-6">
              <span className="text-xs font-semibold text-slate-500 mb-2">프리미엄 세로 셀 병합 옵션</span>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isMerged} 
                    onChange={(e) => handleToggleMerge(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                  <span className="ml-3 text-xs font-bold text-slate-700">임대차 열 수직 통합 (세로 병합)</span>
                </label>
              </div>
              {isMerged && (
                <div className="mt-3 animate-fadeIn">
                  <label className="text-[10px] font-bold text-orange-600 block mb-1">통합 병합 문구 설정</label>
                  <input 
                    type="text" 
                    value={mergeText} 
                    onChange={(e) => handleMergeTextChange(e.target.value)}
                    className="w-full border border-orange-200 bg-orange-50/30 rounded p-2 text-xs font-extrabold text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-400"
                    placeholder="예: 보증금 / 차임 내역 별도문의"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Spreadsheet Table Grid */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="p-3 font-bold text-slate-600 text-center w-24">순서 / 동작</th>
                  <th className="p-3 font-bold text-slate-600 text-center w-24">층수</th>
                  <th className="p-3 font-bold text-slate-600 text-center w-36">현용도</th>
                  <th className="p-3 font-bold text-slate-600 text-center">임대차 정보</th>
                  <th className="p-3 font-bold text-slate-600 text-center w-40">점유 상태</th>
                  <th className="p-3 font-bold text-slate-600 text-center w-48">비고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {floorStatus.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    {/* Reorder and Delete Actions */}
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          disabled={i === 0}
                          onClick={() => moveRow(i, 'up')}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors disabled:opacity-20"
                        >
                          <ArrowUpIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={i === floorStatus.length - 1}
                          onClick={() => moveRow(i, 'down')}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors disabled:opacity-20"
                        >
                          <ArrowDownIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRow(i)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="행 삭제"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Floor Cell */}
                    <td className="p-2">
                      <input 
                        type="text" 
                        value={row.floor} 
                        onChange={(e) => handleCellChange(i, 'floor', e.target.value)}
                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-center font-bold text-slate-700 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </td>

                    {/* Purpose Cell */}
                    <td className="p-2">
                      <input 
                        type="text" 
                        value={row.purpose} 
                        onChange={(e) => handleCellChange(i, 'purpose', e.target.value)}
                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-center text-slate-700 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </td>

                    {/* Lease Cell (Merged or Individual) */}
                    {isMerged ? (
                      i === 0 ? (
                        <td 
                          rowSpan={floorStatus.length} 
                          className="p-4 bg-orange-50/20 border-x border-orange-100 text-center font-extrabold text-orange-600"
                        >
                          <div className="flex flex-col items-center justify-center h-full min-h-[80px] gap-1">
                            <span className="text-xs uppercase bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                              세로 병합 활성화됨
                            </span>
                            <span className="text-slate-700 text-sm mt-1">{mergeText}</span>
                          </div>
                        </td>
                      ) : null
                    ) : (
                      <td className="p-2">
                        <input 
                          type="text" 
                          value={row.lease} 
                          onChange={(e) => handleCellChange(i, 'lease', e.target.value)}
                          className="w-full border border-slate-200 rounded px-2 py-1.5 text-slate-700 focus:ring-1 focus:ring-blue-500 outline-none font-bold text-center"
                        />
                      </td>
                    )}

                    {/* Status Cell */}
                    <td className="p-2">
                      <input 
                        type="text" 
                        value={row.status} 
                        onChange={(e) => handleCellChange(i, 'status', e.target.value)}
                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-center text-slate-700 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </td>

                    {/* Note Cell */}
                    <td className="p-2">
                      <input 
                        type="text" 
                        value={row.note} 
                        onChange={(e) => handleCellChange(i, 'note', e.target.value)}
                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-slate-600 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Row Button */}
          <button
            type="button"
            onClick={addRow}
            className="w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-dashed border-blue-200 hover:scale-[1.01] active:scale-[0.99]"
          >
            <PlusIcon className="w-4 h-4" /> 층별현황 행(Row) 추가하기
          </button>

        </div>

        {/* Modal Footer */}
        <div className="px-8 py-5 border-t border-gray-100 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-[10px] text-slate-400">
            * 층별 점유 및 임대 표 데이터는 변경 시 실시간으로 보고서 템플릿에 저장됩니다.
          </span>
          <button 
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-1.5"
          >
            <CheckIcon className="w-4 h-4" /> 입력 완료 및 닫기
          </button>
        </div>

      </div>
    </div>
  );
};

export default TableEditorModal;
