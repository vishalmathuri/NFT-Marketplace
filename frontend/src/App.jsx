import { useEffect, useState } from "react";
import axios from "axios";
import { ethers } from "ethers";
import CreateNFT from "./components/CreateNFT";
import NFTCard from "./components/NFTCard";
import { getContracts } from "./utils/contract";

function App() {
  const [account, setAccount] = useState(null);
  const [marketplace, setMarketplace] = useState(null);
  const [nft, setNFT] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) return alert("Please install MetaMask");
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accounts[0]);
      
      const { marketplace: mContract, nft: nContract } = await getContracts();
      setMarketplace(mContract);
      setNFT(nContract);
    } catch (error) {
      console.error("Connection failed:", error);
    }
  };

  const loadMarketplaceItems = async () => {
    if (!marketplace || !nft) return;
    try {
      setLoading(true);
      const itemCount = await marketplace.itemCount();
      let listedItems = [];

      for (let i = 1; i <= Number(itemCount); i++) {
        const item = await marketplace.items(i);
        if (!item.sold) {
          try {
            // Fetch URI from NFT contract and metadata from IPFS
            const uri = await nft.tokenURI(item.tokenId);
            const metaRes = await axios.get(uri);
            const meta = metaRes.data;

            listedItems.push({
              itemId: item.itemId.toString(),
              price: item.price.toString(),
              seller: item.seller,
              name: meta.name || "Unnamed NFT",
              description: meta.description || "No description provided",
              image: meta.image,
            });
          } catch (err) {
            console.error("Error fetching metadata for item", i, err);
          }
        }
      }
      setItems(listedItems);
    } catch (error) {
      console.error("Error loading items:", error);
    } finally {
      setLoading(false);
    }
  };

  const buyNFT = async (itemId, price) => {
    try {
      const tx = await marketplace.buyNFT(itemId, { value: price });
      await tx.wait();
      loadMarketplaceItems();
    } catch (error) {
      console.error("Buy failed:", error);
    }
  };

  useEffect(() => { connectWallet(); }, []);
  useEffect(() => { if (marketplace && nft) loadMarketplaceItems(); }, [marketplace, nft]);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Marketplace</h1>
      {!account ? (
        <button style={styles.connectBtn} onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <>
          <CreateNFT 
            marketplace={marketplace} 
            nft={nft} 
            loadMarketplaceItems={loadMarketplaceItems} 
          />
          <h2 style={styles.sectionTitle}>Available Assets</h2>
          {loading ? (
            <p style={{ color: "white" }}>Syncing with Blockchain...</p>
          ) : (
            <div style={styles.grid}>
              {items.map((item, idx) => (
                <NFTCard key={idx} item={item} buyNFT={buyNFT} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  container: { 
    minHeight: "100vh", 
    background: "linear-gradient(135deg, #1a0033 0%, #2d0050 50%, #4b0082 100%)", 
    padding: "40px 20px", 
    textAlign: "center",
    fontFamily: "'Inter', sans-serif"
  },
  title: { color: "white", fontSize: "48px", fontWeight: "900", marginBottom: "40px", letterSpacing: "-1.5px" },
  sectionTitle: { color: "#FFD700", marginTop: "60px", fontSize: "32px", fontWeight: "700" },
  connectBtn: { padding: "14px 35px", borderRadius: "50px", border: "none", background: "#FFD700", color: "#2d0050", fontWeight: "bold", cursor: "pointer", fontSize: "16px", boxShadow: "0 10px 20px rgba(0,0,0,0.3)" },
  grid: { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "30px", marginTop: "30px" },
};

export default App;