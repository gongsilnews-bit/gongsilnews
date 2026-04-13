const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});

async function run() {
  const membersRes = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/members?select=id,name&email=eq.gongsilmarketing@gmail.com`, {
    headers: { 'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'Authorization': `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` }
  });
  const members = await membersRes.json();
  console.log("Member:", members);

  if (members.length > 0) {
    const vacRes = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/vacancies?select=id,status,owner_id,client_name&owner_id=eq.${members[0].id}`, {
      headers: { 'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'Authorization': `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` }
    });
    const vacs = await vacRes.json();
    console.log("Vacancies:", vacs);
  }
}
run();
