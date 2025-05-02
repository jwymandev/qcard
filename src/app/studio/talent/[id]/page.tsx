'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Define Profile types
type ProfileImage = {
  id: string;
  url: string;
  isPrimary: boolean;
  profileId: string;
  createdAt: string;
};

type Skill = {
  id: string;
  name: string;
};

type Location = {
  id: string;
  name: string;
};

type User = {
  firstName: string;
  lastName: string;
  email: string;
}

type Profile = {
  id: string;
  userId: string;
  user: User;
  bio: string | null;
  height: string | null;
  weight: string | null;
  hairColor: string | null;
  eyeColor: string | null;
  gender: string | null;
  ethnicity: string | null;
  age: number | null;
  languages: string[] | null;
  experience: string | null;
  availability: boolean;
  createdAt: string;
  updatedAt: string;
  locations: Location[];
  skills: Skill[];
  images: ProfileImage[];
};

type StudioNote = {
  id: string;
  content: string;
  studioId: string;
  profileId: string;
  createdAt: string;
  updatedAt: string;
};

export default function TalentProfilePage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studioNotes, setStudioNotes] = useState<StudioNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [selectedImage, setSelectedImage] = useState<ProfileImage | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  
  useEffect(() => {
    // Redirect if not authenticated
    if (status === 'unauthenticated') {
      router.push('/sign-in');
    } else if (status === 'authenticated') {
      fetchTalentProfile();
      fetchStudioNotes();
    }
  }, [status, params.id]);
  
  const fetchTalentProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/talent/profile/${params.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch talent profile');
      }
      
      const data = await response.json();
      setProfile(data);
    } catch (error) {
      console.error('Error fetching talent profile:', error);
      setError('Failed to load talent profile. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchStudioNotes = async () => {
    try {
      const response = await fetch(`/api/studio/notes/${params.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch studio notes');
      }
      
      const data = await response.json();
      setStudioNotes(data);
    } catch (error) {
      console.error('Error fetching studio notes:', error);
      // Don't set main error since notes are secondary
    }
  };
  
  const addStudioNote = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newNote.trim()) return;
    
    try {
      const response = await fetch(`/api/studio/notes/${params.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newNote }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add note');
      }
      
      const data = await response.json();
      setStudioNotes([...studioNotes, data]);
      setNewNote('');
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Failed to add note. Please try again.');
    }
  };
  
  const deleteStudioNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/studio/notes/${noteId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete note');
      }
      
      setStudioNotes(studioNotes.filter(note => note.id !== noteId));
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note. Please try again.');
    }
  };
  
  const handleImageClick = (image: ProfileImage) => {
    setSelectedImage(image);
    setIsLightboxOpen(true);
  };
  
  const closeLightbox = () => {
    setIsLightboxOpen(false);
    setSelectedImage(null);
  };
  
  const contactTalent = () => {
    router.push(`/studio/messages/new?recipientId=${params.id}`);
  };
  
  const addToProject = () => {
    router.push(`/studio/projects?addTalent=${params.id}`);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 p-4 rounded-md text-red-600 mb-4">
          {error}
        </div>
        <button
          onClick={() => fetchTalentProfile()}
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md text-yellow-600 mb-4">
          Talent profile not found.
        </div>
        <Link
          href="/studio/talent-search"
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          Back to Talent Search
        </Link>
      </div>
    );
  }
  
  // Get the primary image or the first image if no primary is set
  const primaryImage = profile.images.find(img => img.isPrimary) || profile.images[0];
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
        <div>
          <Link
            href="/studio/talent-search"
            className="text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            ← Back to Talent Search
          </Link>
          <h1 className="text-2xl font-bold">
            {profile.user.firstName} {profile.user.lastName}
          </h1>
        </div>
        <div className="flex space-x-3 mt-3 md:mt-0">
          <button
            onClick={contactTalent}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Message Talent
          </button>
          <button
            onClick={addToProject}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            Add to Project
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Header */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 md:flex">
              <div className="md:flex-shrink-0 md:mr-8 md:w-1/3 mb-6 md:mb-0">
                {primaryImage ? (
                  <div 
                    className="aspect-[3/4] rounded overflow-hidden bg-gray-100 cursor-pointer"
                    onClick={() => handleImageClick(primaryImage)}
                  >
                    <img
                      src={primaryImage.url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-[3/4] rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-400">No photo</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="mt-2 flex items-center">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      profile.availability
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {profile.availability ? 'Available' : 'Not available'}
                  </span>
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
                  {profile.age && (
                    <div>
                      <span className="text-gray-500 text-sm">Age:</span>
                      <span className="ml-2">{profile.age}</span>
                    </div>
                  )}
                  {profile.gender && (
                    <div>
                      <span className="text-gray-500 text-sm">Gender:</span>
                      <span className="ml-2">
                        {profile.gender === 'MALE' ? 'Male' : 
                         profile.gender === 'FEMALE' ? 'Female' : 
                         profile.gender === 'NON_BINARY' ? 'Non-binary' : 
                         profile.gender}
                      </span>
                    </div>
                  )}
                  {profile.ethnicity && (
                    <div>
                      <span className="text-gray-500 text-sm">Ethnicity:</span>
                      <span className="ml-2">{profile.ethnicity}</span>
                    </div>
                  )}
                  {profile.height && (
                    <div>
                      <span className="text-gray-500 text-sm">Height:</span>
                      <span className="ml-2">{profile.height}</span>
                    </div>
                  )}
                  {profile.weight && (
                    <div>
                      <span className="text-gray-500 text-sm">Weight:</span>
                      <span className="ml-2">{profile.weight}</span>
                    </div>
                  )}
                  {profile.hairColor && (
                    <div>
                      <span className="text-gray-500 text-sm">Hair:</span>
                      <span className="ml-2">{profile.hairColor}</span>
                    </div>
                  )}
                  {profile.eyeColor && (
                    <div>
                      <span className="text-gray-500 text-sm">Eyes:</span>
                      <span className="ml-2">{profile.eyeColor}</span>
                    </div>
                  )}
                  {profile.languages && profile.languages.length > 0 && (
                    <div className="col-span-2">
                      <span className="text-gray-500 text-sm">Languages:</span>
                      <span className="ml-2">{profile.languages.join(', ')}</span>
                    </div>
                  )}
                </div>
                
                {profile.bio && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-500">About</h3>
                    <div className="mt-1 text-sm text-gray-900">{profile.bio}</div>
                  </div>
                )}
                
                {profile.locations.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-500">Locations</h3>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {profile.locations.map(location => (
                        <span
                          key={location.id}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                        >
                          {location.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-500">Contact</h3>
                  <div className="mt-1 text-sm text-gray-900">
                    {profile.user.email}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Skills Section */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Skills & Abilities</h2>
              
              {profile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map(skill => (
                    <span
                      key={skill.id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      {skill.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No skills listed.</p>
              )}
            </div>
          </div>
          
          {/* Experience Section */}
          {profile.experience && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Professional Experience</h2>
                <div className="text-gray-700 whitespace-pre-line">
                  {profile.experience}
                </div>
              </div>
            </div>
          )}
          
          {/* Photos Gallery */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Photo Gallery</h2>
              
              {profile.images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {profile.images.map(image => (
                    <div 
                      key={image.id} 
                      className="relative cursor-pointer"
                      onClick={() => handleImageClick(image)}
                    >
                      <div className={`aspect-[3/4] bg-gray-100 rounded overflow-hidden ${image.isPrimary ? 'ring-2 ring-blue-500' : ''}`}>
                        <img
                          src={image.url}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No photos available.</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Studio Notes Section - Only visible to studio users */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Studio Notes</h2>
              <p className="text-gray-500 text-sm mb-4">
                Notes are private and only visible to your studio.
              </p>
              
              <form onSubmit={addStudioNote} className="mb-6">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note about this talent..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                ></textarea>
                <button
                  type="submit"
                  className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 w-full"
                >
                  Add Note
                </button>
              </form>
              
              {studioNotes.length > 0 ? (
                <div className="space-y-4">
                  {studioNotes.map(note => (
                    <div key={note.id} className="border border-gray-200 rounded-md p-4">
                      <div className="flex justify-between items-start">
                        <div className="text-sm text-gray-500">
                          {formatDate(note.createdAt)}
                        </div>
                        <button
                          onClick={() => deleteStudioNote(note.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete note"
                        >
                          &times;
                        </button>
                      </div>
                      <div className="mt-2 text-gray-700 whitespace-pre-line">
                        {note.content}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No notes yet.</p>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={contactTalent}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Message Talent
                </button>
                <button
                  onClick={addToProject}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add to Project
                </button>
                <Link
                  href={`/studio/casting-calls/new?preselect=${params.id}`}
                  className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Create Casting Call
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Image Lightbox */}
      {isLightboxOpen && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-white rounded-lg overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-medium">
                {profile.user.firstName} {profile.user.lastName}
              </h3>
              <button
                onClick={closeLightbox}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            <div className="p-4 flex justify-center">
              <img
                src={selectedImage.url}
                alt="Profile"
                className="max-h-[80vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}