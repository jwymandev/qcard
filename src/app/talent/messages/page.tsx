'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Spinner, Badge, Button, Alert, AlertDescription, AlertTitle } from '@/components/ui';

type Message = {
  id: string;
  subject: string;
  content: string;
  sender?: {
    id: string;
    name: string;
    description?: string;
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

export default function TalentMessagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchMessages = async (tab: 'inbox' | 'sent') => {
    setLoading(true);
    try {
      const url = `/api/talent/messages?sent=${tab === 'sent'}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load messages');
      }
      
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to load messages. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const markAsRead = async (id: string, isRead: boolean) => {
    try {
      const response = await fetch(`/api/talent/messages/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isRead }),
      });
      
      if (response.ok) {
        // Update the message in the local state
        setMessages(prev => 
          prev.map(msg => 
            msg.id === id ? { ...msg, isRead } : msg
          )
        );
      }
    } catch (error) {
      console.error('Error marking message:', error);
    }
  };
  
  const archiveMessage = async (id: string) => {
    try {
      const response = await fetch(`/api/talent/messages/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isArchived: true }),
      });
      
      if (response.ok) {
        // Remove the message from the local state
        setMessages(prev => prev.filter(msg => msg.id !== id));
      }
    } catch (error) {
      console.error('Error archiving message:', error);
    }
  };
  
  const deleteMessage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/talent/messages/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove the message from the local state
        setMessages(prev => prev.filter(msg => msg.id !== id));
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };
  
  useEffect(() => {
    if (status === 'authenticated') {
      fetchMessages(activeTab);
    } else if (status === 'unauthenticated') {
      router.push('/sign-in');
    }
  }, [status, activeTab, router]);
  
  const changeTab = (tab: 'inbox' | 'sent') => {
    setActiveTab(tab);
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
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => changeTab('inbox')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'inbox'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Inbox
              {activeTab !== 'inbox' && messages.some(m => !m.isRead) && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  New
                </span>
              )}
            </button>
            <button
              onClick={() => changeTab('sent')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'sent'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Sent
            </button>
          </nav>
        </div>
        
        {messages.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">
              {activeTab === 'inbox' 
                ? 'No messages in your inbox'
                : 'No sent messages'
              }
            </p>
            {activeTab === 'inbox' && (
              <p className="text-sm text-gray-400 mt-2">
                Studios will send you invitations and messages which will appear here
              </p>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {messages.map((message) => (
              <li key={message.id} className={`${!message.isRead && activeTab === 'inbox' ? 'bg-blue-50' : 'bg-white'} hover:bg-gray-50`}>
                <div className="px-6 py-5">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/talent/messages/${message.id}`}
                        className="block focus:outline-none"
                      >
                        <div className="flex items-center mb-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {activeTab === 'inbox' && message.sender
                              ? `From: ${message.sender.name}`
                              : 'You sent'}
                          </p>
                          <p className="ml-2 flex-shrink-0 text-xs text-gray-500">
                            {formatDate(message.createdAt)}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 mb-1">
                          {message.subject}
                          {!message.isRead && activeTab === 'inbox' && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              New
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-600 line-clamp-2">{message.content}</p>
                        
                        {(message.relatedToProject || message.relatedToCastingCall) && (
                          <div className="mt-2 flex items-center space-x-2">
                            {message.relatedToProject && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Project: {message.relatedToProject.title}
                              </Badge>
                            )}
                            {message.relatedToCastingCall && (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                Casting Call: {message.relatedToCastingCall.title}
                              </Badge>
                            )}
                          </div>
                        )}
                      </Link>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex space-x-2">
                      {activeTab === 'inbox' && !message.isRead && (
                        <button
                          onClick={() => markAsRead(message.id, true)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Mark as read
                        </button>
                      )}
                      {activeTab === 'inbox' && message.isRead && (
                        <button
                          onClick={() => markAsRead(message.id, false)}
                          className="text-xs text-gray-600 hover:text-gray-800"
                        >
                          Mark unread
                        </button>
                      )}
                      <button
                        onClick={() => archiveMessage(message.id)}
                        className="text-xs text-gray-600 hover:text-gray-800"
                      >
                        Archive
                      </button>
                      <button
                        onClick={() => deleteMessage(message.id)}
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