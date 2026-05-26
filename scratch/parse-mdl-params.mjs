import fs from "fs";

const data = JSON.parse(fs.readFileSync("scratch/cheongyak-pre-sale-swagger.json", "utf8"));
const path = "/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancMdl";
const spec = data.paths[path];

if (spec && spec.get && spec.get.parameters) {
  console.log("Parameter Names:");
  spec.get.parameters.forEach(p => {
    console.log(`- ${p.name} (${p.description || "No description"})`);
  });
}
