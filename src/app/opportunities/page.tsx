'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Badge, Spinner, Card, Button } from '@/components/ui';
import SuggestedRoles from '@/components/talent/SuggestedRoles';

// Types for casting calls
interface CastingCall {
  id: string;
  title: string;
  description: string;
  requirements?: string;
  compensation?: string;
  startDate?: string;
  endDate?: string;
  status: string;
  location?: {
    id: string;
    name: string;
    region?: {
      id: string;
      name: string;
    };
  };
  skills: {
    id: string;
    name: string;
  }[];
  studio: {
    id: string;
    name: string;
  };
  project?: {
    id: string;
    title: string;
  };
  application?: {
    id: string;
    status: string;
  } | null;
  createdAt: string;
}

interface Location {
  id: string;
  name: string;
}

export default function OpportunitiesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<CastingCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  // State for region filter
  const [showSubscribedOnly, setShowSubscribedOnly] = useState(true);
  const [subscribedRegions, setSubscribedRegions] = useState<string[]>([]);

  // Fetch casting calls
  useEffect(() => {
    if (status === 'authenticated') {
      fetchOpportunities();
      fetchLocations();
    }
  }, [status, selectedLocation, dateFilter, showSubscribedOnly]);
  
  // Fetch locations for filtering
  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations');
      if (response.ok) {
        const data = await response.json();
        setLocations(data);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  // Fetch user's subscribed regions
  const fetchSubscribedRegions = async () => {
    try {
      const response = await fetch('/api/talent/suggested-roles');
      if (response.ok) {
        const data = await response.json();
        if (data.subscribedRegions && Array.isArray(data.subscribedRegions)) {
          setSubscribedRegions(data.subscribedRegions.map((region: any) => region.id));
        }
      }
    } catch (error) {
      console.error('Error fetching subscribed regions:', error);
    }
  };

  // Fetch casting calls with filters
  const fetchOpportunities = async () => {
    try {
      setLoading(true);

      // Fetch subscribed regions if we don't have them yet
      if (subscribedRegions.length === 0) {
        await fetchSubscribedRegions();
      }

      // Build URL with filter parameters
      let url = '/api/talent/casting-calls';
      const params = new URLSearchParams();

      if (selectedLocation) {
        params.append('locationId', selectedLocation);
      }

      // Handle date filtering
      if (dateFilter) {
        const today = new Date();
        let filterDate = new Date();

        switch (dateFilter) {
          case '7days':
            filterDate.setDate(today.getDate() + 7);
            break;
          case '30days':
            filterDate.setDate(today.getDate() + 30);
            break;
          case '90days':
            filterDate.setDate(today.getDate() + 90);
            break;
        }

        params.append('startDate', today.toISOString());
        params.append('endDate', filterDate.toISOString());
      }

      // Add filter for region subscriptions
      if (showSubscribedOnly && subscribedRegions.length > 0) {
        params.append('regionIds', subscribedRegions.join(','));
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        setOpportunities(data);
      } else {
        console.error('Failed to fetch opportunities');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/sign-in');
    }
  }, [status, router]);
  
  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
      </div>
    );
  }
  
  // Only render content if authenticated
  if (status !== 'authenticated') {
    return null;
  }
  
  // Format date range
  const formatDateRange = (startDate?: string, endDate?: string) => {
    if (!startDate && !endDate) return 'Flexible dates';
    
    const formatDate = (dateStr?: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    
    if (startDate && endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    } else if (startDate) {
      return `From ${formatDate(startDate)}`;
    } else if (endDate) {
      return `Until ${formatDate(endDate)}`;
    }
    
    return 'Dates not specified';
  };
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Casting Opportunities</h1>

      {/* Suggested Roles Section */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Recommended For You</h2>
        <SuggestedRoles />
      </Card>

      <h2 className="text-xl font-semibold mb-4">All Opportunities</h2>

      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-gray-600">{opportunities.length} opportunities found</span>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          {/* Note: The following checkbox is subscription-restricted because it filters by subscribed regions */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="subscribedOnly"
              checked={showSubscribedOnly}
              onChange={(e) => setShowSubscribedOnly(e.target.checked)}
              className="mr-2 h-4 w-4"
            />
            <label htmlFor="subscribedOnly" className="text-sm text-gray-700">
              Show subscribed regions only
            </label>
          </div>

          {/* Location filter - accessible to all users */}
          <select
            className="border rounded px-3 py-1"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            <option value="">All Locations</option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>

          {/* Date filter - accessible to all users */}
          <select
            className="border rounded px-3 py-1"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="">All Dates</option>
            <option value="7days">Next 7 Days</option>
            <option value="30days">Next 30 Days</option>
            <option value="90days">Next 90 Days</option>
          </select>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center my-12">
          <Spinner />
        </div>
      ) : opportunities.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-gray-500">No casting opportunities found.</p>
          <p className="text-gray-500 mt-2">Check back later or adjust your filters.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {opportunities.map((opportunity) => (
            <div key={opportunity.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold">{opportunity.title}</h2>
                  <div className="flex flex-wrap gap-2 text-sm text-gray-600 mt-1">
                    <div>{opportunity.studio.name}</div>
                    {opportunity.location && (
                      <div>{opportunity.location.name}</div>
                    )}
                    <div>{formatDateRange(opportunity.startDate, opportunity.endDate)}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  {opportunity.compensation && (
                    <div className="text-lg font-medium text-green-600">
                      {opportunity.compensation}
                    </div>
                  )}
                  <div className="flex gap-2 mt-1">
                    {opportunity.location && opportunity.location.region && (
                      subscribedRegions.includes(opportunity.location.region.id) ? (
                        <Badge variant="success">
                          ✓ {opportunity.location.region.name}
                        </Badge>
                      ) : (
                        <Link href={`/subscription?regionId=${opportunity.location.region.id}`}>
                          <Badge variant="secondary" className="cursor-pointer hover:bg-gray-300">
                            Subscribe to {opportunity.location.region.name}
                          </Badge>
                        </Link>
                      )
                    )}
                    {opportunity.application && (
                      <Badge variant={
                        opportunity.application.status === "APPROVED" ? "success" :
                        opportunity.application.status === "REJECTED" ? "destructive" :
                        "outline"
                      }>
                        {opportunity.application.status === "PENDING" ? "Applied" :
                         opportunity.application.status === "APPROVED" ? "Approved" : "Rejected"}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <p className="mt-4 text-gray-700 line-clamp-2">{opportunity.description}</p>
              
              {opportunity.skills.length > 0 && (
                <div className="mt-3">
                  <div className="flex flex-wrap gap-1">
                    {opportunity.skills.map(skill => (
                      <Badge key={skill.id} variant="secondary">{skill.name}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-4 flex justify-end">
                <Link 
                  href={`/opportunities/${opportunity.id}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  {opportunity.application ? 'View Application' : 'View Details'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-8 text-center">
        <Link 
          href="/dashboard"
          className="text-blue-600 hover:text-blue-800"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}