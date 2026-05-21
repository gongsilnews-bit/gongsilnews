import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function listVacanciesWithOwner() {
  const { data: vacancies, error } = await supabase
    .from('vacancies')
    .select('id, building_name, owner_id')
    .limit(5);

  const { data: members } = await supabase
    .from('members')
    .select('id, email, name, role')
    .limit(10);

  console.log("Vacancies:", vacancies);
  console.log("Members:", members);
}

listVacanciesWithOwner();
