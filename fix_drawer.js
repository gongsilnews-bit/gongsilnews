const fs = require('fs');
let code = fs.readFileSync('src/app/m/_components/header/GlobalDrawerMenu.tsx', 'utf8');

// Remove isOpen state
code = code.replace(/const \[isOpen, setIsOpen\] = useState\(false\);/, '');

// Add isOpen from searchParams
code = code.replace(
  /const router = useRouter\(\);/,
  "const router = useRouter();\n  const isOpen = searchParams.get('menu') === 'open';"
);

// Replace handleOpen and handleClose
code = code.replace(
  /  \/\/ URL 파라미터 감지하여 메뉴 열기 \([\s\S]*?  \}, \[isOpen\]\);/m,
  `  const handleOpen = () => {
    if (!isOpen) {
      router.push(window.location.pathname + '?menu=open');
    }
  };

  const handleClose = () => {
    if (isOpen) {
      setTranslateX(0);
      router.back();
    }
  };

  // 전역 이벤트(open-drawer, close-drawer) 감지
  useEffect(() => {
    const onOpenDrawer = () => handleOpen();
    const onCloseDrawer = () => handleClose();
    window.addEventListener('open-drawer', onOpenDrawer);
    window.addEventListener('close-drawer', onCloseDrawer);

    // 엣지 스와이프(열기) 감지 - 화면 맨 왼쪽 30px 이내에서 터치 시작 시
    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      if (touch.clientX < 30) {
        touchStartX.current = touch.clientX;
      }
    };
    const handleTouchMove = (e) => {
      if (touchStartX.current !== null && !isOpen) {
        const diff = e.touches[0].clientX - touchStartX.current;
        if (diff > 40) { // 오른쪽으로 40px 이상 당기면 열기
          handleOpen();
          touchStartX.current = null;
        }
      }
    };
    const handleTouchEnd = () => {
      touchStartX.current = null;
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('open-drawer', onOpenDrawer);
      window.removeEventListener('close-drawer', onCloseDrawer);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, router]);`
);

// Remove onClick={handleClose} from Links
code = code.replace(/<Link([^>]+)onClick=\{handleClose\}([^>]*)>/g, '<Link$1$2>');
code = code.replace(/<Link([^>]+)onClick=\{handleClose\}([^>]*)>/g, '<Link$1$2>');

fs.writeFileSync('src/app/m/_components/header/GlobalDrawerMenu.tsx', code, 'utf8');
console.log('Done');
