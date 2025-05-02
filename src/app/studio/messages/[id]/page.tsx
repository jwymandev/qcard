'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Message = {
  id: string;
  subject: string;
  content: string;
  sender?: {
    user: {
      firstName: string;
      lastName: string;
      email: string;
    }
  };
  recipient?: {
    user: {
      firstName: string;
      lastName: string;
      email: string;
    }
  };
  isRead: boolean;
  isArchived: boolean;
  createdAt: string;
  relatedToProject?: {
    id: string;
    title: string;
  };
  relatedToCastingCall?: {
    id: string;
    title: string;
  };
};

export default function MessageDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const fetchMessage = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/studio/messages/${params.id}`);
      
      if (response.ok) {
        const data = await response.json();
        setMessage(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load message');
      }
    } catch (error) {
      console.error('Error fetching message:', error);
      setError('Failed to load message');
    } finally {
      setLoading(false);
    }
  };
  
  const archiveMessage = async () => {
    try {
      const response = await fetch(`/api/studio/messages/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isArchived: true }),
      });
      
      if (response.ok) {
        if (message) {
          setMessage({
            ...message,
            isArchived: true,
          });
        }
      }
    } catch (error) {
      console.error('Error archiving message:', error);
    }
  };
  
  const deleteMessage = async () => {
    if (!confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/studio/messages/${params.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        router.push('/studio/messages');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };
  
  const replyToMessage = () => {
    if (message?.sender) {
      router.push(`/studio/messages/new?recipientId=${message.sender.user.id}`);
    }
  };
  
  useEffect(() => {
    if (status === 'authenticated') {
      fetchMessage();
    } else if (status === 'unauthenticated') {
      router.push('/sign-in');
    }
  }, [status, params.id]);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <Link
          href="/studio/messages"
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Messages
        </Link>
      </div>
    );
  }
  
  if (!message) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-600 px-4 py-3 rounded mb-4">
          Message not found
        </div>
        <Link
          href="/studio/messages"
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Messages
        </Link>
      </div>
    );
  }
  
  const isSent = !message.sender;
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/studio/messages"
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Messages
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold">{message.subject}</h1>
              <div className="mt-2 text-sm text-gray-600">
                {isSent ? (
                  <p>
                    To: {message.recipient?.user.firstName} {message.recipient?.user.lastName}
                  </p>
                ) : (
                  <p>
                    From: {message.sender?.user.firstName} {message.sender?.user.lastName} ({message.sender?.user.email})
                  </p>
                )}
                <p className="mt-1">{formatDate(message.createdAt)}</p>
              </div>
            </div>
            <div className="flex space-x-3">
              {!isSent && (
                <button
                  onClick={replyToMessage}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Reply
                </button>
              )}
              <button
                onClick={archiveMessage}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Archive
              </button>
              <button
                onClick={deleteMessage}
                className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
          
          {(message.relatedToProject || message.relatedToCastingCall) && (
            <div className="mb-4 flex items-center space-x-2">
              {message.relatedToProject && (
                <Link
                  href={`/studio/projects/${message.relatedToProject.id}`}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200"
                >
                  Project: {message.relatedToProject.title}
                </Link>
              )}
              {message.relatedToCastingCall && (
                <Link
                  href={`/studio/casting-calls/${message.relatedToCastingCall.id}`}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 hover:bg-purple-200"
                >
                  Casting Call: {message.relatedToCastingCall.title}
                </Link>
              )}
            </div>
          )}
          
          <div className="prose max-w-none mt-6 pb-6 border-b border-gray-200">
            <p>{message.content}</p>
          </div>
          
          <div className="mt-6 flex justify-between">
            <div className="flex space-x-3">
              {!isSent && (
                <button
                  onClick={replyToMessage}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Reply
                </button>
              )}
              {!isSent && (
                <Link
                  href={`/studio/messages/new?recipientId=${message.sender?.user.id}`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Forward
                </Link>
              )}
            </div>
            <div>
              <button
                onClick={deleteMessage}
                className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}