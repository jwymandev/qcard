'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Spinner, Badge, Button, Alert, AlertDescription, AlertTitle } from '@/components/ui';

type Conversation = {
  id: string;
  subject: string;
  preview: string;
  latestMessageId: string;
  latestMessageDate: string;
  messageCount: number;
  unreadCount: number;
  hasUnread: boolean;
  studio: {
    id: string;
    name: string;
    description?: string;
  } | null;
  relatedToProject?: {
    id: string;
    title: string;
  };
  relatedToCastingCall?: {
    id: string;
    title: string;
  };
};

export default function TalentMessagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const url = `/api/talent/messages${showUnreadOnly ? '?unread=true' : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load conversations');
      }

      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setError('Failed to load conversations. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const archiveConversation = async (conversationId: string, messageId: string) => {
    try {
      // Archive the specific message
      const response = await fetch(`/api/talent/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isArchived: true }),
      });

      if (response.ok) {
        // Remove the conversation from the local state
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));

        // Show success message
        setSuccessMessage('Conversation archived successfully');

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Error archiving conversation:', error);
      setError('Failed to archive conversation');

      // Clear error message after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  };

  const deleteConversation = async (conversationId: string, messageId: string) => {
    try {
      // Delete the latest message to demonstrate action
      const response = await fetch(`/api/talent/messages/${messageId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove the conversation from the local state
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));

        // Show success message
        setSuccessMessage('Conversation deleted successfully');

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      setError('Failed to delete conversation');

      // Clear error message after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchConversations();
    } else if (status === 'unauthenticated') {
      router.push('/sign-in');
    }
  }, [status, showUnreadOnly, router]);

  const toggleUnreadFilter = () => {
    setShowUnreadOnly(prev => !prev);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
        <span className="ml-2">Loading messages...</span>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Messages</h1>
        {/* Talents can't initiate messages, only reply */}
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
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Conversations</h2>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="unreadOnly"
              checked={showUnreadOnly}
              onChange={toggleUnreadFilter}
              className="h-4 w-4 text-blue-600 rounded border-gray-300"
            />
            <label htmlFor="unreadOnly" className="ml-2 text-sm text-gray-700">
              Show unread only
            </label>
          </div>
        </div>

        {conversations.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No messages found</p>
            <p className="text-sm text-gray-400 mt-2">
              Studios will send you invitations and messages which will appear here
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {conversations.map((conversation) => (
              <li key={conversation.id} className={`${conversation.hasUnread ? 'bg-blue-50' : 'bg-white'} hover:bg-gray-50`}>
                <div className="px-6 py-5">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/talent/messages/${conversation.latestMessageId}`}
                        className="block focus:outline-none"
                      >
                        <div className="flex items-center mb-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {conversation.studio ? conversation.studio.name : 'Unknown Studio'}
                          </p>
                          <p className="ml-2 flex-shrink-0 text-xs text-gray-500">
                            {formatDate(conversation.latestMessageDate)}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 mb-1">
                          {conversation.subject}
                          {conversation.hasUnread && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {conversation.unreadCount} new
                            </span>
                          )}
                          {conversation.messageCount > 1 && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                              </svg>
                              {conversation.messageCount} messages
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-600 line-clamp-2">{conversation.preview}</p>

                        {(conversation.relatedToProject || conversation.relatedToCastingCall) && (
                          <div className="mt-2 flex items-center space-x-2">
                            {conversation.relatedToProject && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Project: {conversation.relatedToProject.title}
                              </Badge>
                            )}
                            {conversation.relatedToCastingCall && (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                Casting Call: {conversation.relatedToCastingCall.title}
                              </Badge>
                            )}
                          </div>
                        )}
                      </Link>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex space-x-2">
                      <button
                        onClick={() => archiveConversation(conversation.id, conversation.latestMessageId)}
                        className="text-xs text-gray-600 hover:text-gray-800"
                      >
                        Archive
                      </button>
                      <button
                        onClick={() => deleteConversation(conversation.id, conversation.latestMessageId)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}