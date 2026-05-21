import fs from 'fs';
import path from 'path';

const filePath = path.resolve('src/app/m/admin/vacancy/write/page.tsx');

let content = fs.readFileSync(filePath, 'utf8');

// Replacements: Orange/Yellow -> Blue
const replacements = [
    { from: /#f4a71b/gi, to: '#2563eb' },
    { from: /#fffbeb/gi, to: '#eff6ff' },
    { from: /#fde68a/gi, to: '#bfdbfe' },
    { from: /#b45309/gi, to: '#1e40af' },
    { from: /linear-gradient\(135deg,#f4a71b,#d89316\)/gi, to: 'linear-gradient(135deg,#2563eb,#1d4ed8)' },
    { from: /rgba\(244,167,27,0\.25\)/gi, to: 'rgba(37,99,235,0.25)' },
    { from: /rgba\(244,167,27,0\.15\)/gi, to: 'rgba(37,99,235,0.15)' }
];

let replaced = content;
for (const r of replacements) {
    replaced = replaced.replace(r.from, r.to);
}

fs.writeFileSync(filePath, replaced, 'utf8');
console.log('Successfully reverted orange colors to the original blue brand colors!');
