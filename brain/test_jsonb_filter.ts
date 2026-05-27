import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  // Test filtering: metadata->>source_type is distinct from 'ONBID'
  const { data, error, count } = await supabase
    .from("vacancies")
    .select("id, metadata", { count: "exact" })
    .or("metadata->>source_type.is.null,metadata->>source_type.neq.ONBID");

  if (error) {
    console.error("Query Error:", error);
  } else {
    console.log("Success! Count of non-onbid listings:", count);
    if (data) {
      console.log("Sample non-onbid metadata:", data.slice(0, 5).map(x => x.metadata));
    }
  }
}
run();
