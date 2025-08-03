import { useState, useEffect } from 'react';
import { useAccount, useContractRead, useContractReads } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { ethers } from 'ethers';
import FreyaLogo from '../components/FreyaLogo';

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
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextInvoiceId",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
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

const getStatusColor = (status) => {
  switch (status) {
    case 'Paid': return 'text-green-400 bg-green-400/10';
    case 'Created': return 'text-yellow-400 bg-yellow-400/10';
    case 'Cancelled': return 'text-gray-400 bg-gray-400/10';
    case 'Disputed': return 'text-red-400 bg-red-400/10';
    default: return 'text-gray-400 bg-gray-400/10';
  }
};

const formatEther = (value) => {
  try {
    return parseFloat(ethers.utils.formatEther(value.toString())).toFixed(4);
  } catch {
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

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [stats, setStats] = useState({
    totalInvoices: 0,
    pendingAmount: 0,
    paidAmount: 0,
    overdueCount: 0
  });
  const [loading, setLoading] = useState(true);

  // Get user's invoice IDs
  const { data: userInvoiceIds, isError: userInvoicesError } = useContractRead({
    address: INVOICE_MANAGER_ADDRESS,
    abi: INVOICE_MANAGER_ABI,
    functionName: 'getUserInvoices',
    args: [address],
    enabled: isConnected && !!address && !!INVOICE_MANAGER_ADDRESS,
  });

  // Get total invoice count
  const { data: nextInvoiceId } = useContractRead({
    address: INVOICE_MANAGER_ADDRESS,
    abi: INVOICE_MANAGER_ABI,
    functionName: 'nextInvoiceId',
    enabled: !!INVOICE_MANAGER_ADDRESS,
  });

  // Prepare contract reads for individual invoices
  const invoiceReads = (userInvoiceIds || []).slice(0, 5).map((invoiceId) => ({
    address: INVOICE_MANAGER_ADDRESS,
    abi: INVOICE_MANAGER_ABI,
    functionName: 'getInvoice',
    args: [invoiceId],
  }));

  // Get invoice details
  const { data: invoicesData, isLoading: invoicesLoading } = useContractReads({
    contracts: invoiceReads,
    enabled: isConnected && !!address && !!INVOICE_MANAGER_ADDRESS && (userInvoiceIds?.length > 0),
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Process invoice data when it changes
  useEffect(() => {
    if (invoicesData && userInvoiceIds) {
      const processedInvoices = [];
      let totalPaid = 0;
      let totalPending = 0;
      let overdueCount = 0;
      
      invoicesData.forEach((result, index) => {
        if (result.status === 'success' && result.result) {
          const [
            id, issuer, client, tokenAddress, amount, amountPaid, 
            dueDate, description, status, useEscrow, createdAt
          ] = result.result;
          
          const statusText = INVOICE_STATUS[status] || 'Unknown';
          const amountInEther = formatEther(amount);
          const dueDateObj = new Date(parseInt(dueDate.toString()) * 1000);
          const isOverdue = dueDateObj < new Date() && statusText !== 'Paid';
          
          if (isOverdue) overdueCount++;
          if (statusText === 'Paid') {
            totalPaid += parseFloat(amountInEther);
          } else if (statusText === 'Created') {
            totalPending += parseFloat(amountInEther);
          }
          
          processedInvoices.push({
            id: id.toString(),
            client: client,
            amount: amountInEther,
            status: isOverdue ? 'Overdue' : statusText,
            dueDate: dueDateObj,
            description: description,
            useEscrow
          });
        }
      });
      
      // Sort by most recent first
      processedInvoices.sort((a, b) => b.id - a.id);
      
      setRecentInvoices(processedInvoices.slice(0, 3));
      setStats({
        totalInvoices: userInvoiceIds.length,
        pendingAmount: totalPending,
        paidAmount: totalPaid,
        overdueCount
      });
      setLoading(false);
    } else if (userInvoiceIds && userInvoiceIds.length === 0) {
      // No invoices found
      setRecentInvoices([]);
      setStats({
        totalInvoices: 0,
        pendingAmount: 0,
        paidAmount: 0,
        overdueCount: 0
      });
      setLoading(false);
    }
  }, [invoicesData, userInvoiceIds]);

  if (!mounted) {
    return null;
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <FreyaLogo size="lg" className="mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h1>
          <p className="text-white/60 mb-8">Please connect your wallet to access your dashboard</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  const getStatusColorForDisplay = (status) => {
    switch (status) {
      case 'Paid': return 'text-green-400 bg-green-400/10';
      case 'Created': return 'text-yellow-400 bg-yellow-400/10';
      case 'Overdue': return 'text-red-400 bg-red-400/10';
      case 'Cancelled': return 'text-gray-400 bg-gray-400/10';
      case 'Disputed': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const formatAmount = (amount) => {
    return `${parseFloat(amount).toFixed(4)} ETH`;
  };

  const formatDateDisplay = (date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <FreyaLogo size="sm" showText={false} />
              <h1 className="text-xl font-bold text-white">Freya Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <nav className="hidden md:flex space-x-6">
                <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
                  Dashboard
                </Link>
                <Link href="/invoices" className="text-white/60 hover:text-white transition-colors">
                  Invoices
                </Link>
                <Link href="/analytics" className="text-white/60 hover:text-white transition-colors">
                  Analytics
                </Link>
                <Link href="/create" className="text-white/60 hover:text-white transition-colors">
                  Create
                </Link>
              </nav>
              <ConnectButton />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Welcome back! 👋
          </h2>
          <p className="text-white/60">
            Here's what's happening with your invoices today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Invoices */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium">Total Invoices</p>
                {loading ? (
                  <div className="w-16 h-8 bg-white/10 rounded animate-pulse"></div>
                ) : (
                  <p className="text-3xl font-bold text-white">{stats.totalInvoices}</p>
                )}
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Pending Amount */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium">Pending Amount</p>
                {loading ? (
                  <div className="w-20 h-8 bg-white/10 rounded animate-pulse"></div>
                ) : (
                  <p className="text-3xl font-bold text-yellow-400">{stats.pendingAmount.toFixed(4)} ETH</p>
                )}
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          {/* Paid Amount */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium">Paid Amount</p>
                {loading ? (
                  <div className="w-20 h-8 bg-white/10 rounded animate-pulse"></div>
                ) : (
                  <p className="text-3xl font-bold text-green-400">{stats.paidAmount.toFixed(4)} ETH</p>
                )}
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Overdue Count */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium">Overdue</p>
                {loading ? (
                  <div className="w-12 h-8 bg-white/10 rounded animate-pulse"></div>
                ) : (
                  <p className="text-3xl font-bold text-red-400">{stats.overdueCount}</p>
                )}
              </div>
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Invoices */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Recent Invoices</h3>
                  <Link href="/invoices" className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                    View All
                  </Link>
                </div>
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-white/10 rounded-lg animate-pulse"></div>
                          <div>
                            <div className="w-32 h-4 bg-white/10 rounded animate-pulse mb-2"></div>
                            <div className="w-24 h-3 bg-white/10 rounded animate-pulse"></div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="w-16 h-4 bg-white/10 rounded animate-pulse mb-2"></div>
                          <div className="w-12 h-6 bg-white/10 rounded-full animate-pulse"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentInvoices.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">No invoices yet</h3>
                    <p className="text-white/60 mb-4">Create your first invoice to get started</p>
                    <Link href="/create" className="inline-flex bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-xl font-medium hover:from-blue-600 hover:to-purple-600 transition-all">
                      Create Invoice
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentInvoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">
                              #{invoice.id}
                            </div>
                            <div>
                              <p className="text-white font-medium">{invoice.description}</p>
                              <p className="text-white/60 text-sm">{invoice.client.slice(0, 10)}...</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold">{formatAmount(invoice.amount)}</p>
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColorForDisplay(invoice.status)}`}>
                            {invoice.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            {/* Create Invoice */}
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/20">
              <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link href="/create" className="block w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-purple-600 transition-all text-center">
                  Create New Invoice
                </Link>
                <Link href="/invoices" className="block w-full bg-white/10 text-white px-4 py-3 rounded-xl font-medium hover:bg-white/20 transition-all text-center">
                  View All Invoices
                </Link>
                <Link href="/analytics" className="block w-full bg-white/10 text-white px-4 py-3 rounded-xl font-medium hover:bg-white/20 transition-all text-center">
                  View Analytics
                </Link>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
              <div className="p-6 border-b border-white/10">
                <h3 className="text-lg font-bold text-white">Recent Activity</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <div>
                      <p className="text-white text-sm">Invoice #1 was paid</p>
                      <p className="text-white/60 text-xs">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <div>
                      <p className="text-white text-sm">New invoice created</p>
                      <p className="text-white/60 text-xs">1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <div>
                      <p className="text-white text-sm">Payment reminder sent</p>
                      <p className="text-white/60 text-xs">2 days ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
