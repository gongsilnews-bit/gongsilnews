const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function findKakaoKey() {
  try {
    const html = await fetchUrl('https://gongsilnews.com/news/75');
    const scriptUrls = [...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+)"/g)].map(m => 'https://gongsilnews.com' + m[1]);
    
    for (const url of scriptUrls) {
      const js = await fetchUrl(url);
      const keys = [...new Set(js.match(/[a-f0-9]{32}/g))];
      if (keys.length > 0) {
        console.log("Found hex strings in " + url + ":");
        keys.forEach(k => console.log(k));
      }
    }
    console.log("Done checking scripts.");
  } catch (e) {
    console.error(e);
  }
}

findKakaoKey();
