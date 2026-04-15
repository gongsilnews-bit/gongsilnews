import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data } = await supabase.from('articles').select('content').eq('article_no', 11).single();
  console.log("=== CONTENT START ===");
  console.log(data?.content || "no data");
  console.log("=== CONTENT END ===");
}
check();
