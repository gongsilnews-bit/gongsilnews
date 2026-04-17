import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const { data, error } = await supabase.from('articles').select('updated_at').limit(1);
console.log("DB ERROR:", error);
console.log("DB DATA:", data);
