const fs = require('fs');
let code = fs.readFileSync('components/FlyerCanvas.tsx', 'utf8');

// Fix span closing tags missing <
code = code.replace(/\?\?\/span>/g, '</span>');
code = code.replace(/\?\/span>/g, '</span>');

// Fix string literals that start with ' or \" but don't close before the end of line
const lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  if (line.includes('value={info.page2HighlightBoxTitle ||')) lines[i] = '                                            value={info.page2HighlightBoxTitle || \"매물 핵심 하이라이트\"}';
  if (line.includes('value={(info as any).page2ChartBoxTitle ||')) lines[i] = '                                        value={(info as any).page2ChartBoxTitle || \"주변 시세 리포트\"}';
  if (line.includes('{showChart ? \"') && line.includes(': \"')) lines[i] = '                                    {showChart ? \"차트 숨기기\" : \"차트 보이기\"}';
  if (line.includes('title={info.page5Title ||')) lines[i] = '                        title={info.page5Title || \"입지 및 위치도\"}';
  if (line.includes('value={(info as any).leaseSummaryText ||')) lines[i] = '                                        value={(info as any).leaseSummaryText || \"총 6개 층 / 보증금 0원 / 월세 0원\"}';
  if (line.includes('headers: [\"') && !line.includes('\"]')) lines[i] = '        headers: [\"층수\", \"호실\", \"면적\", \"금액\", \"용도\", \"비고\"],';
  if (line.includes('{ type: \"kakao\", label:')) lines[i] = '                                    { type: \"kakao\", label: \"카카오맵\" },';
  if (line.includes('{ type: \"google\", label:')) lines[i] = '                                    { type: \"google\", label: \"구글맵\" },';
  
  // Fix lease table default rows missing quotes
  if (line.includes('{ floor: \'')) lines[i] = '          { floor: \'해당층\', purpose: \'용도\', lease: \'임대차\', status: \'상태\', note: \'비고\' }';
  
  // Fix other errors from tsc_errors.txt
  if (line.includes('title={info.subTitle1 || ')) lines[i] = '                                  <EditableText value={info.subTitle1 || \"시나리오 1 주요 키워드 안내\"} onChange={(val) => handleTextChange(\'subTitle1\', val)} />';
  if (line.includes('value={(info as any).valuationAdvisoryTitle ||')) lines[i] = '                                    <EditableText value={(info as any).valuationAdvisoryTitle || \"STRATEGIC ADVISORY\"} onChange={(val) => handleTextChange(\'valuationAdvisoryTitle\', val)} />';
  
  if (line.includes('<div className=\"absolute inset-x-0 top-0 h-1 bg-white/20 rounded-t\"></div>')) {
      // Need to fix JSX closing tags around line 1315
  }
}

fs.writeFileSync('components/FlyerCanvas.tsx', lines.join('\n'));
