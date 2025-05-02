'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import InitStudio from '../../../init-studio';

type Scene = {
  id: string;
  title: string;
  description: string | null;
  shootDate: string | null;
  duration: number | null;
  locationId: string | null;
  talentNeeded: number | null;
  status: string;
  _count?: {
    talents: number;
  };
};

type Project = {
  id: string;
  title: string;
};

export default function ScenesPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const projectId = params.id;
  
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studioInitNeeded, setStudioInitNeeded] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/sign-in');
    } else if (status === 'authenticated') {
      fetchScenes();
      fetchProject();
    }
  }, [status, projectId, router]);
  
  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/studio/projects/${projectId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        
        if (response.status === 404 && errorData.error === "Studio not found") {
          setStudioInitNeeded(true);
          throw new Error("Your studio account needs to be initialized");
        }
        
        throw new Error('Failed to fetch project');
      }
      
      const data = await response.json();
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
      setError('Failed to load project details. Please try again later.');
    }
  };
  
  const fetchScenes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/studio/projects/${projectId}/scenes`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        
        if (response.status === 404 && errorData.error === "Studio not found") {
          setStudioInitNeeded(true);
          throw new Error("Your studio account needs to be initialized");
        }
        
        throw new Error('Failed to fetch scenes');
      }
      
      const data = await response.json();
      setScenes(data);
    } catch (error) {
      console.error('Error fetching scenes:', error);
      setError('Failed to load scenes. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Filter scenes by status
  const filteredScenes = statusFilter === 'ALL'
    ? scenes
    : scenes.filter(scene => scene.status === statusFilter);
  
  // Show studio initialization dialog if needed
  if (studioInitNeeded) {
    return <InitStudio />;
  }
  
  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Scenes</h1>
          {project && (
            <p className="text-gray-600">Project: {project.title}</p>
          )}
        </div>
        <div className="flex space-x-2">
          <Link
            href={`/studio/projects/${projectId}/scenes/new`}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add New Scene
          </Link>
          <Link
            href={`/studio/projects/${projectId}`}
            className="px-4 py-2 text-blue-600 bg-white border border-blue-600 rounded hover:bg-blue-50"
          >
            Back to Project
          </Link>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-md text-red-600 mb-6">
          {error}
          <button
            onClick={fetchScenes}
            className="ml-2 underline"
          >
            Try Again
          </button>
        </div>
      )}
      
      <div className="mb-6">
        <label htmlFor="status-filter" className="mr-2 text-sm font-medium">
          Filter by Status:
        </label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="ALL">All Scenes</option>
          <option value="PLANNING">Planning</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>
      
      {filteredScenes.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600 mb-4">
            {scenes.length === 0
              ? "You don't have any scenes in this project yet."
              : "No scenes match the selected filter."}
          </p>
          {scenes.length === 0 && (
            <Link
              href={`/studio/projects/${projectId}/scenes/new`}
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create Your First Scene
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredScenes.map((scene) => (
            <Link
              key={scene.id}
              href={`/studio/projects/${projectId}/scenes/${scene.id}`}
              className="block"
            >
              <div className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{scene.title}</h2>
                      <div className="flex space-x-4 text-sm text-gray-600 mt-1">
                        {scene.shootDate && (
                          <div>Shoot Date: {new Date(scene.shootDate).toLocaleDateString()}</div>
                        )}
                        {scene.duration && (
                          <div>Duration: {scene.duration} minutes</div>
                        )}
                        <div>Talent: {scene._count?.talents || 0}{scene.talentNeeded ? `/${scene.talentNeeded}` : ''}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      scene.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      scene.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                      scene.status === 'PLANNING' ? 'bg-yellow-100 text-yellow-800' :
                      scene.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {scene.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  {scene.description && (
                    <p className="text-gray-600 mt-4 line-clamp-2">
                      {scene.description}
                    </p>
                  )}
                  
                  <div className="mt-4 flex justify-end">
                    <span className="text-blue-600 text-sm font-medium">View Details →</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}