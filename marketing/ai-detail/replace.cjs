const fs = require('fs');
const file = 'components/FlyerCanvas.tsx';
let content = fs.readFileSync(file, 'utf8');

const editClass = " outline-none focus:outline focus:outline-2 focus:outline-sky-400 focus:bg-sky-400/10 hover:ring-1 hover:ring-sky-300 rounded transition-all cursor-text";

// 1. Define editClass in the component
content = content.replace(
  '  const placeholder = "https://placehold.co/860x600/e2e8f0/1e293b?text=Property";',
  '  const editClass = "' + editClass.trim() + '";\n  const placeholder = "https://placehold.co/860x600/e2e8f0/1e293b?text=Property";'
);

// 2. Replace existing hover/outline classes with ${editClass}
content = content.replace(/outline-none hover:bg-white\/20 transition-colors cursor-text/g, '${editClass}');
content = content.replace(/outline-none hover:bg-black\/5 transition-colors cursor-text/g, '${editClass}');

// 3. Add to "거래 유형"
content = content.replace(
  '{info.transactionType || \'거래 유형\'}',
  '<span contentEditable suppressContentEditableWarning onBlur={(e) => onTextChange?.(\'transactionType\', e.currentTarget.innerText)} className={editClass}>{info.transactionType || \'거래 유형\'}</span>'
);

// 4. Add to Prestige Collection
content = content.replace(
  '<span className="mb-4 text-xl md:text-2xl font-serif-en italic" style={{ color: secondaryColor }}>Prestige Collection</span>',
  '<span contentEditable suppressContentEditableWarning className={`mb-4 text-xl md:text-2xl font-serif-en italic ${editClass}`} style={{ color: secondaryColor }}>Prestige Collection</span>'
);

// 5. Add to PREMIUM
content = content.replace(
  '<span className="text-xl md:text-3xl font-bold text-gray-800 tracking-widest">PREMIUM</span>',
  '<span contentEditable suppressContentEditableWarning className={`text-xl md:text-3xl font-bold text-gray-800 tracking-widest ${editClass}`}>PREMIUM</span>'
);

// 6. Add to layout type4 transaction type
content = content.replace(
  '<div className="text-xs md:text-sm font-bold tracking-widest mb-2 text-gray-500 uppercase">{info.transactionType}</div>',
  '<div contentEditable suppressContentEditableWarning onBlur={(e) => onTextChange?.(\'transactionType\', e.currentTarget.innerText)} className={`text-xs md:text-sm font-bold tracking-widest mb-2 text-gray-500 uppercase ${editClass}`}>{info.transactionType}</div>'
);

// 7. Add to Residence
content = content.replace(
  '<p className="text-white/80 text-sm md:text-lg tracking-[0.5em] mb-4 uppercase font-light">Residence</p>',
  '<p contentEditable suppressContentEditableWarning className={`text-white/80 text-sm md:text-lg tracking-[0.5em] mb-4 uppercase font-light ${editClass}`}>Residence</p>'
);

// 8. Add to section headers
content = content.replace(
  '<div className="font-serif-en italic text-base md:text-lg mb-2 tracking-wide" style={{ color: secondaryColor }}>{intro}</div>',
  '<div contentEditable suppressContentEditableWarning className={`font-serif-en italic text-base md:text-lg mb-2 tracking-wide ${editClass}`} style={{ color: secondaryColor }}>{intro}</div>'
);
content = content.replace(
  '<h2 className={`text-2xl md:text-3xl font-bold text-gray-800 mb-6 ${headingFont}`}>{title}</h2>',
  '<h2 contentEditable suppressContentEditableWarning className={`text-2xl md:text-3xl font-bold text-gray-800 mb-6 ${headingFont} ${editClass}`}>{title}</h2>'
);
content = content.replace(
  '<p className="mt-4 text-gray-500 max-w-xl font-serif-kr text-sm md:text-base">{description}</p>',
  '<p contentEditable suppressContentEditableWarning className={`mt-4 text-gray-500 max-w-xl font-serif-kr text-sm md:text-base ${editClass}`}>{description}</p>'
);

