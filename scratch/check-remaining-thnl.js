const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function checkRemainingThnl() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: photos, error } = await supabase
    .from("vacancy_photos")
    .select("id, url, vacancy_id")
    .like("url", "%downloadImageKind=THNL_NM%");

  if (error) {
    console.error("❌ Error fetching photos:", error.message);
    return;
  }

  console.log(`🔎 Found ${photos.length} photos in DB still using THNL_NM.`);
  if (photos.length > 0) {
    console.log("🔥 Sample remaining THNL_NM photos:");
    photos.slice(0, 5).forEach(p => {
      console.log(`  * ID=${p.id}, VacancyID=${p.vacancy_id}, URL=${p.url}`);
    });
  }
}

checkRemainingThnl();
