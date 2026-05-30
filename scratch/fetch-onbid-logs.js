const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env.local") });

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

async function fetchLogs() {
  const supabase = getAdminClient();
  const { data: logs, error } = await supabase
    .from("agent_chats")
    .select("created_at, role, content")
    .eq("channel_id", "onbid_sync_log")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error fetching logs:", error);
    return;
  }

  console.log("=== LATEST 100 ONBID SYNC LOGS ===");
  let successCount = 0;
  let failCount = 0;
  const errorSummary = {};

  logs.forEach((log, index) => {
    try {
      const content = JSON.parse(log.content);
      if (content.success) {
        successCount++;
      } else {
        failCount++;
        errorSummary[content.error] = (errorSummary[content.error] || 0) + 1;
      }
      if (index < 20) {
        console.log(`[${index + 1}] CreatedAt: ${log.created_at} | Target: ${content.target} | Success: ${content.success} | Reg/Upd/Del/Skip: ${content.registered}/${content.updated}/${content.expired}/${content.skipped} | Error: ${content.error || 'None'}`);
      }
    } catch {
      console.log(`[${index + 1}] Raw: ${log.content}`);
    }
  });

  console.log("\n=== SUMMARY ===");
  console.log(`Total logs inspected: ${logs.length}`);
  console.log(`Successes: ${successCount}`);
  console.log(`Failures: ${failCount}`);
  console.log("Failure Reasons:", errorSummary);
}

fetchLogs().catch(console.error);
