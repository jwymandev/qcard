'use client';

import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Button,
  Card,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  Switch,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  AlertDescription,
  Spinner
} from '@/components/ui';
import SurveyFieldBuilder, { SurveyFieldType } from './SurveyFieldBuilder';

// Define schema for talent requirements
const requirementsSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  gender: z.string().optional(),
  minAge: z.string().optional(),
  maxAge: z.string().optional(),
  ethnicity: z.string().optional(),
  height: z.string().optional(),
  skills: z.string().optional(),
  otherRequirements: z.string().optional(),
});

export type TalentRequirementsFormValues = z.infer<typeof requirementsSchema>;

// Role type that will be stored in the project
export interface TalentRole {
  id: string;
  title: string;
  description?: string;
  isActive: boolean;
  gender?: string;
  minAge?: string;
  maxAge?: string;
  ethnicity?: string;
  height?: string;
  skills?: string;
  otherRequirements?: string;
  survey?: any;
  createdAt: string;
  updatedAt: string;
}

interface TalentRequirementsProps {
  projectId: string;
  roles?: TalentRole[] | null; // Make it nullable
  onSave: (role: TalentRequirementsFormValues & { survey?: any }) => Promise<void>;
  onDelete?: (roleId: string) => Promise<void>;
}

export default function TalentRequirements({
  projectId,
  roles = [],
  onSave,
  onDelete
}: TalentRequirementsProps) {
  // Ensure roles is always an array
  const safeRoles = Array.isArray(roles) ? roles : [];
  const [activeTab, setActiveTab] = useState<string>("requirements");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showSurveyBuilder, setShowSurveyBuilder] = useState(false);
  const [surveyFields, setSurveyFields] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form setup
  const form = useForm<TalentRequirementsFormValues>({
    resolver: zodResolver(requirementsSchema),
    defaultValues: {
      title: '',
      description: '',
      isActive: true,
      gender: '',
      minAge: '',
      maxAge: '',
      ethnicity: '',
      height: '',
      skills: '',
      otherRequirements: ''
    },
  });

  // Generate a unique ID
  const generateId = () => {
    return Math.random().toString(36).substring(2, 11);
  };

  // Handle form submission
  const onSubmit = async (data: TalentRequirementsFormValues) => {
    try {
      setLoading(true);
      setError(null);

      // Add survey fields if they exist
      const roleData = {
        ...data,
        survey: surveyFields
      };

      await onSave(roleData);
      
      // Reset form
      form.reset();
      setSurveyFields(null);
      setIsCreating(false);
      setEditingRoleId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Start editing a role
  const editRole = (role: TalentRole) => {
    setEditingRoleId(role.id);
    setIsCreating(true);
    
    // Set form values
    form.reset({
      title: role.title,
      description: role.description || '',
      isActive: role.isActive,
      gender: role.gender || '',
      minAge: role.minAge || '',
      maxAge: role.maxAge || '',
      ethnicity: role.ethnicity || '',
      height: role.height || '',
      skills: role.skills || '',
      otherRequirements: role.otherRequirements || ''
    });

    // Set survey fields if they exist
    if (role.survey) {
      setSurveyFields(role.survey);
    } else {
      setSurveyFields(null);
    }
  };

  // Delete a role
  const handleDeleteRole = async (roleId: string) => {
    if (!onDelete) return;
    
    if (confirm('Are you sure you want to delete this role?')) {
      try {
        setLoading(true);
        await onDelete(roleId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete role');
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle saving survey fields
  const saveSurveyFields = (fields: any) => {
    setSurveyFields(fields);
    setShowSurveyBuilder(false);
    setActiveTab("requirements");
  };

  // Create an example survey for casting
  const createExampleSurvey = () => {
    const exampleSurvey = {
      fields: [
        {
          id: generateId(),
          label: "Do you have experience with this type of role?",
          type: SurveyFieldType.RADIO,
          required: true,
          description: "Please select your experience level",
          options: [
            { id: generateId(), label: "Yes, extensive experience", value: "extensive" },
            { id: generateId(), label: "Yes, some experience", value: "some" },
            { id: generateId(), label: "No, but I'm willing to learn", value: "willing" },
            { id: generateId(), label: "No experience", value: "none" }
          ]
        },
        {
          id: generateId(),
          label: "Availability",
          type: SurveyFieldType.CHECKBOX,
          required: true,
          description: "Select all that apply",
          options: [
            { id: generateId(), label: "Weekdays", value: "weekdays" },
            { id: generateId(), label: "Weekends", value: "weekends" },
            { id: generateId(), label: "Evenings", value: "evenings" },
            { id: generateId(), label: "Early mornings", value: "mornings" }
          ]
        },
        {
          id: generateId(),
          label: "Why are you interested in this role?",
          type: SurveyFieldType.TEXTAREA,
          required: true,
          description: "Please explain briefly",
          placeholder: "Share your interest in this role..."
        }
      ]
    };
    
    setSurveyFields(exampleSurvey);
    setShowSurveyBuilder(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Talent Requirements</h2>
        
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)}>Add Role</Button>
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
            Add Casting Survey
          </h3>
          
          <SurveyFieldBuilder
            initialFields={surveyFields}
            onSave={saveSurveyFields}
            onCancel={() => {
              setShowSurveyBuilder(false);
            }}
          />
        </Card>
      )}
      
      {/* Create/Edit Form */}
      {isCreating && !showSurveyBuilder && (
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">
            {editingRoleId ? 'Edit Role' : 'Add New Role'}
          </h3>
          
          <Tabs defaultValue="requirements" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="requirements">Requirements</TabsTrigger>
              <TabsTrigger value="survey">Casting Survey</TabsTrigger>
            </TabsList>
            
            <TabsContent value="requirements">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role Title *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Background Extra, Lead Actor" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between space-x-2">
                          <FormLabel>Active</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the role in detail"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <h4 className="font-medium mt-6 mb-3">Physical Characteristics</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <FormControl>
                            <select
                              className="w-full p-2 border rounded-md"
                              {...field}
                            >
                              <option value="">Any gender</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="non-binary">Non-binary</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="minAge"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min Age</FormLabel>
                            <FormControl>
                              <Input placeholder="18" type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="maxAge"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Age</FormLabel>
                            <FormControl>
                              <Input placeholder="99" type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ethnicity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ethnicity</FormLabel>
                          <FormControl>
                            <Input placeholder="Any ethnicity" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="height"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Height</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 5'8&quot; - 6'0&quot;" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="skills"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Required Skills</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="e.g., Dancing, Swimming, Horseback riding"
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
                    name="otherRequirements"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Other Requirements</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Any other special requirements for this role"
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
                          Survey Added ({surveyFields.fields.length} questions)
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsCreating(false);
                          setEditingRoleId(null);
                          setSurveyFields(null);
                          form.reset();
                        }}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Spinner className="mr-2" size="sm" />
                            Saving...
                          </>
                        ) : (
                          editingRoleId ? 'Update Role' : 'Save Role'
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
                  Create a custom survey for talents to fill out when applying to this role. This helps you gather specific information relevant to this casting.
                </p>
                
                {surveyFields ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                      <h4 className="font-medium text-green-800">Survey Created</h4>
                      <p className="text-sm text-green-700">
                        You&apos;ve added {surveyFields.fields.length} questions to this survey.
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
                  <div className="space-y-4">
                    <Button
                      onClick={() => {
                        setShowSurveyBuilder(true);
                      }}
                      className="mr-2"
                    >
                      Create Custom Survey
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={createExampleSurvey}
                    >
                      Use Example Survey
                    </Button>
                    
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-md mt-4">
                      <h4 className="font-medium text-blue-800">Why use a survey?</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Surveys help you collect specific information from applicants, such as availability, experience, or special skills relevant to this role.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-2 pt-4 border-t mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setActiveTab("requirements");
                  }}
                >
                  Back to Requirements
                </Button>

                <Button
                  onClick={() => {
                    setActiveTab("requirements");
                    setTimeout(() => {
                      form.handleSubmit(onSubmit)();
                    }, 100);
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner className="mr-2" size="sm" />
                      Saving...
                    </>
                  ) : (
                    editingRoleId ? 'Update Role' : 'Save Role'
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      )}
      
      {/* Display existing roles */}
      {!showSurveyBuilder && !isCreating && (
        <div className="space-y-4">
          {!safeRoles || safeRoles.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No roles defined yet. Add a role to start defining talent requirements.</p>
            </Card>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {safeRoles.map((role) => (
                <Card key={role.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{role.title}</h3>
                        <Badge variant={role.isActive ? "default" : "secondary"}>
                          {role.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      
                      {role.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {role.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editRole(role)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteRole(role.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {role.gender && (
                      <>
                        <span className="text-gray-500">Gender:</span>
                        <span className="font-medium">{role.gender}</span>
                      </>
                    )}
                    
                    {(role.minAge || role.maxAge) && (
                      <>
                        <span className="text-gray-500">Age Range:</span>
                        <span className="font-medium">
                          {role.minAge ? role.minAge : ''}
                          {role.minAge && role.maxAge ? ' - ' : ''}
                          {role.maxAge ? role.maxAge : ''}
                        </span>
                      </>
                    )}
                    
                    {role.ethnicity && (
                      <>
                        <span className="text-gray-500">Ethnicity:</span>
                        <span className="font-medium">{role.ethnicity}</span>
                      </>
                    )}
                    
                    {role.height && (
                      <>
                        <span className="text-gray-500">Height:</span>
                        <span className="font-medium">{role.height}</span>
                      </>
                    )}
                  </div>
                  
                  <div className="mt-4 flex justify-between text-xs text-muted-foreground">
                    <span>
                      Created: {new Date(role.createdAt).toLocaleDateString()}
                    </span>
                    <div>
                      {role.survey && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                          Survey: {role.survey.fields?.length || 0} questions
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}