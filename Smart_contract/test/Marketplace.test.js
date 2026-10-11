const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFT Marketplace", function () {
  let market, nft, seller, buyer, other;
  const PRICE = ethers.parseEther("1");
  beforeEach(async function () {
    [, seller, buyer, other] = await ethers.getSigners();
    nft = await (await ethers.getContractFactory("NFT")).deploy();
    market = await (await ethers.getContractFactory("Marketplace")).deploy();
  });
  async function list(token = 1, owner = seller, price = PRICE) {
    await nft.connect(owner).mint("ipfs://test");
    await nft.connect(owner).approve(market.target, token);
    await market.connect(owner).listNFT(nft.target, token, price);
  }
  it("mints unique tokens with metadata", async function () {
    await nft.connect(seller).mint("ipfs://first");
    await nft.connect(buyer).mint("ipfs://second");
    expect(await nft.name()).to.equal("MarketplaceNFT");
    expect(await nft.symbol()).to.equal("MNFT");
    expect(await nft.ownerOf(2)).to.equal(buyer.address);
    expect(await nft.tokenURI(1)).to.equal("ipfs://first");
  });
  it("escrows a listing and emits full details", async function () {
    await nft.connect(seller).mint("ipfs://test");
    await nft.connect(seller).approve(market.target, 1);
    await expect(market.connect(seller).listNFT(nft.target, 1, PRICE))
      .to.emit(market, "NFTListed").withArgs(1, nft.target, 1, seller.address, PRICE);
    expect(await nft.ownerOf(1)).to.equal(market.target);
    expect((await market.items(1)).cancelled).to.equal(false);
  });
  it("rejects zero prices", async function () {
    await nft.connect(seller).mint("ipfs://test");
    await expect(market.connect(seller).listNFT(nft.target, 1, 0)).to.be.revertedWith("Price must be > 0");
  });
  it("rejects non-contract NFT addresses", async function () {
    await expect(market.connect(seller).listNFT(seller.address, 1, PRICE)).to.be.revertedWith("Invalid NFT contract");
  });
  it("rejects missing approval and rolls back item count", async function () {
    await nft.connect(seller).mint("ipfs://test");
    await expect(market.connect(seller).listNFT(nft.target, 1, PRICE)).to.be.reverted;
    expect(await market.itemCount()).to.equal(0);
    expect(await nft.ownerOf(1)).to.equal(seller.address);
  });
  it("rejects listings by non-owners", async function () {
    await nft.connect(seller).mint("ipfs://test");
    await expect(market.connect(buyer).listNFT(nft.target, 1, PRICE)).to.be.revertedWith("Not owner");
  });
  it("buys NFT and credits proceeds without paying seller inline", async function () {
    await list();
    const before = await ethers.provider.getBalance(seller.address);
    await expect(market.connect(buyer).buyNFT(1, { value: PRICE })).to.emit(market, "NFTSold")
      .withArgs(1, nft.target, 1, seller.address, buyer.address, PRICE);
    expect(await nft.ownerOf(1)).to.equal(buyer.address);
    expect((await market.items(1)).sold).to.equal(true);
    expect(await market.proceeds(seller.address)).to.equal(PRICE);
    expect(await ethers.provider.getBalance(seller.address)).to.equal(before);
    expect(await ethers.provider.getBalance(market.target)).to.equal(PRICE);
  });
  it("rejects underpayment and overpayment without changing ownership", async function () {
    await list();
    for (const value of [0n, PRICE - 1n, PRICE + 1n]) {
      await expect(market.connect(buyer).buyNFT(1, { value })).to.be.revertedWith("Incorrect price");
    }
    expect((await market.items(1)).sold).to.equal(false);
    expect(await market.proceeds(seller.address)).to.equal(0);
  });
  it("rejects repeated purchases and cancellation after sale", async function () {
    await list(); await market.connect(buyer).buyNFT(1, { value: PRICE });
    await expect(market.connect(other).buyNFT(1, { value: PRICE })).to.be.revertedWith("Already sold");
    await expect(market.connect(seller).cancelListing(1)).to.be.revertedWith("Already sold");
  });
  it("rejects zero and out-of-range IDs for buy and cancel", async function () {
    for (const id of [0, 99]) {
      await expect(market.connect(buyer).buyNFT(id)).to.be.revertedWith("Item doesn't exist");
      await expect(market.connect(seller).cancelListing(id)).to.be.revertedWith("Item doesn't exist");
    }
  });
  it("allows seller to cancel and recover their NFT", async function () {
    await list();
    await expect(market.connect(seller).cancelListing(1)).to.emit(market, "ListingCancelled").withArgs(1, seller.address);
    expect(await nft.ownerOf(1)).to.equal(seller.address);
    expect((await market.items(1)).cancelled).to.equal(true);
    expect((await market.items(1)).sold).to.equal(false);
  });
  it("prevents unauthorized cancellation", async function () {
    await list();
    await expect(market.connect(other).cancelListing(1)).to.be.revertedWith("Not seller");
    expect(await nft.ownerOf(1)).to.equal(market.target);
  });
  it("prevents double cancellation and buying a cancelled item", async function () {
    await list(); await market.connect(seller).cancelListing(1);
    await expect(market.connect(seller).cancelListing(1)).to.be.revertedWith("Listing cancelled");
    await expect(market.connect(buyer).buyNFT(1, { value: PRICE })).to.be.revertedWith("Listing cancelled");
  });
  it("can relist a cancelled NFT under a new ID", async function () {
    await list(); await market.connect(seller).cancelListing(1);
    await nft.connect(seller).approve(market.target, 1);
    await market.connect(seller).listNFT(nft.target, 1, PRICE);
    expect(await market.itemCount()).to.equal(2);
    await market.connect(buyer).buyNFT(2, { value: PRICE });
    expect(await nft.ownerOf(1)).to.equal(buyer.address);
  });
  it("withdraws exactly the seller's proceeds once", async function () {
    await list(); await market.connect(buyer).buyNFT(1, { value: PRICE });
    await expect(market.connect(other).withdrawProceeds()).to.be.revertedWith("No proceeds");
    await expect(market.connect(seller).withdrawProceeds()).to.changeEtherBalances([market, seller], [-PRICE, PRICE]);
    expect(await market.proceeds(seller.address)).to.equal(0);
    await expect(market.connect(seller).withdrawProceeds()).to.be.revertedWith("No proceeds");
  });
  it("isolates multiple sellers' balances and accumulates sales", async function () {
    await list(1); await list(2); await list(3, other, PRICE * 2n);
    await market.connect(buyer).buyNFT(1, { value: PRICE });
    await market.connect(buyer).buyNFT(2, { value: PRICE });
    await market.connect(buyer).buyNFT(3, { value: PRICE * 2n });
    expect(await market.proceeds(seller.address)).to.equal(PRICE * 2n);
    expect(await market.proceeds(other.address)).to.equal(PRICE * 2n);
    await market.connect(seller).withdrawProceeds();
    expect(await ethers.provider.getBalance(market.target)).to.equal(PRICE * 2n);
  });
  it("handles listings from different NFT contracts", async function () {
    const second = await (await ethers.getContractFactory("NFT")).deploy();
    await list();
    await second.connect(other).mint("ipfs://second");
    await second.connect(other).approve(market.target, 1);
    await market.connect(other).listNFT(second.target, 1, PRICE);
    await market.connect(buyer).buyNFT(2, { value: PRICE });
    expect(await second.ownerOf(1)).to.equal(buyer.address);
    expect(await nft.ownerOf(1)).to.equal(market.target);
  });
  it("a rejecting seller cannot block purchases; failed withdrawal preserves credit", async function () {
    const hostile = await (await ethers.getContractFactory("AdversarialSeller")).deploy(market.target);
    await hostile.mintAndList(nft.target, PRICE); await hostile.configure(true, false);
    await market.connect(buyer).buyNFT(1, { value: PRICE });
    expect(await nft.ownerOf(1)).to.equal(buyer.address);
    await expect(hostile.withdraw()).to.be.revertedWith("Transfer failed");
    expect(await market.proceeds(hostile.target)).to.equal(PRICE);
    await hostile.configure(false, false);
    await expect(hostile.withdraw()).to.emit(market, "ProceedsWithdrawn").withArgs(hostile.target, PRICE);
  });
  it("blocks withdrawal reentrancy without losing the valid payment", async function () {
    const hostile = await (await ethers.getContractFactory("AdversarialSeller")).deploy(market.target);
    await hostile.mintAndList(nft.target, PRICE);
    await market.connect(buyer).buyNFT(1, { value: PRICE });
    await hostile.configure(false, true); await hostile.withdraw();
    expect(await hostile.reentrySucceeded()).to.equal(false);
    expect(await market.proceeds(hostile.target)).to.equal(0);
    expect(await ethers.provider.getBalance(hostile.target)).to.equal(PRICE);
    expect(await ethers.provider.getBalance(market.target)).to.equal(0);
  });
});
