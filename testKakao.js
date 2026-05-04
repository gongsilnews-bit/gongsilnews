const fs = require('fs');
const dotenvVars = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  if (line.includes('=')) {
    const parts = line.split('=');
    acc[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
  }
  return acc;
}, {});

const apiKey = dotenvVars.KAKAO_REST_API_KEY;

async function run() {
  const addr1 = '서울 강남구 논현동 언주로116길 6';
  const url1 = 'https://dapi.kakao.com/v2/local/search/address.json?query=' + encodeURIComponent(addr1) + '&analyze_type=similar';
  const res1 = await fetch(url1, { headers: { Authorization: 'KakaoAK ' + apiKey } });
  const data1 = await res1.json();
  console.log('Result for addr1:', data1.documents.length);

  const addr2 = '서울 강남구 언주로116길 6';
  const url2 = 'https://dapi.kakao.com/v2/local/search/address.json?query=' + encodeURIComponent(addr2) + '&analyze_type=similar';
  const res2 = await fetch(url2, { headers: { Authorization: 'KakaoAK ' + apiKey } });
  const data2 = await res2.json();
  console.log('Result for addr2:', data2.documents.length);
}
run();
