const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
    const { data } = await supabase.from('agencies').select('*').limit(1);
    if (data && data.length > 0) {
        console.log('agencies columns:', Object.keys(data[0]));
    }
    const { data: mData } = await supabase.from('members').select('*').limit(1);
    if (mData && mData.length > 0) {
        console.log('members columns:', Object.keys(mData[0]));
    }
})();
