const fs = require('fs');
let code = fs.readFileSync('src/app/m/_components/header/GlobalDrawerMenu.tsx', 'utf8');

const target = `  const handleClose = () => {
    setTranslateX(0);
    setIsOpen(false);
  };`;

code = code.replace(target, '');
fs.writeFileSync('src/app/m/_components/header/GlobalDrawerMenu.tsx', code, 'utf8');
console.log('Done');
