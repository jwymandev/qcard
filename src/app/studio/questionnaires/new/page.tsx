'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
// Import UI components using default imports
import Button from '@/components/ui/button';
import Card, { 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import Form, {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage 
} from '@/components/ui/form';
import Input from '@/components/ui/input';
import Textarea from '@/components/ui/textarea';
import Switch from '@/components/ui/switch';
import Checkbox from '@/components/ui/checkbox';
import Spinner from '@/components/ui/spinner';
import { ChevronLeft, Save } from 'lucide-react';

// Define form schema
const formSchema = z.object({
  title: z.string().min(3, {
    message: "Title must be at least 3 characters.",
  }).max(100, {
    message: "Title must not exceed 100 characters."
  }),
  description: z.string().max(500, {
    message: "Description must not exceed 500 characters."
  }).optional(),
  isActive: z.boolean().default(true),
  requiresApproval: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewQuestionnairePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      isActive: true,
      requiresApproval: false,
    },
  });

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="md" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/sign-in');
    return null;
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/studio/questionnaires', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create questionnaire');
      }
      
      const data = await response.json();
      router.push(`/studio/questionnaires/${data.id}/questions/new`);
    } catch (err) {
      console.error('Error creating questionnaire:', err);
      setError(err instanceof Error ? err.message : 'Failed to create questionnaire');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <Link href="/studio/questionnaires" className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Questionnaires
        </Link>
      </div>
      
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Create New Questionnaire</h1>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle>Questionnaire Details</CardTitle>
            <CardDescription>
              Create a new questionnaire to gather information from talent profiles.
              You&apos;ll be able to add questions after creating the basic details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title*</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter questionnaire title" 
                          {...field}
                          disabled={submitting} 
                        />
                      </FormControl>
                      <FormDescription>
                        A clear, descriptive title for your questionnaire
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Provide details about the purpose of this questionnaire" 
                          {...field}
                          value={field.value || ''}
                          disabled={submitting}
                          className="min-h-[100px]"
                        />
                      </FormControl>
                      <FormDescription>
                        Optional description that explains the purpose of the questionnaire
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between p-4 border rounded-md">
                        <div className="space-y-0.5">
                          <FormLabel>Active</FormLabel>
                          <FormDescription>
                            Enable or disable this questionnaire
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={submitting}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="requiresApproval"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between p-4 border rounded-md">
                        <div className="space-y-0.5">
                          <FormLabel>Require Approval</FormLabel>
                          <FormDescription>
                            Responses need approval before being finalized
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={submitting}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <Link href="/studio/questionnaires">
                    <Button variant="outline" disabled={submitting}>Cancel</Button>
                  </Link>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Create & Add Questions
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}