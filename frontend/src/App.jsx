import { useEffect, useState } from "react";
import { ethers } from "ethers";
import CreateNFT from "./CreateNFT";
import Marketplace from "./Marketplace";
import NFTMarketplace from "./artifacts/contracts/NFTMarketplace.sol/NFTMarketplace.json";

const contractAddress = "YOUR_CONTRACT_ADDRESS"; // 👈 replace

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const connectWallet = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();

    const marketplace = new ethers.Contract(
      contractAddress,
      NFTMarketplace.abi,
      signer
    );

    setAccount(accounts[0]);
    setContract(marketplace);
  };

  const loadMarketplaceItems = async () => {
    if (!contract) return;

    setLoading(true);
    const data = await contract.fetchMarketItems();
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    connectWallet();
  }, []);

  useEffect(() => {
    if (contract) loadMarketplaceItems();
  }, [contract]);

  return (
    <div style={styles.container}>
      <div style={styles.overlay}></div>

      <div style={styles.content}>
        <h1 style={styles.title}>Royal Purple Web3 NFT Marketplace</h1>

        {!account ? (
          <button style={styles.button} onClick={connectWallet}>
            Connect Wallet
          </button>
        ) : (
          <>
            <CreateNFT contract={contract} loadMarketplaceItems={loadMarketplaceItems} />

            <h2 style={styles.sectionTitle}>Marketplace</h2>

            {loading ? (
              <p style={{ color: "white" }}>Loading NFTs...</p>
            ) : (
              <Marketplace items={items} contract={contract} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    width: "100%",
    background: "linear-gradient(135deg, #4B0082, #6A0DAD, #8A2BE2)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  overlay: {
    position: "absolute",
    width: "200%",
    height: "200%",
    background:
      "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1), transparent)",
    animation: "pulse 6s infinite alternate",
  },
  content: {
    zIndex: 2,
    width: "90%",
    maxWidth: "1200px",
    textAlign: "center",
  },
  title: {
    color: "white",
    fontSize: "40px",
    marginBottom: "30px",
  },
  sectionTitle: {
    color: "white",
    marginTop: "40px",
  },
  button: {
    padding: "12px 25px",
    borderRadius: "30px",
    border: "none",
    background: "#FFD700",
    fontWeight: "bold",
    cursor: "pointer",
    marginBottom: "20px",
  },
};

export default App;
