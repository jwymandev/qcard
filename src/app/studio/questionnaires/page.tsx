'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Type definitions
type Questionnaire = {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
  invitationCount: number;
  responseCount: number;
};

export default function QuestionnairesPage() {
  const router = useRouter();
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Load questionnaires from API
  useEffect(() => {
    async function loadQuestionnaires() {
      try {
        // Replace with real API call once implemented
        // const response = await fetch('/api/studio/questionnaires');
        // const data = await response.json();

        // Mock data for now
        await new Promise(resolve => setTimeout(resolve, 500));
        const mockData: Questionnaire[] = [
          {
            id: '1',
            title: 'Casting Call Questionnaire',
            description: 'Additional information for our upcoming film project',
            isActive: true,
            requiresApproval: true,
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            invitationCount: 25,
            responseCount: 12
          },
          {
            id: '2',
            title: 'Special Skills Assessment',
            description: 'For talents who have indicated they have special skills (stunts, dance, etc.)',
            isActive: true,
            requiresApproval: false,
            createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            invitationCount: 15,
            responseCount: 9
          },
          {
            id: '3',
            title: 'Commercial Project Requirements',
            description: null,
            isActive: false,
            requiresApproval: false,
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            invitationCount: 8,
            responseCount: 8
          }
        ];

        setQuestionnaires(mockData);
        setLoading(false);
      } catch (err) {
        console.error('Error loading questionnaires:', err);
        setError('Failed to load questionnaires');
        setLoading(false);
      }
    }

    loadQuestionnaires();
  }, []);

  // Filter questionnaires based on search and active status
  const filteredQuestionnaires = questionnaires.filter(q => {
    const matchesSearch = q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.description && q.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = 
      activeFilter === 'all' ||
      (activeFilter === 'active' && q.isActive) ||
      (activeFilter === 'inactive' && !q.isActive);
    
    return matchesSearch && matchesStatus;
  });

  // Handle toggling questionnaire active status
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      // Optimistic update
      setQuestionnaires(prevQuestionnaires => 
        prevQuestionnaires.map(q => 
          q.id === id ? { ...q, isActive: !currentStatus } : q
        )
      );

      // Update on server
      // Replace with real API call once implemented
      // await fetch(`/api/studio/questionnaires/${id}`, {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ isActive: !currentStatus }),
      // });
    } catch (err) {
      // Revert on error
      setQuestionnaires(prevQuestionnaires => 
        prevQuestionnaires.map(q => 
          q.id === id ? { ...q, isActive: currentStatus } : q
        )
      );
      console.error('Error toggling questionnaire status:', err);
    }
  };

  // Delete questionnaire
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this questionnaire? This will remove all invitations and responses as well.')) {
      return;
    }

    try {
      // Optimistic update
      setQuestionnaires(prevQuestionnaires => 
        prevQuestionnaires.filter(q => q.id !== id)
      );

      // Update on server
      // Replace with real API call once implemented
      // await fetch(`/api/studio/questionnaires/${id}`, {
      //   method: 'DELETE',
      // });
    } catch (err) {
      // If error, reload the data
      alert('Error deleting questionnaire. Please try again.');
      console.error('Error deleting questionnaire:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Talent Questionnaires</h1>
        <Link
          href="/studio/questionnaires/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Create Questionnaire
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-5">
            <p className="text-sm text-gray-500">
              Create custom questionnaires to gather additional information from talent profiles. 
              Send invitations to selected talents and view their responses.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4 mb-5">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search questionnaires..."
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* Questionnaire List */}
          {loading ? (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading questionnaires...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-red-500">
              {error}
            </div>
          ) : filteredQuestionnaires.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              {searchTerm || activeFilter !== 'all' 
                ? 'No questionnaires match your search criteria.'
                : 'No questionnaires created yet. Create your first questionnaire to get started.'
              }
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredQuestionnaires.map((questionnaire) => (
                <li key={questionnaire.id} className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center">
                        <p className="text-lg font-medium text-blue-600 truncate">
                          {questionnaire.title}
                        </p>
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          questionnaire.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {questionnaire.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {questionnaire.requiresApproval && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Requires Approval
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {questionnaire.description || 'No description provided'}
                      </p>
                      <div className="mt-2 flex flex-wrap text-sm text-gray-500 space-x-4">
                        <span>Created: {new Date(questionnaire.createdAt).toLocaleDateString()}</span>
                        <span>Invitations: {questionnaire.invitationCount}</span>
                        <span>Responses: {questionnaire.responseCount}</span>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex space-x-2">
                      <button
                        onClick={() => handleToggleActive(questionnaire.id, questionnaire.isActive)}
                        className={`px-2 py-1 border rounded text-xs font-medium ${
                          questionnaire.isActive
                            ? 'border-red-300 text-red-700 hover:bg-red-50'
                            : 'border-green-300 text-green-700 hover:bg-green-50'
                        }`}
                      >
                        {questionnaire.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <Link
                        href={`/studio/questionnaires/${questionnaire.id}/invitations`}
                        className="px-2 py-1 border border-blue-300 rounded text-xs font-medium text-blue-700 hover:bg-blue-50"
                      >
                        Invitations
                      </Link>
                      <Link
                        href={`/studio/questionnaires/${questionnaire.id}/responses`}
                        className="px-2 py-1 border border-blue-300 rounded text-xs font-medium text-blue-700 hover:bg-blue-50"
                      >
                        Responses
                      </Link>
                      <Link
                        href={`/studio/questionnaires/${questionnaire.id}`}
                        className="px-2 py-1 border border-blue-300 rounded text-xs font-medium text-blue-700 hover:bg-blue-50"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(questionnaire.id)}
                        className="px-2 py-1 border border-red-300 rounded text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}