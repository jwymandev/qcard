'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Spinner, Button, Alert, AlertTitle, AlertDescription } from '@/components/ui';

type Project = {
  id: string;
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export default function EditProjectPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const projectId = params.id;
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [projectStatus, setProjectStatus] = useState('');
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/sign-in');
    } else if (status === 'authenticated') {
      fetchProject();
    }
  }, [status, router, projectId]);
  
  const fetchProject = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/studio/projects/${projectId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch project');
      }
      
      const data = await response.json();
      setProject(data);
      
      // Initialize form fields
      setTitle(data.title || '');
      setDescription(data.description || '');
      setStartDate(data.startDate ? formatDateForInput(data.startDate) : '');
      setEndDate(data.endDate ? formatDateForInput(data.endDate) : '');
      setProjectStatus(data.status || '');
    } catch (error) {
      console.error('Error fetching project:', error);
      setError('Failed to load project. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch(`/api/studio/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description: description || null,
          startDate: startDate || null,
          endDate: endDate || null,
          status: projectStatus,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update project');
      }
      
      setSuccessMessage('Project updated successfully!');
      
      // Set a timeout to redirect back to the project page
      setTimeout(() => {
        router.push(`/studio/projects/${projectId}`);
      }, 1500);
    } catch (error) {
      console.error('Error updating project:', error);
      setError('Failed to update project. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Link
          href={`/studio/projects/${projectId}`}
          className="text-blue-600 hover:underline"
        >
          &larr; Back to Project
        </Link>
      </div>
    );
  }
  
  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="mb-6">
          <AlertTitle>Not Found</AlertTitle>
          <AlertDescription>Project not found or still loading...</AlertDescription>
        </Alert>
        <Link
          href="/studio/projects"
          className="text-blue-600 hover:underline"
        >
          &larr; Back to Projects
        </Link>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href={`/studio/projects/${projectId}`}
        className="text-blue-600 hover:underline inline-block mb-6"
      >
        &larr; Back to Project
      </Link>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Project</h1>
          
          {successMessage && (
            <Alert className="mb-6">
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Project Title *
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Project Status *
                </label>
                <select
                  id="status"
                  value={projectStatus}
                  onChange={(e) => setProjectStatus(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Status</option>
                  <option value="PLANNING">Planning</option>
                  <option value="CASTING">Casting</option>
                  <option value="PRE_PRODUCTION">Pre-Production</option>
                  <option value="IN_PRODUCTION">In Production</option>
                  <option value="POST_PRODUCTION">Post-Production</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              
              <div className="flex items-center justify-end space-x-4">
                <Link
                  href={`/studio/projects/${projectId}`}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </Link>
                <Button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}