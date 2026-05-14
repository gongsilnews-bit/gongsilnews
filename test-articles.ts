import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkRecentArticles() {
  console.log("Checking recent articles...");
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log("Error:", error);
  console.log("Recent 5 Articles:", data);
}

checkRecentArticles();
