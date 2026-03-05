# NFT Marketplace

A full-stack NFT Marketplace dApp on Ethereum Sepolia testnet where users can mint, list, and buy NFTs.  
Built with **Solidity**, **React**, **Express**, **Ethers.js**, and **IPFS (Pinata)**.

---

## 🌐 Live Project Links

- **Frontend:** [NFT Marketplace](https://nft-marketplace-ecru-rho.vercel.app/)  
- **Backend API:** [Backend API](https://nft-marketplace-r1az.onrender.com)  
- **NFT Contract (Sepolia):** `0x5257a7E5F95FB75393Ab9fc943f5aE5DBc3b3Ab7`  
- **Marketplace Contract (Sepolia):** `0x9f4D4322c5231943f8bb3A3B0102B8370d561133`

---

## 🛠 Technology Stack

- **Blockchain:** :contentReference[oaicite:0]{index=0} (Sepolia testnet)  
- **Smart Contracts:** Solidity, OpenZeppelin ERC721  
- **Frontend:** React.js, Ethers.js, Tailwind CSS  
- **Backend:** Node.js, Express.js, Axios, FormData  
- **IPFS Storage:** :contentReference[oaicite:1]{index=1}  
- **Wallet Integration:** :contentReference[oaicite:2]{index=2}  
- **Hosting:** Frontend → :contentReference[oaicite:3]{index=3} → :contentReference[oaicite:4]{index=4}

---

## ⚡ Features

1. **Mint NFT** – Users can mint NFTs with image & metadata uploaded to IPFS.  
2. **List NFT** – Minted NFTs can be listed for sale on the marketplace.  
3. **Buy NFT** – Users can purchase NFTs with ETH; payment is sent to seller.  
4. **Secure Contracts** – ReentrancyGuard, ownership checks, safe ETH transfers.  
5. **Event Emissions** – Marketplace emits `NFTListed` and `NFTSold` events for frontend tracking.  
6. **Backend Integration** – Handles image & metadata uploads to IPFS.

---

## 🏗 Architecture

### 1️⃣ Components

1. **Frontend (React.js)**  
   - Connects to MetaMask for wallet authentication.  
   - Sends NFT image & metadata to backend API.  
   - Interacts with Marketplace contract for listing & buying.

2. **Backend (Express.js)**  
   - Handles `POST /upload-image` → uploads images to IPFS via Pinata.  
   - Handles `POST /upload-metadata` → uploads JSON metadata to IPFS.  
   - Returns IPFS URLs for frontend to use in minting.

3. **Smart Contracts**  
   - **NFT Contract:** ERC721 contract for minting NFTs.  
   - **Marketplace Contract:** Handles listing, buying, and escrow logic.

4. **Blockchain (Sepolia Testnet)**  
   - Stores ownership of NFTs & marketplace transactions.  
   - Contracts verified on :contentReference[oaicite:5]{index=5}.

---

### 2️⃣ Data Flow

```

User (Wallet)
│
▼
Frontend (React.js)
│
├── POST /upload-image  → Backend → IPFS → ImageURL
│
├── POST /upload-metadata → Backend → IPFS → MetadataURL
│
└── Mint NFT on Blockchain → NFT Contract → TokenID
│
└── List NFT → Marketplace Contract
│
Buyer ──> Marketplace Contract (buyNFT) → ETH transferred to seller
│
└── NFT ownership updated on blockchain

````

---

### 3️⃣ Smart Contract Details

**Marketplace Contract Features:**

- `listNFT(address _nft, uint _tokenId, uint _price)`  
  - Requires price > 0  
  - Checks ownership  
  - Transfers NFT to marketplace  
  - Emits `NFTListed` event

- `buyNFT(uint _itemId)`  
  - Requires correct price  
  - Checks item exists & not sold  
  - Transfers ETH safely to seller  
  - Transfers NFT to buyer  
  - Emits `NFTSold` event

- Uses **OpenZeppelin ReentrancyGuard** for security.

---

## 📦 Setup & Installation (Dev)

1. Clone Repo:
```bash
git clone <your-repo-url>
cd nft-marketplace
````

2. Install Backend Dependencies:

```bash
cd backend
npm install
```

3. Create `.env`:

```
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
PORT=5000
```

4. Start Backend:

```bash
npm start
```

5. Install Frontend:

```bash
cd frontend
npm install
npm start
```

6. Configure Frontend `.env`:

```
REACT_APP_NFT_ADDRESS=<NFT_CONTRACT>
REACT_APP_MARKETPLACE_ADDRESS=<MARKETPLACE_CONTRACT>
REACT_APP_BACKEND_URL=http://localhost:5000
REACT_APP_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<key>
```

---

## 📈 Future Improvements

* Add **Marketplace Fees / Royalties**
* Add **Search / Filter NFTs**
* Add **User Profiles**
* Add **Optimized Gas Usage**

---

## 📝 References

* OpenZeppelin ERC721: [https://docs.openzeppelin.com/contracts/4.x/erc721](https://docs.openzeppelin.com/contracts/4.x/erc721)
* Pinata IPFS API: [https://docs.pinata.cloud/](https://docs.pinata.cloud/)
* Ethers.js: [https://docs.ethers.org/](https://docs.ethers.org/)

---