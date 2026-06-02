const fs = require('fs');
const file = 'components/FlyerCanvas.tsx';
let content = fs.readFileSync(file, 'utf8');

const editClass = " outline-none focus:outline focus:outline-2 focus:outline-sky-400 focus:bg-sky-400/10 hover:ring-1 hover:ring-sky-300 rounded transition-all cursor-text";

// Basic Info
content = content.replace(
  '<span className="font-bold text-xs tracking-widest block mb-1" style={{ color: primaryColor }}>PROPERTY INFO</span>',
  '<span contentEditable suppressContentEditableWarning className={`font-bold text-xs tracking-widest block mb-1 ${editClass}`} style={{ color: primaryColor }}>PROPERTY INFO</span>'
);

content = content.replace(
  '<h2 className={`text-2xl md:text-3xl font-bold text-gray-800 ${headingFont}`}>매물 상세 정보</h2>',
  '<h2 contentEditable suppressContentEditableWarning className={`text-2xl md:text-3xl font-bold text-gray-800 ${headingFont} ${editClass}`}>매물 상세 정보</h2>'
);

content = content.replace(
  '<span className="text-gray-400 text-xs block mb-1">월 관리비</span>',
  '<span contentEditable suppressContentEditableWarning className={`text-gray-400 text-xs block mb-1 ${editClass}`}>월 관리비</span>'
);

content = content.replace(
  '<span className="text-xl font-bold text-gray-800">{info.managementFee}</span>',
  '<span contentEditable suppressContentEditableWarning onBlur={(e) => onTextChange?.(\'managementFee\', e.currentTarget.innerText)} className={`text-xl font-bold text-gray-800 ${editClass}`}>{info.managementFee}</span>'
);

// Grid (area, floor, direction, parking, options)
content = content.replace(
  '<span className="text-gray-700 font-bold text-[16px] md:text-sm">{item.l}</span>',
  '<span contentEditable suppressContentEditableWarning className={`text-gray-700 font-bold text-[16px] md:text-sm ${editClass}`}>{item.l}</span>'
);

content = content.replace(
  '<span className="font-extrabold text-gray-950 text-[18px] md:text-[15px]">{item.v}</span>',
  '<span contentEditable suppressContentEditableWarning onBlur={(e) => { if (item.l === \'공급/전용면적\') onTextChange?.(\'area\', e.currentTarget.innerText); else if (item.l === \'해당층/총층\') onTextChange?.(\'floor\', e.currentTarget.innerText); else if (item.l === \'방향\') onTextChange?.(\'direction\', e.currentTarget.innerText); else if (item.l === \'주차가능대수\') onTextChange?.(\'parking\', e.currentTarget.innerText); else onTextChange?.(\'options\', e.currentTarget.innerText); }} className={`font-extrabold text-gray-950 text-[18px] md:text-[15px] ${editClass}`}>{item.v}</span>'
);

// Notice Title
content = content.replace(
  '{info.noticeTitle || "DETAIL INFO"}',
  '<span contentEditable suppressContentEditableWarning onBlur={(e) => onTextChange?.(\'noticeTitle\', e.currentTarget.innerText)} className={editClass}>{info.noticeTitle || "DETAIL INFO"}</span>'
);

// Notice Content
content = content.replace(
  '<p className={`text-gray-950 text-[17px] md:text-sm font-bold leading-relaxed whitespace-pre-wrap ${bodyFont}`}>\n                        {info.noticeContent}\n                    </p>',
  '<p contentEditable suppressContentEditableWarning onBlur={(e) => onTextChange?.(\'noticeContent\', e.currentTarget.innerText)} className={`text-gray-950 text-[17px] md:text-sm font-bold leading-relaxed whitespace-pre-wrap ${bodyFont} ${editClass}`}>\n                        {info.noticeContent}\n                    </p>'
);

// Agent info
content = content.replace(
  '<span className={`text-sm font-bold tracking-widest mb-6 block ${layout === \'type4\' ? \'text-gray-400\' : \'\'}`} style={{ color: layout === \'type4\' ? undefined : primaryColor }}>CONTACT AGENT</span>',
  '<span contentEditable suppressContentEditableWarning className={`text-sm font-bold tracking-widest mb-6 block ${layout === \'type4\' ? \'text-gray-400\' : \'\'} ${editClass}`} style={{ color: layout === \'type4\' ? undefined : primaryColor }}>CONTACT AGENT</span>'
);

content = content.replace(
  '<p className={`font-bold text-2xl md:text-3xl ${headingFont}`}>{info.agentName}</p>',
  '<p contentEditable suppressContentEditableWarning onBlur={(e) => onTextChange?.(\'agentName\', e.currentTarget.innerText)} className={`font-bold text-2xl md:text-3xl ${headingFont} ${editClass}`}>{info.agentName}</p>'
);

content = content.replace(
  '<p className={`text-base font-medium mb-6 ${layout === \'type4\' ? \'text-gray-500\' : \'text-gray-400\'}`}>{info.agentRepresentative}</p>',
  '<p contentEditable suppressContentEditableWarning onBlur={(e) => onTextChange?.(\'agentRepresentative\', e.currentTarget.innerText)} className={`text-base font-medium mb-6 ${layout === \'type4\' ? \'text-gray-500\' : \'text-gray-400\'} ${editClass}`}>{info.agentRepresentative}</p>'
);

content = content.replace(
  '<a href={`tel:${info.agentPhone}`} className={`text-3xl md:text-4xl font-bold font-serif-en hover:opacity-80 transition-colors ${layout === \'type4\' ? \'text-gray-900\' : \'text-white\'}`}>\n                                {info.agentPhone}\n                            </a>',
  '<a contentEditable suppressContentEditableWarning onBlur={(e) => onTextChange?.(\'agentPhone\', e.currentTarget.innerText)} href={`tel:${info.agentPhone}`} className={`text-3xl md:text-4xl font-bold font-serif-en hover:opacity-80 transition-colors ${layout === \'type4\' ? \'text-gray-900\' : \'text-white\'} ${editClass}`}>\n                                {info.agentPhone}\n                            </a>'
);

content = content.replace(
  '<a href={`tel:${info.agentMobile}`} className={`text-3xl md:text-4xl font-bold font-serif-en hover:opacity-80 transition-colors ${layout === \'type4\' ? \'text-gray-900\' : \'text-white\'}`}>\n                                        {info.agentMobile}\n                                    </a>',
  '<a contentEditable suppressContentEditableWarning onBlur={(e) => onTextChange?.(\'agentMobile\', e.currentTarget.innerText)} href={`tel:${info.agentMobile}`} className={`text-3xl md:text-4xl font-bold font-serif-en hover:opacity-80 transition-colors ${layout === \'type4\' ? \'text-gray-900\' : \'text-white\'} ${editClass}`}>\n                                        {info.agentMobile}\n                                    </a>'
);

content = content.replace(
  '<p key={idx} className={`text-base mb-1 ${layout === \'type4\' ? \'text-gray-500\' : \'text-gray-400\'}`}>{infoLine}</p>',
  '<p key={idx} contentEditable suppressContentEditableWarning onBlur={(e) => { const lines = [...(info.agentAdditionalInfo || [])]; lines[idx] = e.currentTarget.innerText; onTextChange?.(\'agentAdditionalInfo\' as any, lines as any); }} className={`text-base mb-1 ${layout === \'type4\' ? \'text-gray-500\' : \'text-gray-400\'} ${editClass}`}>{infoLine}</p>'
);

fs.writeFileSync(file, content, 'utf8');
