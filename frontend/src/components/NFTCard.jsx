import { useState } from "react";
import { formatEther } from "ethers";

const NFTCard = ({ item, buyNFT, cancelListing, account, canTransact, busy }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const ownListing = item.seller.toLowerCase() === account?.toLowerCase();
  return (
    <div style={styles.card}>
      <div style={styles.imageContainer}>
        {item.image && !imageFailed ? <img src={item.image} alt={item.name} style={styles.image} loading="lazy" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} /> : <div style={styles.placeholder}>Artwork unavailable</div>}
      </div>
      <div style={styles.details}>
        <h3 style={styles.name}>{item.name}</h3>
        <p style={styles.description}>{item.description}</p>
        <p style={{ color: "#666", fontSize: "12px" }}>Token #{item.tokenId} · {item.nft.slice(0, 6)}…{item.nft.slice(-4)}</p>
        {item.metadataUnavailable && <p style={{ color: "#785700", fontSize: "12px" }}>Metadata unavailable</p>}
        <div style={styles.footer}>
          <span style={styles.price}>{formatEther(item.price)} ETH</span>
          <button style={{ ...styles.buyButton, width: "auto" }} disabled={busy || !canTransact}
            onClick={() => ownListing ? cancelListing(item.itemId) : buyNFT(item.itemId, item.price)}>
            {ownListing ? "Cancel listing" : "Buy"}
          </button>
        </div>
        {!canTransact && <p style={{ color: "#666", fontSize: "12px", marginTop: "8px" }}>Connect on Sepolia to transact.</p>}
      </div>
    </div>
  );
};

const styles = {
  card: {
    width: "280px",
    background: "#ffffff",
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow: "0 10px 20px rgba(0,0,0,0.15)",
    transition: "transform 0.3s ease",
    border: "1px solid #eee"
  },
  imageContainer: { width: "100%", height: "220px", background: "#f9f9f9" },
  image: { width: "100%", height: "100%", objectFit: "cover" },
  placeholder: { height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#999" },
  details: { padding: "15px", textAlign: "left" },
  name: { margin: "0 0 5px 0", color: "#333", fontSize: "18px", fontWeight: "bold" },
  description: { fontSize: "12px", color: "#777", height: "35px", overflow: "hidden" },
  footer: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "15px" },
  price: { fontWeight: "bold", color: "#6A0DAD", fontSize: "16px" },
  buyButton: {
    padding: "8px 18px",
    background: "#6A0DAD",
    color: "white",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "bold",
  }
};

export default NFTCard;