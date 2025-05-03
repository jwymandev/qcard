'use client';

import React, { useState } from 'react';

interface ProjectArchiveButtonProps {
  projectId: string;
  isArchived: boolean;
  onArchiveToggle?: (isArchived: boolean) => void;
}

export default function ProjectArchiveButton({ 
  projectId, 
  isArchived, 
  onArchiveToggle 
}: ProjectArchiveButtonProps) {
  const [loading, setLoading] = useState(false);
  const [currentArchiveState, setCurrentArchiveState] = useState(isArchived);
  const [error, setError] = useState<string | null>(null);

  const toggleArchive = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/studio/projects/${projectId}/archive`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          archive: !currentArchiveState,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update project archive status');
      }
      
      const result = await response.json();
      
      // Update local state
      setCurrentArchiveState(!currentArchiveState);
      
      // Notify parent component if callback provided
      if (onArchiveToggle) {
        onArchiveToggle(!currentArchiveState);
      }
    } catch (error) {
      console.error('Error toggling project archive status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={toggleArchive}
        disabled={loading}
        className={`px-4 py-2 rounded-md text-white ${
          currentArchiveState
            ? 'bg-green-600 hover:bg-green-700' // Unarchive button
            : 'bg-amber-600 hover:bg-amber-700' // Archive button
        } transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center`}
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </>
        ) : currentArchiveState ? (
          'Unarchive Project'
        ) : (
          'Archive Project'
        )}
      </button>
      
      {error && (
        <div className="mt-2 text-red-500 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}