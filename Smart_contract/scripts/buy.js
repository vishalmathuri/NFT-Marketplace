const hre = require("hardhat");

async function main() {
  const [buyer] = await hre.ethers.getSigners();

  console.log("Buying with account:", await buyer.getAddress());

  const marketplaceAddress = "0xe154768d101702137207f4B1f50b35E78036E06A";

  const Marketplace = await hre.artifacts.readArtifact("Marketplace");

  const marketplace = new hre.ethers.Contract(
    marketplaceAddress,
    Marketplace.abi,
    buyer
  );

  const itemId = 1;

  // Get item details
  const item = await marketplace.items(itemId);
  const price = item.price;

  const tx = await marketplace.buyNFT(itemId, {
    value: price
  });

  await tx.wait();

  console.log("✅ NFT Purchased Successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
