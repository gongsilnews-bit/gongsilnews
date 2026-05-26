const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function testOnbidFilters() {
  const serviceKey = process.env.ONBID_API_KEY || "0c70894217e28613a63cea5f413098c837a45e1d3fdba3fa94b9dc273cf12e7d";
  
  const testCases = [
    { name: "No filter (Total)", url: `https://apis.data.go.kr/B010003/OnbidRlstListSrvc2/getRlstCltrList2?serviceKey=${serviceKey}&numOfRows=1&pageNo=1&resultType=json&prptDivCd=0007,0005&pvctTrgtYn=N` },
    { name: "Filter by lctnSdnm=서울특별시", url: `https://apis.data.go.kr/B010003/OnbidRlstListSrvc2/getRlstCltrList2?serviceKey=${serviceKey}&numOfRows=1&pageNo=1&resultType=json&prptDivCd=0007,0005&pvctTrgtYn=N&lctnSdnm=${encodeURIComponent("서울특별시")}` },
    { name: "Filter by lctnSdnm=서울", url: `https://apis.data.go.kr/B010003/OnbidRlstListSrvc2/getRlstCltrList2?serviceKey=${serviceKey}&numOfRows=1&pageNo=1&resultType=json&prptDivCd=0007,0005&pvctTrgtYn=N&lctnSdnm=${encodeURIComponent("서울")}` },
    { name: "Filter by sido=서울특별시", url: `https://apis.data.go.kr/B010003/OnbidRlstListSrvc2/getRlstCltrList2?serviceKey=${serviceKey}&numOfRows=1&pageNo=1&resultType=json&prptDivCd=0007,0005&pvctTrgtYn=N&sido=${encodeURIComponent("서울특별시")}` },
    { name: "Filter by sdnm=서울특별시", url: `https://apis.data.go.kr/B010003/OnbidRlstListSrvc2/getRlstCltrList2?serviceKey=${serviceKey}&numOfRows=1&pageNo=1&resultType=json&prptDivCd=0007,0005&pvctTrgtYn=N&sdnm=${encodeURIComponent("서울특별시")}` }
  ];

  for (const tc of testCases) {
    try {
      const res = await fetch(tc.url);
      const json = await res.json();
      const body = json.body || json.response?.body;
      console.log(`${tc.name} => totalCount:`, body?.totalCount);
    } catch (e) {
      console.error(`${tc.name} Error:`, e.message);
    }
  }
}

testOnbidFilters();
