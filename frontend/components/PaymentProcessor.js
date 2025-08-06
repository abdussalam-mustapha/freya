import React, { useState } from 'react';
import { ethers } from 'ethers';

const PaymentProcessor = ({ invoice, isOpen, onClose, onSuccess }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const INVOICE_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_INVOICE_MANAGER_ADDRESS;
  const INVOICE_MANAGER_ABI = [
    {
      "inputs": [{"internalType": "uint256", "name": "invoiceId", "type": "uint256"}],
      "name": "payInvoice",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    }
  ];

  const handlePayment = async () => {
    if (!invoice) return;
    
    setIsProcessing(true);
    setError('');

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();
      
      // Calculate remaining amount to pay
      const remainingAmount = ethers.BigNumber.from(invoice.amount).sub(ethers.BigNumber.from(invoice.amountPaid || 0));
      
      // Check user's balance
      const userBalance = await provider.getBalance(userAddress);
      
      console.log('Payment validation:', {
        userAddress,
        userBalance: ethers.utils.formatEther(userBalance),
        requiredAmount: ethers.utils.formatEther(remainingAmount),
        hasEnoughBalance: userBalance.gte(remainingAmount)
      });
      
      // Check if user has enough balance
      if (userBalance.lt(remainingAmount)) {
        setError(`Insufficient balance. You need ${ethers.utils.formatEther(remainingAmount)} S tokens but only have ${ethers.utils.formatEther(userBalance)} S tokens.`);
        return;
      }
      
      const contract = new ethers.Contract(INVOICE_MANAGER_ADDRESS, INVOICE_MANAGER_ABI, signer);
      
      // Convert invoice ID to proper format for contract call
      const invoiceId = ethers.BigNumber.from(invoice.id);
      
      console.log('Proceeding with payment:', {
        invoiceId: invoiceId.toString(),
        remainingAmount: ethers.utils.formatEther(remainingAmount),
        contractAddress: INVOICE_MANAGER_ADDRESS
      });
      
      // Pay the full remaining amount
      const tx = await contract.payInvoice(invoiceId, {
        value: remainingAmount
      });

      await tx.wait();
      
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Payment error:', err);
      
      // Parse common blockchain errors for user-friendly messages
      let errorMessage = 'Payment failed';
      
      if (err.message) {
        if (err.message.includes('insufficient balance') || 
            (err.data && err.data.message && err.data.message.includes('insufficient balance'))) {
          errorMessage = 'Insufficient balance to complete payment. Please add more S tokens to your wallet.';
        } else if (err.message.includes('user rejected') || err.message.includes('User denied')) {
          errorMessage = 'Payment cancelled by user.';
        } else if (err.message.includes('gas')) {
          errorMessage = 'Transaction failed due to gas issues. Please try again.';
        } else if (err.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatEther = (value) => {
    try {
      if (!value) return '0';
      // Handle BigNumber objects
      if (typeof value === 'object' && value._hex) {
        return ethers.utils.formatEther(value);
      }
      // Handle string or number values
      return ethers.utils.formatEther(value.toString());
    } catch (error) {
      console.error('Error formatting ether value:', error, value);
      return '0';
    }
  };

  const getRemainingAmount = () => {
    try {
      if (!invoice || !invoice.amount) return '0';
      
      // Safely handle BigNumber conversion
      const total = ethers.BigNumber.from(invoice.amount);
      const paid = ethers.BigNumber.from(invoice.amountPaid || 0);
      const remaining = total.sub(paid);
      
      // Ensure we return a formatted string
      return formatEther(remaining);
    } catch (error) {
      console.error('Error calculating remaining amount:', error);
      return '0';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">Process Payment</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {invoice && (
          <div className="mb-6">
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <p className="text-gray-300 text-sm">Invoice #{invoice.id?.toString() || 'N/A'}</p>
              <p className="text-white font-semibold">{invoice.description || 'No description'}</p>
              <p className="text-gray-300 text-sm">
                Total: {formatEther(invoice.amount)} ETH
              </p>
              <p className="text-gray-300 text-sm">
                Paid: {formatEther(invoice.amountPaid || 0)} ETH
              </p>
              <p className="text-green-400 font-semibold">
                Remaining: {getRemainingAmount()} ETH
              </p>
            </div>

            <div className="mb-4">
              <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-3">
                <h4 className="text-blue-300 font-semibold mb-2">Payment Information</h4>
                <p className="text-blue-200 text-sm mb-2">
                  You will pay the full remaining amount: <strong>{getRemainingAmount()} ETH</strong>
                </p>
                <p className="text-blue-200 text-xs">
                  Note: The current contract only supports full payment. Milestone payments will be available in future versions.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded text-red-200 text-sm">
                {error}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Pay Now'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentProcessor;
