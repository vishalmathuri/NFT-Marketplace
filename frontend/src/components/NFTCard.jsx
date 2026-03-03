import { ethers } from "ethers";

const NFTCard = ({ item, buyNFT }) => {
  return (
    <div style={styles.card}>
      <div style={styles.imageContainer}>
        {item.image ? (
          <img 
            src={item.image} 
            alt={item.name} 
            style={styles.image} 
            onError={(e) => { e.target.src = "https://via.placeholder.com/250?text=IPFS+Loading+Error"; }}
          />
        ) : (
          <div style={styles.placeholder}>No Image Found</div>
        )}
      </div>
      
      <div style={styles.details}>
        <h3 style={styles.name}>{item.name}</h3>
        <p style={styles.description}>{item.description || "No description available"}</p>
        <div style={styles.footer}>
          <span style={styles.price}>{ethers.formatEther(item.price)} ETH</span>
          <button style={styles.buyButton} onClick={() => buyNFT(item.itemId, item.price)}>
            Buy
          </button>
        </div>
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