const fs = require('fs');
const path = require('path');

const linksPath = path.join(__dirname, 'drone_links.json');
const links = JSON.parse(fs.readFileSync(linksPath, 'utf8'));

// 드론 영상만 (음악 영상 제외) 그리고 드라이브 링크가 존재하는 항목만 필터링
const droneLinks = links.filter(l => {
  if (l.title.includes('RealtyMusic') || l.title.includes('Music')) return false;
  return l.driveUrl !== null;
});

// 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM 추가
let csvContent = '\uFEFF';
csvContent += '영상 제목,구글드라이브 링크\n';

for (const l of droneLinks) {
  // 작은따옴표/큰따옴표 이스케이프 처리하여 안전하게 CSV 포맷팅
  const safeTitle = `"${l.title.replace(/"/g, '""')}"`;
  const safeLink = `"${l.driveUrl.replace(/"/g, '""')}"`;
  csvContent += `${safeTitle},${safeLink}\n`;
}

const outPath = path.join(__dirname, '..', '드론영상_구글드라이브_링크.csv');
fs.writeFileSync(outPath, csvContent, 'utf8');

console.log(`Exported ${droneLinks.length} drone files to ${outPath}`);
