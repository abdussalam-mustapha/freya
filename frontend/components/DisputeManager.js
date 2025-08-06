import React, { useState } from 'react';
import { ethers } from 'ethers';

const DisputeManager = ({ invoice, isOpen, onClose, onSuccess }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [error, setError] = useState('');

  const INVOICE_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_INVOICE_MANAGER_ADDRESS;
  const INVOICE_MANAGER_ABI = [
    "function disputeInvoice(uint256 invoiceId, string memory reason) external"
  ];

  const disputeReasons = [
    'Work not completed',
    'Poor quality of work',
    'Missed deadline',
    'Scope changed without agreement',
    'Overcharged amount',
    'Services not as described',
    'Other'
  ];

  const handleDispute = async () => {
    if (!invoice || !disputeReason) return;
    
    setIsProcessing(true);
    setError('');

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(INVOICE_MANAGER_ADDRESS, INVOICE_MANAGER_ABI, signer);

      const fullReason = disputeDescription 
        ? `${disputeReason}: ${disputeDescription}`
        : disputeReason;

      const tx = await contract.disputeInvoice(invoice.id, fullReason);
      await tx.wait();
      
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Dispute error:', err);
      setError(err.message || 'Failed to submit dispute');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">Raise Dispute</h3>
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
                Amount: {formatEther(invoice.amount)} ETH
              </p>
              <p className="text-gray-300 text-sm">
                Issuer: {invoice.issuer || 'Unknown'}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Dispute Reason *
              </label>
              <select
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select a reason...</option>
                {disputeReasons.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Additional Details (Optional)
              </label>
              <textarea
                value={disputeDescription}
                onChange={(e) => setDisputeDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Provide additional details about the dispute..."
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded text-red-200 text-sm">
                {error}
              </div>
            )}

            <div className="bg-yellow-900 border border-yellow-700 rounded p-3 mb-4">
              <p className="text-yellow-200 text-sm">
                ⚠️ <strong>Warning:</strong> Raising a dispute will freeze this invoice until resolved. 
                Make sure you have valid reasons for the dispute.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDispute}
                disabled={isProcessing || !disputeReason}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? 'Submitting...' : 'Submit Dispute'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DisputeManager;
