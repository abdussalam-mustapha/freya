import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';

/**
 * Custom hook to handle data refreshing on navigation
 * Ensures fresh data when users navigate between pages
 */
export function useNavigationRefresh(refetchFunctions = [], dependencies = []) {
  const router = useRouter();
  const { isConnected, address } = useAccount();

  useEffect(() => {
    const handleRouteChange = (url) => {
      if (isConnected && address && refetchFunctions.length > 0) {
        // Small delay to ensure page has mounted
        setTimeout(() => {
          refetchFunctions.forEach(refetch => {
            if (typeof refetch === 'function') {
              refetch();
            }
          });
        }, 100);
      }
    };

    const handleFocus = () => {
      if (isConnected && address && refetchFunctions.length > 0) {
        refetchFunctions.forEach(refetch => {
          if (typeof refetch === 'function') {
            refetch();
          }
        });
      }
    };

    // Listen for route changes
    router.events.on('routeChangeComplete', handleRouteChange);
    
    // Listen for window focus (user returns to tab)
    window.addEventListener('focus', handleFocus);
    
    // Cleanup event listeners
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [router.events, isConnected, address, ...dependencies]);

  // Manual refresh function
  const manualRefresh = () => {
    if (refetchFunctions.length > 0) {
      refetchFunctions.forEach(refetch => {
        if (typeof refetch === 'function') {
          refetch();
        }
      });
    }
  };

  return { manualRefresh };
}
