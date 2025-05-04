'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface TalentDetail {
  id: string;
  userId: string;
  name: string;
  headshotUrl: string | null;
  profileImages: { id: string; url: string; isPrimary: boolean }[];
  bio: string | null;
  gender: string | null;
  age: string | null;
  height: string | null;
  weight: string | null;
  hairColor: string | null;
  eyeColor: string | null;
  ethnicity: string | null;
  experience: string | null;
  languages: string | null;
  skills: string[];
  locations: string[];
  availability: boolean;
  createdAt: string;
  updatedAt: string;
  applications: {
    id: string;
    status: string;
    castingCallTitle: string;
    studioName: string;
    appliedAt: string;
  }[];
  castings: {
    id: string;
    role: string;
    projectTitle: string;
    sceneName: string;
    studioName: string;
  }[];
}

export default function TalentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const talentId = params.id as string;
  
  const [talent, setTalent] = useState<TalentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    async function fetchTalent() {
      try {
        // In a real implementation, fetch from API
        // const response = await fetch(`/api/admin/talents/${talentId}`);
        // const data = await response.json();
        
        // For now, simulate API response
        setTimeout(() => {
          if (talentId === '404') {
            setError('Talent not found');
            setLoading(false);
            return;
          }
          
          // Simulate talent data
          const talentData: TalentDetail = {
            id: talentId,
            userId: 'user1',
            name: 'John Doe',
            headshotUrl: 'https://randomuser.me/api/portraits/men/1.jpg',
            profileImages: [
              { id: 'img1', url: 'https://randomuser.me/api/portraits/men/1.jpg', isPrimary: true },
              { id: 'img2', url: 'https://randomuser.me/api/portraits/men/10.jpg', isPrimary: false },
              { id: 'img3', url: 'https://randomuser.me/api/portraits/men/15.jpg', isPrimary: false },
            ],
            bio: 'Experienced actor with 10 years in film and television. Specializing in dramatic roles and character work. Have worked on indie films and commercials across the US.',
            gender: 'Male',
            age: '35-45',
            height: '6\'0"',
            weight: '180 lbs',
            hairColor: 'Brown',
            eyeColor: 'Blue',
            ethnicity: 'Caucasian',
            experience: '10+ years in film and television, 5 years in commercials',
            languages: 'English (Native), Spanish (Conversational)',
            skills: ['Acting', 'Voiceover', 'Stunt Work', 'Horseback Riding', 'Stage Combat'],
            locations: ['Los Angeles', 'New York'],
            availability: true,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-04-15T00:00:00Z',
            applications: [
              { 
                id: 'app1', 
                status: 'PENDING', 
                castingCallTitle: 'Lead Role in Drama Series', 
                studioName: 'ABC Studios',
                appliedAt: '2023-03-15T00:00:00Z',
              },
              { 
                id: 'app2', 
                status: 'ACCEPTED', 
                castingCallTitle: 'Supporting Character in Film', 
                studioName: 'XYZ Productions',
                appliedAt: '2023-02-20T00:00:00Z',
              },
              { 
                id: 'app3', 
                status: 'REJECTED', 
                castingCallTitle: 'Commercial Spot', 
                studioName: 'Ad Agency',
                appliedAt: '2023-01-10T00:00:00Z',
              },
            ],
            castings: [
              {
                id: 'casting1',
                role: 'Detective',
                projectTitle: 'Crime Drama',
                sceneName: 'Interrogation Scene',
                studioName: 'ABC Studios',
              },
              {
                id: 'casting2',
                role: 'Neighbor',
                projectTitle: 'Suburban Comedy',
                sceneName: 'Backyard BBQ',
                studioName: 'XYZ Productions',
              },
            ],
          };
          
          setTalent(talentData);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching talent details:', error);
        setError('Failed to load talent details');
        setLoading(false);
      }
    }

    fetchTalent();
  }, [talentId]);

  const handleDeleteTalent = () => {
    if (window.confirm('Are you sure you want to delete this talent? This action cannot be undone.')) {
      // In a real implementation, call API
      alert('Talent deletion functionality would go here.');
      router.push('/admin/talents');
    }
  };

  const handleToggleAvailability = () => {
    if (!talent) return;
    
    const newAvailability = !talent.availability;
    const action = newAvailability ? 'mark as available' : 'mark as unavailable';
    
    if (window.confirm(`Are you sure you want to ${action} this talent?`)) {
      // In a real implementation, call API
      setTalent({ ...talent, availability: newAvailability });
      alert(`Talent ${action} successfully`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !talent) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
        <p>{error || 'Talent not found'}</p>
        <Link href="/admin/talents" className="text-red-700 font-medium underline mt-2 inline-block">
          Return to talents list
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Link 
            href="/admin/talents"
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            ← Back to Talents
          </Link>
          <h1 className="text-2xl font-semibold text-gray-800 mt-2">{talent.name}</h1>
        </div>
        <div className="flex space-x-3">
          <Link
            href={`/admin/talents/${talentId}/edit`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Edit Talent
          </Link>
          <button
            onClick={handleDeleteTalent}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
          >
            Delete Talent
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column - Profile info */}
        <div className="md:col-span-2">
          {/* Tab navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-6">
              <button
                onClick={() => setActiveTab('details')}
                className={`${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Profile Details
              </button>
              <button
                onClick={() => setActiveTab('applications')}
                className={`${
                  activeTab === 'applications'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Applications
              </button>
              <button
                onClick={() => setActiveTab('castings')}
                className={`${
                  activeTab === 'castings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Castings
              </button>
              <button
                onClick={() => setActiveTab('media')}
                className={`${
                  activeTab === 'media'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Media
              </button>
            </nav>
          </div>

          {/* Tab content */}
          {activeTab === 'details' && (
            <div className="bg-white shadow overflow-hidden rounded-lg">
              <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Talent Profile</h3>
              </div>
              <div className="border-t border-gray-200">
                <dl>
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Full name</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{talent.name}</dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Bio</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{talent.bio || '-'}</dd>
                  </div>
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Gender</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{talent.gender || '-'}</dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Age Range</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{talent.age || '-'}</dd>
                  </div>
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Height</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{talent.height || '-'}</dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Weight</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{talent.weight || '-'}</dd>
                  </div>
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Hair Color</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{talent.hairColor || '-'}</dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Eye Color</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{talent.eyeColor || '-'}</dd>
                  </div>
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Ethnicity</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{talent.ethnicity || '-'}</dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Experience</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{talent.experience || '-'}</dd>
                  </div>
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Languages</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{talent.languages || '-'}</dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Skills</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      <div className="flex flex-wrap gap-1">
                        {talent.skills.length === 0 ? (
                          <span>-</span>
                        ) : (
                          talent.skills.map((skill, index) => (
                            <span 
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {skill}
                            </span>
                          ))
                        )}
                      </div>
                    </dd>
                  </div>
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Locations</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      <div className="flex flex-wrap gap-1">
                        {talent.locations.length === 0 ? (
                          <span>-</span>
                        ) : (
                          talent.locations.map((location, index) => (
                            <span 
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                            >
                              {location}
                            </span>
                          ))
                        )}
                      </div>
                    </dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Availability</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        talent.availability 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {talent.availability ? 'Available' : 'Unavailable'}
                      </span>
                      <button
                        onClick={handleToggleAvailability}
                        className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                      >
                        Toggle
                      </button>
                    </dd>
                  </div>
                  <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Created at</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {new Date(talent.createdAt).toLocaleString()}
                    </dd>
                  </div>
                  <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Updated at</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {new Date(talent.updatedAt).toLocaleString()}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {activeTab === 'applications' && (
            <div className="bg-white shadow overflow-hidden rounded-lg">
              <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Applications</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {talent.applications.length} Total
                </span>
              </div>
              <div className="divide-y divide-gray-200">
                {talent.applications.length === 0 ? (
                  <div className="px-4 py-5 text-center text-gray-500">
                    No applications found for this talent.
                  </div>
                ) : (
                  talent.applications.map((application) => (
                    <div key={application.id} className="px-4 py-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <Link 
                            href={`/admin/casting-calls/${application.id}`} 
                            className="text-md font-medium text-gray-900 hover:text-blue-600"
                          >
                            {application.castingCallTitle}
                          </Link>
                          <div className="text-sm text-gray-500 mt-1">
                            Studio: {application.studioName}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Applied: {new Date(application.appliedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${application.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' : 
                            application.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'}`}>
                          {application.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'castings' && (
            <div className="bg-white shadow overflow-hidden rounded-lg">
              <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Castings</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {talent.castings.length} Total
                </span>
              </div>
              <div className="divide-y divide-gray-200">
                {talent.castings.length === 0 ? (
                  <div className="px-4 py-5 text-center text-gray-500">
                    No castings found for this talent.
                  </div>
                ) : (
                  talent.castings.map((casting) => (
                    <div key={casting.id} className="px-4 py-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-md font-medium text-gray-900">
                            {casting.role} in <Link href={`/admin/projects/${casting.id}`} className="hover:text-blue-600">{casting.projectTitle}</Link>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            Scene: {casting.sceneName}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Studio: {casting.studioName}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="bg-white shadow overflow-hidden rounded-lg">
              <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Profile Images</h3>
                <button
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  Add Image
                </button>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {talent.profileImages.map((image) => (
                    <div key={image.id} className="relative">
                      <img
                        src={image.url}
                        alt="Profile"
                        className="h-40 w-full object-cover rounded-md"
                      />
                      {image.isPrimary && (
                        <span className="absolute top-2 right-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Primary
                        </span>
                      )}
                      <div className="absolute bottom-2 right-2 flex space-x-1">
                        {!image.isPrimary && (
                          <button
                            className="p-1 bg-white rounded-full shadow hover:bg-gray-100"
                            title="Set as primary"
                          >
                            <svg className="h-4 w-4 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                        <button
                          className="p-1 bg-white rounded-full shadow hover:bg-gray-100"
                          title="Delete image"
                        >
                          <svg className="h-4 w-4 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column - Sidebar */}
        <div>
          {/* Headshot and basic info */}
          <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
            <div className="p-4">
              <div className="flex flex-col items-center">
                {talent.headshotUrl ? (
                  <img 
                    src={talent.headshotUrl} 
                    alt={talent.name} 
                    className="h-32 w-32 rounded-full object-cover mb-4"
                  />
                ) : (
                  <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 mb-4">
                    {talent.name.charAt(0)}
                  </div>
                )}
                <h3 className="text-lg font-medium text-gray-900">{talent.name}</h3>
                <div className="mt-1 flex items-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    talent.availability 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {talent.availability ? 'Available' : 'Unavailable'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* User Account Info */}
          <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Account Info</h3>
            </div>
            <div className="px-4 py-5">
              <Link 
                href={`/admin/users/${talent.userId}`}
                className="text-blue-600 hover:text-blue-800 flex items-center"
              >
                <svg className="mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                View User Account
              </Link>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Quick Actions</h3>
            </div>
            <div className="p-4 space-y-2">
              <button className="w-full text-left py-2 px-3 rounded hover:bg-gray-100 text-sm flex items-center">
                <svg className="mr-2 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                Send Message
              </button>
              <button 
                className="w-full text-left py-2 px-3 rounded hover:bg-gray-100 text-sm flex items-center"
                onClick={handleToggleAvailability}
              >
                <svg className="mr-2 h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                </svg>
                {talent.availability ? 'Mark as Unavailable' : 'Mark as Available'}
              </button>
              <button className="w-full text-left py-2 px-3 rounded hover:bg-gray-100 text-sm flex items-center">
                <svg className="mr-2 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd" />
                </svg>
                Export Talent Data
              </button>
              <button className="w-full text-left py-2 px-3 rounded hover:bg-gray-100 text-sm text-red-600 flex items-center">
                <svg className="mr-2 h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                </svg>
                Block Talent
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}