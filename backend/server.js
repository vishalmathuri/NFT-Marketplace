require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const FormData = require("form-data");

const app = express();

// =====================================================
// Middleware
// =====================================================

// CORS (Allow frontend domain later instead of "*")
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
}));

// Increase payload limit (Fix 413 error)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const PORT = process.env.PORT || 5000;
const PINATA_BASE_URL = "https://api.pinata.cloud";

// =====================================================
// Health Check Route (IMPORTANT for Render)
// =====================================================
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "NFT Marketplace Backend Running 🚀",
  });
});

// =====================================================
// Upload Image to IPFS
// =====================================================
app.post("/upload-image", async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "No image provided" });
    }

    const base64Data = imageBase64.includes(",")
      ? imageBase64.split(",")[1]
      : imageBase64;

    const buffer = Buffer.from(base64Data, "base64");

    const formData = new FormData();
    formData.append("file", buffer, {
      filename: `nft-${Date.now()}.png`,
    });

    const response = await axios.post(
      `${PINATA_BASE_URL}/pinning/pinFileToIPFS`,
      formData,
      {
        maxBodyLength: Infinity,
        headers: {
          ...formData.getHeaders(),
          pinata_api_key: process.env.PINATA_API_KEY,
          pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
        },
      }
    );

    const imageHash = response.data.IpfsHash;

    return res.status(200).json({
      success: true,
      imageUrl: `https://gateway.pinata.cloud/ipfs/${imageHash}`,
    });
  } catch (error) {
    console.error(
      "Image Upload Error:",
      error.response?.data || error.message
    );
    return res.status(500).json({ error: "Image upload failed" });
  }
});

// =====================================================
// Upload Metadata to IPFS
// =====================================================
app.post("/upload-metadata", async (req, res) => {
  try {
    const { name, description, image } = req.body;

    if (!name || !description || !image) {
      return res.status(400).json({ error: "Missing metadata fields" });
    }

    const metadata = { name, description, image };

    const response = await axios.post(
      `${PINATA_BASE_URL}/pinning/pinJSONToIPFS`,
      metadata,
      {
        headers: {
          pinata_api_key: process.env.PINATA_API_KEY,
          pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const metadataHash = response.data.IpfsHash;

    return res.status(200).json({
      success: true,
      metadataUrl: `https://gateway.pinata.cloud/ipfs/${metadataHash}`,
    });
  } catch (error) {
    console.error(
      "Metadata Upload Error:",
      error.response?.data || error.message
    );
    return res.status(500).json({ error: "Metadata upload failed" });
  }
});

// =====================================================
// Global Error Handler (Professional)
// =====================================================
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// =====================================================
// Start Server
// =====================================================
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});