const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const extDir = path.resolve(__dirname, 'gongsilwriter30');
const manifest = JSON.parse(fs.readFileSync(path.join(extDir, 'manifest.json'), 'utf8'));
const version = manifest.version;
const zipName = `gongsilwriter30_v${version}.zip`;
const outExtZip = path.resolve(__dirname, zipName);
const outDesktopZip = path.resolve('c:/Users/user/Desktop', zipName);

console.log(`[ZIP] Packaging: ${manifest.name} (v${version})`);
console.log(`[ZIP] Source directory: ${extDir}`);

const items = [
  'manifest.json',
  'background.js',
  'panel.html',
  'panel.css',
  'panel.js',
  'blog.js',
  'sns.js',
  'youtube.js',
  'content-admin.js',
  'content-chatgpt.js',
  'content-gemini.js',
  'content-gongsil.js',
  'content-naver.js',
  'icons',
  'shared'
];

for (const item of items) {
  const p = path.join(extDir, item);
  if (!fs.existsSync(p)) {
    throw new Error(`Missing required item: ${item}`);
  }
}

const tempZip = path.join(extDir, zipName);
if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip);
if (fs.existsSync(outExtZip)) fs.unlinkSync(outExtZip);

const args = ['-a', '-c', '-f', tempZip, ...items];
console.log(`[ZIP] Running tar.exe in ${extDir}...`);
execSync(`tar.exe ${args.join(' ')}`, { cwd: extDir, stdio: 'inherit' });

fs.copyFileSync(tempZip, outExtZip);
try {
  fs.copyFileSync(tempZip, outDesktopZip);
} catch (e) {
  console.warn(`[ZIP] Note: Could not copy to desktop (${e.message})`);
}
fs.unlinkSync(tempZip);

console.log('\n[ZIP] Created package successfully:');
console.log(`  1. Project: ${outExtZip} (${(fs.statSync(outExtZip).size / 1024).toFixed(1)} KB)`);
if (fs.existsSync(outDesktopZip)) {
  console.log(`  2. Desktop: ${outDesktopZip} (${(fs.statSync(outDesktopZip).size / 1024).toFixed(1)} KB)`);
}

// Verify zip content listing
console.log('\n[ZIP] Archive contents verification:');
const listing = execSync(`tar.exe -tf "${outExtZip}"`).toString();
console.log(listing);
