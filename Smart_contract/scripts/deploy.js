const { ethers } = require("hardhat");
async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("Configure PRIVATE_KEY locally for deployment.");
  let nftAddress = process.env.NFT_ADDRESS;
  if (nftAddress) {
    if (!ethers.isAddress(nftAddress) || await ethers.provider.getCode(nftAddress) === "0x") throw new Error("NFT_ADDRESS must be an existing ERC721 contract on this network.");
    const nft = await ethers.getContractAt("NFT", nftAddress);
    if (!await nft.supportsInterface("0x80ac58cd")) throw new Error("NFT_ADDRESS is not ERC721.");
  } else {
    const nft = await (await ethers.getContractFactory("NFT")).deploy();
    await nft.waitForDeployment(); nftAddress = await nft.getAddress();
  }
  const marketplace = await (await ethers.getContractFactory("Marketplace")).deploy();
  await marketplace.waitForDeployment();
  console.log(`VITE_NFT_ADDRESS=${nftAddress}`);
  console.log(`VITE_MARKETPLACE_ADDRESS=${await marketplace.getAddress()}`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
