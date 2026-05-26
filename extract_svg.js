const { execSync } = require('child_process');
const fs = require('fs');

try {
  const diff = execSync('git diff "src/app/(map)/gongsil/GongsilClient.tsx"', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  const lines = diff.split('\n');
  
  let foundIndex = -1;
  lines.forEach((line, index) => {
    if (line.includes("getOptionSvg")) {
      foundIndex = index;
    }
  });
  
  if (foundIndex !== -1) {
    const surrounding = lines.slice(Math.max(0, foundIndex - 20), Math.min(lines.length, foundIndex + 120));
    fs.writeFileSync('C:\\Users\\user\\.gemini\\antigravity\\brain\\ff1e3be4-a618-431b-a313-bfd5cfdaeae5\\scratch\\option_svg_code.txt', surrounding.join('\n'), 'utf8');
    console.log("Found getOptionSvg at index:", foundIndex);
  } else {
    console.log("getOptionSvg NOT found in current git diff. Checking git log...");
    // Let's search the entire git log for getOptionSvg!
    const logSearch = execSync('git log -S "getOptionSvg" --oneline', { encoding: 'utf8' });
    console.log("Commits with getOptionSvg:", logSearch);
  }
} catch (err) {
  console.error(err);
}
