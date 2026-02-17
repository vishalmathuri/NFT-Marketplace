import { ethers } from "ethers";

const NFTCard = ({ item, buyNFT }) => {
  return (
    <div style={{
      border: "1px solid gray",
      padding: "15px",
      margin: "10px",
      borderRadius: "10px"
    }}>
      <h3>Token ID: {item.tokenId.toString()}</h3>
      <p>Price: {ethers.formatEther(item.price)} ETH</p>
      <button onClick={() => buyNFT(item.itemId)}>
        Buy NFT
      </button>
    </div>
  );
};

export default NFTCard;
