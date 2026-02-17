const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFT Marketplace", function () {
    let Marketplace, marketplace, NFT, nft;
    let deployer, seller, buyer, addrs;
    const FEE_PERCENT = 1; // Example if you add fees later
    const URI = "ipfs://QmSampleHash";
    const PRICE = ethers.parseEther("1"); // 1 ETH

    beforeEach(async function () {
        // Get signers
        [deployer, seller, buyer, ...addrs] = await ethers.getSigners();

        // Deploy contracts
        NFT = await ethers.getContractFactory("NFT");
        nft = await NFT.deploy();

        Marketplace = await ethers.getContractFactory("Marketplace");
        marketplace = await Marketplace.deploy();
    });

    describe("1. Deployment", function () {
        it("Should track name and symbol of the NFT collection", async function () {
            expect(await nft.name()).to.equal("MarketplaceNFT");
            expect(await nft.symbol()).to.equal("MNFT");
        });
    });

    describe("2. Minting & Listing NFTs", function () {
        beforeEach(async function () {
            // Seller mints an NFT
            await nft.connect(seller).mint(URI);
            // Seller approves marketplace to move the NFT
            await nft.connect(seller).setApprovalForAll(marketplace.target, true);
        });

        it("Should transfer NFT from seller to marketplace and track item", async function () {
            // List NFT
            await marketplace.connect(seller).listNFT(nft.target, 1, PRICE);

            expect(await marketplace.itemCount()).to.equal(1);
            const item = await marketplace.items(1);
            expect(item.itemId).to.equal(1);
            expect(item.nft).to.equal(nft.target);
            expect(item.tokenId).to.equal(1);
            expect(item.price).to.equal(PRICE);
            expect(item.seller).to.equal(seller.address);
            expect(item.sold).to.equal(false);

            // Marketplace should now own the NFT (Escrow)
            expect(await nft.ownerOf(1)).to.equal(marketplace.target);
        });

        it("Should fail if price is zero", async function () {
            await expect(
                marketplace.connect(seller).listNFT(nft.target, 1, 0)
            ).to.be.revertedWith("Price must be > 0");
        });

        it("Should fail if seller doesn't own the token", async function () {
            // Buyer tries to list Seller's token
            await expect(
                marketplace.connect(buyer).listNFT(nft.target, 1, PRICE)
            ).to.be.reverted; 
        });
    });

    describe("3. Purchasing NFTs", function () {
        beforeEach(async function () {
            // Setup: Mint, Approve, and List
            await nft.connect(seller).mint(URI);
            await nft.connect(seller).setApprovalForAll(marketplace.target, true);
            await marketplace.connect(seller).listNFT(nft.target, 1, PRICE);
        });

        it("Should update item as sold, pay seller, and transfer NFT to buyer", async function () {
            const initialSellerBal = await ethers.provider.getBalance(seller.address);

            // Buyer purchases
            await marketplace.connect(buyer).buyNFT(1, { value: PRICE });

            const finalSellerBal = await ethers.provider.getBalance(seller.address);
            const item = await marketplace.items(1);

            // Check State
            expect(item.sold).to.equal(true);
            // Check Payment (Seller balance should increase by PRICE)
            expect(finalSellerBal).to.equal(initialSellerBal + PRICE);
            // Check Ownership (Buyer should now own the NFT)
            expect(await nft.ownerOf(1)).to.equal(buyer.address);
        });

        it("Should fail if insufficient payment is sent", async function () {
            const lowPrice = ethers.parseEther("0.5");
            await expect(
                marketplace.connect(buyer).buyNFT(1, { value: lowPrice })
            ).to.be.revertedWith("Incorrect price");
        });

        it("Should fail if item is already sold", async function () {
            // First purchase
            await marketplace.connect(buyer).buyNFT(1, { value: PRICE });
            // Second attempt by someone else
            await expect(
                marketplace.connect(addrs[0]).buyNFT(1, { value: PRICE })
            ).to.be.revertedWith("Already sold");
        });

        it("Should fail for invalid item IDs", async function () {
            await expect(
                marketplace.connect(buyer).buyNFT(99, { value: PRICE })
            ).to.be.reverted; // Or specific error if you add a check
        });
    });
});