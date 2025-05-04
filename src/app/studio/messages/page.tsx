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

export default function MessagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const fetchMessages = async (tab: 'inbox' | 'sent') => {
    setLoading(true);
    try {
      const url = `/api/studio/messages?sent=${tab === 'sent'}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load messages');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };
  
  const markAsRead = async (id: string, isRead: boolean) => {
    try {
      const response = await fetch(`/api/studio/messages/${id}`, {
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
      const response = await fetch(`/api/studio/messages/${id}`, {
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
      const response = await fetch(`/api/studio/messages/${id}`, {
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
  }, [status, activeTab]);
  
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
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Messages</h1>
        <Link
          href="/studio/messages/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          New Message
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
          {error}
        </div>
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
            <p className="text-gray-500">No messages found</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {messages.map((message) => (
              <li key={message.id} className={`${!message.isRead && activeTab === 'inbox' ? 'bg-blue-50' : 'bg-white'} hover:bg-gray-50`}>
                <div className="px-6 py-5">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/studio/messages/${message.id}`}
                        className="block focus:outline-none"
                      >
                        <div className="flex items-center mb-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {activeTab === 'inbox'
                              ? `From: ${message.sender?.user.firstName} ${message.sender?.user.lastName}`
                              : `To: ${message.recipient?.user.firstName} ${message.recipient?.user.lastName}`}
                          </p>
                          <p className="ml-2 flex-shrink-0 text-xs text-gray-500">
                            {formatDate(message.createdAt)}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 mb-1">{message.subject}</p>
                        <p className="text-sm text-gray-600 line-clamp-2">{message.content}</p>
                        
                        {(message.relatedToProject || message.relatedToCastingCall) && (
                          <div className="mt-2 flex items-center space-x-2">
                            {message.relatedToProject && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Project: {message.relatedToProject.title}
                              </span>
                            )}
                            {message.relatedToCastingCall && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Casting Call: {message.relatedToCastingCall.title}
                              </span>
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