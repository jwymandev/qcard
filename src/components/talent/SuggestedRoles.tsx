'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Card,
  Spinner,
  Badge,
  Button,
  Alert,
  AlertDescription,
} from '@/components/ui';

interface Role {
  id: string;
  title: string;
  description?: string;
  gender?: string;
  ageRange?: string;
  skills?: string;
  survey?: any;
  requirements?: string;
}

interface SuggestedRole {
  id: string;
  projectId: string;
  projectTitle: string;
  studioId: string;
  studioName: string;
  role: Role;
  matchScore: number;
  matchReasons: string[];
  type: 'requirement' | 'castingCall';
  location?: {
    id: string;
    name: string;
  } | null;
  locations?: {
    id?: string;
    name?: string;
  }[];
}

interface Region {
  id: string;
  name: string;
}

export default function SuggestedRoles() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestedRoles, setSuggestedRoles] = useState<SuggestedRole[]>([]);
  const [subscribedRegions, setSubscribedRegions] = useState<Region[]>([]);
  const [noSubscriptions, setNoSubscriptions] = useState(false);

  useEffect(() => {
    fetchSuggestedRoles();
  }, []);

  const fetchSuggestedRoles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/talent/suggested-roles');
      
      if (!response.ok) {
        throw new Error('Failed to fetch suggested roles');
      }
      
      const data = await response.json();
      
      // Check if there's a message about no subscriptions
      if (data.message && data.message.includes('No active region subscriptions')) {
        setNoSubscriptions(true);
        setSuggestedRoles([]);
      } else {
        setSuggestedRoles(data.suggestedRoles || []);
        setNoSubscriptions(false);
      }
      
      setSubscribedRegions(data.subscribedRegions || []);
    } catch (error) {
      console.error('Error fetching suggested roles:', error);
      setError('Unable to load suggested roles. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (noSubscriptions) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-2">Subscribe to Find Roles</h3>
        <p className="text-gray-600 mb-4">
          You don&apos;t have any active region subscriptions. Subscribe to regions to see casting opportunities near you.
        </p>
        <Link href="/subscription">
          <Button>Subscribe Now</Button>
        </Link>
      </Card>
    );
  }

  if (suggestedRoles.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-2">No Suggested Roles Yet</h3>
        <p className="text-gray-600 mb-2">
          We don&apos;t have any roles that match your profile right now.
        </p>
        <p className="text-gray-600 mb-4">
          Complete your profile with more details to improve matching, or check back later for new opportunities.
        </p>
        <div className="flex space-x-3">
          <Link href="/talent/profile">
            <Button variant="outline">Update Profile</Button>
          </Link>
          <Link href="/opportunities">
            <Button>Browse All Opportunities</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Suggested Roles</h3>
        <Link href="/opportunities">
          <Button variant="outline" size="sm">View All Opportunities</Button>
        </Link>
      </div>
      
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {suggestedRoles.slice(0, 4).map((role) => (
          <Card key={role.id} className="p-4 flex flex-col h-full">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold">{role.role.title}</h4>
                <p className="text-sm text-gray-500">{role.studioName}</p>
              </div>
              <Badge className="bg-green-100 text-green-800">
                {role.matchScore}% Match
              </Badge>
            </div>
            
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
              {role.role.description || role.role.requirements || 'No description provided.'}
            </p>
            
            <div className="mt-2 mb-3">
              <div className="flex flex-wrap gap-1 text-xs">
                {role.matchReasons.map((reason, index) => (
                  <Badge key={index} variant="outline" className="text-xs bg-blue-50">
                    {reason}
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Display location if available */}
            {(role.location || (role.locations && role.locations.length > 0)) && (
              <p className="text-xs text-gray-500 mt-1">
                <span className="font-semibold">Location: </span>
                {role.location?.name || role.locations?.map(l => l.name).join(', ')}
              </p>
            )}
            
            {/* Role details if available */}
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-600">
              {role.role.gender && (
                <>
                  <span>Gender:</span>
                  <span>{role.role.gender}</span>
                </>
              )}
              
              {role.role.ageRange && (
                <>
                  <span>Age Range:</span>
                  <span>{role.role.ageRange}</span>
                </>
              )}
            </div>
            
            <div className="mt-auto pt-4 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500">
                  Project: {role.projectTitle}
                </p>
              </div>
              
              <Link 
                href={role.type === 'castingCall' 
                  ? `/opportunities/${role.id}`
                  : `/studio/projects/${role.projectId}`}
              >
                <Button size="sm">View Details</Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
      
      {suggestedRoles.length > 4 && (
        <div className="text-center mt-4">
          <Link href="/opportunities">
            <Button variant="outline">
              View {suggestedRoles.length - 4} More Suggested Roles
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}