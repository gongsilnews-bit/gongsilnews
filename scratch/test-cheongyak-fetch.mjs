import fs from "fs";
import dotenv from "dotenv";

// Load environment variables from .env.local
if (fs.existsSync(".env.local")) {
  const envConfig = dotenv.parse(fs.readFileSync(".env.local"));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const serviceKey = process.env.ONBID_API_KEY || process.env.NEXT_PUBLIC_BROKERAGE_API_KEY;

if (!serviceKey) {
  console.error("API Key not found in .env.local!");
  process.exit(1);
}

async function fetchPreSales() {
  // Public data portal uses odcloud base URL: api.odcloud.kr/api
  const endpoint = "/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail";
  const queryParams = new URLSearchParams({
    page: "1",
    perPage: "5",
    // Note: Open Data portal requires the exact ServiceKey
    serviceKey: serviceKey
  });

  const url = `https://api.odcloud.kr/api${endpoint}?${queryParams.toString()}`;
  console.log(`Fetching from: https://api.odcloud.kr/api${endpoint}?page=1&perPage=5&serviceKey=***`);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    
    console.log("\n--- API Response Metadata ---");
    console.log(`Page: ${data.page}`);
    console.log(`Per Page: ${data.perPage}`);
    console.log(`Total Count: ${data.totalCount}`);
    console.log("-----------------------------\n");

    if (data.data && data.data.length > 0) {
      console.log("Keys and Values of the first item:");
      Object.entries(data.data[0]).forEach(([key, val]) => {
        console.log(`- ${key}: ${val}`);
      });
    } else {
      console.log("No data returned from API. Double check service key or API activation status.");
      console.log("Raw Response:", data);
    }
  } catch (err) {
    console.error("Failed to fetch pre-sale data:", err);
  }
}

fetchPreSales();
