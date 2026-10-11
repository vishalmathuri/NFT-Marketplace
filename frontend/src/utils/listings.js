import { Contract } from "ethers";

export function safeURL(value) {
  if (typeof value !== "string") return null;
  const url = value.startsWith("ipfs://") ? `https://gateway.pinata.cloud/ipfs/${value.slice(7).replace(/^ipfs\//, "")}` : value;
  try { const parsed = new URL(url); return parsed.protocol === "https:" ? parsed.href : null; }
  catch { return null; }
}

// Bounded parallel work avoids serial IPFS waits and RPC request floods.
export async function mapConcurrent(values, limit, fn) {
  const results = new Array(values.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (next < values.length) { const index = next++; results[index] = await fn(values[index], index); }
  }));
  return results;
}
export async function loadListings(marketplace, { start = 1, pageSize = 24, getMetadata, makeNFT } = {}) {
  const count = Number(await marketplace.itemCount());
  const end = Math.min(count, start + pageSize - 1);
  const ids = Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i);
  const rows = await mapConcurrent(ids, 6, async id => {
    const item = await marketplace.items(id);
    if (item.sold || item.cancelled) return null;
    const fallback = { itemId: item.itemId.toString(), nft: item.nft, tokenId: item.tokenId.toString(), price: item.price.toString(), seller: item.seller, name: `NFT #${item.tokenId}`, description: "Metadata unavailable. The on-chain listing is still active.", image: null, metadataUnavailable: true };
    try {
      const nft = makeNFT ? makeNFT(item.nft) : new Contract(item.nft, ["function tokenURI(uint256) view returns (string)"], marketplace.runner);
      const uri = safeURL(await nft.tokenURI(item.tokenId));
      if (!uri) return fallback;
      const meta = await getMetadata(uri);
      return { ...fallback, name: typeof meta.name === "string" ? meta.name.slice(0, 100) : fallback.name, description: typeof meta.description === "string" ? meta.description.slice(0, 2000) : "No description provided", image: safeURL(meta.image), metadataUnavailable: false };
    } catch { return fallback; }
  });
  return { items: rows.filter(Boolean), next: end < count ? end + 1 : null, count };
}
