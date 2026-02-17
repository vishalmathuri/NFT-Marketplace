const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();

  console.log("Listing with account:", await signer.getAddress());

  const nftAddress = "0x90499F4d447014434aA58DFf68321F9eE862faA3";
  const marketplaceAddress = "0xe154768d101702137207f4B1f50b35E78036E06A";

  const NFT = await hre.artifacts.readArtifact("NFT");
  const Marketplace = await hre.artifacts.readArtifact("Marketplace");

  const nft = new hre.ethers.Contract(nftAddress, NFT.abi, signer);
  const marketplace = new hre.ethers.Contract(marketplaceAddress, Marketplace.abi, signer);

  const tokenId = 1;
  const price = hre.ethers.parseEther("0.01");

  // 🔥 IMPORTANT: Approve marketplace first
  let tx = await nft.setApprovalForAll(marketplaceAddress, true);
  await tx.wait();
  console.log("Marketplace approved");

  // Now list
  tx = await marketplace.listNFT(nftAddress, tokenId, price);
  await tx.wait();

  console.log("✅ NFT Listed Successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
