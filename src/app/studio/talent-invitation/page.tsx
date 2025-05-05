'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Badge, Button, Spinner, Alert, AlertDescription, AlertTitle } from '@/components/ui';

// Define types
type Talent = {
  id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  height?: string;
  weight?: string;
  hairColor?: string;
  eyeColor?: string;
  bio?: string;
  locations?: Array<{ id: string; name: string }>;
  skills?: Array<{ id: string; name: string }>;
  availability: boolean;
  headshotUrl?: string;
};

type SearchParams = {
  query: string;
  skills: string[];
  location: string;
  availability: boolean | null;
  hairColor: string;
  eyeColor: string;
};

export default function TalentInvitationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get invitation type and ID from URL parameters
  const invitationType = searchParams.get('type') || '';
  const invitationId = searchParams.get('id') || '';
  const invitationTitle = searchParams.get('title') || 'Invitation';
  
  // State for talent data
  const [talents, setTalents] = useState<Talent[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [skills, setSkills] = useState<Array<{ id: string; name: string }>>([]);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  
  // State for selection and invitation
  const [selectedTalents, setSelectedTalents] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [sendingInvitations, setSendingInvitations] = useState(false);
  const [invitationSuccess, setInvitationSuccess] = useState(false);
  const [invitationMessage, setInvitationMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Search parameters
  const [searchParams, setSearchParams] = useState<SearchParams>({
    query: '',
    skills: [],
    location: '',
    availability: null,
    hairColor: '',
    eyeColor: ''
  });
  
  // Fetch talent data
  const fetchTalents = async () => {
    setLoading(true);
    try {
      let url = `/api/studio/talent/search?limit=50&offset=${(page - 1) * 50}`;
      
      if (searchParams.query) {
        url += `&query=${encodeURIComponent(searchParams.query)}`;
      }
      
      searchParams.skills.forEach(skill => {
        url += `&skills=${encodeURIComponent(skill)}`;
      });
      
      if (searchParams.location) {
        url += `&location=${encodeURIComponent(searchParams.location)}`;
      }
      
      if (searchParams.availability !== null) {
        url += `&availability=${searchParams.availability}`;
      }
      
      if (searchParams.hairColor) {
        url += `&hairColor=${encodeURIComponent(searchParams.hairColor)}`;
      }
      
      if (searchParams.eyeColor) {
        url += `&eyeColor=${encodeURIComponent(searchParams.eyeColor)}`;
      }
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        
        // Process profiles
        const safeProfiles = (data.profiles || []).map((profile: any) => ({
          id: profile.id || '',
          userId: profile.userId || '',
          name: profile.name || '',
          email: profile.email || '',
          bio: profile.bio || '',
          gender: profile.gender || null,
          availability: profile.availability !== undefined ? profile.availability : true,
          skills: Array.isArray(profile.skills) ? profile.skills : [],
          locations: Array.isArray(profile.locations) ? profile.locations : [],
          imageUrl: profile.imageUrl || null,
          headshotUrl: profile.imageUrl || profile.headshotUrl || null,
          user: profile.user || { 
            firstName: profile.name?.split(' ')[0] || '',
            lastName: profile.name?.split(' ')[1] || '',
            email: profile.email || '' 
          }
        }));
        
        setTalents(safeProfiles);
        setTotalCount(data.totalCount || 0);
      } else {
        console.error('Failed to fetch talents');
        setError('Failed to load talent data');
      }
    } catch (error) {
      console.error('Error fetching talents:', error);
      setError('An error occurred while loading talent data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch reference data (skills and locations)
  const fetchReferenceData = async () => {
    try {
      // Fetch skills
      const skillsResponse = await fetch('/api/skills');
      if (skillsResponse.ok) {
        const skillsData = await skillsResponse.json();
        setSkills(skillsData);
      }
      
      // Fetch locations
      const locationsResponse = await fetch('/api/locations');
      if (locationsResponse.ok) {
        const locationsData = await locationsResponse.json();
        setLocations(locationsData);
      }
    } catch (error) {
      console.error('Error fetching reference data:', error);
    }
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({ ...prev, [name]: value }));
  };

  // Handle skill selection
  const handleSkillChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value && !searchParams.skills.includes(value)) {
      setSearchParams(prev => ({
        ...prev,
        skills: [...prev.skills, value]
      }));
    }
  };

  // Remove a skill from the search
  const removeSkill = (skill: string) => {
    setSearchParams(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  // Submit search form
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page
    fetchTalents();
  };

  // Reset search form
  const resetSearch = () => {
    setSearchParams({
      query: '',
      skills: [],
      location: '',
      availability: null,
      hairColor: '',
      eyeColor: ''
    });
    setPage(1);
  };

  // Handle page change
  const changePage = (newPage: number) => {
    setPage(newPage);
  };

  // Talent selection handlers
  const handleSelectTalent = (talentId: string, index: number, isShiftClick: boolean) => {
    setSelectedTalents(prevSelected => {
      const newSelected = new Set(prevSelected);
      
      if (isShiftClick && lastSelectedIndex !== null) {
        // If shift is pressed and we have a previous selection
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        
        // Select or deselect the range based on the current action
        const shouldSelect = !prevSelected.has(talentId);
        
        for (let i = start; i <= end; i++) {
          if (i < talents.length) {
            if (shouldSelect) {
              newSelected.add(talents[i].id);
            } else {
              newSelected.delete(talents[i].id);
            }
          }
        }
      } else {
        // Toggle selection for individual talent
        if (newSelected.has(talentId)) {
          newSelected.delete(talentId);
        } else {
          newSelected.add(talentId);
        }
      }
      
      // Update last selected index
      setLastSelectedIndex(index);
      
      return newSelected;
    });
  };

  // Select or deselect all talents
  const toggleSelectAll = () => {
    if (selectedTalents.size === talents.length) {
      // Deselect all
      setSelectedTalents(new Set());
    } else {
      // Select all
      const allIds = talents.map(talent => talent.id);
      setSelectedTalents(new Set(allIds));
    }
  };

  // Send invitations to selected talents
  const sendInvitations = async () => {
    if (selectedTalents.size === 0) {
      setError('Please select at least one talent to invite');
      return;
    }

    setSendingInvitations(true);
    setError(null);
    
    try {
      let endpoint = '';
      
      // Determine which API endpoint to use based on invitation type
      switch (invitationType) {
        case 'questionnaire':
          endpoint = `/api/studio/questionnaires/${invitationId}/invitations`;
          break;
        case 'casting-call':
          endpoint = `/api/studio/casting-calls/${invitationId}/invitations`;
          break;
        case 'project':
          endpoint = `/api/studio/projects/${invitationId}/invitations`;
          break;
        default:
          throw new Error('Invalid invitation type');
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          talentIds: Array.from(selectedTalents),
          message: invitationMessage
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send invitations');
      }
      
      setInvitationSuccess(true);
      
      // Clear selection after successful invitation
      setSelectedTalents(new Set());
      setInvitationMessage('');
      
      // Redirect back after success
      setTimeout(() => {
        let redirectUrl = '';
        switch (invitationType) {
          case 'questionnaire':
            redirectUrl = `/studio/questionnaires/${invitationId}`;
            break;
          case 'casting-call':
            redirectUrl = `/studio/casting-calls/${invitationId}`;
            break;
          case 'project':
            redirectUrl = `/studio/projects/${invitationId}`;
            break;
          default:
            redirectUrl = '/studio/dashboard';
        }
        router.push(redirectUrl);
      }, 2000);
      
    } catch (error) {
      console.error('Error sending invitations:', error);
      setError('Failed to send invitations. Please try again.');
    } finally {
      setSendingInvitations(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (status === 'authenticated') {
      fetchReferenceData();
      fetchTalents();
    } else if (status === 'unauthenticated') {
      router.push('/sign-in');
    }
  }, [status, page]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null; // Already redirecting to sign-in
  }

  if (!invitationType || !invitationId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Invalid invitation parameters. Please provide a valid invitation type and ID.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Invite Talent</h1>
          <p className="text-gray-600">Select talent to invite to: <span className="font-medium">{invitationTitle}</span></p>
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {invitationSuccess && (
        <Alert className="mb-6">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>
            Invitations have been sent successfully. Redirecting...
          </AlertDescription>
        </Alert>
      )}

      {/* Search Form */}
      <form onSubmit={handleSearch} className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              name="query"
              value={searchParams.query}
              onChange={handleSearchChange}
              placeholder="Name, email, or bio"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Skills
            </label>
            <select
              onChange={handleSkillChange}
              value=""
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a skill</option>
              {skills.map(skill => (
                <option key={skill.id} value={skill.name}>
                  {skill.name}
                </option>
              ))}
            </select>
            {searchParams.skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {searchParams.skills.map(skill => (
                  <span
                    key={skill}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <select
              name="location"
              value={searchParams.location}
              onChange={handleSearchChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Any location</option>
              {locations.map(location => (
                <option key={location.id} value={location.name}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hair Color
            </label>
            <input
              type="text"
              name="hairColor"
              value={searchParams.hairColor}
              onChange={handleSearchChange}
              placeholder="Any hair color"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Eye Color
            </label>
            <input
              type="text"
              name="eyeColor"
              value={searchParams.eyeColor}
              onChange={handleSearchChange}
              placeholder="Any eye color"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Availability
            </label>
            <select
              name="availability"
              value={searchParams.availability === null ? "" : searchParams.availability.toString()}
              onChange={(e) => {
                const value = e.target.value;
                setSearchParams(prev => ({
                  ...prev,
                  availability: value === "" ? null : value === "true"
                }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Any availability</option>
              <option value="true">Available</option>
              <option value="false">Not available</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Search
            </button>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            <span className="font-medium">{selectedTalents.size}</span> of <span className="font-medium">{talents.length}</span> talents selected
          </div>
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetSearch}
            >
              Reset Filters
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
            >
              {selectedTalents.size === talents.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        </div>
      </form>

      {/* Talent Selection Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow mb-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="pl-6 pr-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={selectedTalents.size === talents.length && talents.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Talent
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Skills
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Availability
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {talents.length > 0 ? (
              talents.map((talent, index) => (
                <tr 
                  key={talent.id} 
                  className={`${selectedTalents.has(talent.id) ? 'bg-blue-50' : 'hover:bg-gray-50'} cursor-pointer`}
                  onClick={(e) => handleSelectTalent(talent.id, index, e.shiftKey)}
                >
                  <td className="pl-6 pr-3 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedTalents.has(talent.id)}
                      onChange={(e) => {
                        // Prevent the row click event from firing
                        e.stopPropagation();
                        handleSelectTalent(talent.id, index, false);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {talent.headshotUrl ? (
                        <img 
                          className="h-10 w-10 rounded-full mr-3"
                          src={talent.headshotUrl}
                          alt={`${talent.user.firstName} ${talent.user.lastName}`}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 mr-3 flex items-center justify-center text-gray-500">
                          {talent.user.firstName.charAt(0)}{talent.user.lastName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {talent.user.firstName} {talent.user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {talent.user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {talent.skills && talent.skills.length > 0 ? (
                        talent.skills.slice(0, 3).map(skill => (
                          <Badge
                            key={skill.id}
                            variant="secondary"
                            className="text-xs"
                          >
                            {skill.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                      {talent.skills && talent.skills.length > 3 && (
                        <Badge
                          variant="outline"
                          className="text-xs"
                        >
                          +{talent.skills.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {talent.locations && talent.locations.length > 0
                        ? talent.locations.map(loc => loc.name).join(', ')
                        : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        talent.availability
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {talent.availability ? 'Available' : 'Not available'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  No talent found matching your search criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {talents.length > 0 && (
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{(page - 1) * 50 + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(page * 50, totalCount)}
            </span>{' '}
            of <span className="font-medium">{totalCount}</span> results
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => changePage(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => changePage(page + 1)}
              disabled={page * 50 >= totalCount}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Invitation Form */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Invitation Details</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Invitation Message (optional)
          </label>
          <textarea
            rows={4}
            placeholder="Add a personal message to your invitation..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={invitationMessage}
            onChange={(e) => setInvitationMessage(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
          <div className="text-sm text-gray-500">
            {selectedTalents.size} {selectedTalents.size === 1 ? 'talent' : 'talents'} selected
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              disabled={selectedTalents.size === 0 || sendingInvitations}
              onClick={sendInvitations}
            >
              {sendingInvitations ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Sending...
                </>
              ) : (
                `Send ${selectedTalents.size > 0 ? selectedTalents.size : ''} Invitation${selectedTalents.size !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}