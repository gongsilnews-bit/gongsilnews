import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://aijfktzqtnwhfotfwcka.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from("vacancies")
    .select("metadata")
    .eq("trade_type", "경매")
    .limit(100);

  if (error) {
    console.error(error);
    return;
  }

  const mclsVals = new Set();
  const sclsVals = new Set();

  for (const row of data || []) {
    const meta = row.metadata || {};
    if (meta.cltrUsgMclsCtgrNm) mclsVals.add(meta.cltrUsgMclsCtgrNm);
    if (meta.cltrUsgSclsCtgrNm) sclsVals.add(meta.cltrUsgSclsCtgrNm);
  }

  console.log("Unique cltrUsgMclsCtgrNm:", Array.from(mclsVals));
  console.log("Unique cltrUsgSclsCtgrNm:", Array.from(sclsVals));
}
check();
