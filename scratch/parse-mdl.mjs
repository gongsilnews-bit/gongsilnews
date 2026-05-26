import fs from "fs";

const data = JSON.parse(fs.readFileSync("scratch/cheongyak-pre-sale-swagger.json", "utf8"));
const path = "/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancMdl";
const spec = data.paths[path];

if (spec) {
  console.log("Endpoint found in Swagger:");
  console.log(JSON.stringify(spec, null, 2).slice(0, 1000) + "...\n");
} else {
  console.log("Endpoint not found under standard key. Let's list keys containing getAPTLttotPblancMdl:");
  Object.keys(data.paths).forEach(k => {
    if (k.toLowerCase().includes("getaptlttotpblancmdl")) {
      console.log(`- ${k}`);
      console.log(JSON.stringify(data.paths[k], null, 2).slice(0, 500) + "...\n");
    }
  });
}
