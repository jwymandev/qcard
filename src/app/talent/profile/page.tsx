'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import InitProfile from '../init-profile';

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

type Profile = {
  id: string;
  userId: string;
  bio: string | null;
  height: string | null;
  weight: string | null;
  hairColor: string | null;
  eyeColor: string | null;
  gender: string | null;
  ethnicity: string | null;
  // age field has been removed from schema
  // Languages can be either a string (from DB) or array (converted for UI)
  languages: string | string[] | null;
  experience: string | null;
  availability: boolean;
  headshotUrl: string | null;
  createdAt: string;
  updatedAt: string;
  locations: Location[];
  skills: Skill[];
  images: ProfileImage[];
};

export default function TalentProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  const [profileInitNeeded, setProfileInitNeeded] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form state for editing
  const [formData, setFormData] = useState({
    bio: '',
    height: '',
    weight: '',
    hairColor: '',
    eyeColor: '',
    gender: '',
    ethnicity: '',
    // age field has been removed from schema
    languages: '',
    experience: '',
    availability: true,
    locationIds: [] as string[],
    skillIds: [] as string[],
  });
  
  const initializeProfile = async () => {
    try {
      // This method should use the correct endpoint
      console.log("Initializing profile from profile page");
      const response = await fetch('/api/talent-init', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Profile initialization error:", errorData);
        throw new Error(errorData.error || errorData.message || 'Failed to initialize profile');
      }
      
      const result = await response.json();
      console.log("Profile initialization successful:", result);
      
      await fetchProfile();
    } catch (error) {
      console.error('Error initializing profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to initialize profile: ${errorMessage}`);
    }
  };
  
  useEffect(() => {
    // Skip everything if profile initialization is needed
    if (profileInitNeeded) {
      return;
    }

    // Redirect if not authenticated
    if (status === 'unauthenticated') {
      router.push('/sign-in');
    } else if (status === 'authenticated') {
      fetchProfile();
      fetchSkills();
      fetchLocations();
    }
  }, [status, profileInitNeeded]);
  
  // Populate form data when profile is loaded
  useEffect(() => {
    if (profile) {
      setFormData({
        bio: profile.bio || '',
        height: profile.height || '',
        weight: profile.weight || '',
        hairColor: profile.hairColor || '',
        eyeColor: profile.eyeColor || '',
        gender: profile.gender || '',
        ethnicity: profile.ethnicity || '',
        // age field has been removed from schema
        languages: profile.languages ? (typeof profile.languages === 'string' ? profile.languages : profile.languages.join(', ')) : '',
        experience: profile.experience || '',
        availability: profile.availability,
        locationIds: profile.locations.map(location => location.id),
        skillIds: profile.skills.map(skill => skill.id),
      });
    }
  }, [profile]);
  
  const fetchProfile = async () => {
    setLoading(true);
    try {
      console.log("Fetching profile data...");
      const response = await fetch('/api/talent/profile');
      
      console.log("Profile response status:", response.status);
      
      // Try to get response body regardless of status code
      let responseText;
      let errorData;
      
      try {
        responseText = await response.text();
        console.log("Raw profile response:", responseText);
        
        try {
          errorData = JSON.parse(responseText);
          console.log("Parsed profile response:", errorData);
        } catch (parseError) {
          console.error("Error parsing profile response:", parseError);
        }
      } catch (textError) {
        console.error("Error getting response text:", textError);
      }
      
      if (!response.ok) {
        // For 404 errors specifically related to profile initialization
        if (response.status === 404 && errorData?.error === "Profile not found, needs initialization") {
          console.log("Profile needs initialization, showing init dialog");
          setProfileInitNeeded(true);
          throw new Error("Your talent profile needs to be initialized");
        }
        
        // Handle other error statuses
        if (response.status === 500) {
          console.error("Server error with profile:", errorData);
          // Log error but don't make additional API calls that could cause more errors
        }
        
        throw new Error(errorData?.error || `Failed to fetch profile: ${response.status}`);
      }
      
      // Success case - handle data and provide fallbacks if needed
      const profileData = errorData;
      
      // Ensure profile has all required arrays even if they're missing
      if (profileData) {
        // Handle languages
        if (typeof profileData.languages === 'string' && profileData.languages) {
          profileData.languages = profileData.languages.split(',').map((lang: string) => lang.trim());
        }
        
        // Ensure arrays exist for skills, locations and images
        if (!Array.isArray(profileData.skills)) {
          console.warn("Skills array missing from profile response, adding empty array");
          profileData.skills = [];
        }
        
        if (!Array.isArray(profileData.locations)) {
          console.warn("Locations array missing from profile response, adding empty array");
          profileData.locations = [];
        }
        
        if (!Array.isArray(profileData.images)) {
          console.warn("Images array missing from profile response, adding empty array");
          profileData.images = [];
        }
      }
      
      setProfile(profileData);
      console.log("Profile loaded successfully", {
        hasProfile: !!profileData,
        hasSkills: profileData?.skills?.length || 0,
        hasLocations: profileData?.locations?.length || 0,
        hasImages: profileData?.images?.length || 0,
        languagesType: profileData ? typeof profileData.languages : 'none'
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to load profile: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchSkills = async () => {
    try {
      const response = await fetch('/api/skills');
      
      if (!response.ok) {
        throw new Error('Failed to fetch skills');
      }
      
      const data = await response.json();
      setAvailableSkills(data);
    } catch (error) {
      console.error('Error fetching skills:', error);
    }
  };
  
  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations');
      
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      
      const data = await response.json();
      setAvailableLocations(data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Convert FileList to array and add to pendingImages
      const newFiles = Array.from(e.target.files);
      
      // Limit to 10 images total
      const totalImages = (profile?.images?.length || 0) + pendingImages.length;
      
      if (totalImages + newFiles.length > 10) {
        alert(`You can only upload a maximum of 10 images. You already have ${totalImages} images.`);
        return;
      }
      
      setPendingImages([...pendingImages, ...newFiles]);
    }
  };
  
  const removePendingImage = (index: number) => {
    setPendingImages(pendingImages.filter((_, i) => i !== index));
  };
  
  const handleRemoveProfileImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to remove this image?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/talent/profile/images/${imageId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete image');
      }
      
      // Update profile state to remove the deleted image
      if (profile) {
        setProfile({
          ...profile,
          images: profile.images.filter(img => img.id !== imageId),
        });
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image. Please try again.');
    }
  };
  
  const handleSetAsPrimary = async (imageId: string) => {
    try {
      const response = await fetch(`/api/talent/profile/images/${imageId}/primary`, {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        throw new Error('Failed to set primary image');
      }
      
      // Update profile state to reflect the new primary image
      if (profile) {
        setProfile({
          ...profile,
          images: profile.images.map(img => ({
            ...img,
            isPrimary: img.id === imageId,
          })),
        });
      }
    } catch (error) {
      console.error('Error setting primary image:', error);
      alert('Failed to set primary image. Please try again.');
    }
  };
  
  const uploadImages = async () => {
    if (pendingImages.length === 0) return;
    
    setUploading(true);
    setImageUploadProgress(0);
    
    try {
      // Create FormData for uploading
      const formData = new FormData();
      pendingImages.forEach(file => {
        formData.append('images', file);
      });
      
      const response = await fetch('/api/talent/profile/images', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload images');
      }
      
      const data = await response.json();
      
      // Update profile with new images
      if (profile) {
        setProfile({
          ...profile,
          images: [...profile.images, ...data],
        });
      }
      
      // Clear pending images after successful upload
      setPendingImages([]);
      setImageUploadProgress(100);
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData({ ...formData, [name]: checked });
  };
  
  const handleSkillSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (selectedId && !formData.skillIds.includes(selectedId)) {
      setFormData({
        ...formData,
        skillIds: [...formData.skillIds, selectedId],
      });
    }
  };
  
  const handleSkillRemove = (skillId: string) => {
    setFormData({
      ...formData,
      skillIds: formData.skillIds.filter(id => id !== skillId),
    });
  };
  
  const handleLocationSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (selectedId && !formData.locationIds.includes(selectedId)) {
      setFormData({
        ...formData,
        locationIds: [...formData.locationIds, selectedId],
      });
    }
  };
  
  const handleLocationRemove = (locationId: string) => {
    setFormData({
      ...formData,
      locationIds: formData.locationIds.filter(id => id !== locationId),
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Show loading message
    setLoading(true);
    
    // First upload any pending images
    if (pendingImages.length > 0) {
      await uploadImages();
    }
    
    // Then update profile details
    try {
      // Prepare profile data, handling the languages field specially
      const profileData = {
        ...formData,
        // age field has been removed from schema
        // Store languages as a string to match the database schema
        languages: formData.languages || null,
      };
      
      console.log("Submitting profile update with data:", {
        fields: Object.keys(profileData),
        hasSkills: profileData.skillIds?.length > 0,
        hasLocations: profileData.locationIds?.length > 0
      });
      
      const response = await fetch('/api/talent/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });
      
      // Get response text first
      const responseText = await response.text();
      console.log("Profile update response:", responseText);
      
      // Try to parse as JSON
      let updatedProfile;
      try {
        updatedProfile = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse response as JSON:", e);
      }
      
      if (!response.ok) {
        const errorMessage = updatedProfile?.error || `Failed to update profile: ${response.status}`;
        console.error("Profile update error:", errorMessage, updatedProfile);
        throw new Error(errorMessage);
      }
      
      // Fix languages format for display if needed
      if (updatedProfile && typeof updatedProfile.languages === 'string' && updatedProfile.languages) {
        updatedProfile.languages = updatedProfile.languages.split(',').map((lang: string) => lang.trim());
      }
      
      setProfile(updatedProfile);
      setIsEditing(false);
      
      // Show success message at the top of the page
      setSuccessMessage('Profile updated successfully!');
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to update profile: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Add a function to manually initialize the profile - debug only
  const debugProfile = async () => {
    try {
      // Skip debug info to prevent unnecessary API calls
      console.log("Initializing profile directly without debug calls");
      
      // Try to initialize the profile
      const response = await fetch('/api/talent-init', {
        method: 'POST',
      });
      
      // Get text first to avoid double-parsing
      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse response:", e);
      }
      
      if (!response.ok) {
        console.error("Init error:", data || responseText);
        throw new Error((data && data.error) || 'Failed to initialize profile');
      }
      
      console.log("Init result:", data || responseText);
      
      // Refresh the data without reloading the page
      setSuccessMessage("Profile initialized successfully!");
      await fetchProfile(); // Fetch the profile again
    } catch (error) {
      console.error('Debug error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Debug error: ${errorMessage}`);
    }
  };
  
  // Show profile initialization dialog if needed
  if (profileInitNeeded) {
    return (
      <div className="min-h-screen">
        <InitProfile 
          onSuccess={() => {
            setProfileInitNeeded(false);
            setSuccessMessage("Profile created successfully!");
            fetchProfile();
          }} 
        />
        <button 
          onClick={() => {
            setProfileInitNeeded(false);
            fetchProfile();
          }}
          className="fixed top-4 right-4 bg-gray-200 text-gray-800 px-4 py-2 rounded shadow hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    );
  }

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
          <h3 className="text-lg font-semibold mb-2">Error Loading Profile</h3>
          <p className="mb-2">{error}</p>
          <details className="text-sm text-red-800">
            <summary className="cursor-pointer">Technical Details</summary>
            <div className="mt-2 bg-red-100 p-2 rounded">
              <p>Session Status: {status}</p>
              <p>Error: {error}</p>
              <p>User ID: {session?.user?.id || 'Not available'}</p>
            </div>
          </details>
        </div>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => fetchProfile()}
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            Try Again
          </button>
          <button
            onClick={debugProfile}
            className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
          >
            Debug Profile
          </button>
          <button
            onClick={() => {
              setProfileInitNeeded(true);
            }}
            className="bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-600"
          >
            Initialize Profile
          </button>
        </div>
      </div>
    );
  }
  
  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md text-yellow-600 mb-4">
          No profile found. Please initialize your profile.
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => {
              setProfileInitNeeded(true);
            }}
            className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
          >
            Initialize Profile
          </button>
          <button
            onClick={debugProfile}
            className="bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-600"
          >
            Debug Profile
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            Create Profile Manually
          </button>
        </div>
      </div>
    );
  }
  
  // Get the primary image or the first image if no primary is set
  const primaryImage = profile.images.find(img => img.isPrimary) || profile.images[0];
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Success message banner */}
      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                {successMessage}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button 
                  onClick={() => setSuccessMessage(null)}
                  className="inline-flex bg-green-50 rounded-md p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Profile</h1>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`px-4 py-2 rounded-md ${
            isEditing
              ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isEditing ? 'Cancel Editing' : 'Edit Profile'}
        </button>
      </div>
      
      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-2">Basic Information</h2>
              <div className="bg-green-50 p-3 rounded-md mb-4 text-sm text-green-800">
                <p className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>
                    <strong>Good news!</strong> Gender and ethnicity fields are now available. 
                    Fill out these fields to complete your talent profile.
                  </span>
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio / About Me
                  </label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Tell casting directors about yourself..."
                  ></textarea>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Age field has been removed from schema */}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gender
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="NON_BINARY">Non-binary</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ethnicity
                    </label>
                    <input
                      type="text"
                      name="ethnicity"
                      value={formData.ethnicity}
                      onChange={handleChange}
                      placeholder="e.g. Asian, Black, Hispanic, White, etc."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Languages
                    </label>
                    <input
                      type="text"
                      name="languages"
                      value={formData.languages}
                      onChange={handleChange}
                      placeholder="English, Spanish, etc."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Height
                    </label>
                    <input
                      type="text"
                      name="height"
                      value={formData.height}
                      onChange={handleChange}
                      placeholder="5'10"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weight
                    </label>
                    <input
                      type="text"
                      name="weight"
                      value={formData.weight}
                      onChange={handleChange}
                      placeholder="160 lbs"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hair Color
                    </label>
                    <input
                      type="text"
                      name="hairColor"
                      value={formData.hairColor}
                      onChange={handleChange}
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
                      value={formData.eyeColor}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Professional Experience
                </label>
                <textarea
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="List your past roles, productions, and experience..."
                ></textarea>
              </div>
              
              <div className="mt-4 flex items-center">
                <input
                  type="checkbox"
                  name="availability"
                  checked={formData.availability}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  I am currently available for casting opportunities
                </label>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Skills & Abilities</h2>
                
                <select
                  value=""
                  onChange={handleSkillSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 mb-3"
                >
                  <option value="">Add a skill...</option>
                  {availableSkills.map(skill => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name}
                    </option>
                  ))}
                </select>
                
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.skillIds.map(skillId => {
                    const skill = availableSkills.find(s => s.id === skillId);
                    return skill ? (
                      <div
                        key={skill.id}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center"
                      >
                        {skill.name}
                        <button
                          type="button"
                          onClick={() => handleSkillRemove(skill.id)}
                          className="ml-2 text-blue-600 hover:text-blue-800 focus:outline-none"
                        >
                          &times;
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Locations</h2>
                
                <select
                  value=""
                  onChange={handleLocationSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 mb-3"
                >
                  <option value="">Add a location...</option>
                  {availableLocations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
                
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.locationIds.map(locationId => {
                    const location = availableLocations.find(l => l.id === locationId);
                    return location ? (
                      <div
                        key={location.id}
                        className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center"
                      >
                        {location.name}
                        <button
                          type="button"
                          onClick={() => handleLocationRemove(location.id)}
                          className="ml-2 text-green-600 hover:text-green-800 focus:outline-none"
                        >
                          &times;
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Headshots & Photos</h2>
              <p className="text-gray-600 mb-4">
                Upload up to 10 professional photos. Mark one as your primary image that will be displayed first.
              </p>
              
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="mb-4"
              />
              
              {pendingImages.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-medium mb-2">Pending Uploads</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {pendingImages.map((file, index) => (
                      <div key={index} className="relative">
                        <div className="aspect-[3/4] bg-gray-100 rounded overflow-hidden">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Pending ${index}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removePendingImage(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Current Photos</h3>
                {profile.images.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {profile.images.map((image) => (
                      <div key={image.id} className="relative">
                        <div className={`aspect-[3/4] bg-gray-100 rounded overflow-hidden ${image.isPrimary ? 'ring-2 ring-blue-500' : ''}`}>
                          <img
                            src={image.url}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute top-2 right-2 flex space-x-1">
                          {!image.isPrimary && (
                            <button
                              type="button"
                              onClick={() => handleSetAsPrimary(image.id)}
                              className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-blue-600"
                              title="Set as primary"
                            >
                              ★
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveProfileImage(image.id)}
                            className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                            title="Remove"
                          >
                            &times;
                          </button>
                        </div>
                        {image.isPrimary && (
                          <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                            Primary
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No photos uploaded yet.</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 flex items-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : 'Save Profile'}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              All profile fields should now save correctly, including gender and ethnicity.
            </p>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 md:flex">
              <div className="md:flex-shrink-0 md:mr-8 md:w-1/3 lg:w-1/4 mb-6 md:mb-0">
                {primaryImage ? (
                  <div className="aspect-[3/4] rounded overflow-hidden bg-gray-100">
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
                <h2 className="text-2xl font-bold text-gray-900">
                  {session?.user?.name || 'Your Name'}
                </h2>
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
                  {/* Age field has been removed from schema */}
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
                  {profile.languages && (
                    <div className="col-span-2">
                      <span className="text-gray-500 text-sm">Languages:</span>
                      <span className="ml-2">
                        {typeof profile.languages === 'string' 
                          ? profile.languages
                          : Array.isArray(profile.languages) 
                            ? profile.languages.join(', ')
                            : ''}
                      </span>
                    </div>
                  )}
                </div>
                
                {profile.bio && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-500">About Me</h3>
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
                <p className="text-gray-500">No skills added yet.</p>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {profile.images.map(image => (
                    <div key={image.id} className="relative">
                      <div className={`aspect-[3/4] bg-gray-100 rounded overflow-hidden ${image.isPrimary ? 'ring-2 ring-blue-500' : ''}`}>
                        <img
                          src={image.url}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {image.isPrimary && (
                        <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                          Primary
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No photos uploaded yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}