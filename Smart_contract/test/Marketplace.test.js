const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFT Marketplace", function () {
    let marketplace, nft;
    let deployer, seller, buyer, other;
    const URI = "ipfs://QmSampleHash";
    const PRICE = ethers.parseEther("1");

    beforeEach(async function () {
        [deployer, seller, buyer, other] = await ethers.getSigners();

        const NFT = await ethers.getContractFactory("NFT");
        nft = await NFT.deploy();

        const Marketplace = await ethers.getContractFactory("Marketplace");
        marketplace = await Marketplace.deploy();
    });

    describe("Deployment", function () {
        it("Should deploy NFT with correct name and symbol", async function () {
            expect(await nft.name()).to.equal("MarketplaceNFT");
            expect(await nft.symbol()).to.equal("MNFT");
        });
    });

    describe("Listing NFTs", function () {
        beforeEach(async function () {
            await nft.connect(seller).mint(URI);
            await nft.connect(seller).setApprovalForAll(marketplace.target, true);
        });

        it("Should list NFT successfully", async function () {
            await expect(
                marketplace.connect(seller).listNFT(nft.target, 1, PRICE)
            )
                .to.emit(marketplace, "NFTListed");

            const item = await marketplace.items(1);

            expect(item.itemId).to.equal(1);
            expect(item.seller).to.equal(seller.address);
            expect(item.price).to.equal(PRICE);
            expect(item.sold).to.equal(false);
            expect(await nft.ownerOf(1)).to.equal(marketplace.target);
        });

        it("Should fail if price is zero", async function () {
            await expect(
                marketplace.connect(seller).listNFT(nft.target, 1, 0)
            ).to.be.revertedWith("Price must be > 0");
        });

        it("Should fail if not owner", async function () {
            await expect(
                marketplace.connect(buyer).listNFT(nft.target, 1, PRICE)
            ).to.be.revertedWith("Not owner");
        });
    });

    describe("Buying NFTs", function () {
        beforeEach(async function () {
            await nft.connect(seller).mint(URI);
            await nft.connect(seller).setApprovalForAll(marketplace.target, true);
            await marketplace.connect(seller).listNFT(nft.target, 1, PRICE);
        });

        it("Should purchase NFT successfully", async function () {
            const initialBalance = await ethers.provider.getBalance(seller.address);

            await expect(
                marketplace.connect(buyer).buyNFT(1, { value: PRICE })
            )
                .to.emit(marketplace, "NFTSold");

            const item = await marketplace.items(1);
            expect(item.sold).to.equal(true);
            expect(await nft.ownerOf(1)).to.equal(buyer.address);

            const finalBalance = await ethers.provider.getBalance(seller.address);
            expect(finalBalance).to.be.gt(initialBalance);
        });

        it("Should fail if wrong price sent", async function () {
            await expect(
                marketplace.connect(buyer).buyNFT(1, { value: 0 })
            ).to.be.revertedWith("Incorrect price");
        });

        it("Should fail if already sold", async function () {
            await marketplace.connect(buyer).buyNFT(1, { value: PRICE });

            await expect(
                marketplace.connect(other).buyNFT(1, { value: PRICE })
            ).to.be.revertedWith("Already sold");
        });

        it("Should fail for invalid item ID", async function () {
            await expect(
                marketplace.connect(buyer).buyNFT(99, { value: PRICE })
            ).to.be.revertedWith("Item doesn't exist");
        });
    });
});