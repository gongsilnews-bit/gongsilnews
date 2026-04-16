const fs = require('fs');
const path = require('path');
const folders = ['news_all', 'news_etc', 'news_finance', 'news_law', 'news_life', 'news_politics'];
const baseDir = path.join('c:', 'Users', 'user', 'Desktop', 'gongsilnews', 'src', 'app', '(main)');

for (const folder of folders) {
  const p = path.join(baseDir, folder, 'page.tsx');
  if (!fs.existsSync(p)) continue;
  let text = fs.readFileSync(p, 'utf8');
  
  // Skip if already patched
  if (text.includes('importantArticles')) continue;
  
  const sectionMatch = text.match(/getArticles\(\{ status: "APPROVED"(?:, section2: "([^"]+)")? \}\)/);
  const sectionFilter = sectionMatch && sectionMatch[1] ? `, section2: "${sectionMatch[1]}"` : '';
  
  text = text.replace(
    /const \[articlesRes, popularRes\] = await Promise\.all\(\[\s*getArticles\(\{ status: "APPROVED"[^}]*\}\),\s*getArticles\(\{ status: "APPROVED", limit: 50 \}\),\s*\]\);/,
    `const [articlesRes, popularRes, importantRes] = await Promise.all([\n    getArticles({ status: "APPROVED"${sectionFilter} }),\n    getArticles({ status: "APPROVED", limit: 50 }),\n    getArticles({ status: "APPROVED", article_type: "IMPORTANT"${sectionFilter}, limit: 3 }),\n  ]);`
  );
  
  text = text.replace(
    /const popular = popularRes\.success\s*\n\s*\? \[\.\.\.\(popularRes\.data \|\| \[\]\)\].*\n\s*: \[\];/,
    match => match + `\n\n  const important = importantRes.success ? (importantRes.data || []) : [];`
  );
  
  text = text.replace(
    /initialArticles=\{articles\} initialPopular=\{popular\} \/>;/,
    `initialArticles={articles} initialPopular={popular} importantArticles={important} />;`
  );
  
  fs.writeFileSync(p, text);
  console.log('Updated ' + folder);
}
