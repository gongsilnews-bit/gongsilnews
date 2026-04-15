import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data } = await supabase.from('articles').select('content').eq('article_no', 20).single();
  console.log(data?.content || "no data");
  
  if (!data) {
     const { data: d2 } = await supabase.from('articles').select('content').eq('id', '20').single();
     console.log(d2?.content);
  }
}
check();
