import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables
if (fs.existsSync(".env.local")) {
  const envConfig = dotenv.parse(fs.readFileSync(".env.local"));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const kakaoApiKey = process.env.KAKAO_REST_API_KEY;
const serviceKeyCheongyak = process.env.ONBID_API_KEY || process.env.NEXT_PUBLIC_BROKERAGE_API_KEY;

if (!supabaseUrl || !serviceKey || !kakaoApiKey || !serviceKeyCheongyak) {
  console.error("Missing required environment variables in .env.local!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);
const ADMIN_OWNER_ID = "e1dcc122-f243-46cd-b5c4-e06db99f4b5f"; // 공실뉴스 ADMIN user ID

// Clean address for geocoding
function cleanAddress(addr) {
  if (!addr) return "";
  
  // Extract content inside parenthesis if it looks like an address
  const parenMatch = addr.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const candidate = parenMatch[1];
    if (candidate.includes("시") || candidate.includes("도") || candidate.includes("동") || candidate.includes("로")) {
      return candidate.replace("일원", "").replace("일대", "").trim();
    }
  }
  
  return addr.replace("일원", "").replace("일대", "").trim();
}

// Geocoder with fallback
async function geocode(address, title) {
  const cleaned = cleanAddress(address);
  
  // 1. Address search
  try {
    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(cleaned)}&analyze_type=similar`;
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${kakaoApiKey}` } });
    if (res.ok) {
      const data = await res.json();
      if (data.documents && data.documents.length > 0) {
        const doc = data.documents[0];
        const lat = parseFloat(doc.y);
        const lng = parseFloat(doc.x);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng, source: "address" };
        }
      }
    }
  } catch (e) {
    console.error("Address search error:", e);
  }

  // 2. Fallback to keyword search (with title)
  try {
    const keywordUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(title)}`;
    const res = await fetch(keywordUrl, { headers: { Authorization: `KakaoAK ${kakaoApiKey}` } });
    if (res.ok) {
      const data = await res.json();
      if (data.documents && data.documents.length > 0) {
        const doc = data.documents[0];
        const lat = parseFloat(doc.y);
        const lng = parseFloat(doc.x);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng, source: "keyword" };
        }
      }
    }
  } catch (e) {
    console.error("Keyword fallback error:", e);
  }

  return null;
}

// Fetch flat-types and maximum pre-sale price
async function fetchModelsAndMaxPrice(houseManageNo) {
  const url = `https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancMdl?page=1&perPage=30&cond[HOUSE_MANAGE_NO::EQ]=${houseManageNo}&serviceKey=${serviceKeyCheongyak}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) return { maxPrice: 0, flatTypes: [], exclusiveM2: null, supplyM2: null };
    
    const data = await res.json();
    if (!data.data || data.data.length === 0) {
      return { maxPrice: 0, flatTypes: [], exclusiveM2: null, supplyM2: null };
    }
    
    let maxPrice = 0;
    const flatTypes = [];
    let representativeExcl = null;
    let representativeSup = null;
    
    data.data.forEach(item => {
      const price = parseInt(item.LTTOT_TOP_AMOUNT || "0", 10) * 10000; // stored in KRW
      if (price > maxPrice) {
        maxPrice = price;
      }
      
      const excl = parseFloat(item.HOUSE_TY); // e.g. "059.9988A" -> 59.9988
      const sup = parseFloat(item.SUPLY_AR);
      
      if (!representativeExcl && !isNaN(excl)) representativeExcl = excl;
      if (!representativeSup && !isNaN(sup)) representativeSup = sup;

      flatTypes.push({
        modelNo: item.MODEL_NO,
        houseType: item.HOUSE_TY,
        supplyArea: item.SUPLY_AR,
        exclusiveArea: !isNaN(excl) ? excl : null,
        generalHouseholds: item.SUPLY_HSHLDCO,
        specialHouseholds: item.SPSPLY_HSHLDCO,
        topAmount: price
      });
    });
    
    return { maxPrice, flatTypes, exclusiveM2: representativeExcl, supplyM2: representativeSup };
  } catch (err) {
    console.error(`Failed to fetch models for ${houseManageNo}:`, err);
    return { maxPrice: 0, flatTypes: [], exclusiveM2: null, supplyM2: null };
  }
}

