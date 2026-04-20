import fs from "fs";
import { createClient } from "@supabase/supabase-js";

function getEnv() {
  const env: any = {};
  if (fs.existsSync(".env.local")) {
    const lines = fs.readFileSync(".env.local", "utf-8").split('\n');
    lines.forEach(line => {
      const parts = line.split('=');
      if(parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      }
    });
  }
  return env;
}

const env = getEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase.from('board_posts').select('*').eq('board_id', 'drone').order('created_at', { ascending: false });
  console.log("Error:", error);
  console.log("Total drone posts in DB:", data?.length);
  const myPosts = data?.filter((p: any) => p.title.includes("논현동"));
  console.log("My inserted posts:", myPosts?.length);
  if(myPosts && myPosts.length > 0) {
    console.log("Latest created_at:", myPosts[0].created_at);
  }
  process.exit(0);
}
main();
