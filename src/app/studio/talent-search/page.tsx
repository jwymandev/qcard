'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

export default function TalentSearchPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [talents, setTalents] = useState<Talent[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [skills, setSkills] = useState<Array<{ id: string; name: string }>>([]);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  
  // Search parameters
  const [searchParams, setSearchParams] = useState<SearchParams>({
    query: '',
    skills: [],
    location: '',
    availability: null,
    hairColor: '',
    eyeColor: ''
  });
  
  // Column visibility state
  const [columns, setColumns] = useState({
    name: true,
    email: true,
    height: true,
    weight: true,
    hairColor: true,
    eyeColor: true,
    locations: true,
    skills: true,
    availability: true
  });

  // Fetch talent data
  const fetchTalents = async () => {
    setLoading(true);
    try {
      let url = `/api/studio/talent/search?limit=20&offset=${(page - 1) * 20}`;
      
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
        console.log('Raw talent data:', data);
        
        // Make sure profiles exist and handle each talent to ensure it has required fields
        const safeProfiles = (data.profiles || []).map((profile: any) => ({
          id: profile.id || '',
          userId: profile.userId || '',
          name: profile.name || '',
          email: profile.email || '',
          bio: profile.bio || '',
          age: profile.age || null,
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
      }
    } catch (error) {
      console.error('Error fetching talents:', error);
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

  // Toggle column visibility
  const toggleColumn = (column: keyof typeof columns) => {
    setColumns(prev => ({
      ...prev,
      [column]: !prev[column]
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

  // Send message to talent
  const sendMessage = (talentId: string) => {
    router.push(`/studio/messages/new?recipientId=${talentId}`);
  };

  // Add talent to project
  const addToProject = (talentId: string) => {
    router.push(`/studio/projects?addTalent=${talentId}`);
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
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Talent Search</h1>
        <div className="space-x-2">
          <button
            onClick={() => {
              const allColumnsVisible = Object.values(columns).every(Boolean);
              const newState = !allColumnsVisible;
              setColumns({
                name: newState,
                email: newState,
                height: newState,
                weight: newState,
                hairColor: newState,
                eyeColor: newState,
                locations: newState,
                skills: newState,
                availability: newState
              });
            }}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            {Object.values(columns).every(Boolean) ? 'Hide All' : 'Show All'}
          </button>
          <button
            onClick={resetSearch}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            Reset
          </button>
        </div>
      </div>

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
        
        {/* Column Visibility Controls */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="text-sm font-medium text-gray-700">Show columns:</span>
          {Object.entries(columns).map(([key, value]) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleColumn(key as keyof typeof columns)}
              className={`px-2 py-1 text-xs rounded-full ${
                value 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>
      </form>

      {/* Results Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.name && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
              )}
              {columns.email && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
              )}
              {columns.height && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Height
                </th>
              )}
              {columns.weight && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Weight
                </th>
              )}
              {columns.hairColor && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hair
                </th>
              )}
              {columns.eyeColor && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Eyes
                </th>
              )}
              {columns.locations && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Locations
                </th>
              )}
              {columns.skills && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Skills
                </th>
              )}
              {columns.availability && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Available
                </th>
              )}
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {talents.length > 0 ? (
              talents.map((talent) => (
                <tr key={talent.id} className="hover:bg-gray-50">
                  {columns.name && (
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
                        </div>
                      </div>
                    </td>
                  )}
                  {columns.email && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{talent.user.email}</div>
                    </td>
                  )}
                  {columns.height && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{talent.height || '-'}</div>
                    </td>
                  )}
                  {columns.weight && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{talent.weight || '-'}</div>
                    </td>
                  )}
                  {columns.hairColor && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{talent.hairColor || '-'}</div>
                    </td>
                  )}
                  {columns.eyeColor && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{talent.eyeColor || '-'}</div>
                    </td>
                  )}
                  {columns.locations && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {talent.locations && talent.locations.length > 0
                          ? talent.locations.map(loc => loc.name).join(', ')
                          : '-'}
                      </div>
                    </td>
                  )}
                  {columns.skills && (
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {talent.skills && talent.skills.length > 0 ? (
                          talent.skills.map(skill => (
                            <span
                              key={skill.id}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {skill.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </div>
                    </td>
                  )}
                  {columns.availability && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          talent.availability
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {talent.availability ? 'Yes' : 'No'}
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => sendMessage(talent.id)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Message
                      </button>
                      <button
                        onClick={() => addToProject(talent.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Add to Project
                      </button>
                      <Link
                        href={`/studio/talent/${talent.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={Object.values(columns).filter(Boolean).length + 1}
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  No talent found matching your search criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {talents.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{(page - 1) * 20 + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(page * 20, totalCount)}
            </span>{' '}
            of <span className="font-medium">{totalCount}</span> results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => changePage(page - 1)}
              disabled={page === 1}
              className={`px-3 py-1 rounded ${
                page === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              Previous
            </button>
            <button
              onClick={() => changePage(page + 1)}
              disabled={page * 20 >= totalCount}
              className={`px-3 py-1 rounded ${
                page * 20 >= totalCount
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}