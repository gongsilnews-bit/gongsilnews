const fs = require('fs');
let content = fs.readFileSync('marketing/report/components/FlyerForm.tsx', 'utf8');

[1, 2, 3, 4, 5, 6].forEach(num => {
  const findStr = `{(activeTab === 'all' || activeTab === ${num}) && (`;
  const replaceStr = `{(activeTab === ${num} || (activeTab === 'all' && (info.visiblePages || [1, 2, 3, 4, 5, 6]).includes(${num}))) && (`;
  content = content.replace(findStr, replaceStr);
});

fs.writeFileSync('marketing/report/components/FlyerForm.tsx', content);
console.log('Done');
