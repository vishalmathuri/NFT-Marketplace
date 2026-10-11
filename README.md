# NFT Marketplace

An Ethereum Sepolia NFT marketplace built with Solidity, OpenZeppelin ERC721, React, ethers v6, Express and IPFS/Pinata. Users can browse without connecting a wallet, mint and list artwork, buy NFTs, cancel their own active listings and withdraw sale proceeds.

## Live demo and deployed contracts

- **Live demo:** [NFT Marketplace](https://nft-marketplace-84ww.vercel.app/)
- **Backend API:** [Render backend](https://nft-marketplace-r1az.onrender.com)
- **Network:** Ethereum Sepolia (chain ID `11155111`)

| Contract | Sepolia address |
| --- | --- |
| NFT (ERC721) | [`0x5257a7E5F95FB75393Ab9fc943f5aE5DBc3b3Ab7`](https://sepolia.etherscan.io/address/0x5257a7E5F95FB75393Ab9fc943f5aE5DBc3b3Ab7#code) |
| Marketplace | [`0x02762563C4D682351171C549Ca0B41656D782C98`](https://sepolia.etherscan.io/address/0x02762563C4D682351171C549Ca0B41656D782C98#code) |

The current Marketplace supports seller cancellation and pull-payment withdrawals. Buying credits the seller's balance; the seller withdraws it in a separate transaction. Browsing does not require a connected wallet. Transactions use Sepolia test ETH.

### Legacy deployment

The [legacy marketplace](https://sepolia.etherscan.io/address/0x9f4D4322c5231943f8bb3A3B0102B8370d561133) is retained only as a historical reference. Do not use its address in the current frontend. Its listings and escrowed NFTs do not migrate, and the new contract cannot recover NFTs from the legacy escrow. NFTs outside that escrow can be approved and listed on the current Marketplace.

## Features and architecture

- `listNFT(nft, tokenId, price)` checks a positive price, ERC721 support, ownership and approval, then escrows the NFT.
- `buyNFT(itemId)` requires the exact price, closes the listing, credits the seller's `proceeds` and transfers the NFT to the buyer. It makes no ETH call to the seller.
- `cancelListing(itemId)` allows only the seller of an active listing to recover the NFT. Sold/cancelled listings cannot be cancelled or purchased again.
- `withdrawProceeds()` sends only the caller's accumulated balance. Failed transfers revert the balance update so the seller can retry. Marketplace mutations use `ReentrancyGuard`.
- The frontend checks Sepolia, supports explicit switching, reacts to account/network/disconnect events and displays wallet approval, pending, confirmed and failed transaction states with explorer links.
- Listing IDs are paginated in groups of 24, with at most six concurrent loads. Each listing uses its own NFT contract. Missing metadata/images produce local placeholders rather than removing an active listing.
- Minting approves only the minted token. If approval/listing fails, the current form remembers the minted token so retrying does not mint another NFT.
- Backend upload authentication uses a one-use, five-minute wallet-signature challenge and a fifteen-minute bearer session kept in frontend memory. No transaction is signed for upload access.
- Uploads allow PNG/JPEG/WebP, up to 5 MB and 16 megapixels, with strict base64 validation and full decoding/re-encoding through Sharp. SVG and animation are rejected. Names/descriptions and image IPFS URLs are validated.
- Origin restrictions, per-IP/per-wallet rate limits, a daily instance quota, payload limits and upstream timeouts reduce upload abuse. Pinata credentials stay on the backend.

## Technology stack

| Layer | Technologies |
| --- | --- |
| Smart contracts | Solidity 0.8.20, OpenZeppelin ERC721, ReentrancyGuard, Hardhat |
| Frontend | React, Vite, ethers v6, plain CSS and inline styles |
| Backend | Node.js, Express, Sharp, Axios |
| Storage | IPFS through Pinata |
| Hosting | Vercel frontend, Render backend |
| Testing | Hardhat, Node.js test runner, Vitest |

The backend handles authenticated uploads to Pinata. Contracts store NFT ownership, listing state and proceeds accounting on-chain.

## Local setup

Use Node.js 22 and npm. Wallet transactions require Sepolia test ETH. Never commit a private key or Pinata secret.

```bash
git clone https://github.com/vishalmathuri/NFT-Marketplace.git
cd NFT-Marketplace
cd Smart_contract
npm ci
cp .env.example .env
npm test
npm run export:abis
```

Local compile/tests do not require deployment credentials. `npm run export:abis` exports ABI data from compiled contracts; run it after changing contract interfaces. You can use the deployed Sepolia addresses above for local frontend development without redeploying contracts.

From the repository root, set up the backend:

```bash
cd backend
npm ci
cp .env.example .env
npm test
```

Before starting the backend, edit `backend/.env` and set `PINATA_API_KEY` and `PINATA_SECRET_API_KEY` (exact spelling). For local development, allow `http://localhost:5173` in `FRONTEND_ORIGINS` and use `TRUST_PROXY=0`.

Start the configured backend with `npm start` from `backend`. Keep it running.

In another terminal from the repository root:

```bash
cd frontend
npm ci
cp .env.example .env
npm test
npm run lint
```

Set these values in `frontend/.env` for local development:

```dotenv
VITE_NFT_ADDRESS=0x5257a7E5F95FB75393Ab9fc943f5aE5DBc3b3Ab7
VITE_MARKETPLACE_ADDRESS=0x02762563C4D682351171C549Ca0B41656D782C98
VITE_BACKEND_URL=http://localhost:5000
VITE_SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
```

Run `npm run dev` from `frontend`, then open [http://localhost:5173](http://localhost:5173). Restart Vite after changing environment values. Every `VITE_*` value is public client configuration; never put secrets there.

The shell examples use `cp`; in Windows PowerShell, use `Copy-Item .env.example .env`. Copy templates only on first setup so you do not overwrite existing configuration.

## Deploy your own contracts

This is optional when using the deployed contracts above. Configure `Smart_contract/.env` locally with `SEPOLIA_RPC`, `PRIVATE_KEY`, and, for source verification, `ETHERSCAN_API_KEY`. The deployer needs Sepolia test ETH. Set `NFT_ADDRESS` to reuse an existing NFT contract, or leave it blank to deploy a fresh one.

From `Smart_contract`:

```bash
npm run compile
npm run export:abis
npm run deploy:sepolia
```

Record the printed NFT and Marketplace addresses and use them in your frontend configuration. To verify your newly deployed Marketplace, replace `YOUR_MARKETPLACE_ADDRESS` below with its address:

```bash
npx hardhat verify --network sepolia --contract contracts/Marketplace.sol:Marketplace YOUR_MARKETPLACE_ADDRESS
```

## Hosting configuration

### Backend on Render

- Root directory: `backend`
- Build command: `npm ci`
- Start command: `npm start`
- Set `PINATA_API_KEY` and `PINATA_SECRET_API_KEY` as backend secrets.
- Set `FRONTEND_ORIGINS=https://nft-marketplace-84ww.vercel.app,http://localhost:5173`, `DAILY_UPLOAD_LIMIT=200`, and `TRUST_PROXY=1` for the single trusted proxy configuration.

If hosting your own frontend, replace the production origin with your own URL.

### Frontend on Vercel

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`

Set the following environment variables for the hosted frontend:

```dotenv
VITE_NFT_ADDRESS=0x5257a7E5F95FB75393Ab9fc943f5aE5DBc3b3Ab7
VITE_MARKETPLACE_ADDRESS=0x02762563C4D682351171C549Ca0B41656D782C98
VITE_BACKEND_URL=https://nft-marketplace-r1az.onrender.com
VITE_SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
```

For your own deployment, substitute your contract addresses and backend URL. Rebuild/redeploy after changing Vercel environment values because Vite embeds them at build time.

After deployment, check disconnected browsing, Sepolia switching, minting/listing, seller cancellation, purchase from a second account, and seller withdrawal.

Backend and frontend must be released together: uploads now require signed wallet authentication. Public wallet signatures support EOAs; ERC1271 smart-contract-wallet authentication is not implemented. Sessions/quotas are in memory and reset on restart; use shared persistent storage and a provider spending cap before scaling to multiple instances. CORS alone is not authentication. A wallet signature does not guarantee a human user, and quotas are a cost bound rather than complete Sybil protection.

## Recover a minted but unlisted NFT

While the form stays open, use **Retry listing minted NFT**. After a reload or wallet switch, locate the mint's `Transfer` event/token ID on Sepolia Etherscan, then approve the **new** marketplace for that token and call `listNFT` from the token-owning wallet. Existing `scripts/list.js` now accepts environment variables for this flow. Do not repeat minting to recover a listing failure.

## Tests and validation

The validated suite contains **42 passing tests**:

| Suite | Tests |
| --- | ---: |
| Smart contracts | 19 |
| Backend | 10 |
| Frontend listing utilities | 5 |
| Frontend wallet and transaction workflows | 8 |
| **Total** | **42** |

Run the checks from the repository root:

```bash
cd Smart_contract
npm test
cd ../backend
npm test
cd ../frontend
npm test
npm run lint
npm run build
```

Contract tests cover minting, escrow, validation, exact payment, cancellation, relisting, seller accounting, multiple NFT contracts, rejecting ETH receivers and withdrawal reentrancy. Backend tests use mocked Pinata responses and cover authorization/replay/expiry, origin checks, malformed and oversized images, metadata validation, upstream errors and quotas. Frontend tests cover listing pagination, bounded concurrency, per-listing contract selection, metadata fallbacks, silent wallet authorization checks, Sepolia switching, account/network changes, listener cleanup, transaction status, rejection handling and duplicate-purchase prevention. Frontend lint and production build checks also passed.

## Limitations

This is a testnet portfolio project, not an audited production marketplace. Arbitrary ERC721 implementations and IPFS gateways may misbehave or become unavailable. Wallets and RPC/IPFS services can fail independently. NFTs sent directly to the marketplace outside `listNFT` have no recovery mechanism; use the listing flow.

## References

- [OpenZeppelin ERC721](https://docs.openzeppelin.com/contracts/4.x/erc721)
- [ethers v6](https://docs.ethers.org/v6/)
- [Pinata](https://docs.pinata.cloud/)
