'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
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

interface Submission {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phoneNumber: string | null;
  status: string;
  createdAt: string;
  convertedToProfileId: string | null;
  externalActorId: string | null;
  survey?: {
    id: string;
    responses: any;
  } | null;
  profile?: {
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
    skills: {
      id: string;
      name: string;
    }[];
  } | null;
}

interface CastingCode {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  studioId: string;
  projectId: string;
  surveyFields: any | null;
  submissions: Submission[];
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  castingCodes: CastingCode[];
}

export default function ProjectSubmissionsPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const projectId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [processing, setProcessing] = useState(false);
  const [messagingOpen, setMessagingOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/sign-in');
    } else if (status === 'authenticated') {
      fetchProjectSubmissions();
    }
  }, [status, projectId, router]);

  const fetchProjectSubmissions = async () => {
    try {
      setLoading(true);
      
      // First, get the project details
      const projectResponse = await fetch(`/api/studio/projects/${projectId}`);
      
      if (!projectResponse.ok) {
        throw new Error('Failed to fetch project details');
      }
      
      const projectData = await projectResponse.json();
      setProject(projectData);
      
      // Get all casting codes for this project
      const castingCodesResponse = await fetch(`/api/studio/casting-codes?projectId=${projectId}`);
      
      if (!castingCodesResponse.ok) {
        throw new Error('Failed to fetch casting codes');
      }
      
      const castingCodesData = await castingCodesResponse.json();
      
      // Collect all submissions from all casting codes
      let allSubmissions: Submission[] = [];
      
      for (const code of castingCodesData) {
        const codeSubmissionsResponse = await fetch(`/api/studio/casting-codes/${code.id}`);
        
        if (codeSubmissionsResponse.ok) {
          const codeData = await codeSubmissionsResponse.json();
          if (codeData.submissions && codeData.submissions.length > 0) {
            // Add the casting code name to each submission for reference
            const submissionsWithCodeInfo = codeData.submissions.map((sub: Submission) => ({
              ...sub,
              castingCodeName: code.name,
              castingCodeId: code.id
            }));
            
            allSubmissions = [...allSubmissions, ...submissionsWithCodeInfo];
          }
        }
      }
      
      // Sort by creation date (newest first)
      allSubmissions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setSubmissions(allSubmissions);
    } catch (error) {
      console.error('Error fetching project submissions:', error);
      setError('Failed to load project submissions. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const updateSubmissionStatus = async (submissionId: string, status: string) => {
    try {
      setProcessing(true);
      const response = await fetch(`/api/studio/casting-codes/submissions/${submissionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update submission status');
      }

      // Update the local state
      setSubmissions(prev => prev.map(sub => 
        sub.id === submissionId ? { ...sub, status } : sub
      ));
      
    } catch (error) {
      console.error('Error updating submission status:', error);
      setError('Failed to update submission status. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedSubmission || !message.trim()) return;
    
    // If it's an external submission with no profile, show error
    if (!selectedSubmission.profile?.id && !selectedSubmission.convertedToProfileId) {
      setError('Cannot message this applicant as they do not have a full profile in the system.');
      setMessagingOpen(false);
      return;
    }
    
    const profileId = selectedSubmission.profile?.id || selectedSubmission.convertedToProfileId;
    
    try {
      setSendingMessage(true);
      
      const response = await fetch('/api/studio/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message,
          subject: `About your project submission`,
          talentReceiverId: profileId,
          relatedToProjectId: projectId,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      // Reset the message form
      setMessage('');
      setMessagingOpen(false);
      setSelectedSubmission(null);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };
  
  // Filter submissions based on the active tab
  const filteredSubmissions = submissions.filter(sub => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return sub.status === 'PENDING';
    if (activeTab === 'approved') return sub.status === 'APPROVED';
    if (activeTab === 'rejected') return sub.status === 'REJECTED';
    return true;
  });
  
  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
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
        <Link href={`/studio/projects/${projectId}`} className="text-blue-600 hover:text-blue-800">
          Back to Project
        </Link>
      </div>
    );
  }
  
  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="mb-6">
          <AlertDescription>Project not found or you do not have permission to view it.</AlertDescription>
        </Alert>
        <Link href="/studio/projects" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Project Submissions</h1>
          <p className="text-gray-600">
            For project: {project.title}
          </p>
        </div>
        <Link
          href={`/studio/projects/${projectId}`}
          className="px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
        >
          Back to Project
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Submission Status</h2>
            <Badge variant={
              project.status === 'CASTING' ? 'default' : 'secondary'
            }>
              {project.status.replace('_', ' ')}
            </Badge>
          </div>
          <div className="mt-2 flex justify-between">
            <div className="flex space-x-6">
              <div>
                <span className="text-sm text-gray-500">Total</span>
                <p className="font-semibold">{submissions.length}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Pending</span>
                <p className="font-semibold text-yellow-600">
                  {submissions.filter(sub => sub.status === 'PENDING').length}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Approved</span>
                <p className="font-semibold text-green-600">
                  {submissions.filter(sub => sub.status === 'APPROVED').length}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Rejected</span>
                <p className="font-semibold text-red-600">
                  {submissions.filter(sub => sub.status === 'REJECTED').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All Submissions ({submissions.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({submissions.filter(sub => sub.status === 'PENDING').length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({submissions.filter(sub => sub.status === 'APPROVED').length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({submissions.filter(sub => sub.status === 'REJECTED').length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-4">
          {filteredSubmissions.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-gray-500">No submissions found in this category.</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredSubmissions.map((submission) => (
                <Card key={submission.id} className="overflow-hidden">
                  <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {submission.firstName} {submission.lastName}
                      </h3>
                      <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-500 gap-2">
                        <span>
                          Submitted on {new Date(submission.createdAt).toLocaleDateString()}
                        </span>
                        {(submission as any).castingCodeName && (
                          <span className="flex items-center">
                            <span className="hidden sm:inline mx-2">•</span>
                            Via casting code: {(submission as any).castingCodeName}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant={
                      submission.status === 'APPROVED' ? 'default' :
                      submission.status === 'REJECTED' ? 'destructive' :
                      'outline'
                    }>
                      {submission.status}
                    </Badge>
                  </div>
                  
                  <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                      <h4 className="font-semibold mb-2">Contact Information</h4>
                      <div className="space-y-2">
                        {submission.email && (
                          <p className="text-sm">
                            <span className="text-gray-500">Email:</span>{' '}
                            <a href={`mailto:${submission.email}`} className="text-blue-600 hover:underline">
                              {submission.email}
                            </a>
                          </p>
                        )}
                        {submission.phoneNumber && (
                          <p className="text-sm">
                            <span className="text-gray-500">Phone:</span>{' '}
                            <a href={`tel:${submission.phoneNumber}`} className="text-blue-600 hover:underline">
                              {submission.phoneNumber}
                            </a>
                          </p>
                        )}
                        
                        {/* Show full profile link if available */}
                        {(submission.profile?.id || submission.convertedToProfileId) && (
                          <Link
                            href={`/studio/talent/${submission.profile?.id || submission.convertedToProfileId}`}
                            className="block text-sm text-blue-600 hover:underline mt-2"
                          >
                            View Full Profile
                          </Link>
                        )}
                        
                        {submission.status === 'PENDING' && (
                          <div className="flex space-x-2 mt-4">
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => updateSubmissionStatus(submission.id, 'APPROVED')}
                              disabled={processing}
                            >
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => updateSubmissionStatus(submission.id, 'REJECTED')}
                              disabled={processing}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        
                        {/* Message button (only if there's a profile to message) */}
                        {(submission.profile?.id || submission.convertedToProfileId) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => {
                              setSelectedSubmission(submission);
                              setMessagingOpen(true);
                            }}
                          >
                            Send Message
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="md:col-span-2">
                      {/* Display profile info if available */}
                      {submission.profile && (
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold mb-2">Skills</h4>
                            <div className="flex flex-wrap gap-1">
                              {submission.profile.skills?.length > 0 ? (
                                submission.profile.skills.map(skill => (
                                  <Badge key={skill.id} variant="secondary">{skill.name}</Badge>
                                ))
                              ) : (
                                <p className="text-gray-500 text-sm">No skills listed</p>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold mb-2">Basic Info</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {submission.profile.gender && (
                                <>
                                  <span className="text-gray-500">Gender:</span>
                                  <span>{submission.profile.gender}</span>
                                </>
                              )}
                              {submission.profile.ethnicity && (
                                <>
                                  <span className="text-gray-500">Ethnicity:</span>
                                  <span>{submission.profile.ethnicity}</span>
                                </>
                              )}
                              {submission.profile.height && (
                                <>
                                  <span className="text-gray-500">Height:</span>
                                  <span>{submission.profile.height}</span>
                                </>
                              )}
                              {submission.profile.hairColor && (
                                <>
                                  <span className="text-gray-500">Hair:</span>
                                  <span>{submission.profile.hairColor}</span>
                                </>
                              )}
                              {submission.profile.eyeColor && (
                                <>
                                  <span className="text-gray-500">Eyes:</span>
                                  <span>{submission.profile.eyeColor}</span>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {submission.profile.experience && (
                            <div>
                              <h4 className="font-semibold mb-2">Experience</h4>
                              <p className="text-sm text-gray-700">
                                {submission.profile.experience}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Show survey responses if available */}
                      {submission.survey?.responses && (
                        <div className="mt-4">
                          <h4 className="font-semibold mb-2">Survey Responses</h4>
                          <div className="bg-gray-50 p-4 rounded-md">
                            {Object.entries(submission.survey.responses).map(([question, answer], index) => (
                              <div key={index} className="mb-2">
                                <p className="font-medium text-sm">{question}</p>
                                <p className="text-gray-700">{String(answer)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* If no profile and no survey responses */}
                      {!submission.profile && !submission.survey?.responses && (
                        <div className="bg-gray-50 p-4 rounded-md">
                          <p className="text-gray-500 text-sm">
                            Basic submission with no additional profile information or survey responses.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Message Modal */}
      {messagingOpen && selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Message to {selectedSubmission.firstName} {selectedSubmission.lastName}</h3>
              <button
                onClick={() => {
                  setMessagingOpen(false);
                  setSelectedSubmission(null);
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
                  setSelectedSubmission(null);
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