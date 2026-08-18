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

  console.log('=== STARTING SUBPROJECT BUILD (marketing/remodeling) ===');
  const remodelingDir = path.join(__dirname, '../marketing/remodeling');
  console.log('Installing remodeling dependencies...');
  execSync('npm install', { cwd: remodelingDir, stdio: 'inherit' });
  console.log('Building remodeling...');
  execSync('npm run build', { cwd: remodelingDir, stdio: 'inherit' });
  console.log('Remodeling build completed successfully! (Vite outputs directly to public)');

  console.log('=== STARTING SUBPROJECT BUILD (marketing/home-interior) ===');
  const homeInteriorDir = path.join(__dirname, '../marketing/home-interior');
  console.log('Installing home-interior dependencies...');
  execSync('npm install', { cwd: homeInteriorDir, stdio: 'inherit' });
  console.log('Building home-interior...');
  execSync('npm run build', { cwd: homeInteriorDir, stdio: 'inherit' });
  console.log('Home-interior build completed successfully! (Vite outputs directly to public)');

  console.log('=== STARTING SUBPROJECT BUILD (marketing/studio) ===');
  const studioDir = path.join(__dirname, '../marketing/studio');
  console.log('Installing studio dependencies...');
  execSync('npm install', { cwd: studioDir, stdio: 'inherit' });
  console.log('Building studio...');
  execSync('npm run build', { cwd: studioDir, stdio: 'inherit' });
  console.log('Studio build completed successfully! (Vite outputs directly to public)');
  
  // 6. Run Next.js build
  console.log('=== RUNNING NEXT.JS BUILD ===');
  execSync('npx next build', { stdio: 'inherit' });
  
  console.log('=== ALL BUILDS COMPLETED SUCCESSFULLY ===');
} catch (error) {
  console.error('Build failed with error:', error);
  process.exit(1);
}
