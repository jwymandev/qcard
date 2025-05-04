'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

// Type definitions
type Talent = {
  id: string;
  profileId: string;
  name: string;
  imageUrl: string | null;
  email: string;
  tags: string[];
};

type Invitation = {
  id: string;
  talentId: string;
  talentName: string;
  talentImageUrl: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED';
  sentAt: string;
  expiresAt: string | null;
  completedAt: string | null;
};

type Questionnaire = {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
};

export default function QuestionnaireInvitationsPage() {
  const router = useRouter();
  const params = useParams();
  const questionnaireId = params.id as string;
  
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [talents, setTalents] = useState<Talent[]>([]);
  const [selectedTalents, setSelectedTalents] = useState<string[]>([]);
  const [sendingInvites, setSendingInvites] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [expireDays, setExpireDays] = useState(14);
  
  // Load questionnaire and invitations
  useEffect(() => {
    async function loadData() {
      try {
        // Replace with real API calls once implemented
        // const qResponse = await fetch(`/api/studio/questionnaires/${questionnaireId}`);
        // const qData = await qResponse.json();
        // const iResponse = await fetch(`/api/studio/questionnaires/${questionnaireId}/invitations`);
        // const iData = await iResponse.json();
        
        // Mock data
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const mockQuestionnaire: Questionnaire = {
          id: questionnaireId,
          title: 'Casting Call Questionnaire',
          description: 'Additional information for our upcoming film project',
          isActive: true
        };
        
        const mockInvitations: Invitation[] = [
          {
            id: '1',
            talentId: '101',
            talentName: 'Jane Smith',
            talentImageUrl: null,
            status: 'COMPLETED',
            sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            expiresAt: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
            completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '2',
            talentId: '102',
            talentName: 'John Davis',
            talentImageUrl: null,
            status: 'PENDING',
            sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            expiresAt: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString(),
            completedAt: null
          },
          {
            id: '3',
            talentId: '103',
            talentName: 'Emma Wilson',
            talentImageUrl: null,
            status: 'ACCEPTED',
            sentAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
            expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
            completedAt: null
          },
          {
            id: '4',
            talentId: '104',
            talentName: 'Michael Brown',
            talentImageUrl: null,
            status: 'DECLINED',
            sentAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
            expiresAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
            completedAt: null
          }
        ];
        
        setQuestionnaire(mockQuestionnaire);
        setInvitations(mockInvitations);
        setLoading(false);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load questionnaire data');
        setLoading(false);
      }
    }
    
    loadData();
  }, [questionnaireId]);
  
  // Load available talents
  useEffect(() => {
    if (!showInviteModal) return;
    
    async function loadTalents() {
      try {
        // Replace with real API call
        // const response = await fetch('/api/studio/talents');
        // const data = await response.json();
        
        // Mock data
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Create array of already invited talent IDs
        const invitedTalentIds = invitations.map(inv => inv.talentId);
        
        const mockTalents: Talent[] = [
          {
            id: '101',
            profileId: 'p101',
            name: 'Jane Smith',
            imageUrl: null,
            email: 'jane.smith@example.com',
            tags: ['Actor', 'Female', 'Age 25-35']
          },
          {
            id: '102',
            profileId: 'p102',
            name: 'John Davis',
            imageUrl: null,
            email: 'john.davis@example.com',
            tags: ['Actor', 'Male', 'Age 30-40']
          },
          {
            id: '103',
            profileId: 'p103',
            name: 'Emma Wilson',
            imageUrl: null,
            email: 'emma.wilson@example.com',
            tags: ['Actor', 'Female', 'Age 20-30']
          },
          {
            id: '104',
            profileId: 'p104',
            name: 'Michael Brown',
            imageUrl: null,
            email: 'michael.brown@example.com',
            tags: ['Actor', 'Male', 'Age 35-45']
          },
          {
            id: '105',
            profileId: 'p105',
            name: 'Sarah Johnson',
            imageUrl: null,
            email: 'sarah.johnson@example.com',
            tags: ['Actor', 'Female', 'Age 25-35']
          },
          {
            id: '106',
            profileId: 'p106',
            name: 'David Lee',
            imageUrl: null,
            email: 'david.lee@example.com',
            tags: ['Actor', 'Male', 'Age 40-50']
          }
        ];
        
        // Filter out already invited talents
        const availableTalents = mockTalents.filter(
          talent => !invitedTalentIds.includes(talent.id)
        );
        
        setTalents(availableTalents);
      } catch (err) {
        console.error('Error loading talents:', err);
      }
    }
    
    loadTalents();
  }, [showInviteModal, invitations]);
  
  // Filter talents based on search term
  const filteredTalents = talents.filter(talent => 
    talent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    talent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    talent.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Handle talent selection
  const toggleTalentSelection = (talentId: string) => {
    setSelectedTalents(prev => 
      prev.includes(talentId)
        ? prev.filter(id => id !== talentId)
        : [...prev, talentId]
    );
  };
  
  // Send invitations
  const sendInvitations = async () => {
    if (selectedTalents.length === 0) {
      return;
    }
    
    setSendingInvites(true);
    
    try {
      // Create invitation data
      const invitationData = {
        questionnaireId,
        talentIds: selectedTalents,
        message: inviteMessage,
        expireDays
      };
      
      // Replace with real API call
      // const response = await fetch(`/api/studio/questionnaires/${questionnaireId}/invitations`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(invitationData),
      // });
      // const data = await response.json();
      
      // Mock successful response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh invitations
      const newInvitations = selectedTalents.map(talentId => {
        const talent = talents.find(t => t.id === talentId)!;
        return {
          id: `new_${Date.now()}_${talentId}`,
          talentId,
          talentName: talent.name,
          talentImageUrl: talent.imageUrl,
          status: 'PENDING' as const,
          sentAt: new Date().toISOString(),
          expiresAt: expireDays ? new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000).toISOString() : null,
          completedAt: null
        };
      });
      
      setInvitations(prev => [...prev, ...newInvitations]);
      setShowInviteModal(false);
      setSelectedTalents([]);
      setInviteMessage('');
    } catch (err) {
      console.error('Error sending invitations:', err);
    } finally {
      setSendingInvites(false);
    }
  };
  
  // Resend an invitation
  const resendInvitation = async (invitationId: string) => {
    try {
      // Replace with real API call
      // await fetch(`/api/studio/questionnaires/${questionnaireId}/invitations/${invitationId}/resend`, {
      //   method: 'POST',
      // });
      
      // Mock successful response
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update invitation
      setInvitations(prev => 
        prev.map(inv => 
          inv.id === invitationId
            ? {
                ...inv,
                sentAt: new Date().toISOString(),
                expiresAt: expireDays ? new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000).toISOString() : null,
              }
            : inv
        )
      );
      
      alert('Invitation resent successfully');
    } catch (err) {
      console.error('Error resending invitation:', err);
      alert('Failed to resend invitation');
    }
  };
  
  // Cancel an invitation
  const cancelInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) {
      return;
    }
    
    try {
      // Replace with real API call
      // await fetch(`/api/studio/questionnaires/${questionnaireId}/invitations/${invitationId}`, {
      //   method: 'DELETE',
      // });
      
      // Mock successful response
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Remove invitation
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
    } catch (err) {
      console.error('Error canceling invitation:', err);
      alert('Failed to cancel invitation');
    }
  };
  
  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
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
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-500">Loading invitations...</span>
      </div>
    );
  }
  
  if (!questionnaire) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-md p-6">
        <p className="text-red-500">Questionnaire not found or access denied.</p>
        <Link
          href="/studio/questionnaires"
          className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Back to Questionnaires
        </Link>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Invitations: {questionnaire.title}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {questionnaire.description}
          </p>
          {!questionnaire.isActive && (
            <p className="mt-2 text-sm text-yellow-600">
              This questionnaire is currently inactive and cannot receive new responses.
            </p>
          )}
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Link
            href={`/studio/questionnaires/${questionnaireId}`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Edit Questionnaire
          </Link>
          <Link
            href="/studio/questionnaires"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Questionnaires
          </Link>
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
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Sent Invitations ({invitations.length})
            </h3>
            <button
              onClick={() => setShowInviteModal(true)}
              disabled={!questionnaire.isActive}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
            >
              Invite Talents
            </button>
          </div>
          
          {invitations.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No invitations sent yet. Click &quot;Invite Talents&quot; to get started.
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {invitations.map((invitation) => (
                <li key={invitation.id} className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        {invitation.talentImageUrl ? (
                          <img
                            src={invitation.talentImageUrl}
                            alt={invitation.talentName}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <span className="text-gray-500 text-sm font-medium">
                            {invitation.talentName.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {invitation.talentName}
                        </div>
                        <div className="text-sm text-gray-500">
                          Sent: {new Date(invitation.sentAt).toLocaleDateString()}
                          {invitation.completedAt && (
                            <> • Completed: {new Date(invitation.completedAt).toLocaleDateString()}</>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(invitation.status)}`}>
                        {invitation.status}
                      </span>
                      
                      {invitation.status === 'PENDING' && (
                        <>
                          {invitation.expiresAt && new Date(invitation.expiresAt) > new Date() && (
                            <span className="text-xs text-gray-500">
                              Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                            </span>
                          )}
                          <button
                            onClick={() => resendInvitation(invitation.id)}
                            className="inline-flex items-center px-2.5 py-1.5 border border-blue-300 text-xs font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Resend
                          </button>
                          <button
                            onClick={() => cancelInvitation(invitation.id)}
                            className="inline-flex items-center px-2.5 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      
                      {invitation.status === 'COMPLETED' && (
                        <Link
                          href={`/studio/questionnaires/${questionnaireId}/responses/${invitation.id}`}
                          className="inline-flex items-center px-2.5 py-1.5 border border-blue-300 text-xs font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
      
      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 overflow-y-auto z-10">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mt-3 text-center sm:mt-0 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Invite Talents to Questionnaire
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Select talents to send this questionnaire to. They will receive an email invitation.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-5">
                <div className="mb-4">
                  <label htmlFor="invite-message" className="block text-sm font-medium text-gray-700">
                    Message (Optional)
                  </label>
                  <textarea
                    id="invite-message"
                    rows={2}
                    className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Add a personalized message to the invitation"
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="expire-days" className="block text-sm font-medium text-gray-700">
                    Expires After
                  </label>
                  <select
                    id="expire-days"
                    className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={expireDays}
                    onChange={(e) => setExpireDays(parseInt(e.target.value))}
                  >
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                    <option value={0}>Never expires</option>
                  </select>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="talent-search" className="block text-sm font-medium text-gray-700">
                    Search Talents
                  </label>
                  <input
                    type="text"
                    id="talent-search"
                    className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Search by name, email, or tags"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="mt-2 max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                  {filteredTalents.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      {talents.length === 0
                        ? 'No talents available to invite'
                        : 'No talents match your search criteria'}
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-200">
                      {filteredTalents.map((talent) => (
                        <li key={talent.id} className="px-4 py-3">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id={`talent-${talent.id}`}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              checked={selectedTalents.includes(talent.id)}
                              onChange={() => toggleTalentSelection(talent.id)}
                            />
                            <label htmlFor={`talent-${talent.id}`} className="ml-3 block">
                              <div className="text-sm font-medium text-gray-900">{talent.name}</div>
                              <div className="text-sm text-gray-500">{talent.email}</div>
                              <div className="mt-1 flex flex-wrap">
                                {talent.tags.map((tag, i) => (
                                  <span key={i} className="mr-1 mb-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </label>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                
                <div className="flex justify-between items-center mt-5">
                  <div className="text-sm text-gray-500">
                    {selectedTalents.length} talent{selectedTalents.length !== 1 ? 's' : ''} selected
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      onClick={() => setShowInviteModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                      onClick={sendInvitations}
                      disabled={selectedTalents.length === 0 || sendingInvites}
                    >
                      {sendingInvites ? 'Sending...' : 'Send Invitations'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}