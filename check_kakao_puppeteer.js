const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('https://gongsilnews.com/news/75', { waitUntil: 'networkidle2' });
  
  // Extract Kakao info
  const kakaoInfo = await page.evaluate(() => {
    if (window.Kakao) {
      return {
        isInitialized: window.Kakao.isInitialized(),
        key: window.Kakao.VERSION || 'Key not exposed directly, but Kakao object exists',
        // Try to intercept the init call if possible, but Kakao object might not store the raw key.
      };
    }
    return null;
  });
  
  console.log('Kakao Info on Production:', kakaoInfo);
  
  // Try to find the exact key in localStorage or sessionStorage
  const storage = await page.evaluate(() => {
    return {
      local: Object.keys(localStorage).filter(k => k.includes('kakao')),
      session: Object.keys(sessionStorage).filter(k => k.includes('kakao'))
    };
  });
  console.log('Storage:', storage);
  
  await browser.close();
})();
