'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Spinner, Alert, AlertDescription, AlertTitle } from '@/components/ui';
import InitStudio from '../../../../init-studio';

interface Location {
  id: string;
  name: string;
}

interface Skill {
  id: string;
  name: string;
}

interface Project {
  id: string;
  title: string;
}

export default function NewCastingCallPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const projectId = params.id;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studioInitNeeded, setStudioInitNeeded] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    compensation: '',
    startDate: '',
    endDate: '',
    locationId: '',
    compensationType: 'UNSPECIFIED',
    experienceLevel: 'ANY',
    ageRange: '',
    gender: 'ANY',
    roleType: 'UNSPECIFIED',
  });
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/sign-in');
    } else if (status === 'authenticated') {
      fetchProject();
      fetchLocations();
      fetchSkills();
    }
  }, [status, projectId, router]);
  
  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/studio/projects/${projectId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          const errorData = await response.json();
          if (errorData.error === "Studio not found") {
            setStudioInitNeeded(true);
            throw new Error("Your studio account needs to be initialized");
          }
          throw new Error("Project not found");
        }
        throw new Error("Failed to fetch project details");
      }
      
      const data = await response.json();
      setProject(data);
      
      // Pre-populate form with project title if empty
      setFormData(prev => ({
        ...prev,
        title: prev.title || `Casting for ${data.title}`,
      }));
    } catch (error) {
      console.error('Error fetching project:', error);
      setError('Failed to load project details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations');
      
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      
      const data = await response.json();
      setLocations(data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };
  
  const fetchSkills = async () => {
    try {
      const response = await fetch('/api/skills');
      
      if (!response.ok) {
        throw new Error('Failed to fetch skills');
      }
      
      const data = await response.json();
      setSkills(data);
    } catch (error) {
      console.error('Error fetching skills:', error);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  const toggleSkill = (skillId: string) => {
    setSelectedSkills(prev => 
      prev.includes(skillId) 
        ? prev.filter(id => id !== skillId) 
        : [...prev, skillId]
    );
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    
    if (!formData.description.trim() || formData.description.length < 10) {
      setError('Please provide a detailed description (at least 10 characters)');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const payload = {
        title: formData.title,
        description: formData.description,
        requirements: formData.requirements || undefined,
        compensation: formData.compensation || undefined,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        locationId: formData.locationId || undefined,
        projectId: projectId,
        skillIds: selectedSkills.length > 0 ? selectedSkills : undefined,
        compensationType: formData.compensationType,
        experienceLevel: formData.experienceLevel,
        ageRange: formData.ageRange || undefined,
        gender: formData.gender,
        roleType: formData.roleType,
      };
      
      const response = await fetch('/api/studio/casting-calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create casting call');
      }
      
      const data = await response.json();
      router.push(`/studio/projects/${projectId}/casting`);
    } catch (error) {
      console.error('Error creating casting call:', error);
      setError('Failed to create casting call. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
      </div>
    );
  }
  
  if (studioInitNeeded) {
    return <InitStudio />;
  }
  
  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Project not found or you don&apos;t have access to it.</AlertDescription>
        </Alert>
        <Link href="/studio/projects" className="text-blue-600 hover:text-blue-800">
          Back to Projects
        </Link>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Create New Casting Call</h1>
          <p className="text-gray-600">
            For project: {project.title}
          </p>
        </div>
        <Link href={`/studio/projects/${projectId}/casting`} className="text-blue-600 hover:text-blue-800">
          Back to Casting Calls
        </Link>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="E.g., 'Lead Actor for Drama Film' or 'Background Extras Needed'"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={5}
                placeholder="Provide a detailed description of the role, including character background, scenes, and what you're looking for in talent."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Requirements
              </label>
              <textarea
                name="requirements"
                value={formData.requirements}
                onChange={handleChange}
                rows={3}
                placeholder="Specific requirements such as age range, physical characteristics, language proficiency, or special abilities."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Compensation Type
                </label>
                <select
                  name="compensationType"
                  value={formData.compensationType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="UNSPECIFIED">Unspecified</option>
                  <option value="PAID">Paid</option>
                  <option value="UNPAID">Unpaid</option>
                  <option value="EXPENSES">Expenses Only</option>
                  <option value="PAID_WITH_SHARE">Paid with Profit Share</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Compensation Details
                </label>
                <input
                  type="text"
                  name="compensation"
                  value={formData.compensation}
                  onChange={handleChange}
                  placeholder="E.g., &apos;$150/day&apos; or &apos;Credit and meal provided&apos;"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Experience Level
                </label>
                <select
                  name="experienceLevel"
                  value={formData.experienceLevel}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="ANY">Any Level</option>
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="EXPERIENCED">Experienced</option>
                  <option value="PROFESSIONAL">Professional</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender Preference
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="ANY">Any</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="NON_BINARY">Non-binary</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age Range
                </label>
                <input
                  type="text"
                  name="ageRange"
                  value={formData.ageRange}
                  onChange={handleChange}
                  placeholder="E.g., '18-25' or '30-40'"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <select
                  name="locationId"
                  value={formData.locationId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select location (optional)</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Type
                </label>
                <select
                  name="roleType"
                  value={formData.roleType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="UNSPECIFIED">Unspecified</option>
                  <option value="LEAD">Lead Role</option>
                  <option value="SUPPORTING">Supporting Role</option>
                  <option value="EXTRA">Extra/Background</option>
                  <option value="VOICE">Voice Over</option>
                  <option value="STAND_IN">Stand-in</option>
                  <option value="STUNT">Stunt Performer</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Skills Required
              </label>
              <div className="mt-1 border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto">
                {skills.length === 0 ? (
                  <p className="text-gray-500 text-sm">No skills available</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {skills.map(skill => (
                      <div key={skill.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`skill-${skill.id}`}
                          checked={selectedSkills.includes(skill.id)}
                          onChange={() => toggleSkill(skill.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label
                          htmlFor={`skill-${skill.id}`}
                          className="ml-2 block text-sm text-gray-900"
                        >
                          {skill.name}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Link
              href={`/studio/projects/${projectId}/casting`}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> 
                  Creating...
                </>
              ) : 'Create Casting Call'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}