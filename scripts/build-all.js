const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('=== STARTING SUBPROJECT BUILD (marketing/ai-detail) ===');
  
  const subprojectDir = path.join(__dirname, '../marketing/ai-detail');
  const targetPublicDir = path.join(__dirname, '../public/marketing/ai-detail');
  
  // 1. Install dependencies in subproject
  console.log('Installing subproject dependencies...');
  execSync('npm install', { cwd: subprojectDir, stdio: 'inherit' });
  
  // 2. Build subproject
  console.log('Building subproject...');
  execSync('npm run build', { cwd: subprojectDir, stdio: 'inherit' });
  
  console.log('Subproject build completed successfully! (Vite outputs directly to public)');
  
  console.log('=== STARTING SUBPROJECT BUILD (marketing/report) ===');
  const reportDir = path.join(__dirname, '../marketing/report');
  console.log('Installing report dependencies...');
  execSync('npm install', { cwd: reportDir, stdio: 'inherit' });
  console.log('Building report...');
  execSync('npm run build', { cwd: reportDir, stdio: 'inherit' });
  console.log('Report build completed successfully! (Vite outputs directly to public)');
  
  // 6. Run Next.js build
  console.log('=== RUNNING NEXT.JS BUILD ===');
  execSync('npx next build', { stdio: 'inherit' });
  
  console.log('=== ALL BUILDS COMPLETED SUCCESSFULLY ===');
} catch (error) {
  console.error('Build failed with error:', error);
  process.exit(1);
}
