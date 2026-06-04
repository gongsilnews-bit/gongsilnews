const fs = require('fs');
let code = fs.readFileSync('components/FlyerCanvas.tsx', 'utf8');

// Change the 'FOR SALE' badge color to white
code = code.replace(/text-\\[var\\(--theme-primary\\)\\]' : 'text-white'/g, \"text-white' : 'text-white\");
code = code.replace(\"pageNumber === 1 ? 'text-[var(--theme-primary)]' : 'text-white'\", \"pageNumber === 1 ? 'text-white' : 'text-white'\");

// Change the orange border of the Investment Summary
code = code.replace('<div className=\"flex gap-4 border-l-4 border-[#cc5a27] pl-4\">', '<div className=\"flex gap-4 border-l-4 pl-4\" style={{ borderColor: colorTheme?.primary || \\'#cc5a27\\' }}>');

fs.writeFileSync('components/FlyerCanvas.tsx', code);
