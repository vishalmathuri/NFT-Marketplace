import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import { getContracts } from "./utils/contract";
import CreateNFT from "./components/CreateNFT";

const SEPOLIA_CHAIN_ID = "0xaa36a7";

function App() {
  const [account, setAccount] = useState("");
  const [items, setItems] = useState([]);
  const [nft, setNFT] = useState(null);
  const [marketplace, setMarketplace] = useState(null);
  const [loading, setLoading] = useState(true);

  const ensureSepolia = async () => {
    const chainId = await window.ethereum.request({
      method: "eth_chainId",
    });

    if (chainId !== SEPOLIA_CHAIN_ID) {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    }
  };

  const loadMarketplace = useCallback(async () => {
    try {
      setLoading(true);
      await ensureSepolia();

      const contracts = await getContracts();
      if (!contracts) return;

      setNFT(contracts.nft);
      setMarketplace(contracts.marketplace);

      const itemCount = Number(await contracts.marketplace.itemCount());
      const itemsArray = [];

      for (let i = 1; i <= itemCount; i++) {
        const item = await contracts.marketplace.items(i);

        if (!item.sold) {
          itemsArray.push({
            itemId: Number(item.itemId),
            tokenId: Number(item.tokenId),
            price: item.price,
          });
        }
      }

      setItems(itemsArray);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const connectWallet = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    setAccount(accounts[0]);
    await loadMarketplace();
  };

  const buyNFT = async (item) => {
    const tx = await marketplace.buyNFT(item.itemId, {
      value: item.price,
    });
    await tx.wait();
    loadMarketplace();
  };

  useEffect(() => {
    const checkConnection = async () => {
      if (!window.ethereum) return;

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_accounts", []);

      if (accounts.length > 0) {
        setAccount(accounts[0]);
        await loadMarketplace();
      } else {
        setLoading(false);
      }
    };

    checkConnection();
  }, [loadMarketplace]);

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background:
          "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
        color: "#fff",
      }}
    >
      {/* Navbar */}
      <div
        style={{
          width: "100%",
          padding: "20px 60px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(0,0,0,0.3)",
          backdropFilter: "blur(15px)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <h1
          style={{
            fontSize: "26px",
            background: "linear-gradient(90deg,#a18cd1,#fbc2eb)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          💜 Royal NFT Marketplace
        </h1>

        {account ? (
          <div
            style={{
              padding: "8px 18px",
              borderRadius: "30px",
              background: "rgba(255,255,255,0.1)",
              fontSize: "14px",
            }}
          >
            {account.slice(0, 6)}...{account.slice(-4)}
          </div>
        ) : (
          <button
            onClick={connectWallet}
            style={{
              padding: "10px 22px",
              borderRadius: "25px",
              border: "none",
              background: "linear-gradient(90deg,#a18cd1,#fbc2eb)",
              color: "#000",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Connect Wallet
          </button>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          width: "100%",
          padding: "50px 80px",
        }}
      >
        <CreateNFT
          nft={nft}
          marketplace={marketplace}
          reloadMarketplace={loadMarketplace}
        />

        <h2
          style={{
            marginTop: "70px",
            fontSize: "32px",
            marginBottom: "20px",
          }}
        >
          Marketplace
        </h2>

        {loading ? (
          <p>Loading NFTs...</p>
        ) : items.length === 0 ? (
          <p>No NFTs available</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "30px",
            }}
          >
            {items.map((item) => (
              <div
                key={item.itemId}
                style={{
                  padding: "25px",
                  borderRadius: "20px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  backdropFilter: "blur(20px)",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                  transition: "0.3s ease",
                }}
              >
                <h3 style={{ marginBottom: "15px" }}>
                  NFT #{item.tokenId}
                </h3>

                <p
                  style={{
                    marginBottom: "20px",
                    fontSize: "18px",
                    color: "#d1c4e9",
                  }}
                >
                  {ethers.formatEther(item.price)} ETH
                </p>

                <button
                  onClick={() => buyNFT(item)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "12px",
                    border: "none",
                    background:
                      "linear-gradient(90deg,#a18cd1,#fbc2eb)",
                    color: "#000",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  Buy NFT
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;