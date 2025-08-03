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
  }
];

const INVOICE_STATUS = {
  0: 'Created',
  1: 'Paid',
  2: 'Cancelled',
  3: 'Disputed'
};

const formatEther = (value) => {
  try {
    return parseFloat(ethers.utils.formatEther(value.toString()));
  } catch {
    return 0;
  }
};

export default function Analytics() {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    totalInvoices: 0,
    averageInvoiceValue: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    avgPaymentTime: {
      days: 0,
      improvement: 0
    },
    revenueGrowth: 0,
    invoiceGrowth: 0,
    topClients: [],
    revenueData: []
  });

  // Get user's invoice IDs with refetch capability
  const { data: userInvoiceIds, refetch: refetchUserInvoices } = useContractRead({
    address: INVOICE_MANAGER_ADDRESS,
    abi: INVOICE_MANAGER_ABI,
    functionName: 'getUserInvoices',
    args: [address],
    enabled: isConnected && !!address && !!INVOICE_MANAGER_ADDRESS,
    watch: true, // Watch for changes
    cacheTime: 0, // Disable caching
  });

  // Prepare contract reads for individual invoices
  const invoiceReads = (userInvoiceIds || []).map((invoiceId) => ({
    address: INVOICE_MANAGER_ADDRESS,
    abi: INVOICE_MANAGER_ABI,
    functionName: 'getInvoice',
    args: [invoiceId],
  }));

  // Get invoice details with refetch capability
  const { data: invoicesData, refetch: refetchInvoices } = useContractReads({
    contracts: invoiceReads,
    enabled: isConnected && !!address && !!INVOICE_MANAGER_ADDRESS && (userInvoiceIds?.length > 0),
    watch: true, // Watch for changes
    cacheTime: 0, // Disable caching
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

  // Refetch when user navigates back to analytics page
  useEffect(() => {
    const handleFocus = () => {
      if (isConnected && address) {
        refetchUserInvoices?.();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isConnected, address, refetchUserInvoices]);

  useEffect(() => {
    if (userInvoiceIds?.length > 0) {
      refetchInvoices?.();
    }
  }, [userInvoiceIds, refetchInvoices]);

  useEffect(() => {
    if (invoicesData && userInvoiceIds) {
      const processedInvoices = [];
      const clientMap = new Map();
      
      invoicesData.forEach((result) => {
        if (result.status === 'success' && result.result) {
          const [
            id, issuer, client, tokenAddress, amount, amountPaid, 
            dueDate, description, status, useEscrow, createdAt
          ] = result.result;
          
          const statusText = INVOICE_STATUS[status] || 'Unknown';
          const amountInEther = formatEther(amount);
          const dueDateObj = new Date(parseInt(dueDate.toString()) * 1000);
          const isOverdue = dueDateObj < new Date() && statusText !== 'Paid';
          const finalStatus = isOverdue ? 'Overdue' : statusText;
          
          processedInvoices.push({
            id: id.toString(),
            client,
            amount: amountInEther,
            status: finalStatus,
            dueDate: dueDateObj,
            createdAt: new Date(parseInt(createdAt.toString()) * 1000)
          });
          
          // Track clients
          const clientKey = client.toLowerCase();
          if (!clientMap.has(clientKey)) {
            clientMap.set(clientKey, {
              name: `Client ${client.slice(0, 6)}...${client.slice(-4)}`,
              revenue: 0,
              invoices: 0
            });
          }
          const clientData = clientMap.get(clientKey);
          clientData.invoices += 1;
          if (finalStatus === 'Paid') {
            clientData.revenue += amountInEther;
          }
        }
      });
      
      // Calculate analytics
      const totalInvoices = processedInvoices.length;
      const paidInvoices = processedInvoices.filter(inv => inv.status === 'Paid').length;
      const pendingInvoices = processedInvoices.filter(inv => inv.status === 'Created').length;
      const overdueInvoices = processedInvoices.filter(inv => inv.status === 'Overdue').length;
      const totalRevenue = processedInvoices
        .filter(inv => inv.status === 'Paid')
        .reduce((sum, inv) => sum + inv.amount, 0);
      const averageInvoiceValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;
      
      // Calculate average payment time for paid invoices
      const paidInvoicesWithTime = processedInvoices.filter(inv => inv.status === 'Paid');
      const avgPaymentTime = paidInvoicesWithTime.length > 0 
        ? paidInvoicesWithTime.reduce((sum, inv) => {
            const daysDiff = Math.ceil((inv.dueDate - inv.createdAt) / (1000 * 60 * 60 * 24));
            return sum + Math.max(daysDiff, 0);
          }, 0) / paidInvoicesWithTime.length
        : 0;
      
      // Generate revenue data by month
      const revenueByMonth = {};
      processedInvoices.filter(inv => inv.status === 'Paid').forEach(inv => {
        const monthKey = inv.createdAt.toLocaleDateString('en-US', { month: 'short' });
        if (!revenueByMonth[monthKey]) {
          revenueByMonth[monthKey] = 0;
        }
        revenueByMonth[monthKey] += inv.amount;
      });
      
      const revenueData = Object.entries(revenueByMonth).map(([month, revenue]) => ({
        month,
        revenue
      }));
      
      // Top clients
      const topClients = Array.from(clientMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 4);
      
      setAnalytics({
        totalRevenue,
        totalInvoices,
        averageInvoiceValue,
        paidInvoices,
        pendingInvoices,
        overdueInvoices,
        avgPaymentTime: {
          days: avgPaymentTime,
          improvement: 0 // Would need historical data to calculate improvement
        },
        revenueGrowth: 0, // Would need historical data
        invoiceGrowth: 0, // Would need historical data
        topClients,
        revenueData
      });
      setLoading(false);
    } else if (userInvoiceIds && userInvoiceIds.length === 0) {
      setAnalytics({
        totalRevenue: 0,
        totalInvoices: 0,
        averageInvoiceValue: 0,
        paidInvoices: 0,
        pendingInvoices: 0,
        overdueInvoices: 0,
        avgPaymentTime: {
          days: 0,
          improvement: 0
        },
        revenueGrowth: 0,
        invoiceGrowth: 0,
        topClients: [],
        revenueData: []
      });
      setLoading(false);
    }
  }, [invoicesData]);

  if (!mounted) {
    return null;
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <FreyaLogo size="lg" className="mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h1>
          <p className="text-white/60 mb-8">Please connect your wallet to view analytics</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <FreyaLogo size="sm" showText={false} />
              <h1 className="text-xl font-bold text-white">Freya Analytics</h1>
            </div>
            <div className="flex items-center space-x-4">
              <nav className="hidden md:flex space-x-6">
                <Link href="/dashboard" className="text-white/60 hover:text-white transition-colors">
                  Dashboard
                </Link>
                <Link href="/invoices" className="text-white/60 hover:text-white transition-colors">
                  Invoices
                </Link>
                <Link href="/analytics" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
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
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Business Analytics</h2>
            <p className="text-white/60">Track your performance and growth metrics</p>
          </div>
          <div className="mt-4 md:mt-0">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Revenue */}
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl rounded-2xl p-6 border border-green-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <span className={`text-sm font-medium px-2 py-1 rounded-full ${analytics.revenueGrowth >= 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                {formatPercentage(analytics.revenueGrowth)}
              </span>
            </div>
            {loading ? (
              <div className="w-20 h-6 bg-white/10 rounded animate-pulse"></div>
            ) : (
              <p className="text-3xl font-bold text-white">{formatCurrency(analytics.totalRevenue)}</p>
            )}
            <div className="text-white/60 text-sm">Total Revenue</div>
          </div>

          {/* Total Invoices */}
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className={`text-sm font-medium px-2 py-1 rounded-full ${analytics.invoiceGrowth >= 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                {formatPercentage(analytics.invoiceGrowth)}
              </span>
            </div>
            {loading ? (
              <div className="w-20 h-6 bg-white/10 rounded animate-pulse"></div>
            ) : (
              <p className="text-3xl font-bold text-white">{analytics.totalInvoices}</p>
            )}
            <div className="text-white/60 text-sm">Total Invoices</div>
          </div>

          {/* Active Clients */}
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className={`text-sm font-medium px-2 py-1 rounded-full ${analytics.invoiceGrowth >= 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                {formatPercentage(analytics.invoiceGrowth)}
              </span>
            </div>
            {loading ? (
              <div className="w-20 h-6 bg-white/10 rounded animate-pulse"></div>
            ) : (
              <p className="text-3xl font-bold text-white">{analytics.topClients.length}</p>
            )}
            <div className="text-white/60 text-sm">Active Clients</div>
          </div>

          {/* Avg Payment Time */}
          <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-xl rounded-2xl p-6 border border-orange-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className={`text-sm font-medium px-2 py-1 rounded-full ${analytics.avgPaymentTime.improvement <= 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                {formatPercentage(analytics.avgPaymentTime.improvement)}
              </span>
            </div>
            {loading ? (
              <div className="w-16 h-8 bg-white/10 rounded animate-pulse mb-1"></div>
            ) : (
              <div className="text-3xl font-bold text-white mb-1">{analytics.avgPaymentTime.days.toFixed(1)}d</div>
            )}
            <div className="text-white/60 text-sm">Avg Payment Time</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-xl font-bold text-white">Revenue Trend</h3>
              <p className="text-white/60 text-sm">Monthly revenue over time</p>
            </div>
            <div className="p-6">
              <div className="h-64 flex items-end justify-between space-x-2">
                {loading ? (
                  <div className="flex items-end justify-between space-x-2 h-64">
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div className="w-full bg-white/10 rounded-t-lg mb-2 animate-pulse" style={{ height: `${Math.random() * 150 + 50}px` }}></div>
                        <div className="w-8 h-3 bg-white/10 rounded animate-pulse mb-1"></div>
                        <div className="w-12 h-3 bg-white/10 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                ) : analytics.revenueData && analytics.revenueData.length > 0 ? (
                  analytics.revenueData.map((data, index) => (
                    <div key={data.month || index} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-gradient-to-t from-blue-500 to-cyan-500 rounded-t-lg mb-2 transition-all hover:from-blue-400 hover:to-cyan-400"
                        style={{ height: `${(data.revenue / Math.max(...analytics.revenueData.map(d => d.revenue))) * 200}px` }}
                      ></div>
                      <div className="text-white/60 text-xs">{data.month}</div>
                      <div className="text-white text-xs font-medium">{formatCurrency(data.revenue)}</div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-64 w-full">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <p className="text-white/60 text-sm">No revenue data available</p>
                      <p className="text-white/40 text-xs mt-1">Create and complete invoices to see trends</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Invoice Status Breakdown */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-xl font-bold text-white">Invoice Status</h3>
              <p className="text-white/60 text-sm">Current invoice breakdown</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-green-400 rounded-full"></div>
                    <span className="text-white">Paid</span>
                  </div>
                  <div className="text-right">
                    {loading ? (
                      <div className="w-8 h-4 bg-white/10 rounded animate-pulse mb-1"></div>
                    ) : (
                      <div className="text-white font-bold">{analytics.paidInvoices}</div>
                    )}
                    {loading ? (
                      <div className="w-12 h-3 bg-white/10 rounded animate-pulse"></div>
                    ) : (
                      <div className="text-white/60 text-sm">{analytics.totalInvoices > 0 ? ((analytics.paidInvoices / analytics.totalInvoices) * 100).toFixed(1) : 0}%</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
                    <span className="text-white">Pending</span>
                  </div>
                  <div className="text-right">
                    {loading ? (
                      <div className="w-8 h-4 bg-white/10 rounded animate-pulse mb-1"></div>
                    ) : (
                      <div className="text-white font-bold">{analytics.pendingInvoices}</div>
                    )}
                    {loading ? (
                      <div className="w-12 h-3 bg-white/10 rounded animate-pulse"></div>
                    ) : (
                      <div className="text-white/60 text-sm">{analytics.totalInvoices > 0 ? ((analytics.pendingInvoices / analytics.totalInvoices) * 100).toFixed(1) : 0}%</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-red-400 rounded-full"></div>
                    <span className="text-white">Overdue</span>
                  </div>
                  <div className="text-right">
                    {loading ? (
                      <div className="w-8 h-4 bg-white/10 rounded animate-pulse mb-1"></div>
                    ) : (
                      <div className="text-white font-bold">{analytics.overdueInvoices}</div>
                    )}
                    {loading ? (
                      <div className="w-12 h-3 bg-white/10 rounded animate-pulse"></div>
                    ) : (
                      <div className="text-white/60 text-sm">{analytics.totalInvoices > 0 ? ((analytics.overdueInvoices / analytics.totalInvoices) * 100).toFixed(1) : 0}%</div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Visual Progress Bars */}
              <div className="mt-6 space-y-3">
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-green-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${analytics.totalInvoices > 0 ? (analytics.paidInvoices / analytics.totalInvoices) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-yellow-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${analytics.totalInvoices > 0 ? (analytics.pendingInvoices / analytics.totalInvoices) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-red-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${analytics.totalInvoices > 0 ? (analytics.overdueInvoices / analytics.totalInvoices) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Clients */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Top Clients</h3>
                <p className="text-white/60 text-sm">Your highest value clients</p>
              </div>
              <Link href="/invoices" className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                View All
              </Link>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {analytics.topClients.map((client, index) => (
                <div key={client.name} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-white font-medium">{client.name}</div>
                      <div className="text-white/60 text-sm">{client.invoices} invoices</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold">{formatCurrency(client.amount)}</div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-green-400 text-sm capitalize">{client.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Additional Insights */}
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur-xl rounded-2xl p-6 border border-indigo-500/20">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Growth Rate</h4>
            {loading ? (
              <div className="w-16 h-6 bg-white/10 rounded animate-pulse mb-1"></div>
            ) : (
              <div className="text-2xl font-bold text-indigo-400 mb-1">+{analytics.revenueGrowth.toFixed(1)}%</div>
            )}
            <p className="text-white/60 text-sm">Month over month revenue growth</p>
          </div>

          <div className="bg-gradient-to-br from-teal-500/10 to-cyan-500/10 backdrop-blur-xl rounded-2xl p-6 border border-teal-500/20">
            <div className="w-12 h-12 bg-teal-500/20 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Collection Rate</h4>
            {loading ? (
              <div className="w-16 h-6 bg-white/10 rounded animate-pulse mb-1"></div>
            ) : (
              <div className="text-2xl font-bold text-teal-400 mb-1">{analytics.totalInvoices > 0 ? ((analytics.paidInvoices / analytics.totalInvoices) * 100).toFixed(1) : 0}%</div>
            )}
            <p className="text-white/60 text-sm">Invoices successfully collected</p>
          </div>

          <div className="bg-gradient-to-br from-rose-500/10 to-pink-500/10 backdrop-blur-xl rounded-2xl p-6 border border-rose-500/20">
            <div className="w-12 h-12 bg-rose-500/20 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Avg Invoice</h4>
            {loading ? (
              <div className="w-20 h-6 bg-white/10 rounded animate-pulse mb-1"></div>
            ) : (
              <div className="text-2xl font-bold text-rose-400 mb-1">{formatCurrency(analytics.averageInvoiceValue)}</div>
            )}
            <p className="text-white/60 text-sm">Average invoice amount</p>
          </div>
        </div>
      </div>
    </div>
  );
}
