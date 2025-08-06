import { useState, useEffect } from 'react';
import { useContractRead, useContractReads } from 'wagmi';
import { ethers } from 'ethers';

const INVOICE_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_INVOICE_MANAGER_ADDRESS;
const INVOICE_MANAGER_ABI = [
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

// Helper function to validate Ethereum addresses
const isValidAddress = (address) => {
  if (!address || typeof address !== 'string') return false;
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  return address.length === 42 && 
         address.startsWith('0x') && 
         address.toLowerCase() !== ZERO_ADDRESS.toLowerCase();
};

// Helper function to format address for display
const formatAddress = (address) => {
  if (!isValidAddress(address)) return 'Invalid Address';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default function UserAnalytics({ isOpen, onClose }) {
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    businessUsers: 0,
    clients: 0,
    activeUsers: 0,
    newUsersThisMonth: 0,
    userGrowthRate: 0,
    topBusinessUsers: [],
    topClients: [],
    userActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  // Get total invoice count to know how many invoices exist
  const { data: totalInvoiceCount } = useContractRead({
    address: INVOICE_MANAGER_ADDRESS,
    abi: [{
      "inputs": [],
      "name": "nextInvoiceId",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    }],
    functionName: 'nextInvoiceId',
    enabled: !!INVOICE_MANAGER_ADDRESS && isOpen,
  });

  // Only fetch invoices that actually exist (up to nextInvoiceId - 1)
  const actualInvoiceCount = totalInvoiceCount ? parseInt(totalInvoiceCount.toString()) - 1 : 0;
  const invoiceReads = actualInvoiceCount > 0 ? Array.from({ length: Math.min(actualInvoiceCount, 50) }, (_, i) => ({
    address: INVOICE_MANAGER_ADDRESS,
    abi: INVOICE_MANAGER_ABI,
    functionName: 'getInvoice',
    args: [i + 1],
  })) : [];

  const { data: allInvoicesData, refetch } = useContractReads({
    contracts: invoiceReads,
    enabled: !!INVOICE_MANAGER_ADDRESS && isOpen && actualInvoiceCount > 0,
    watch: false,
  });

  useEffect(() => {
    console.log('UserAnalytics Debug:', {
      isOpen,
      totalInvoiceCount: totalInvoiceCount?.toString(),
      actualInvoiceCount,
      allInvoicesData: allInvoicesData?.length,
      contractAddress: INVOICE_MANAGER_ADDRESS
    });
    
    if (allInvoicesData && isOpen) {
      analyzeUserData();
    } else if (isOpen && actualInvoiceCount === 0) {
      // No invoices exist yet
      setUserStats({
        totalUsers: 0,
        businessUsers: 0,
        clients: 0,
        activeUsers: 0,
        newUsersThisMonth: 0,
        userGrowthRate: 0,
        topBusinessUsers: [],
        topClients: [],
        userActivity: []
      });
      setLoading(false);
    }
  }, [allInvoicesData, isOpen, timeRange, totalInvoiceCount, actualInvoiceCount]);

  const analyzeUserData = () => {
    setLoading(true);
    
    const businessUsers = new Map();
    const clients = new Map();
    const allUsers = new Set();
    const currentDate = new Date();
    const timeRangeMs = getTimeRangeMs(timeRange);
    const cutoffDate = new Date(currentDate.getTime() - timeRangeMs);
    const monthAgo = new Date(currentDate.getTime() - (30 * 24 * 60 * 60 * 1000));

    let validInvoices = 0;
    let newUsersThisMonth = 0;

    allInvoicesData?.forEach((result, index) => {
      console.log(`Processing invoice ${index + 1}:`, result);
      
      if (result.status === 'success' && result.result) {
        // Handle both array and object response formats
        const invoiceData = Array.isArray(result.result) ? result.result : [
          result.result.id, result.result.issuer, result.result.client, 
          result.result.tokenAddress, result.result.amount, result.result.amountPaid,
          result.result.dueDate, result.result.description, result.result.status,
          result.result.useEscrow, result.result.createdAt
        ];
        
        // Skip if invoice ID is 0 (non-existent invoice)
        if (!invoiceData[0] || invoiceData[0].toString() === '0') {
          console.log(`Skipping invoice ${index + 1}: ID is 0`);
          return;
        }
        const [
          id, issuer, client, tokenAddress, amount, amountPaid, 
          dueDate, description, status, useEscrow, createdAt
        ] = invoiceData;

        validInvoices++;
        const createdAtDate = new Date(parseInt(createdAt.toString()) * 1000);
        const amountInEther = parseFloat(ethers.utils.formatEther(amount.toString()));
        const isPaid = status === 1;

        // Skip if either address is invalid (including zero addresses)
        if (!isValidAddress(issuer) || !isValidAddress(client)) {
          return;
        }

        // Track all unique users (only valid addresses)
        allUsers.add(issuer.toLowerCase());
        allUsers.add(client.toLowerCase());

        // Track business users (issuers)
        const businessKey = issuer.toLowerCase();
        if (!businessUsers.has(businessKey)) {
          businessUsers.set(businessKey, {
            address: issuer,
            name: formatAddress(issuer),
            totalInvoices: 0,
            totalRevenue: 0,
            paidInvoices: 0,
            firstInvoiceDate: createdAtDate,
            lastActivity: createdAtDate,
            isNewUser: createdAtDate > monthAgo
          });
        }
        
        const businessData = businessUsers.get(businessKey);
        businessData.totalInvoices += 1;
        businessData.lastActivity = createdAtDate > businessData.lastActivity ? createdAtDate : businessData.lastActivity;
        businessData.firstInvoiceDate = createdAtDate < businessData.firstInvoiceDate ? createdAtDate : businessData.firstInvoiceDate;
        
        if (isPaid) {
          businessData.paidInvoices += 1;
          businessData.totalRevenue += amountInEther;
        }

        // Track clients
        const clientKey = client.toLowerCase();
        if (!clients.has(clientKey)) {
          clients.set(clientKey, {
            address: client,
            name: formatAddress(client),
            totalInvoices: 0,
            totalPaid: 0,
            paidInvoices: 0,
            firstInvoiceDate: createdAtDate,
            lastActivity: createdAtDate,
            isNewUser: createdAtDate > monthAgo
          });
        }

        const clientData = clients.get(clientKey);
        clientData.totalInvoices += 1;
        clientData.lastActivity = createdAtDate > clientData.lastActivity ? createdAtDate : clientData.lastActivity;
        clientData.firstInvoiceDate = createdAtDate < clientData.firstInvoiceDate ? createdAtDate : clientData.firstInvoiceDate;
        
        if (isPaid) {
          clientData.paidInvoices += 1;
          clientData.totalPaid += amountInEther;
        }
      }
    });

    // Count new users this month
    businessUsers.forEach(user => {
      if (user.isNewUser) newUsersThisMonth++;
    });
    clients.forEach(user => {
      if (user.isNewUser) newUsersThisMonth++;
    });

    // Calculate active users (users with activity in selected time range)
    const activeUsers = Array.from(allUsers).filter(userAddress => {
      const businessUser = businessUsers.get(userAddress);
      const clientUser = clients.get(userAddress);
      const lastActivity = businessUser?.lastActivity || clientUser?.lastActivity;
      return lastActivity && lastActivity > cutoffDate;
    }).length;

    // Get top business users and clients
    const topBusinessUsers = Array.from(businessUsers.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    const topClients = Array.from(clients.values())
      .sort((a, b) => b.totalPaid - a.totalPaid)
      .slice(0, 5);

    // Calculate growth rate (simplified)
    const totalUsers = allUsers.size;
    const userGrowthRate = totalUsers > 0 ? (newUsersThisMonth / totalUsers) * 100 : 0;

    // Generate user activity data for chart
    const userActivity = generateActivityData(businessUsers, clients);

    setUserStats({
      totalUsers,
      businessUsers: businessUsers.size,
      clients: clients.size,
      activeUsers,
      newUsersThisMonth,
      userGrowthRate,
      topBusinessUsers,
      topClients,
      userActivity
    });

    setLoading(false);
  };

  const generateActivityData = (businessUsers, clients) => {
    const activityByMonth = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize months
    months.forEach(month => {
      activityByMonth[month] = { business: 0, clients: 0 };
    });

    // Count business user activity
    businessUsers.forEach(user => {
      const month = months[user.firstInvoiceDate.getMonth()];
      if (activityByMonth[month]) {
        activityByMonth[month].business += 1;
      }
    });

    // Count client activity
    clients.forEach(user => {
      const month = months[user.firstInvoiceDate.getMonth()];
      if (activityByMonth[month]) {
        activityByMonth[month].clients += 1;
      }
    });

    return Object.entries(activityByMonth).map(([month, data]) => ({
      month,
      business: data.business,
      clients: data.clients,
      total: data.business + data.clients
    }));
  };

  const getTimeRangeMs = (range) => {
    switch (range) {
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      case '90d': return 90 * 24 * 60 * 60 * 1000;
      case '1y': return 365 * 24 * 60 * 60 * 1000;
      default: return 30 * 24 * 60 * 60 * 1000;
    }
  };

  const refreshData = () => {
    refetch();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">User Analytics</h2>
            <p className="text-gray-400">Track total users, business owners, and clients on your platform</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-600"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            <button
              onClick={refreshData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-white">Analyzing user data...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Users</p>
                    <p className="text-3xl font-bold text-white">{userStats.totalUsers}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Business Users</p>
                    <p className="text-3xl font-bold text-green-400">{userStats.businessUsers}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Clients</p>
                    <p className="text-3xl font-bold text-purple-400">{userStats.clients}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">New Users (30d)</p>
                    <p className="text-3xl font-bold text-yellow-400">{userStats.newUsersThisMonth}</p>
                    <p className="text-sm text-gray-400">+{userStats.userGrowthRate.toFixed(1)}% growth</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Users */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Business Users */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Top Business Users</h3>
                <div className="space-y-3">
                  {userStats.topBusinessUsers.map((user, index) => (
                    <div key={user.address} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                          <span className="text-green-400 font-semibold text-sm">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{user.name}</p>
                          <p className="text-gray-400 text-sm">{user.totalInvoices} invoices</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-semibold">{user.totalRevenue.toFixed(4)} S</p>
                        <p className="text-gray-400 text-sm">{user.paidInvoices} paid</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Clients */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Top Clients</h3>
                <div className="space-y-3">
                  {userStats.topClients.map((client, index) => (
                    <div key={client.address} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                          <span className="text-purple-400 font-semibold text-sm">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{client.name}</p>
                          <p className="text-gray-400 text-sm">{client.totalInvoices} invoices</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-purple-400 font-semibold">{client.totalPaid.toFixed(4)} S</p>
                        <p className="text-gray-400 text-sm">{client.paidInvoices} paid</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* User Activity Chart */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">User Registration by Month</h3>
              <div className="h-64 flex items-end space-x-2">
                {userStats.userActivity.map((data, index) => (
                  <div key={data.month} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex flex-col items-center space-y-1">
                      <div 
                        className="w-full bg-green-500 rounded-t"
                        style={{ height: `${Math.max((data.business / Math.max(...userStats.userActivity.map(d => d.total))) * 200, 4)}px` }}
                      ></div>
                      <div 
                        className="w-full bg-purple-500 rounded-b"
                        style={{ height: `${Math.max((data.clients / Math.max(...userStats.userActivity.map(d => d.total))) * 200, 4)}px` }}
                      ></div>
                    </div>
                    <p className="text-gray-400 text-xs mt-2">{data.month}</p>
                    <p className="text-white text-xs">{data.total}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center space-x-6 mt-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-gray-400 text-sm">Business Users</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded"></div>
                  <span className="text-gray-400 text-sm">Clients</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
