const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function run() {
  const serviceKey = process.env.ONBID_API_KEY || "0c70894217e28613a63cea5f413098c837a45e1d3fdba3fa94b9dc273cf12e7d";
  
  // 1. 압류재산 + 수탁재산 (0007, 0005)
  const url1 = `https://apis.data.go.kr/B010003/OnbidRlstListSrvc2/getRlstCltrList2?serviceKey=${serviceKey}&numOfRows=1&pageNo=1&resultType=json&prptDivCd=0007,0005&pvctTrgtYn=N`;
  
  // 2. 전체 모든 공매 구분 코드 (0001 ~ 0010)
  const url2 = `https://apis.data.go.kr/B010003/OnbidRlstListSrvc2/getRlstCltrList2?serviceKey=${serviceKey}&numOfRows=1&pageNo=1&resultType=json&prptDivCd=0001,0002,0003,0004,0005,0006,0007,0008,0009,0010&pvctTrgtYn=N`;

  try {
    const res1 = await fetch(url1);
    const json1 = await res1.json();
    console.log('--- CASE 1 (압류+수탁재산) ---');
    console.log('Full response keys:', Object.keys(json1));
    if (json1.body) {
      console.log('body keys:', Object.keys(json1.body));
      console.log('totalCount:', json1.body.totalCount);
    } else if (json1.response?.body) {
      console.log('response.body keys:', Object.keys(json1.response.body));
      console.log('totalCount:', json1.response.body.totalCount);
    } else {
      console.log(JSON.stringify(json1).slice(0, 500));
    }

    const res2 = await fetch(url2);
    const json2 = await res2.json();
    console.log('\n--- CASE 2 (전체 공매구분 물건 총합) ---');
    if (json2.body) {
      console.log('totalCount:', json2.body.totalCount);
    } else if (json2.response?.body) {
      console.log('totalCount:', json2.response.body.totalCount);
    }
  } catch (error) {
    console.error('API Error:', error);
  }
}

run();
