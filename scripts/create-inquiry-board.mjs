import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
dotenv.config({ path: resolve(__dirname, "../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // Check if inquiry board already exists
  const { data: existing } = await supabase
    .from("boards")
    .select("*")
    .eq("board_id", "inquiry")
    .single();

  if (existing) {
    console.log("✅ 'inquiry' 게시판이 이미 존재합니다:", existing);
    return;
  }

  // Create the inquiry board
  const { data, error } = await supabase.from("boards").insert({
    board_id: "inquiry",
    name: "1:1 문의",
    subtitle: "관리자에게 궁금한 내용을 문의하세요",
    description: "1:1 비밀 문의 게시판입니다. 작성자 본인과 관리자만 열람할 수 있습니다.",
    board_type: "inquiry",
    skin_type: "LIST",
    perm_list: 1,
    perm_read: 1,
    perm_write: 1,
    sort_order: 99,
    is_active: true,
  }).select();

  if (error) {
    console.error("❌ 게시판 생성 실패:", error.message);
  } else {
    console.log("✅ 'inquiry' 게시판 생성 완료:", data);
  }
}

main();
