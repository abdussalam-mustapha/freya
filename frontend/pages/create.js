import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState, useEffect } from 'react';
import { useAccount, useContractWrite, usePrepareContractWrite, useQueryClient } from 'wagmi';
import { ethers } from 'ethers';
import Link from 'next/link';
import FreyaLogo from '../components/FreyaLogo';
import { useRouter } from 'next/router';
import RoleBasedNavigation from '../components/RoleBasedNavigation';
import RoleBasedAccess from '../components/RoleBasedAccess';

export default function CreateInvoice() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    client: '',
    clientName: '',
    clientEmail: '',
    tokenAddress: '0x0000000000000000000000000000000000000000', // Default to native ETH
    amount: '',
    dueDate: '',
    description: '',
    useEscrow: false,
    milestones: [],
    category: 'service',
    priority: 'normal',
    notes: ''
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMilestones, setShowMilestones] = useState(false);

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

  const { data, isLoading, isSuccess, write, error: writeError } = useContractWrite({
    ...config,
    onError: (error) => {
      console.error('Contract write error:', error);
      alert(`Transaction failed: ${error.shortMessage || error.message || 'Unknown error'}`);
    },
    onSuccess: (data) => {
      console.log('Invoice created successfully:', data);
      
      // Invalidate and refetch invoice-related queries with specific keys to match dashboard
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['userInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'userInvoices', address] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'invoiceDetails'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', address] });
      queryClient.invalidateQueries({ queryKey: ['userInvoices', address] });
      
      // Force refetch all queries to ensure fresh data
      queryClient.refetchQueries();
      
      alert('Invoice created successfully!');
      
      // Redirect to invoices page to see the new invoice
      setTimeout(() => {
        router.push('/invoices');
      }, 1500);
    }
  });

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
        console.log('Creating invoice with params:', {
          client: formData.client,
          amount: formData.amount,
          dueDate: formData.dueDate,
          description: formData.description,
          useEscrow: formData.useEscrow,
          contractAddress: contractAddress
        });
        
        // Additional validation
        const amountInWei = ethers.utils.parseEther(formData.amount);
        const dueDateTimestamp = Math.floor(new Date(formData.dueDate).getTime() / 1000);
        const currentTimestamp = Math.floor(Date.now() / 1000);
        
        console.log('Validation check:', {
          amountInWei: amountInWei.toString(),
          dueDateTimestamp,
          currentTimestamp,
          isValidDueDate: dueDateTimestamp > currentTimestamp
        });
        
        if (dueDateTimestamp <= currentTimestamp) {
          alert('Due date must be in the future');
          return;
        }
        
        write();
      } catch (error) {
        console.error('Error creating invoice:', error);
        alert(`Error creating invoice: ${error.shortMessage || error.message || 'Please try again.'}`);
      }
    }
  };

  if (!mounted) return null;

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <FreyaLogo size="lg" className="mb-6" />
          <h1 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h1>
          <p className="text-white/60 mb-6">Please connect your wallet to create invoices</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <RoleBasedAccess allowedRoles={['business']}>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        {/* Header */}
        <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <FreyaLogo size="sm" showText={false} />
                <h1 className="text-xl font-bold text-white">Freya</h1>
              </div>
              <div className="flex items-center space-x-4">
                <RoleBasedNavigation />
                <ConnectButton />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="flex items-center space-x-2 text-sm text-white/60 mb-4">
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            <span>/</span>
            <span className="text-white">Create Invoice</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Create Invoice</h1>
          <p className="text-white/60 mb-8">Generate a new invoice for your client with optional escrow protection</p>

        {isSuccess && (
          <div className="mb-6 bg-green-500/10 backdrop-blur-xl border border-green-500/20 rounded-2xl p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-400">Invoice Created Successfully!</h3>
                <div className="mt-2 text-sm text-green-300">
                  <p>Your invoice has been created and stored on the blockchain.</p>
                  {data && (
                    <p className="mt-1">Transaction hash: <span className="font-mono text-xs text-green-200">{data.hash}</span></p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {(prepareError || writeError) && (
          <div className="mb-6 bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-2xl p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-400">Error</h3>
                <div className="mt-2 text-sm text-red-300">
                  <p>{prepareError?.message || writeError?.message}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Client Information Section */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Client Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client Name */}
                <div>
                  <label htmlFor="clientName" className="block text-sm font-medium text-white mb-2">
                    Client Name
                  </label>
                  <input
                    type="text"
                    id="clientName"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleInputChange}
                    placeholder="John Doe or Company Name"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                
                {/* Client Email */}
                <div>
                  <label htmlFor="clientEmail" className="block text-sm font-medium text-white mb-2">
                    Client Email
                  </label>
                  <input
                    type="email"
                    id="clientEmail"
                    name="clientEmail"
                    value={formData.clientEmail}
                    onChange={handleInputChange}
                    placeholder="client@example.com"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              
              {/* Client Wallet Address */}
              <div className="mt-4">
                <label htmlFor="client" className="block text-sm font-medium text-white mb-2">
                  Client Wallet Address *
                </label>
                <input
                  type="text"
                  id="client"
                  name="client"
                  value={formData.client}
                  onChange={handleInputChange}
                  placeholder="0x..."
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
                <p className="mt-1 text-sm text-white/60">Enter the client's wallet address for payment</p>
              </div>
            </div>

            {/* Payment Information Section */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                Payment Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Token Selection */}
                <div>
                  <label htmlFor="tokenAddress" className="block text-sm font-medium text-white mb-2">
                    Payment Token
                  </label>
                  <select
                    id="tokenAddress"
                    name="tokenAddress"
                    value={formData.tokenAddress}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="0x0000000000000000000000000000000000000000">Sonic (Native)</option>
                    <option value="0x1234567890123456789012345678901234567890">$S Token</option>
                    <option value="custom">Custom Token</option>
                  </select>
                </div>
                
                {/* Amount */}
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-white mb-2">
                    Amount *
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
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Project Details Section */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Project Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Category */}
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-white mb-2">
                    Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="service">Service</option>
                    <option value="product">Product</option>
                    <option value="consulting">Consulting</option>
                    <option value="development">Development</option>
                    <option value="design">Design</option>
                    <option value="marketing">Marketing</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                {/* Priority */}
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-white mb-2">
                    Priority
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              
              {/* Due Date */}
              <div className="mb-4">
                <label htmlFor="dueDate" className="block text-sm font-medium text-white mb-2">
                  Due Date *
                </label>
                <input
                  type="datetime-local"
                  id="dueDate"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-white mb-2">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                rows={4}
                placeholder="Describe the work or services provided..."
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
              </div>
            </div>

            {/* Advanced Options Section */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <svg className="w-5 h-5 mr-2 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Advanced Options
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                >
                  {showAdvanced ? 'Hide' : 'Show'} Advanced
                </button>
              </div>
              
              {/* Escrow Option - Always Visible */}
              <div className="flex items-start space-x-3 mb-4">
                <input
                  type="checkbox"
                  id="useEscrow"
                  name="useEscrow"
                  checked={formData.useEscrow}
                  onChange={handleInputChange}
                  className="mt-1 h-4 w-4 text-blue-500 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
                />
                <div>
                  <label htmlFor="useEscrow" className="block text-sm font-medium text-white">
                    Enable Escrow Protection
                  </label>
                  <p className="text-xs text-white/60 mt-1">
                    Funds are held in escrow until work is completed and approved
                  </p>
                </div>
              </div>
              
              {/* Milestones Toggle */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="showMilestones"
                  checked={showMilestones}
                  onChange={(e) => setShowMilestones(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-500 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
                />
                <div>
                  <label htmlFor="showMilestones" className="block text-sm font-medium text-white">
                    Enable Milestone Payments
                  </label>
                  <p className="text-xs text-white/60 mt-1">
                    Break payment into multiple milestones for better project management
                  </p>
                </div>
              </div>
              
              {/* Advanced Options - Collapsible */}
              {showAdvanced && (
                <div className="mt-6 pt-4 border-t border-white/10">
                  {/* Additional Notes */}
                  <div className="mb-4">
                    <label htmlFor="notes" className="block text-sm font-medium text-white mb-2">
                      Additional Notes
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Any additional terms, conditions, or notes..."
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  
                  {/* AI-Powered Features Placeholder */}
                  <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span className="text-sm font-medium text-blue-400">AI-Powered Features (Coming Soon)</span>
                    </div>
                    <p className="text-xs text-white/60">
                      • Auto-generate invoice descriptions based on project type<br/>
                      • Smart milestone suggestions<br/>
                      • Intelligent due date recommendations
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Milestones Section - Conditional */}
            {showMilestones && (
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  Milestone Payments
                </h3>
                
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-yellow-400">Milestone Feature (Coming Soon)</span>
                  </div>
                  <p className="text-xs text-white/60">
                    Break your invoice into multiple milestones with separate due dates and amounts. Perfect for larger projects with phased deliverables.
                  </p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-6">
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all border border-white/20"
                >
                  Cancel
                </button>
              </div>
              
              <button
                type="submit"
                disabled={isLoading || !formData.client || !formData.amount || !formData.dueDate || !formData.description}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all shadow-lg"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Creating Invoice...</span>
                  </div>
                ) : (
                  'Create Invoice'
                )}
              </button>
            </div>
          </div>
        </form>
        </main>
      </div>
    </RoleBasedAccess>
  );
}
