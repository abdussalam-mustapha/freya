import { useState, useEffect } from 'react';
import { useAccount, useContractRead } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { ethers } from 'ethers';
import FreyaLogo from '../components/FreyaLogo';
import RoleBasedNavigation from '../components/RoleBasedNavigation';
import RoleBasedAccess from '../components/RoleBasedAccess';
import PaymentProcessor from '../components/PaymentProcessor';
import DisputeManager from '../components/DisputeManager';
import FeeMRevenueDashboard from '../components/FeeMIntegration';
import InvoiceStatusTracker from '../components/InvoiceStatusTracker';
import NFTReceiptViewer from '../components/NFTReceiptViewer';
import ComplianceExporter from '../components/ComplianceExporter';

const INVOICE_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_INVOICE_MANAGER_ADDRESS;
const INVOICE_MANAGER_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "client", "type": "address"}],
    "name": "getClientInvoices",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "invoiceId", "type": "uint256"}],
    "name": "getInvoice",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "id", "type": "uint256"},
          {"internalType": "address", "name": "issuer", "type": "address"},
          {"internalType": "address", "name": "client", "type": "address"},
          {"internalType": "address", "name": "tokenAddress", "type": "address"},
          {"internalType": "uint256", "name": "amount", "type": "uint256"},
          {"internalType": "uint256", "name": "amountPaid", "type": "uint256"},
          {"internalType": "uint256", "name": "dueDate", "type": "uint256"},
          {"internalType": "string", "name": "description", "type": "string"},
          {"internalType": "uint8", "name": "status", "type": "uint8"},
          {"internalType": "bool", "name": "useEscrow", "type": "bool"},
          {"internalType": "uint256", "name": "createdAt", "type": "uint256"}
        ],
        "internalType": "struct InvoiceManager.Invoice",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "invoiceId", "type": "uint256"}],
    "name": "payInvoice",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
];

// Invoice status mapping
const INVOICE_STATUS = {
  0: 'Pending Payment',
  1: 'Paid',
  2: 'Cancelled',
  3: 'Disputed'
};

const getStatusColor = (status) => {
  switch (status) {
    case 'Paid': return 'text-green-400 bg-green-400/10 border-green-400/20';
    case 'Pending Payment': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    case 'Cancelled': return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    case 'Disputed': return 'text-red-400 bg-red-400/10 border-red-400/20';
    default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
  }
};

const getPriorityColor = (dueDate) => {
  const now = Date.now();
  const due = parseInt(dueDate.toString()) * 1000;
  const daysUntilDue = (due - now) / (1000 * 60 * 60 * 24);
  
  if (daysUntilDue < 0) return 'text-red-400 bg-red-400/10'; // Overdue
  if (daysUntilDue < 3) return 'text-orange-400 bg-orange-400/10'; // Due soon
  if (daysUntilDue < 7) return 'text-yellow-400 bg-yellow-400/10'; // Due this week
  return 'text-blue-400 bg-blue-400/10'; // Normal
};

const formatEther = (value) => {
  try {
    if (typeof value === 'bigint') {
      return parseFloat(ethers.utils.formatEther(value.toString())).toFixed(4);
    }
    return parseFloat(ethers.utils.formatEther(value.toString())).toFixed(4);
  } catch (error) {
    console.warn('formatEther error:', error, 'value:', value);
    return '0.0000';
  }
};

const formatDate = (timestamp) => {
  try {
    return new Date(parseInt(timestamp.toString()) * 1000).toLocaleDateString();
  } catch {
    return 'Invalid Date';
  }
};

const truncateAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default function ClientDashboard() {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [clientInvoices, setClientInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPaymentProcessor, setShowPaymentProcessor] = useState(false);
  const [showDisputeManager, setShowDisputeManager] = useState(false);
  const [showFeeMDashboard, setShowFeeMDashboard] = useState(false);
  const [showStatusTracker, setShowStatusTracker] = useState(false);
  const [showNFTReceipts, setShowNFTReceipts] = useState(false);
  const [showComplianceExporter, setShowComplianceExporter] = useState(false);

  // Get client's invoice IDs
  const { data: clientInvoiceIds, isError: clientInvoicesError, refetch: refetchClientInvoices } = useContractRead({
    address: INVOICE_MANAGER_ADDRESS,
    abi: INVOICE_MANAGER_ABI,
    functionName: 'getClientInvoices',
    args: [address],
    enabled: isConnected && !!address && !!INVOICE_MANAGER_ADDRESS,
    watch: true,
    cacheTime: 0,
    queryKey: ['clientInvoices', address],
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchClientInvoices = async () => {
      if (!clientInvoiceIds || clientInvoiceIds.length === 0) {
        setClientInvoices([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const invoices = [];
      
      try {
        // Fetch real invoice data from smart contract
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const contract = new ethers.Contract(INVOICE_MANAGER_ADDRESS, INVOICE_MANAGER_ABI, provider);
        
        for (let i = 0; i < clientInvoiceIds.length; i++) {
          const invoiceId = clientInvoiceIds[i];
          try {
            // Fetch actual invoice data from the contract
            const invoiceData = await contract.getInvoice(invoiceId);
            
            invoices.push({
              id: invoiceData.id,
              issuer: invoiceData.issuer,
              client: invoiceData.client,
              tokenAddress: invoiceData.tokenAddress,
              amount: invoiceData.amount,
              amountPaid: invoiceData.amountPaid,
              dueDate: invoiceData.dueDate,
              description: invoiceData.description,
              status: invoiceData.status,
              useEscrow: invoiceData.useEscrow,
              createdAt: invoiceData.createdAt
            });
          } catch (error) {
            console.error(`Error fetching invoice ${invoiceId}:`, error);
            // Continue with other invoices even if one fails
          }
        }
        
        setClientInvoices(invoices);
        
        // Generate notifications for overdue and due soon invoices
        const newNotifications = [];
        invoices.forEach(invoice => {
          const dueDate = parseInt(invoice.dueDate.toString()) * 1000;
          const now = Date.now();
          const daysUntilDue = (dueDate - now) / (1000 * 60 * 60 * 24);
          
          if (invoice.status === 0) { // Pending payment
            if (daysUntilDue < 0) {
              newNotifications.push({
                id: `overdue-${invoice.id}`,
                type: 'error',
                title: 'Invoice Overdue',
                message: `Invoice #${invoice.id} is overdue by ${Math.abs(Math.floor(daysUntilDue))} days`,
                invoiceId: invoice.id
              });
            } else if (daysUntilDue < 3) {
              newNotifications.push({
                id: `due-soon-${invoice.id}`,
                type: 'warning',
                title: 'Invoice Due Soon',
                message: `Invoice #${invoice.id} is due in ${Math.floor(daysUntilDue)} days`,
                invoiceId: invoice.id
              });
            }
          }
        });
        
        setNotifications(newNotifications);
        
      } catch (error) {
        console.error('Error fetching client invoices:', error);
      } finally {
        setLoading(false);
      }
    };

    if (clientInvoiceIds) {
      fetchClientInvoices();
    }
  }, [clientInvoiceIds, address]);

  // Payment and dispute handlers
  const handlePayInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentProcessor(true);
  };

  const handleRaiseDispute = (invoice) => {
    setSelectedInvoice(invoice);
    setShowDisputeManager(true);
  };

  const handlePaymentSuccess = () => {
    // Refresh invoice data after successful payment
    if (clientInvoiceIds) {
      refetchClientInvoices();
    }
  };

  const handleDisputeSuccess = () => {
    // Refresh invoice data after successful dispute
    if (clientInvoiceIds) {
      refetchClientInvoices();
    }
  };

  if (!mounted) {
    return null;
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <FreyaLogo className="w-8 h-8" />

            </div>
          </div>
          
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 text-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h2>
              <p className="text-white/60 mb-6">Connect your wallet to view invoices sent to you</p>
              <ConnectButton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RoleBasedAccess allowedRoles={['client']}>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <FreyaLogo className="w-8 h-8" />

            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setShowStatusTracker(true)}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-600 transition-all text-sm"
              >
                📊 Payment History
              </button>
              <button 
                onClick={() => setShowNFTReceipts(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all text-sm"
              >
                🎨 NFT Receipts
              </button>
              <button 
                onClick={() => setShowComplianceExporter(true)}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium hover:from-orange-600 hover:to-red-600 transition-all text-sm"
              >
                📊 Export Report
              </button>
              <RoleBasedNavigation />
              <ConnectButton />
            </div>
          </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM12 17h.01M12 3v9a4 4 0 004 4h4" />
              </svg>
              Notifications
            </h2>
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-xl border ${
                    notification.type === 'error' 
                      ? 'bg-red-500/10 border-red-500/20 text-red-300'
                      : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{notification.title}</h3>
                      <p className="text-sm opacity-80">{notification.message}</p>
                    </div>
                    <button className="text-sm px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-all">
                      View Invoice
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Total Invoices</p>
                <p className="text-2xl font-bold text-white">{clientInvoices.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Pending Payment</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {clientInvoices.filter(inv => inv.status === 0).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Overdue</p>
                <p className="text-2xl font-bold text-red-400">
                  {clientInvoices.filter(inv => {
                    const dueDate = parseInt(inv.dueDate.toString()) * 1000;
                    return inv.status === 0 && dueDate < Date.now();
                  }).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Total Amount Due</p>
                <p className="text-2xl font-bold text-white">
                  {clientInvoices
                    .filter(inv => inv.status === 0)
                    .reduce((sum, inv) => sum + parseFloat(formatEther(inv.amount)), 0)
                    .toFixed(4)} ETH
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Invoices List */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <svg className="w-6 h-6 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Your Invoices
            </h2>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center space-x-2 text-white/60">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Loading invoices...</span>
                </div>
              </div>
            ) : clientInvoices.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No Invoices Found</h3>
                <p className="text-white/60">You don't have any invoices yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {clientInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="bg-white/5 rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white">Invoice #{invoice.id.toString()}</h3>
                          <p className="text-white/60 text-sm">From: {truncateAddress(invoice.issuer)}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(INVOICE_STATUS[invoice.status])}`}>
                          {INVOICE_STATUS[invoice.status]}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-white">{formatEther(invoice.amount)} ETH</p>
                        <p className="text-white/60 text-sm">Due: {formatDate(invoice.dueDate)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`px-2 py-1 rounded-lg text-xs ${getPriorityColor(invoice.dueDate)}`}>
                          {(() => {
                            const daysUntilDue = (parseInt(invoice.dueDate.toString()) * 1000 - Date.now()) / (1000 * 60 * 60 * 24);
                            if (daysUntilDue < 0) return `Overdue by ${Math.abs(Math.floor(daysUntilDue))} days`;
                            if (daysUntilDue < 1) return 'Due today';
                            return `Due in ${Math.floor(daysUntilDue)} days`;
                          })()}
                        </div>
                        {invoice.useEscrow && (
                          <div className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-xs">
                            Escrow Protected
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-all border border-white/20">
                          View Details
                        </button>
                        {invoice.status === 0 && (
                          <>
                            <button 
                              onClick={() => handlePayInvoice(invoice)}
                              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg text-sm font-medium transition-all"
                            >
                              Pay Now
                            </button>
                            <button 
                              onClick={() => handleRaiseDispute(invoice)}
                              className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-lg text-sm font-medium transition-all"
                            >
                              Raise Dispute
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-white/80 text-sm">{invoice.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Payment and Dispute Modals */}
      <PaymentProcessor
        invoice={selectedInvoice}
        isOpen={showPaymentProcessor}
        onClose={() => setShowPaymentProcessor(false)}
        onSuccess={handlePaymentSuccess}
      />
      
      <DisputeManager
        invoice={selectedInvoice}
        isOpen={showDisputeManager}
        onClose={() => setShowDisputeManager(false)}
        onSuccess={handleDisputeSuccess}
      />
      
      <FeeMRevenueDashboard
        isOpen={showFeeMDashboard}
        onClose={() => setShowFeeMDashboard(false)}
      />
      
      {/* Status Tracker Modal */}
      <InvoiceStatusTracker 
        userRole="client"
        isOpen={showStatusTracker}
        onClose={() => setShowStatusTracker(false)}
      />
      
      {/* NFT Receipt Viewer Modal */}
      <NFTReceiptViewer 
        userRole="client"
        isOpen={showNFTReceipts}
        onClose={() => setShowNFTReceipts(false)}
      />
      
      {/* Compliance Exporter Modal */}
      <ComplianceExporter 
        userRole="client"
        isOpen={showComplianceExporter}
        onClose={() => setShowComplianceExporter(false)}
      />
    </RoleBasedAccess>
  );
}
