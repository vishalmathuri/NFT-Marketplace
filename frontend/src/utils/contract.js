import { BrowserProvider, JsonRpcProvider, Contract, isAddress } from "ethers";
import marketplaceArtifact from "../abis/Marketplace.json";
import nftArtifact from "../abis/NFT.json";

export const SEPOLIA_ID = "0xaa36a7";
export const marketplaceAddress = import.meta.env.VITE_MARKETPLACE_ADDRESS;
export const nftAddress = import.meta.env.VITE_NFT_ADDRESS;
export const backendURL = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
export const rpcURL = import.meta.env.VITE_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
function checkAddresses() {
  if (!isAddress(marketplaceAddress || "") || !isAddress(nftAddress || "")) {
    throw new Error("Marketplace configuration is missing. Set the deployed Sepolia contract addresses and rebuild the frontend.");
  }
}
export function getReadContracts() {
  checkAddresses();
  const provider = new JsonRpcProvider(rpcURL, 11155111);
  return { marketplace: new Contract(marketplaceAddress, marketplaceArtifact.abi, provider), provider };
}
export async function getContracts() {
  checkAddresses();
  if (!window.ethereum) throw new Error("Install MetaMask or another Ethereum wallet to transact.");
  const chain = await window.ethereum.request({ method: "eth_chainId" });
  if (chain.toLowerCase() !== SEPOLIA_ID) throw new Error("Switch your wallet to Ethereum Sepolia.");
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const marketplace = new Contract(marketplaceAddress, marketplaceArtifact.abi, signer);
  const nft = new Contract(nftAddress, nftArtifact.abi, signer);
  if (await provider.getCode(marketplaceAddress) === "0x" || await provider.getCode(nftAddress) === "0x") {
    throw new Error("No contract found at the configured Sepolia addresses.");
  }
  // Do not silently attach the new UI to the incompatible old marketplace.
  try { await marketplace.proceeds(await signer.getAddress()); }
  catch { throw new Error("Deploy the updated Marketplace contract and configure its new address."); }
  return { marketplace, nft, signer };
}
export async function switchToSepolia() {
  if (!window.ethereum) throw new Error("Install an Ethereum wallet first.");
  try { await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA_ID }] }); }
  catch (error) {
    if (error.code !== 4902) throw error;
    await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{ chainId: SEPOLIA_ID, chainName: "Ethereum Sepolia", nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 }, rpcUrls: [rpcURL], blockExplorerUrls: ["https://sepolia.etherscan.io"] }] });
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA_ID }] });
  }
}
export function errorMessage(error) {
  if ([4001, "ACTION_REJECTED"].includes(error.code) || error.info?.error?.code === 4001) return "Wallet request declined. You can try again.";
  if (error.code === "INSUFFICIENT_FUNDS") return "Not enough Sepolia ETH for the price and gas fee.";
  return error.response?.data?.error || error.reason || error.shortMessage || error.message || "Request failed. Please try again.";
}
