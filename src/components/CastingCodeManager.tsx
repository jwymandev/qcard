'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CastingCodeQRModal from './CastingCodeQRModal';
import SurveyFieldBuilder from './SurveyFieldBuilder';

// Form schema for creating a casting code
const castingCodeSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  description: z.string().optional(),
  projectId: z.string().optional(),
  expiresAt: z.string().optional(),
});

type CastingCodeFormValues = z.infer<typeof castingCodeSchema>;

// Define CastingCode type
interface CastingCode {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  expiresAt: string | null;
  studioId: string;
  projectId: string | null;
  surveyFields: any | null;
  createdAt: string;
  updatedAt: string;
  project: {
    title: string;
  } | null;
  submissions: {
    id: string;
  }[];
}

interface Project {
  id: string;
  title: string;
}

interface CastingCodeManagerProps {
  projects: Project[];
}

export default function CastingCodeManager({ projects }: CastingCodeManagerProps) {
  const [castingCodes, setCastingCodes] = useState<CastingCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [selectedCode, setSelectedCode] = useState<CastingCode | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [showSurveyBuilder, setShowSurveyBuilder] = useState(false);
  const [surveyFields, setSurveyFields] = useState<any | null>(null);
  const [selectedCodeForSurvey, setSelectedCodeForSurvey] = useState<CastingCode | null>(null);
  const [activeTab, setActiveTab] = useState<string>("details");

  // Form setup
  const form = useForm<CastingCodeFormValues>({
    resolver: zodResolver(castingCodeSchema),
    defaultValues: {
      name: '',
      description: '',
      projectId: '',
      expiresAt: '',
    },
  });

  // Fetch casting codes
  const fetchCastingCodes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/studio/casting-codes');
      
      if (!response.ok) {
        throw new Error('Failed to fetch casting codes');
      }
      
      const data = await response.json();
      setCastingCodes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error fetching casting codes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load casting codes on component mount
  useEffect(() => {
    fetchCastingCodes();
  }, []);

  // Handle form submission to create a new casting code
  const onSubmit = async (data: CastingCodeFormValues) => {
    try {
      setSubmitLoading(true);
      setError(null);
      
      // Include survey fields in the submission if they exist
      const requestBody = {
        ...data,
        projectId: data.projectId && data.projectId !== '' ? data.projectId : undefined,
        expiresAt: data.expiresAt && data.expiresAt !== '' ? data.expiresAt : undefined,
        surveyFields: surveyFields,
      };
      
      const response = await fetch('/api/studio/casting-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create casting code');
      }
      
      // Reset form and survey fields
      form.reset();
      setSurveyFields(null);
      setCreateMode(false);
      
      // Refresh the casting codes list
      fetchCastingCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error creating casting code:', err);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Toggle code active status
  const toggleCodeStatus = async (code: CastingCode) => {
    try {
      const response = await fetch(`/api/studio/casting-codes/${code.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !code.isActive,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update casting code');
      }
      
      // Refresh the casting codes list
      fetchCastingCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error updating casting code:', err);
    }
  };

  // Delete casting code
  const deleteCode = async (id: string) => {
    if (!confirm('Are you sure you want to delete this casting code? This will also delete all submissions associated with it.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/studio/casting-codes/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete casting code');
      }
      
      // Refresh the casting codes list
      fetchCastingCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error deleting casting code:', err);
    }
  };

  // Open QR code modal
  const openQRModal = (code: CastingCode) => {
    setSelectedCode(code);
    setQrModalOpen(true);
  };

  // Save survey fields
  const saveSurveyFields = async (fields: any) => {
    if (selectedCodeForSurvey) {
      // Update existing casting code with survey fields
      try {
        const response = await fetch(`/api/studio/casting-codes/${selectedCodeForSurvey.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            surveyFields: fields,
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to update survey fields');
        }
        
        // Refresh the casting codes list
        fetchCastingCodes();
        setShowSurveyBuilder(false);
        setSelectedCodeForSurvey(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error('Error updating survey fields:', err);
      }
    } else {
      // Just save the fields for a new casting code
      setSurveyFields(fields);
      setShowSurveyBuilder(false);
      setActiveTab("details");
    }
  };

  // Edit survey for an existing casting code
  const editSurvey = (code: CastingCode) => {
    setSelectedCodeForSurvey(code);
    setShowSurveyBuilder(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Casting Codes</h2>
        
        {!createMode && !showSurveyBuilder && (
          <Button onClick={() => setCreateMode(true)}>Create Casting Code</Button>
        )}
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Survey Builder */}
      {showSurveyBuilder && (
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">
            {selectedCodeForSurvey ? `Edit Survey for "${selectedCodeForSurvey.name}"` : "Add Custom Survey"}
          </h3>
          
          <SurveyFieldBuilder
            initialFields={selectedCodeForSurvey?.surveyFields}
            onSave={saveSurveyFields}
            onCancel={() => {
              setShowSurveyBuilder(false);
              setSelectedCodeForSurvey(null);
            }}
          />
        </Card>
      )}
      
      {/* Create form */}
      {createMode && !showSurveyBuilder && (
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Create New Casting Code</h3>
          
          <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="survey">Custom Survey</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter a name for this casting code" {...field} />
                        </FormControl>
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
                            placeholder="Describe what this casting code is for"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project (Optional)</FormLabel>
                        <FormControl>
                          <select
                            className="w-full p-2 border rounded-md"
                            {...field}
                          >
                            <option value="">Select a project</option>
                            {projects.map((project) => (
                              <option key={project.id} value={project.id}>
                                {project.title}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="expiresAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiration Date (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="datetime-local" 
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex items-center pt-4">
                    <div className="flex-1">
                      {surveyFields && (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          Survey Added ({surveyFields.fields.length} fields)
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setCreateMode(false);
                          setSurveyFields(null);
                        }}
                        disabled={submitLoading}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={submitLoading}
                      >
                        {submitLoading ? (
                          <>
                            <Spinner className="mr-2" size="sm" />
                            Creating...
                          </>
                        ) : (
                          'Create Casting Code'
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="survey">
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Create a custom survey that will be shown to external talent when they apply via this casting code.
                </p>
                
                {surveyFields ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                      <h4 className="font-medium text-green-800">Survey Created</h4>
                      <p className="text-sm text-green-700">
                        You&apos;ve added {surveyFields.fields.length} fields to this survey.
                      </p>
                    </div>
                    
                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowSurveyBuilder(true);
                        }}
                      >
                        Edit Survey
                      </Button>
                      
                      <Button
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setSurveyFields(null);
                        }}
                      >
                        Remove Survey
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => {
                      setShowSurveyBuilder(true);
                    }}
                  >
                    Add Custom Survey
                  </Button>
                )}
              </div>
              
              <div className="flex justify-end space-x-2 pt-4 border-t mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setActiveTab("details");
                  }}
                >
                  Back to Details
                </Button>
                
                <Button
                  onClick={() => {
                    form.handleSubmit(onSubmit)();
                  }}
                  disabled={submitLoading}
                >
                  {submitLoading ? (
                    <>
                      <Spinner className="mr-2" size="sm" />
                      Creating...
                    </>
                  ) : (
                    'Create Casting Code'
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      )}
      
      {/* Casting codes list */}
      {!showSurveyBuilder && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <Spinner size="lg" />
            </div>
          ) : castingCodes.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No casting codes found. Create one to get started.</p>
            </Card>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {castingCodes.map((code) => (
                <Card key={code.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{code.name}</h3>
                        <Badge variant={code.isActive ? "default" : "secondary"}>
                          {code.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      
                      {code.project && (
                        <p className="text-sm text-muted-foreground">
                          Project: {code.project.title}
                        </p>
                      )}
                    </div>
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <span className="sr-only">Open menu</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-more-vertical"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-40 p-0" align="end">
                        <div className="flex flex-col">
                          <Button 
                            variant="ghost" 
                            className="justify-start"
                            onClick={() => openQRModal(code)}
                          >
                            Show QR Code
                          </Button>
                          <Link href={`/studio/casting-codes/${code.id}/submissions`}>
                            <Button 
                              variant="ghost" 
                              className="justify-start w-full text-left"
                            >
                              View Submissions {code.submissions.length > 0 && `(${code.submissions.length})`}
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            className="justify-start"
                            onClick={() => editSurvey(code)}
                          >
                            Edit Survey
                          </Button>
                          <Button 
                            variant="ghost" 
                            className="justify-start"
                            onClick={() => toggleCodeStatus(code)}
                          >
                            {code.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button 
                            variant="ghost" 
                            className="justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deleteCode(code.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <p className="text-xs">
                      <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">
                        {code.code}
                      </span>
                    </p>
                    
                    {code.description && (
                      <p className="text-sm text-muted-foreground">
                        {code.description}
                      </p>
                    )}
                    
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        Created: {new Date(code.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex items-center space-x-2">
                        {code.surveyFields && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 mr-2">
                            Survey: {code.surveyFields.fields?.length || 0} fields
                          </Badge>
                        )}
                        <span>
                          {code.submissions.length} submissions
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* QR Code Modal */}
      <CastingCodeQRModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        castingCode={selectedCode}
      />
    </div>
  );
}