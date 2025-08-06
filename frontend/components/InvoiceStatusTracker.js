import { useState, useEffect } from 'react';
import { useAccount, useContractRead, useContractReads } from 'wagmi';
import { ethers } from 'ethers';

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

const STATUS_COLORS = {
  'Created': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Paid': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Partially Paid': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Overdue': 'bg-red-500/20 text-red-400 border-red-500/30',
  'Disputed': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Completed': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Cancelled': 'bg-gray-500/20 text-gray-400 border-gray-500/30'
};

const STATUS_ICONS = {
  'Created': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  'Paid': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  'Partially Paid': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
    </svg>
  ),
  'Overdue': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
  'Disputed': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  'Completed': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  'Cancelled': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
};

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

const getInvoiceStatus = (invoice) => {
  if (!invoice) return 'Unknown';
  
  const status = INVOICE_STATUS[invoice.status] || 'Unknown';
  const amount = parseFloat(formatEther(invoice.amount));
  const amountPaid = parseFloat(formatEther(invoice.amountPaid));
  const dueDate = new Date(parseInt(invoice.dueDate.toString()) * 1000);
  const now = new Date();
  
  // Check for completed status (fully paid)
  if (status === 'Paid' && amountPaid >= amount) {
    return 'Completed';
  }
  
  // Check for partially paid
  if (amountPaid > 0 && amountPaid < amount && status === 'Created') {
    return 'Partially Paid';
  }
  
  // Check for overdue
  if (status === 'Created' && dueDate < now && amountPaid === 0) {
    return 'Overdue';
  }
  
  return status;
};

