'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } else {
    // For older dates, return formatted date
    return date.toLocaleDateString();
  }
}

interface ActivityItem {
  type: string;
  id: string;
  description: string;
  time: string;
}

interface StatsData {
  users: number;
  studios: number;
  talents: number;
  projects: number;
  castingCalls: number;
  recentActivity: ActivityItem[];
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
    recentActivity: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/admin/stats');
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        setStats({
          users: data.users,
          studios: data.studios,
          talents: data.talents,
          projects: data.projects,
          castingCalls: data.castingCalls,
          recentActivity: data.recentActivity || [],
          loading: false,
          error: null,
        });
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
          ) : stats.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="text-gray-600">
              {stats.recentActivity.map((activity, index) => (
                <p key={activity.id} className={index < stats.recentActivity.length - 1 ? "mb-2" : ""}>
                  • {activity.description} ({formatTimeAgo(new Date(activity.time))})
                </p>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No recent activity found.</p>
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