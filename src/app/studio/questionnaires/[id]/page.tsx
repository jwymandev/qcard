'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

// Question type options
const questionTypes = [
  { value: 'SHORT_TEXT', label: 'Short Text' },
  { value: 'LONG_TEXT', label: 'Long Text' },
  { value: 'SINGLE_CHOICE', label: 'Single Choice' },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
  { value: 'RATING', label: 'Rating' },
  { value: 'DATE', label: 'Date' },
  { value: 'FILE_UPLOAD', label: 'File Upload' },
  { value: 'YES_NO', label: 'Yes/No' }
];

// Type definitions
type QuestionType = 
  | 'SHORT_TEXT'
  | 'LONG_TEXT'
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'RATING'
  | 'DATE'
  | 'FILE_UPLOAD'
  | 'YES_NO';

interface QuestionOption {
  id?: string;
  value: string;
  label: string;
}

interface QuestionMetadata {
  minRating?: number;
  maxRating?: number;
  allowedFileTypes?: string[];
  maxFileSize?: number;
}

interface Question {
  id: string;
  text: string;
  description: string | null;
  type: QuestionType;
  isRequired: boolean;
  order: number;
  options: QuestionOption[];
  metadata: QuestionMetadata;
}

interface Questionnaire {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  requiresApproval: boolean;
  questions: Question[];
}

