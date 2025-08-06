import { useState, useEffect } from 'react';
import { useAccount, useContractReads } from 'wagmi';
import { ethers } from 'ethers';

const INVOICE_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_INVOICE_MANAGER_ADDRESS;
const INVOICE_NFT_ADDRESS = process.env.NEXT_PUBLIC_INVOICE_NFT_ADDRESS;

const INVOICE_MANAGER_ABI = [
  {
    "inputs": [],
    "name": "nextInvoiceId",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "_invoiceId", "type": "uint256"}],
    "name": "getInvoice",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "id", "type": "uint256"},
          {"internalType": "address", "name": "issuer", "type": "address"},
          {"internalType": "address", "name": "client", "type": "address"},
          {"internalType": "uint256", "name": "amount", "type": "uint256"},
          {"internalType": "uint256", "name": "amountPaid", "type": "uint256"},
          {"internalType": "address", "name": "tokenAddress", "type": "address"},
          {"internalType": "string", "name": "description", "type": "string"},
          {"internalType": "uint256", "name": "dueDate", "type": "uint256"},
          {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
          {"internalType": "enum InvoiceManager.InvoiceStatus", "name": "status", "type": "uint8"},
          {"internalType": "bool", "name": "isEscrow", "type": "bool"},
          {"internalType": "uint256", "name": "escrowReleaseTime", "type": "uint256"},
          {"internalType": "bool", "name": "disputed", "type": "bool"}
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
    return date.toISOString();
  } catch {
    return '';
  }
};

const getStatusText = (status) => {
  const statuses = ['Created', 'Paid', 'Overdue', 'Disputed', 'Completed'];
  return statuses[status] || 'Unknown';
};

