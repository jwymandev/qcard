'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Spinner, Badge, Button, Textarea, Alert, AlertTitle, AlertDescription } from '@/components/ui';

type Message = {
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
};

export default function MessageDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const messageId = params.id;
  
  const [message, setMessage] = useState<Message | null>(null);
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
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send reply');
      }
      
      setReplyContent('');
      setReplySent(true);
      
      // Reload the message to see the update
      setTimeout(() => {
        router.push('/talent/messages');
      }, 2000);
    } catch (error) {
      console.error('Error sending reply:', error);
      setError('Failed to send reply. Please try again later.');
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
        router.push('/talent/messages');
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
      const response = await fetch(`/api/talent/messages/${messageId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        router.push('/talent/messages');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
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
          <AlertDescription>Your reply has been sent successfully. Returning to messages...</AlertDescription>
        </Alert>
      )}
      
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-xl font-bold text-gray-900">{message.subject}</h1>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={archiveMessage}>
                Archive
              </Button>
              <Button variant="outline" size="sm" onClick={deleteMessage} className="text-red-600 border-red-200 hover:bg-red-50">
                Delete
              </Button>
            </div>
          </div>
          
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
          
          <div className="border-t border-gray-200 pt-4">
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: message.content.replace(/\n/g, '<br>') }} />
          </div>
        </div>
      </div>
      
      {!message.isSent && message.sender && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Reply</h2>
            <form onSubmit={handleReply}>
              <div className="mb-4">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write your reply here..."
                  rows={6}
                  required
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={sendingReply || replySent || !replyContent.trim()}
                >
                  {sendingReply ? 'Sending...' : 'Send Reply'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}