import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function findAdmin() {
  const { data: members, error } = await supabase
    .from('members')
    .select('id, name, email, role')
    .eq('role', 'ADMIN')
    .limit(3);

  console.log("Error:", error);
  console.log("Admins:", members);
}

findAdmin();
