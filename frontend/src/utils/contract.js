import { BrowserProvider, Contract } from "ethers";
import marketplaceArtifact from "../abis/Marketplace.json";
import nftArtifact from "../abis/NFT.json";

// 🔥 Your deployed addresses
const marketplaceAddress = "0x9f4D4322c5231943f8bb3A3B0102B8370d561133";
const nftAddress = "0x5257a7E5F95FB75393Ab9fc943f5aE5DBc3b3Ab7";

export async function getContracts() {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }

  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const marketplace = new Contract(
    marketplaceAddress,
    marketplaceArtifact.abi,
    signer
  );

  const nft = new Contract(
    nftAddress,
    nftArtifact.abi,
    signer
  );

  return { marketplace, nft };
}