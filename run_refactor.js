const fs = require('fs');
const path = require('path');

const srcAppDir = path.join(__dirname, 'src', 'app');
const mainDir = path.join(srcAppDir, '(main)');

// 1. (main) 디렉토리 생성
if (!fs.existsSync(mainDir)) {
  fs.mkdirSync(mainDir, { recursive: true });
}

// 2. 이동할 대상 필터링 (admin, api, (main), globals.css 등 제외)
const excludes = ['admin', 'api', '(main)', 'favicon.ico', 'globals.css', 'icon.png', 'layout.tsx'];
const items = fs.readdirSync(srcAppDir);

for (const item of items) {
  if (excludes.includes(item)) continue;
  
  const srcPath = path.join(srcAppDir, item);
  const destPath = path.join(mainDir, item);
  
  // 이동
  fs.renameSync(srcPath, destPath);
  console.log(`Moved: ${item} -> (main)/${item}`);
}

// 3. 이동된 모든 page.tsx 파일에서 Header / Footer 코드 제거
function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file === 'page.tsx') {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // 제거 대상 1: import Header or Footer
      content = content.replace(/^import\s+(Header|Footer)\s+from\s+['"].+['"];?\s*$/gm, '');
      // 제거 대상 2: <Header /> or <Footer />
      content = content.replace(/^\s*<(Header|Footer)\s*\/?>(.*<\/(Header|Footer)>)?\s*$/gm, '');
      
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`Cleaned Header/Footer in -> ${fullPath}`);
    }
  }
}

processDirectory(mainDir);

// 4. (main)/layout.tsx 생성
const layoutContent = `import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      {/* 하위의 모든 page.tsx 파일 내용물이 이 자리에 렌더링 됩니다 */}
      {children}
      <Footer />
    </>
  );
}
`;

fs.writeFileSync(path.join(mainDir, 'layout.tsx'), layoutContent, 'utf8');
console.log('Created (main)/layout.tsx successfully.');
