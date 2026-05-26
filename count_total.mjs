import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://aijfktzqtnwhfotfwcka.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // Get exact count of all vacancies in the table
  const { count: totalCount, error: totalErr } = await supabase
    .from("vacancies")
    .select("*", { count: "exact", head: true });
    
  // Get exact count of trade_type === "경매" (Onbid public auction)
  const { count: auctionCount, error: auctionErr } = await supabase
    .from("vacancies")
    .select("*", { count: "exact", head: true })
    .eq("trade_type", "경매");
    
  // Get exact count of trade_type === "경매" in capital region (Seoul, Gyeonggi, Incheon)
  const { count: capitalAuctionCount, error: capErr } = await supabase
    .from("vacancies")
    .select("*", { count: "exact", head: true })
    .eq("trade_type", "경매")
    .in("sido", ["서울특별시", "경기도", "인천광역시", "서울", "경기", "인천"]);

  if (totalErr || auctionErr || capErr) {
    console.error("Errors:", { totalErr, auctionErr, capErr });
    return;
  }
  
  console.log("=== EXACT COUNTS IN SUPABASE ===");
  console.log("Total rows in vacancies table:", totalCount);
  console.log("Total trade_type = '경매' (Onbid) rows:", auctionCount);
  console.log("Total capital region Onbid rows:", capitalAuctionCount);
  
  // Let's query sidos by fetching in batches to see if there are any non-capital sidos
  let allRows = [];
  let page = 0;
  const pageSize = 1000;
  let keepFetching = true;
  
  while (keepFetching) {
    const { data, error } = await supabase
      .from("vacancies")
      .select("sido, trade_type")
      .range(page * pageSize, (page + 1) * pageSize - 1);
      
    if (error) {
      console.error("Fetch error:", error);
      break;
    }
    
    if (data.length === 0) {
      keepFetching = false;
    } else {
      allRows.push(...data);
      if (data.length < pageSize) {
        keepFetching = false;
      } else {
        page++;
      }
    }
  }
  
  console.log("\n=== ALL ROWS IN MEMORY (FETCHED IN BATCHES) ===");
  console.log("Fetched in memory:", allRows.length);
  
  const sidos = {};
  const tradeTypes = {};
  for (const row of allRows) {
    sidos[row.sido] = (sidos[row.sido] || 0) + 1;
    tradeTypes[row.trade_type] = (tradeTypes[row.trade_type] || 0) + 1;
  }
  console.log("By Sido:", sidos);
  console.log("By Trade Type:", tradeTypes);
}
check();
