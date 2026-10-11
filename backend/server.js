require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const FormData = require("form-data");
const sharp = require("sharp");
const { rateLimit } = require("express-rate-limit");
const { randomBytes } = require("node:crypto");
const { verifyMessage, isAddress } = require("ethers");

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const CID = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z2-7]{20,100})$/;

function createApp({ pinata = axios, env = process.env, now = Date.now } = {}) {
  const app = express();
  app.disable("x-powered-by");
  // Render is one proxy hop. Do not trust arbitrary forwarding headers.
  if (env.TRUST_PROXY === "1") app.set("trust proxy", 1);
  const origins = (env.FRONTEND_ORIGINS || "http://localhost:5173,https://nft-marketplace-84ww.vercel.app").split(",").map(x => x.trim());
  const challenges = new Map();
  const sessions = new Map();
  function cleanup() {
    for (const map of [challenges, sessions]) for (const [key, value] of map) if (value.expires <= now()) map.delete(key);
  }
  app.use(cors({ origin(origin, cb) { cb(null, !origin || origins.includes(origin)); }, methods: ["GET", "POST"] }));
  app.use((req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    if (req.headers.origin && !origins.includes(req.headers.origin)) return res.status(403).json({ error: "Origin not allowed" });
    next();
  });
  app.get("/", (req, res) => res.json({ status: "success", message: "NFT Marketplace Backend Running" }));
  const limiter = (limit, windowMs) => rateLimit({ windowMs, limit, standardHeaders: "draft-7", legacyHeaders: false, message: { error: "Too many requests. Try again later." } });
  app.use("/auth", limiter(30, 15 * 60 * 1000), express.json({ limit: "8kb" }));
  app.post("/auth/challenge", (req, res) => {
    cleanup();
    const address = req.body?.address;
    if (!isAddress(address)) return res.status(400).json({ error: "Invalid wallet address" });
    if (challenges.size >= 10000) return res.status(503).json({ error: "Upload service busy" });
    const nonce = randomBytes(24).toString("hex");
    const expires = now() + 5 * 60 * 1000;
    const message = `NFT Marketplace upload access\nWallet: ${address.toLowerCase()}\nNonce: ${nonce}\nExpires: ${new Date(expires).toISOString()}\nThis signature authorizes image and metadata uploads only. No blockchain transaction.`;
    challenges.set(nonce, { address: address.toLowerCase(), message, expires });
    res.set("Cache-Control", "no-store").json({ nonce, message });
  });
  app.post("/auth/verify", (req, res) => {
    cleanup();
    const { nonce, signature } = req.body || {};
    const challenge = challenges.get(nonce);
    challenges.delete(nonce); // One-use, including failed signature attempts.
    if (!challenge) return res.status(401).json({ error: "Challenge expired or already used" });
    try {
      if (verifyMessage(challenge.message, signature).toLowerCase() !== challenge.address) throw new Error("Invalid signature");
      if (sessions.size >= 10000) return res.status(503).json({ error: "Upload service busy" });
      const token = randomBytes(32).toString("hex");
      sessions.set(token, { address: challenge.address, expires: now() + 15 * 60 * 1000 });
      res.set("Cache-Control", "no-store").json({ token });
    } catch { res.status(401).json({ error: "Invalid wallet signature" }); }
  });
  const authenticate = (req, res, next) => {
    cleanup();
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    const session = sessions.get(token);
    if (!session) return res.status(401).json({ error: "Sign in with your wallet to upload" });
    req.wallet = session.address;
    next();
  };
  const uploadPaths = ["/upload-image", "/upload-metadata"];
  app.use(uploadPaths, limiter(40, 15 * 60 * 1000), authenticate,
    rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, keyGenerator: req => req.wallet, standardHeaders: "draft-7", legacyHeaders: false, message: { error: "Wallet upload limit reached" } }),
    // Global quota bounds Pinata spend even across multiple IPs/wallets (single instance).
    rateLimit({ windowMs: 24 * 60 * 60 * 1000, limit: Number(env.DAILY_UPLOAD_LIMIT) || 200, keyGenerator: () => "global", standardHeaders: false, legacyHeaders: false, message: { error: "Daily upload quota reached" } }),
    express.json({ limit: "7mb" }));
  const headers = () => ({ pinata_api_key: env.PINATA_API_KEY, pinata_secret_api_key: env.PINATA_SECRET_API_KEY });
  const configured = res => {
    if (env.PINATA_API_KEY && env.PINATA_SECRET_API_KEY) return true;
    res.status(503).json({ error: "Upload service is not configured" }); return false;
  };
  const hashURL = hash => {
    if (typeof hash !== "string" || !CID.test(hash)) throw new Error("Invalid Pinata response");
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
  };
  app.post("/upload-image", async (req, res) => {
    const value = req.body?.imageBase64;
    if (typeof value !== "string") return res.status(400).json({ error: "No image provided" });
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    if (!match || match[2].length % 4 !== 0) return res.status(400).json({ error: "Use a PNG, JPEG or WebP data URL" });
    const input = Buffer.from(match[2], "base64");
    if (input.length > MAX_IMAGE_BYTES) return res.status(413).json({ error: "Image must be 5 MB or smaller" });
    let buffer;
    try {
      const image = sharp(input, { limitInputPixels: 16_000_000, failOn: "warning" });
      const info = await image.metadata();
      if (!["png", "jpeg", "webp"].includes(info.format) || info.format !== match[1] || (info.pages || 1) > 1) throw new Error("Invalid format");
      // Decode and re-encode: reject corrupt images, remove embedded metadata.
      buffer = await image.rotate().webp({ quality: 90 }).toBuffer();
      if (buffer.length > MAX_IMAGE_BYTES) return res.status(413).json({ error: "Processed image exceeds 5 MB" });
    } catch { return res.status(400).json({ error: "Invalid image. Maximum 16 megapixels; animated images are not supported." }); }
    if (!configured(res)) return;
    try {
      const form = new FormData();
      form.append("file", buffer, { filename: `nft-${randomBytes(12).toString("hex")}.webp`, contentType: "image/webp" });
      const response = await pinata.post("https://api.pinata.cloud/pinning/pinFileToIPFS", form, {
        timeout: 30000, maxBodyLength: MAX_IMAGE_BYTES + 8192, maxContentLength: 64 * 1024,
        headers: { ...form.getHeaders(), ...headers() },
      });
      res.json({ success: true, imageURL: hashURL(response.data.IpfsHash) });
    } catch { res.status(502).json({ error: "Image upload failed. Try again later." }); }
  });
  app.post("/upload-metadata", async (req, res) => {
    const { name, description, image } = req.body || {};
    if (typeof name !== "string" || !name.trim() || name.length > 100 ||
        typeof description !== "string" || !description.trim() || description.length > 2000 ||
        typeof image !== "string") return res.status(400).json({ error: "Name (1–100 characters), description (1–2000 characters), and image are required" });
    const hash = image.replace("https://gateway.pinata.cloud/ipfs/", "");
    if (!image.startsWith("https://gateway.pinata.cloud/ipfs/") || !CID.test(hash)) return res.status(400).json({ error: "Use the IPFS image URL returned by the upload service" });
    if (!configured(res)) return;
    try {
      const response = await pinata.post("https://api.pinata.cloud/pinning/pinJSONToIPFS", { name: name.trim(), description: description.trim(), image }, {
        timeout: 30000, maxContentLength: 64 * 1024, headers: { ...headers(), "Content-Type": "application/json" },
      });
      res.json({ success: true, metadataURL: hashURL(response.data.IpfsHash) });
    } catch { res.status(502).json({ error: "Metadata upload failed. Try again later." }); }
  });
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === "entity.too.large") return res.status(413).json({ error: "Request exceeds upload limit" });
    if (error instanceof SyntaxError) return res.status(400).json({ error: "Invalid JSON" });
    res.status(500).json({ error: "Request failed" });
  });
  return app;
}

if (require.main === module) createApp().listen(process.env.PORT || 5000, () => console.log("NFT Marketplace backend running"));
module.exports = { createApp, MAX_IMAGE_BYTES };
