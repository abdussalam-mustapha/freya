import { useState } from 'react';
import { ethers } from 'ethers';
import FreyaLogo from './FreyaLogo';

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
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return 'Invalid Date';
  }
};

const formatDateTime = (timestamp) => {
  try {
    const date = new Date(parseInt(timestamp.toString()) * 1000);
    return date.toLocaleString('en-US', {
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

const getStatusColor = (status) => {
  switch (status) {
    case 0: return 'text-blue-400 bg-blue-500/10 border-blue-500/20'; // Created
    case 1: return 'text-green-400 bg-green-500/10 border-green-500/20'; // Paid
    case 2: return 'text-red-400 bg-red-500/10 border-red-500/20'; // Overdue
    case 3: return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'; // Disputed
    case 4: return 'text-purple-400 bg-purple-500/10 border-purple-500/20'; // Completed
    default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
  }
};

const getStatusText = (status) => {
  const statuses = ['Created', 'Paid', 'Overdue', 'Disputed', 'Completed'];
  return statuses[status] || 'Unknown';
};

export default function InvoiceViewer({ invoice, isOpen, onClose, userRole = 'business' }) {
  const [isPrinting, setIsPrinting] = useState(false);

  if (!isOpen || !invoice) return null;

  const isOverdue = invoice.status === 0 && new Date() > new Date(parseInt(invoice.dueDate.toString()) * 1000);
  const completionPercentage = invoice.amount > 0 ? 
    ((parseFloat(formatEther(invoice.amountPaid)) / parseFloat(formatEther(invoice.amount))) * 100).toFixed(1) : '0';

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const downloadInvoice = () => {
    const invoiceData = {
      invoiceNumber: `INV-${invoice.id.toString().padStart(6, '0')}`,
      issuer: invoice.issuer,
      client: invoice.client,
      amount: formatEther(invoice.amount),
      amountPaid: formatEther(invoice.amountPaid),
      currency: invoice.tokenAddress === '0x0000000000000000000000000000000000000000' ? 'S' : 'ERC20',
      description: invoice.description,
      status: getStatusText(invoice.status),
      createdAt: formatDateTime(invoice.createdAt),
      dueDate: formatDate(invoice.dueDate),
      isEscrow: invoice.useEscrow || false,
      completionPercentage: completionPercentage + '%',
      platform: 'Freya Decentralized Invoicing Platform',
      blockchain: 'Sonic Testnet'
    };

    const dataStr = JSON.stringify(invoiceData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `freya-invoice-${invoice.id.toString().padStart(6, '0')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
        {/* Print Styles */}
        <style jsx>{`
          @media print {
            .no-print { display: none !important; }
            .print-container { 
              background: white !important; 
              box-shadow: none !important;
              border-radius: 0 !important;
              max-height: none !important;
              overflow: visible !important;
            }
          }
        `}</style>

        <div className="print-container">
          {/* Header Actions - Hidden in Print */}
          <div className="no-print flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">Invoice Details</h2>
            <div className="flex items-center space-x-3">
              <button
                onClick={handlePrint}
                disabled={isPrinting}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
              >
                {isPrinting ? 'Preparing...' : '🖨️ Print'}
              </button>
              <button
                onClick={downloadInvoice}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
              >
                📥 Download
              </button>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Invoice Content */}
          <div className="p-8">
            {/* Invoice Header */}
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center space-x-4">
                <FreyaLogo className="w-12 h-12" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">INVOICE</h1>
                  <p className="text-gray-600">Freya Decentralized Platform</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-800 mb-2">
                  #{invoice.id.toString().padStart(6, '0')}
                </div>
                <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(invoice.status)}`}>
                  {getStatusText(invoice.status)}
                  {isOverdue && invoice.status === 0 && ' (Overdue)'}
                </div>
              </div>
            </div>

            {/* Invoice Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* From Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">From</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm mb-1">Business Owner</p>
                  <p className="font-mono text-sm text-gray-800 break-all">{invoice.issuer}</p>
                  <p className="text-gray-500 text-xs mt-2">
                    {truncateAddress(invoice.issuer)} (Wallet Address)
                  </p>
                </div>
              </div>

              {/* To Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">To</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm mb-1">Client</p>
                  <p className="font-mono text-sm text-gray-800 break-all">{invoice.client}</p>
                  <p className="text-gray-500 text-xs mt-2">
                    {truncateAddress(invoice.client)} (Wallet Address)
                  </p>
                </div>
              </div>
            </div>

            {/* Invoice Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Issue Date</h4>
                <p className="text-gray-600">{formatDate(invoice.createdAt)}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Due Date</h4>
                <p className={`${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                  {formatDate(invoice.dueDate)}
                  {isOverdue && ' (Overdue)'}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Payment Terms</h4>
                <p className="text-gray-600">
                  {invoice.useEscrow ? 'Escrow Protected' : 'Direct Payment'}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Description</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {invoice.description || 'No description provided'}
                </p>
              </div>
            </div>

            {/* Amount Details */}
            <div className="border-t border-gray-200 pt-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold text-gray-800">Invoice Amount</span>
                  <span className="text-2xl font-bold text-gray-800">
                    {formatEther(invoice.amount)} S
                  </span>
                </div>
                
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600">Amount Paid</span>
                  <span className="text-lg font-semibold text-green-600">
                    {formatEther(invoice.amountPaid)} S
                  </span>
                </div>

                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600">Remaining Balance</span>
                  <span className="text-lg font-semibold text-red-600">
                    {formatEther(invoice.amount - invoice.amountPaid)} S
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Payment Progress</span>
                    <span>{completionPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${completionPercentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Currency Info */}
                <div className="text-sm text-gray-500 mt-4">
                  <p>Currency: {invoice.tokenAddress === '0x0000000000000000000000000000000000000000' ? 'Sonic (S)' : 'ERC20 Token'}</p>
                  <p>Blockchain: Sonic Testnet</p>
                  {invoice.tokenAddress !== '0x0000000000000000000000000000000000000000' && (
                    <p className="font-mono">Token: {truncateAddress(invoice.tokenAddress)}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-500">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Platform Information</h4>
                  <p>Freya Decentralized Invoicing Platform</p>
                  <p>Powered by Sonic Blockchain</p>
                  <p>Smart Contract: {truncateAddress(process.env.NEXT_PUBLIC_INVOICE_MANAGER_ADDRESS)}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Invoice Details</h4>
                  <p>Generated: {formatDateTime(invoice.createdAt)}</p>
                  <p>Type: {invoice.useEscrow ? 'Escrow Invoice' : 'Standard Invoice'}</p>
                  <p>Status: {getStatusText(invoice.status)}</p>
                </div>
              </div>
            </div>

            {/* Blockchain Verification */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="font-semibold text-blue-800">Blockchain Verified</span>
              </div>
              <p className="text-blue-700 text-sm">
                This invoice is stored on the Sonic blockchain and cryptographically verified. 
                All transaction data is immutable and publicly auditable.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
