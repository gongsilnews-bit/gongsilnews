const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function testSingleUpdate() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Get one photo with THNL_NM
  const { data: photos } = await supabase
    .from("vacancy_photos")
    .select("id, url")
    .like("url", "%downloadImageKind=THNL_NM%")
    .limit(1);

  if (!photos || photos.length === 0) {
    console.log("No photos found!");
    return;
  }

  const photo = photos[0];
  console.log(`Original URL: ${photo.url}`);
  
  const newUrl = photo.url.replace("downloadImageKind=THNL_NM", "downloadImageKind=ORIG_NM");
  console.log(`New URL:      ${newUrl}`);

  const { data, error } = await supabase
    .from("vacancy_photos")
    .update({ url: newUrl })
    .eq("id", photo.id)
    .select();

  if (error) {
    console.error("❌ Update failed with error:", error.message);
  } else {
    console.log("✅ Update succeeded! Result:", data);
  }
}

testSingleUpdate();
