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
  
  // 3. Clean target public directory if exists
  if (fs.existsSync(targetPublicDir)) {
    console.log('Cleaning existing target public directory...');
    fs.rmSync(targetPublicDir, { recursive: true, force: true });
  }
  
  // 4. Create target public directory
  fs.mkdirSync(targetPublicDir, { recursive: true });
  
  // 5. Copy dist to public
  const distDir = path.join(subprojectDir, 'dist');
  console.log(`Copying ${distDir} to ${targetPublicDir}...`);
  fs.cpSync(distDir, targetPublicDir, { recursive: true, force: true });
  
  console.log('Subproject build and copy completed successfully!');
  
  // 6. Run Next.js build
  console.log('=== RUNNING NEXT.JS BUILD ===');
  execSync('next build', { stdio: 'inherit' });
  
  console.log('=== ALL BUILDS COMPLETED SUCCESSFULLY ===');
} catch (error) {
  console.error('Build failed with error:', error);
  process.exit(1);
}
