const fs = require('fs');
const file = 'components/FlyerCanvas.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace contentEditable with contentEditable spellCheck={false}
// Make sure not to duplicate it if it's already there
content = content.replace(/contentEditable(?!\s+spellCheck)/g, 'contentEditable spellCheck={false}');

fs.writeFileSync(file, content, 'utf8');
