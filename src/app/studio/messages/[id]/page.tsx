'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui';

type Message = {
  id: string;
  subject: string;
  content: string;
  sender?: {
    id?: string;
    user: {
      id?: string;
      firstName: string;
      lastName: string;
      email: string;
    }
  };
  recipient?: {
    id?: string;
    user: {
      id?: string;
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
  const [replyContent, setReplyContent] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replySent, setReplySent] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
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
      // Use the profile ID of the sender if available (likely the talent profile ID)
      const recipientId = message.sender.id || message.sender.user.id;
      if (recipientId) {
        router.push(`/studio/messages/new?recipientId=${recipientId}`);
      } else {
        console.error('Cannot reply: No recipient ID available');
      }
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message?.sender || !replyContent.trim()) {
      return;
    }

    setSendingReply(true);

    try {
      // Get recipient ID (talent profile ID)
      const recipientId = message.sender.id || message.sender.user.id;

      if (!recipientId) {
        throw new Error("Missing recipient information");
      }

      const response = await fetch('/api/studio/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId: recipientId,
          subject: `Re: ${message.subject}`,
          content: replyContent,
          originalMessageId: params.id,
          // Pass along related project/casting call if present
          ...(message.relatedToProject && { relatedToProjectId: message.relatedToProject.id }),
          ...(message.relatedToCastingCall && { relatedToCastingCallId: message.relatedToCastingCall.id }),
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('Error response data:', responseData);
        throw new Error(responseData.error || responseData.details || 'Failed to send reply');
      }

      setReplyContent('');

      // Show success message but keep user on the current message page
      setReplySent(true);
      setSuccessMessage('Your reply has been sent successfully');

      // Reload the current message view to see the update with the new reply
      setTimeout(() => {
        fetchMessage(); // First refresh the current thread view to show the reply

        // Reset reply form after 3 seconds
        setTimeout(() => {
          setReplySent(false);
          setSuccessMessage(null);
        }, 3000);
      }, 500);
    } catch (error) {
      console.error('Error sending reply:', error);
      setError('Failed to send reply: ' + (error instanceof Error ? error.message : String(error)));
      setSendingReply(false);

      // Clear error after 3 seconds
      setTimeout(() => {
        setError('');
      }, 3000);
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

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="mb-6 bg-green-50 border-green-200 text-green-900">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
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
                <Link
                  href={`/studio/messages/new?recipientId=${message.sender?.id || message.sender?.user.id || ''}`}
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

      {!isSent && message.sender && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Reply to {message.sender.user.firstName} {message.sender.user.lastName}
            </h2>
            <form onSubmit={handleReply}>
              <div className="mb-4">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write your reply here..."
                  rows={6}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={sendingReply || replySent || !replyContent.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
                >
                  {sendingReply ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Send Reply
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}