// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract Marketplace is ReentrancyGuard {
    struct Item {
        uint itemId;
        address nft;
        uint tokenId;
        address payable seller;
        uint price;
        bool sold;
        bool cancelled;
    }

    uint public itemCount;
    mapping(uint => Item) public items;
    mapping(address => uint) public proceeds;

    event NFTListed(uint indexed itemId, address indexed nft, uint indexed tokenId, address seller, uint price);
    event NFTSold(uint indexed itemId, address indexed nft, uint indexed tokenId, address seller, address buyer, uint price);
    event ListingCancelled(uint indexed itemId, address indexed seller);
    event ProceedsWithdrawn(address indexed seller, uint amount);

    function listNFT(address _nft, uint _tokenId, uint _price) external nonReentrant {
        require(_price > 0, "Price must be > 0");
        require(_nft.code.length > 0, "Invalid NFT contract");
        require(IERC165(_nft).supportsInterface(type(IERC721).interfaceId), "Not ERC721");
        require(IERC721(_nft).ownerOf(_tokenId) == msg.sender, "Not owner");
        uint id = ++itemCount;
        items[id] = Item(id, _nft, _tokenId, payable(msg.sender), _price, false, false);
        IERC721(_nft).transferFrom(msg.sender, address(this), _tokenId);
        emit NFTListed(id, _nft, _tokenId, msg.sender, _price);
    }

    function buyNFT(uint _itemId) external payable nonReentrant {
        Item storage item = _activeItem(_itemId);
        require(msg.value == item.price, "Incorrect price");
        item.sold = true;
        proceeds[item.seller] += msg.value;
        IERC721(item.nft).transferFrom(address(this), msg.sender, item.tokenId);
        emit NFTSold(_itemId, item.nft, item.tokenId, item.seller, msg.sender, item.price);
    }

    function cancelListing(uint _itemId) external nonReentrant {
        Item storage item = _activeItem(_itemId);
        require(item.seller == msg.sender, "Not seller");
        item.cancelled = true;
        IERC721(item.nft).transferFrom(address(this), msg.sender, item.tokenId);
        emit ListingCancelled(_itemId, msg.sender);
    }

    function withdrawProceeds() external nonReentrant {
        uint amount = proceeds[msg.sender];
        require(amount > 0, "No proceeds");
        proceeds[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        emit ProceedsWithdrawn(msg.sender, amount);
    }

    function _activeItem(uint id) private view returns (Item storage item) {
        require(id > 0 && id <= itemCount, "Item doesn't exist");
        item = items[id];
        require(!item.sold, "Already sold");
        require(!item.cancelled, "Listing cancelled");
    }
}
