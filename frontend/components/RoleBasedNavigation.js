import Link from 'next/link';
import { useRouter } from 'next/router';
import { useUserRole } from '../hooks/useUserRole';
import NotificationSystem from './NotificationSystem';

export default function RoleBasedNavigation() {
  const router = useRouter();
  const { userRole, isLoading, switchRole, canSwitchRoles } = useUserRole();

  if (isLoading) {
    return (
      <nav className="hidden md:flex space-x-6">
        <div className="w-16 h-6 bg-white/10 rounded animate-pulse"></div>
        <div className="w-16 h-6 bg-white/10 rounded animate-pulse"></div>
        <div className="w-16 h-6 bg-white/10 rounded animate-pulse"></div>
      </nav>
    );
  }

  const isActive = (path) => router.pathname === path;

  const businessNavItems = [
    { href: '/dashboard', label: 'Dashboard', key: 'dashboard' },
    { href: '/invoices', label: 'Invoices', key: 'invoices' },
    { href: '/analytics', label: 'Analytics', key: 'analytics' },
    { href: '/feem-revenue', label: 'FeeM Revenue', key: 'feem-revenue' },
    { href: '/create', label: 'Create', key: 'create' }
  ];

  const clientNavItems = [
    { href: '/client-dashboard', label: 'Dashboard', key: 'client-dashboard' },
    { href: '/invoices', label: 'Invoices', key: 'invoices' },
    { href: '/analytics', label: 'Analytics', key: 'analytics' }
  ];

  const navItems = userRole === 'client' ? clientNavItems : businessNavItems;

  return (
    <div className="flex items-center space-x-4">
      <nav className="hidden md:flex space-x-6">
        {navItems.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`transition-colors ${
              isActive(item.href)
                ? 'text-blue-400 hover:text-blue-300 font-medium'
                : 'text-white/60 hover:text-white'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Role Switcher - Only show if user can switch roles */}
      {canSwitchRoles && (
        <div className="relative">
          <select
            value={userRole}
            onChange={(e) => {
              const newRole = e.target.value;
              switchRole(newRole);
              // Redirect to appropriate dashboard
              if (newRole === 'client') {
                router.push('/client-dashboard');
              } else {
                router.push('/dashboard');
              }
            }}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="business" className="bg-gray-800 text-white">Business</option>
            <option value="client" className="bg-gray-800 text-white">Client</option>
          </select>
        </div>
      )}

      {/* Notifications - Only show for clients */}
      {userRole === 'client' && (
        <NotificationSystem 
          onNotificationClick={(notification) => {
            if (notification.type === 'view_all' || notification.invoiceId) {
              router.push('/client-dashboard');
            }
          }}
        />
      )}
    </div>
  );
}
