import fs from "fs";
import dotenv from "dotenv";

if (fs.existsSync(".env.local")) {
  const envConfig = dotenv.parse(fs.readFileSync(".env.local"));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const serviceKey = process.env.ONBID_API_KEY || process.env.NEXT_PUBLIC_BROKERAGE_API_KEY;

async function run() {
  const endpoint = "/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancMdl";
  const queryParams = new URLSearchParams({
    page: "1",
    perPage: "10",
    "cond[HOUSE_MANAGE_NO::EQ]": "2026000219", // 호반써밋 풍무Ⅱ
    serviceKey: serviceKey
  });

  const url = `https://api.odcloud.kr/api${endpoint}?${queryParams.toString()}`;
  console.log("Fetching model details for HOUSE_MANAGE_NO=2026000219...");

  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log("Response data counts:", data.totalCount);
    if (data.data && data.data.length > 0) {
      console.log("\nFlat Types Details:");
      data.data.forEach((item, index) => {
        console.log(`\n[${index + 1}] 모델 타입: ${item.MODEL_NO}`);
        console.log(`   - 주택형 (평형명): ${item.HOUSE_TY}`);
        console.log(`   - 공급면적 (㎡): ${item.SUPLY_AR}`);
        console.log(`   - 전용면적 (㎡): ${item.DCLR_AR || item.EXCLSV_AR || "N/A"}`);
        console.log(`   - 공급 세대수 (일반): ${item.SUPLY_HSHLDCO}`);
        console.log(`   - 공급 세대수 (특별): ${item.SPSPLY_HSHLDCO}`);
        console.log(`   - 분양 최고금액 (원): ${item.LMTT_AMOUNT || "N/A"}`);
      });
      
      // Let's print all keys of the first item to see what properties exist
      console.log("\nKeys in first item:");
      Object.entries(data.data[0]).forEach(([k, v]) => {
        console.log(`- ${k}: ${v}`);
      });
    } else {
      console.log("No data returned. Raw response:", data);
    }
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

run();
