import React, { useState } from 'react';
import { Button, Alert, AlertTitle, AlertDescription } from '@/components/ui';

type ProjectInvitationProps = {
  invitation: {
    id: string;
    status: string;
    project: {
      id: string;
      title: string;
      description?: string;
      Studio?: {
        name: string;
      };
    };
  };
  onAccept: () => void;
  onDecline: () => void;
};

export default function ProjectInvitationBanner({ invitation, onAccept, onDecline }: ProjectInvitationProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  if (!invitation) return null;
  
  // Render different UI based on invitation status
  if (invitation.status === 'PENDING') {
    return (
      <div className="mb-6 border rounded-lg p-4 bg-yellow-50 border-yellow-200">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <h3 className="font-bold text-lg text-yellow-800">Project Invitation</h3>
            <p className="text-yellow-700 mb-2">
              You have been invited to join this project by {invitation.project.Studio?.name || "a studio"}.
            </p>
            <p className="text-sm text-yellow-600">
              Please accept or decline this invitation.
            </p>
          </div>
          <div className="flex space-x-3">
            <Button 
              onClick={() => {
                setLoading(true);
                setError(null);
                onAccept();
              }}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Processing...' : 'Accept'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setLoading(true);
                setError(null);
                onDecline();
              }}
              disabled={loading}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              Decline
            </Button>
          </div>
        </div>
        
        {error && (
          <Alert variant="destructive" className="mt-3">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  }
  
  if (invitation.status === 'ACCEPTED') {
    return (
      <div className="mb-6 border rounded-lg p-4 bg-green-50 border-green-200">
        <h3 className="font-bold text-lg text-green-800">You Have Joined This Project</h3>
        <p className="text-green-700">
          You have accepted the invitation to join this project.
        </p>
      </div>
    );
  }
  
  if (invitation.status === 'DECLINED') {
    return (
      <div className="mb-6 border rounded-lg p-4 bg-gray-50 border-gray-200">
        <h3 className="font-bold text-lg text-gray-800">Invitation Declined</h3>
        <p className="text-gray-700">
          You have declined the invitation to join this project.
        </p>
      </div>
    );
  }
  
  return null;
}