import { useState } from "react";
import axios from "axios";
import { ethers } from "ethers";

const BACKEND_URL = "https://nft-marketplace-r1az.onrender.com";

function CreateNFT({ nft, marketplace, reloadMarketplace }) {
  const [image, setImage] = useState(null);
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const uploadAndMint = async () => {
    if (!image || !price) {
      alert("Please select image and enter price");
      return;
    }

    if (!nft || !marketplace) {
      alert("Contracts not loaded yet");
      return;
    }

    try {
      setLoading(true);

      // 1️⃣ Upload Image to Backend
      const reader = new FileReader();
      reader.readAsDataURL(image);

      reader.onloadend = async () => {
        const imageRes = await axios.post(
          `${BACKEND_URL}/upload-image`,
          {
            imageBase64: reader.result,
          }
        );

        const imageHash = imageRes.data.IpfsHash;
        const imageURL = `https://gateway.pinata.cloud/ipfs/${imageHash}`;

        // 2️⃣ Upload Metadata
        const metadataRes = await axios.post(
          `${BACKEND_URL}/upload-metadata`,
          {
            name: "NFT Token",
            description: "Royal Purple NFT",
            image: imageURL,
          }
        );

        const metadataHash = metadataRes.data.IpfsHash;
        const tokenURI = `https://gateway.pinata.cloud/ipfs/${metadataHash}`;

        // 3️⃣ Mint NFT
        const mintTx = await nft.mint(tokenURI);
        const receipt = await mintTx.wait();

        const tokenId = receipt.logs[0].args.tokenId;

        // 4️⃣ Approve Marketplace
        await nft.approve(marketplace.target, tokenId);

        // 5️⃣ List on Marketplace
        const listingPrice = ethers.parseEther(price);

        const listTx = await marketplace.listNFT(
          nft.target,
          tokenId,
          listingPrice
        );

        await listTx.wait();

        alert("NFT Minted & Listed Successfully 🚀");

        reloadMarketplace();
        setLoading(false);
      };
    } catch (err) {
      console.error(err);
      alert("Minting failed");
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: "40px", marginBottom: "40px" }}>
      <h2>Create NFT</h2>

      <input
        type="file"
        onChange={(e) => setImage(e.target.files[0])}
        style={{ marginBottom: "10px" }}
      />

      <input
        type="text"
        placeholder="Price in ETH"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        style={{
          display: "block",
          marginBottom: "15px",
          padding: "8px",
          width: "200px",
        }}
      />

      <button onClick={uploadAndMint} disabled={loading}>
        {loading ? "Processing..." : "Mint & List NFT"}
      </button>
    </div>
  );
}

export default CreateNFT;
