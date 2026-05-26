const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('Retrieving GongsilClient.tsx at commit aef4a14...');
  const oldContent = execSync('git show aef4a14:"src/app/(map)/gongsil/GongsilClient.tsx"', {
    maxBuffer: 50 * 1024 * 1024,
    encoding: 'utf8'
  });

  const searchPattern = '{/* 중앙: 공실광고';
  const startIndex = oldContent.indexOf(searchPattern);
  if (startIndex === -1) {
    console.error('Could not find the start of the details panel!');
    process.exit(1);
  }

  console.log('Found start of details panel at character index:', startIndex);

  const lines = oldContent.substring(startIndex).split('\n');
  const blockText = lines.slice(0, 1200).join('\n');

  const outputPath = path.join(__dirname, 'old_detail_panel.txt');
  fs.writeFileSync(outputPath, blockText, 'utf8');
  console.log('Successfully wrote old detail panel content to:', outputPath);
} catch (err) {
  console.error('Error occurred:', err);
}
