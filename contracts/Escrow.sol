// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Escrow is Ownable, ReentrancyGuard {
    enum EscrowStatus { Active, Completed, Disputed, Cancelled }
    
    struct EscrowAgreement {
        uint256 id;
        address payer;
        address payee;
        address tokenAddress;
        uint256 amount;
        uint256 releasedAmount;
        EscrowStatus status;
        uint256 createdAt;
        uint256 deadline;
        string description;
    }
    
    mapping(uint256 => EscrowAgreement) public escrows;
    mapping(address => uint256[]) public userEscrows;
    
    uint256 public nextEscrowId = 1;
    uint256 public disputeTimeWindow = 7 days;
    
    event EscrowCreated(uint256 indexed escrowId, address indexed payer, address indexed payee, uint256 amount);
    event FundsReleased(uint256 indexed escrowId, uint256 amount);
    event EscrowCompleted(uint256 indexed escrowId);
    event DisputeRaised(uint256 indexed escrowId, address indexed raiser);
    event EscrowCancelled(uint256 indexed escrowId);
    
    constructor() {}
    
    modifier onlyEscrowParties(uint256 escrowId) {
        require(
            msg.sender == escrows[escrowId].payer || 
            msg.sender == escrows[escrowId].payee,
            "Not authorized"
        );
        _;
    }
    
    function createEscrow(
        address payee,
        address tokenAddress,
        uint256 amount,
        uint256 deadline,
        string memory description
    ) external payable returns (uint256 escrowId) {
        require(payee != address(0), "Invalid payee address");
        require(amount > 0, "Amount must be greater than 0");
        require(deadline > block.timestamp, "Deadline must be in the future");
        
        escrowId = nextEscrowId++;
        
        if (tokenAddress == address(0)) {
            require(msg.value == amount, "Incorrect ETH amount");
        } else {
            IERC20 token = IERC20(tokenAddress);
            require(token.transferFrom(msg.sender, address(this), amount), "Token transfer failed");
        }
        
        escrows[escrowId] = EscrowAgreement({
            id: escrowId,
            payer: msg.sender,
            payee: payee,
            tokenAddress: tokenAddress,
            amount: amount,
            releasedAmount: 0,
            status: EscrowStatus.Active,
            createdAt: block.timestamp,
            deadline: deadline,
            description: description
        });
        
        userEscrows[msg.sender].push(escrowId);
        userEscrows[payee].push(escrowId);
        
        emit EscrowCreated(escrowId, msg.sender, payee, amount);
        
        return escrowId;
    }
    
    function releaseFunds(uint256 escrowId, uint256 amount) external onlyEscrowParties(escrowId) nonReentrant {
        EscrowAgreement storage escrow = escrows[escrowId];
        require(escrow.status == EscrowStatus.Active, "Escrow not active");
        require(amount > 0, "Amount must be greater than 0");
        require(escrow.releasedAmount + amount <= escrow.amount, "Insufficient funds in escrow");
        
        escrow.releasedAmount += amount;
        
        if (escrow.tokenAddress == address(0)) {
            payable(escrow.payee).transfer(amount);
        } else {
            IERC20 token = IERC20(escrow.tokenAddress);
            require(token.transfer(escrow.payee, amount), "Token transfer failed");
        }
        
        emit FundsReleased(escrowId, amount);
        
        if (escrow.releasedAmount == escrow.amount) {
            escrow.status = EscrowStatus.Completed;
            emit EscrowCompleted(escrowId);
        }
    }
    
    function raiseDispute(uint256 escrowId) external onlyEscrowParties(escrowId) {
        EscrowAgreement storage escrow = escrows[escrowId];
        require(escrow.status == EscrowStatus.Active, "Escrow not active");
        
        escrow.status = EscrowStatus.Disputed;
        emit DisputeRaised(escrowId, msg.sender);
    }
    
    function resolveDispute(uint256 escrowId, uint256 payerAmount, uint256 payeeAmount) external onlyOwner {
        EscrowAgreement storage escrow = escrows[escrowId];
        require(escrow.status == EscrowStatus.Disputed, "Escrow not disputed");
        require(payerAmount + payeeAmount == escrow.amount - escrow.releasedAmount, "Amounts don't match remaining funds");
        
        if (payeeAmount > 0) {
            if (escrow.tokenAddress == address(0)) {
                payable(escrow.payee).transfer(payeeAmount);
            } else {
                IERC20 token = IERC20(escrow.tokenAddress);
                require(token.transfer(escrow.payee, payeeAmount), "Token transfer to payee failed");
            }
        }
        
        if (payerAmount > 0) {
            if (escrow.tokenAddress == address(0)) {
                payable(escrow.payer).transfer(payerAmount);
            } else {
                IERC20 token = IERC20(escrow.tokenAddress);
                require(token.transfer(escrow.payer, payerAmount), "Token transfer to payer failed");
            }
        }
        
        escrow.status = EscrowStatus.Completed;
        escrow.releasedAmount = escrow.amount;
        
        emit EscrowCompleted(escrowId);
    }
    
    function cancelEscrow(uint256 escrowId) external {
        EscrowAgreement storage escrow = escrows[escrowId];
        require(msg.sender == escrow.payer, "Only payer can cancel");
        require(escrow.status == EscrowStatus.Active, "Escrow not active");
        require(escrow.releasedAmount == 0, "Cannot cancel after funds released");
        
        escrow.status = EscrowStatus.Cancelled;
        
        uint256 refundAmount = escrow.amount - escrow.releasedAmount;
        
        if (escrow.tokenAddress == address(0)) {
            payable(escrow.payer).transfer(refundAmount);
        } else {
            IERC20 token = IERC20(escrow.tokenAddress);
            require(token.transfer(escrow.payer, refundAmount), "Token refund failed");
        }
        
        emit EscrowCancelled(escrowId);
    }
    
    function getEscrow(uint256 escrowId) external view returns (EscrowAgreement memory) {
        return escrows[escrowId];
    }
    
    function getUserEscrows(address user) external view returns (uint256[] memory) {
        return userEscrows[user];
    }
    
    function setDisputeTimeWindow(uint256 newTimeWindow) external onlyOwner {
        disputeTimeWindow = newTimeWindow;
    }
}
