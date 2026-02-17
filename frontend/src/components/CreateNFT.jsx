import { useState } from "react";
import axios from "axios";
import { getContracts } from "../utils/contract";

const CreateNFT = () => {
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const mintNFT = async () => {
    try {
      if (!file || !name || !description) {
        alert("Please fill all fields");
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onloadend = async () => {
        const base64Image = reader.result.split(",")[1];

        // 1️⃣ Upload image
        const imageRes = await axios.post(
          "http://localhost:5000/upload-image",
          { imageBase64: base64Image }
        );

        const imageUrl = imageRes.data.imageUrl;

        // 2️⃣ Upload metadata
        const metadataRes = await axios.post(
          "http://localhost:5000/upload-metadata",
          {
            name,
            description,
            imageUrl,
          }
        );

        const metadataUrl = metadataRes.data.metadataUrl;

        // 3️⃣ Mint NFT
        const contracts = await getContracts();
        const { nft } = contracts;

        const tx = await nft.mint(metadataUrl);
        await tx.wait();

        alert("NFT Minted Successfully 🚀");
      };
    } catch (error) {
      console.error(error);
      alert("Mint failed");
    }
  };

  return (
    <div style={{ marginBottom: "40px" }}>
      <h2>Create NFT</h2>

      <input
        type="text"
        placeholder="NFT Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <br /><br />

      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <br /><br />

      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <br /><br />

      <button onClick={mintNFT}>Mint NFT</button>
    </div>
  );
};

export default CreateNFT;
