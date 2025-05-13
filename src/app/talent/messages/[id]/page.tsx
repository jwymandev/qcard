'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Spinner, Badge, Button, Textarea, Alert, AlertTitle, AlertDescription } from '@/components/ui';

type MessageDetails = {
  id: string;
  subject: string;
  content: string;
  sender: {
    id: string;
    name: string;
    description?: string;
    email?: string;
  } | null;
  recipient: {
    id: string;
    name: string;
    description?: string;
    email?: string;
  } | null;
  isRead: boolean;
  isArchived: boolean;
  createdAt: string;
  isSent: boolean;
  relatedToProject?: {
    id: string;
    title: string;
    description?: string;
  };
  relatedToCastingCall?: {
    id: string;
    title: string;
    description?: string;
  };
  // Thread-related fields
  thread?: ThreadMessage[];
  baseSubject?: string;
  // UI state fields (not from API)
  _deleteSuccess?: boolean;
  _archiveSuccess?: boolean;
};

type ThreadMessage = {
  id: string;
  subject: string;
  content: string;
  isRead: boolean;
  isArchived: boolean;
  createdAt: string;
  isSent: boolean;
  isCurrentMessage: boolean;
  sender: {
    id: string;
    name: string;
    description?: string;
    email?: string;
  } | null;
  recipient: {
    id: string;
    name: string;
    description?: string;
    email?: string;
  } | null;
};

