import { test } from "node:test";
import assert from "node:assert/strict";
import { loadListings, safeURL, mapConcurrent } from "../src/utils/listings.js";
const row = (id, values = {}) => ({ itemId: BigInt(id), tokenId: BigInt(id), nft: `nft-${id}`, seller: "seller", price: 1n, sold: false, cancelled: false, ...values });
test("resolves IPFS and blocks unsafe URL protocols", () => {
  assert.equal(safeURL("ipfs://abc"), "https://gateway.pinata.cloud/ipfs/abc");
  for (const url of ["javascript:alert(1)", "data:text/html,test", "http://insecure.example", null]) assert.equal(safeURL(url), null);
});
test("loads each listing's NFT contract and keeps metadata failures visible", async () => {
  const seen = [];
  const market = { itemCount: async () => 4n, items: async id => row(id, id === 3 ? { sold: true } : id === 4 ? { cancelled: true } : {}) };
  const result = await loadListings(market, { makeNFT: address => { seen.push(address); return { tokenURI: async () => { if (address === "nft-2") throw new Error("unavailable"); return "ipfs://abc"; } }; }, getMetadata: async () => ({ name: "Test", image: "ipfs://image" }) });
  assert.deepEqual(seen, ["nft-1", "nft-2"]);
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].image, "https://gateway.pinata.cloud/ipfs/image");
  assert.equal(result.items[1].metadataUnavailable, true);
  assert.equal(result.items[1].itemId, "2");
});
test("paginates historical listing IDs without loading entire history", async () => {
  const ids = [];
  const market = { itemCount: async () => 100n, items: async id => { ids.push(id); return row(id, { sold: true }); } };
  const result = await loadListings(market, { start: 25, pageSize: 24 });
  assert.equal(ids.length, 24); assert.equal(ids[0], 25); assert.equal(ids.at(-1), 48);
  assert.equal(result.next, 49); assert.deepEqual(result.items, []);
});
test("bounded parallel work preserves input order", async () => {
  let active = 0, max = 0;
  const result = await mapConcurrent([1, 2, 3, 4, 5, 6], 3, async n => {
    max = Math.max(max, ++active); await new Promise(resolve => setTimeout(resolve, 5)); active--; return n * 2;
  });
  assert.equal(max, 3); assert.deepEqual(result, [2, 4, 6, 8, 10, 12]);
});
test("keeps listing when IPFS metadata fetch fails", async () => {
  const result = await loadListings({ itemCount: async () => 1n, items: async () => row(1) }, { makeNFT: () => ({ tokenURI: async () => "ipfs://abc" }), getMetadata: async () => { throw new Error("timeout"); } });
  assert.equal(result.items.length, 1); assert.equal(result.items[0].metadataUnavailable, true);
});
