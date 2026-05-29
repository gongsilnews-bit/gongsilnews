const fs = require('fs');
const path = 'c:/Users/user/Desktop/gongsilnews/src/app/(main)/homepage/page.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  '{/* ── Wide Card Listings ── */}\n        <div style={{ display: "flex", gap: 24 }}>\n          <div style={{ flex: 1, minWidth: 0 }}>',
  '{/* ── Wide Card Listings ── */}'
);

code = code.replace(
  '              </div>\n            )}\n          </div>\n          \n{/* Pagination */}',
  '              </div>\n            )}\n{/* Pagination */}'
);

fs.writeFileSync(path, code);
