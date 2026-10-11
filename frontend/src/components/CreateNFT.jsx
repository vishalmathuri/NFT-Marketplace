import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { parseEther, ZeroAddress } from "ethers";
import { backendURL } from "../utils/contract";

function readDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read image. Select it again."));
    reader.onabort = () => reject(new Error("Image reading was cancelled."));
    reader.readAsDataURL(file);
  });
}
const CreateNFT = ({ wallet, runAction, busy }) => {
  const { marketplace, nft, signer } = wallet;
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [mintedToken, setMintedToken] = useState(null);
  const fileInputRef = useRef(null);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const handleFileChange = event => {
    const selected = event.target.files[0];
    if (selected && (!["image/png", "image/jpeg", "image/webp"].includes(selected.type) || selected.size > 5 * 1024 * 1024)) {
      setFile(null); event.target.value = ""; setStatus("Select a PNG, JPEG or WebP image no larger than 5 MB."); return;
    }
    setFile(selected || null); setStatus("");
  };
  const createNFT = async () => {
    setLoading(true);
    const success = await runAction("NFT listing", async ({ transact, assertSession, report }) => {
      let listingPrice;
      try { listingPrice = parseEther(price); } catch { throw new Error("Enter a valid ETH price, with at most 18 decimals."); }
      if (listingPrice <= 0n) throw new Error("Listing price must be greater than zero.");
      let tokenId = mintedToken;
      if (!tokenId) {
        if (!file || !name.trim() || !description.trim()) throw new Error("Fill in the name, description, artwork and price.");
        setStatus("1/4: Authorize IPFS uploads…"); report("Sign the upload access message in your wallet. It does not send a transaction.");
        const client = axios.create({ baseURL: backendURL, timeout: 35000 });
        const challenge = (await client.post("/auth/challenge", { address: wallet.account })).data;
        await assertSession();
        const signature = await signer.signMessage(challenge.message);
        await assertSession();
        const { token } = (await client.post("/auth/verify", { nonce: challenge.nonce, signature })).data;
        client.defaults.headers.common.Authorization = `Bearer ${token}`;
        setStatus("1/4: Uploading image and metadata…"); report("Uploading artwork and metadata to IPFS…");
        const imageBase64 = await readDataURL(file);
        const { imageURL } = (await client.post("/upload-image", { imageBase64 })).data;
        const { metadataURL } = (await client.post("/upload-metadata", { name: name.trim(), description: description.trim(), image: imageURL })).data;
        setStatus("2/4: Minting NFT…");
        const receipt = await transact("Mint NFT", () => nft.mint(metadataURL));
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() !== nft.target.toLowerCase()) continue;
          try {
            const event = nft.interface.parseLog(log);
            if (event?.name === "Transfer" && event.args.from === ZeroAddress && event.args.to.toLowerCase() === wallet.account.toLowerCase()) tokenId = event.args.tokenId.toString();
          } catch { /* Unrelated event. */ }
        }
        if (!tokenId) throw new Error("Mint confirmed but token ID was not found. Check the mint transaction before retrying.");
        setMintedToken(tokenId);
      }
      setStatus("3/4: Approving this NFT…");
      await transact("Approve NFT", () => nft.approve(marketplace.target, tokenId));
      setStatus("4/4: Listing NFT…");
      await transact("List NFT", () => marketplace.listNFT(nft.target, tokenId, listingPrice));
      setName(""); setDescription(""); setFile(null); setPrice(""); setMintedToken(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
    setLoading(false); setStatus(success ? "NFT listed successfully." : "See the transaction message above. If already minted, retry listing this NFT.");
  };

  return (
    <div style={styles.creationWrapper}>
      {/* Visual Loading Overlay */}
      {loading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.spinner}></div>
          <p style={styles.statusText}>{status}</p>
        </div>
      )}

      <div style={styles.card}>
        {!loading && status && <p role="status" style={{ color: "#4B0082", marginBottom: "12px" }}>{status}</p>}
        {mintedToken && <p style={{ color: "#4B0082", marginBottom: "12px" }}>NFT #{mintedToken} is minted in your wallet. Retry listing; you will not mint again. If you change wallets or reload, recover it using the instructions in the README.</p>}
        <h2 style={styles.title}>Mint New Asset</h2>
        <p style={styles.subtitle}>Fill in the details to create your unique NFT</p>

        {/* Name Input Group */}
        <div style={styles.inputGroup}>
          <label htmlFor="asset-name" style={styles.label}>Asset Name</label>
          <input
            id="asset-name"
            maxLength={100}
            disabled={busy || Boolean(mintedToken)}
            type="text"
            placeholder="e.g. Royal Purple Crown"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
          />
        </div>

        {/* Description Input Group */}
        <div style={styles.inputGroup}>
          <label htmlFor="asset-description" style={styles.label}>Description</label>
          <textarea
            id="asset-description" maxLength={2000} disabled={busy || Boolean(mintedToken)}
            placeholder="Provide a detailed description of your asset..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ ...styles.input, ...styles.textarea }}
          />
        </div>

        {/* Custom File Upload Area */}
        <div style={styles.inputGroup}>
          <label htmlFor="asset-file" style={styles.label}>Upload Artwork (PNG, JPEG, WebP; max 5 MB)</label>
          {/* We hide the native input */}
          <input
            id="asset-file" disabled={busy || Boolean(mintedToken)}
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={styles.hiddenFileInput}
            accept="image/png,image/jpeg,image/webp"
          />
          {/* We style this div to look like an upload area */}
          <div
            style={styles.customUploadArea}
            role="button" tabIndex={0} aria-label="Select NFT artwork"
            onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && !busy && !mintedToken) { event.preventDefault(); fileInputRef.current.click(); } }}
            onClick={() => { if (!busy && !mintedToken) fileInputRef.current.click(); }}
          >
            {preview ? (
              <img src={preview} alt="NFT Preview" style={styles.previewImage} />
            ) : (
              <div style={styles.uploadPlaceholder}>
                <span style={styles.uploadIcon}>🖼️</span>
                <span style={styles.uploadText}>Click to select image</span>
              </div>
            )}
          </div>
        </div>

        {/* Price Input Group */}
        <div style={styles.inputGroup}>
          <label htmlFor="asset-price" style={styles.label}>Listing Price (ETH)</label>
          <input
            id="asset-price" disabled={busy}
            type="text" inputMode="decimal"
            placeholder="e.g. 0.05"
            value={price}
            step="0.001"
            onChange={(e) => setPrice(e.target.value)}
            style={styles.input}
          />
        </div>

        {/* Create Button */}
        <button
          style={{
            ...styles.button,
            ...(busy ? styles.buttonDisabled : styles.buttonEnabled)
          }}
          onClick={createNFT}
          disabled={busy}
        >
          {loading ? "Processing..." : mintedToken ? "Retry listing minted NFT" : "Mint & List NFT 🚀"}
        </button>
      </div>
    </div>
  );
};

