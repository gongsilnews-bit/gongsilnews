const { execSync } = require('child_process');
const fs = require('fs');

try {
  const diff = execSync('git diff "src/app/(map)/gongsil/GongsilClient.tsx"', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  const lines = diff.split('\n');
  const indexedLines = lines.map((line, idx) => `${idx + 1}: ${line}`);
  fs.writeFileSync('C:\\Users\\user\\.gemini\\antigravity\\brain\\ff1e3be4-a618-431b-a313-bfd5cfdaeae5\\scratch\\full_diff.txt', indexedLines.join('\n'), 'utf8');
  console.log("Entire diff written to full_diff.txt. Total lines:", lines.length);
} catch (err) {
  console.error(err);
}
