// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "../Marketplace.sol";
import "../NFT.sol";

// Test-only seller: rejects ETH or attempts withdrawal reentrancy.
contract AdversarialSeller {
    Marketplace public market;
    bool public rejectPayment;
    bool public attack;
    bool public reentrySucceeded;
    constructor(Marketplace _market) { market = _market; }
    function mintAndList(NFT nft, uint price) external {
        uint tokenId = nft.mint("ipfs://test");
        nft.approve(address(market), tokenId);
        market.listNFT(address(nft), tokenId, price);
    }
    function configure(bool reject, bool reenter) external { rejectPayment = reject; attack = reenter; }
    function withdraw() external { market.withdrawProceeds(); }
    function onERC721Received(address, address, uint, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
    receive() external payable {
        require(!rejectPayment, "Reject ETH");
        if (attack) {
            (reentrySucceeded, ) = address(market).call(abi.encodeWithSelector(market.withdrawProceeds.selector));
        }
    }
}
