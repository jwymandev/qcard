'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Type definitions
type QuestionnaireInvitation = {
  id: string;
  questionnaireId: string;
  questionnaireTitle: string;
  studioName: string;
  studioImageUrl: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED';
  sentAt: string;
  expiresAt: string | null;
  message: string | null;
};

export default function TalentQuestionnairesPage() {
  const router = useRouter();
  const [invitations, setInvitations] = useState<QuestionnaireInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'expired'>('all');
  
  // Load invitations
  useEffect(() => {
    async function loadInvitations() {
      try {
        // Fetch invitations from API
        const response = await fetch('/api/talent/questionnaires/invitations');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch invitations: ${response.status}`);
        }
        
        const data = await response.json();
        setInvitations(data);
        setLoading(false);
      } catch (err) {
        console.error('Error loading invitations:', err);
        setError('Failed to load questionnaire invitations');
        setLoading(false);
      }
    }
    
    loadInvitations();
  }, []);
  
  // Handle invitation acceptance
  const acceptInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/talent/questionnaires/invitations/${invitationId}/accept`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to accept invitation: ${response.status}`);
      }
      
      // Update invitation locally
      setInvitations(prev => 
        prev.map(inv => 
          inv.id === invitationId
            ? { ...inv, status: 'ACCEPTED' as const }
            : inv
        )
      );
      
      // Redirect to questionnaire response form
      router.push(`/talent/questionnaires/${invitationId}/respond`);
    } catch (err) {
      console.error('Error accepting invitation:', err);
      alert('Failed to accept invitation');
    }
  };
  
  // Handle invitation decline
  const declineInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to decline this questionnaire invitation?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/talent/questionnaires/invitations/${invitationId}/decline`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to decline invitation: ${response.status}`);
      }
      
      // Update invitation locally
      setInvitations(prev => 
        prev.map(inv => 
          inv.id === invitationId
            ? { ...inv, status: 'DECLINED' as const }
            : inv
        )
      );
    } catch (err) {
      console.error('Error declining invitation:', err);
      alert('Failed to decline invitation');
    }
  };
  
  // Get filtered invitations
  const getFilteredInvitations = () => {
    if (filter === 'all') {
      return invitations;
    }
    
    if (filter === 'pending') {
      return invitations.filter(inv => 
        inv.status === 'PENDING' && 
        (!inv.expiresAt || new Date(inv.expiresAt) > new Date())
      );
    }
    
    if (filter === 'completed') {
      return invitations.filter(inv => inv.status === 'COMPLETED');
    }
    
    if (filter === 'expired') {
      return invitations.filter(inv => 
        (inv.status === 'PENDING' && inv.expiresAt && new Date(inv.expiresAt) <= new Date()) ||
        inv.status === 'DECLINED'
      );
    }
    
    return invitations;
  };
  
  const filteredInvitations = getFilteredInvitations();
  
  // Get status badge color
  const getStatusBadgeColor = (invitation: QuestionnaireInvitation) => {
    // For pending but expired invitations
    if (invitation.status === 'PENDING' && 
        invitation.expiresAt && 
        new Date(invitation.expiresAt) <= new Date()) {
      return 'bg-red-100 text-red-800';
    }
    
    switch (invitation.status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'ACCEPTED':
        return 'bg-blue-100 text-blue-800';
      case 'DECLINED':
        return 'bg-red-100 text-red-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get status display text
  const getStatusText = (invitation: QuestionnaireInvitation) => {
    // For pending but expired invitations
    if (invitation.status === 'PENDING' && 
        invitation.expiresAt && 
        new Date(invitation.expiresAt) <= new Date()) {
      return 'EXPIRED';
    }
    
    return invitation.status;
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-500">Loading questionnaires...</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Questionnaires</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and respond to questionnaires from studios
          </p>
        </div>
      </div>
      
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          <div className="sm:flex sm:justify-between items-center mb-5">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-3 sm:mb-0">
              Your Questionnaire Invitations
            </h3>
            <div className="inline-flex rounded-md shadow-sm">
              <button
                type="button"
                className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                  filter === 'all' ? 'text-blue-700 bg-blue-50' : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button
                type="button"
                className={`relative inline-flex items-center px-4 py-2 border-t border-b border-gray-300 bg-white text-sm font-medium ${
                  filter === 'pending' ? 'text-blue-700 bg-blue-50' : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setFilter('pending')}
              >
                Pending
              </button>
              <button
                type="button"
                className={`relative inline-flex items-center px-4 py-2 border-t border-b border-gray-300 bg-white text-sm font-medium ${
                  filter === 'completed' ? 'text-blue-700 bg-blue-50' : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setFilter('completed')}
              >
                Completed
              </button>
              <button
                type="button"
                className={`relative inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                  filter === 'expired' ? 'text-blue-700 bg-blue-50' : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setFilter('expired')}
              >
                Expired/Declined
              </button>
            </div>
          </div>
          
          {filteredInvitations.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              {invitations.length === 0
                ? 'You have no questionnaire invitations yet.'
                : 'No invitations match the selected filter.'}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredInvitations.map((invitation) => (
                <li key={invitation.id} className="py-4 sm:py-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center mb-3 sm:mb-0">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        {invitation.studioImageUrl ? (
                          <img
                            src={invitation.studioImageUrl}
                            alt={invitation.studioName}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <span className="text-gray-500 text-sm font-medium">
                            {invitation.studioName.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="ml-4">
                        <h4 className="text-sm font-medium text-gray-900">
                          {invitation.questionnaireTitle}
                        </h4>
                        <div className="mt-1 flex items-center">
                          <p className="text-sm text-gray-500">
                            From: {invitation.studioName}
                          </p>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(invitation)}`}>
                            {getStatusText(invitation)}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          Sent: {new Date(invitation.sentAt).toLocaleDateString()}
                          {invitation.expiresAt && (
                            <> • {new Date(invitation.expiresAt) > new Date() 
                              ? `Expires: ${new Date(invitation.expiresAt).toLocaleDateString()}`
                              : 'Expired'}
                            </>
                          )}
                        </div>
                        {invitation.message && (
                          <div className="mt-2 text-sm italic text-gray-500">
                            &quot;{invitation.message}&quot;
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="sm:flex ml-14 sm:ml-0 space-y-2 sm:space-y-0 sm:space-x-3">
                      {invitation.status === 'PENDING' && 
                       (!invitation.expiresAt || new Date(invitation.expiresAt) > new Date()) && (
                        <>
                          <button
                            onClick={() => acceptInvitation(invitation.id)}
                            className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Respond
                          </button>
                          <button
                            onClick={() => declineInvitation(invitation.id)}
                            className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            Decline
                          </button>
                        </>
                      )}
                      
                      {invitation.status === 'ACCEPTED' && (
                        <Link
                          href={`/talent/questionnaires/${invitation.id}/respond`}
                          className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Continue Response
                        </Link>
                      )}
                      
                      {invitation.status === 'COMPLETED' && (
                        <Link
                          href={`/talent/questionnaires/${invitation.id}/view`}
                          className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          View Response
                        </Link>
                      )}
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