// Enhanced Styles
const styles = {
  creationWrapper: {
    position: "relative",
    width: "100%",
    maxWidth: "480px",
    margin: "0 auto 40px auto",
  },
  card: {
    background: "#ffffff",
    padding: "35px",
    borderRadius: "25px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.15)", // Deeper shadow
    border: "1px solid #eee",
    textAlign: "left",
  },
  title: {
    margin: "0 0 5px 0",
    color: "#4B0082",
    fontSize: "26px",
    fontWeight: "bold",
  },
  subtitle: {
    margin: "0 0 25px 0",
    color: "#777",
    fontSize: "14px",
  },
  inputGroup: {
    marginBottom: "18px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    color: "#333",
    fontSize: "13px",
    fontWeight: "600",
    letterSpacing: "0.5px",
  },
  input: {
    display: "block",
    width: "100%",
    boxSizing: "border-box", // Essential for full width with padding
    padding: "14px",
    borderRadius: "12px",
    border: "2px solid #ddd",
    fontSize: "15px",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    outline: "none",
    color: "#333",
  },
  textarea: {
    height: "90px",
    resize: "none",
    fontFamily: "inherit",
  },
  // We apply focus styles via hover helper logic or separate CSS (hard to do inline cleanly)
  // For simplicity, I've just styled the base state well.

  // Custom File Upload Styling
  hiddenFileInput: {
    display: "none",
  },
  customUploadArea: {
    width: "100%",
    height: "180px",
    borderRadius: "15px",
    border: "2px dashed #ddd",
    background: "#f9f9f9",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    transition: "border-color 0.2s ease, background 0.2s ease",
  },
  uploadPlaceholder: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#aaa",
  },
  uploadIcon: {
    fontSize: "40px",
    marginBottom: "10px",
  },
  uploadText: {
    fontSize: "13px",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  // Button Styling
  button: {
    display: "block",
    width: "100%",
    padding: "16px",
    borderRadius: "35px", // Fully rounded
    border: "none",
    color: "white",
    fontSize: "16px",
    fontWeight: "bold",
    marginTop: "10px",
    boxShadow: "0 4px 6px rgba(106, 13, 173, 0.2)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
  },
  buttonEnabled: {
    background: "#6A0DAD",
    cursor: "pointer",
  },
  buttonDisabled: {
    background: "#b587d5",
    cursor: "not-allowed",
  },
  // These effects are applied in JSX via onMouseEnter/onMouseLeave (optional) or separate CSS

  // Loading Overlay styling
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(255, 255, 255, 0.95)",
    borderRadius: "25px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    backdropFilter: "blur(2px)",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #f3f3f3",
    borderTop: "4px solid #6A0DAD",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "20px",
  },
  statusText: {
    color: "#6A0DAD",
    fontWeight: "500",
    fontSize: "15px",
  },
};


export default CreateNFT;
