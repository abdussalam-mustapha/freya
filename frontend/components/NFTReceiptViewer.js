import { useState, useEffect } from 'react';
import { useAccount, useContractRead, useContractReads } from 'wagmi';
import { ethers } from 'ethers';

const INVOICE_NFT_ADDRESS = process.env.NEXT_PUBLIC_INVOICE_NFT_ADDRESS;
const INVOICE_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_INVOICE_MANAGER_ADDRESS;

const INVOICE_NFT_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "_user", "type": "address"}],
    "name": "getUserReceipts",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "_tokenId", "type": "uint256"}],
    "name": "getReceiptData",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "invoiceId", "type": "uint256"},
          {"internalType": "address", "name": "issuer", "type": "address"},
          {"internalType": "address", "name": "client", "type": "address"},
          {"internalType": "uint256", "name": "amount", "type": "uint256"},
          {"internalType": "uint256", "name": "paidDate", "type": "uint256"},
          {"internalType": "string", "name": "description", "type": "string"},
          {"internalType": "bool", "name": "exists", "type": "bool"}
        ],
        "internalType": "struct InvoiceNFT.InvoiceReceipt",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "tokenURI",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "ownerOf",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const formatEther = (value) => {
  try {
    if (!value) return '0';
    return parseFloat(ethers.utils.formatEther(value.toString())).toFixed(4);
  } catch {
    return '0';
  }
};

