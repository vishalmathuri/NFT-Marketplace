import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import { getContracts } from "./utils/contract";

const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111 in hex

function App() {
  const [account, setAccount] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // -----------------------------
  // Ensure MetaMask on Sepolia
  // -----------------------------
  const ensureSepolia = async () => {
    if (!window.ethereum) return false;

    const chainId = await window.ethereum.request({
      method: "eth_chainId",
    });

    if (chainId !== SEPOLIA_CHAIN_ID) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: SEPOLIA_CHAIN_ID }],
        });
        return true;
      } catch (switchError) {
        setError("Please switch MetaMask network to Sepolia.");
        return false;
      }
    }

    return true;
  };

  // -----------------------------
  // Load Marketplace
  // -----------------------------
  const loadMarketplace = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const ok = await ensureSepolia();
      if (!ok) return;

      const contracts = await getContracts();
      if (!contracts) return;

      const { marketplace } = contracts;

      const itemCount = await marketplace.itemCount();
      const count = Number(itemCount);

      const itemsArray = [];

      for (let i = 1; i <= count; i++) {
        const item = await marketplace.items(i);

        if (!item.sold) {
          itemsArray.push({
            itemId: Number(item.itemId),
            tokenId: Number(item.tokenId),
            seller: item.seller,
            price: ethers.formatEther(item.price),
          });
        }
      }

      setItems(itemsArray);
    } catch (err) {
      console.error("Blockchain sync failed:", err);

      if (
        err.message?.includes("RPC endpoint returned too many errors") ||
        err.code === -32002
      ) {
        setError(
          "MetaMask RPC is rate-limited. Please wait 30 seconds or change RPC in MetaMask settings."
        );
      } else {
        setError(err.message || "Failed to load marketplace.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // -----------------------------
  // Buy NFT
  // -----------------------------
  const buyNFT = async (item) => {
    try {
      const contracts = await getContracts();
      if (!contracts) return;

      const { marketplace } = contracts;

      const tx = await marketplace.purchaseItem(item.itemId, {
        value: ethers.parseEther(item.price),
      });

      await tx.wait();

      alert("Purchase successful!");
      loadMarketplace();
    } catch (err) {
      console.error("Purchase failed:", err);
      alert("Transaction failed.");
    }
  };

  // -----------------------------
  // Initial Connect
  // -----------------------------
  useEffect(() => {
    const init = async () => {
      if (!window.ethereum) {
        setError("Please install MetaMask.");
        setLoading(false);
        return;
      }

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);

        setAccount(accounts[0]);

        await loadMarketplace();
      } catch (err) {
        console.error("Connection failed:", err);
        setError("Wallet connection failed.");
        setLoading(false);
      }
    };

    init();

    // Better than page reload
    window.ethereum?.on("accountsChanged", loadMarketplace);
    window.ethereum?.on("chainChanged", loadMarketplace);

    return () => {
      window.ethereum?.removeListener("accountsChanged", loadMarketplace);
      window.ethereum?.removeListener("chainChanged", loadMarketplace);
    };
  }, [loadMarketplace]);

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div style={{ padding: "40px", fontFamily: "Segoe UI" }}>
      <h1>🖼️ NFT Marketplace (Sepolia)</h1>

      <p>
        <strong>Wallet:</strong>{" "}
        {account ? (
          <span style={{ color: "green" }}>{account}</span>
        ) : (
          "Not Connected"
        )}
      </p>

      {error && (
        <div
          style={{
            background: "#ffe6e6",
            padding: "10px",
            borderRadius: "8px",
            marginBottom: "20px",
            color: "red",
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <p>⏳ Loading blockchain data...</p>
      ) : items.length === 0 ? (
        <p>No NFTs available.</p>
      ) : (
        <div style={{ display: "grid", gap: "20px" }}>
          {items.map((item) => (
            <div
              key={item.itemId}
              style={{
                padding: "20px",
                border: "1px solid #ddd",
                borderRadius: "10px",
              }}
            >
              <h3>NFT #{item.tokenId}</h3>
              <p>{item.price} ETH</p>

              <button
                onClick={() => buyNFT(item)}
                style={{
                  padding: "10px 15px",
                  background: "#007bff",
                  color: "#fff",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                Buy
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
