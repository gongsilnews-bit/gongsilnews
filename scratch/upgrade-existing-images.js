const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function upgradeAllImages() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceKey) {
    console.error("❌ Supabase environment variables are missing!");
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  console.log("🚀 Starting complete database upgrade of all Onbid images to high-resolution...");

  let loop = true;
  let totalUpgraded = 0;

  while (loop) {
    // 1. Fetch up to 1000 photos with THNL_NM
    const { data: photos, error: fetchErr } = await supabase
      .from("vacancy_photos")
      .select("id, url")
      .like("url", "%downloadImageKind=THNL_NM%")
      .limit(1000);

    if (fetchErr) {
      console.error("❌ Failed to fetch photos:", fetchErr.message);
      break;
    }

    if (!photos || photos.length === 0) {
      console.log("✅ All low-resolution Onbid images have been successfully upgraded!");
      loop = false;
      break;
    }

    console.log(`📸 Fetched ${photos.length} more low-res photos. Upgrading...`);

    // 2. Perform bulk update or sequential updates
    let successCount = 0;
    for (const photo of photos) {
      const newUrl = photo.url.replace("downloadImageKind=THNL_NM", "downloadImageKind=ORIG_NM");
      const { error: updateErr } = await supabase
        .from("vacancy_photos")
        .update({ url: newUrl })
        .eq("id", photo.id);

      if (updateErr) {
        console.error(`❌ Failed to update photo ${photo.id}:`, updateErr.message);
      } else {
        successCount++;
      }
    }

    totalUpgraded += successCount;
    console.log(`⚡ Upgraded ${successCount}/${photos.length} in this batch. Total upgraded: ${totalUpgraded}`);

    // Safety pause to avoid hitting rate limits
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`🎉 Upgrade process complete! Total images updated to high-resolution: ${totalUpgraded}`);
}

upgradeAllImages();
