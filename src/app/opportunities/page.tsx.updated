'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Badge, Spinner } from '@/components/ui';

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
    } | null;
  };
  region?: {
    id: string;
    name: string;
  } | null;
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
  region?: {
    id: string;
    name: string;
  } | null;
}

interface Region {
  id: string;
  name: string;
  description?: string;
}

export default function OpportunitiesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<CastingCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [usingRegionFilter, setUsingRegionFilter] = useState(false);
  const [talentRegions, setTalentRegions] = useState<Region[]>([]);
  const [showAllRegions, setShowAllRegions] = useState(false);
  
  // Fetch casting calls
  useEffect(() => {
    if (status === 'authenticated') {
      fetchRegions();
      fetchLocations();
    }
  }, [status]);
  
  useEffect(() => {
    if (status === 'authenticated') {
      fetchOpportunities();
    }
  }, [status, selectedLocation, selectedRegion, dateFilter, showAllRegions]);
  
  // Fetch regions for filtering
  const fetchRegions = async () => {
    try {
      const response = await fetch('/api/regions');
      if (response.ok) {
        const data = await response.json();
        setRegions(data);
      }
    } catch (error) {
      console.error('Error fetching regions:', error);
    }
  };
  
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
  
  // Fetch casting calls with filters
  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      
      // Build URL with filter parameters
      let url = '/api/talent/casting-calls';
      const params = new URLSearchParams();
      
      if (selectedLocation) {
        params.append('locationId', selectedLocation);
      }
      
      if (selectedRegion) {
        params.append('regionId', selectedRegion);
      }
      
      if (showAllRegions) {
        params.append('showAllRegions', 'true');
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
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        setOpportunities(data.castingCalls || data);
        
        // If the API returns talent's regions and filter information
        if (data.talentRegions) {
          setTalentRegions(data.talentRegions);
        }
        if (data.usingRegionFilter !== undefined) {
          setUsingRegionFilter(data.usingRegionFilter);
        }
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
      
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
          <div>
            <span className="text-gray-600">{opportunities.length} opportunities found</span>
            {usingRegionFilter && talentRegions.length > 0 && (
              <div className="mt-1 text-sm text-blue-600">
                Showing opportunities in your preferred regions. 
                <button 
                  onClick={() => setShowAllRegions(!showAllRegions)}
                  className="ml-2 underline focus:outline-none"
                >
                  {showAllRegions ? 'Show only my regions' : 'Show all regions'}
                </button>
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <select 
              className="border rounded px-3 py-1"
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value);
                // Clear location selection if a region is selected
                if (e.target.value) {
                  setSelectedLocation('');
                }
              }}
            >
              <option value="">All Regions</option>
              {regions.map(region => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
            
            <select 
              className="border rounded px-3 py-1"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              disabled={!!selectedRegion}
            >
              <option value="">All Locations</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
            
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
                    {opportunity.region && (
                      <div className="text-blue-600">{opportunity.region.name}</div>
                    )}
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
                  {opportunity.application && (
                    <Badge className="mt-1" variant={
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