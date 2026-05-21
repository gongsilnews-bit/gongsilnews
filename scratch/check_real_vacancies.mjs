import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function listVacancies() {
  const { data: vacancies, error } = await supabase
    .from('vacancies')
    .select('id, building_name, trade_type, deposit, monthly_rent, sido, sigungu, dong')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log("Error:", error);
  console.log("Vacancies Count:", vacancies?.length);
  console.log("Vacancies:", JSON.stringify(vacancies, null, 2));
}

listVacancies();
