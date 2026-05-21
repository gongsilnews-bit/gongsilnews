import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(".", ".env.local") });

const ADMIN_EMAIL = "gongsilnews@gmail.com";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing env variables in .env.local!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const { data: adminUser, error } = await supabase
    .from('members')
    .select('sns_links')
    .eq('email', ADMIN_EMAIL)
    .single();

  if (error || !adminUser) {
    console.error("Failed to load admin user:", error);
    process.exit(1);
  }

  const apiList = adminUser.sns_links?.api_list || [];
  const geminiApi = apiList.find((api) => api.provider === "구글" || api.provider === "구글 (Gemini)");
  
  if (!geminiApi || !geminiApi.key_value) {
    console.error("Gemini API key not found in DB!");
    process.exit(1);
  }

  const apiKey = geminiApi.key_value.trim();
  console.log("API Key loaded successfully:", apiKey.substring(0, 5) + "..." + apiKey.substring(apiKey.length - 5));

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    console.error("API Call Failed:", data);
  } else {
    console.log("Supported Models:");
    data.models.forEach((m) => {
      console.log(`- ${m.name}: ${m.supportedGenerationMethods.join(", ")}`);
    });
  }
}

main().catch(console.error);
