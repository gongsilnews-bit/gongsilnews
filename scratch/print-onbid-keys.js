const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function printOnbidKeys() {
  const serviceKey = process.env.ONBID_API_KEY || "0c70894217e28613a63cea5f413098c837a45e1d3fdba3fa94b9dc273cf12e7d";
  const url = `https://apis.data.go.kr/B010003/OnbidRlstListSrvc2/getRlstCltrList2?serviceKey=${serviceKey}&numOfRows=5&pageNo=1&resultType=json&prptDivCd=0007,0005&pvctTrgtYn=N`;

  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const json = await res.json();
    
    // 차세대 API JSON 루트 경로 확인
    console.log("💎 JSON 루트 키 목록:", Object.keys(json));
    
    const items = json.body?.items?.item || [];
    console.log(`📦 가져온 아이템 개수: ${items.length}`);
    
    if (items.length > 0) {
      console.log("\n🔥 첫 번째 온비드 아이템 상세 필드 목록 및 값:");
      const firstItem = items[0];
      for (const [key, val] of Object.entries(firstItem)) {
        console.log(`  * ${key}: ${val}`);
      }
    }
  } catch (error) {
    console.error("❌ 에러 발생:", error.message);
  }
}

printOnbidKeys();
