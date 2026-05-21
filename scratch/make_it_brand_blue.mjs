import fs from 'fs';
import path from 'path';

const filePath = path.resolve('src/app/m/admin/vacancy/write/page.tsx');

let content = fs.readFileSync(filePath, 'utf8');

// Replace standard blue code #2563eb with brand blue #1a73e8
content = content.replace(/#2563eb/gi, '#1a73e8');

// Replace the weird blue-orange gradient at the bottom next button with clean solid brand blue #1a73e8
content = content.replace(/linear-gradient\(135deg,#2563eb,#d89316\)/gi, '#1a73e8');
content = content.replace(/linear-gradient\(135deg,#1a73e8,#d89316\)/gi, '#1a73e8');

// Replace shadow colors from blue-600 rgba(37,99,235,...) to brand blue rgba(26,115,232,...)
content = content.replace(/rgba\(37,99,235,/gi, 'rgba(26,115,232,');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully applied clean brand blue #1a73e8 styling across the entire mobile vacancy registration page!');
