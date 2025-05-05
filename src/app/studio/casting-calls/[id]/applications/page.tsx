'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Spinner,
  Badge,
  Button,
  Alert,
  AlertDescription,
  AlertTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui';

interface Application {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  Profile: {
    id: string;
    headshotUrl: string | null;
    bio: string | null;
    height: string | null;
    weight: string | null;
    hairColor: string | null;
    eyeColor: string | null;
    ethnicity: string | null;
    gender: string | null;
    experience: string | null;
    User: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
    Skill: {
      id: string;
      name: string;
    }[];
  };
}

interface CastingCall {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
  compensation: string | null;
  status: string;
  project: {
    id: string;
    title: string;
  } | null;
}

export default function ApplicationsPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const castingCallId = params.id;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [castingCall, setCastingCall] = useState<CastingCall | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [processing, setProcessing] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [messagingOpen, setMessagingOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/sign-in');
    } else if (status === 'authenticated') {
      fetchCastingCall();
      fetchApplications();
    }
  }, [status, castingCallId, router]);
  
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
  
  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/studio/casting-calls/${castingCallId}/applications`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }
      
      const data = await response.json();
      setApplications(data);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setError('Failed to load applications. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateStatus = async (applicationId: string, newStatus: string, addToProject: boolean = false) => {
    try {
      setProcessing(true);
      
      const payload: any = {
        status: newStatus,
      };
      
      // If approving and there's a project, add option to add to project
      if (newStatus === 'APPROVED' && castingCall?.project && addToProject) {
        payload.addToProject = true;
        payload.projectRole = `Talent for ${castingCall.title}`;
      }
      
      const response = await fetch(`/api/studio/applications/${applicationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update application status');
      }
      
      // Update the local state
      setApplications(prev => prev.map(app => 
        app.id === applicationId ? { ...app, status: newStatus } : app
      ));
      
      setSelectedApplicationId(null);
    } catch (error) {
      console.error('Error updating application status:', error);
      setError('Failed to update application status. Please try again.');
    } finally {
      setProcessing(false);
    }
  };
  
  const handleSendMessage = async () => {
    if (!selectedApplication || !message.trim()) return;
    
    try {
      setSendingMessage(true);
      
      const response = await fetch('/api/studio/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message,
          subject: `About your application for "${castingCall?.title}"`,
          talentReceiverId: selectedApplication.Profile.id,
          relatedToCastingCallId: castingCallId,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      // Reset the message form
      setMessage('');
      setMessagingOpen(false);
      setSelectedApplication(null);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };
  
  // Filter applications based on the active tab
  const filteredApplications = applications.filter(app => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return app.status === 'PENDING';
    if (activeTab === 'approved') return app.status === 'APPROVED';
    if (activeTab === 'rejected') return app.status === 'REJECTED';
    return true;
  });
  
  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
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
        <Link href="/studio/projects" className="text-blue-600 hover:text-blue-800">
          Back to Projects
        </Link>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
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
          {castingCall?.project && (
            <Link
              href={`/studio/projects/${castingCall.project.id}/casting`}
              className="px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
            >
              Back to Project Casting
            </Link>
          )}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Application Status</h2>
            <Badge variant={
              castingCall?.status === 'OPEN' ? 'default' : 
              castingCall?.status === 'FILLED' ? 'success' : 
              'secondary'
            }>
              {castingCall?.status}
            </Badge>
          </div>
          <div className="mt-2 flex justify-between">
            <div className="flex space-x-6">
              <div>
                <span className="text-sm text-gray-500">Total</span>
                <p className="font-semibold">{applications.length}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Pending</span>
                <p className="font-semibold text-yellow-600">
                  {applications.filter(app => app.status === 'PENDING').length}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Approved</span>
                <p className="font-semibold text-green-600">
                  {applications.filter(app => app.status === 'APPROVED').length}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Rejected</span>
                <p className="font-semibold text-red-600">
                  {applications.filter(app => app.status === 'REJECTED').length}
                </p>
              </div>
            </div>
            
            {castingCall?.status === 'OPEN' && (
              <Link 
                href={`/studio/casting-calls/${castingCallId}`}
                className="text-sm text-blue-600 hover:underline"
              >
                Manage Casting Call
              </Link>
            )}
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All Applications ({applications.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({applications.filter(app => app.status === 'PENDING').length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({applications.filter(app => app.status === 'APPROVED').length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({applications.filter(app => app.status === 'REJECTED').length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-4">
          {filteredApplications.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-600">
                No applications found in this category.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredApplications.map((application) => (
                <div key={application.id} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Applicant Info */}
                    <div className="md:col-span-1">
                      <div className="flex flex-col items-center">
                        <div className="h-24 w-24 rounded-full bg-gray-200 mb-3 overflow-hidden">
                          {application.Profile.headshotUrl ? (
                            <img 
                              src={application.Profile.headshotUrl} 
                              alt={`${application.Profile.User.firstName} ${application.Profile.User.lastName}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-gray-400">
                              No Image
                            </div>
                          )}
                        </div>
                        <h3 className="font-semibold text-lg mb-1">
                          {application.Profile.User.firstName} {application.Profile.User.lastName}
                        </h3>
                        <Badge variant={
                          application.status === 'APPROVED' ? 'default' :
                          application.status === 'REJECTED' ? 'destructive' :
                          'outline'
                        }>
                          {application.status}
                        </Badge>
                        <p className="text-sm text-gray-500 mt-2">
                          Applied {new Date(application.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="mt-4 flex flex-col space-y-2">
                        <Link
                          href={`/studio/talent/${application.Profile.id}`}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded text-center hover:bg-blue-700"
                        >
                          View Full Profile
                        </Link>
                        
                        <button
                          onClick={() => {
                            setSelectedApplication(application);
                            setMessagingOpen(true);
                          }}
                          className="px-3 py-1 text-sm border border-blue-600 text-blue-600 rounded text-center hover:bg-blue-50"
                        >
                          Send Message
                        </button>
                      </div>
                    </div>
                    
                    {/* Application Details */}
                    <div className="md:col-span-3">
                      <div className="mb-4">
                        <h3 className="font-semibold text-md mb-2">Applicant&apos;s Message</h3>
                        <div className="p-3 bg-gray-50 rounded">
                          <p className="text-gray-700 whitespace-pre-line">
                            {application.message || 'No message provided.'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <h3 className="font-semibold text-md mb-2">Skills</h3>
                          <div className="flex flex-wrap gap-1">
                            {application.Profile.Skill.length > 0 ? (
                              application.Profile.Skill.map(skill => (
                                <Badge key={skill.id} variant="secondary">{skill.name}</Badge>
                              ))
                            ) : (
                              <p className="text-gray-500 text-sm">No skills listed</p>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="font-semibold text-md mb-2">Basic Info</h3>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {application.Profile.gender && (
                              <>
                                <span className="text-gray-500">Gender:</span>
                                <span>{application.Profile.gender}</span>
                              </>
                            )}
                            {application.Profile.ethnicity && (
                              <>
                                <span className="text-gray-500">Ethnicity:</span>
                                <span>{application.Profile.ethnicity}</span>
                              </>
                            )}
                            {application.Profile.height && (
                              <>
                                <span className="text-gray-500">Height:</span>
                                <span>{application.Profile.height}</span>
                              </>
                            )}
                            {application.Profile.hairColor && (
                              <>
                                <span className="text-gray-500">Hair:</span>
                                <span>{application.Profile.hairColor}</span>
                              </>
                            )}
                            {application.Profile.eyeColor && (
                              <>
                                <span className="text-gray-500">Eyes:</span>
                                <span>{application.Profile.eyeColor}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {application.Profile.experience && (
                        <div className="mb-4">
                          <h3 className="font-semibold text-md mb-2">Experience</h3>
                          <p className="text-sm text-gray-700">
                            {application.Profile.experience}
                          </p>
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      {application.status === 'PENDING' && (
                        <div className="flex space-x-3 mt-4">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="default" 
                                disabled={processing}
                                onClick={() => setSelectedApplicationId(application.id)}
                              >
                                Approve
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Approve Application</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Approve this talent for your casting call?
                                  {castingCall?.project && (
                                    <div className="mt-4">
                                      <div className="flex items-center mb-2">
                                        <input
                                          type="checkbox"
                                          id="addToProject"
                                          className="rounded"
                                          checked={true}
                                          disabled
                                        />
                                        <label htmlFor="addToProject" className="ml-2 text-gray-900">
                                          Add to project: {castingCall.project.title}
                                        </label>
                                      </div>
                                      <p className="text-sm text-gray-500">
                                        The talent will be added to your project roster automatically.
                                      </p>
                                    </div>
                                  )}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleUpdateStatus(application.id, 'APPROVED', true)}
                                >
                                  Approve
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="destructive" 
                                disabled={processing}
                                onClick={() => setSelectedApplicationId(application.id)}
                              >
                                Reject
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reject Application</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to reject this talent&apos;s application?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleUpdateStatus(application.id, 'REJECTED')}
                                >
                                  Reject
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Message Modal */}
      {messagingOpen && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Message to {selectedApplication.Profile.User.firstName} {selectedApplication.Profile.User.lastName}</h3>
              <button
                onClick={() => {
                  setMessagingOpen(false);
                  setSelectedApplication(null);
                  setMessage('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Write your message to the talent..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setMessagingOpen(false);
                  setSelectedApplication(null);
                  setMessage('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!message.trim() || sendingMessage}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 flex items-center"
              >
                {sendingMessage ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Sending...
                  </>
                ) : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}