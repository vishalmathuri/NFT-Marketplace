# NFT Marketplace

An Ethereum Sepolia NFT marketplace built with Solidity, OpenZeppelin ERC721, React, ethers v6, Express and IPFS/Pinata. Users can browse without connecting a wallet, mint and list artwork, buy NFTs, cancel their own active listings and withdraw sale proceeds.

## Live demo and deployment status

- Frontend: https://nft-marketplace-84ww.vercel.app/
- Backend: https://nft-marketplace-r1az.onrender.com
- Existing NFT contract: https://sepolia.etherscan.io/address/0x5257a7E5F95FB75393Ab9fc943f5aE5DBc3b3Ab7
- **Legacy marketplace:** https://sepolia.etherscan.io/address/0x9f4D4322c5231943f8bb3A3B0102B8370d561133

The cancellation and pull-payment changes in this source require a **new Marketplace deployment**. The legacy contract is immutable; updating the frontend cannot add those functions to it. Do not configure the updated frontend with the legacy marketplace address. Deploy the backend and configure/rebuild the frontend as described below before expecting these features on the live demo.

Existing listings and NFTs held in the legacy marketplace do not migrate. The legacy contract has no cancellation function; the new contract cannot recover NFTs from its escrow. Existing NFTs outside that escrow can be approved and listed on the new contract. The deployment script can reuse the existing NFT contract.

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

The frontend uses plain CSS and inline styles, not Tailwind CSS. The backend calls Pinata; contracts keep NFT ownership, listing state and proceeds accounting on-chain.

## Local setup

Use Node.js 22 LTS or a compatible newer release and npm. Wallet transactions require Sepolia test ETH. Never commit a private key or Pinata secret.

```bash
git clone https://github.com/vishalmathuri/NFT-Marketplace.git
cd NFT-Marketplace
cd Smart_contract
npm ci
cp .env.example .env
npm test
npm run export:abis
```

Configure `Smart_contract/.env` locally if deploying to Sepolia. Local compile/tests do not require credentials. From `Smart_contract`:

```bash
npm run deploy:sepolia
```

Record the printed `VITE_NFT_ADDRESS` and **new** `VITE_MARKETPLACE_ADDRESS`. Leave `NFT_ADDRESS` set to reuse the existing NFT contract, or blank to deploy a fresh one. `scripts/export-abis.js` exports only ABI data from the compiled contracts; run it whenever contract interfaces change.

From the repository root, set up the backend:

```bash
cd backend
npm ci
cp .env.example .env
npm test
npm start
```

Set `PINATA_API_KEY` and `PINATA_SECRET_API_KEY` (exact spelling), plus permitted frontend origins. In another terminal from the repository root:

```bash
cd frontend
npm ci
cp .env.example .env
npm test
npm run lint
npm run dev
```

Set the new marketplace address, NFT address, backend URL and Sepolia RPC URL in `frontend/.env`. Open http://localhost:5173. Vite uses `npm run dev`; it does not provide `npm start`. Every `VITE_*` value is public client configuration; never put secrets there.

## Deploy the corrections

1. Run the contract, backend and frontend checks. Compile/export ABIs and deploy the new Marketplace to Sepolia using a locally configured wallet with test ETH.
2. Deploy `backend` on Render (`npm ci`, `npm start`). Set Pinata credentials, `FRONTEND_ORIGINS`, `DAILY_UPLOAD_LIMIT` and `TRUST_PROXY=1` for Render's single trusted proxy.
3. In Vercel, use root directory `frontend`, build command `npm run build`, output `dist`. Set `VITE_MARKETPLACE_ADDRESS` to the new deployment, `VITE_NFT_ADDRESS`, `VITE_BACKEND_URL=https://nft-marketplace-r1az.onrender.com` and a working `VITE_SEPOLIA_RPC_URL`.
4. Rebuild/redeploy Vercel after updating environment values. Test browsing disconnected, wrong-network switching, mint/list, seller cancellation, purchase from a second wallet, and seller withdrawal.

Backend and frontend must be released together: uploads now require signed wallet authentication. Public wallet signatures support EOAs; ERC1271 smart-contract-wallet authentication is not implemented. Sessions/quotas are in memory and reset on restart; use shared persistent storage and a provider spending cap before scaling to multiple instances. CORS alone is not authentication. A wallet signature does not guarantee a human user, and quotas are a cost bound rather than complete Sybil protection.

## Recover a minted but unlisted NFT

While the form stays open, use **Retry listing minted NFT**. After a reload or wallet switch, locate the mint's `Transfer` event/token ID on Sepolia Etherscan, then approve the **new** marketplace for that token and call `listNFT` from the token-owning wallet. Existing `scripts/list.js` now accepts environment variables for this flow. Do not repeat minting to recover a listing failure.

## Checks and limitations

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

Contract tests cover minting, escrow, validation, exact payment, cancellation, relisting, seller accounting, multiple NFT contracts, rejecting ETH receivers and withdrawal reentrancy. Backend tests use mocked Pinata responses and cover authorization/replay/expiry, origin checks, malformed and oversized images, metadata validation, upstream errors and quotas. Frontend tests cover listing pagination, bounded concurrency, per-listing contract selection and metadata fallbacks.

This is a testnet portfolio project, not an audited production marketplace. Arbitrary ERC721 implementations and IPFS gateways may misbehave or become unavailable. Wallets and RPC/IPFS services can fail independently. NFTs sent directly to the marketplace outside `listNFT` have no recovery mechanism; use the listing flow.

## References

- OpenZeppelin ERC721: https://docs.openzeppelin.com/contracts/4.x/erc721
- ethers: https://docs.ethers.org/v6/
- Pinata: https://docs.pinata.cloud/
