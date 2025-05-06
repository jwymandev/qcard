'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';

// Badge component for notifications
const NotificationBadge = ({ count }: { count: number }) => {
  if (count <= 0) return null;
  
  return (
    <span className="relative -top-1 ml-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
      {count > 9 ? '9+' : count}
    </span>
  );
};

export default function Navigation() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const [unreadMessages, setUnreadMessages] = useState(0);
  
  const isAuthenticated = status === 'authenticated';
  const user = session?.user || { name: '', image: null };
  
  // Only log session state changes in development and when status changes
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("Navigation session state:", { 
        status, 
        isAuthenticated,
        hasUser: !!session?.user,
        tenantType: session?.user?.tenantType || 'unknown'
      });
    }
  }, [status, session, isAuthenticated]);
  
  // Fetch unread messages count
  const fetchUnreadMessagesCount = async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await fetch('/api/messages/unread-count');
      if (response.ok) {
        const data = await response.json();
        setUnreadMessages(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching unread messages count:', error);
    }
  };
  
  // Fetch unread messages count on initial load and periodically
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadMessagesCount();
      
      // Poll for new messages every 30 seconds
      const interval = setInterval(fetchUnreadMessagesCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);
  
  // Hide navigation on home page when user is not authenticated
  if (pathname === '/' && !isAuthenticated) {
    return null;
  }
  
  // Close user menu when clicking outside
  const handleClickOutside = () => {
    setIsUserMenuOpen(false);
  };
  
  // Handle user menu toggle
  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };
  
  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-blue-600">
                QCard
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href={
                  session?.user?.isAdmin || session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN' || session?.user?.tenantType === 'ADMIN'
                    ? '/admin/dashboard'
                    : session?.user?.tenantType === 'STUDIO'
                    ? '/studio/dashboard'
                    : '/talent/dashboard'
                }
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname.includes('/dashboard')
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Dashboard
              </Link>
              
              <div className="relative inline-flex items-center">
                <Link
                  href={session?.user?.tenantType === 'STUDIO' ? '/studio/messages' : '/talent/messages'}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname.includes('/messages')
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Messages
                  <NotificationBadge count={unreadMessages} />
                </Link>
              </div>
              
              <Link
                href={session?.user?.tenantType === 'STUDIO' ? '/studio/profile' : '/talent/profile'}
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname.includes('/profile')
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Profile
              </Link>
              <Link
                href="/opportunities"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname.startsWith('/opportunities')
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Opportunities
              </Link>
              <Link
                href="/subscription"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname === '/subscription'
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Subscription
              </Link>
              {session?.user?.tenantType === 'STUDIO' && (
                <Link
                  href="/studio/questionnaires"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname.startsWith('/studio/questionnaires')
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Questionnaires
                </Link>
              )}
              {session?.user?.tenantType === 'TALENT' && (
                <Link
                  href="/talent/questionnaires"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname.startsWith('/talent/questionnaires')
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Questionnaires
                </Link>
              )}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {isAuthenticated ? (
              <div className="ml-3 relative">
                <div>
                  <button
                    type="button"
                    className="flex items-center max-w-xs text-sm bg-white rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    id="user-menu-button"
                    aria-expanded={isUserMenuOpen}
                    aria-haspopup="true"
                    onClick={toggleUserMenu}
                  >
                    <span className="sr-only">Open user menu</span>
                    <span className="mr-2 text-sm text-gray-700">{user.name}</span>
                    <svg className="h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                      {user.image ? (
                        <img
                          className="h-8 w-8 rounded-full"
                          src={user.image}
                          alt=""
                        />
                      ) : (
                        <span className="text-gray-500 text-sm font-medium">
                          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </span>
                      )}
                    </div>
                  </button>
                </div>
                
                {isUserMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      aria-hidden="true"
                      onClick={handleClickOutside}
                    ></div>
                    
                    <div
                      className="absolute right-0 z-20 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
                      role="menu"
                      aria-orientation="vertical"
                      aria-labelledby="user-menu-button"
                      tabIndex={-1}
                    >
                      {(session?.user?.isAdmin || session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN' || session?.user?.tenantType === 'ADMIN') && (
                        <Link
                          href="/admin/dashboard"
                          className="block px-4 py-2 text-sm text-blue-700 font-semibold hover:bg-gray-100"
                          role="menuitem"
                          tabIndex={-1}
                          id="user-menu-item-admin"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          Admin Dashboard
                        </Link>
                      )}
                      <Link
                        href={
                          session?.user?.isAdmin || session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN' || session?.user?.tenantType === 'ADMIN'
                            ? '/admin/settings'
                            : session?.user?.tenantType === 'STUDIO'
                            ? '/studio/profile'
                            : '/talent/profile'
                        }
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        tabIndex={-1}
                        id="user-menu-item-0"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        Your Profile
                      </Link>
                      <Link
                        href={
                          session?.user?.isAdmin || session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN' || session?.user?.tenantType === 'ADMIN'
                            ? '/admin/settings'
                            : session?.user?.tenantType === 'STUDIO'
                            ? '/studio/settings'
                            : '/talent/settings'
                        }
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        tabIndex={-1}
                        id="user-menu-item-1"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        Settings
                      </Link>
                      <button
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        tabIndex={-1}
                        id="user-menu-item-2"
                      >
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div>
                <Link
                  href="/sign-in"
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="ml-4 px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="sm:hidden" id="mobile-menu">
          <div className="pt-2 pb-3 space-y-1">
            <Link
              href={session?.user?.tenantType === 'STUDIO' ? '/studio/dashboard' : '/talent/dashboard'}
              className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                pathname.includes('/dashboard')
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Dashboard
            </Link>
            
            <div className="relative inline-flex items-center w-full">
              <Link
                href={session?.user?.tenantType === 'STUDIO' ? '/studio/messages' : '/talent/messages'}
                className={`flex items-center pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  pathname.includes('/messages')
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Messages
                {unreadMessages > 0 && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {unreadMessages}
                  </span>
                )}
              </Link>
            </div>
            
            <Link
              href={session?.user?.tenantType === 'STUDIO' ? '/studio/profile' : '/talent/profile'}
              className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                pathname.includes('/profile')
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Profile
            </Link>
            <Link
              href="/opportunities"
              className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                pathname.startsWith('/opportunities')
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Opportunities
            </Link>
            <Link
              href="/subscription"
              className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                pathname === '/subscription'
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Subscription
            </Link>
            {session?.user?.tenantType === 'STUDIO' && (
              <Link
                href="/studio/questionnaires"
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  pathname.startsWith('/studio/questionnaires')
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Questionnaires
              </Link>
            )}
            {session?.user?.tenantType === 'TALENT' && (
              <Link
                href="/talent/questionnaires"
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  pathname.startsWith('/talent/questionnaires')
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Questionnaires
              </Link>
            )}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200">
            {isAuthenticated ? (
              <div>
                <div className="flex items-center px-4">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      {user.image ? (
                        <img
                          className="h-10 w-10 rounded-full"
                          src={user.image}
                          alt=""
                        />
                      ) : (
                        <span className="text-gray-500 text-sm font-medium">
                          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">
                      {user.name}
                    </div>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <Link
                    href={session?.user?.tenantType === 'STUDIO' ? '/studio/profile' : '/talent/profile'}
                    className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
                  >
                    Your Profile
                  </Link>
                  <Link
                    href={session?.user?.tenantType === 'STUDIO' ? '/studio/settings' : '/talent/settings'}
                    className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
                  >
                    Settings
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="block w-full text-left pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-1">
                <Link
                  href="/sign-in"
                  className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}