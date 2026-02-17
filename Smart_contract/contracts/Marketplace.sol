// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract Marketplace is ReentrancyGuard {

    struct Item {
        uint itemId;
        address nft;
        uint tokenId;
        address payable seller;
        uint price;
        bool sold;
    }

    uint public itemCount;
    mapping(uint => Item) public items;

    function listNFT(
        address _nft,
        uint _tokenId,
        uint _price
    ) external {
        require(_price > 0, "Price must be > 0");

        itemCount++;

        IERC721(_nft).transferFrom(msg.sender, address(this), _tokenId);

        items[itemCount] = Item(
            itemCount,
            _nft,
            _tokenId,
            payable(msg.sender),
            _price,
            false
        );
    }

    function buyNFT(uint _itemId) external payable nonReentrant {
        Item storage item = items[_itemId];

        require(msg.value == item.price, "Incorrect price");
        require(!item.sold, "Already sold");

        item.seller.transfer(msg.value);
        IERC721(item.nft).transferFrom(address(this), msg.sender, item.tokenId);

        item.sold = true;
    }
}