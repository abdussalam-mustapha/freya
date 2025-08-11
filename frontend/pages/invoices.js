import { useState, useEffect } from 'react';
import { useAccount, useContractRead, useContractReads } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ethers } from 'ethers';
import FreyaLogo from '../components/FreyaLogo';
import NotificationSystem from '../components/NotificationSystem';
import InvoiceViewer from '../components/InvoiceViewer';

const INVOICE_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_INVOICE_MANAGER_ADDRESS;
const INVOICE_MANAGER_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getUserInvoices",
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
  }
];

// Invoice status mapping
const INVOICE_STATUS = {
  0: 'Created',
  1: 'Paid',
  2: 'Cancelled',
  3: 'Disputed'
};

const formatEther = (value) => {
  try {
    // Handle both BigInt and regular numbers from Wagmi/Viem
    if (typeof value === 'bigint') {
      return parseFloat(ethers.utils.formatEther(value.toString())).toFixed(4);
    }
    return parseFloat(ethers.utils.formatEther(value.toString())).toFixed(4);
  } catch (error) {
    console.warn('formatEther error:', error, 'value:', value);
    return '0.0000';
  }
};

export default function Invoices() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceViewer, setShowInvoiceViewer] = useState(false);

  // Get user's invoice IDs with refetch capability
  const { data: userInvoiceIds, isError: userInvoicesError, refetch: refetchUserInvoices } = useContractRead({
    address: INVOICE_MANAGER_ADDRESS,
    abi: INVOICE_MANAGER_ABI,
    functionName: 'getUserInvoices',
    args: [address],
    enabled: isConnected && !!address && !!INVOICE_MANAGER_ADDRESS,
    watch: true, // Watch for changes
    cacheTime: 0, // Disable caching
    queryKey: ['userInvoices', address], // Add query key for cache invalidation
  });

  // Prepare contract reads for individual invoices
  const invoiceReads = (userInvoiceIds || []).map((invoiceId) => ({
    address: INVOICE_MANAGER_ADDRESS,
    abi: INVOICE_MANAGER_ABI,
    functionName: 'getInvoice',
    args: [invoiceId],
  }));

  // Get invoice details with refetch capability
  const { data: invoicesData, isLoading: invoicesLoading, refetch: refetchInvoices } = useContractReads({
    contracts: invoiceReads,
    enabled: isConnected && !!address && !!INVOICE_MANAGER_ADDRESS && (userInvoiceIds?.length > 0),
    watch: true, // Watch for changes
    cacheTime: 0, // Disable caching
    queryKey: ['invoices', address], // Add query key for cache invalidation
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Refetch data every 10 seconds to catch new invoices
  useEffect(() => {
    if (!isConnected || !address) return;
    
    const interval = setInterval(() => {
      refetchUserInvoices?.();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [isConnected, address, refetchUserInvoices]);

  // Refetch when user navigates back to invoices page
  useEffect(() => {
    const handleFocus = () => {
      if (isConnected && address) {
        refetchUserInvoices?.();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isConnected, address, refetchUserInvoices]);

  // Refetch invoice details when userInvoiceIds change
  useEffect(() => {
    if (userInvoiceIds?.length > 0) {
      refetchInvoices?.();
    }
  }, [userInvoiceIds, refetchInvoices]);

  // Process invoice data when it changes
  useEffect(() => {
    if (invoicesData && userInvoiceIds) {
      const processedInvoices = [];
      
      invoicesData.forEach((result, index) => {
        if (result.status === 'success' && result.result) {
          // Handle struct return format from getInvoice
          const invoice = result.result;
          const {
            id, issuer, client, tokenAddress, amount, amountPaid,
            dueDate, description, status, useEscrow, createdAt
          } = invoice;
          
          // Convert BigInt values safely
          const statusText = INVOICE_STATUS[Number(status)] || 'Unknown';
          const amountInEther = formatEther(amount);
          const dueDateObj = new Date(Number(dueDate) * 1000);
          const createdAtObj = new Date(parseInt(createdAt.toString()) * 1000);
          const isOverdue = dueDateObj < new Date() && statusText !== 'Paid';
          
          processedInvoices.push({
            id: id.toString(),
            client: client,
            clientName: `Client ${client.slice(0, 6)}...${client.slice(-4)}`,
            amount: amountInEther,
            status: isOverdue ? 'Overdue' : statusText,
            dueDate: dueDateObj,
            createdAt: createdAtObj,
            description: description,
            useEscrow
          });
        }
      });
      
      setInvoices(processedInvoices);
      setFilteredInvoices(processedInvoices);
      setLoading(false);
    } else if (userInvoiceIds && userInvoiceIds.length === 0) {
      // No invoices found
      setInvoices([]);
      setFilteredInvoices([]);
      setLoading(false);
    } else if (userInvoiceIds === undefined && !userInvoicesError) {
      // Still loading
      setLoading(true);
    }
  }, [invoicesData, userInvoiceIds, userInvoicesError]);

  // Refresh data when navigating to invoices page
  useEffect(() => {
    const handleRouteChange = () => {
      if (isConnected && address) {
        setTimeout(() => {
          refetchUserInvoices?.();
        }, 100);
      }
    };
    
    router.events.on('routeChangeComplete', handleRouteChange);
    
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [isConnected, address, refetchUserInvoices, router.events]);

  // Filter and search functionality
  useEffect(() => {
    let filtered = invoices;

    // Filter by status
    if (statusFilter !== 'All') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(invoice => 
        invoice.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.id.toString().includes(searchTerm)
      );
    }

    // Sort invoices
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'amount-high':
          return parseFloat(b.amount) - parseFloat(a.amount);
        case 'amount-low':
          return parseFloat(a.amount) - parseFloat(b.amount);
        case 'due-date':
          return new Date(a.dueDate) - new Date(b.dueDate);
        default:
          return 0;
      }
    });

    setFilteredInvoices(filtered);
  }, [invoices, searchTerm, statusFilter, sortBy]);

  // Handler for viewing invoice details
  const handleViewInvoice = (invoice) => {
    console.log('handleViewInvoice called with:', invoice);
    setSelectedInvoice(invoice);
    setShowInvoiceViewer(true);
  };

  // Handler for closing invoice viewer
  const handleCloseInvoiceViewer = () => {
    setShowInvoiceViewer(false);
    setSelectedInvoice(null);
  };

  if (!mounted) {
    return null;
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <FreyaLogo size="lg" className="mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h1>
          <p className="text-white/60 mb-8">Please connect your wallet to view your invoices</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid': return 'text-green-400 bg-green-400/10';
      case 'Created': return 'text-yellow-400 bg-yellow-400/10';
      case 'Overdue': return 'text-red-400 bg-red-400/10';
      case 'Cancelled': return 'text-gray-400 bg-gray-400/10';
      case 'Disputed': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const isOverdue = (dueDate, status) => {
    return status !== 'Paid' && new Date(dueDate) < new Date();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <FreyaLogo size="sm" showText={false} />

            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-4">
                <nav className="hidden md:flex space-x-6">
                  <Link href="/dashboard" className="text-white/60 hover:text-white transition-colors">
                    Business
                  </Link>
                  <Link href="/client-dashboard" className="text-white/60 hover:text-white transition-colors">
                    Client
                  </Link>
                  <Link href="/invoices" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
                    Invoices
                  </Link>
                  <Link href="/analytics" className="text-white/60 hover:text-white transition-colors">
                    Analytics
                  </Link>
                  <Link href="/create" className="text-white/60 hover:text-white transition-colors">
                    Create
                  </Link>
                </nav>
                <NotificationSystem 
                  onNotificationClick={(notification) => {
                    if (notification.type === 'view_all' || notification.invoiceId) {
                      router.push('/client-dashboard');
                    }
                  }}
                />
                <ConnectButton />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Your Invoices</h2>
            <p className="text-white/60">Manage and track all your invoices in one place</p>
          </div>
          <Link href="/create" className="mt-4 md:mt-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-purple-600 transition-all transform hover:scale-105">
            Create New Invoice
          </Link>
        </div>

        {/* Filters and Search */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-white/60 text-sm font-medium mb-2">Search Invoices</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by description, client, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg className="absolute right-3 top-3.5 w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-white/60 text-sm font-medium mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="All">All Status</option>
                <option value="Draft">Draft</option>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-white/60 text-sm font-medium mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="amount-high">Amount (High to Low)</option>
                <option value="amount-low">Amount (Low to High)</option>
                <option value="due-date">Due Date</option>
              </select>
            </div>
          </div>
        </div>

        {/* Invoices List */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
          {filteredInvoices.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No invoices found</h3>
              <p className="text-white/60 mb-6">
                {searchTerm || statusFilter !== 'All' ? 'Try adjusting your filters' : 'Create your first invoice to get started'}
              </p>
              <Link href="/create" className="inline-flex bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-purple-600 transition-all">
                Create Invoice
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Invoice</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Escrow</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-white/60 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold mr-3">
                            #{invoice.id}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{invoice.description}</div>
                            <div className="text-sm text-white/60">{formatDate(invoice.createdAt)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">{invoice.clientName}</div>
                        <div className="text-sm text-white/60">{invoice.client.slice(0, 10)}...</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-white">${invoice.amount}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                        {isOverdue(invoice.dueDate, invoice.status) && (
                          <div className="text-xs text-red-400 mt-1">Overdue</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">{formatDate(invoice.dueDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {invoice.useEscrow ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-green-400 bg-green-400/10">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-gray-400 bg-gray-400/10">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => handleViewInvoice(invoice)}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                            title="View Invoice Details"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button className="text-white/60 hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button className="text-white/60 hover:text-red-400 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {filteredInvoices.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
              <div className="text-2xl font-bold text-white">{filteredInvoices.length}</div>
              <div className="text-white/60 text-sm">Total Invoices</div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
              <div className="text-2xl font-bold text-green-400">
                ${filteredInvoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + parseFloat(i.amount), 0).toLocaleString()}
              </div>
              <div className="text-white/60 text-sm">Total Paid</div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
              <div className="text-2xl font-bold text-yellow-400">
                ${filteredInvoices.filter(i => i.status === 'Pending').reduce((sum, i) => sum + parseFloat(i.amount), 0).toLocaleString()}
              </div>
              <div className="text-white/60 text-sm">Pending</div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
              <div className="text-2xl font-bold text-red-400">
                {filteredInvoices.filter(i => isOverdue(i.dueDate, i.status)).length}
              </div>
              <div className="text-white/60 text-sm">Overdue</div>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Viewer Modal */}
      {showInvoiceViewer && selectedInvoice && (
        <InvoiceViewer
          invoice={selectedInvoice}
          isOpen={showInvoiceViewer}
          onClose={handleCloseInvoiceViewer}
        />
      )}
    </div>
  );
}
