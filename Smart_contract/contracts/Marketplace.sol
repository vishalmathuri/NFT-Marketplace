// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
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

    event NFTListed(
        uint indexed itemId,
        address indexed nft,
        uint indexed tokenId,
        address seller,
        uint price
    );

    event NFTSold(
        uint indexed itemId,
        address indexed nft,
        uint indexed tokenId,
        address seller,
        address buyer,
        uint price
    );

    function listNFT(
        address _nft,
        uint _tokenId,
        uint _price
    ) external {
        require(_price > 0, "Price must be > 0");
        require(
            IERC721(_nft).ownerOf(_tokenId) == msg.sender,
            "Not owner"
        );

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

        emit NFTListed(itemCount, _nft, _tokenId, msg.sender, _price);
    }

    function buyNFT(uint _itemId) external payable nonReentrant {
        require(_itemId > 0 && _itemId <= itemCount, "Item doesn't exist");

        Item storage item = items[_itemId];

        require(!item.sold, "Already sold");
        require(msg.value == item.price, "Incorrect price");

        item.sold = true;

        (bool success, ) = item.seller.call{value: msg.value}("");
        require(success, "Transfer failed");

        IERC721(item.nft).transferFrom(address(this), msg.sender, item.tokenId);

        emit NFTSold(
            _itemId,
            item.nft,
            item.tokenId,
            item.seller,
            msg.sender,
            item.price
        );
    }
}