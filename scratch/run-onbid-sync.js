const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env.local") });

// TypeScript action dynamically loaded
const { syncOnbidProperties } = require("../src/app/actions/onbidSync.ts");

async function executeSync() {
  console.log("🚀 실시간 온비드 라이브 동기화 작업 시작...");
  try {
    const result = await syncOnbidProperties();
    console.log("📊 동기화 실행 결과:", result);
  } catch (error) {
    console.error("❌ 동기화 중 치명적인 에러 발생:", error.message);
  }
}

executeSync();
