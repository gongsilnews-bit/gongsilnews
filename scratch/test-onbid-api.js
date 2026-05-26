const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function testOnbidConnection() {
  const serviceKey = process.env.ONBID_API_KEY || "0c70894217e28613a63cea5f413098c837a45e1d3fdba3fa94b9dc273cf12e7d";
  
  // 다양한 파라미터 조합 테스트
  const testCases = [
    { name: "기본조합 (0007,0005, pvctTrgtYn=N, resultType=json)", url: `https://apis.data.go.kr/B010003/OnbidRlstListSrvc2/getRlstCltrList2?serviceKey=${serviceKey}&numOfRows=10&pageNo=1&resultType=json&prptDivCd=0007,0005&pvctTrgtYn=N` },
    { name: "수의계약 Y 조합 (0007,0005, pvctTrgtYn=Y, resultType=json)", url: `https://apis.data.go.kr/B010003/OnbidRlstListSrvc2/getRlstCltrList2?serviceKey=${serviceKey}&numOfRows=10&pageNo=1&resultType=json&prptDivCd=0007,0005&pvctTrgtYn=Y` },
    { name: "returnType=json 조합 (0007, pvctTrgtYn=N, returnType=json)", url: `https://apis.data.go.kr/B010003/OnbidRlstListSrvc2/getRlstCltrList2?serviceKey=${serviceKey}&numOfRows=10&pageNo=1&returnType=json&prptDivCd=0007&pvctTrgtYn=N` },
    { name: "전체 코드 쉼표 조합 (0001,0002,0003,0004,0005,0006,0007,0008,0009,0010)", url: `https://apis.data.go.kr/B010003/OnbidRlstListSrvc2/getRlstCltrList2?serviceKey=${serviceKey}&numOfRows=10&pageNo=1&resultType=json&prptDivCd=0001,0002,0003,0004,0005,0006,0007,0008,0009,0010&pvctTrgtYn=N` }
  ];

  for (const tc of testCases) {
    console.log(`📡 테스트 케이스: ${tc.name} 실행 중...`);

    try {
      const res = await fetch(tc.url, { headers: { "User-Agent": "Mozilla/5.0" } });
      const text = await res.text();
      
      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        // XML 이면 출력
        console.log(`➡️ [XML 응답 감지] 처음 300글자:`);
        console.log(text.slice(0, 300));
        console.log("---------------------------------\n");
        continue;
      }
      
      const items = json.response?.body?.items?.item || json.response?.body?.items || json.result?.items || [];
      const codeMsg = json.response?.header?.resultMsg || json.result?.resultMsg || "성공";
      const codeVal = json.response?.header?.resultCode || json.result?.resultCode || "00";

      console.log(`➡️ 코드: ${codeVal}, 메시지: ${codeMsg}`);
      
      if (Array.isArray(items) && items.length > 0) {
        console.log(`🎉 성공!!! 실시간 데이터 ${items.length}개 획득!`);
        console.log(`📍 샘플 매물명: ${items[0].cltrNm}`);
        console.log(`📍 샘플 주소: ${items[0].nmrdAdrs || items[0].ldnmAdrs}`);
        console.log(`📍 최저가: ${items[0].minBidAmt}원\n`);
        break; // 하나라도 성공하면 중단
      } else {
        console.log(`❌ 데이터가 반환되지 않았습니다. (응답: ${text.slice(0, 200)})\n`);
      }
    } catch (error) {
      console.error(`❌ 에러 발생:`, error.message);
    }
  }
}

testOnbidConnection();
