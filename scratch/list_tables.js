const fs = require('fs');
const path = require('path');

// Read env variables
const envPath = path.join(__dirname, '..', '.env.local');
const dotenvVars = fs.readFileSync(envPath, 'utf8').split('\n').reduce((acc, line) => {
  if (line.includes('=')) {
    const parts = line.split('=');
    acc[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
  }
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(dotenvVars.NEXT_PUBLIC_SUPABASE_URL, dotenvVars.SUPABASE_SERVICE_ROLE_KEY);

async function listTables() {
  const { data, error } = await supabase.rpc('get_tables');
  if (error) {
    // If no RPC, try querying schema info directly using raw SQL if possible, or try a system query.
    // In Supabase we can try running a query on information_schema via standard postgres query.
    // However, Supabase js client doesn't allow arbitrary SQL unless we have a specific RPC.
    // Let's check what RPCs are available, or try fetching from common tables.
    console.log('Error calling get_tables RPC:', error.message);
    
    // Let's try selecting from pg_class or information_schema.tables if a view is exposed, or check common table names.
    const commonTables = [
      'members', 'vacancies', 'articles', 'comments', 'site_inquiries', 'inquiries',
      'talk_rooms', 'talk_room_members', 'talk_messages', 'talk_friends', 'talk_friend_folders',
      'article_comments', 'vacancy_comments', 'board_comments', 'agencies'
    ];
    console.log('Checking existence of common tables:');
    for (const t of commonTables) {
      const { error: err } = await supabase.from(t).select('*').limit(0);
      if (!err) {
        console.log(`- ${t}: EXISTS`);
      } else {
        console.log(`- ${t}: FAILED (${err.message})`);
      }
    }
  } else {
    console.log('Tables:', data);
  }
}

listTables();
