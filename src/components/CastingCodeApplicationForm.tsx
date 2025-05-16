'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Button,
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
  Spinner,
  Alert,
  AlertDescription,
  Separator,
  Badge
} from '@/components/ui';
import { SurveyFieldType } from './SurveyFieldBuilder';

// Form validation schema
const applicationFormSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required' }),
  lastName: z.string().min(1, { message: 'Last name is required' }),
  email: z.string().email({ message: 'Please enter a valid email' }).optional().or(z.literal('')),
  phoneNumber: z.string().optional(),
  message: z.string().optional(),
  createAccount: z.boolean().default(false),
  surveyResponses: z.record(z.string(), z.any()).optional(),
});

type ApplicationFormValues = z.infer<typeof applicationFormSchema>;

interface CastingCodeApplicationFormProps {
  code: string;
  studioId: string;
  surveyFields?: any;
}

export default function CastingCodeApplicationForm({
  code,
  studioId,
  surveyFields,
}: CastingCodeApplicationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Generate dynamic form with survey fields
  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      message: '',
      createAccount: false,
      surveyResponses: {},
    },
  });

  // Helper to validate if a survey field is required
  const isFieldRequired = (field: any) => {
    return field.required === true;
  };

  // Helper to get field values
  const getSurveyFieldValue = (fieldId: string) => {
    const responses = form.getValues('surveyResponses') || {};
    return responses[fieldId];
  };

  // Handle survey field change
  const handleSurveyFieldChange = (fieldId: string, value: any) => {
    const currentResponses = form.getValues('surveyResponses') || {};
    form.setValue('surveyResponses', {
      ...currentResponses,
      [fieldId]: value,
    }, { shouldValidate: true });
  };

  const onSubmit = async (data: ApplicationFormValues) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // Add the code to the submission data
      const submissionPayload = {
        ...data,
        code,
      };

      console.log('Submitting form with data:', submissionPayload);

      // Submit the application
      let responseData;
      try {
        const response = await fetch('/api/casting-codes/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submissionPayload),
        });

        // Parse the response JSON only once
        responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.error || 'Failed to submit application');
        }

        console.log('Submission response data:', responseData);
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        throw fetchError;
      }
      
      // Make sure we have the createAccount value properly set
      const createAccountValue = form.getValues('createAccount');
      console.log('Form create account value:', createAccountValue);
      
      // Ensure the submissionData has all required fields
      setSubmissionData({
        ...responseData,
        submissionId: responseData.submissionId,
        createAccount: createAccountValue
      });

      // Handle success
      setSubmitSuccess(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An unknown error occurred');
      console.error('Error submitting application:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [submissionData, setSubmissionData] = useState<any>(null);

  if (submitSuccess) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="text-xl font-semibold text-green-800 mb-2">Application Submitted Successfully!</h3>
        <p className="text-green-700 mb-4">
          Thank you for your submission. The studio has been notified and will contact you if they&apos;re interested.
        </p>
        {form.getValues('createAccount') && submissionData && (
          <div className="border-t border-green-200 pt-4 mt-4">
            <p className="text-sm text-green-600 mb-4">
              Create your account now to manage your profile and easily apply to future casting calls.
            </p>
            <a 
              href={`/sign-up?firstName=${encodeURIComponent(form.getValues('firstName'))}&lastName=${encodeURIComponent(form.getValues('lastName'))}&email=${encodeURIComponent(form.getValues('email') || '')}&phoneNumber=${encodeURIComponent(form.getValues('phoneNumber') || '')}&submissionId=${encodeURIComponent(submissionData.submissionId || '')}`}
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
            >
              Create Account
            </a>
          </div>
        )}
        
        {submissionData && !form.getValues('createAccount') && (
          <div className="mt-6 text-center">
            <p className="text-gray-600 mb-4">
              Changed your mind? You can still create an account to keep track of your submissions.
            </p>
            <a 
              href={`/sign-up?firstName=${encodeURIComponent(form.getValues('firstName'))}&lastName=${encodeURIComponent(form.getValues('lastName'))}&email=${encodeURIComponent(form.getValues('email') || '')}&phoneNumber=${encodeURIComponent(form.getValues('phoneNumber') || '')}&submissionId=${encodeURIComponent(submissionData.submissionId || '')}`}
              className="inline-block border border-blue-600 text-blue-600 hover:bg-blue-50 py-2 px-4 rounded"
            >
              Create Account Now
            </a>
          </div>
        )}
      </div>
    );
  }

  // Get survey fields from props
  const hasSurvey = surveyFields && surveyFields.fields && surveyFields.fields.length > 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {submitError && (
          <Alert variant="destructive">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Your first name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Your last name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="your.email@example.com" 
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
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="(555) 555-5555" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Tell the studio a bit about yourself and why you're interested in working with them..."
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Survey Fields Section */}
        {hasSurvey && (
          <>
            <Separator className="my-6" />
            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-1">Custom Survey</h4>
              <p className="text-sm text-muted-foreground">
                Please complete the following questions from the studio.
              </p>
            </div>
            
            <div className="space-y-6">
              {surveyFields.fields.map((field: any) => (
                <div key={field.id} className="border rounded-md p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FormLabel className="text-base">{field.label}</FormLabel>
                    {isFieldRequired(field) && (
                      <Badge className="bg-red-100 text-red-800 border-red-200">Required</Badge>
                    )}
                  </div>
                  
                  {field.description && (
                    <FormDescription className="text-sm mb-2">
                      {field.description}
                    </FormDescription>
                  )}
                  
                  {/* Render different form controls based on field type */}
                  {field.type === SurveyFieldType.TEXT && (
                    <Input 
                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                      value={getSurveyFieldValue(field.id) || ''}
                      onChange={(e) => handleSurveyFieldChange(field.id, e.target.value)}
                      required={isFieldRequired(field)}
                    />
                  )}
                  
                  {field.type === SurveyFieldType.TEXTAREA && (
                    <Textarea 
                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                      value={getSurveyFieldValue(field.id) || ''}
                      onChange={(e) => handleSurveyFieldChange(field.id, e.target.value)}
                      required={isFieldRequired(field)}
                      rows={4}
                    />
                  )}
                  
                  {field.type === SurveyFieldType.NUMBER && (
                    <Input 
                      type="number"
                      placeholder={field.placeholder || `Enter a number`}
                      value={getSurveyFieldValue(field.id) || ''}
                      onChange={(e) => handleSurveyFieldChange(field.id, e.target.value)}
                      required={isFieldRequired(field)}
                    />
                  )}
                  
                  {field.type === SurveyFieldType.CHECKBOX && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={getSurveyFieldValue(field.id) || false}
                        onCheckedChange={(checked) => handleSurveyFieldChange(field.id, checked)}
                        id={`survey-${field.id}`}
                      />
                      <label
                        htmlFor={`survey-${field.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {field.placeholder || 'Yes'}
                      </label>
                    </div>
                  )}
                  
                  {field.type === SurveyFieldType.DROPDOWN && (
                    <select 
                      className="w-full p-2 border rounded-md"
                      value={getSurveyFieldValue(field.id) || ''}
                      onChange={(e) => handleSurveyFieldChange(field.id, e.target.value)}
                      required={isFieldRequired(field)}
                    >
                      <option value="">Select an option</option>
                      {field.options && field.options.map((option: any) => (
                        <option key={option.id} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                  
                  {field.type === SurveyFieldType.RADIO && (
                    <div className="space-y-2">
                      {field.options && field.options.map((option: any) => (
                        <div key={option.id} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id={`option-${option.id}`}
                            name={`survey-${field.id}`}
                            value={option.value}
                            checked={getSurveyFieldValue(field.id) === option.value}
                            onChange={() => handleSurveyFieldChange(field.id, option.value)}
                            required={isFieldRequired(field)}
                            className="h-4 w-4"
                          />
                          <label
                            htmlFor={`option-${option.id}`}
                            className="text-sm font-medium leading-none"
                          >
                            {option.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Separator className="my-6" />
          </>
        )}

        <FormField
          control={form.control}
          name="createAccount"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
              <FormControl>
                <Checkbox
                  id="create-account-checkbox"
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    console.log('Checkbox changed to:', checked);
                    field.onChange(checked);
                  }}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="cursor-pointer">Create an account on the platform</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Creating an account will allow you to manage your profile and easily apply to future casting calls.
                </p>
              </div>
            </FormItem>
          )}
        />

        <div className="pt-4">
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Spinner className="mr-2" size="sm" />
                Submitting...
              </>
            ) : (
              'Submit Application'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}