const { ethers } = require("hardhat");
require("dotenv").config();
async function main() {
  const { NFT_ADDRESS, MARKETPLACE_ADDRESS, TOKEN_ID, LISTING_PRICE_ETH } = process.env;
  if (!ethers.isAddress(NFT_ADDRESS || "") || !ethers.isAddress(MARKETPLACE_ADDRESS || "") || !/^\d+$/.test(TOKEN_ID || "") || !LISTING_PRICE_ETH) throw new Error("Set NFT_ADDRESS, MARKETPLACE_ADDRESS, TOKEN_ID and LISTING_PRICE_ETH locally.");
  const [signer] = await ethers.getSigners();
  if (!signer) throw new Error("Configure PRIVATE_KEY locally.");
  const nft = await ethers.getContractAt("NFT", NFT_ADDRESS);
  const marketplace = await ethers.getContractAt("Marketplace", MARKETPLACE_ADDRESS);
  if ((await nft.ownerOf(TOKEN_ID)).toLowerCase() !== signer.address.toLowerCase()) throw new Error("Connected wallet does not own this NFT.");
  await marketplace.proceeds(signer.address);
  const price = ethers.parseEther(LISTING_PRICE_ETH);
  if (price <= 0n) throw new Error("Price must be positive.");
  await (await nft.approve(MARKETPLACE_ADDRESS, TOKEN_ID)).wait();
  await (await marketplace.listNFT(NFT_ADDRESS, TOKEN_ID, price)).wait();
  console.log("NFT listed:", TOKEN_ID);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
