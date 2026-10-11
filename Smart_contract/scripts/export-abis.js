const fs = require("node:fs");
const path = require("node:path");
for (const name of ["Marketplace", "NFT"]) {
  const artifact = require(`../artifacts/contracts/${name}.sol/${name}.json`);
  fs.writeFileSync(path.join(__dirname, `../../frontend/src/abis/${name}.json`), JSON.stringify({ abi: artifact.abi }, null, 2) + "\n");
}
console.log("Frontend ABIs updated from compiled contracts.");
