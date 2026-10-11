import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { formatEther } from "ethers";
import CreateNFT from "./components/CreateNFT";
import NFTCard from "./components/NFTCard";
import { getContracts, getReadContracts, SEPOLIA_ID, switchToSepolia, errorMessage } from "./utils/contract";
import { loadListings } from "./utils/listings";

function App() {
  const [wallet, setWallet] = useState(null);
  const [items, setItems] = useState([]);
  const [nextPage, setNextPage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [proceeds, setProceeds] = useState("0");
  const session = useRef(0);
  const loadId = useRef(0);
  const locked = useRef(false);

  const refreshWallet = useCallback(async () => {
    const version = ++session.current;
    setWallet(null); setProceeds("0");
    try {
      if (!window.ethereum) return;
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const chain = await window.ethereum.request({ method: "eth_chainId" });
      if (version !== session.current || !accounts.length) return;
      if (chain.toLowerCase() !== SEPOLIA_ID) { setWallet({ account: accounts[0], chain, version }); return; }
      const contracts = await getContracts();
      if (version !== session.current) return;
      setWallet({ account: accounts[0], chain, version, ...contracts });
    } catch (error) { if (version === session.current) setNotice({ type: "error", text: errorMessage(error) }); }
  }, []);

  useEffect(() => {
    void refreshWallet(); // Inspect existing authorization; never prompt on page load.
    const ethereum = window.ethereum;
    const disconnect = () => { session.current++; setWallet(null); setProceeds("0"); setNotice({ type: "info", text: "Wallet disconnected. Reconnect to transact." }); };
    ethereum?.on("accountsChanged", refreshWallet);
    ethereum?.on("chainChanged", refreshWallet);
    ethereum?.on("disconnect", disconnect);
    return () => {
      // This counter tracks async wallet sessions, not a DOM ref.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      session.current++;
      ethereum?.removeListener("accountsChanged", refreshWallet);
      ethereum?.removeListener("chainChanged", refreshWallet);
      ethereum?.removeListener("disconnect", disconnect);
    };
  }, [refreshWallet]);

  const loadMarketplaceItems = useCallback(async (start = 1) => {
    const id = ++loadId.current;
    setLoading(true); setLoadError("");
    let provider;
    try {
      const contracts = getReadContracts(); provider = contracts.provider;
      const page = await loadListings(contracts.marketplace, { start, getMetadata: async uri => (await axios.get(uri, { timeout: 8000 })).data });
      if (id !== loadId.current) return;
      setItems(previous => start === 1 ? page.items : [...previous, ...page.items]);
      setNextPage(page.next);
    } catch (error) { if (id === loadId.current) setLoadError(errorMessage(error)); }
    finally { provider?.destroy(); if (id === loadId.current) setLoading(false); }
  }, []);
  useEffect(() => {
    void loadMarketplaceItems();
    return () => {
      // Invalidate unfinished loads on unmount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      loadId.current++;
    };
  }, [loadMarketplaceItems]);

  const refreshProceeds = useCallback(async () => {
    if (!wallet?.marketplace) return;
    const amount = await wallet.marketplace.proceeds(wallet.account);
    if (wallet.version === session.current) setProceeds(amount.toString());
  }, [wallet]);
  useEffect(() => { void refreshProceeds().catch(error => setNotice({ type: "error", text: errorMessage(error) })); }, [refreshProceeds]);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) throw new Error("Install MetaMask or another Ethereum wallet to transact. You can still browse listings.");
      await window.ethereum.request({ method: "eth_requestAccounts" });
      await refreshWallet();
    } catch (error) { setNotice({ type: "error", text: errorMessage(error) }); }
  };
  const switchNetwork = async () => {
    try { await switchToSepolia(); await refreshWallet(); }
    catch (error) { setNotice({ type: "error", text: errorMessage(error) }); }
  };
  const runAction = async (label, action) => {
    if (locked.current) return false;
    if (!wallet?.marketplace) { setNotice({ type: "error", text: "Connect a wallet on Sepolia first." }); return false; }
    locked.current = true; setBusy(true);
    const version = wallet.version;
    let lastHash;
    const assertSession = async () => {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      const chain = await window.ethereum.request({ method: "eth_chainId" });
      if (session.current !== version || accounts[0]?.toLowerCase() !== wallet.account.toLowerCase() || chain.toLowerCase() !== SEPOLIA_ID) throw new Error("Wallet account or network changed. Reconnect before continuing.");
    };
    const report = (text, hash) => { if (hash) lastHash = hash; if (version === session.current) setNotice({ type: "info", text, hash }); };
    const transact = async (step, send) => {
      await assertSession(); report(`${step}: confirm in your wallet.`);
      const tx = await send(); report(`${step}: waiting for confirmation…`, tx.hash);
      const receipt = await tx.wait();
      if (receipt.status !== 1) throw new Error(`${step} failed on-chain.`);
      await assertSession(); return receipt;
    };
    try {
      await assertSession();
      await action({ transact, assertSession, report });
      if (version === session.current) setNotice({ type: "success", text: `${label} confirmed.`, hash: lastHash });
      await loadMarketplaceItems();
      try { await refreshProceeds(); } catch { if (version === session.current) setNotice({ type: "info", text: `${label} confirmed. Refresh to update the proceeds balance.`, hash: lastHash }); }
      return true;
    } catch (error) {
      setNotice({ type: "error", text: errorMessage(error) }); return false;
    } finally { locked.current = false; setBusy(false); }
  };
  const buyNFT = (itemId, price) => runAction("Purchase", ({ transact }) => transact("Buy NFT", () => wallet.marketplace.buyNFT(itemId, { value: price })));
  const cancelListing = itemId => runAction("Cancellation", ({ transact }) => transact("Cancel listing", () => wallet.marketplace.cancelListing(itemId)));

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Marketplace</h1>
      <p className="network-label">Ethereum Sepolia · Testnet ETH</p>
      {!wallet ? <button style={styles.connectBtn} disabled={busy} onClick={connectWallet}>Connect Wallet</button> : (
        <div className="wallet-bar">
          <span>Wallet: {wallet.account.slice(0, 6)}…{wallet.account.slice(-4)}</span>
          {wallet.chain.toLowerCase() !== SEPOLIA_ID && <button disabled={busy} onClick={switchNetwork}>Switch to Sepolia</button>}
          <button disabled={busy} onClick={() => { session.current++; setWallet(null); setProceeds("0"); }}>Disconnect</button>
        </div>
      )}
      {notice && <div className={`notice ${notice.type}`} role={notice.type === "error" ? "alert" : "status"}>
        {notice.text} {notice.hash && <a href={`https://sepolia.etherscan.io/tx/${notice.hash}`} target="_blank" rel="noreferrer">View transaction</a>}
      </div>}
      {wallet?.marketplace && <>
        <div className="wallet-bar"><span>Available proceeds: {formatEther(proceeds)} ETH</span>
          <button disabled={busy || proceeds === "0"} onClick={() => runAction("Withdrawal", ({ transact }) => transact("Withdraw proceeds", () => wallet.marketplace.withdrawProceeds()))}>Withdraw</button>
        </div>
        <CreateNFT key={`${wallet.account}-${wallet.version}`} wallet={wallet} runAction={runAction} busy={busy} />
      </>}
      <h2 style={styles.sectionTitle}>Available Assets</h2>
      {loadError && <p className="notice error" role="alert">{loadError}</p>}
      <button className="refresh-button" disabled={loading || busy} onClick={() => loadMarketplaceItems()}>Refresh listings</button>
      {loading && <p role="status">Syncing with blockchain…</p>}
      {!loading && !loadError && items.length === 0 && <p>No active listings in this page. {nextPage ? "Load the next page to see more." : "Mint and list the first asset."}</p>}
      <div style={styles.grid}>
        {items.map(item => <NFTCard key={item.itemId} item={item} account={wallet?.account} canTransact={Boolean(wallet?.marketplace)} busy={busy} buyNFT={buyNFT} cancelListing={cancelListing} />)}
      </div>
      {nextPage && <button className="refresh-button" disabled={loading || busy} onClick={() => loadMarketplaceItems(nextPage)}>Load more</button>}
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "linear-gradient(135deg, #1a0033 0%, #2d0050 50%, #4b0082 100%)", padding: "40px 20px", textAlign: "center", fontFamily: "'Inter', sans-serif" },
  title: { color: "white", fontSize: "48px", fontWeight: "900", marginBottom: "16px", letterSpacing: "-1.5px" },
  sectionTitle: { color: "#FFD700", marginTop: "60px", fontSize: "32px", fontWeight: "700" },
  connectBtn: { width: "auto", padding: "14px 35px", borderRadius: "50px", border: "none", background: "#FFD700", color: "#2d0050", fontWeight: "bold", cursor: "pointer", fontSize: "16px", boxShadow: "0 10px 20px rgba(0,0,0,0.3)" },
  grid: { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "30px", marginTop: "30px" },
};
export default App;
