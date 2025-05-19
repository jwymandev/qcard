'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Badge, 
  Button, 
  Spinner, 
  Alert, 
  AlertDescription, 
  AlertTitle,
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

interface CastingCall {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
  compensation: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  studioId: string;
  locationId: string | null;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
  location: {
    id: string;
    name: string;
  } | null;
  skillsRequired: {
    id: string;
    name: string;
  }[];
  applications: {
    id: string;
    status: string;
    createdAt: string;
    Profile: {
      id: string;
      User: {
        firstName: string;
        lastName: string;
        email: string;
      }
    }
  }[];
  project: {
    id: string;
    title: string;
  } | null;
}

export default function CastingCallDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const castingCallId = params.id;
  
  const [castingCall, setCastingCall] = useState<CastingCall | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/sign-in');
    } else if (status === 'authenticated') {
      fetchCastingCallDetails();
    }
  }, [status, castingCallId, router]);
  
  const fetchCastingCallDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/studio/casting-calls/${castingCallId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch casting call details');
      }
      
      const data = await response.json();
      setCastingCall(data);
    } catch (error) {
      console.error('Error fetching casting call details:', error);
      setError('Failed to load casting call details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const updateCastingCallStatus = async (newStatus: string) => {
    try {
      setUpdating(true);
      const response = await fetch(`/api/studio/casting-calls/${castingCallId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update casting call status');
      }
      
      const updatedCall = await response.json();
      setCastingCall(updatedCall);
    } catch (error) {
      console.error('Error updating casting call status:', error);
      setError('Failed to update status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };
  
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
        <div className="text-center mt-4">
          <Link href="/studio/projects" className="text-blue-600 hover:text-blue-800">
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }
  
  if (!castingCall) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Not Found</AlertTitle>
          <AlertDescription>Casting call not found or you don&apos;t have access to it.</AlertDescription>
        </Alert>
        <div className="text-center mt-4">
          <Link href="/studio/projects" className="text-blue-600 hover:text-blue-800">
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }
  
  // Format date range for display
  const formatDateRange = (startDate?: string | null, endDate?: string | null) => {
    if (!startDate && !endDate) return 'Flexible dates';
    
    const formatDate = (dateStr?: string | null) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    
    if (startDate && endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    } else if (startDate) {
      return `From ${formatDate(startDate)}`;
    } else if (endDate) {
      return `Until ${formatDate(endDate)}`;
    }
    
    return 'Dates not specified';
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{castingCall.title}</h1>
          <p className="text-gray-600">
            {castingCall.project ? `For project: ${castingCall.project.title}` : 'Independent casting call'}
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Link
            href={`/studio/casting-calls/${castingCall.id}/applications`}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            View Applications
          </Link>
          
          <Link
            href={`/studio/casting-calls/${castingCall.id}/edit`}
            className="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
          >
            Edit Casting Call
          </Link>
          
          {castingCall.project && (
            <Link
              href={`/studio/projects/${castingCall.project.id}/casting`}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Back to Project Casting
            </Link>
          )}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              <Badge variant={
                castingCall.status === 'OPEN' ? 'default' : 
                castingCall.status === 'FILLED' ? 'success' : 
                'secondary'
              }>
                {castingCall.status}
              </Badge>
              
              <span className="mx-2 text-gray-500">•</span>
              
              <span className="text-sm text-gray-500">
                {castingCall.applications.length} Application{castingCall.applications.length !== 1 ? 's' : ''}
              </span>
              
              {castingCall.location && (
                <>
                  <span className="mx-2 text-gray-500">•</span>
                  <span className="text-sm text-gray-500">{castingCall.location.name}</span>
                </>
              )}
            </div>
            
            <div className="flex space-x-2">
              {castingCall.status === 'OPEN' ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={updating}>
                      Close Casting Call
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Close Casting Call</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to close this casting call? This will prevent new applications from being submitted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => updateCastingCallStatus('CLOSED')}>
                        Close Casting Call
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : castingCall.status === 'CLOSED' ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={updating}>
                      Reopen Casting Call
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reopen Casting Call</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to reopen this casting call? This will allow new applications to be submitted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => updateCastingCallStatus('OPEN')}>
                        Reopen Casting Call
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
              
              {castingCall.status !== 'FILLED' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={updating}>
                      Mark as Filled
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Mark Casting Call as Filled</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to mark this casting call as filled? This indicates that you&apos;ve found all the talent you need.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => updateCastingCallStatus('FILLED')}>
                        Mark as Filled
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">Description</h2>
              <p className="text-gray-700 whitespace-pre-line">{castingCall.description}</p>
            </section>
            
            {castingCall.requirements && (
              <section className="mb-6">
                <h2 className="text-xl font-semibold mb-3">Requirements</h2>
                <p className="text-gray-700 whitespace-pre-line">{castingCall.requirements}</p>
              </section>
            )}
            
            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">Applications Summary</h2>
              <div className="flex space-x-8">
                <div>
                  <div className="text-2xl font-bold">{castingCall.applications.length}</div>
                  <div className="text-sm text-gray-500">Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {castingCall.applications.filter(app => app.status === 'PENDING').length}
                  </div>
                  <div className="text-sm text-gray-500">Pending</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {castingCall.applications.filter(app => app.status === 'APPROVED').length}
                  </div>
                  <div className="text-sm text-gray-500">Approved</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {castingCall.applications.filter(app => app.status === 'REJECTED').length}
                  </div>
                  <div className="text-sm text-gray-500">Rejected</div>
                </div>
              </div>
              
              <Link
                href={`/studio/casting-calls/${castingCall.id}/applications`}
                className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                View All Applications
              </Link>
            </section>
            
            {castingCall.applications.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-3">Recent Applications</h2>
                <div className="space-y-3">
                  {castingCall.applications.slice(0, 3).map(application => (
                    <div key={application.id} className="p-3 border rounded-md">
                      <div className="flex justify-between">
                        <div className="font-medium">
                          {application.Profile.User.firstName} {application.Profile.User.lastName}
                        </div>
                        <Badge variant={
                          application.status === 'APPROVED' ? 'success' :
                          application.status === 'REJECTED' ? 'destructive' :
                          'outline'
                        }>
                          {application.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500">
                        Applied on {new Date(application.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
          
          <div>
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="font-semibold mb-3">Casting Call Details</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Dates</p>
                  <p className="text-gray-700">{formatDateRange(castingCall.startDate, castingCall.endDate)}</p>
                </div>
                
                {castingCall.location && (
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="text-gray-700">{castingCall.location.name}</p>
                  </div>
                )}
                
                {castingCall.compensation && (
                  <div>
                    <p className="text-sm text-gray-500">Compensation</p>
                    <p className="text-gray-700">{castingCall.compensation}</p>
                  </div>
                )}
                
                {castingCall.project && (
                  <div>
                    <p className="text-sm text-gray-500">Project</p>
                    <Link 
                      href={`/studio/projects/${castingCall.project.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {castingCall.project.title}
                    </Link>
                  </div>
                )}
                
                {castingCall.skillsRequired.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500">Skills Required</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {castingCall.skillsRequired.map(skill => (
                        <Badge key={skill.id} variant="secondary">{skill.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="text-gray-700">{new Date(castingCall.createdAt).toLocaleDateString()}</p>
                </div>
                
                {castingCall.createdAt !== castingCall.updatedAt && (
                  <div>
                    <p className="text-sm text-gray-500">Updated</p>
                    <p className="text-gray-700">{new Date(castingCall.updatedAt).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6 space-y-3">
              <h3 className="font-semibold mb-2">Actions</h3>
              
              <Link 
                href={`/studio/casting-calls/${castingCall.id}/edit`}
                className="block w-full px-4 py-2 text-center border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Edit Casting Call
              </Link>
              
              <Link
                href={`/studio/casting-calls/${castingCall.id}/applications`}
                className="block w-full px-4 py-2 text-center bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Manage Applications
              </Link>
              
              <Link
                href={`/studio/talent-invitation?type=casting-call&id=${castingCall.id}&title=${encodeURIComponent(castingCall.title)}`}
                className="block w-full px-4 py-2 text-center bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Invite Talent
              </Link>
              
              <Link
                href={`/studio/casting-calls/${castingCall.id}/invitations`}
                className="block w-full px-4 py-2 text-center border border-gray-300 rounded-md hover:bg-gray-50"
              >
                View Invitations
              </Link>
              
              {castingCall.project && (
                <Link
                  href={`/studio/projects/${castingCall.project.id}/casting`}
                  className="block w-full px-4 py-2 text-center border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Back to Project Casting
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}