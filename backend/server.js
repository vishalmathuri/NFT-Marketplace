require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const FormData = require("form-data");

const app = express();
app.use(cors());
app.use(express.json());

const PINATA_BASE_URL = "https://api.pinata.cloud";

// Upload image to IPFS
app.post("/upload-image", async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    const buffer = Buffer.from(imageBase64, "base64");

    const formData = new FormData();
    formData.append("file", buffer, {
      filename: "nft.png",
    });

    const response = await axios.post(
      `${PINATA_BASE_URL}/pinning/pinFileToIPFS`,
      formData,
      {
        maxBodyLength: "Infinity",
        headers: {
          ...formData.getHeaders(),
          pinata_api_key: process.env.PINATA_API_KEY,
          pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
        },
      }
    );

    const imageHash = response.data.IpfsHash;
    res.json({ imageUrl: `https://gateway.pinata.cloud/ipfs/${imageHash}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Image upload failed" });
  }
});

// Upload metadata
app.post("/upload-metadata", async (req, res) => {
  try {
    const { name, description, imageUrl } = req.body;

    const metadata = {
      name,
      description,
      image: imageUrl,
    };

    const response = await axios.post(
      `${PINATA_BASE_URL}/pinning/pinJSONToIPFS`,
      metadata,
      {
        headers: {
          pinata_api_key: process.env.PINATA_API_KEY,
          pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
        },
      }
    );

    const metadataHash = response.data.IpfsHash;
    res.json({
      metadataUrl: `https://gateway.pinata.cloud/ipfs/${metadataHash}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Metadata upload failed" });
  }
});

app.listen(process.env.PORT, () =>
  console.log(`Backend running on port ${process.env.PORT}`)
);
