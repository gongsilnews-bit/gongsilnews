const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function checkDbImages() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, serviceKey);

  // 1. Fetch 3 Onbid photo URLs
  const { data: onbidPhotos } = await supabase
    .from("vacancy_photos")
    .select("id, url, vacancies(trade_type, building_name)")
    .like("url", "%onbid.co.kr%")
    .limit(3);

  console.log("🔥 Onbid Photos in DB:");
  onbidPhotos?.forEach(p => {
    console.log(`  * ID=${p.id}, Title=${p.vacancies?.building_name}, URL=${p.url}`);
  });

  // 2. Fetch 3 Standard photo URLs
  const { data: stdPhotos } = await supabase
    .from("vacancy_photos")
    .select("id, url, vacancies(trade_type, building_name)")
    .not("url", "like", "%onbid.co.kr%")
    .limit(3);

  console.log("\n📦 Standard Photos in DB:");
  stdPhotos?.forEach(p => {
    console.log(`  * ID=${p.id}, Title=${p.vacancies?.building_name}, URL=${p.url}`);
  });
}

checkDbImages();