export default function InvoiceStatusTracker({ userRole = 'business', isOpen, onClose }) {
  const { address, isConnected } = useAccount();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  // Get user's invoice IDs based on role
  const { data: businessInvoiceIds, refetch: refetchBusinessInvoices } = useContractRead({
    address: INVOICE_MANAGER_ADDRESS,
    abi: INVOICE_MANAGER_ABI,
    functionName: 'getUserInvoices',
    args: [address],
    enabled: isConnected && !!address && userRole === 'business' && isOpen,
    watch: true,
    cacheTime: 0,
  });

  const { data: clientInvoiceIds, refetch: refetchClientInvoices } = useContractRead({
    address: INVOICE_MANAGER_ADDRESS,
    abi: INVOICE_MANAGER_ABI,
    functionName: 'getClientInvoices',
    args: [address],
    enabled: isConnected && !!address && userRole === 'client' && isOpen,
    watch: true,
    cacheTime: 0,
  });

  const invoiceIds = userRole === 'business' ? businessInvoiceIds : clientInvoiceIds;

  // Prepare contract reads for individual invoices
  const invoiceReads = (invoiceIds || []).map((invoiceId) => ({
    address: INVOICE_MANAGER_ADDRESS,
    abi: INVOICE_MANAGER_ABI,
    functionName: 'getInvoice',
    args: [invoiceId],
  }));

  // Get invoice details
  const { data: invoicesData, refetch: refetchInvoices } = useContractReads({
    contracts: invoiceReads,
    enabled: isConnected && !!address && (invoiceIds?.length > 0) && isOpen,
    watch: true,
    cacheTime: 0,
  });

  // Process invoice data
  useEffect(() => {
    if (invoicesData && invoiceIds) {
      const processedInvoices = [];
      
      invoicesData.forEach((result, index) => {
        if (result.status === 'success' && result.result) {
          const [
            id, issuer, client, tokenAddress, amount, amountPaid, 
            dueDate, description, status, useEscrow, createdAt
          ] = result.result;
          
          const invoice = {
            id: id.toString(),
            issuer,
            client,
            tokenAddress,
            amount,
            amountPaid,
            dueDate,
            description,
            status: parseInt(status.toString()),
            useEscrow,
            createdAt,
            currentStatus: getInvoiceStatus({
              status: parseInt(status.toString()),
              amount,
              amountPaid,
              dueDate
            })
          };
          
          processedInvoices.push(invoice);
        }
      });
      
      setInvoices(processedInvoices);
      setLoading(false);
    } else if (invoiceIds && invoiceIds.length === 0) {
      setInvoices([]);
      setLoading(false);
    }
  }, [invoicesData, invoiceIds]);

  // Auto-refresh data every 10 seconds
  useEffect(() => {
    if (!isConnected || !address || !isOpen) return;
    
    const interval = setInterval(() => {
      if (userRole === 'business') {
        refetchBusinessInvoices?.();
      } else {
        refetchClientInvoices?.();
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [isConnected, address, isOpen, userRole, refetchBusinessInvoices, refetchClientInvoices]);

  // Filter and sort invoices
  const filteredInvoices = invoices.filter(invoice => {
    if (filter === 'all') return true;
    return invoice.currentStatus.toLowerCase().replace(' ', '_') === filter;
  });

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return parseInt(b.createdAt.toString()) - parseInt(a.createdAt.toString());
      case 'amount':
        return parseFloat(formatEther(b.amount)) - parseFloat(formatEther(a.amount));
      case 'status':
        return a.currentStatus.localeCompare(b.currentStatus);
      case 'due_date':
        return parseInt(a.dueDate.toString()) - parseInt(b.dueDate.toString());
      default:
        return 0;
    }
  });

  const getActivityLog = (invoice) => {
    const activities = [];
    const createdDate = formatDate(invoice.createdAt);
    const amountPaid = parseFloat(formatEther(invoice.amountPaid));
    const totalAmount = parseFloat(formatEther(invoice.amount));
    
    // Invoice created
    activities.push({
      type: 'created',
      status: 'Created',
      date: createdDate,
      description: `Invoice #${invoice.id} created for ${formatEther(invoice.amount)} S`,
      icon: STATUS_ICONS['Created']
    });
    
    // Payment activities
    if (amountPaid > 0) {
      if (amountPaid >= totalAmount) {
        activities.push({
          type: 'payment',
          status: 'Completed',
          date: 'Recent', // Would need payment timestamp from events
          description: `Full payment received: ${formatEther(invoice.amountPaid)} S`,
          icon: STATUS_ICONS['Completed']
        });
      } else {
        activities.push({
          type: 'payment',
          status: 'Partially Paid',
          date: 'Recent',
          description: `Partial payment received: ${formatEther(invoice.amountPaid)} S of ${formatEther(invoice.amount)} S`,
          icon: STATUS_ICONS['Partially Paid']
        });
      }
    }
    
    // Dispute activities
    if (invoice.currentStatus === 'Disputed') {
      activities.push({
        type: 'dispute',
        status: 'Disputed',
        date: 'Recent',
        description: `Invoice disputed - payment frozen`,
        icon: STATUS_ICONS['Disputed']
      });
    }
    
    // Overdue status
    if (invoice.currentStatus === 'Overdue') {
      activities.push({
        type: 'overdue',
        status: 'Overdue',
        date: formatDate(invoice.dueDate),
        description: `Invoice became overdue`,
        icon: STATUS_ICONS['Overdue']
      });
    }
    
    return activities.reverse(); // Most recent first
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {userRole === 'business' ? 'Invoice Status Tracking' : 'Payment History'}
            </h2>
            <p className="text-gray-400">
              {userRole === 'business' 
                ? 'Track all your invoice statuses and payment history in real-time'
                : 'View your invoice payments and activity history'
              }
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

        {/* Filters and Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-600"
            >
              <option value="all">All Status</option>
              <option value="created">Created</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
              <option value="disputed">Disputed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-600"
            >
              <option value="recent">Most Recent</option>
              <option value="amount">Amount</option>
              <option value="status">Status</option>
              <option value="due_date">Due Date</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Live Updates</span>
          </div>
        </div>

        {/* Invoice List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-white">Loading invoice status...</span>
          </div>
        ) : sortedInvoices.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Invoices Found</h3>
            <p className="text-gray-400">
              {userRole === 'business' 
                ? 'You haven\'t created any invoices yet.'
                : 'You don\'t have any invoices to pay.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedInvoices.map((invoice) => (
              <div key={invoice.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                {/* Invoice Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-semibold text-white">
                      Invoice #{invoice.id}
                    </h3>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center space-x-2 ${STATUS_COLORS[invoice.currentStatus]}`}>
                      {STATUS_ICONS[invoice.currentStatus]}
                      <span>{invoice.currentStatus}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">
                      {formatEther(invoice.amount)} S
                    </p>
                    {parseFloat(formatEther(invoice.amountPaid)) > 0 && (
                      <p className="text-sm text-green-400">
                        {formatEther(invoice.amountPaid)} S paid
                      </p>
                    )}
                  </div>
                </div>

                {/* Invoice Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-gray-400 text-sm">Description</p>
                    <p className="text-white">{invoice.description || 'No description'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Due Date</p>
                    <p className="text-white">{formatDate(invoice.dueDate)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">
                      {userRole === 'business' ? 'Client' : 'From'}
                    </p>
                    <p className="text-white font-mono text-sm">
                      {userRole === 'business' 
                        ? `${invoice.client.slice(0, 6)}...${invoice.client.slice(-4)}`
                        : `${invoice.issuer.slice(0, 6)}...${invoice.issuer.slice(-4)}`
                      }
                    </p>
                  </div>
                </div>

                {/* Activity Log */}
                <div className="border-t border-gray-700 pt-4">
                  <h4 className="text-white font-semibold mb-3">Activity History</h4>
                  <div className="space-y-3">
                    {getActivityLog(invoice).map((activity, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className={`p-2 rounded-full ${STATUS_COLORS[activity.status]} flex-shrink-0`}>
                          {activity.icon}
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm">{activity.description}</p>
                          <p className="text-gray-400 text-xs">{activity.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
