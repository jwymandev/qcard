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
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui';
import { Loader2, ChevronLeft, Save, Plus, Trash } from 'lucide-react';

// Define the available question types
const questionTypes = [
  { value: 'SHORT_TEXT', label: 'Short Text' },
  { value: 'LONG_TEXT', label: 'Long Text' },
  { value: 'SINGLE_CHOICE', label: 'Single Choice' },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
  { value: 'RATING', label: 'Rating' },
  { value: 'DATE', label: 'Date' },
  { value: 'FILE_UPLOAD', label: 'File Upload' },
  { value: 'YES_NO', label: 'Yes/No' },
];

// Define form schema
const formSchema = z.object({
  text: z.string().min(3, {
    message: "Question text must be at least 3 characters.",
  }).max(200, {
    message: "Question text must not exceed 200 characters."
  }),
  description: z.string().max(500, {
    message: "Description must not exceed 500 characters."
  }).optional(),
  type: z.enum([
    'SHORT_TEXT', 'LONG_TEXT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 
    'RATING', 'DATE', 'FILE_UPLOAD', 'YES_NO'
  ]),
  isRequired: z.boolean().default(false),
  options: z.array(
    z.object({
      label: z.string().min(1, "Option text is required"),
      value: z.string(),
    })
  ).optional(),
  metadata: z.any().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Questionnaire {
  id: string;
  title: string;
  questionsCount?: number;
}

export default function NewQuestionPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<{label: string, value: string}[]>([
    { label: 'Option 1', value: 'option_1' },
    { label: 'Option 2', value: 'option_2' },
  ]);

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      text: '',
      description: '',
      type: 'SHORT_TEXT',
      isRequired: false,
      options: [
        { label: 'Option 1', value: 'option_1' },
        { label: 'Option 2', value: 'option_2' },
      ],
      metadata: {},
    },
  });

  // Watch the type to conditionally show options field
  const questionType = form.watch('type');
  const showOptions = questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE';

  // Fetch questionnaire details
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
        setQuestionnaire({
          id: data.id,
          title: data.title,
          questionsCount: data.questions.length,
        });
      } catch (err) {
        console.error('Error fetching questionnaire:', err);
        setError('Failed to load questionnaire details');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionnaire();
  }, [status, router, params.id]);

  // Handle adding a new option
  const addOption = () => {
    const newOptions = [...options];
    const newIndex = newOptions.length + 1;
    newOptions.push({ 
      label: `Option ${newIndex}`, 
      value: `option_${newIndex}` 
    });
    setOptions(newOptions);
    form.setValue('options', newOptions);
  };

  // Handle removing an option
  const removeOption = (index: number) => {
    if (options.length <= 2) {
      return; // Maintain at least 2 options
    }
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
    form.setValue('options', newOptions);
  };

  // Handle option text change
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = { 
      ...newOptions[index],
      label: value, 
      value: value.toLowerCase().replace(/\s+/g, '_')
    };
    setOptions(newOptions);
    form.setValue('options', newOptions);
  };

  // Handle form submission
  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    setError(null);

    // Prepare the data for submission
    const formData = {
      ...values,
      questionnaireId: params.id,
      order: questionnaire?.questionsCount || 0,
      // Only include options for question types that use them
      options: showOptions ? values.options : undefined,
      // Add empty metadata object if not provided
      metadata: values.metadata || {},
    };
    
    try {
      const response = await fetch(`/api/studio/questionnaires/${params.id}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create question');
      }
      
      // Check if user wants to add another question or return to questionnaire
      const addAnother = window.confirm('Question added! Add another question?');
      
      if (addAnother) {
        // Reset form for a new question
        form.reset({
          text: '',
          description: '',
          type: 'SHORT_TEXT',
          isRequired: false,
          options: [
            { label: 'Option 1', value: 'option_1' },
            { label: 'Option 2', value: 'option_2' },
          ],
          metadata: {},
        });
        setOptions([
          { label: 'Option 1', value: 'option_1' },
          { label: 'Option 2', value: 'option_2' },
        ]);
        // Update question count for next question's order
        setQuestionnaire(prev => prev ? {
          ...prev,
          questionsCount: (prev.questionsCount || 0) + 1
        } : null);
      } else {
        // Return to questionnaire page
        router.push(`/studio/questionnaires/${params.id}`);
      }
    } catch (err) {
      console.error('Error creating question:', err);
      setError(err instanceof Error ? err.message : 'Failed to create question');
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
      
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Add Question</h1>
        <p className="text-muted-foreground mb-6">
          Adding question #{(questionnaire.questionsCount || 0) + 1} to "{questionnaire.title}"
        </p>
        
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle>Question Details</CardTitle>
            <CardDescription>
              Define your question and how talents should respond
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question Text*</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your question" 
                          {...field}
                          disabled={submitting} 
                        />
                      </FormControl>
                      <FormDescription>
                        The main text of your question
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
                      <FormLabel>Help Text / Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Provide additional details or instructions" 
                          {...field}
                          value={field.value || ''}
                          disabled={submitting}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional help text to provide context or clarification
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question Type*</FormLabel>
                      <Select 
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={submitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select question type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {questionTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How talents should respond to this question
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {showOptions && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <FormLabel>Options*</FormLabel>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={addOption}
                        disabled={submitting}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Option
                      </Button>
                    </div>
                    <FormDescription className="mt-0">
                      Define the choices for this {questionType === 'SINGLE_CHOICE' ? 'single' : 'multiple'} choice question
                    </FormDescription>
                    
                    <div className="space-y-3">
                      {options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={option.label}
                            onChange={(e) => handleOptionChange(index, e.target.value)}
                            placeholder={`Option ${index + 1}`}
                            disabled={submitting}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeOption(index)}
                            disabled={submitting || options.length <= 2}
                            className="h-10 w-10 rounded-full"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <Separator className="my-4" />
                
                <FormField
                  control={form.control}
                  name="isRequired"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-4 border rounded-md">
                      <div className="space-y-0.5">
                        <FormLabel>Required</FormLabel>
                        <FormDescription>
                          Talents must answer this question to complete the questionnaire
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
                
                <div className="flex justify-end gap-3 pt-4">
                  <Link href={`/studio/questionnaires/${params.id}`}>
                    <Button variant="outline" disabled={submitting}>Cancel</Button>
                  </Link>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Question
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