export default function MessageDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const messageId = params.id;
  
  const [message, setMessage] = useState<MessageDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replySent, setReplySent] = useState(false);
  
  useEffect(() => {
    if (status === 'authenticated') {
      fetchMessage();
    } else if (status === 'unauthenticated') {
      router.push('/sign-in');
    }
  }, [status, messageId, router]);
  
  const fetchMessage = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/talent/messages/${messageId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load message');
      }
      
      const data = await response.json();
      setMessage(data);
    } catch (error) {
      console.error('Error fetching message:', error);
      setError('Failed to load message. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message || !message.sender || !replyContent.trim()) {
      return;
    }
    
    setSendingReply(true);
    
    try {
      if (!message.sender || !message.sender.id) {
        throw new Error("Missing sender information");
      }
      
      const response = await fetch('/api/talent/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId: message.sender.id,
          subject: `Re: ${message.subject}`,
          content: replyContent,
          originalMessageId: messageId,
        }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('Error response data:', responseData);
        throw new Error(responseData.error || responseData.details || 'Failed to send reply');
      }
      
      setReplyContent('');

      // Show success message but keep user on the current message page
      // to see their reply added to the thread
      setReplySent(true);

      // Reload the current message view to see the update with the new reply
      setTimeout(() => {
        fetchMessage(); // First refresh the current thread view to show the reply

        // Reset reply form after 2 seconds
        setTimeout(() => {
          setReplySent(false);
        }, 2000);
      }, 500);
    } catch (error) {
      console.error('Error sending reply:', error);
      setError('Failed to send reply: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSendingReply(false);
    }
  };
  
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
  
  const archiveMessage = async () => {
    try {
      const response = await fetch(`/api/talent/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isArchived: true }),
      });

      if (response.ok) {
        setError(null);
        setReplySent(false);
        // Show success message and then redirect
        setMessage(prev => ({
          ...prev!,
          _archiveSuccess: true
        } as any));

        // Redirect after a brief delay to show the success message
        setTimeout(() => {
          router.push('/talent/messages');
        }, 2000);
      }
    } catch (error) {
      console.error('Error archiving message:', error);
      setError('Failed to archive message');
    }
  };
  
  const deleteMessage = async () => {
    try {
      const response = await fetch(`/api/talent/messages/${messageId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setError(null);
        setReplySent(false);
        // Show success message and then redirect
        setMessage(prev => ({
          ...prev!,
          _deleteSuccess: true
        } as any));

        // Redirect after a brief delay to show the success message
        setTimeout(() => {
          router.push('/talent/messages');
        }, 2000);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      setError('Failed to delete message');
    }
  };
  
  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
        <span className="ml-2">Loading message...</span>
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
        <Button onClick={() => router.push('/talent/messages')}>
          Return to Messages
        </Button>
      </div>
    );
  }
  
  if (!message) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="mb-6">
          <AlertTitle>Not Found</AlertTitle>
          <AlertDescription>Message not found or was deleted.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/talent/messages')}>
          Return to Messages
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/talent/messages" className="text-blue-600 hover:text-blue-800">
          ← Back to Messages
        </Link>
      </div>
      
      {replySent && (
        <Alert className="mb-6 bg-green-50 border-green-200 text-green-900">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>
            Your reply has been sent successfully and added to this conversation thread.
          </AlertDescription>
        </Alert>
      )}

      {message?._deleteSuccess && (
        <Alert className="mb-6 bg-green-50 border-green-200 text-green-900">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>
            Message deleted successfully. Redirecting to conversations...
          </AlertDescription>
        </Alert>
      )}

      {message?._archiveSuccess && (
        <Alert className="mb-6 bg-green-50 border-green-200 text-green-900">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>
            Message archived successfully. Redirecting to conversations...
          </AlertDescription>
        </Alert>
      )}
      
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-xl font-bold text-gray-900">
              {message.baseSubject ? message.baseSubject : message.subject}
              {message.thread && message.thread.length > 1 && (
                <span className="ml-2 text-sm text-gray-500 font-normal">
                  ({message.thread.length} messages)
                </span>
              )}
            </h1>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={archiveMessage}>
                Archive
              </Button>
              <Button variant="outline" size="sm" onClick={deleteMessage} className="text-red-600 border-red-200 hover:bg-red-50">
                Delete
              </Button>
            </div>
          </div>

          {(message.relatedToProject || message.relatedToCastingCall) && (
            <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-200">
              {message.relatedToProject && (
                <div>
                  <p className="font-medium text-gray-700">Related Project:</p>
                  <p className="text-blue-600">{message.relatedToProject.title}</p>
                  {message.relatedToProject.description && (
                    <p className="text-sm text-gray-600 mt-1">{message.relatedToProject.description}</p>
                  )}
                </div>
              )}
              {message.relatedToCastingCall && (
                <div className={message.relatedToProject ? 'mt-3' : ''}>
                  <p className="font-medium text-gray-700">Related Casting Call:</p>
                  <p className="text-purple-600">{message.relatedToCastingCall.title}</p>
                  {message.relatedToCastingCall.description && (
                    <p className="text-sm text-gray-600 mt-1">{message.relatedToCastingCall.description}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Thread View */}
          {message.thread && message.thread.length > 0 ? (
            <div className="mb-6 border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <span className="font-medium text-gray-700">Conversation Thread ({message.thread.length} messages)</span>
                </div>
              </div>
              {message.thread.map((threadMsg, index) => (
                <div
                  key={threadMsg.id}
                  className={`p-4 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                    threadMsg.isCurrentMessage ? 'border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className={`font-medium ${threadMsg.isSent ? 'text-blue-600' : 'text-gray-800'}`}>
                        {threadMsg.isSent ? 'You' : threadMsg.sender?.name}
                      </span>
                      <span className="text-gray-500 mx-2">→</span>
                      <span className="text-gray-700">
                        {threadMsg.isSent ? threadMsg.recipient?.name : 'You'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDate(threadMsg.createdAt)}
                    </span>
                  </div>

                  <div className={`ml-0 p-3 rounded-lg ${
                    threadMsg.isSent ? 'bg-blue-50 border border-blue-100' : 'bg-gray-100 border border-gray-200'
                  }`}>
                    <div className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: threadMsg.content.replace(/\n/g, '<br>') }}
                    />
                  </div>

                  {threadMsg.isCurrentMessage && (
                    <div className="mt-1 text-xs text-blue-600 flex items-center">
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
                      <span>Current message</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // Fallback to display only the current message if no thread is available
            <div className="border-t border-gray-200 pt-4 mb-6">
              <div className="mb-4 text-sm">
                <div className="flex justify-between">
                  <div>
                    <p>
                      <span className="text-gray-500">From:</span>{' '}
                      <span className="font-medium">
                        {message.isSent ? 'You' : message.sender?.name}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-500">To:</span>{' '}
                      <span className="font-medium">
                        {message.isSent ? message.recipient?.name : 'You'}
                      </span>
                    </p>
                  </div>
                  <p className="text-gray-500">{formatDate(message.createdAt)}</p>
                </div>
              </div>
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: message.content.replace(/\n/g, '<br>') }} />
            </div>
          )}
        </div>
      </div>
      
      {!message.isSent && message.sender && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Reply to this thread
            </h2>
            <p className="text-sm text-gray-500 mb-4">Your response will be sent to {message.sender.name}</p>
            <form onSubmit={handleReply}>
              <div className="mb-4">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write your reply here..."
                  rows={6}
                  required
                  className="focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={sendingReply || replySent || !replyContent.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {sendingReply ? (
                    <>
                      <Spinner className="h-4 w-4 mr-2" />
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
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}