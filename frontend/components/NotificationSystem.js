import { useState, useEffect } from 'react';
import { useAccount, useContractRead } from 'wagmi';

const INVOICE_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_INVOICE_MANAGER_ADDRESS;
const INVOICE_MANAGER_ABI = [
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
      {
        "components": [
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
        "internalType": "struct InvoiceManager.Invoice",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export default function NotificationSystem({ onNotificationClick }) {
  const { address, isConnected } = useAccount();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  // Get client's invoice IDs
  const { data: clientInvoiceIds } = useContractRead({
    address: INVOICE_MANAGER_ADDRESS,
    abi: INVOICE_MANAGER_ABI,
    functionName: 'getClientInvoices',
    args: [address],
    enabled: isConnected && !!address && !!INVOICE_MANAGER_ADDRESS,
    watch: true,
    cacheTime: 0,
  });

  useEffect(() => {
    const generateNotifications = async () => {
      if (!clientInvoiceIds || clientInvoiceIds.length === 0) {
        setNotifications([]);
        setHasUnread(false);
        return;
      }

      const newNotifications = [];
      
      // For demo purposes, we'll simulate some notifications
      // In a real implementation, you'd fetch actual invoice data
      for (let i = 0; i < Math.min(clientInvoiceIds.length, 3); i++) {
        const invoiceId = clientInvoiceIds[i];
        
        // Simulate different types of notifications
        const notificationTypes = [
          {
            type: 'invoice_received',
            title: 'New Invoice Received',
            message: `You have received invoice #${invoiceId}`,
            icon: 'mail',
            color: 'blue',
            timestamp: Date.now() - (i * 24 * 60 * 60 * 1000) // Stagger by days
          },
          {
            type: 'payment_due',
            title: 'Payment Due Soon',
            message: `Invoice #${invoiceId} is due in 2 days`,
            icon: 'clock',
            color: 'yellow',
            timestamp: Date.now() - (i * 12 * 60 * 60 * 1000) // Stagger by hours
          },
          {
            type: 'overdue',
            title: 'Invoice Overdue',
            message: `Invoice #${invoiceId} is overdue`,
            icon: 'warning',
            color: 'red',
            timestamp: Date.now() - (i * 6 * 60 * 60 * 1000) // Stagger by hours
          }
        ];

        const notification = notificationTypes[i % notificationTypes.length];
        newNotifications.push({
          id: `${notification.type}-${invoiceId}`,
          invoiceId,
          ...notification,
          isRead: false
        });
      }

      setNotifications(newNotifications);
      setHasUnread(newNotifications.some(n => !n.isRead));
    };

    if (isConnected && clientInvoiceIds) {
      generateNotifications();
    }
  }, [clientInvoiceIds, isConnected]);

  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    );
    setHasUnread(notifications.some(n => !n.isRead && n.id !== notificationId));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setHasUnread(false);
  };

  const getIcon = (iconType) => {
    switch (iconType) {
      case 'mail':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'clock':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM12 17h.01M12 3v9a4 4 0 004 4h4" />
          </svg>
        );
    }
  };

  const getColorClasses = (color, isRead) => {
    const opacity = isRead ? '60' : '100';
    switch (color) {
      case 'blue':
        return `text-blue-400 bg-blue-500/10 border-blue-500/20`;
      case 'yellow':
        return `text-yellow-400 bg-yellow-500/10 border-yellow-500/20`;
      case 'red':
        return `text-red-400 bg-red-500/10 border-red-500/20`;
      default:
        return `text-gray-400 bg-gray-500/10 border-gray-500/20`;
    }
  };

  const formatTimestamp = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (!isConnected) return null;

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-white/60 hover:text-white transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM12 17h.01M12 3v9a4 4 0 004 4h4" />
        </svg>
        {hasUnread && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
        )}
        {notifications.length > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-medium">
              {notifications.filter(n => !n.isRead).length || notifications.length}
            </span>
          </div>
        )}
      </button>

      {/* Notification Dropdown */}
      {showNotifications && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-white/20 shadow-xl z-50">
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Notifications</h3>
              {notifications.length > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-gray-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM12 17h.01M12 3v9a4 4 0 004 4h4" />
                  </svg>
                </div>
                <p className="text-white/60 text-sm">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-white/5 transition-colors cursor-pointer ${
                      !notification.isRead ? 'bg-white/5' : ''
                    }`}
                    onClick={() => {
                      markAsRead(notification.id);
                      if (onNotificationClick) {
                        onNotificationClick(notification);
                      }
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${getColorClasses(notification.color, notification.isRead)}`}>
                        {getIcon(notification.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium ${notification.isRead ? 'text-white/60' : 'text-white'}`}>
                            {notification.title}
                          </p>
                          <span className="text-xs text-white/40">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                        </div>
                        <p className={`text-sm ${notification.isRead ? 'text-white/40' : 'text-white/60'} mt-1`}>
                          {notification.message}
                        </p>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-4 border-t border-white/10">
              <button
                onClick={() => {
                  setShowNotifications(false);
                  if (onNotificationClick) {
                    onNotificationClick({ type: 'view_all' });
                  }
                }}
                className="w-full text-center text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
