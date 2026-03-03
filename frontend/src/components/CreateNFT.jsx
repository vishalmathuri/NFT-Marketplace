import { useState, useRef } from "react";
import axios from "axios";
import { ethers } from "ethers";

const backendURL = "https://nft-marketplace-r1az.onrender.com";

const CreateNFT = ({ marketplace, nft, loadMarketplaceItems }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null); // State for image preview
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const fileInputRef = useRef(null); // Ref for custom file input click

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile)); // Create local URL for preview
    } else {
      setFile(null);
      setPreview(null);
    }
  };

  const createNFT = async () => {
    if (!file || !price || !name || !description) return alert("Please fill in all fields (Name, Description, File, and Price)");

    try {
      setLoading(true);
      setStatus("1/4: Uploading to IPFS...");

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        try {
          // A. Upload Image & Metadata to Pinata
          const imageRes = await axios.post(`${backendURL}/upload-image`, { imageBase64: reader.result });
          const imageURL = imageRes.data.imageURL || imageRes.data.imageUrl;

          const metadataRes = await axios.post(`${backendURL}/upload-metadata`, {
            name: name,
            description: description,
            image: imageURL
          });
          const metadataURL = metadataRes.data.metadataURL || metadataRes.data.metadataUrl;

          // B. Mint the NFT
          setStatus("2/4: Minting NFT...");
          const mintTx = await nft.mint(metadataURL); // Ensure your NFT.sol has this function!
          const receipt = await mintTx.wait();
          
          // Find the tokenId from the transfer event
          const event = receipt.logs.find(log => log.fragment?.name === 'Transfer');
          const tokenId = event.args.tokenId;

          // C. Approve Marketplace to move this NFT
          setStatus("3/4: Approving Marketplace...");
          // In ethers v6, use marketplace.target instead of marketplace.address
          const approveTx = await nft.setApprovalForAll(marketplace.target || marketplace.address, true);
          await approveTx.wait();

          // D. List on Marketplace (Matches listNFT in Marketplace.sol)
          setStatus("4/4: Listing on Marketplace...");
          const listingPrice = ethers.parseEther(price);
          // In ethers v6, use nft.target instead of nft.address
          const listTx = await marketplace.listNFT(nft.target || nft.address, tokenId, listingPrice);
          await listTx.wait();

          alert("NFT Listed Successfully! 🚀");
          
          // Clear form and preview
          setName("");
          setDescription("");
          setFile(null);
          setPreview(null);
          setPrice("");
          // Clear file input ref value as well
          if(fileInputRef.current) fileInputRef.current.value = "";
          
          setTimeout(() => loadMarketplaceItems(), 2000);
        } catch (err) {
          console.error(err);
          alert("Transaction failed: " + err.message);
        } finally {
          setLoading(false);
          setStatus("");
        }
      };
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
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
        <h2 style={styles.title}>Mint New Asset</h2>
        <p style={styles.subtitle}>Fill in the details to create your unique NFT</p>
        
        {/* Name Input Group */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>Asset Name</label>
          <input
            type="text"
            placeholder="e.g. Royal Purple Crown"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
          />
        </div>

        {/* Description Input Group */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>Description</label>
          <textarea
            placeholder="Provide a detailed description of your asset..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ ...styles.input, ...styles.textarea }}
          />
        </div>

        {/* Custom File Upload Area */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>Upload Artwork</label>
          {/* We hide the native input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={styles.hiddenFileInput}
            accept="image/*"
          />
          {/* We style this div to look like an upload area */}
          <div 
            style={styles.customUploadArea} 
            onClick={() => fileInputRef.current.click()}
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
          <label style={styles.label}>Listing Price (ETH)</label>
          <input
            type="number"
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
            ...(loading ? styles.buttonDisabled : styles.buttonEnabled)
          }} 
          onClick={createNFT} 
          disabled={loading}
        >
          {loading ? "Processing..." : "Mint & List NFT 🚀"}
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
    background: "rgba(12, 126, 50, 0.9)",
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

// Optional: Add simple spinner CSS if possible (hard with inline styles, usually needs separate CSS)
const styleTag = document.createElement("style");
styleTag.innerHTML = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  input:focus, textarea:focus {
    border-color: #6A0DAD !important;
    box-shadow: 0 0 0 3px rgba(106, 13, 173, 0.1) !important;
  }
  .customUploadAreaHover:hover {
    border-color: #6A0DAD !important;
    background: #fdfafd !important;
  }
`;
document.head.appendChild(styleTag);

export default CreateNFT;