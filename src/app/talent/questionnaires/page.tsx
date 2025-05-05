'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Button from '@/components/ui/button';
import Card, { CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import Badge from '@/components/ui/badge';
import Tabs, { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Spinner from '@/components/ui/spinner';
import { 
  ClipboardCheck,
  ClipboardList,
  ClockIcon,
  CheckCircle2,
  XCircle
} from 'lucide-react';

// Define TypeScript interfaces
interface QuestionnaireInvitation {
  id: string;
  status: string;
  sentAt: string;
  expiresAt: string | null;
  completedAt: string | null;
  message: string | null;
  questionnaire: {
    id: string;
    title: string;
    description: string | null;
    studioId: string;
    studio: {
      name: string;
    };
    _count: {
      questions: number;
    };
  };
}

export default function TalentQuestionnairesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [invitations, setInvitations] = useState<QuestionnaireInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/sign-in');
      return;
    }

    const fetchInvitations = async () => {
      try {
        const response = await fetch('/api/talent/questionnaires/invitations');
        
        if (!response.ok) {
          throw new Error('Failed to fetch questionnaire invitations');
        }
        
        const data = await response.json();
        setInvitations(data);
      } catch (err) {
        console.error('Error fetching invitations:', err);
        setError('Failed to load questionnaire invitations. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvitations();
  }, [status, router]);

  const pendingInvitations = invitations.filter(inv => inv.status === 'PENDING');
  const completedInvitations = invitations.filter(inv => ['COMPLETED', 'ACCEPTED'].includes(inv.status));
  const declinedInvitations = invitations.filter(inv => inv.status === 'DECLINED');

  const handleAccept = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/talent/questionnaires/invitations/${invitationId}/accept`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to accept invitation');
      }
      
      // Redirect to the response page
      router.push(`/talent/questionnaires/${invitationId}/respond`);
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError('Failed to accept invitation. Please try again later.');
    }
  };

  const handleDecline = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/talent/questionnaires/invitations/${invitationId}/decline`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to decline invitation');
      }
      
      // Update the local state
      setInvitations(invitations.map(inv => 
        inv.id === invitationId ? { ...inv, status: 'DECLINED' } : inv
      ));
      
      // Switch to the declined tab
      setActiveTab('declined');
    } catch (err) {
      console.error('Error declining invitation:', err);
      setError('Failed to decline invitation. Please try again later.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="md" />
        <span className="ml-2">Loading questionnaires...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Questionnaires</h1>
        <p className="text-muted-foreground">View and respond to questionnaires from studios</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4" />
            Pending
            {pendingInvitations.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingInvitations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Completed
            {completedInvitations.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {completedInvitations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="declined" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Declined
            {declinedInvitations.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {declinedInvitations.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending">
          {pendingInvitations.length === 0 ? (
            <div className="text-center py-12 bg-muted rounded-lg">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No pending questionnaires</h2>
              <p className="text-muted-foreground">
                You don&apos;t have any pending questionnaire invitations.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pendingInvitations.map((invitation) => (
                <Card key={invitation.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <Badge>Pending</Badge>
                      <div className="text-xs text-muted-foreground">
                        Sent {formatDate(invitation.sentAt)}
                      </div>
                    </div>
                    <CardTitle className="text-lg">{invitation.questionnaire.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {invitation.questionnaire.description || "No description provided"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <p className="text-sm font-medium">From: {invitation.questionnaire.studio.name}</p>
                      <p className="text-sm">
                        {invitation.questionnaire._count.questions} question{invitation.questionnaire._count.questions !== 1 ? 's' : ''}
                      </p>
                      {invitation.expiresAt && (
                        <p className="text-sm text-amber-600 mt-2">
                          Expires: {formatDate(invitation.expiresAt)}
                        </p>
                      )}
                    </div>
                    {invitation.message && (
                      <div className="p-3 bg-muted rounded-md text-sm">
                        <p className="font-medium mb-1">Message:</p>
                        <p>{invitation.message}</p>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleDecline(invitation.id)}
                    >
                      Decline
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={() => handleAccept(invitation.id)}
                    >
                      Accept & Respond
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="completed">
          {completedInvitations.length === 0 ? (
            <div className="text-center py-12 bg-muted rounded-lg">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No completed questionnaires</h2>
              <p className="text-muted-foreground">
                You haven&apos;t completed any questionnaires yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {completedInvitations.map((invitation) => (
                <Card key={invitation.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="success" className="bg-green-600">Completed</Badge>
                      <div className="text-xs text-muted-foreground">
                        Completed {invitation.completedAt ? formatDate(invitation.completedAt) : 'N/A'}
                      </div>
                    </div>
                    <CardTitle className="text-lg">{invitation.questionnaire.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {invitation.questionnaire.description || "No description provided"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <p className="text-sm font-medium">From: {invitation.questionnaire.studio.name}</p>
                      <p className="text-sm">
                        {invitation.questionnaire._count.questions} question{invitation.questionnaire._count.questions !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Link href={`/talent/questionnaires/${invitation.id}/view`} className="w-full">
                      <Button className="w-full">
                        View Response
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="declined">
          {declinedInvitations.length === 0 ? (
            <div className="text-center py-12 bg-muted rounded-lg">
              <XCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No declined questionnaires</h2>
              <p className="text-muted-foreground">
                You haven&apos;t declined any questionnaire invitations.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {declinedInvitations.map((invitation) => (
                <Card key={invitation.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="destructive">Declined</Badge>
                      <div className="text-xs text-muted-foreground">
                        Sent {formatDate(invitation.sentAt)}
                      </div>
                    </div>
                    <CardTitle className="text-lg">{invitation.questionnaire.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {invitation.questionnaire.description || "No description provided"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <p className="text-sm font-medium">From: {invitation.questionnaire.studio.name}</p>
                      <p className="text-sm">
                        {invitation.questionnaire._count.questions} question{invitation.questionnaire._count.questions !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}