'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { 
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui';
import { 
  Loader2, 
  Edit, 
  Trash, 
  ClipboardList, 
  Send, 
  CheckCircle,
  List,
  Plus,
  SortAsc,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

// Define TypeScript interfaces
interface Questionnaire {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
  questions: Question[];
  _count?: {
    invitations: number;
    responses: number;
  };
}

interface Question {
  id: string;
  text: string;
  description: string | null;
  type: string;
  isRequired: boolean;
  order: number;
  options: any;
  metadata: any;
}

export default function QuestionnairePage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/sign-in');
      return;
    }

    const fetchQuestionnaire = async () => {
      try {
        const response = await fetch(`/api/studio/questionnaires/${params.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch questionnaire');
        }
        
        const data = await response.json();
        setQuestionnaire(data);
      } catch (err) {
        console.error('Error fetching questionnaire:', err);
        setError('Failed to load questionnaire. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionnaire();
  }, [status, router, params.id]);

  const handleToggleActive = async () => {
    if (!questionnaire) return;
    
    setActivating(true);
    try {
      const response = await fetch(`/api/studio/questionnaires/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !questionnaire.isActive,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update questionnaire');
      }
      
      const updatedQuestionnaire = await response.json();
      setQuestionnaire(updatedQuestionnaire);
    } catch (err) {
      console.error('Error updating questionnaire:', err);
    } finally {
      setActivating(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/studio/questionnaires/${params.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete questionnaire');
      }
      
      router.push('/studio/questionnaires');
    } catch (err) {
      console.error('Error deleting questionnaire:', err);
      setError('Failed to delete questionnaire. Please try again later.');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading questionnaire...</span>
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

  if (!questionnaire) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-700 p-4 mb-6" role="alert">
          <p className="font-bold">Questionnaire Not Found</p>
          <p>The requested questionnaire could not be found.</p>
        </div>
        <Link href="/studio/questionnaires">
          <Button>Back to Questionnaires</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{questionnaire.title}</h1>
            <Badge variant={questionnaire.isActive ? "default" : "secondary"}>
              {questionnaire.isActive ? "Active" : "Inactive"}
            </Badge>
            {questionnaire.requiresApproval && (
              <Badge variant="outline">Requires Approval</Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            {questionnaire.description || "No description provided"}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleToggleActive}
            disabled={activating}
          >
            {activating ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : questionnaire.isActive ? (
              <ToggleRight className="h-4 w-4 mr-1" />
            ) : (
              <ToggleLeft className="h-4 w-4 mr-1" />
            )}
            {questionnaire.isActive ? "Deactivate" : "Activate"}
          </Button>
          
          <Link href={`/studio/questionnaires/${questionnaire.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </Link>
          
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this questionnaire and all associated questions. 
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4 text-sm">
          <div className="flex items-center">
            <ClipboardList className="h-4 w-4 mr-1" />
            <span>{questionnaire.questions.length} Questions</span>
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
        
        <Link href={`/studio/questionnaires/${questionnaire.id}/invitations`}>
          <Button>
            <Send className="h-4 w-4 mr-1" />
            Invite Talents
          </Button>
        </Link>
      </div>
      
      <Tabs defaultValue="questions">
        <TabsList className="mb-4">
          <TabsTrigger value="questions">
            <ClipboardList className="h-4 w-4 mr-1" />
            Questions
          </TabsTrigger>
          <TabsTrigger value="invitations">
            <Send className="h-4 w-4 mr-1" />
            Invitations
          </TabsTrigger>
          <TabsTrigger value="responses">
            <CheckCircle className="h-4 w-4 mr-1" />
            Responses
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="questions">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Questions</h2>
            <Link href={`/studio/questionnaires/${questionnaire.id}/questions/new`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Question
              </Button>
            </Link>
          </div>
          
          {questionnaire.questions.length === 0 ? (
            <div className="text-center py-12 bg-muted rounded-lg">
              <List className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No questions yet</h3>
              <p className="text-muted-foreground mb-6">
                Add questions to gather information from talent.
              </p>
              <Link href={`/studio/questionnaires/${questionnaire.id}/questions/new`}>
                <Button>Add First Question</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {questionnaire.questions
                .sort((a, b) => a.order - b.order)
                .map((question, index) => (
                  <Card key={question.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-medium">
                            {index + 1}.
                          </span>
                          <CardTitle className="text-lg">{question.text}</CardTitle>
                          {question.isRequired && (
                            <Badge variant="outline" className="text-red-500 border-red-200">
                              Required
                            </Badge>
                          )}
                        </div>
                        <Badge>
                          {question.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      {question.description && (
                        <CardDescription>{question.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      {/* Display question options based on type */}
                      {question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE' ? (
                        <div className="pl-6">
                          <ul className="list-disc space-y-1">
                            {question.options && Array.isArray(question.options) &&
                              question.options.map((option: any, index: number) => (
                                <li key={index}>{option.label}</li>
                              ))}
                          </ul>
                        </div>
                      ) : null}
                      
                      <div className="flex justify-end gap-2 mt-4">
                        <Link href={`/studio/questionnaires/${questionnaire.id}/questions/${question.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              
              <div className="flex justify-end mt-4">
                <Button variant="outline" size="sm">
                  <SortAsc className="h-4 w-4 mr-1" />
                  Reorder Questions
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="invitations">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Invitations</h2>
            <Link href={`/studio/questionnaires/${questionnaire.id}/invitations/new`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Invitation
              </Button>
            </Link>
          </div>
          
          <div className="text-center py-12 bg-muted rounded-lg">
            <Send className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Invitation management</h3>
            <p className="text-muted-foreground mb-6">
              Visit the invitations page to send and manage questionnaire invitations.
            </p>
            <Link href={`/studio/questionnaires/${questionnaire.id}/invitations`}>
              <Button>Manage Invitations</Button>
            </Link>
          </div>
        </TabsContent>
        
        <TabsContent value="responses">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Responses</h2>
          </div>
          
          <div className="text-center py-12 bg-muted rounded-lg">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Response management</h3>
            <p className="text-muted-foreground mb-6">
              View and manage talent responses to this questionnaire.
            </p>
            <Link href={`/studio/questionnaires/${questionnaire.id}/responses`}>
              <Button>View Responses</Button>
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}