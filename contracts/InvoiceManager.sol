// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract InvoiceManager is Ownable, ReentrancyGuard {
    enum InvoiceStatus { Created, Paid, Cancelled, Disputed }
    
    struct Invoice {
        uint256 id;
        address issuer;
        address client;
        address tokenAddress; // 0x0 for native token
        uint256 amount;
        uint256 amountPaid;
        uint256 dueDate;
        string description;
        InvoiceStatus status;
        bool useEscrow;
        uint256 createdAt;
    }
    
    struct EscrowInvoice {
        uint256 invoiceId;
        bool isActive;
        uint256 totalAmount;
        uint256 releasedAmount;
    }
    
    struct Milestone {
        uint256 amount;
        string description;
        bool isCompleted;
        bool isReleased;
    }
    
    mapping(uint256 => Invoice) public invoices;
    mapping(uint256 => EscrowInvoice) public escrowInvoices;
    mapping(uint256 => Milestone[]) public invoiceMilestones;
    mapping(address => uint256[]) public userInvoices;
    mapping(address => uint256[]) public clientInvoices;
    
    uint256 public nextInvoiceId = 1;
    uint256 public platformFeePercentage = 250; // 2.5%
    address public feeRecipient;
    
    event InvoiceCreated(uint256 indexed invoiceId, address indexed issuer, address indexed client, uint256 amount, uint256 dueDate, string description);
    event InvoicePaid(uint256 indexed invoiceId, address indexed payer, uint256 amount);
    event InvoiceCancelled(uint256 indexed invoiceId);
    event EscrowActivated(uint256 indexed invoiceId, uint256 amount);
    event MilestoneCompleted(uint256 indexed invoiceId, uint256 milestoneIndex);
    event MilestoneReleased(uint256 indexed invoiceId, uint256 milestoneIndex, uint256 amount);
    event DisputeRaised(uint256 indexed invoiceId, address indexed raiser);
    
    constructor() {
        _transferOwnership(msg.sender);
        feeRecipient = msg.sender;
    }
    
    modifier onlyInvoiceParties(uint256 invoiceId) {
        require(
            msg.sender == invoices[invoiceId].issuer || 
            msg.sender == invoices[invoiceId].client,
            "Not authorized"
        );
        _;
    }
    
    function createInvoice(
        address client,
        address tokenAddress,
        uint256 amount,
        uint256 dueDate,
        string memory description,
        bool useEscrow
    ) external returns (uint256 invoiceId) {
        require(client != address(0), "Invalid client address");
        require(amount > 0, "Amount must be greater than 0");
        require(dueDate > block.timestamp, "Due date must be in the future");
        
        invoiceId = nextInvoiceId++;
        
        invoices[invoiceId] = Invoice({
            id: invoiceId,
            issuer: msg.sender,
            client: client,
            tokenAddress: tokenAddress,
            amount: amount,
            amountPaid: 0,
            dueDate: dueDate,
            description: description,
            status: InvoiceStatus.Created,
            useEscrow: useEscrow,
            createdAt: block.timestamp
        });
        
        userInvoices[msg.sender].push(invoiceId);
        clientInvoices[client].push(invoiceId);
        
        if (useEscrow) {
            escrowInvoices[invoiceId] = EscrowInvoice({
                invoiceId: invoiceId,
                isActive: true,
                totalAmount: amount,
                releasedAmount: 0
            });
            
            emit EscrowActivated(invoiceId, amount);
        }
        
        emit InvoiceCreated(invoiceId, msg.sender, client, amount, dueDate, description);
        
        return invoiceId;
    }
    
    function payInvoice(uint256 invoiceId) external payable nonReentrant {
        Invoice storage invoice = invoices[invoiceId];
        require(invoice.id != 0, "Invoice does not exist");
        require(invoice.status == InvoiceStatus.Created, "Invoice not payable");
        require(msg.sender == invoice.client, "Only client can pay");
        
        uint256 amountToPay = invoice.amount - invoice.amountPaid;
        
        if (invoice.tokenAddress == address(0)) {
            require(msg.value >= amountToPay, "Insufficient payment");
            
            if (invoice.useEscrow) {
                // Funds stay in contract for escrow
            } else {
                // Direct payment to issuer
                uint256 fee = (amountToPay * platformFeePercentage) / 10000;
                uint256 issuerAmount = amountToPay - fee;
                
                payable(invoice.issuer).transfer(issuerAmount);
                payable(feeRecipient).transfer(fee);
            }
            
            // Refund excess
            if (msg.value > amountToPay) {
                payable(msg.sender).transfer(msg.value - amountToPay);
            }
        } else {
            IERC20 token = IERC20(invoice.tokenAddress);
            require(token.transferFrom(msg.sender, address(this), amountToPay), "Token transfer failed");
            
            if (!invoice.useEscrow) {
                uint256 fee = (amountToPay * platformFeePercentage) / 10000;
                uint256 issuerAmount = amountToPay - fee;
                
                require(token.transfer(invoice.issuer, issuerAmount), "Transfer to issuer failed");
                require(token.transfer(feeRecipient, fee), "Fee transfer failed");
            }
        }
        
        invoice.amountPaid += amountToPay;
        invoice.status = InvoiceStatus.Paid;
        
        emit InvoicePaid(invoiceId, msg.sender, amountToPay);
    }
    
    function addMilestones(uint256 invoiceId, Milestone[] memory milestones) external {
        require(invoices[invoiceId].issuer == msg.sender, "Only issuer can add milestones");
        require(invoices[invoiceId].useEscrow, "Invoice must use escrow");
        
        for (uint i = 0; i < milestones.length; i++) {
            invoiceMilestones[invoiceId].push(milestones[i]);
        }
    }
    
    function completeMilestone(uint256 invoiceId, uint256 milestoneIndex) external {
        require(invoices[invoiceId].issuer == msg.sender, "Only issuer can complete milestones");
        require(milestoneIndex < invoiceMilestones[invoiceId].length, "Invalid milestone index");
        
        Milestone storage milestone = invoiceMilestones[invoiceId][milestoneIndex];
        require(!milestone.isCompleted, "Milestone already completed");
        
        milestone.isCompleted = true;
        emit MilestoneCompleted(invoiceId, milestoneIndex);
    }
    
    function releaseMilestone(uint256 invoiceId, uint256 milestoneIndex) external {
        Invoice storage invoice = invoices[invoiceId];
        require(invoice.client == msg.sender, "Only client can release milestones");
        require(milestoneIndex < invoiceMilestones[invoiceId].length, "Invalid milestone index");
        
        Milestone storage milestone = invoiceMilestones[invoiceId][milestoneIndex];
        require(milestone.isCompleted, "Milestone not completed");
        require(!milestone.isReleased, "Milestone already released");
        
        milestone.isReleased = true;
        
        EscrowInvoice storage escrow = escrowInvoices[invoiceId];
        escrow.releasedAmount += milestone.amount;
        
        uint256 fee = (milestone.amount * platformFeePercentage) / 10000;
        uint256 issuerAmount = milestone.amount - fee;
        
        if (invoice.tokenAddress == address(0)) {
            payable(invoice.issuer).transfer(issuerAmount);
            payable(feeRecipient).transfer(fee);
        } else {
            IERC20 token = IERC20(invoice.tokenAddress);
            require(token.transfer(invoice.issuer, issuerAmount), "Transfer to issuer failed");
            require(token.transfer(feeRecipient, fee), "Fee transfer failed");
        }
        
        emit MilestoneReleased(invoiceId, milestoneIndex, milestone.amount);
    }
    
    function cancelInvoice(uint256 invoiceId) external {
        Invoice storage invoice = invoices[invoiceId];
        require(invoice.issuer == msg.sender, "Only issuer can cancel");
        require(invoice.status == InvoiceStatus.Created, "Cannot cancel paid invoice");
        
        invoice.status = InvoiceStatus.Cancelled;
        emit InvoiceCancelled(invoiceId);
    }
    
    function raiseDispute(uint256 invoiceId) external onlyInvoiceParties(invoiceId) {
        invoices[invoiceId].status = InvoiceStatus.Disputed;
        emit DisputeRaised(invoiceId, msg.sender);
    }
    
    function getInvoice(uint256 invoiceId) external view returns (Invoice memory) {
        return invoices[invoiceId];
    }
    
    function getUserInvoices(address user) external view returns (uint256[] memory) {
        return userInvoices[user];
    }
    
    function getClientInvoices(address client) external view returns (uint256[] memory) {
        return clientInvoices[client];
    }
    
    function getInvoiceMilestones(uint256 invoiceId) external view returns (Milestone[] memory) {
        return invoiceMilestones[invoiceId];
    }
    
    function setPlatformFee(uint256 newFeePercentage) external onlyOwner {
        require(newFeePercentage <= 1000, "Fee cannot exceed 10%");
        platformFeePercentage = newFeePercentage;
    }
    
    function setFeeRecipient(address newFeeRecipient) external onlyOwner {
        require(newFeeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = newFeeRecipient;
    }
    
    function emergencyWithdraw(address tokenAddress) external onlyOwner {
        if (tokenAddress == address(0)) {
            payable(owner()).transfer(address(this).balance);
        } else {
            IERC20 token = IERC20(tokenAddress);
            token.transfer(owner(), token.balanceOf(address(this)));
        }
    }
}
