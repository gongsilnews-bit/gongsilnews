import fs from "fs";

async function run() {
  const specs = [
    { name: "cheongyak-pre-sale", url: "https://infuser.odcloud.kr/api/stages/37000/api-docs" },
    { name: "cheongyak-competition", url: "https://infuser.odcloud.kr/api/stages/36148/api-docs" }
  ];

  for (const spec of specs) {
    console.log(`Fetching Swagger documentation for ${spec.name}...`);
    try {
      const res = await fetch(spec.url);
      const data = await res.json();
      fs.writeFileSync(`scratch/${spec.name}-swagger.json`, JSON.stringify(data, null, 2));
      console.log(`Saved Swagger docs to scratch/${spec.name}-swagger.json`);

      if (data.paths) {
        console.log(`\nAvailable Endpoints for ${spec.name}:`);
        Object.keys(data.paths).forEach(path => {
          const methods = Object.keys(data.paths[path]);
          const summary = data.paths[path][methods[0]]?.summary || "No summary";
          console.log(`- [${methods[0].toUpperCase()}] ${path} (${summary})`);
        });
        console.log("");
      }
    } catch (err) {
      console.error(`Error fetching ${spec.name} swagger docs:`, err);
    }
  }
}

run();
