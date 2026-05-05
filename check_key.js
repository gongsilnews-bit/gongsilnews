fetch('https://gongsilnews.com/news/75')
  .then(r => r.text())
  .then(t => {
    // We want to see if NEXT_PUBLIC_KAKAO_JS_KEY is embedded in the build
    const idx = t.indexOf('435d3602201a49ea712e5f5a36fe6efc');
    console.log("Original Key Found:", idx !== -1);
    
    // Look for other keys
    const match = t.match(/Kakao\.init\(['"]([^'"]+)['"]\)/);
    if (match) console.log("Key in init:", match[1]);
  })
  .catch(console.error);