export default function QuestionnaireEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === 'new';
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [questionnaire, setQuestionnaire] = useState<Questionnaire>({
    id: isNew ? 'new' : id,
    title: '',
    description: '',
    isActive: true,
    requiresApproval: false,
    questions: []
  });

  // Load existing questionnaire if editing
  useEffect(() => {
    if (isNew) return;
    
    async function loadQuestionnaire() {
      try {
        // Replace with real API call once implemented
        // const response = await fetch(`/api/studio/questionnaires/${id}`);
        // const data = await response.json();
        
        // Mock data for now
        await new Promise(resolve => setTimeout(resolve, 500));
        const mockData: Questionnaire = {
          id,
          title: 'Casting Call Questionnaire',
          description: 'Additional information for our upcoming film project',
          isActive: true,
          requiresApproval: true,
          questions: [
            {
              id: '1',
              text: 'Do you have experience with action scenes?',
              description: 'Please describe any relevant experience with action, fight scenes, or stunts',
              type: 'YES_NO',
              isRequired: true,
              order: 1,
              options: [],
              metadata: {}
            },
            {
              id: '2',
              text: 'What is your availability for the shoot dates (May 15-30, 2025)?',
              description: null,
              type: 'LONG_TEXT',
              isRequired: true,
              order: 2,
              options: [],
              metadata: {}
            },
            {
              id: '3',
              text: 'Rate your comfort level with water scenes',
              description: 'Several scenes will involve shooting in and around water',
              type: 'RATING',
              isRequired: true,
              order: 3,
              options: [],
              metadata: {
                minRating: 1,
                maxRating: 5
              }
            },
            {
              id: '4',
              text: 'Which of these special skills do you possess?',
              description: null,
              type: 'MULTIPLE_CHOICE',
              isRequired: false,
              order: 4,
              options: [
                { id: '1', value: 'swimming', label: 'Swimming/Diving' },
                { id: '2', value: 'martial-arts', label: 'Martial Arts' },
                { id: '3', value: 'driving', label: 'Stunt Driving' },
                { id: '4', value: 'horseback', label: 'Horseback Riding' },
                { id: '5', value: 'language', label: 'Additional Language Fluency' }
              ],
              metadata: {}
            }
          ]
        };
        
        setQuestionnaire(mockData);
        setLoading(false);
      } catch (err) {
        console.error('Error loading questionnaire:', err);
        setError('Failed to load questionnaire');
        setLoading(false);
      }
    }
    
    loadQuestionnaire();
  }, [id, isNew]);
  
  // Basic form input handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setQuestionnaire(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Checkbox handlers
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setQuestionnaire(prev => ({
      ...prev,
      [name]: checked
    }));
  };
  
  // Add a new question
  const addQuestion = () => {
    const newQuestion: Question = {
      id: `temp_${Date.now()}`,
      text: '',
      description: '',
      type: 'SHORT_TEXT',
      isRequired: false,
      order: questionnaire.questions.length + 1,
      options: [],
      metadata: {}
    };
    
    setQuestionnaire(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };
  
  // Update a question
  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    setQuestionnaire(prev => {
      const updatedQuestions = [...prev.questions];
      
      // If changing question type, reset options for choice questions
      if (field === 'type') {
        const newType = value as QuestionType;
        
        // Initialize options array for choice questions
        if (newType === 'SINGLE_CHOICE' || newType === 'MULTIPLE_CHOICE') {
          if (updatedQuestions[index].options.length === 0) {
            updatedQuestions[index].options = [
              { value: 'option1', label: 'Option 1' }
            ];
          }
        }
        
        // Initialize metadata for rating questions
        if (newType === 'RATING') {
          updatedQuestions[index].metadata = {
            minRating: 1,
            maxRating: 5
          };
        }
        
        // Initialize metadata for file upload
        if (newType === 'FILE_UPLOAD') {
          updatedQuestions[index].metadata = {
            allowedFileTypes: ['image/*', 'application/pdf'],
            maxFileSize: 5
          };
        }
      }
      
      updatedQuestions[index] = {
        ...updatedQuestions[index],
        [field]: value
      };
      
      return {
        ...prev,
        questions: updatedQuestions
      };
    });
  };
  
  // Update question metadata
  const updateQuestionMetadata = (index: number, field: keyof QuestionMetadata, value: any) => {
    setQuestionnaire(prev => {
      const updatedQuestions = [...prev.questions];
      updatedQuestions[index] = {
        ...updatedQuestions[index],
        metadata: {
          ...updatedQuestions[index].metadata,
          [field]: value
        }
      };
      
      return {
        ...prev,
        questions: updatedQuestions
      };
    });
  };
  
  // Add option to choice questions
  const addOption = (questionIndex: number) => {
    setQuestionnaire(prev => {
      const updatedQuestions = [...prev.questions];
      const optionCount = updatedQuestions[questionIndex].options.length;
      
      updatedQuestions[questionIndex].options.push({
        value: `option${optionCount + 1}`,
        label: `Option ${optionCount + 1}`
      });
      
      return {
        ...prev,
        questions: updatedQuestions
      };
    });
  };
  
  // Update option
  const updateOption = (questionIndex: number, optionIndex: number, field: keyof QuestionOption, value: string) => {
    setQuestionnaire(prev => {
      const updatedQuestions = [...prev.questions];
      updatedQuestions[questionIndex].options[optionIndex] = {
        ...updatedQuestions[questionIndex].options[optionIndex],
        [field]: value
      };
      
      return {
        ...prev,
        questions: updatedQuestions
      };
    });
  };
  
  // Remove option
  const removeOption = (questionIndex: number, optionIndex: number) => {
    setQuestionnaire(prev => {
      const updatedQuestions = [...prev.questions];
      updatedQuestions[questionIndex].options.splice(optionIndex, 1);
      
      return {
        ...prev,
        questions: updatedQuestions
      };
    });
  };
  
  // Remove question
  const removeQuestion = (index: number) => {
    setQuestionnaire(prev => {
      const updatedQuestions = [...prev.questions];
      updatedQuestions.splice(index, 1);
      
      // Reorder questions
      updatedQuestions.forEach((q, i) => {
        q.order = i + 1;
      });
      
      return {
        ...prev,
        questions: updatedQuestions
      };
    });
  };
  
  // Move question up or down
  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || 
        (direction === 'down' && index === questionnaire.questions.length - 1)) {
      return;
    }
    
    setQuestionnaire(prev => {
      const updatedQuestions = [...prev.questions];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      
      // Swap order values
      const temp = updatedQuestions[index].order;
      updatedQuestions[index].order = updatedQuestions[targetIndex].order;
      updatedQuestions[targetIndex].order = temp;
      
      // Swap positions in array
      [updatedQuestions[index], updatedQuestions[targetIndex]] = 
        [updatedQuestions[targetIndex], updatedQuestions[index]];
      
      return {
        ...prev,
        questions: updatedQuestions
      };
    });
  };
  
  // Form validation
  const validateForm = (): boolean => {
    if (!questionnaire.title.trim()) {
      setError('Questionnaire title is required');
      return false;
    }
    
    for (const question of questionnaire.questions) {
      if (!question.text.trim()) {
        setError('All questions must have text');
        return false;
      }
      
      if ((question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE') && 
          question.options.length < 2) {
        setError('Choice questions must have at least 2 options');
        return false;
      }
      
      for (const option of question.options) {
        if (!option.value.trim() || !option.label.trim()) {
          setError('All options must have a value and label');
          return false;
        }
      }
    }
    
    return true;
  };
  
  // Save questionnaire
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      // Replace with real API call once implemented
      // const url = isNew ? '/api/studio/questionnaires' : `/api/studio/questionnaires/${id}`;
      // const method = isNew ? 'POST' : 'PUT';
      // const response = await fetch(url, {
      //   method,
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(questionnaire),
      // });
      // const data = await response.json();
      
      // Mock successful save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redirect to questionnaires list
      router.push('/studio/questionnaires');
    } catch (err) {
      console.error('Error saving questionnaire:', err);
      setError('Failed to save questionnaire');
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-500">Loading questionnaire...</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {isNew ? 'Create New Questionnaire' : 'Edit Questionnaire'}
          </h1>
          {!isNew && !questionnaire.isActive && (
            <p className="mt-1 text-sm text-yellow-600">
              This questionnaire is currently inactive and cannot receive new responses.
            </p>
          )}
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/studio/questionnaires"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Questionnaires
          </Link>
        </div>
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
      
      <form onSubmit={handleSave} className="space-y-8">
        {/* Questionnaire Details */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Questionnaire Details</h3>
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-6">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  id="title"
                  required
                  className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={questionnaire.title}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="sm:col-span-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  name="description"
                  id="description"
                  rows={3}
                  className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={questionnaire.description || ''}
                  onChange={handleInputChange}
                />
                <p className="mt-2 text-sm text-gray-500">
                  A brief description of the questionnaire&apos;s purpose.
                </p>
              </div>
              
              <div className="sm:col-span-3">
                <div className="flex items-center">
                  <input
                    id="isActive"
                    name="isActive"
                    type="checkbox"
                    checked={questionnaire.isActive}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    Active
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Only active questionnaires can be sent to talents.
                </p>
              </div>
              
              <div className="sm:col-span-3">
                <div className="flex items-center">
                  <input
                    id="requiresApproval"
                    name="requiresApproval"
                    type="checkbox"
                    checked={questionnaire.requiresApproval}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="requiresApproval" className="ml-2 block text-sm text-gray-900">
                    Requires Approval
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Responses will require your review and approval before being considered complete.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Questions */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Questions</h3>
              <button
                type="button"
                onClick={addQuestion}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Add Question
              </button>
            </div>
            
            {questionnaire.questions.length === 0 ? (
              <div className="mt-6 text-center py-6 bg-gray-50 rounded-md">
                <p className="text-gray-500">
                  No questions yet. Click &quot;Add Question&quot; to start building your questionnaire.
                </p>
              </div>
            ) : (
              <ul className="mt-6 space-y-6">
                {questionnaire.questions.map((question, qIndex) => (
                  <li key={question.id} className="p-4 border border-gray-200 rounded-md">
                    <div className="flex justify-between items-start">
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full">
                        {question.order}
                      </div>
                      <div className="flex-1 ml-4">
                        <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-6 sm:gap-x-4">
                          <div className="sm:col-span-4">
                            <label htmlFor={`question-${qIndex}-text`} className="block text-sm font-medium text-gray-700">
                              Question Text <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              id={`question-${qIndex}-text`}
                              required
                              className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              value={question.text}
                              onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                            />
                          </div>
                          
                          <div className="sm:col-span-2">
                            <label htmlFor={`question-${qIndex}-type`} className="block text-sm font-medium text-gray-700">
                              Question Type
                            </label>
                            <select
                              id={`question-${qIndex}-type`}
                              className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              value={question.type}
                              onChange={(e) => updateQuestion(qIndex, 'type', e.target.value)}
                            >
                              {questionTypes.map(type => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div className="sm:col-span-6">
                            <label htmlFor={`question-${qIndex}-description`} className="block text-sm font-medium text-gray-700">
                              Help Text (Optional)
                            </label>
                            <input
                              type="text"
                              id={`question-${qIndex}-description`}
                              className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              value={question.description || ''}
                              onChange={(e) => updateQuestion(qIndex, 'description', e.target.value)}
                              placeholder="Additional guidance for answering this question"
                            />
                          </div>
                          
                          <div className="sm:col-span-6">
                            <div className="flex items-center">
                              <input
                                id={`question-${qIndex}-required`}
                                type="checkbox"
                                checked={question.isRequired}
                                onChange={(e) => updateQuestion(qIndex, 'isRequired', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <label htmlFor={`question-${qIndex}-required`} className="ml-2 block text-sm text-gray-900">
                                Required
                              </label>
                            </div>
                          </div>
                          
                          {/* Question type specific settings */}
                          {(question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE') && (
                            <div className="sm:col-span-6 space-y-3">
                              <div className="flex justify-between items-center">
                                <h4 className="text-sm font-medium text-gray-700">Options</h4>
                                <button
                                  type="button"
                                  onClick={() => addOption(qIndex)}
                                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                  Add Option
                                </button>
                              </div>
                              
                              <div className="space-y-2">
                                {question.options.map((option, oIndex) => (
                                  <div key={oIndex} className="flex space-x-2">
                                    <input
                                      type="text"
                                      placeholder="Display Text"
                                      className="flex-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                      value={option.label}
                                      onChange={(e) => updateOption(qIndex, oIndex, 'label', e.target.value)}
                                    />
                                    <input
                                      type="text"
                                      placeholder="Value"
                                      className="w-1/3 shadow-sm focus:ring-blue-500 focus:border-blue-500 block sm:text-sm border-gray-300 rounded-md"
                                      value={option.value}
                                      onChange={(e) => updateOption(qIndex, oIndex, 'value', e.target.value)}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeOption(qIndex, oIndex)}
                                      className="inline-flex items-center p-1.5 border border-transparent rounded-full text-red-500 hover:bg-red-50"
                                      disabled={question.options.length <= 1}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                      </svg>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {question.type === 'RATING' && (
                            <div className="sm:col-span-6 grid grid-cols-2 gap-4">
                              <div>
                                <label htmlFor={`question-${qIndex}-min-rating`} className="block text-sm font-medium text-gray-700">
                                  Minimum Rating
                                </label>
                                <input
                                  type="number"
                                  id={`question-${qIndex}-min-rating`}
                                  className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                  value={question.metadata.minRating || 1}
                                  onChange={(e) => updateQuestionMetadata(qIndex, 'minRating', parseInt(e.target.value))}
                                  min="1"
                                  max="10"
                                />
                              </div>
                              <div>
                                <label htmlFor={`question-${qIndex}-max-rating`} className="block text-sm font-medium text-gray-700">
                                  Maximum Rating
                                </label>
                                <input
                                  type="number"
                                  id={`question-${qIndex}-max-rating`}
                                  className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                  value={question.metadata.maxRating || 5}
                                  onChange={(e) => updateQuestionMetadata(qIndex, 'maxRating', parseInt(e.target.value))}
                                  min="2"
                                  max="10"
                                />
                              </div>
                            </div>
                          )}
                          
                          {question.type === 'FILE_UPLOAD' && (
                            <div className="sm:col-span-6 grid grid-cols-2 gap-4">
                              <div>
                                <label htmlFor={`question-${qIndex}-file-types`} className="block text-sm font-medium text-gray-700">
                                  Allowed File Types
                                </label>
                                <input
                                  type="text"
                                  id={`question-${qIndex}-file-types`}
                                  className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                  value={(question.metadata.allowedFileTypes || []).join(', ')}
                                  onChange={(e) => updateQuestionMetadata(qIndex, 'allowedFileTypes', e.target.value.split(',').map(t => t.trim()))}
                                  placeholder="e.g. image/*, application/pdf"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                  Comma-separated MIME types (e.g., &quot;image/jpeg, application/pdf&quot;)
                                </p>
                              </div>
                              <div>
                                <label htmlFor={`question-${qIndex}-max-filesize`} className="block text-sm font-medium text-gray-700">
                                  Max File Size (MB)
                                </label>
                                <input
                                  type="number"
                                  id={`question-${qIndex}-max-filesize`}
                                  className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                  value={question.metadata.maxFileSize || 5}
                                  onChange={(e) => updateQuestionMetadata(qIndex, 'maxFileSize', parseInt(e.target.value))}
                                  min="1"
                                  max="20"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0 flex flex-col space-y-2">
                        <button
                          type="button"
                          onClick={() => moveQuestion(qIndex, 'up')}
                          disabled={qIndex === 0}
                          className={`p-1 rounded text-gray-400 hover:text-gray-600 ${qIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => moveQuestion(qIndex, 'down')}
                          disabled={qIndex === questionnaire.questions.length - 1}
                          className={`p-1 rounded text-gray-400 hover:text-gray-600 ${qIndex === questionnaire.questions.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeQuestion(qIndex)}
                          className="p-1 rounded text-red-400 hover:text-red-600"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        {/* Form actions */}
        <div className="flex justify-end">
          <Link
            href="/studio/questionnaires"
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-3"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
          >
            {saving ? 'Saving...' : 'Save Questionnaire'}
          </button>
        </div>
      </form>
    </div>
  );
}