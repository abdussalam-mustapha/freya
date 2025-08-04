import { useState, useEffect } from 'react';
import { useAccount, useContractRead } from 'wagmi';

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
  }
];

export function useUserRole() {
  const { address, isConnected } = useAccount();
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get invoices created by user (business role)
  const { data: userInvoices, isLoading: userInvoicesLoading } = useContractRead({
    address: INVOICE_MANAGER_ADDRESS,
    abi: INVOICE_MANAGER_ABI,
    functionName: 'getUserInvoices',
    args: [address],
    enabled: isConnected && !!address && !!INVOICE_MANAGER_ADDRESS,
    watch: true,
    cacheTime: 0,
  });

  // Get invoices received by user (client role)
  const { data: clientInvoices, isLoading: clientInvoicesLoading } = useContractRead({
    address: INVOICE_MANAGER_ADDRESS,
    abi: INVOICE_MANAGER_ABI,
    functionName: 'getClientInvoices',
    args: [address],
    enabled: isConnected && !!address && !!INVOICE_MANAGER_ADDRESS,
    watch: true,
    cacheTime: 0,
  });

  useEffect(() => {
    if (!isConnected || !address) {
      setUserRole(null);
      setIsLoading(false);
      return;
    }

    if (userInvoicesLoading || clientInvoicesLoading) {
      setIsLoading(true);
      return;
    }

    // Check if user has a saved role preference first
    const savedRole = localStorage.getItem(`userRole_${address}`);
    if (savedRole && (savedRole === 'business' || savedRole === 'client')) {
      setUserRole(savedRole);
      setIsLoading(false);
      return;
    }

    // Determine role based on invoice activity
    const hasCreatedInvoices = userInvoices && userInvoices.length > 0;
    const hasReceivedInvoices = clientInvoices && clientInvoices.length > 0;

    if (hasCreatedInvoices && hasReceivedInvoices) {
      // User is both a business and client - default to business
      setUserRole('business');
    } else if (hasCreatedInvoices) {
      // User has only created invoices - business role
      setUserRole('business');
    } else if (hasReceivedInvoices) {
      // User has only received invoices - client role
      setUserRole('client');
    } else {
      // New user with no invoice activity - default to business but allow switching
      setUserRole('business');
    }

    setIsLoading(false);
  }, [isConnected, address, userInvoices, clientInvoices, userInvoicesLoading, clientInvoicesLoading]);

  const switchRole = (newRole) => {
    if (newRole === 'business' || newRole === 'client') {
      setUserRole(newRole);
      // Store role preference in localStorage
      localStorage.setItem(`userRole_${address}`, newRole);
    }
  };

  return {
    userRole,
    isLoading,
    switchRole,
    hasCreatedInvoices: userInvoices && userInvoices.length > 0,
    hasReceivedInvoices: clientInvoices && clientInvoices.length > 0,
    canSwitchRoles: true // Always allow role switching for flexibility
  };
}
