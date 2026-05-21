import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function listAll() {
  const { data: vacancies } = await supabase
    .from('vacancies')
    .select('id, building_name, owner_id, status, trade_type, deposit, monthly_rent')
    .neq('status', 'DELETED');

  const { data: members } = await supabase
    .from('members')
    .select('id, email, name, role');

  console.log("ALL NON-DELETED VACANCIES IN DB:");
  vacancies.forEach(v => {
    const owner = members.find(m => m.id === v.owner_id);
    console.log(`- [${v.trade_type}] ${v.building_name} (${v.deposit}/${v.monthly_rent}) | Owner: ${owner ? owner.name : 'Unknown'} (${owner ? owner.email : ''}) | Status: ${v.status}`);
  });
}

listAll();