export default function ComplianceExporter({ userRole = 'business', isOpen, onClose }) {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState('json');
  const [dateRange, setDateRange] = useState('all');
  const [includeNFTReceipts, setIncludeNFTReceipts] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [nftReceipts, setNFTReceipts] = useState([]);

  // Get total number of invoices
  const { data: nextInvoiceId } = useContractReads({
    contracts: [
      {
        address: INVOICE_MANAGER_ADDRESS,
        abi: INVOICE_MANAGER_ABI,
        functionName: 'nextInvoiceId',
      },
    ],
    enabled: isConnected && !!address && isOpen,
  });

  // Get user's NFT receipts
  const { data: userReceiptIds } = useContractReads({
    contracts: [
      {
        address: INVOICE_NFT_ADDRESS,
        abi: INVOICE_NFT_ABI,
        functionName: 'getUserReceipts',
        args: [address],
      },
    ],
    enabled: isConnected && !!address && !!INVOICE_NFT_ADDRESS && isOpen && includeNFTReceipts,
  });

  // Fetch all invoice data
  useEffect(() => {
    const fetchInvoiceData = async () => {
      if (!nextInvoiceId?.[0]?.result || !isConnected || !address) return;

      setLoading(true);
      try {
        const totalInvoices = parseInt(nextInvoiceId[0].result.toString());
        const invoiceIds = Array.from({ length: totalInvoices }, (_, i) => i + 1);

        // Prepare contract reads for all invoices
        const invoiceReads = invoiceIds.map((id) => ({
          address: INVOICE_MANAGER_ADDRESS,
          abi: INVOICE_MANAGER_ABI,
          functionName: 'getInvoice',
          args: [id],
        }));

        // Fetch all invoices
        const { data: invoicesData } = await useContractReads({
          contracts: invoiceReads,
        });

        // Process invoice data and filter for user
        const processedInvoices = [];
        invoicesData?.forEach((result, index) => {
          if (result.status === 'success' && result.result) {
            const invoice = result.result;
            const invoiceId = invoiceIds[index];
            
            // Filter based on user role
            const isUserInvoice = userRole === 'business' 
              ? invoice.issuer.toLowerCase() === address.toLowerCase()
              : invoice.client.toLowerCase() === address.toLowerCase();

            if (isUserInvoice) {
              processedInvoices.push({
                id: invoiceId,
                issuer: invoice.issuer,
                client: invoice.client,
                amount: invoice.amount,
                amountPaid: invoice.amountPaid,
                tokenAddress: invoice.tokenAddress,
                description: invoice.description,
                dueDate: invoice.dueDate,
                createdAt: invoice.createdAt,
                status: invoice.status,
                isEscrow: invoice.isEscrow,
                escrowReleaseTime: invoice.escrowReleaseTime,
                disputed: invoice.disputed
              });
            }
          }
        });

        setInvoices(processedInvoices);
      } catch (error) {
        console.error('Error fetching invoice data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchInvoiceData();
    }
  }, [nextInvoiceId, isConnected, address, userRole, isOpen]);

  // Fetch NFT receipt data
  useEffect(() => {
    const fetchNFTReceiptData = async () => {
      if (!userReceiptIds?.[0]?.result || !includeNFTReceipts) return;

      try {
        const receiptIds = userReceiptIds[0].result;
        const receiptReads = receiptIds.map((tokenId) => ({
          address: INVOICE_NFT_ADDRESS,
          abi: INVOICE_NFT_ABI,
          functionName: 'getReceiptData',
          args: [tokenId],
        }));

        const { data: receiptsData } = await useContractReads({
          contracts: receiptReads,
        });

        const processedReceipts = [];
        receiptsData?.forEach((result, index) => {
          if (result.status === 'success' && result.result && result.result.exists) {
            const receipt = result.result;
            const tokenId = receiptIds[index];
            
            processedReceipts.push({
              tokenId: tokenId.toString(),
              invoiceId: receipt.invoiceId.toString(),
              issuer: receipt.issuer,
              client: receipt.client,
              amount: receipt.amount,
              paidDate: receipt.paidDate,
              description: receipt.description
            });
          }
        });

        setNFTReceipts(processedReceipts);
      } catch (error) {
        console.error('Error fetching NFT receipt data:', error);
      }
    };

    if (isOpen && includeNFTReceipts) {
      fetchNFTReceiptData();
    }
  }, [userReceiptIds, includeNFTReceipts, isOpen]);

  const filterInvoicesByDate = (invoices) => {
    if (dateRange === 'all') return invoices;

    const now = new Date();
    let cutoffDate;

    switch (dateRange) {
      case '30days':
        cutoffDate = new Date(now.setDate(now.getDate() - 30));
        break;
      case '90days':
        cutoffDate = new Date(now.setDate(now.getDate() - 90));
        break;
      case '1year':
        cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        return invoices;
    }

    return invoices.filter(invoice => {
      const createdDate = new Date(parseInt(invoice.createdAt.toString()) * 1000);
      return createdDate >= cutoffDate;
    });
  };

  const generateComplianceReport = () => {
    const filteredInvoices = filterInvoicesByDate(invoices);
    
    const reportData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: address,
        userRole: userRole,
        platform: 'Freya Decentralized Invoicing Platform',
        blockchain: 'Sonic Testnet',
        dateRange: dateRange,
        totalInvoices: filteredInvoices.length,
        totalNFTReceipts: includeNFTReceipts ? nftReceipts.length : 0
      },
      invoices: filteredInvoices.map(invoice => ({
        invoiceId: invoice.id.toString(),
        issuer: invoice.issuer,
        client: invoice.client,
        amount: formatEther(invoice.amount),
        amountPaid: formatEther(invoice.amountPaid),
        currency: invoice.tokenAddress === '0x0000000000000000000000000000000000000000' ? 'S' : 'ERC20',
        tokenAddress: invoice.tokenAddress,
        description: invoice.description,
        status: getStatusText(invoice.status),
        isEscrow: invoice.isEscrow,
        disputed: invoice.disputed,
        createdAt: formatDate(invoice.createdAt),
        dueDate: formatDate(invoice.dueDate),
        escrowReleaseTime: invoice.escrowReleaseTime ? formatDate(invoice.escrowReleaseTime) : null,
        completionPercentage: invoice.amount > 0 ? ((parseFloat(formatEther(invoice.amountPaid)) / parseFloat(formatEther(invoice.amount))) * 100).toFixed(2) : '0'
      })),
      nftReceipts: includeNFTReceipts ? nftReceipts.map(receipt => ({
        tokenId: receipt.tokenId,
        invoiceId: receipt.invoiceId,
        issuer: receipt.issuer,
        client: receipt.client,
        amount: formatEther(receipt.amount),
        paidDate: formatDate(receipt.paidDate),
        description: receipt.description,
        type: 'Soulbound NFT Receipt'
      })) : [],
      summary: {
        totalAmount: filteredInvoices.reduce((sum, inv) => sum + parseFloat(formatEther(inv.amount)), 0).toFixed(4),
        totalPaid: filteredInvoices.reduce((sum, inv) => sum + parseFloat(formatEther(inv.amountPaid)), 0).toFixed(4),
        statusBreakdown: {
          created: filteredInvoices.filter(inv => inv.status === 0).length,
          paid: filteredInvoices.filter(inv => inv.status === 1).length,
          overdue: filteredInvoices.filter(inv => inv.status === 2).length,
          disputed: filteredInvoices.filter(inv => inv.status === 3).length,
          completed: filteredInvoices.filter(inv => inv.status === 4).length
        },
        escrowInvoices: filteredInvoices.filter(inv => inv.isEscrow).length,
        disputedInvoices: filteredInvoices.filter(inv => inv.disputed).length
      }
    };

    return reportData;
  };

  const downloadReport = () => {
    const reportData = generateComplianceReport();
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `freya-compliance-report-${userRole}-${timestamp}`;

    if (exportFormat === 'json') {
      const dataStr = JSON.stringify(reportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', `${filename}.json`);
      linkElement.click();
    } else if (exportFormat === 'csv') {
      // Convert to CSV format
      const csvRows = [];
      
      // Headers
      csvRows.push([
        'Invoice ID', 'Issuer', 'Client', 'Amount (S)', 'Amount Paid (S)', 
        'Currency', 'Description', 'Status', 'Is Escrow', 'Disputed', 
        'Created At', 'Due Date', 'Completion %'
      ].join(','));
      
      // Data rows
      reportData.invoices.forEach(invoice => {
        csvRows.push([
          invoice.invoiceId,
          invoice.issuer,
          invoice.client,
          invoice.amount,
          invoice.amountPaid,
          invoice.currency,
          `"${invoice.description.replace(/"/g, '""')}"`,
          invoice.status,
          invoice.isEscrow,
          invoice.disputed,
          invoice.createdAt,
          invoice.dueDate,
          invoice.completionPercentage
        ].join(','));
      });
      
      const csvContent = csvRows.join('\n');
      const dataUri = 'data:text/csv;charset=utf-8,'+ encodeURIComponent(csvContent);
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', `${filename}.csv`);
      linkElement.click();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Compliance Report Export
            </h2>
            <p className="text-gray-400">
              Generate comprehensive compliance reports for audit and regulatory purposes
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

        {/* Export Options */}
        <div className="space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-white font-medium mb-3">Export Format</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setExportFormat('json')}
                className={`p-3 rounded-lg border text-center transition-all ${
                  exportFormat === 'json'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                    : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="font-medium">JSON</div>
                <div className="text-sm opacity-75">Structured data format</div>
              </button>
              <button
                onClick={() => setExportFormat('csv')}
                className={`p-3 rounded-lg border text-center transition-all ${
                  exportFormat === 'csv'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                    : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="font-medium">CSV</div>
                <div className="text-sm opacity-75">Spreadsheet compatible</div>
              </button>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-white font-medium mb-3">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Time</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="1year">Last Year</option>
            </select>
          </div>

          {/* Include Options */}
          <div>
            <label className="block text-white font-medium mb-3">Include</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={includeNFTReceipts}
                  onChange={(e) => setIncludeNFTReceipts(e.target.checked)}
                  className="w-4 h-4 text-blue-500 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                />
                <span className="text-white">NFT Receipt Data</span>
              </label>
            </div>
          </div>

          {/* Report Preview */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">Report Preview</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Total Invoices</p>
                <p className="text-white font-medium">{filterInvoicesByDate(invoices).length}</p>
              </div>
              <div>
                <p className="text-gray-400">NFT Receipts</p>
                <p className="text-white font-medium">{includeNFTReceipts ? nftReceipts.length : 'Excluded'}</p>
              </div>
              <div>
                <p className="text-gray-400">User Role</p>
                <p className="text-white font-medium capitalize">{userRole}</p>
              </div>
              <div>
                <p className="text-gray-400">Format</p>
                <p className="text-white font-medium">{exportFormat.toUpperCase()}</p>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <div className="flex space-x-3">
            <button
              onClick={downloadReport}
              disabled={loading || invoices.length === 0}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Generating...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download Report</span>
                </div>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
