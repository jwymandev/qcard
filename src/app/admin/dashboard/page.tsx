'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface StatsData {
  users: number;
  studios: number;
  talents: number;
  projects: number;
  castingCalls: number;
  loading: boolean;
  error: string | null;
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<StatsData>({
    users: 0,
    studios: 0,
    talents: 0,
    projects: 0,
    castingCalls: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        // In a real implementation, you would fetch actual stats from your API
        // For now, we'll simulate loading stats
        
        // This will be replaced with a real API call
        // const response = await fetch('/api/admin/stats');
        // const data = await response.json();
        
        // For now, just simulate stats with timeout
        setTimeout(() => {
          setStats({
            users: 156,
            studios: 24,
            talents: 132,
            projects: 47,
            castingCalls: 68,
            loading: false,
            error: null,
          });
        }, 1000);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setStats(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load statistics'
        }));
      }
    }

    fetchStats();
  }, []);

  // Stats cards with loading state
  const statsCards = [
    { name: 'Total Users', value: stats.users, href: '/admin/users', color: 'bg-blue-500' },
    { name: 'Studios', value: stats.studios, href: '/admin/studios', color: 'bg-green-500' },
    { name: 'Talents', value: stats.talents, href: '/admin/talents', color: 'bg-purple-500' },
    { name: 'Projects', value: stats.projects, href: '/admin/projects', color: 'bg-orange-500' },
    { name: 'Casting Calls', value: stats.castingCalls, href: '/admin/casting-calls', color: 'bg-red-500' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Admin Dashboard</h1>
        <p className="text-gray-600">
          Welcome back, {session?.user?.name || 'Admin'}!
        </p>
      </div>

      {stats.error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
          {stats.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {statsCards.map((stat) => (
          <Link key={stat.name} href={stat.href}>
            <div className={`${stat.color} rounded-lg shadow-md p-6 text-white transform transition-transform hover:scale-105`}>
              <h2 className="text-lg font-semibold mb-2">{stat.name}</h2>
              {stats.loading ? (
                <div className="animate-pulse h-8 rounded bg-white bg-opacity-30"></div>
              ) : (
                <p className="text-3xl font-bold">{stat.value.toLocaleString()}</p>
              )}
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          {stats.loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center">
                  <div className="h-8 w-8 rounded-full bg-gray-200 mr-3"></div>
                  <div className="h-4 w-full rounded bg-gray-200"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-600">
              <p className="mb-2">• User John Smith registered (2 hours ago)</p>
              <p className="mb-2">• Studio ABC updated their profile (5 hours ago)</p>
              <p className="mb-2">• New project "Summer Movie" created (1 day ago)</p>
              <p className="mb-2">• Casting call "Lead Role Needed" posted (1 day ago)</p>
              <p>• 3 new talents created profiles (2 days ago)</p>
            </div>
          )}
          <div className="mt-4">
            <Link href="/admin/logs" className="text-blue-600 hover:text-blue-800">
              View all activity →
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link 
              href="/admin/users/new" 
              className="block p-3 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 hover:border-gray-300"
            >
              Create New User
            </Link>
            <Link 
              href="/admin/studios/new" 
              className="block p-3 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 hover:border-gray-300"
            >
              Create New Studio
            </Link>
            <Link 
              href="/admin/settings" 
              className="block p-3 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 hover:border-gray-300"
            >
              System Settings
            </Link>
            <Link 
              href="/admin/backup" 
              className="block p-3 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 hover:border-gray-300"
            >
              Backup Database
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}