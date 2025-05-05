'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  Checkbox,
  Loader2,
  CheckedState,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertTitle,
  AlertDescription,
} from '@/components/ui';
import { ChevronLeft, Save, CalendarIcon, Send, Search } from 'lucide-react';
import { format } from 'date-fns';

// Define form schema
const formSchema = z.object({
  message: z.string().max(500).optional(),
  expiresAt: z.date().optional().nullable(),
  profileIds: z.array(z.string()).min(1, {
    message: "Select at least one talent to invite",
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface Talent {
  id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  headshotUrl?: string | null;
}

interface Questionnaire {
  id: string;
  title: string;
}

export default function NewInvitationPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [talents, setTalents] = useState<Talent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTalents, setSelectedTalents] = useState<Record<string, boolean>>({});

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: '',
      expiresAt: null,
      profileIds: [],
    },
  });

  // Fetch questionnaire details and talents
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/sign-in');
      return;
    }

    // Function to fetch questionnaire
    const fetchQuestionnaire = async () => {
      try {
        const response = await fetch(`/api/studio/questionnaires/${params.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch questionnaire');
        }
        
        const data = await response.json();
        setQuestionnaire({
          id: data.id,
          title: data.title,
        });
      } catch (err) {
        console.error('Error fetching questionnaire:', err);
        setError('Failed to load questionnaire details');
      }
    };

    // Function to fetch talents
    const fetchTalents = async () => {
      try {
        const response = await fetch(`/api/studio/talent/search`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch talents');
        }
        
        const data = await response.json();
        setTalents(data);
      } catch (err) {
        console.error('Error fetching talents:', err);
        setError('Failed to load talents');
      }
    };

    // Run both fetches
    Promise.all([fetchQuestionnaire(), fetchTalents()])
      .finally(() => setLoading(false));
  }, [status, router, params.id]);

  const handleCheckboxChange = (id: string, checked: CheckedState) => {
    setSelectedTalents({
      ...selectedTalents,
      [id]: checked === true,
    });
    
    // Update form values
    const currentIds = form.getValues().profileIds;
    if (checked) {
      if (!currentIds.includes(id)) {
        form.setValue('profileIds', [...currentIds, id]);
      }
    } else {
      form.setValue('profileIds', currentIds.filter(profileId => profileId !== id));
    }
  };

  const filteredTalents = talents.filter(talent => {
    const fullName = `${talent.user.firstName || ''} ${talent.user.lastName || ''}`.toLowerCase();
    const email = talent.user.email.toLowerCase();
    const query = searchQuery.toLowerCase();
    
    return fullName.includes(query) || email.includes(query);
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/studio/questionnaires/${params.id}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send invitations');
      }
      
      router.push(`/studio/questionnaires/${params.id}/invitations`);
    } catch (err) {
      console.error('Error sending invitations:', err);
      setError(err instanceof Error ? err.message : 'Failed to send invitations');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/sign-in');
    return null;
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
      <div className="mb-6">
        <Link href={`/studio/questionnaires/${params.id}`} className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to {questionnaire.title}
        </Link>
      </div>
      
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Send Questionnaire Invitations</h1>
        <p className="text-muted-foreground mb-6">
          Invite talents to respond to "{questionnaire.title}"
        </p>
        
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Invitation Settings</CardTitle>
                    <CardDescription>
                      Configure your invitation details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Add a personal message to the invitation" 
                              {...field}
                              value={field.value || ''}
                              disabled={submitting}
                              className="min-h-[100px]"
                            />
                          </FormControl>
                          <FormDescription>
                            A custom message that will be included with the invitation
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="expiresAt"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Expiration Date (Optional)</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={'outline'}
                                  className={`w-full justify-start text-left font-normal ${
                                    !field.value && 'text-muted-foreground'
                                  }`}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? (
                                    format(field.value, 'PPP')
                                  ) : (
                                    <span>No expiration</span>
                                  )}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value || undefined}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormDescription>
                            Set a date when the invitation will expire
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
              
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Select Talents</CardTitle>
                    <CardDescription>
                      Choose which talents to invite
                    </CardDescription>
                    <div className="relative mt-2">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search talents by name or email"
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="profileIds"
                      render={() => (
                        <FormItem>
                          <div className="h-[300px] overflow-auto border rounded-md">
                            {filteredTalents.length === 0 ? (
                              <div className="flex justify-center items-center h-full text-muted-foreground">
                                {searchQuery ? 'No talents match your search' : 'No talents available'}
                              </div>
                            ) : (
                              <div className="divide-y">
                                {filteredTalents.map((talent) => (
                                  <div key={talent.id} className="p-3 flex items-center hover:bg-muted">
                                    <Checkbox
                                      id={`talent-${talent.id}`}
                                      checked={selectedTalents[talent.id] || false}
                                      onCheckedChange={(checked) => handleCheckboxChange(talent.id, checked)}
                                      disabled={submitting}
                                    />
                                    <label
                                      htmlFor={`talent-${talent.id}`}
                                      className="ml-3 flex-1 cursor-pointer"
                                    >
                                      <div className="flex justify-between">
                                        <div>
                                          <p className="font-medium">
                                            {talent.user.firstName} {talent.user.lastName}
                                          </p>
                                          <p className="text-sm text-muted-foreground">
                                            {talent.user.email}
                                          </p>
                                        </div>
                                      </div>
                                    </label>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex justify-between mt-2">
                            <FormDescription>
                              {Object.values(selectedTalents).filter(Boolean).length} talent(s) selected
                            </FormDescription>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Link href={`/studio/questionnaires/${params.id}`}>
                <Button variant="outline" disabled={submitting}>Cancel</Button>
              </Link>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Invitations
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}