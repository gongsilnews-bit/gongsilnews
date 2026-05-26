import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://aijfktzqtnwhfotfwcka.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from("vacancies")
    .select("id, building_name, deposit, metadata")
    .like("building_name", "%봉오대로 270%")
    .eq("deposit", 27000)
    .limit(3);
    
  if (error) {
    console.error(error);
    return;
  }
  
  for (const row of data) {
    console.log(`ID: ${row.id}`);
    console.log(`Building: ${row.building_name}`);
    console.log(`bid_start_date: ${row.metadata?.bid_start_date}`);
    console.log(`bid_end_date: ${row.metadata?.bid_end_date}`);
    console.log(`cltrBidBgngDt (Start): ${row.metadata?.cltrBidBgngDt}`);
    console.log(`cltrBidEndDt (End): ${row.metadata?.cltrBidEndDt}`);
    console.log(`pblctBgnDtm (Pub): ${row.metadata?.pblctBgnDtm}`);
    console.log(`------------------------------------`);
  }
}
check();
