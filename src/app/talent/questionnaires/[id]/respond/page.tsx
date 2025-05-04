'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Type definitions
type QuestionnaireQuestion = {
  id: string;
  text: string;
  description: string | null;
  type: 'SHORT_TEXT' | 'LONG_TEXT' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'RATING' | 'DATE' | 'FILE_UPLOAD' | 'YES_NO';
  isRequired: boolean;
  order: number;
  options: string[] | null;
  metadata: any | null;
};

type QuestionnaireInvitation = {
  id: string;
  questionnaireId: string;
  questionnaireTitle: string;
  studioName: string;
  studioImageUrl: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED';
  sentAt: string;
  expiresAt: string | null;
  message: string | null;
};

type QuestionnaireData = {
  id: string;
  title: string;
  description: string | null;
  questions: QuestionnaireQuestion[];
  invitation: QuestionnaireInvitation;
};

type AnswerValues = {
  [questionId: string]: string | string[] | boolean | null;
};

export default function TalentQuestionnaireResponsePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const invitationId = params.id;
  
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData | null>(null);
  const [answers, setAnswers] = useState<AnswerValues>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  
  // Load questionnaire and invitation data
  useEffect(() => {
    async function loadQuestionnaireData() {
      try {
        const response = await fetch(`/api/talent/questionnaires/invitations/${invitationId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch questionnaire: ${response.status}`);
        }
        
        const data = await response.json();
        setQuestionnaire(data);
        
        // Initialize answers object with empty values
        const initialAnswers: AnswerValues = {};
        data.questions.forEach(question => {
          if (question.type === 'MULTIPLE_CHOICE') {
            initialAnswers[question.id] = [];
          } else if (question.type === 'YES_NO') {
            initialAnswers[question.id] = null;
          } else {
            initialAnswers[question.id] = '';
          }
        });
        setAnswers(initialAnswers);
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading questionnaire:', err);
        setError('Failed to load questionnaire data');
        setLoading(false);
      }
    }
    
    loadQuestionnaireData();
  }, [invitationId]);
  
  // Handle input changes
  const handleInputChange = (questionId: string, value: string | string[] | boolean) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
    
    // Clear validation error when field is updated
    if (validationErrors[questionId]) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[questionId];
        return updated;
      });
    }
  };
  
  // Handle checkbox changes (for multiple choice)
  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    setAnswers(prev => {
      const currentValues = prev[questionId] as string[] || [];
      
      if (checked) {
        return {
          ...prev,
          [questionId]: [...currentValues, option]
        };
      } else {
        return {
          ...prev,
          [questionId]: currentValues.filter(item => item !== option)
        };
      }
    });
    
    // Clear validation error when field is updated
    if (validationErrors[questionId]) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[questionId];
        return updated;
      });
    }
  };
  
  // Handle file upload
  const handleFileUpload = async (questionId: string, file: File) => {
    try {
      // Show some upload indicator
      handleInputChange(questionId, 'Uploading...');
      
      // In a real implementation, you would:
      // 1. Create a FormData object
      // 2. Upload the file to your server/storage
      // 3. Get back a URL or identifier
      
      // Mock file upload
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update with fake file URL
      handleInputChange(questionId, `uploads/${file.name}`);
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('Failed to upload file');
    }
  };
  
  // Validate the form
  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (!questionnaire) return false;
    
    questionnaire.questions.forEach(question => {
      if (question.isRequired) {
        const answer = answers[question.id];
        
        if (answer === null || answer === undefined) {
          errors[question.id] = 'This question requires an answer';
        } else if (typeof answer === 'string' && answer.trim() === '') {
          errors[question.id] = 'This question requires an answer';
        } else if (Array.isArray(answer) && answer.length === 0) {
          errors[question.id] = 'Please select at least one option';
        }
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Scroll to the first error
      const firstErrorField = document.querySelector('[data-error="true"]');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Format answers for submission
      const formattedAnswers = Object.entries(answers).map(([questionId, value]) => {
        const question = questionnaire?.questions.find(q => q.id === questionId);
        
        if (!question) return null;
        
        let formattedValue: any = null;
        
        switch (question.type) {
          case 'MULTIPLE_CHOICE':
            formattedValue = { choiceValues: value };
            break;
          case 'SINGLE_CHOICE':
            formattedValue = { choiceValues: [value] };
            break;
          case 'FILE_UPLOAD':
            formattedValue = { fileUrl: value };
            break;
          case 'YES_NO':
            formattedValue = { textValue: value ? 'Yes' : 'No' };
            break;
          default:
            formattedValue = { textValue: value };
        }
        
        return {
          questionId,
          ...formattedValue
        };
      }).filter(Boolean);
      
      const response = await fetch(`/api/talent/questionnaires/invitations/${invitationId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: formattedAnswers })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to submit response: ${response.status}`);
      }
      
      // Redirect to success page or questionnaires list
      router.push('/talent/questionnaires');
    } catch (err) {
      console.error('Error submitting questionnaire:', err);
      setError('Failed to submit questionnaire response');
      setSubmitting(false);
    }
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-500">Loading questionnaire...</span>
      </div>
    );
  }
  
  // Render error state
  if (error || !questionnaire) {
    return (
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Error</h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>{error || 'Failed to load questionnaire'}</p>
          </div>
          <div className="mt-5">
            <Link
              href="/talent/questionnaires"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Questionnaires
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{questionnaire.title}</h1>
        <p className="mt-1 text-sm text-gray-500">
          From: {questionnaire.invitation.studioName}
        </p>
        {questionnaire.invitation.expiresAt && (
          <p className="mt-1 text-sm text-gray-500">
            Please submit by: {new Date(questionnaire.invitation.expiresAt).toLocaleDateString()}
          </p>
        )}
        {questionnaire.description && (
          <p className="mt-4 text-base text-gray-700">
            {questionnaire.description}
          </p>
        )}
      </div>
      
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:p-6">
            <div className="space-y-8">
              {questionnaire.questions.map((question) => (
                <div 
                  key={question.id} 
                  className={`border-b border-gray-200 pb-6 ${
                    validationErrors[question.id] ? 'bg-red-50 p-4 rounded-md -mx-4' : ''
                  }`}
                  data-error={validationErrors[question.id] ? 'true' : 'false'}
                >
                  <div className="mb-4">
                    <label 
                      htmlFor={question.id} 
                      className="block text-base font-medium text-gray-900"
                    >
                      {question.text}
                      {question.isRequired && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                    {question.description && (
                      <p className="mt-1 text-sm text-gray-500">
                        {question.description}
                      </p>
                    )}
                    {validationErrors[question.id] && (
                      <p className="mt-2 text-sm text-red-600">
                        {validationErrors[question.id]}
                      </p>
                    )}
                  </div>
                  
                  {/* Render different input types based on question type */}
                  {question.type === 'SHORT_TEXT' && (
                    <input
                      type="text"
                      id={question.id}
                      value={answers[question.id] as string || ''}
                      onChange={(e) => handleInputChange(question.id, e.target.value)}
                      className="block w-full sm:max-w-lg border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  )}
                  
                  {question.type === 'LONG_TEXT' && (
                    <textarea
                      id={question.id}
                      value={answers[question.id] as string || ''}
                      onChange={(e) => handleInputChange(question.id, e.target.value)}
                      rows={4}
                      className="block w-full sm:max-w-2xl border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  )}
                  
                  {question.type === 'SINGLE_CHOICE' && question.options && (
                    <div className="mt-4 space-y-4">
                      {question.options.map((option, index) => (
                        <div key={index} className="flex items-center">
                          <input
                            id={`${question.id}-${index}`}
                            name={question.id}
                            type="radio"
                            checked={(answers[question.id] as string) === option}
                            onChange={() => handleInputChange(question.id, option)}
                            className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                          />
                          <label
                            htmlFor={`${question.id}-${index}`}
                            className="ml-3 block text-sm font-medium text-gray-700"
                          >
                            {option}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {question.type === 'MULTIPLE_CHOICE' && question.options && (
                    <div className="mt-4 space-y-4">
                      {question.options.map((option, index) => (
                        <div key={index} className="flex items-center">
                          <input
                            id={`${question.id}-${index}`}
                            name={`${question.id}-${index}`}
                            type="checkbox"
                            checked={(answers[question.id] as string[] || []).includes(option)}
                            onChange={(e) => handleCheckboxChange(question.id, option, e.target.checked)}
                            className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                          />
                          <label
                            htmlFor={`${question.id}-${index}`}
                            className="ml-3 block text-sm font-medium text-gray-700"
                          >
                            {option}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {question.type === 'RATING' && question.metadata && (
                    <div className="mt-4">
                      <div className="flex items-center">
                        {Array.from({ length: question.metadata.max - question.metadata.min + 1 }, (_, i) => i + question.metadata.min).map((rating) => (
                          <button
                            key={rating}
                            type="button"
                            onClick={() => handleInputChange(question.id, rating.toString())}
                            className={`mx-1 h-10 w-10 rounded-full flex items-center justify-center border ${
                              parseInt(answers[question.id] as string || '0') === rating
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {rating}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-2 max-w-md">
                        <span>{question.metadata.min} (Lowest)</span>
                        <span>{question.metadata.max} (Highest)</span>
                      </div>
                    </div>
                  )}
                  
                  {question.type === 'DATE' && (
                    <input
                      type="date"
                      id={question.id}
                      value={answers[question.id] as string || ''}
                      onChange={(e) => handleInputChange(question.id, e.target.value)}
                      className="block w-full sm:max-w-lg border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  )}
                  
                  {question.type === 'FILE_UPLOAD' && (
                    <div className="mt-2">
                      <div className="max-w-lg flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                          <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            stroke="currentColor"
                            fill="none"
                            viewBox="0 0 48 48"
                            aria-hidden="true"
                          >
                            <path
                              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <div className="flex text-sm text-gray-600">
                            <label
                              htmlFor={`file-upload-${question.id}`}
                              className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                            >
                              <span>Upload a file</span>
                              <input
                                id={`file-upload-${question.id}`}
                                name={`file-upload-${question.id}`}
                                type="file"
                                className="sr-only"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleFileUpload(question.id, e.target.files[0]);
                                  }
                                }}
                                accept={question.metadata?.allowedTypes?.join(',')}
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            {question.metadata?.allowedTypes 
                              ? `${question.metadata.allowedTypes.join(', ')} up to 10MB`
                              : 'PNG, JPG, GIF up to 10MB'}
                          </p>
                          {answers[question.id] && (
                            <p className="text-sm text-blue-600 mt-2">
                              {typeof answers[question.id] === 'string' 
                                ? (answers[question.id] as string).includes('uploads/') 
                                  ? `File uploaded: ${(answers[question.id] as string).replace('uploads/', '')}`
                                  : answers[question.id]
                                : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {question.type === 'YES_NO' && (
                    <div className="mt-4 space-y-4">
                      <div className="flex items-center">
                        <input
                          id={`${question.id}-yes`}
                          name={question.id}
                          type="radio"
                          checked={answers[question.id] === true}
                          onChange={() => handleInputChange(question.id, true)}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                        />
                        <label
                          htmlFor={`${question.id}-yes`}
                          className="ml-3 block text-sm font-medium text-gray-700"
                        >
                          Yes
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          id={`${question.id}-no`}
                          name={question.id}
                          type="radio"
                          checked={answers[question.id] === false}
                          onChange={() => handleInputChange(question.id, false)}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                        />
                        <label
                          htmlFor={`${question.id}-no`}
                          className="ml-3 block text-sm font-medium text-gray-700"
                        >
                          No
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex justify-between">
          <Link
            href="/talent/questionnaires"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              submitting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {submitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : (
              'Submit Response'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}