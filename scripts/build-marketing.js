const { execSync } = require('child_process');
const path = require('path');

const subprojects = [
  'marketing/ai-detail',
  'marketing/report',
  'marketing/remodeling',
  'marketing/home-interior',
  'marketing/studio'
];

try {
  for (const sub of subprojects) {
    const dir = path.join(__dirname, '..', sub);
    console.log(`\n=== [Vercel Build] Installing & Building: ${sub} ===`);
    execSync('npm install', { cwd: dir, stdio: 'inherit' });
    execSync('npm run build', { cwd: dir, stdio: 'inherit' });
    console.log(`=== [Vercel Build] Completed: ${sub} ===\n`);
  }
  console.log('=== ALL MARKETING SUBPROJECTS BUILT SUCCESSFULLY ===');
} catch (error) {
  console.error('Subproject build failed with error:', error);
  process.exit(1);
}
