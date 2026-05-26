const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function analyzeSeoulProperties() {
  const serviceKey = process.env.ONBID_API_KEY || "0c70894217e28613a63cea5f413098c837a45e1d3fdba3fa94b9dc273cf12e7d";
  const items = [];

  console.log("📡 서울시 온비드 공매 물건 가져오는 중...");
  for (let page = 1; page <= 3; page++) {
    const url = `https://apis.data.go.kr/B010003/OnbidRlstListSrvc2/getRlstCltrList2?serviceKey=${serviceKey}&numOfRows=1000&pageNo=${page}&resultType=json&prptDivCd=0007,0005&pvctTrgtYn=N&lctnSdnm=${encodeURIComponent("서울특별시")}`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      const pageItems = json.body?.items?.item || [];
      items.push(...pageItems);
      console.log(`Page ${page}: ${pageItems.length} items fetched.`);
    } catch (e) {
      console.error(`Page ${page} Error:`, e.message);
    }
  }

  console.log(`📦 총 수집 완료: ${items.length}건`);

  // 주소 고유값 추출
  const uniqueAddresses = new Set();
  items.forEach(item => {
    let address = `${item.lctnSdnm || ""} ${item.lctnSggnm || ""} ${item.lctnEmdNm || ""}`.trim();
    const propertyName = item.onbidCltrNm || "";
    if (propertyName) {
      const addrMatch = propertyName.match(/^(.*?)(?:\s+(?:근린생활시설|아파트|오피스텔|상가|주택|대지|토지|건물|공장|빌딩|창고|사무실))?$/);
      if (addrMatch && addrMatch[1]) {
        address = addrMatch[1].trim();
      }
    }
    if (address) {
      uniqueAddresses.add(address);
    }
  });

  console.log(`🔍 고유 주소 개수: ${uniqueAddresses.size}개`);
}

analyzeSeoulProperties();