// type 3 section header
content = content.replace(
  '<span className="text-sm font-bold tracking-widest uppercase text-gray-400 mb-1 block">{intro}</span>',
  '<span contentEditable suppressContentEditableWarning className={`text-sm font-bold tracking-widest uppercase text-gray-400 mb-1 block ${editClass}`}>{intro}</span>'
);
content = content.replace(
  '<h2 className={`text-2xl md:text-3xl font-bold text-gray-800 ${headingFont}`} style={{ color: primaryColor }}>{title}</h2>',
  '<h2 contentEditable suppressContentEditableWarning className={`text-2xl md:text-3xl font-bold text-gray-800 ${headingFont} ${editClass}`} style={{ color: primaryColor }}>{title}</h2>'
);
content = content.replace(
  '<p className="mt-2 text-gray-600 text-sm md:text-base">{description}</p>',
  '<p contentEditable suppressContentEditableWarning className={`mt-2 text-gray-600 text-sm md:text-base ${editClass}`}>{description}</p>'
);

// type 4 section header
content = content.replace(
  '<h2 className={`text-2xl md:text-3xl font-extrabold text-gray-900 uppercase ${headingFont}`}>{title}</h2>',
  '<h2 contentEditable suppressContentEditableWarning className={`text-2xl md:text-3xl font-extrabold text-gray-900 uppercase ${headingFont} ${editClass}`}>{title}</h2>'
);
content = content.replace(
  '<span className="text-sm font-bold text-gray-400 tracking-widest">{intro}</span>',
  '<span contentEditable suppressContentEditableWarning className={`text-sm font-bold text-gray-400 tracking-widest ${editClass}`}>{intro}</span>'
);

// type 5 section header
content = content.replace(
  '<h2 className={`text-4xl md:text-5xl font-thin text-gray-900 mb-2 ${headingFont}`}>{title}</h2>',
  '<h2 contentEditable suppressContentEditableWarning className={`text-4xl md:text-5xl font-thin text-gray-900 mb-2 ${headingFont} ${editClass}`}>{title}</h2>'
);
content = content.replace(
  '<p className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em]">{intro}</p>',
  '<p contentEditable suppressContentEditableWarning className={`text-xs font-bold text-gray-400 uppercase tracking-[0.3em] ${editClass}`}>{intro}</p>'
);
content = content.replace(
  '<p className="mt-6 text-lg md:text-xl font-light text-gray-600">{description}</p>',
  '<p contentEditable suppressContentEditableWarning className={`mt-6 text-lg md:text-xl font-light text-gray-600 ${editClass}`}>{description}</p>'
);

// default section header
content = content.replace(
  '<div className="font-serif-en italic text-base md:text-lg mb-2 tracking-wide" style={{ color: primaryColor }}>{intro}</div>',
  '<div contentEditable suppressContentEditableWarning className={`font-serif-en italic text-base md:text-lg mb-2 tracking-wide ${editClass}`} style={{ color: primaryColor }}>{intro}</div>'
);
content = content.replace(
  '<p className="mt-4 text-gray-500 max-w-xl text-sm md:text-base">{description}</p>',
  '<p contentEditable suppressContentEditableWarning className={`mt-4 text-gray-500 max-w-xl text-sm md:text-base ${editClass}`}>{description}</p>'
);

// Stats labels
content = content.replace(
  '<span className="text-[10px] text-gray-400 font-bold tracking-widest mb-1 uppercase">{item.label}</span>',
  '<span contentEditable suppressContentEditableWarning className={`text-[10px] text-gray-400 font-bold tracking-widest mb-1 uppercase ${editClass}`}>{item.label}</span>'
);
content = content.replace(
  '<span className="text-[10px] text-gray-400 mt-1">{item.sub}</span>',
  '<span contentEditable suppressContentEditableWarning className={`text-[10px] text-gray-400 mt-1 ${editClass}`}>{item.sub}</span>'
);
content = content.replace(
  '<span className="text-xs uppercase tracking-widest text-gray-500 font-serif-en">{item.label}</span>',
  '<span contentEditable suppressContentEditableWarning className={`text-xs uppercase tracking-widest text-gray-500 font-serif-en ${editClass}`}>{item.label}</span>'
);
content = content.replace(
  '<span className="block text-sm opacity-70 mb-1">{item.sub}</span>',
  '<span contentEditable suppressContentEditableWarning className={`block text-sm opacity-70 mb-1 ${editClass}`}>{item.sub}</span>'
);
content = content.replace(
  '<span className="block text-xs font-bold text-gray-400 uppercase mb-2">{item.label}</span>',
  '<span contentEditable suppressContentEditableWarning className={`block text-xs font-bold text-gray-400 uppercase mb-2 ${editClass}`}>{item.label}</span>'
);
content = content.replace(
  '<span className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">{item.label}</span>',
  '<span contentEditable suppressContentEditableWarning className={`text-xs font-bold text-gray-500 uppercase tracking-[0.2em] ${editClass}`}>{item.label}</span>'
);

fs.writeFileSync(file, content, 'utf8');
