async function run() {
  console.log("Fetching API...");
  try {
    const res = await fetch("http://localhost:3000/api/cron/news-article?manual=true");
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch error:", err);
  }
}
run();
