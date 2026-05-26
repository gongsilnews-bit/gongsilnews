const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env.local") });

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

async function getCoordinates(address) {
  try {
    const kakaoRestKey = process.env.KAKAO_REST_KEY || process.env.NEXT_PUBLIC_KAKAO_APP_KEY;
    if (kakaoRestKey) {
      const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`;
      const res = await fetch(url, {
        headers: { Authorization: `KakaoAK ${kakaoRestKey}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.documents && data.documents.length > 0) {
          const doc = data.documents[0];
          return { lat: parseFloat(doc.y), lng: parseFloat(doc.x) };
        }
      }
    }

    const vworldKey = process.env.VWORLD_API_KEY || "7CD204D5-0BDC-360B-8833-D66D5DF31CD9";
    const vworldRes = await fetch(
      `https://api.vworld.kr/req/address?service=address&request=getcoord&key=${vworldKey}&address=${encodeURIComponent(
        address
      )}&type=ROAD`
    );
    if (vworldRes.ok) {
      const vdata = await vworldRes.json();
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

async function debugSync() {
  const supabase = getAdminClient();
  const serviceKey = process.env.ONBID_API_KEY || "0c70894217e28613a63cea5f413098c837a45e1d3fdba3fa94b9dc273cf12e7d";

  console.log("Fetching Onbid items...");
  const url = `https://apis.data.go.kr/B010003/OnbidRlstListSrvc2/getRlstCltrList2?serviceKey=${serviceKey}&numOfRows=5&pageNo=1&resultType=json&prptDivCd=0007,0005&pvctTrgtYn=N`;
  const res = await fetch(url);
  const data = await res.json();
  const items = data.body?.items?.item || [];
  
  console.log(`Found ${items.length} items.`);

  for (const item of items) {
    const onbidId = String(item.onbidCltrno || "");
    const propertyName = item.onbidCltrNm || "";
    
    let address = `${item.lctnSdnm || ""} ${item.lctnSggnm || ""} ${item.lctnEmdNm || ""}`.trim();
    if (propertyName) {
      const addrMatch = propertyName.match(/^(.*?)(?:\s+(?:근린생활시설|아파트|오피스텔|상가|주택|대지|토지|건물|공장|빌딩|창고|사무실))?$/);
      if (addrMatch && addrMatch[1]) {
        address = addrMatch[1].trim();
      }
    }

    console.log(`\n-------------------------------------`);
    console.log(`Item: ${propertyName}`);
    console.log(`Onbid ID: ${onbidId}`);
    console.log(`Parsed Address: "${address}"`);

    if (!address || !onbidId) {
      console.log(`❌ Skipped: missing address or onbidId`);
      continue;
    }

    // Check duplicate
    const { data: existing, error: err } = await supabase
      .from("vacancies")
      .select("id, building_name, detail_addr")
      .or(`description.like.%${onbidId}%,detail_addr.eq.${address}`)
      .limit(1);

    if (err) {
      console.error(`DB Query Error:`, err);
    }
    
    if (existing && existing.length > 0) {
      console.log(`❌ Skipped: Duplicate check matched in DB!`);
      console.log(`   Matched record:`, existing[0]);
      continue;
    }

    console.log(`🔍 No duplicate in DB. Fetching coordinates...`);
    const coords = await getCoordinates(address);
    if (!coords) {
      console.log(`❌ Skipped: Geocoding failed for "${address}"`);
      continue;
    }

    console.log(`✅ Success! Coordinates found:`, coords);
  }
}

debugSync().catch(console.error);
