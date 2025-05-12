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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import CastingSubmissionSurveyDisplay from '@/components/CastingSubmissionSurveyDisplay';

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
}

interface CastingCode {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  studioId: string;
  projectId: string | null;
  surveyFields: any | null;
  submissions: Submission[];
  project: {
    id: string;
    title: string;
  } | null;
}

export default function CastingCodeSubmissionsPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [castingCode, setCastingCode] = useState<CastingCode | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/sign-in');
    } else if (status === 'authenticated') {
      fetchCastingCode();
    }
  }, [status, params.id, router]);

  const fetchCastingCode = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/studio/casting-codes/${params.id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch casting code');
      }

      const data = await response.json();
      setCastingCode(data);
    } catch (error) {
      console.error('Error fetching casting code:', error);
      setError('Failed to load casting code. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const updateSubmissionStatus = async (submissionId: string, status: string) => {
    try {
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
      setCastingCode(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          submissions: prev.submissions.map(sub => 
            sub.id === submissionId ? { ...sub, status } : sub
          ),
        };
      });
    } catch (error) {
      console.error('Error updating submission status:', error);
      setError('Failed to update submission status. Please try again.');
    }
  };

  // Filter submissions based on the active tab
  const getFilteredSubmissions = () => {
    if (!castingCode) return [];
    
    return castingCode.submissions.filter(sub => {
      if (activeTab === 'all') return true;
      return sub.status.toLowerCase() === activeTab.toLowerCase();
    });
  };

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
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Link href="/studio/dashboard" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  if (!castingCode) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertDescription>Casting code not found or you do not have permission to view it.</AlertDescription>
        </Alert>
        <Link href="/studio/dashboard" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Submissions</h1>
          <p className="text-gray-600">
            For casting code: {castingCode.name} 
            <span className="ml-2 font-mono text-sm bg-gray-100 px-1 py-0.5 rounded">
              {castingCode.code}
            </span>
          </p>
        </div>
        <Link 
          href="/studio/dashboard" 
          className="px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
        >
          Back to Dashboard
        </Link>
      </div>

      <Card className="mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h3 className="font-semibold mb-2">Status</h3>
            <Badge variant={castingCode.isActive ? 'default' : 'secondary'}>
              {castingCode.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Project</h3>
            {castingCode.project ? (
              <p>{castingCode.project.title}</p>
            ) : (
              <p className="text-gray-500">No project assigned</p>
            )}
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Survey</h3>
            {castingCode.surveyFields?.fields?.length > 0 ? (
              <p>{castingCode.surveyFields.fields.length} question(s)</p>
            ) : (
              <p className="text-gray-500">No custom survey</p>
            )}
          </div>
        </div>
      </Card>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Submission Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <h4 className="text-sm text-gray-500">Total</h4>
            <p className="text-2xl font-bold">{castingCode.submissions.length}</p>
          </Card>
          
          <Card className="p-4">
            <h4 className="text-sm text-gray-500">Pending</h4>
            <p className="text-2xl font-bold text-yellow-600">
              {castingCode.submissions.filter(sub => sub.status === 'PENDING').length}
            </p>
          </Card>
          
          <Card className="p-4">
            <h4 className="text-sm text-gray-500">Approved</h4>
            <p className="text-2xl font-bold text-green-600">
              {castingCode.submissions.filter(sub => sub.status === 'APPROVED').length}
            </p>
          </Card>
          
          <Card className="p-4">
            <h4 className="text-sm text-gray-500">Rejected</h4>
            <p className="text-2xl font-bold text-red-600">
              {castingCode.submissions.filter(sub => sub.status === 'REJECTED').length}
            </p>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All Submissions ({castingCode.submissions.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({castingCode.submissions.filter(sub => sub.status === 'PENDING').length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({castingCode.submissions.filter(sub => sub.status === 'APPROVED').length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({castingCode.submissions.filter(sub => sub.status === 'REJECTED').length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-4">
          {getFilteredSubmissions().length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-gray-500">No submissions found in this category.</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {getFilteredSubmissions().map((submission) => (
                <Card key={submission.id} className="overflow-hidden">
                  <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-lg">{submission.firstName} {submission.lastName}</h3>
                      <p className="text-sm text-gray-500">
                        Submitted on {new Date(submission.createdAt).toLocaleDateString()}
                      </p>
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
                        
                        {submission.status === 'PENDING' && (
                          <div className="flex space-x-2 mt-4">
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => updateSubmissionStatus(submission.id, 'APPROVED')}
                            >
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => updateSubmissionStatus(submission.id, 'REJECTED')}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="md:col-span-2">
                      {/* Show survey responses if available */}
                      {submission.survey?.responses && castingCode.surveyFields ? (
                        <CastingSubmissionSurveyDisplay 
                          surveyResponses={submission.survey.responses}
                          surveyFields={castingCode.surveyFields}
                        />
                      ) : (
                        <div className="bg-gray-50 p-4 rounded-md">
                          <p className="text-gray-500 text-sm">
                            {castingCode.surveyFields ? 'No survey responses submitted.' : 'This casting code does not have a custom survey.'}
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
    </div>
  );
}