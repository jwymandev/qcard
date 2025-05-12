'use client';

import React from 'react';
import { Card, Badge } from '@/components/ui';
import { SurveyFieldType } from './SurveyFieldBuilder';

interface CastingSubmissionSurveyDisplayProps {
  surveyResponses: any;
  surveyFields: any;
}

export default function CastingSubmissionSurveyDisplay({
  surveyResponses,
  surveyFields,
}: CastingSubmissionSurveyDisplayProps) {
  // If no survey responses or fields, return nothing
  if (!surveyResponses || !surveyFields?.fields?.length) {
    return null;
  }

  // Helper to find the field definition by ID
  const getFieldDefinition = (fieldId: string) => {
    return surveyFields.fields.find((field: any) => field.id === fieldId);
  };

  // Helper to format field value based on its type
  const formatFieldValue = (fieldId: string, value: any) => {
    const field = getFieldDefinition(fieldId);
    
    if (!field) {
      return String(value);
    }
    
    switch (field.type) {
      case SurveyFieldType.CHECKBOX:
        return value === true ? 'Yes' : 'No';
        
      case SurveyFieldType.DROPDOWN:
      case SurveyFieldType.RADIO:
        if (field.options) {
          const option = field.options.find((opt: any) => opt.value === value);
          return option ? option.label : value;
        }
        return value;
        
      default:
        return String(value || 'N/A');
    }
  };

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Survey Responses</h3>
      
      <div className="space-y-4">
        {Object.entries(surveyResponses).map(([fieldId, value]) => {
          const field = getFieldDefinition(fieldId);
          
          if (!field) return null;
          
          return (
            <div key={fieldId} className="border-b pb-3">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium">{field.label}</h4>
                {field.required && (
                  <Badge className="text-xs bg-gray-100 text-gray-800">Required</Badge>
                )}
              </div>
              
              {field.description && (
                <p className="text-xs text-muted-foreground mb-1">{field.description}</p>
              )}
              
              <div className="mt-1">
                {field.type === SurveyFieldType.TEXTAREA ? (
                  <p className="whitespace-pre-wrap text-sm bg-gray-50 p-2 rounded">
                    {formatFieldValue(fieldId, value)}
                  </p>
                ) : (
                  <p className="font-medium">
                    {formatFieldValue(fieldId, value)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Check for unanswered questions */}
        {surveyFields.fields.some((field: any) => 
          !Object.keys(surveyResponses).includes(field.id)
        ) && (
          <div className="mt-4 text-sm text-muted-foreground">
            <p>Some questions were not answered.</p>
          </div>
        )}
      </div>
    </Card>
  );
}