import { BrowserProvider, Contract } from "ethers";
import marketplaceArtifact from "../abis/Marketplace.json";
import nftArtifact from "../abis/NFT.json";

// !! Ensure these addresses match your latest terminal output !!
const marketplaceAddress = "0xe154768d101702137207f4B1f50b35E78036E06A";
const nftAddress = "0x90499F4d447014434aA58DFf68321F9eE862faA3";

export async function getContracts() {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }

  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  // VALIDATION: Check if contract code exists at this address on the current network
  const code = await provider.getCode(marketplaceAddress);
  if (code === "0x") {
    throw new Error("No contract found at address. Check your network!");
  }

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