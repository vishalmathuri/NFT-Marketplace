import { useState } from "react";
import axios from "axios";
import { ethers } from "ethers";

<<<<<<< HEAD
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
=======
const backendURL = "https://nft-marketplace-r1az.onrender.com";

const CreateNFT = ({ contract, loadMarketplaceItems }) => {
  const [file, setFile] = useState(null);
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const createNFT = async () => {
    if (!file || !price) return alert("All fields required");
>>>>>>> 66b694e802f3be86b729206a0e7e53e776b37c3d

    try {
      setLoading(true);

      // 1️⃣ Upload Image to Backend
      const reader = new FileReader();

      reader.readAsDataURL(file);
      reader.onloadend = async () => {
<<<<<<< HEAD
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
=======
        // Upload Image
        const imageRes = await axios.post(`${backendURL}/upload-image`, {
          imageBase64: reader.result,
        });

        const imageURL = imageRes.data.imageURL;

        // Upload Metadata
        const metadataRes = await axios.post(`${backendURL}/upload-metadata`, {
          name: "Royal Purple NFT",
          description: "Web3 NFT Collection",
          image: imageURL,
        });

        const metadataURL = metadataRes.data.metadataURL;

        // Mint
        const listingPrice = ethers.parseEther(price);

        const tx = await contract.createToken(metadataURL, listingPrice);
        await tx.wait();

        alert("NFT Minted Successfully!");

        await loadMarketplaceItems(); // 🔥 auto refresh marketplace

>>>>>>> 66b694e802f3be86b729206a0e7e53e776b37c3d
        setLoading(false);
      };
    } catch (err) {
      console.error(err);
<<<<<<< HEAD
      alert("Minting failed");
=======
      alert("Error creating NFT");
>>>>>>> 66b694e802f3be86b729206a0e7e53e776b37c3d
      setLoading(false);
    }
  };

  return (
<<<<<<< HEAD
    <div style={{ marginTop: "40px", marginBottom: "40px" }}>
      <h2>Create NFT</h2>

      <input
        type="file"
        onChange={(e) => setImage(e.target.files[0])}
        style={{ marginBottom: "10px" }}
      />

      <input
=======
    <div style={styles.card}>
      <h2>Create NFT</h2>

      <input type="file" onChange={handleFileChange} style={styles.input} />

      <input
>>>>>>> 66b694e802f3be86b729206a0e7e53e776b37c3d
        type="text"
        placeholder="Price in ETH"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
<<<<<<< HEAD
        style={{
          display: "block",
          marginBottom: "15px",
          padding: "8px",
          width: "200px",
        }}
      />

      <button onClick={uploadAndMint} disabled={loading}>
        {loading ? "Processing..." : "Mint & List NFT"}
=======
        style={styles.input}
      />

      <button style={styles.button} onClick={createNFT} disabled={loading}>
        {loading ? "Minting..." : "Create NFT"}
>>>>>>> 66b694e802f3be86b729206a0e7e53e776b37c3d
      </button>
    </div>
  );
}

const styles = {
  card: {
    background: "white",
    padding: "30px",
    borderRadius: "20px",
    marginBottom: "30px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
  },
  input: {
    display: "block",
    margin: "15px auto",
    padding: "10px",
    width: "80%",
    borderRadius: "10px",
    border: "1px solid #ccc",
  },
  button: {
    padding: "12px 25px",
    borderRadius: "30px",
    border: "none",
    background: "#6A0DAD",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },
};

export default CreateNFT;