async function sync() {
  console.log("🚀 Starting Cheongyak Pre-sale Sync...");
  
  // 1. Fetch latest pre-sales (Page 1, 10 items for verification)
  const listUrl = `https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail?page=1&perPage=10&serviceKey=${serviceKeyCheongyak}`;
  
  try {
    const listRes = await fetch(listUrl);
    if (!listRes.ok) {
      console.error("Failed to query Cheongyak API list. Status:", listRes.status);
      return;
    }
    
    const listData = await listRes.json();
    if (!listData.data || listData.data.length === 0) {
      console.log("No pre-sales found.");
      return;
    }
    
    console.log(`Fetched ${listData.data.length} pre-sale announcements. Processing...`);
    
    for (const item of listData.data) {
      const houseManageNo = item.HOUSE_MANAGE_NO;
      console.log(`\n-----------------------------------------------`);
      console.log(`🏠 Processing: [${houseManageNo}] ${item.HOUSE_NM}`);
      
      // A. Check if already exists in DB
      const { data: existing } = await supabase
        .from("vacancies")
        .select("id")
        .eq("property_type", "분양")
        .contains("metadata", { houseManageNo });
        
      if (existing && existing.length > 0) {
        console.log(`▶ Pre-sale already exists in DB (ID: ${existing[0].id}). Skipping.`);
        continue;
      }
      
      // B. Geocode address
      console.log(`📍 Geocoding address: "${item.HSSPLY_ADRES}"`);
      const coords = await geocode(item.HSSPLY_ADRES, item.HOUSE_NM);
      if (!coords) {
        console.warn(`❌ Failed to get coordinates for address. Skipping.`);
        continue;
      }
      console.log(`✅ Coords resolved: Lat ${coords.lat}, Lng ${coords.lng} (via ${coords.source})`);
      
      // C. Fetch flat-types & representative price
      console.log(`💵 Fetching price and type details...`);
      const details = await fetchModelsAndMaxPrice(houseManageNo);
      console.log(`✅ Loaded flat details. Max Price: ${details.maxPrice.toLocaleString()} Won, Types: ${details.flatTypes.length}`);
      
      // Parse address details
      const sidoMatch = item.HSSPLY_ADRES.match(/^(서울|경기|인천|부산|daegu|대구|광주|대전|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주특별자치도|제주)\S*/);
      const sido = sidoMatch ? sidoMatch[0] : "";
      
      // Map housing category
      let subCategory = "아파트";
      const houseSecd = item.HOUSE_SECD_NM || "";
      if (houseSecd.includes("오피스텔")) {
        subCategory = "오피스텔";
      } else if (houseSecd.includes("도시형")) {
        subCategory = "도시형생활주택";
      } else if (houseSecd.includes("숙박")) {
        subCategory = "생활숙박시설";
      }
      
      // D. Build DB Row
      const insertData = {
        owner_id: ADMIN_OWNER_ID,
        owner_role: "ADMIN",
        property_type: "분양",
        trade_type: "분양",
        sub_category: subCategory,
        building_name: item.HOUSE_NM,
        detail_addr: item.HSSPLY_ADRES,
        sido: sido,
        lat: coords.lat,
        lng: coords.lng,
        deposit: Math.min(details.maxPrice || 0, 2147483647), // Max pre-sale price in KRW (capped for PG integer type)
        exclusive_m2: details.exclusiveM2,
        supply_m2: details.supplyM2,
        status: "ACTIVE",
        options: [],
        infrastructure: {},
        metadata: {
          houseManageNo: item.HOUSE_MANAGE_NO,
          pblancNo: item.PBLANC_NO,
          rcritPblancDe: item.RCRIT_PBLANC_DE,
          rceptBgnde: item.RCEPT_BGNDE,
          rceptEndde: item.RCEPT_ENDDE,
          przwnerPresnatnDe: item.PRZWNER_PRESNATN_DE,
          homepage: item.HMPG_ADRES,
          applyhomeUrl: item.PBLANC_URL,
          totalHouseholds: item.TOT_SUPLY_HSHLDCO,
          houseDtlSecdNm: item.HOUSE_DTL_SECD_NM,
          rentSecdNm: item.RENT_SECD_NM,
          flatTypes: details.flatTypes,
          syncedAt: new Date().toISOString()
        }
      };
      
      // E. Write to Supabase
      const { data: result, error } = await supabase
        .from("vacancies")
        .insert(insertData)
        .select("id")
        .single();
        
      if (error) {
        console.error(`❌ DB insert failed:`, error.message);
      } else {
        console.log(`🎉 Successfully saved pre-sale: "${item.HOUSE_NM}" (DB ID: ${result.id})`);
      }
    }
    
    console.log("\n🏁 Cheongyak Sync process completed successfully!");
  } catch (err) {
    console.error("Sync crashed:", err);
  }
}

sync();
