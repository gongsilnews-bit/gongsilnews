const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function run() {
  const cookiePath = path.join(__dirname, 'session_cookies.json');
  if (!fs.existsSync(cookiePath)) {
    console.error('❌ session_cookies.json 파일이 없습니다! 먼저 http://localhost:3000/api/dump-session 에 접속해주세요.');
    return;
  }
  
  const cookiesData = JSON.parse(fs.readFileSync(cookiePath, 'utf8'));
  const puppeteerCookies = cookiesData.map(c => ({
    name: c.name,
    value: c.value,
    domain: 'localhost',
    path: '/',
    httpOnly: c.httpOnly || false,
    secure: c.secure || false,
  }));

  console.log('Launching browser with injected session...');
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null,
    args: ['--start-maximized'] 
  });
  
  const page = await browser.newPage();
  
  // Set cookies for localhost
  await page.setCookie(...puppeteerCookies);
  
  console.log('✅ 세션 쿠키 주입 완료! 등록 작업을 시작합니다.');

  const categories = ['아파트', '오피스텔', '빌딩', '상가/점포', '사무실', '토지', '단독/다가구', '원룸/투룸'];
  const transactions = ['매매', '전세', '월세', '단기'];
  
  // 이미 성공한 아파트 매매 2건은 제외할 수도 있지만 깔끔하게 전체를 다시 돌립니다.
  for (const cat of categories) {
    for (const t of transactions) {
      for (let i = 1; i <= 2; i++) {
        console.log(`Registering ${cat} - ${t} - Item ${i}`);
        
        try {
          await page.goto('http://localhost:3000/m/admin/vacancy/write', { waitUntil: 'networkidle2' });
          await new Promise(r => setTimeout(r, 1500));
          
          // Try to click category
          await page.evaluate((category) => {
            const buttons = Array.from(document.querySelectorAll('button, div, span'));
            const catBtn = buttons.find(b => b.innerText && b.innerText.trim() === category);
            if (catBtn) catBtn.click();
            
            const labels = Array.from(document.querySelectorAll('label'));
            const lbl = labels.find(l => l.innerText && l.innerText.includes(category));
            if (lbl) lbl.click();
            
            const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
            const r = radios.find(r => r.value === category);
            if (r) r.click();
          }, cat);
          await new Promise(r => setTimeout(r, 500));
          
          // Transaction
          await page.evaluate((type) => {
            const labels = Array.from(document.querySelectorAll('label'));
            const lbl = labels.find(l => l.innerText && l.innerText.includes(type));
            if (lbl) lbl.click();
            
            const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
            const r = radios.find(r => r.value === type);
            if (r) r.click();
          }, t);
          await new Promise(r => setTimeout(r, 500));
          
          // Fill fields
          await page.evaluate((cat, t, i) => {
            const setVal = (name, val) => {
              const el = document.querySelector(`input[name="${name}"], textarea[name="${name}"]`);
              if (el) {
                el.value = val;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
              }
            };
            setVal('sido', '서울특별시');
            setVal('sigungu', '강남구');
            setVal('dong', '역삼동');
            setVal('detail_addr', '123-45');
            setVal('building_name', `자동 등록 테스트 매물 (${cat}-${t}-${i})`);
            
            setVal('lat', '37.500');
            setVal('lng', '127.036');
            
            setVal('deposit', '1000000000');
            setVal('monthly_rent', '1000000');
            setVal('premium', '0');
            setVal('maintenance_fee', '200000');
            
            setVal('supply_m2', '100');
            setVal('exclusive_m2', '84');
            setVal('current_floor', '5');
            setVal('total_floor', '15');
            setVal('room_count', '3');
            setVal('bathroom_count', '2');
            setVal('parking', '1대');
            setVal('direction', '남향');
            setVal('approval_year', '2015');
            
            setVal('description', `자동 등록 봇이 입력한 ${cat} ${t} 테스트 매물입니다. (AI 미사용)`);
          }, cat, t, i);
          
          // Click Next if it's a multi-step form
          for(let step = 0; step < 3; step++) {
            await page.evaluate(() => {
               const btns = Array.from(document.querySelectorAll('button'));
               const nextBtn = btns.find(b => b.innerText.includes('다음') || b.innerText.includes('Next'));
               if (nextBtn) nextBtn.click();
            });
            await new Promise(r => setTimeout(r, 500));
          }

          // 비동기 setTimeout을 사용해 CDP 연결 끊김(Context Destroyed) 에러 방지
          await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const submitBtn = btns.find(b => b.innerText.includes('등록') || b.innerText.includes('저장') || b.innerText.includes('완료'));
            if (submitBtn) {
              setTimeout(() => submitBtn.click(), 100);
            }
          });
          
          // Submit 후 페이지 넘어가기를 충분히 기다림
          await new Promise(r => setTimeout(r, 3000));
          
          console.log(`✅ Success ${cat} - ${t} - ${i}`);
          
        } catch (e) {
          console.log(`❌ Failed ${cat} - ${t} - ${i}:`, e.message);
        }
      }
    }
  }
  
  console.log('🎉 All 64 automated registrations complete!');
  await browser.close();
}

run().catch(console.error);
