import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://aijfktzqtnwhfotfwcka.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from("vacancies")
    .select("id, status, trade_type, property_type, sub_category, building_name, detail_addr, sido, sigungu, dong, lat, lng")
    .eq("trade_type", "경매")
    .limit(10);
    
  if (error) {
    console.error("Error fetching auctions:", error);
    return;
  }
  
  console.log("=== AUCTIONS SAMPLES ===");
  console.log(JSON.stringify(data, null, 2));

  // Let's count how many ACTIVE auctions we have
  const { count, error: countErr } = await supabase
    .from("vacancies")
    .select("*", { count: "exact", head: true })
    .eq("trade_type", "경매")
    .eq("status", "ACTIVE");
    
  console.log("Total ACTIVE auctions:", count);

  // Let's count active auctions by sido/sigungu/dong
  const { data: locations, error: locErr } = await supabase
    .from("vacancies")
    .select("sido, sigungu, dong")
    .eq("trade_type", "경매")
    .eq("status", "ACTIVE");

  console.log("Unique active auction locations:");
  const locCounts = {};
  for (const l of locations || []) {
    const key = `${l.sido} ${l.sigungu} ${l.dong}`;
    locCounts[key] = (locCounts[key] || 0) + 1;
  }
  console.log(locCounts);
}
check();
