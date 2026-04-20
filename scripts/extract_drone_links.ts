import * as fs from 'fs';

function extractDroneLinks() {
  const sqlPath = 'c:\\Users\\user\\Downloads\\20260415_gongsilnews_db (1).sql';
  const outPath = 'c:\\Users\\user\\Desktop\\gongsilnews\\scripts\\drone_links.json';
  
  const txt = fs.readFileSync(sqlPath, 'utf8');
  const lines = txt.split('\n');

  const results = [];

  for (const line of lines) {
    if (line.includes('tmp_table_5') && line.includes('youtube.com')) {
      const match = line.match(/"((?:[^"\\]|\\.)*)","<div class=\\"simplebox\\"/);
      const title = match ? match[1] : null;

      const ytMatch = line.match(/src=\\"(https:\/\/www\.youtube\.com\/embed\/[a-zA-Z0-9_-]+)\\"/);
      const ytUrl = ytMatch ? ytMatch[1] : null;

      const driveMatch = line.match(/href=\\"(https:\/\/drive\.google\.com\/[^\\"]+)\\"/);
      const driveUrl = driveMatch ? driveMatch[1] : null;

      if (title && ytUrl) {
        results.push({ title, ytUrl, driveUrl });
      }
    }
  }

  console.log(`Found ${results.length} valid rows.`);
  console.log(results.slice(0, 5));
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
}

extractDroneLinks();
