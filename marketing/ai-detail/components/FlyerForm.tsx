
import React from 'react';
import { PropertyInfo, TransactionType, FlyerColor, FlyerLayout, FlyerRow } from '../types';
import { GROUP_NAME, FlyerGroup } from '../flyerRows';
import { PhotoIcon, DocumentTextIcon, PlusIcon, TrashIcon, SwatchIcon, RectangleGroupIcon } from '@heroicons/react/24/outline';

interface FlyerFormProps {
  info: PropertyInfo;
  setInfo: (info: PropertyInfo) => void;
  onImageUpload: (key: string, file: File) => void;
  uploadedImages: Record<string, string | null | any>;
  colors: FlyerColor[];
  layouts: FlyerLayout[];
  currentColor: FlyerColor;
  currentLayout: FlyerLayout;
  onColorSelect: (color: FlyerColor) => void;
  onLayoutSelect: (layout: FlyerLayout) => void;
  isUploadingImage?: Record<string, boolean>;
}

const FlyerForm: React.FC<FlyerFormProps> = ({ 
    info, setInfo, onImageUpload, uploadedImages, 
    colors, layouts, currentColor, currentLayout, onColorSelect, onLayoutSelect, isUploadingImage
}) => {

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInfo({ ...info, [name]: value });
  };

  const handleTransactionChange = (type: TransactionType) => {
      setInfo({ ...info, transactionType: type });
  };

  const handleFileChange = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageUpload(key, e.target.files[0]);
    }
  };

  const addAgentInfoItem = () => {
    const current = info.agentAdditionalInfo || [];
    setInfo({ ...info, agentAdditionalInfo: [...current, ""] });
  };

  const removeAgentInfoItem = (index: number) => {
    const current = info.agentAdditionalInfo || [];
    setInfo({ ...info, agentAdditionalInfo: current.filter((_, i) => i !== index) });
  };

  const updateAgentInfoItem = (index: number, value: string) => {
    const current = info.agentAdditionalInfo || [];
    const updated = [...current];
    updated[index] = value;
    setInfo({ ...info, agentAdditionalInfo: updated });
  };

  const clearAgentInfo = () => {
    if(confirm("중개사 정보를 초기화하시겠습니까?")) {
        setInfo({ ...info, agentName: '', agentPhone: '', agentMobile: '', agentRepresentative: '', agentAdditionalInfo: [] });
    }
  };

  const adjustColor = (hex: string, percent: number): string => {
    let cleanHex = hex.replace(/^\s*#|\s*$/g, '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.replace(/(.)/g, '$1$1');
    }
    let r = parseInt(cleanHex.substring(0, 2), 16);
    let g = parseInt(cleanHex.substring(2, 4), 16);
    let b = parseInt(cleanHex.substring(4, 6), 16);

    r = Math.min(255, Math.max(0, r + Math.round(percent * 2.55)));
    g = Math.min(255, Math.max(0, g + Math.round(percent * 2.55)));
    b = Math.min(255, Math.max(0, b + Math.round(percent * 2.55)));

    const rHex = r.toString(16).padStart(2, '0');
    const gHex = g.toString(16).padStart(2, '0');
    const bHex = b.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
  };

  const primaryColor = currentColor.primary;

  // 홍보지에서 뺄 항목 — 체크를 끄면 hiddenFields 에 들어간다
  const hidden = info.hiddenFields || [];
  const shown = (key: string) => !hidden.includes(key);
  const toggle = (key: string, show: boolean) =>
    setInfo({ ...info, hiddenFields: show ? hidden.filter((k) => k !== key) : [...hidden.filter((k) => k !== key), key] });

  // 정보 표 — 지우기·고치기·추가·순서 바꾸기
  const rows: FlyerRow[] = info.rows ?? [];
  const setRows = (next: FlyerRow[]) => setInfo({ ...info, rows: next });
  const updateRow = (i: number, patch: Partial<FlyerRow>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const removeRow = (i: number) => setRows(rows.filter((_, j) => j !== i));
  const addRow = () => setRows([...rows, { id: `r${Date.now()}`, label: '', value: '' }]);
  const moveRow = (i: number, d: -1 | 1) => {
    const next = [...rows];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setRows(next);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
      
      {/* Design Theme Selection */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
             <SwatchIcon className="w-5 h-5" />
             디자인 색상 선택
        </h3>
        <div className="flex items-center gap-3 mb-6 flex-wrap">
            {colors.map(color => (
                <button
                    key={color.id}
                    onClick={() => onColorSelect(color)}
                    className={`w-10 h-10 rounded-full border-2 transition-all shadow-sm flex items-center justify-center ${currentColor.id === color.id ? 'border-gray-800 scale-110 ring-2 ring-offset-2 ring-gray-300' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: color.primary }}
                    title={color.name}
                >
                    {currentColor.id === color.id && <div className="w-2 h-2 bg-white rounded-full"></div>}
                </button>
            ))}

            {/* Custom Color Picker Swatch */}
            <div 
                className={`relative w-10 h-10 rounded-full border transition-all shadow-sm flex items-center justify-center cursor-pointer hover:scale-105 ${currentColor.id === 'custom' ? 'border-gray-800 scale-110 ring-2 ring-offset-2 ring-gray-300' : 'border-gray-200 hover:border-gray-300'}`}
                style={{ 
                    backgroundColor: currentColor.id === 'custom' ? '#f0f5fa' : '#ffffff'
                }}
                title="직접 색상 선택"
            >
                <input 
                    type="color"
                    value={currentColor.id === 'custom' ? currentColor.primary : '#00788c'}
                    onChange={(e) => {
                        const val = e.target.value;
                        onColorSelect({
                            id: 'custom',
                            name: '사용자 지정',
                            primary: val,
                            secondary: adjustColor(val, 40),
                            dark: adjustColor(val, -45)
                        });
                    }}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                />
                
                {/* Paintbrush icon matching user image */}
                <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    strokeWidth="1.8" 
                    stroke="currentColor" 
                    className={`w-5 h-5 transition-colors ${currentColor.id === 'custom' ? 'text-slate-800' : 'text-slate-400'}`}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122A3 3 0 0 0 13.5 20.38m-3.97-4.258 5.764-5.764L15 6.622l-1.242-.88 2.84-2.84a1.2 1.2 0 1 1 1.697 1.696L15.45 6.439l-.88-1.242-5.764 5.764M9.53 16.122a3 3 0 0 0-3.97-4.258m3.97 4.258H3" />
                </svg>

                {currentColor.id === 'custom' && (
                    <div 
                        className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border border-white shadow-sm"
                        style={{ backgroundColor: currentColor.primary }}
                    />
                )}
            </div>
        </div>

        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
             <RectangleGroupIcon className="w-5 h-5" />
             레이아웃 테마 선택
        </h3>
        <div className="grid grid-cols-4 gap-2">
             {layouts.map((layout, idx) => (
                 <button
                    key={layout.id}
                    onClick={() => onLayoutSelect(layout)}
                    className={`py-2 rounded-lg border text-xs font-bold transition-all flex flex-col items-center justify-center ${currentLayout.id === layout.id ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                 >
                     <span className="block text-lg mb-0.5">{idx + 1}</span>
                     <span className="text-[10px] text-center leading-tight">{layout.name.replace(' ', '\n')}</span>
                 </button>
             ))}
        </div>
      </div>



      <div className="mb-5 border-b pb-3">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <DocumentTextIcon className="w-6 h-6" style={{ color: primaryColor }} />
          홍보지 내용
        </h2>
        <p className="text-[11px] text-gray-400 mt-1">항목 오른쪽 [표시]를 끄면 홍보지에서 빠집니다. 물건명·금액·사무소명·전화번호는 항상 나옵니다.</p>
      </div>

      <div className="space-y-5">

        {/* ① 물건 */}
        <Group title="물건" color={primaryColor}>
            <Field label="물건명">
                <Input name="address" value={info.address} onChange={handleChange} color={primaryColor} placeholder="예: 래미안 퍼스티지" />
            </Field>
            <Field label="딱지 (빨간 표시)">
                <div className="flex gap-1.5 flex-wrap">
                    {['', '급매', '초급매', '신규', '가격조정'].map((b) => (
                        <button key={b || 'none'} type="button" onClick={() => setInfo({ ...info, badge: b })}
                            className="px-3 py-1.5 text-xs font-bold rounded border transition-colors"
                            style={{
                                backgroundColor: (info.badge || '') === b ? (b ? '#e11d2a' : '#374151') : 'white',
                                color: (info.badge || '') === b ? 'white' : '#4b5563',
                                borderColor: (info.badge || '') === b ? (b ? '#e11d2a' : '#374151') : '#e5e7eb',
                            }}>
                            {b || '없음'}
                        </button>
                    ))}
                </div>
            </Field>
            <Field label="대표 사진" show={info.showPhoto !== false} onShow={(v) => setInfo({ ...info, showPhoto: v })}>
                <div className="border-2 border-dashed border-gray-300 rounded-lg relative hover:bg-gray-50 transition-colors group overflow-hidden h-28 flex items-center justify-center bg-gray-50">
                    {uploadedImages.mainImage ? <img src={uploadedImages.mainImage} className="absolute inset-0 w-full h-full object-cover" /> : null}
                    {isUploadingImage && isUploadingImage.mainImage ? (
                        <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white text-xs font-bold z-30">압축 및 저장 중...</div>
                    ) : (
                        <div className={`flex flex-col items-center relative z-10 ${uploadedImages.mainImage ? 'bg-white/80 px-2 py-1 rounded' : ''}`}>
                            <PhotoIcon className="w-5 h-5 text-gray-400" />
                            <span className="text-[11px] text-gray-500 mt-0.5">클릭하여 사진 바꾸기</span>
                        </div>
                    )}
                    <input type="file" accept="image/*" onChange={handleFileChange('mainImage')}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        disabled={isUploadingImage && !!isUploadingImage.mainImage} />
                </div>
            </Field>
        </Group>

        {/* ② 거래구분 · ③ 금액 */}
        <Group title="거래구분 · 금액" color={primaryColor}>
            <Field label="거래구분" show={shown('transactionType')} onShow={(v) => toggle('transactionType', v)}>
                <div className="flex gap-1.5">
                    {['매매', '전세', '월세', '단기임대'].map((type) => (
                        <button key={type} type="button" onClick={() => handleTransactionChange(type as TransactionType)}
                            className="flex-1 py-2 text-xs font-bold rounded border transition-colors"
                            style={{
                                backgroundColor: info.transactionType === type ? primaryColor : 'white',
                                color: info.transactionType === type ? 'white' : '#4b5563',
                                borderColor: info.transactionType === type ? primaryColor : '#e5e7eb',
                            }}>
                            {type}
                        </button>
                    ))}
                </div>
            </Field>
            {/* 금액은 열 때마다 공실관리 값으로 채운다 — 여기서 고쳐도 되돌아가므로 잠가 둔다 */}
            <div className="grid grid-cols-2 gap-2">
                <Field label={info.transactionType === '매매' ? '매매가' : '보증금'}>
                    <Input name="priceMain" value={info.priceMain} readOnly color={primaryColor} />
                </Field>
                {(info.transactionType === '월세' || info.transactionType === '단기임대') && (
                    <Field label="월세">
                        <Input name="priceSub" value={info.priceSub} readOnly color={primaryColor} />
                    </Field>
                )}
            </div>
            <p className="text-[11px] text-gray-400 -mt-1">금액은 공실관리의 매물 정보에서 수정해 주세요. (홍보지를 열 때마다 최신 금액으로 채워집니다)</p>
        </Group>

        {/* ④ 크기 · 정보 표 — 물건 종류에 맞춰 처음 채우고, 사장님이 지우고·고치고·추가한다 */}
        <Group title={`크기 · 정보 표${info.flyerGroup ? ` (${GROUP_NAME[info.flyerGroup as FlyerGroup] || ''})` : ''}`} color={primaryColor}>
            <Field label="크기 줄 (물건명 아래 크게)" show={shown('sizeLine')} onShow={(v) => toggle('sizeLine', v)}>
                <Input name="sizeLine" value={info.sizeLine ?? ''} onChange={handleChange} color={primaryColor} placeholder="예: 46평 · 25층 / 전용 30평 · 3층/10층" />
            </Field>
            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-500">정보 표 항목</label>
                    <span className="text-[11px] text-gray-400">✕ 로 삭제 · 값이 빈 항목은 홍보지에 안 나옴</span>
                </div>
                <div className="space-y-1.5">
                    {rows.map((r, i) => (
                        <div key={r.id} className="flex gap-1.5 items-center">
                            <input value={r.label} onChange={(e) => updateRow(i, { label: e.target.value })}
                                className="w-[88px] shrink-0 px-2 py-1.5 text-xs font-bold border rounded outline-none focus:ring-1 bg-white"
                                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties} placeholder="항목" />
                            <input value={r.value} onChange={(e) => updateRow(i, { value: e.target.value })}
                                className="flex-1 min-w-0 px-2 py-1.5 text-xs border rounded outline-none focus:ring-1 bg-white"
                                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties} placeholder="내용" />
                            <button type="button" onClick={() => moveRow(i, -1)} disabled={i === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs px-0.5" title="위로">▲</button>
                            <button type="button" onClick={() => moveRow(i, 1)} disabled={i === rows.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs px-0.5" title="아래로">▼</button>
                            <button type="button" onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600 font-bold text-sm px-1" title="이 항목 삭제">✕</button>
                        </div>
                    ))}
                </div>
                <button type="button" onClick={addRow}
                    className="w-full mt-2 py-1.5 border border-dashed rounded text-xs font-bold flex items-center justify-center gap-1 hover:opacity-70"
                    style={{ borderColor: primaryColor, color: primaryColor }}>
                    <PlusIcon className="w-3 h-3" /> 항목 추가 (예: 세대수, 커뮤니티)
                </button>
            </div>
        </Group>

        {/* ⑥ 특징 */}
        <Group title="특징" color={primaryColor}>
            <Field label="특징 설명 (소개글)" show={shown('noticeContent')} onShow={(v) => toggle('noticeContent', v)}>
                <textarea name="noticeContent" value={info.noticeContent} onChange={handleChange} rows={4}
                    className="w-full px-3 py-2 text-xs border rounded outline-none focus:ring-1"
                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                    placeholder="역세권, 올수리, 채광 좋음 등 — 길면 홍보지 칸에 맞게 글자가 줄어듭니다" />
            </Field>
        </Group>

        {/* ⑦ 연락처 */}
        <Group title="연락처" color={primaryColor} action={
            <button type="button" onClick={clearAgentInfo} className="text-red-400 hover:text-red-600 p-1 bg-white rounded-full shadow-sm border border-gray-100" title="연락처 비우기"><TrashIcon className="w-3.5 h-3.5" /></button>
        }>
            <Field label="사무소명">
                <Input name="agentName" value={info.agentName} onChange={handleChange} color={primaryColor} placeholder="예: 래미안 공인중개사사무소" />
            </Field>
            <Field label="대표 · 등록번호 줄" show={shown('agentRepresentative')} onShow={(v) => toggle('agentRepresentative', v)}>
                <Input name="agentRepresentative" value={info.agentRepresentative} onChange={handleChange} color={primaryColor} placeholder="예: 대표 공인중개사 홍길동" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
                <Field label="휴대전화 (크게 표시)">
                    <Input name="agentMobile" value={info.agentMobile || ''} onChange={handleChange} color={primaryColor} placeholder="010-1234-5678" />
                </Field>
                <Field label="일반전화 (휴대전화 없을 때)">
                    <Input name="agentPhone" value={info.agentPhone} onChange={handleChange} color={primaryColor} placeholder="02-123-4567" />
                </Field>
            </div>
            {(info.agentAdditionalInfo || []).map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                    <input value={item} onChange={(e) => updateAgentInfoItem(idx, e.target.value)}
                        className="flex-1 px-2 py-1.5 text-xs border rounded outline-none focus:ring-1"
                        style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                        placeholder="추가 정보 (예: 등록번호 11650-2018-00170)" />
                    <button onClick={() => removeAgentInfoItem(idx)} className="text-red-300 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                </div>
            ))}
            <button onClick={addAgentInfoItem}
                className="w-full py-1.5 border border-dashed rounded text-xs font-bold flex items-center justify-center gap-1 hover:opacity-70"
                style={{ borderColor: primaryColor, color: primaryColor }}>
                <PlusIcon className="w-3 h-3" /> 추가 정보 (등록번호 등)
            </button>
            <Field label="QR 코드 (매물 상세보기)" show={shown('qr')} onShow={(v) => toggle('qr', v)}>
                <p className="text-[11px] text-gray-400">휴대폰으로 찍으면 이 매물의 상세 페이지(사진·위치)가 열립니다.</p>
            </Field>
        </Group>

      </div>
    </div>
  );
};

/* ── 입력란 조각 ── */

const Group: React.FC<{ title: string; color: string; action?: React.ReactNode; children: React.ReactNode }> = ({ title, color, action, children }) => (
    <div className="space-y-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between">
            <span className="text-white text-[11px] px-2 py-0.5 rounded font-bold" style={{ backgroundColor: color }}>{title}</span>
            {action}
        </div>
        {children}
    </div>
);

/** 칸 하나. show/onShow 를 주면 오른쪽에 [표시] 체크가 붙는다 (끄면 홍보지에서 빠짐) */
const Field: React.FC<{ label: string; show?: boolean; onShow?: (v: boolean) => void; children: React.ReactNode }> = ({ label, show, onShow, children }) => (
    <div className={onShow && show === false ? 'opacity-45' : ''}>
        <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-gray-500">{label}</label>
            {onShow && (
                <label className="flex items-center gap-1 text-[11px] font-bold text-gray-500 cursor-pointer select-none" title="끄면 홍보지에서 빠집니다">
                    <input type="checkbox" checked={show !== false} onChange={(e) => onShow(e.target.checked)} className="w-3.5 h-3.5" />
                    표시
                </label>
            )}
        </div>
        {children}
    </div>
);

const Input: React.FC<{ name: string; value: string; color: string; placeholder?: string; readOnly?: boolean; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ name, value, color, placeholder, readOnly, onChange }) => (
    <input name={name} value={value || ''} onChange={onChange} readOnly={readOnly} placeholder={placeholder}
        className={`w-full px-2.5 py-1.5 text-sm border rounded outline-none focus:ring-1 ${readOnly ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-white'}`}
        style={{ '--tw-ring-color': color } as React.CSSProperties} />
);

export default FlyerForm;
