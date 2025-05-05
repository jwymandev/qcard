'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type Recipient = {
  id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
};

type Project = {
  id: string;
  title: string;
  status: string;
};

type CastingCall = {
  id: string;
  title: string;
  status: string;
};

function NewMessageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [recipientId, setRecipientId] = useState(searchParams?.get('recipientId') || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [relatedToProjectId, setRelatedToProjectId] = useState('');
  const [relatedToCastingCallId, setRelatedToCastingCallId] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [talents, setTalents] = useState<Recipient[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [castingCalls, setCastingCalls] = useState<CastingCall[]>([]);
  
  // Fetch recipient details if ID is provided in URL
  useEffect(() => {
    if (recipientId) {
      fetchRecipientDetails();
    }
  }, [recipientId]);
  
  // Fetch reference data
  useEffect(() => {
    if (status === 'authenticated') {
      fetchReferenceData();
    } else if (status === 'unauthenticated') {
      router.push('/sign-in');
    }
  }, [status]);
  
  const fetchRecipientDetails = async () => {
    try {
      const response = await fetch(`/api/talent/profile/${recipientId}`);
      if (response.ok) {
        const data = await response.json();
        setRecipient(data);
      } else {
        setError('Failed to load recipient details');
      }
    } catch (error) {
      console.error('Error fetching recipient:', error);
      setError('Failed to load recipient details');
    }
  };
  
  const fetchReferenceData = async () => {
    try {
      // Fetch talents
      const talentsResponse = await fetch('/api/studio/talent-search?limit=100');
      if (talentsResponse.ok) {
        const data = await talentsResponse.json();
        setTalents(data.profiles);
      }
      
      // Fetch projects
      const projectsResponse = await fetch('/api/studio/projects');
      if (projectsResponse.ok) {
        const data = await projectsResponse.json();
        setProjects(data);
      }
      
      // Fetch casting calls
      const castingCallsResponse = await fetch('/api/studio/casting-calls');
      if (castingCallsResponse.ok) {
        const data = await castingCallsResponse.json();
        setCastingCalls(data);
      }
    } catch (error) {
      console.error('Error fetching reference data:', error);
      setError('Failed to load reference data');
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recipientId || !subject || !message) {
      setError('Please fill out all required fields');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/studio/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId,
          subject,
          content: message,
          ...(relatedToProjectId && { relatedToProjectId }),
          ...(relatedToCastingCallId && { relatedToCastingCallId }),
        }),
      });
      
      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/studio/messages');
        }, 2000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    } finally {
      setLoading(false);
    }
  };
  
  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/studio/messages" className="text-blue-600 hover:text-blue-800">
          ← Back to Messages
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">New Message</h1>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded mb-4">
            Message sent successfully! Redirecting...
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipient *
            </label>
            {recipient ? (
              <div className="flex items-center mb-2">
                <div className="flex-1">
                  <span className="font-medium">{recipient.user.firstName} {recipient.user.lastName}</span>
                  <span className="text-gray-500 ml-2">({recipient.user.email})</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRecipient(null);
                    setRecipientId('');
                  }}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Change
                </button>
              </div>
            ) : (
              <div>
                <div className="flex mb-2">
                  <input 
                    type="text"
                    placeholder="Search for talent by name..."
                    className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    onChange={(e) => {
                      // Simple search filter
                      const searchTerm = e.target.value.toLowerCase();
                      if (searchTerm.length > 0) {
                        const filtered = talents.filter(t => 
                          `${t.user.firstName} ${t.user.lastName}`.toLowerCase().includes(searchTerm) ||
                          t.user.email.toLowerCase().includes(searchTerm)
                        );
                        // Auto-select if only one match
                        if (filtered.length === 1) {
                          setRecipientId(filtered[0].id);
                        }
                      }
                    }}
                  />
                  <Link
                    href="/studio/talent-search"
                    className="px-4 py-2 bg-gray-100 text-gray-700 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-200"
                    target="_blank"
                  >
                    Advanced Search
                  </Link>
                </div>
                <select
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                  size={5}
                >
                  <option value="">Select a recipient</option>
                  {talents.map((talent) => (
                    <option key={talent.id} value={talent.id}>
                      {talent.user.firstName} {talent.user.lastName} ({talent.user.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Related Project
              </label>
              <select
                value={relatedToProjectId}
                onChange={(e) => setRelatedToProjectId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">None</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title} ({project.status})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Related Casting Call
              </label>
              <select
                value={relatedToCastingCallId}
                onChange={(e) => setRelatedToCastingCallId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">None</option>
                {castingCalls.map((call) => (
                  <option key={call.id} value={call.id}>
                    {call.title} ({call.status})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            ></textarea>
          </div>
          
          <div className="flex justify-end">
            <Link
              href="/studio/messages"
              className="mr-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || success}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
            >
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewMessagePage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <NewMessageContent />
    </Suspense>
  );
}