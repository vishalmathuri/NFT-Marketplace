const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();

  console.log("Minting with account:", await signer.getAddress());

  // Replace with your deployed NFT contract address
  const nftAddress = "0x90499F4d447014434aA58DFf68321F9eE862faA3";

  const NFT = await hre.artifacts.readArtifact("NFT");

  const nft = new hre.ethers.Contract(
    nftAddress,
    NFT.abi,
    signer
  );

  const tokenURI = "https://ipfs.io/ipfs/YOUR_METADATA_HASH";

  const tx = await nft.mint(tokenURI);
  await tx.wait();

  console.log("✅ NFT Minted Successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
