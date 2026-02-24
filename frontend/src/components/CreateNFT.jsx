import { useState } from "react";
import { ethers } from "ethers";
import axios from "axios";

const CreateNFT = ({ nft, marketplace, reloadMarketplace }) => {
  const [image, setImage] = useState(null);
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const createNFT = async () => {
    if (!image || !price || !nft || !marketplace) {
      alert("Fill all fields & connect wallet");
      return;
    }

    try {
      setLoading(true);

      const reader = new FileReader();
      reader.readAsDataURL(image);

      reader.onloadend = async () => {
        const imgRes = await axios.post(
          "http://localhost:5000/upload-image",
          { imageBase64: reader.result }
        );

        const metaRes = await axios.post(
          "http://localhost:5000/upload-metadata",
          {
            name: "NFT",
            description: "Marketplace NFT",
            image: imgRes.data.imageUrl,
          }
        );

        const uri = metaRes.data.metadataUrl;

        let tx = await nft.mint(uri);
        await tx.wait();

        const tokenId = await nft.tokenCount();

        tx = await nft.approve(marketplace.target, tokenId);
        await tx.wait();

        tx = await marketplace.listNFT(
          nft.target,
          tokenId,
          ethers.parseEther(price)
        );
        await tx.wait();

        reloadMarketplace();
        setLoading(false);
      };
    } catch (err) {
      console.error(err);
      alert("Transaction failed");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "600px",
        padding: "30px",
        borderRadius: "20px",
        background: "rgba(255,255,255,0.1)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      }}
    >
      <h2 style={{ marginBottom: "20px" }}>Create NFT</h2>

      <input
        type="file"
        onChange={(e) => setImage(e.target.files[0])}
        style={{ marginBottom: "15px" }}
      />

      <input
        type="number"
        placeholder="Price in ETH"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "10px",
          border: "none",
          marginBottom: "15px",
        }}
      />

      <button
        onClick={createNFT}
        disabled={loading}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "12px",
          border: "none",
          background: "linear-gradient(90deg,#00dbde,#fc00ff)",
          color: "#fff",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        {loading ? "Processing..." : "Create & List NFT"}
      </button>
    </div>
  );
};

export default CreateNFT;