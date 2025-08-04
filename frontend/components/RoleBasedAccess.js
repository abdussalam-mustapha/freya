import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUserRole } from '../hooks/useUserRole';
import FreyaLogo from './FreyaLogo';

export default function RoleBasedAccess({ allowedRoles, children, redirectTo }) {
  const router = useRouter();
  const { userRole, isLoading } = useUserRole();

  useEffect(() => {
    if (!isLoading && userRole && !allowedRoles.includes(userRole)) {
      // Redirect to appropriate page based on user role
      const redirectPath = redirectTo || (userRole === 'client' ? '/client-dashboard' : '/dashboard');
      router.replace(redirectPath);
    }
  }, [userRole, isLoading, allowedRoles, redirectTo, router]);

  // Show loading state while determining role
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <FreyaLogo className="w-12 h-12 mx-auto mb-4 animate-pulse" />
          <div className="flex items-center space-x-2 text-white/60">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show access denied if user doesn't have permission
  if (userRole && !allowedRoles.includes(userRole)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <FreyaLogo className="w-16 h-16 mx-auto mb-6" />
          <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-2xl p-8">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
            <p className="text-red-300 mb-4">
              You don't have permission to access this page as a {userRole} user.
            </p>
            <button
              onClick={() => router.push(userRole === 'client' ? '/client-dashboard' : '/dashboard')}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-medium transition-all"
            >
              Go to {userRole === 'client' ? 'Client' : 'Business'} Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render children if user has permission
  return children;
}
