'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  Badge, 
  Button, 
  Textarea, 
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

// Types for casting call detail
interface CastingCallDetail {
  id: string;
  title: string;
  description: string;
  requirements?: string;
  compensation?: string;
  startDate?: string;
  endDate?: string;
  status: string;
  location?: {
    id: string;
    name: string;
    region?: {
      id: string;
      name: string;
    };
  };
  skills: {
    id: string;
    name: string;
  }[];
  studio: {
    id: string;
    name: string;
    description?: string;
  };
  project?: {
    id: string;
    title: string;
    description?: string;
  };
  application?: {
    id: string;
    status: string;
    message?: string;
    createdAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export default function OpportunityDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [castingCall, setCastingCall] = useState<CastingCallDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'loading' | 'active' | 'inactive'>('loading');
  const [locationSubscribed, setLocationSubscribed] = useState<boolean>(false);
  
  // Fetch casting call details
  useEffect(() => {
    if (status === 'authenticated') {
      fetchCastingCallDetails();
      checkSubscription();
    }
  }, [status, params.id]);

  // Check subscription status
  const checkSubscription = async () => {
    try {
      // First, check overall subscription status
      const subscriptionResponse = await fetch('/api/user/subscription');

      if (!subscriptionResponse.ok) {
        setSubscriptionStatus('inactive');
        return;
      }

      const subscriptionData = await subscriptionResponse.json();

      if (!subscriptionData.isSubscribed) {
        setSubscriptionStatus('inactive');
        return;
      }

      // Then check subscribed regions
      const regionResponse = await fetch('/api/talent/suggested-roles');

      if (regionResponse.ok) {
        const regionData = await regionResponse.json();

        // Get the casting call to check its location
        const castingCallResponse = await fetch(`/api/talent/casting-calls/${params.id}`);

        if (castingCallResponse.ok) {
          const castingCall = await castingCallResponse.json();

          if (castingCall.location) {
            // Check if the location belongs to a subscribed region
            const locationResponse = await fetch(`/api/locations/${castingCall.location.id}`);

            if (locationResponse.ok) {
              const locationData = await locationResponse.json();

              if (locationData.region) {
                // Check if this region is in the user's subscribed regions
                const isSubscribedToRegion = regionData.subscribedRegions?.some(
                  (region: any) => region.id === locationData.region.id
                );

                setLocationSubscribed(isSubscribedToRegion);
                setSubscriptionStatus(isSubscribedToRegion ? 'active' : 'inactive');
                return;
              }
            }
          }
        }

        // If we couldn't verify the location/region match, default to active if user has any subscriptions
        setSubscriptionStatus(regionData.subscribedRegions?.length > 0 ? 'active' : 'inactive');
      } else {
        setSubscriptionStatus('inactive');
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscriptionStatus('inactive');
    }
  };
  
  const fetchCastingCallDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/talent/casting-calls/${params.id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Casting call not found.');
        } else {
          setError('Failed to load casting call details. Please try again later.');
        }
        return;
      }
      
      const data = await response.json();
      setCastingCall(data);
    } catch (error) {
      console.error('Error fetching casting call details:', error);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // State for handling region subscription information
  const [regionRequiredForApplication, setRegionRequiredForApplication] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Handle application submission
  const handleSubmit = async () => {
    if (message.trim().length < 10) {
      setSubmitError('Please provide a detailed message explaining why you are a good fit (minimum 10 characters).');
      return;
    }

    // Check subscription status before submitting
    if (subscriptionStatus !== 'active') {
      setSubmitError('You need an active subscription to apply for casting opportunities in this region.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);
      setRegionRequiredForApplication(null);

      const response = await fetch(`/api/talent/casting-calls/${params.id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Check if this is a region subscription issue
        if (response.status === 403 && responseData.regionId && responseData.regionName) {
          setRegionRequiredForApplication({
            id: responseData.regionId,
            name: responseData.regionName
          });
          setSubmitError(`You need to subscribe to the ${responseData.regionName} region to apply for this opportunity.`);
          return;
        }

        setSubmitError(responseData.error || 'Failed to submit application. Please try again.');
        return;
      }

      setSubmitSuccess(true);
      // Refresh data to show the application status
      fetchCastingCallDetails();
    } catch (error) {
      console.error('Error submitting application:', error);
      setSubmitError('An unexpected error occurred. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Check authentication
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/sign-in');
    }
  }, [status, router]);
  
  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
      </div>
    );
  }
  
  // Only render content if authenticated
  if (status !== 'authenticated') {
    return null;
  }
  
  // Show loading spinner while fetching data
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-center my-12">
          <Spinner />
        </div>
      </div>
    );
  }
  
  // Show error message if there's an error
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="text-center mt-4">
          <Link href="/opportunities" className="text-blue-600 hover:text-blue-800">
            Back to Opportunities
          </Link>
        </div>
      </div>
    );
  }
  
  // If no casting call data, show error
  if (!castingCall) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Not Found</AlertTitle>
          <AlertDescription>The casting call you&apos;re looking for doesn&apos;t exist or has been removed.</AlertDescription>
        </Alert>
        <div className="text-center mt-4">
          <Link href="/opportunities" className="text-blue-600 hover:text-blue-800">
            Back to Opportunities
          </Link>
        </div>
      </div>
    );
  }
  
  // Format date range
  const formatDateRange = (startDate?: string, endDate?: string) => {
    if (!startDate && !endDate) return 'Flexible dates';
    
    const formatDate = (dateStr?: string) => {
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
  
  // Format application status for display
  const formatApplicationStatus = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Pending Review';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Not Selected';
      default:
        return status;
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Link href="/opportunities" className="text-blue-600 hover:text-blue-800">
          &larr; Back to Opportunities
        </Link>
      </div>
      
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">{castingCall.title}</h1>
              <div className="flex flex-wrap gap-2 text-sm text-gray-600 mt-1">
                <div>{castingCall.studio.name}</div>
                {castingCall.location && (
                  <div>{castingCall.location.name}</div>
                )}
              </div>
            </div>
            {castingCall.compensation && (
              <div className="text-lg font-medium text-green-600">
                {castingCall.compensation}
              </div>
            )}
          </div>
          
          {castingCall.status !== 'OPEN' && (
            <div className="mt-4">
              <Badge variant="destructive">
                This casting call is closed
              </Badge>
            </div>
          )}
          
          {castingCall.application && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Your Application</h3>
                <Badge variant={
                  castingCall.application.status === "APPROVED" ? "success" :
                  castingCall.application.status === "REJECTED" ? "destructive" :
                  "outline"
                }>
                  {formatApplicationStatus(castingCall.application.status)}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Submitted on {new Date(castingCall.application.createdAt).toLocaleDateString()}
              </p>
              {castingCall.application.message && (
                <div className="mt-2">
                  <p className="text-sm text-gray-700">{castingCall.application.message}</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <h2 className="text-xl font-semibold mb-3">Description</h2>
            <div className="space-y-4">
              <p className="text-gray-700 whitespace-pre-line">{castingCall.description}</p>
              
              {castingCall.requirements && (
                <div>
                  <h3 className="text-lg font-semibold mt-4 mb-2">Requirements</h3>
                  <p className="text-gray-700 whitespace-pre-line">{castingCall.requirements}</p>
                </div>
              )}
              
              {castingCall.project && (
                <div>
                  <h3 className="text-lg font-semibold mt-4 mb-2">Project</h3>
                  <p className="font-medium">{castingCall.project.title}</p>
                  {castingCall.project.description && (
                    <p className="text-gray-700 mt-1">{castingCall.project.description}</p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div>
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="font-semibold mb-3">Details</h3>
              
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
                
                {castingCall.studio && (
                  <div>
                    <p className="text-sm text-gray-500">Studio</p>
                    <p className="text-gray-700">{castingCall.studio.name}</p>
                  </div>
                )}
                
                {castingCall.skills.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500">Skills Needed</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {castingCall.skills.map(skill => (
                        <Badge key={skill.id} variant="secondary">{skill.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-gray-500">Posted</p>
                  <p className="text-gray-700">{new Date(castingCall.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Application form */}
        {castingCall.status === 'OPEN' && !castingCall.application && (
          <div className="p-6 border-t">
            <h2 className="text-xl font-semibold mb-4">Apply for this role</h2>

            {submitSuccess ? (
              <Alert className="mb-4">
                <AlertTitle>Application Submitted</AlertTitle>
                <AlertDescription>
                  Your application has been successfully submitted. The studio will review your application and get back to you.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {submitError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{submitError}</AlertDescription>

                    {/* Show subscribe button if region subscription is required */}
                    {regionRequiredForApplication && (
                      <div className="mt-4">
                        <Link
                          href={`/subscription?regionId=${regionRequiredForApplication.id}`}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                        >
                          Subscribe to {regionRequiredForApplication.name}
                        </Link>
                      </div>
                    )}
                  </Alert>
                )}

                {subscriptionStatus === 'inactive' ? (
                  <div className="bg-gray-50 p-6 rounded-md mb-6">
                    <h3 className="font-semibold mb-2">Subscription Required</h3>
                    <p className="mb-4">
                      You need an active subscription to the {castingCall.location?.name} region to apply for this casting call.
                    </p>
                    <Link
                      href={`/subscription${castingCall.location?.region ? `?regionId=${castingCall.location.region.id}` : ''}`}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                      Subscribe Now
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Why are you a good fit for this role?
                      </label>
                      <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Describe your relevant experience, skills, and why you're interested in this role..."
                        className="w-full h-32"
                        disabled={submitting}
                      />
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button disabled={submitting || message.trim().length < 10 || subscriptionStatus !== 'active'}>
                          {submitting ? (
                            <>
                              <Spinner className="mr-2 h-4 w-4" />
                              Submitting...
                            </>
                          ) : (
                            'Submit Application'
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirm Application</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to apply for this casting call? You won&apos;t be able to edit your application after submission.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleSubmit}>Submit Application</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}