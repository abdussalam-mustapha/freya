import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const FeeMRevenueDashboard = ({ isOpen, onClose }) => {
  const [feeMData, setFeeMData] = useState({
    projectId: null,
    isRegistered: false,
    accumulatedRewards: '0',
    totalClaimed: '0',
    contractsRegistered: 0
  });
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');

  // FeeM contract addresses from Sonic documentation
  const FEEM_CORE_ADDRESS = '0x0b5f073135df3f5671710f08b08c0c9258aecc35';
  const PROJECTS_REGISTRAR_ADDRESS = '0x897d37f040Ec8DEFFD0ae1De743e1b1a14cf221f';
  const CONTRACTS_REGISTRAR_ADDRESS = '0xDC2B0D2Dd2b7759D97D50db4eabDC36973110830';
  
  // Simplified ABI for FeeM interactions
  const FEEM_CORE_ABI = [
    "function claimRewards(uint256 projectId) external",
    "function getAccumulatedRewards(uint256 projectId) external view returns (uint256)",
    "function getProjectInfo(uint256 projectId) external view returns (address owner, address recipient, string memory metadataUri)"
  ];
  
  const PROJECTS_REGISTRAR_ABI = [
    "function register(address owner, address recipient, string memory metadataUri, address disputeContact) external payable returns (uint256 projectId)",
    "function getProjectByOwner(address owner) external view returns (uint256)"
  ];

  useEffect(() => {
    if (isOpen) {
      loadFeeMData();
    }
  }, [isOpen]);

  const loadFeeMData = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!window.ethereum) {
        setError('Please connect your wallet');
        return;
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const connectedAddress = await signer.getAddress();
      
      // Use the project owner's address (YOU) - replace with your actual wallet address
      const PROJECT_OWNER_ADDRESS = process.env.NEXT_PUBLIC_PROJECT_OWNER_ADDRESS || connectedAddress;
      
      console.log('FeeM Check:', {
        connectedWallet: connectedAddress,
        projectOwner: PROJECT_OWNER_ADDRESS,
        isOwner: connectedAddress.toLowerCase() === PROJECT_OWNER_ADDRESS.toLowerCase()
      });
      
      // Check if the Freya project is registered (using project owner's address)
      const registrarContract = new ethers.Contract(PROJECTS_REGISTRAR_ADDRESS, PROJECTS_REGISTRAR_ABI, provider);
      
      try {
        const projectId = await registrarContract.getProjectByOwner(PROJECT_OWNER_ADDRESS);
        
        if (projectId.toString() !== '0') {
          // Project is registered, get details
          const coreContract = new ethers.Contract(FEEM_CORE_ADDRESS, FEEM_CORE_ABI, provider);
          const accumulatedRewards = await coreContract.getAccumulatedRewards(projectId);
          
          setFeeMData({
            projectId: projectId.toString(),
            isRegistered: true,
            accumulatedRewards: ethers.utils.formatEther(accumulatedRewards),
            totalClaimed: '0', // Would need additional contract call to get this
            contractsRegistered: 1 // Simplified - would need to query registered contracts
          });
        } else {
          setFeeMData({
            projectId: null,
            isRegistered: false,
            accumulatedRewards: '0',
            totalClaimed: '0',
            contractsRegistered: 0
          });
        }
      } catch (error) {
        console.error('Error checking project registration:', error);
        setFeeMData({
          projectId: null,
          isRegistered: false,
          accumulatedRewards: '0',
          totalClaimed: '0',
          contractsRegistered: 0
        });
      }
    } catch (error) {
      console.error('Error loading FeeM data:', error);
      setError('Failed to load FeeM data');
    } finally {
      setLoading(false);
    }
  };

  const claimRewards = async () => {
    if (!feeMData.projectId || !feeMData.isRegistered) {
      setError('Project not registered for FeeM');
      return;
    }

    try {
      setClaiming(true);
      setError('');
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const connectedAddress = await signer.getAddress();
      
      // Check if the connected wallet is the project owner
      const PROJECT_OWNER_ADDRESS = process.env.NEXT_PUBLIC_PROJECT_OWNER_ADDRESS || connectedAddress;
      
      if (connectedAddress.toLowerCase() !== PROJECT_OWNER_ADDRESS.toLowerCase()) {
        setError('Only the project owner can claim FeeM rewards. Please connect the project owner wallet.');
        return;
      }
      
      const coreContract = new ethers.Contract(FEEM_CORE_ADDRESS, FEEM_CORE_ABI, signer);
      
      const tx = await coreContract.claimRewards(feeMData.projectId);
      await tx.wait();
      
      // Refresh data after claiming
      await loadFeeMData();
    } catch (error) {
      console.error('Error claiming rewards:', error);
      setError('Failed to claim rewards: ' + (error.message || 'Unknown error'));
    } finally {
      setClaiming(false);
    }
  };

  const openFeeMDashboard = () => {
    window.open('https://feem.soniclabs.com/', '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-semibold text-white flex items-center space-x-2">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            <span>FeeM Revenue Dashboard</span>
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-300">Loading FeeM data...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Registration Status */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-white mb-3">Registration Status</h4>
              {feeMData.isRegistered ? (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="text-green-300">Freya is registered for FeeM</span>
                  <span className="text-gray-400 text-sm">(Project ID: {feeMData.projectId})</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <span className="text-yellow-300">Freya is not registered for FeeM</span>
                  </div>
                  <button
                    onClick={openFeeMDashboard}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Register on FeeM Dashboard
                  </button>
                </div>
              )}
            </div>

            {/* Revenue Stats */}
            {feeMData.isRegistered && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Accumulated Rewards</p>
                      <p className="text-2xl font-bold text-green-400">
                        {parseFloat(feeMData.accumulatedRewards).toFixed(4)} S
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Claimed</p>
                      <p className="text-2xl font-bold text-blue-400">
                        {parseFloat(feeMData.totalClaimed).toFixed(4)} S
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Contracts Registered</p>
                      <p className="text-2xl font-bold text-purple-400">
                        {feeMData.contractsRegistered}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            {feeMData.isRegistered && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-3">Actions</h4>
                <div className="flex space-x-3">
                  <button
                    onClick={claimRewards}
                    disabled={claiming || parseFloat(feeMData.accumulatedRewards) === 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {claiming ? 'Claiming...' : 'Claim Rewards'}
                  </button>
                  <button
                    onClick={openFeeMDashboard}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Open FeeM Dashboard
                  </button>
                  <button
                    onClick={loadFeeMData}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Refresh Data
                  </button>
                </div>
              </div>
            )}

            {/* Information */}
            <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
              <h4 className="text-blue-300 font-semibold mb-2">About FeeM Revenue Sharing</h4>
              <p className="text-blue-200 text-sm mb-2">
                FeeM allows Freya to earn 90% of the network fees generated by our smart contracts. 
                This creates sustainable revenue without relying on fundraising.
              </p>
              <ul className="text-blue-200 text-sm space-y-1">
                <li>• Rewards are distributed based on gas consumption</li>
                <li>• Claims are processed after epoch confirmation</li>
                <li>• No deadline for claiming accumulated rewards</li>
              </ul>
            </div>

            {error && (
              <div className="p-3 bg-red-900 border border-red-700 rounded text-red-200 text-sm">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeeMRevenueDashboard;
