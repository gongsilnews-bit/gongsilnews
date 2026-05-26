const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function getCoordinates(address) {
  try {
    const kakaoRestKey = process.env.KAKAO_REST_KEY || process.env.NEXT_PUBLIC_KAKAO_APP_KEY;
    console.log(`Using Kakao API Key: ${kakaoRestKey ? 'Found' : 'Not Found'}`);
    if (kakaoRestKey) {
      const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`;
      const res = await fetch(url, {
        headers: { Authorization: `KakaoAK ${kakaoRestKey}` }
      });
      console.log(`Kakao Response Status: ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log(`Kakao documents length:`, data.documents?.length);
        if (data.documents && data.documents.length > 0) {
          const doc = data.documents[0];
          return { lat: parseFloat(doc.y), lng: parseFloat(doc.x) };
        }
      }
    }

    const vworldKey = process.env.VWORLD_API_KEY || "7CD204D5-0BDC-360B-8833-D66D5DF31CD9";
    const url = `https://api.vworld.kr/req/address?service=address&request=getcoord&key=${vworldKey}&address=${encodeURIComponent(
      address
    )}&type=ROAD`;
    const vworldRes = await fetch(url);
    if (vworldRes.ok) {
      const vdata = await vworldRes.json();
      console.log(`Vworld status:`, vdata.response?.status);
      if (vdata.response?.status === "OK" && vdata.response?.result?.point) {
        const pt = vdata.response.result.point;
        return { lat: parseFloat(pt.y), lng: parseFloat(pt.x) };
      }
    }
  } catch (error) {
    console.error("좌표 변환 에러:", error);
  }
  return null;
}

async function run() {
  const addr1 = "경기도 평택시 장당동 483-6 201호";
  const addr2 = "경기도 평택시 장당동 483-6";

  console.log(`\nTesting address: "${addr1}"`);
  const coords1 = await getCoordinates(addr1);
  console.log(`Result:`, coords1);

  console.log(`\nTesting address: "${addr2}"`);
  const coords2 = await getCoordinates(addr2);
  console.log(`Result:`, coords2);
}

run();
