'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Talent {
  id: string;
  userId: string;
  name: string;
  headshotUrl: string | null;
  bio: string | null;
  gender: string | null;
  age: string | null;
  height: string | null;
  weight: string | null;
  hairColor: string | null;
  eyeColor: string | null;
  ethnicity: string | null;
  skills: string[];
  locations: string[];
  availability: boolean;
  createdAt: string;
}

export default function TalentsPage() {
  const [talents, setTalents] = useState<Talent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');

  useEffect(() => {
    async function fetchTalents() {
      try {
        // In a real implementation, you would fetch talents from your API
        // const response = await fetch('/api/admin/talents');
        // const data = await response.json();
        
        // For now, just simulate talents with timeout
        setTimeout(() => {
          const sampleTalents = [
            { 
              id: '1', 
              userId: 'user1',
              name: 'John Doe', 
              headshotUrl: 'https://randomuser.me/api/portraits/men/1.jpg',
              bio: 'Experienced actor with 10 years in film and television.',
              gender: 'Male',
              age: '35-45',
              height: '6\'0"',
              weight: '180 lbs',
              hairColor: 'Brown',
              eyeColor: 'Blue',
              ethnicity: 'Caucasian',
              skills: ['Acting', 'Voiceover', 'Stunt Work'],
              locations: ['Los Angeles', 'New York'],
              availability: true,
              createdAt: '2023-01-01T00:00:00Z',
            },
            { 
              id: '2', 
              userId: 'user2',
              name: 'Jane Smith', 
              headshotUrl: 'https://randomuser.me/api/portraits/women/1.jpg',
              bio: 'Up and coming actress with theater background.',
              gender: 'Female',
              age: '25-35',
              height: '5\'6"',
              weight: '130 lbs',
              hairColor: 'Blonde',
              eyeColor: 'Green',
              ethnicity: 'Caucasian',
              skills: ['Acting', 'Dancing', 'Singing'],
              locations: ['Los Angeles'],
              availability: true,
              createdAt: '2023-01-02T00:00:00Z',
            },
            { 
              id: '3', 
              userId: 'user3',
              name: 'Michael Johnson', 
              headshotUrl: 'https://randomuser.me/api/portraits/men/2.jpg',
              bio: 'Character actor specializing in comedy roles.',
              gender: 'Male',
              age: '40-50',
              height: '5\'9"',
              weight: '160 lbs',
              hairColor: 'Black',
              eyeColor: 'Brown',
              ethnicity: 'African American',
              skills: ['Acting', 'Comedy', 'Improv'],
              locations: ['New York'],
              availability: false,
              createdAt: '2023-01-03T00:00:00Z',
            },
          ];
          
          setTalents(sampleTalents);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching talents:', error);
        setError('Failed to load talents');
        setLoading(false);
      }
    }

    fetchTalents();
  }, []);

  // Get unique skills for filter dropdown
  const uniqueSkills = Array.from(new Set(talents.flatMap(talent => talent.skills)));

  // Filter talents based on search term, skill filter, and availability filter
  const filteredTalents = talents.filter(talent => {
    const matchesSearch = 
      talent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (talent.bio && talent.bio.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSkill = skillFilter === '' || talent.skills.includes(skillFilter);
    
    const matchesAvailability = 
      availabilityFilter === 'all' || 
      (availabilityFilter === 'available' && talent.availability) ||
      (availabilityFilter === 'unavailable' && !talent.availability);
    
    return matchesSearch && matchesSkill && matchesAvailability;
  });

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4 md:mb-0">Talent Management</h1>
        <Link 
          href="/admin/users/new?type=TALENT" 
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          Add New Talent
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search talents..."
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <svg
                className="h-5 w-5 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <select
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
            >
              <option value="">All Skills</option>
              {uniqueSkills.map(skill => (
                <option key={skill} value={skill}>{skill}</option>
              ))}
            </select>
            
            <select
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
            >
              <option value="all">All Availability</option>
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>
        </div>

        {/* Talent Grid */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="border rounded-lg p-4 animate-pulse">
                <div className="flex items-center">
                  <div className="rounded-full bg-gray-200 h-12 w-12 mr-4"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="mt-4 h-24 bg-gray-200 rounded"></div>
                <div className="mt-4 flex flex-wrap gap-1">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="h-6 bg-gray-200 rounded w-16"></div>
                  ))}
                </div>
              </div>
            ))
          ) : error ? (
            <div className="col-span-3 bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
              {error}
            </div>
          ) : filteredTalents.length === 0 ? (
            <div className="col-span-3 text-center py-8 text-gray-500">
              No talents found matching your search criteria.
            </div>
          ) : (
            filteredTalents.map((talent) => (
              <Link key={talent.id} href={`/admin/talents/${talent.id}`}>
                <div className="border rounded-lg p-5 hover:shadow-md transition-shadow h-full flex flex-col">
                  <div className="flex items-center mb-4">
                    <div className="mr-4 flex-shrink-0">
                      {talent.headshotUrl ? (
                        <img 
                          src={talent.headshotUrl} 
                          alt={talent.name} 
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                          {talent.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">{talent.name}</h2>
                      <div className="flex items-center text-sm text-gray-500">
                        {talent.gender && <span className="mr-2">{talent.gender}</span>}
                        {talent.age && <span>{talent.age}</span>}
                      </div>
                    </div>
                  </div>
                  
                  {talent.bio && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{talent.bio}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-1 mt-auto">
                    {talent.skills.slice(0, 3).map((skill, index) => (
                      <span 
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {skill}
                      </span>
                    ))}
                    {talent.skills.length > 3 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        +{talent.skills.length - 3} more
                      </span>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      {new Date(talent.createdAt).toLocaleDateString()}
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      talent.availability 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {talent.availability ? 'Available' : 'Unavailable'}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}