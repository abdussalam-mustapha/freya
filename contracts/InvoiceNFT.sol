// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title InvoiceNFT
 * @dev Soulbound NFT receipts for completed invoices
 * These NFTs are non-transferable and serve as permanent proof of payment
 */
contract InvoiceNFT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    using Strings for uint256;

    Counters.Counter private _tokenIdCounter;
    
    // Mapping from invoice ID to NFT token ID
    mapping(uint256 => uint256) public invoiceToTokenId;
    
    // Mapping from token ID to invoice data
    mapping(uint256 => InvoiceReceipt) public tokenIdToReceipt;
    
    // Mapping to track user's NFT receipts
    mapping(address => uint256[]) public userReceipts;
    
    struct InvoiceReceipt {
        uint256 invoiceId;
        address issuer;
        address client;
        uint256 amount;
        uint256 paidDate;
        string description;
        bool exists;
    }
    
    event ReceiptMinted(
        uint256 indexed tokenId,
        uint256 indexed invoiceId,
        address indexed issuer,
        address client,
        uint256 amount
    );
    
    constructor() ERC721("Freya Invoice Receipt", "FIR") {
        // Ownable automatically sets msg.sender as owner in v4.9.3
    }
    
    /**
     * @dev Mint a soulbound NFT receipt for a completed invoice
     * Only the contract owner (InvoiceManager) can mint
     */
    function mintReceipt(
        uint256 _invoiceId,
        address _issuer,
        address _client,
        uint256 _amount,
        string memory _description
    ) external onlyOwner returns (uint256) {
        require(invoiceToTokenId[_invoiceId] == 0, "Receipt already exists for this invoice");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        // Store receipt data
        tokenIdToReceipt[tokenId] = InvoiceReceipt({
            invoiceId: _invoiceId,
            issuer: _issuer,
            client: _client,
            amount: _amount,
            paidDate: block.timestamp,
            description: _description,
            exists: true
        });
        
        // Map invoice to token
        invoiceToTokenId[_invoiceId] = tokenId;
        
        // Add to user receipts (both issuer and client get the same NFT)
        userReceipts[_issuer].push(tokenId);
        userReceipts[_client].push(tokenId);
        
        // Mint to client (primary recipient)
        _safeMint(_client, tokenId);
        
        // Set token URI
        _setTokenURI(tokenId, generateTokenURI(tokenId));
        
        emit ReceiptMinted(tokenId, _invoiceId, _issuer, _client, _amount);
        
        return tokenId;
    }
    
    /**
     * @dev Generate dynamic metadata for the NFT receipt
     */
    function generateTokenURI(uint256 _tokenId) internal view returns (string memory) {
        require(_exists(_tokenId), "Token does not exist");
        
        InvoiceReceipt memory receipt = tokenIdToReceipt[_tokenId];
        
        // Create JSON metadata
        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "Freya Invoice Receipt #',
                        receipt.invoiceId.toString(),
                        '",',
                        '"description": "Soulbound receipt for completed invoice payment on Freya platform",',
                        '"image": "',
                        generateSVG(_tokenId),
                        '",',
                        '"attributes": [',
                        '{"trait_type": "Invoice ID", "value": "',
                        receipt.invoiceId.toString(),
                        '"},',
                        '{"trait_type": "Amount", "value": "',
                        (receipt.amount / 1e18).toString(),
                        ' S"},',
                        '{"trait_type": "Paid Date", "value": "',
                        receipt.paidDate.toString(),
                        '"},',
                        '{"trait_type": "Issuer", "value": "',
                        toAsciiString(receipt.issuer),
                        '"},',
                        '{"trait_type": "Client", "value": "',
                        toAsciiString(receipt.client),
                        '"},',
                        '{"trait_type": "Soulbound", "value": "true"}',
                        ']}'
                    )
                )
            )
        );
        
        return string(abi.encodePacked("data:application/json;base64,", json));
    }
    
    /**
     * @dev Generate SVG image for the NFT receipt
     */
    function generateSVG(uint256 _tokenId) internal view returns (string memory) {
        InvoiceReceipt memory receipt = tokenIdToReceipt[_tokenId];
        
        string memory svg = string(
            abi.encodePacked(
                '<svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">',
                '<defs>',
                '<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">',
                '<stop offset="0%" style="stop-color:#1e293b;stop-opacity:1" />',
                '<stop offset="100%" style="stop-color:#3730a3;stop-opacity:1" />',
                '</linearGradient>',
                '</defs>',
                '<rect width="400" height="600" fill="url(#bg)" rx="20"/>',
                '<text x="200" y="60" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="#ffffff">FREYA</text>',
                '<text x="200" y="90" font-family="Arial, sans-serif" font-size="14" text-anchor="middle" fill="#94a3b8">Invoice Receipt</text>',
                '<rect x="40" y="120" width="320" height="2" fill="#475569"/>',
                '<text x="60" y="160" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#ffffff">Invoice #',
                receipt.invoiceId.toString(),
                '</text>',
                '<text x="60" y="200" font-family="Arial, sans-serif" font-size="14" fill="#94a3b8">Amount Paid</text>',
                '<text x="60" y="220" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#10b981">',
                (receipt.amount / 1e18).toString(),
                ' S</text>',
                '<text x="60" y="270" font-family="Arial, sans-serif" font-size="14" fill="#94a3b8">From</text>',
                '<text x="60" y="290" font-family="Arial, sans-serif" font-size="12" fill="#ffffff">',
                substring(toAsciiString(receipt.issuer), 0, 20),
                '</text>',
                '<text x="60" y="330" font-family="Arial, sans-serif" font-size="14" fill="#94a3b8">To</text>',
                '<text x="60" y="350" font-family="Arial, sans-serif" font-size="12" fill="#ffffff">',
                substring(toAsciiString(receipt.client), 0, 20),
                '</text>',
                '<text x="60" y="390" font-family="Arial, sans-serif" font-size="14" fill="#94a3b8">Description</text>',
                '<text x="60" y="410" font-family="Arial, sans-serif" font-size="12" fill="#ffffff">',
                substring(receipt.description, 0, 30),
                '</text>',
                '<rect x="40" y="450" width="320" height="2" fill="#475569"/>',
                '<text x="200" y="490" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="#94a3b8">Soulbound Receipt</text>',
                '<text x="200" y="510" font-family="Arial, sans-serif" font-size="10" text-anchor="middle" fill="#64748b">Non-transferable proof of payment</text>',
                '<text x="200" y="550" font-family="Arial, sans-serif" font-size="10" text-anchor="middle" fill="#64748b">Sonic Blockchain</text>',
                '</svg>'
            )
        );
        
        return string(abi.encodePacked("data:image/svg+xml;base64,", Base64.encode(bytes(svg))));
    }
    
    /**
     * @dev Get all NFT receipts for a user
     */
    function getUserReceipts(address _user) external view returns (uint256[] memory) {
        return userReceipts[_user];
    }
    
    /**
     * @dev Get receipt data for a token ID
     */
    function getReceiptData(uint256 _tokenId) external view returns (InvoiceReceipt memory) {
        require(_exists(_tokenId), "Token does not exist");
        return tokenIdToReceipt[_tokenId];
    }
    
    /**
     * @dev Check if a receipt exists for an invoice
     */
    function receiptExists(uint256 _invoiceId) external view returns (bool) {
        return invoiceToTokenId[_invoiceId] != 0;
    }
    
    /**
     * @dev Override transfer functions to make tokens soulbound (non-transferable)
     */
    function transferFrom(address, address, uint256) public pure override(ERC721, IERC721) {
        revert("InvoiceNFT: Soulbound tokens cannot be transferred");
    }
    
    function safeTransferFrom(address, address, uint256) public pure override(ERC721, IERC721) {
        revert("InvoiceNFT: Soulbound tokens cannot be transferred");
    }
    
    function safeTransferFrom(address, address, uint256, bytes memory) public pure override(ERC721, IERC721) {
        revert("InvoiceNFT: Soulbound tokens cannot be transferred");
    }
    
    function approve(address, uint256) public pure override(ERC721, IERC721) {
        revert("InvoiceNFT: Soulbound tokens cannot be approved");
    }
    
    function setApprovalForAll(address, bool) public pure override(ERC721, IERC721) {
        revert("InvoiceNFT: Soulbound tokens cannot be approved");
    }
    
    /**
     * @dev Override tokenURI to use our custom URI generation
     */
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    /**
     * @dev Override supportsInterface
     */
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    
    /**
     * @dev Override _burn to handle URI storage
     */
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    
    // Utility functions
    function toAsciiString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(40);
        for (uint i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint(uint160(x)) / (2**(8*(19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2*i] = char(hi);
            s[2*i+1] = char(lo);
        }
        return string(abi.encodePacked("0x", string(s)));
    }
    
    function char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }
    
    function substring(string memory str, uint startIndex, uint length) internal pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        if (startIndex >= strBytes.length) return "";
        
        uint endIndex = startIndex + length;
        if (endIndex > strBytes.length) {
            endIndex = strBytes.length;
        }
        
        bytes memory result = new bytes(endIndex - startIndex);
        for (uint i = startIndex; i < endIndex; i++) {
            result[i - startIndex] = strBytes[i];
        }
        
        return string(result);
    }
}
