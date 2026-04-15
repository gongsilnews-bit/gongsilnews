import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://aijfktzqtnwhfotfwcka.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpamZrdHpxdG53aGZvdGZ3Y2thIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY4ODY3NywiZXhwIjoyMDkxMjY0Njc3fQ.LAjlpvT8Tl6QZ9Ja3A-388FE9fZxtTOxC0otjRDq_yM";

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixArticle() {
  const { data: member } = await supabase.from('members').select('id').eq('email', 'gongsilmarketing@gmail.com').single();
  
  const { data: articles } = await supabase.from('articles').select('*').eq('status', 'REJECTED');
  for (const a of articles || []) {
     if (a.author_name === '김동현') {
       console.log("Found Kim Donghyun's article. Updating author_id. Title:", a.title);
       await supabase.from('articles').update({ author_id: member.id }).eq('id', a.id);
     }
  }
  console.log("Done");
}
fixArticle();
