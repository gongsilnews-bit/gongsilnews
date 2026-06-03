const fs = require('fs');
let code = fs.readFileSync('components/FlyerForm.tsx', 'utf8');
code = code.replace(/onClick=\{onBackTab \|\| \(\(\) => setActiveTab\('all'\)\)\}\s*<\/button>/g, `onClick={onBackTab || (() => setActiveTab('all'))}\n                              className="flex-1 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-lg transition-colors text-sm"\n                          >\n                              뒤로가기\n                          </button>`);
fs.writeFileSync('components/FlyerForm.tsx', code);
