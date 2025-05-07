'use client';

import React, { ReactNode, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { isUserAdmin, isUserSuperAdmin } from '@/lib/client-admin-helpers';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Admin access check on client-side
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect handled by middleware, but just in case
  if (status === 'unauthenticated' || !isUserAdmin(session)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="mb-6">You do not have permission to access the admin portal.</p>
          <Link 
            href="/sign-in" 
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Navigation items with access control
  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: 'HomeIcon', current: pathname === '/admin/dashboard' },
    { name: 'Users', href: '/admin/users', icon: 'UsersIcon', current: pathname === '/admin/users' || pathname.startsWith('/admin/users/') },
    { name: 'Studios', href: '/admin/studios', icon: 'FilmIcon', current: pathname === '/admin/studios' || pathname.startsWith('/admin/studios/') },
    { name: 'Talents', href: '/admin/talents', icon: 'UserGroupIcon', current: pathname === '/admin/talents' || pathname.startsWith('/admin/talents/') },
    { name: 'Projects', href: '/admin/projects', icon: 'FolderIcon', current: pathname === '/admin/projects' || pathname.startsWith('/admin/projects/') },
    { name: 'Regions', href: '/admin/regions', icon: 'GlobeIcon', current: pathname === '/admin/regions' || pathname.startsWith('/admin/regions/'), superAdmin: true },
    { name: 'Locations', href: '/admin/locations', icon: 'MapPinIcon', current: pathname === '/admin/locations' || pathname.startsWith('/admin/locations/'), superAdmin: true },
    { 
      name: 'Subscriptions', 
      href: '/admin/subscriptions/regions', 
      icon: 'CreditCardIcon', 
      current: pathname.startsWith('/admin/subscriptions/'),
      subItems: [
        { name: 'Region Plans', href: '/admin/subscriptions/regions', current: pathname === '/admin/subscriptions/regions' },
        { name: 'Discounts', href: '/admin/subscriptions/discounts', current: pathname === '/admin/subscriptions/discounts' },
      ]
    },
    { name: 'Schema', href: '/admin/schema', icon: 'TableIcon', current: pathname === '/admin/schema' || pathname.startsWith('/admin/schema/') },
    { name: 'Settings', href: '/admin/settings', icon: 'CogIcon', current: pathname === '/admin/settings', superAdmin: true },
    { name: 'Logs', href: '/admin/logs', icon: 'ClipboardListIcon', current: pathname === '/admin/logs', superAdmin: true },
  ];

  const filteredNavigation = isUserSuperAdmin(session) 
    ? navigation 
    : navigation.filter(item => !item.superAdmin);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <div 
        className={`md:flex flex-col fixed inset-y-0 flex-shrink-0 w-64 transition-all bg-gray-800 ${
          sidebarOpen ? 'left-0' : '-left-64'
        } md:relative md:left-0 z-20`}
      >
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <span className="text-xl font-bold text-white">QCard Admin</span>
          </div>
          <div className="mt-6 flex-1 flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {filteredNavigation.map((item) => (
                <div key={item.name}>
                  <Link
                    href={item.href}
                    className={`${
                      item.current
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                  >
                    {item.name}
                    {item.subItems && (
                      <svg 
                        className="ml-auto h-5 w-5" 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </Link>
                  
                  {item.subItems && item.current && (
                    <div className="mt-1 ml-4 space-y-1">
                      {item.subItems.map((subItem) => (
                        <Link
                          key={subItem.name}
                          href={subItem.href}
                          className={`${
                            subItem.current
                              ? 'bg-gray-800 text-white'
                              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                          } group flex items-center px-2 py-2 text-sm rounded-md`}
                        >
                          {subItem.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>
        <div className="flex-shrink-0 flex border-t border-gray-700 p-4">
          <div className="flex-shrink-0 w-full group block">
            <div className="flex items-center">
              <div className="ml-3">
                <p className="text-sm font-medium text-white">
                  {session?.user?.name || 'Admin User'}
                </p>
                <p className="text-xs font-medium text-gray-400 group-hover:text-gray-300">
                  {session?.user?.role || 'Admin'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <button
            type="button"
            className="md:hidden px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <span className="sr-only">Open sidebar</span>
            <svg
              className="h-6 w-6"
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
          </button>
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex items-center">
              <h1 className="text-2xl font-semibold text-gray-700">
                Admin Portal
              </h1>
            </div>
            <div className="ml-4 flex items-center md:ml-6">
              <Link
                href="/"
                className="p-1 rounded-full text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">View site</span>
                <svg
                  className="h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        <main className="flex-1 relative overflow-y-auto focus:outline-none bg-gray-100">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}