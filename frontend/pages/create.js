import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState, useEffect } from 'react';
import { useAccount, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { ethers } from 'ethers';
import Link from 'next/link';
import FreyaLogo from '../components/FreyaLogo';
import { useRouter } from 'next/router';

export default function CreateInvoice() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    client: '',
    amount: '',
    dueDate: '',
    description: '',
    useEscrow: false,
    milestones: []
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Contract configuration
  const contractAddress = process.env.NEXT_PUBLIC_INVOICE_MANAGER_ADDRESS || '0xae5DdF3ac3dfD629d1C5Ad1Cc6AF1B741b0405fe';
  const contractABI = [
    {
      "inputs": [
        {"internalType": "address", "name": "client", "type": "address"},
        {"internalType": "address", "name": "tokenAddress", "type": "address"},
        {"internalType": "uint256", "name": "amount", "type": "uint256"},
        {"internalType": "uint256", "name": "dueDate", "type": "uint256"},
        {"internalType": "string", "name": "description", "type": "string"},
        {"internalType": "bool", "name": "useEscrow", "type": "bool"}
      ],
      "name": "createInvoice",
      "outputs": [{"internalType": "uint256", "name": "invoiceId", "type": "uint256"}],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {"indexed": true, "internalType": "uint256", "name": "invoiceId", "type": "uint256"},
        {"indexed": true, "internalType": "address", "name": "issuer", "type": "address"},
        {"indexed": true, "internalType": "address", "name": "client", "type": "address"},
        {"internalType": "uint256", "name": "amount", "type": "uint256"},
        {"internalType": "uint256", "name": "dueDate", "type": "uint256"},
        {"internalType": "string", "name": "description", "type": "string"}
      ],
      "name": "InvoiceCreated",
      "type": "event"
    }
  ];

  // Prepare contract write
  const { config, error: prepareError } = usePrepareContractWrite({
    address: contractAddress,
    abi: contractABI,
    functionName: 'createInvoice',
    args: formData.client && formData.amount && formData.dueDate && formData.description ? [
      formData.client,
      '0x0000000000000000000000000000000000000000', // Native token
      ethers.utils.parseEther(formData.amount || '0'),
      Math.floor(new Date(formData.dueDate).getTime() / 1000),
      formData.description,
      formData.useEscrow
    ] : undefined,
    enabled: Boolean(formData.client && formData.amount && formData.dueDate && formData.description && isConnected),
  });

  const { data, isLoading, isSuccess, write, error: writeError } = useContractWrite(config);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.client || !ethers.utils.isAddress(formData.client)) {
      alert('Please enter a valid client address');
      return;
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    if (!formData.dueDate || new Date(formData.dueDate) <= new Date()) {
      alert('Please select a future due date');
      return;
    }
    
    if (!formData.description.trim()) {
      alert('Please enter a description');
      return;
    }
    
    if (contractAddress === '0x0000000000000000000000000000000000000000') {
      alert('Smart contract not deployed yet. Please deploy the contract first.');
      return;
    }
    
    if (write) {
      try {
        write();
      } catch (error) {
        console.error('Error creating invoice:', error);
        alert('Error creating invoice. Please try again.');
      }
    }
  };

  if (!mounted) return null;

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FreyaLogo size="lg" className="mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Connect Your Wallet</h1>
          <p className="text-gray-600 mb-6">Please connect your wallet to create invoices with Freya</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <FreyaLogo size="sm" showText={false} />
              <h1 className="text-xl font-bold text-gray-900">Freya Invoice Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <nav className="hidden md:flex space-x-6">
                <Link href="/" className="text-gray-600 hover:text-gray-900">Home</Link>
                <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
              </nav>
              <ConnectButton showBalance={false} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
            <Link href="/dashboard" className="hover:text-gray-700">Dashboard</Link>
            <span>/</span>
            <span className="text-gray-900">Create Invoice</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Invoice</h1>
          <p className="text-gray-600">Generate a new invoice for your client with Freya's secure escrow protection</p>
        </div>

        {isSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Invoice Created Successfully!</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Your invoice has been created and stored on the blockchain.</p>
                  {data && (
                    <p className="mt-1">Transaction hash: <span className="font-mono text-xs">{data.hash}</span></p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {(prepareError || writeError) && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{prepareError?.message || writeError?.message}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg p-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Client Address */}
            <div>
              <label htmlFor="client" className="block text-sm font-medium text-gray-700 mb-2">
                Client Wallet Address *
              </label>
              <input
                type="text"
                id="client"
                name="client"
                value={formData.client}
                onChange={handleInputChange}
                placeholder="0x..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="mt-1 text-sm text-gray-500">Enter the client's Ethereum wallet address</p>
            </div>

            {/* Amount */}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Amount (S) *
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.001"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="mt-1 text-sm text-gray-500">Amount in Sonic tokens</p>
            </div>

            {/* Due Date */}
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-2">
                Due Date *
              </label>
              <input
                type="datetime-local"
                id="dueDate"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                placeholder="Describe the work or services provided..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Escrow Option */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="useEscrow"
                name="useEscrow"
                checked={formData.useEscrow}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="useEscrow" className="ml-2 block text-sm text-gray-700">
                Use Escrow Protection
              </label>
            </div>
            {formData.useEscrow && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-sm text-blue-800">
                  <strong>Escrow Protection:</strong> Funds will be held in a smart contract until work is completed and approved by the client.
                </p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex justify-end space-x-4">
            <Link href="/dashboard" className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading || !write}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
