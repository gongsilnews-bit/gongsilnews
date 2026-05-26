import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Env variables!")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function checkStatusDistribution() {
  console.log("Checking status distribution in vacancies table...")

  // 전체 데이터 status 별로 카운트
  const { data, error } = await supabase
    .from("vacancies")
    .select("status, trade_type")
  
  if (error) {
    console.error("Error fetching vacancies:", error.message)
    return
  }

  console.log(`Total rows fetched: ${data.length}`)

  const statusCount = {}
  const tradeTypeCount = {}
  const statusByTradeType = {}

  data.forEach((row) => {
    statusCount[row.status] = (statusCount[row.status] || 0) + 1
    tradeTypeCount[row.trade_type] = (tradeTypeCount[row.trade_type] || 0) + 1

    if (!statusByTradeType[row.trade_type]) {
      statusByTradeType[row.trade_type] = {}
    }
    statusByTradeType[row.trade_type][row.status] = (statusByTradeType[row.trade_type][row.status] || 0) + 1
  })

  console.log("\n=== Status Distribution ===")
  console.log(statusCount)

  console.log("\n=== Trade Type Distribution ===")
  console.log(tradeTypeCount)

  console.log("\n=== Status Distribution BY Trade Type ===")
  console.dir(statusByTradeType, { depth: null })
}

checkStatusDistribution()
