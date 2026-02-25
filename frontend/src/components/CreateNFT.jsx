import { useState } from "react";
import axios from "axios";
import { ethers } from "ethers";

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

    try {
      setLoading(true);

      const reader = new FileReader();

      reader.readAsDataURL(file);
      reader.onloadend = async () => {
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

        setLoading(false);
      };
    } catch (err) {
      console.error(err);
      alert("Error creating NFT");
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <h2>Create NFT</h2>

      <input type="file" onChange={handleFileChange} style={styles.input} />

      <input
        type="text"
        placeholder="Price in ETH"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        style={styles.input}
      />

      <button style={styles.button} onClick={createNFT} disabled={loading}>
        {loading ? "Minting..." : "Create NFT"}
      </button>
    </div>
  );
};

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
