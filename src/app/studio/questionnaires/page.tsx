'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlusCircle, ClipboardList, Send, CheckCircle, XCircle } from 'lucide-react';

// Define TypeScript interfaces
interface Questionnaire {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    questions: number;
    invitations: number;
    responses: number;
  };
}

export default function QuestionnairesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/sign-in');
      return;
    }

    const fetchQuestionnaires = async () => {
      try {
        const response = await fetch('/api/studio/questionnaires');
        
        if (!response.ok) {
          throw new Error('Failed to fetch questionnaires');
        }
        
        const data = await response.json();
        setQuestionnaires(data);
      } catch (err) {
        console.error('Error fetching questionnaires:', err);
        setError('Failed to load questionnaires. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionnaires();
  }, [status, router]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Questionnaires</h1>
          <p className="text-muted-foreground">Create and manage custom forms to gather information from talent</p>
        </div>
        <Link href="/studio/questionnaires/new">
          <Button className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            New Questionnaire
          </Button>
        </Link>
      </div>

      {questionnaires.length === 0 ? (
        <div className="text-center py-12 bg-muted rounded-lg">
          <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No questionnaires yet</h2>
          <p className="text-muted-foreground mb-6">
            Create your first questionnaire to gather information from talent.
          </p>
          <Link href="/studio/questionnaires/new">
            <Button>Create Questionnaire</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {questionnaires.map((questionnaire) => (
            <Card key={questionnaire.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="truncate">{questionnaire.title}</CardTitle>
                  <Badge variant={questionnaire.isActive ? "default" : "secondary"}>
                    {questionnaire.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2 min-h-[40px]">
                  {questionnaire.description || "No description provided"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center">
                    <ClipboardList className="h-4 w-4 mr-1" />
                    <span>{questionnaire._count?.questions || 0} Questions</span>
                  </div>
                  <div className="flex items-center">
                    <Send className="h-4 w-4 mr-1" />
                    <span>{questionnaire._count?.invitations || 0} Invites</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    <span>{questionnaire._count?.responses || 0} Responses</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-3 border-t">
                <div className="text-xs text-muted-foreground">
                  Created {new Date(questionnaire.createdAt).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <Link href={`/studio/questionnaires/${questionnaire.id}`}>
                    <Button variant="outline" size="sm">View</Button>
                  </Link>
                  <Link href={`/studio/questionnaires/${questionnaire.id}/invitations`}>
                    <Button size="sm">Invite Talents</Button>
                  </Link>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}