'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge, Button, Spinner, Alert, AlertDescription, AlertTitle } from '@/components/ui';

interface Invitation {
  id: string;
  subject: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  Profile_Message_talentReceiverIdToProfile: {
    id: string;
    User: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  hasResponded: boolean;
  responseStatus: string | null;
  responseDate: string | null;
}

export default function CastingCallInvitationsPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const castingCallId = params.id;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [castingCall, setCastingCall] = useState<any>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    responded: 0,
    pending: 0,
    applied: 0,
    approved: 0,
    rejected: 0
  });
  
  // Fetch casting call details
  const fetchCastingCall = async () => {
    try {
      const response = await fetch(`/api/studio/casting-calls/${castingCallId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch casting call details');
      }
      
      const data = await response.json();
      setCastingCall(data);
    } catch (error) {
      console.error('Error fetching casting call:', error);
      setError('Failed to load casting call details. Please try again later.');
    }
  };
  
  // Fetch invitations
  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/studio/casting-calls/${castingCallId}/invitations`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch invitations');
      }
      
      const data = await response.json();
      setInvitations(data);
      
      // Calculate stats
      const totalInvites = data.length;
      const responded = data.filter((inv: Invitation) => inv.hasResponded).length;
      const pending = totalInvites - responded;
      const applied = data.filter((inv: Invitation) => inv.responseStatus === 'PENDING').length;
      const approved = data.filter((inv: Invitation) => inv.responseStatus === 'APPROVED').length;
      const rejected = data.filter((inv: Invitation) => inv.responseStatus === 'REJECTED').length;
      
      setStats({
        total: totalInvites,
        responded,
        pending,
        applied,
        approved,
        rejected
      });
      
    } catch (error) {
      console.error('Error fetching invitations:', error);
      setError('Failed to load invitations. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    if (status === 'authenticated') {
      fetchCastingCall();
      fetchInvitations();
    } else if (status === 'unauthenticated') {
      router.push('/sign-in');
    }
  }, [status, castingCallId, router]);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Get status badge variant
  const getStatusVariant = (status: string | null) => {
    if (!status) return 'outline';
    
    switch (status) {
      case 'PENDING': return 'secondary';
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'destructive';
      default: return 'outline';
    }
  };
  
  // Send another invitation
  const sendMoreInvitations = () => {
    router.push(`/studio/talent-invitation?type=casting-call&id=${castingCallId}&title=${encodeURIComponent(castingCall?.title || 'Casting Call')}`);
  };
  
  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
        <span className="ml-2">Loading...</span>
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
        <div className="text-center mt-4">
          <Link href={`/studio/casting-calls/${castingCallId}`} className="text-blue-600 hover:text-blue-800">
            Back to Casting Call
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Invitations</h1>
          {castingCall && (
            <p className="text-gray-600">
              For casting call: {castingCall.title}
            </p>
          )}
        </div>
        <div className="flex space-x-3">
          <Link
            href={`/studio/casting-calls/${castingCallId}`}
            className="px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
          >
            Back to Casting Call
          </Link>
          <Button onClick={sendMoreInvitations}>
            Send More Invitations
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
          <div className="text-sm text-gray-500">Total Invitations</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">{stats.responded}</div>
          <div className="text-sm text-gray-500">Responded</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
          <div className="text-sm text-gray-500">Pending Response</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-yellow-600">{stats.applied}</div>
          <div className="text-sm text-gray-500">Applied</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          <div className="text-sm text-gray-500">Approved</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          <div className="text-sm text-gray-500">Rejected</div>
        </div>
      </div>
      
      {/* Invitations List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Invitation History</h2>
        </div>
        
        {invitations.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No invitations have been sent for this casting call yet.
            <div className="mt-4">
              <Button onClick={sendMoreInvitations}>
                Send Invitations
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Talent
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Sent
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Response Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invitations.map((invitation) => (
                  <tr key={invitation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 mr-3">
                          {invitation.Profile_Message_talentReceiverIdToProfile?.User.firstName?.charAt(0) || ''}
                          {invitation.Profile_Message_talentReceiverIdToProfile?.User.lastName?.charAt(0) || ''}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {invitation.Profile_Message_talentReceiverIdToProfile?.User.firstName || ''} {invitation.Profile_Message_talentReceiverIdToProfile?.User.lastName || ''}
                          </div>
                          <div className="text-sm text-gray-500">
                            {invitation.Profile_Message_talentReceiverIdToProfile?.User.email || ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(invitation.createdAt)}</div>
                      <div className="text-xs text-gray-500">
                        {invitation.isRead ? 'Read' : 'Unread'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {invitation.hasResponded ? (
                        <Badge variant={getStatusVariant(invitation.responseStatus)}>
                          {invitation.responseStatus || 'Responded'}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Awaiting Response</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {invitation.responseDate ? formatDate(invitation.responseDate) : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          href={`/studio/talent/${invitation.Profile_Message_talentReceiverIdToProfile?.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Profile
                        </Link>
                        <Link
                          href={`/studio/messages/new?recipientId=${invitation.Profile_Message_talentReceiverIdToProfile?.id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Message
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}