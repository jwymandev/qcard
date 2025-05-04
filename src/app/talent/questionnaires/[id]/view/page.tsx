'use client';

import React, { useState, useEffect } from 'react';
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

type QuestionAnswer = {
  questionId: string;
  textValue: string | null;
  choiceValues: string[] | null;
  fileUrl: string | null;
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
  completedAt: string | null;
};

type QuestionnaireResponse = {
  id: string;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
  answers: QuestionAnswer[];
};

type QuestionnaireData = {
  id: string;
  title: string;
  description: string | null;
  questions: QuestionnaireQuestion[];
  invitation: QuestionnaireInvitation;
  response: QuestionnaireResponse;
};

export default function TalentQuestionnaireViewPage({ params }: { params: { id: string } }) {
  const invitationId = params.id;
  
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load questionnaire and response data
  useEffect(() => {
    async function loadQuestionnaireData() {
      try {
        const response = await fetch(`/api/talent/questionnaires/invitations/${invitationId}/response`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch questionnaire response: ${response.status}`);
        }
        
        const data = await response.json();
        setQuestionnaire(data);
        setLoading(false);
      } catch (err) {
        console.error('Error loading questionnaire response:', err);
        setError('Failed to load questionnaire response data');
        setLoading(false);
      }
    }
    
    loadQuestionnaireData();
  }, [invitationId]);
  
  // Get answer for a specific question
  const getAnswerForQuestion = (questionId: string): QuestionAnswer | undefined => {
    return questionnaire?.response.answers.find(answer => answer.questionId === questionId);
  };
  
  // Format answer display based on question type
  const formatAnswerDisplay = (question: QuestionnaireQuestion, answer?: QuestionAnswer) => {
    if (!answer) return 'No answer provided';
    
    switch (question.type) {
      case 'SHORT_TEXT':
      case 'LONG_TEXT':
        return answer.textValue || 'No answer provided';
        
      case 'SINGLE_CHOICE':
        return answer.choiceValues && answer.choiceValues.length > 0
          ? answer.choiceValues[0]
          : 'No selection made';
          
      case 'MULTIPLE_CHOICE':
        return answer.choiceValues && answer.choiceValues.length > 0
          ? answer.choiceValues.join(', ')
          : 'No selections made';
          
      case 'RATING':
        if (!answer.textValue) return 'No rating provided';
        return (
          <div className="flex items-center">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-800 font-medium">
              {answer.textValue}
            </span>
            <span className="ml-2 text-sm text-gray-500">
              out of {question.metadata?.max || 5}
            </span>
          </div>
        );
        
      case 'DATE':
        return answer.textValue
          ? new Date(answer.textValue).toLocaleDateString()
          : 'No date provided';
          
      case 'FILE_UPLOAD':
        return answer.fileUrl ? (
          <div className="flex items-center">
            <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="ml-2 text-sm text-gray-900">
              {answer.fileUrl.split('/').pop()}
            </span>
          </div>
        ) : 'No file uploaded';
        
      case 'YES_NO':
        return answer.textValue || 'No answer provided';
        
      default:
        return 'Unsupported answer type';
    }
  };
  
  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-500">Loading response data...</span>
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
            <p>{error || 'Failed to load questionnaire response'}</p>
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
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {questionnaire.title}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            From: {questionnaire.invitation.studioName}
          </p>
          <div className="mt-2 flex items-center">
            <span className="text-sm text-gray-500">
              Submitted: {new Date(questionnaire.response.submittedAt).toLocaleDateString()}
            </span>
            <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(questionnaire.response.status)}`}>
              {questionnaire.response.status}
            </span>
          </div>
        </div>
        <div>
          <Link
            href="/talent/questionnaires"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to All Questionnaires
          </Link>
        </div>
      </div>
      
      {questionnaire.description && (
        <div className="bg-gray-50 px-4 py-5 sm:rounded-lg sm:p-6">
          <div className="text-sm text-gray-700">
            {questionnaire.description}
          </div>
        </div>
      )}
      
      {questionnaire.response.reviewNotes && (
        <div className="bg-blue-50 px-4 py-5 sm:rounded-lg sm:p-6">
          <h3 className="text-lg font-medium text-blue-800">Feedback from {questionnaire.invitation.studioName}</h3>
          <div className="mt-2 text-sm text-blue-700">
            <p>{questionnaire.response.reviewNotes}</p>
          </div>
          {questionnaire.response.reviewedAt && (
            <div className="mt-2 text-xs text-blue-500">
              Reviewed on {new Date(questionnaire.response.reviewedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      )}
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Your Responses
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Review the answers you provided to this questionnaire.
          </p>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            {questionnaire.questions.map((question, index) => {
              const answer = getAnswerForQuestion(question.id);
              return (
                <div 
                  key={question.id}
                  className={`${
                    index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                  } px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6`}
                >
                  <dt className="text-sm font-medium text-gray-500">
                    {question.text}
                    {question.isRequired && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                    {question.description && (
                      <p className="mt-1 text-xs font-normal text-gray-500">
                        {question.description}
                      </p>
                    )}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {formatAnswerDisplay(question, answer)}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>
    </div>
  );
}