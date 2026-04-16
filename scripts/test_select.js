require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing DB credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function testSelect() {
  const selectedColumns = 'id, vacancy_no, status, property_type, sub_category, trade_type, deposit, monthly_rent, maintenance_fee, commission_type, supply_m2, supply_py, exclusive_m2, exclusive_py, room_count, bath_count, direction, current_floor, total_floor, parking, move_in_date, sido, sigungu, dong, detail_addr, building_name, lat, lng, created_at, owner_id, owner_role, realtor_commission, owner_relation, client_name, client_phone, approval_year, total_units, options, members!vacancies_owner_id_fkey(name, email, role, phone, agencies(name, phone)), vacancy_photos(url, sort_order)';
  
  const { data, error } = await supabase
      .from('vacancies')
      .select(selectedColumns)
      .limit(1);

  if (error) {
    console.error("SUPABASE ERROR:", error.message);
  } else {
    console.log("SUCCESS!", data);
  }
}

testSelect();