const formatDate = (timestamp) => {
  try {
    const date = new Date(parseInt(timestamp.toString()) * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Invalid Date';
  }
};

const truncateAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default function NFTReceiptViewer({ userRole = 'business', isOpen, onClose }) {
  const { address, isConnected } = useAccount();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Get user's NFT receipt token IDs
  const { data: userReceiptIds, refetch: refetchReceipts } = useContractRead({
    address: INVOICE_NFT_ADDRESS,
    abi: INVOICE_NFT_ABI,
    functionName: 'getUserReceipts',
    args: [address],
    enabled: isConnected && !!address && !!INVOICE_NFT_ADDRESS && isOpen,
    watch: true,
    cacheTime: 0,
  });

  // Prepare contract reads for individual receipt data
  const receiptReads = (userReceiptIds || []).map((tokenId) => ({
    address: INVOICE_NFT_ADDRESS,
    abi: INVOICE_NFT_ABI,
    functionName: 'getReceiptData',
    args: [tokenId],
  }));

  // Get receipt details
  const { data: receiptsData, refetch: refetchReceiptData } = useContractReads({
    contracts: receiptReads,
    enabled: isConnected && !!address && (userReceiptIds?.length > 0) && isOpen,
    watch: true,
    cacheTime: 0,
  });

  // Process receipt data
  useEffect(() => {
    if (receiptsData && userReceiptIds) {
      const processedReceipts = [];
      
      receiptsData.forEach((result, index) => {
        if (result.status === 'success' && result.result && result.result.exists) {
          const tokenId = userReceiptIds[index];
          const receiptData = result.result;
          
          const receipt = {
            tokenId: tokenId.toString(),
            invoiceId: receiptData.invoiceId.toString(),
            issuer: receiptData.issuer,
            client: receiptData.client,
            amount: receiptData.amount,
            paidDate: receiptData.paidDate,
            description: receiptData.description,
            exists: receiptData.exists
          };
          
          processedReceipts.push(receipt);
        }
      });
      
      setReceipts(processedReceipts);
      setLoading(false);
    } else if (userReceiptIds && userReceiptIds.length === 0) {
      setReceipts([]);
      setLoading(false);
    }
  }, [receiptsData, userReceiptIds]);

  // Auto-refresh data every 15 seconds
  useEffect(() => {
    if (!isConnected || !address || !isOpen) return;
    
    const interval = setInterval(() => {
      refetchReceipts?.();
    }, 15000);
    
    return () => clearInterval(interval);
  }, [isConnected, address, isOpen, refetchReceipts]);

  const handleViewReceipt = (receipt) => {
    setSelectedReceipt(receipt);
    setShowReceiptModal(true);
  };

  const downloadReceiptAsJSON = (receipt) => {
    const receiptData = {
      tokenId: receipt.tokenId,
      invoiceId: receipt.invoiceId,
      issuer: receipt.issuer,
      client: receipt.client,
      amount: formatEther(receipt.amount) + ' S',
      paidDate: formatDate(receipt.paidDate),
      description: receipt.description,
      blockchain: 'Sonic Testnet',
      platform: 'Freya Invoice Platform',
      type: 'Soulbound NFT Receipt',
      exportedAt: new Date().toISOString()
    };

    const dataStr = JSON.stringify(receiptData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `freya-receipt-${receipt.invoiceId}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              NFT Receipt Collection
            </h2>
            <p className="text-gray-400">
              Your soulbound invoice receipts - permanent proof of completed payments
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Receipts</p>
                <p className="text-white text-xl font-bold">{receipts.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg p-4 border border-green-500/20">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Value</p>
                <p className="text-white text-xl font-bold">
                  {receipts.reduce((sum, receipt) => sum + parseFloat(formatEther(receipt.amount)), 0).toFixed(4)} S
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-4 border border-purple-500/20">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Soulbound</p>
                <p className="text-white text-xl font-bold">✓</p>
              </div>
            </div>
          </div>
        </div>

        {/* Receipt Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-white">Loading NFT receipts...</span>
          </div>
        ) : receipts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No NFT Receipts Yet</h3>
            <p className="text-gray-400">
              NFT receipts are automatically minted when invoices are fully paid.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {receipts.map((receipt) => (
              <div key={receipt.tokenId} className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 hover:border-blue-500/50 transition-all">
                {/* NFT Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <span className="text-white font-semibold">Receipt #{receipt.invoiceId}</span>
                  </div>
                  <div className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-medium">
                    Soulbound
                  </div>
                </div>

                {/* Receipt Details */}
                <div className="space-y-3 mb-4">
                  <div>
                    <p className="text-gray-400 text-sm">Amount Paid</p>
                    <p className="text-white text-lg font-bold">{formatEther(receipt.amount)} S</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-400 text-sm">Payment Date</p>
                    <p className="text-white text-sm">{formatDate(receipt.paidDate)}</p>
                  </div>
                  
                  <div>
                    <p className="text-gray-400 text-sm">
                      {userRole === 'business' ? 'Client' : 'From'}
                    </p>
                    <p className="text-white text-sm font-mono">
                      {userRole === 'business' 
                        ? truncateAddress(receipt.client)
                        : truncateAddress(receipt.issuer)
                      }
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-gray-400 text-sm">Description</p>
                    <p className="text-white text-sm truncate">{receipt.description || 'No description'}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleViewReceipt(receipt)}
                    className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  >
                    View Details
                  </button>
                  <button 
                    onClick={() => downloadReceiptAsJSON(receipt)}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  >
                    Export
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Receipt Detail Modal */}
        {showReceiptModal && selectedReceipt && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60 p-4">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-600">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">NFT Receipt Details</h3>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Token ID</p>
                      <p className="text-white font-mono">#{selectedReceipt.tokenId}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Invoice ID</p>
                      <p className="text-white font-mono">#{selectedReceipt.invoiceId}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Amount</p>
                      <p className="text-white font-bold">{formatEther(selectedReceipt.amount)} S</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Date</p>
                      <p className="text-white">{formatDate(selectedReceipt.paidDate)}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <p className="text-gray-400 text-sm mb-2">Issuer</p>
                  <p className="text-white font-mono text-sm bg-gray-900 rounded px-3 py-2">
                    {selectedReceipt.issuer}
                  </p>
                </div>
                
                <div>
                  <p className="text-gray-400 text-sm mb-2">Client</p>
                  <p className="text-white font-mono text-sm bg-gray-900 rounded px-3 py-2">
                    {selectedReceipt.client}
                  </p>
                </div>
                
                <div>
                  <p className="text-gray-400 text-sm mb-2">Description</p>
                  <p className="text-white text-sm bg-gray-900 rounded px-3 py-2">
                    {selectedReceipt.description || 'No description provided'}
                  </p>
                </div>
                
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-purple-300 text-sm font-medium">Soulbound NFT - Non-transferable</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
