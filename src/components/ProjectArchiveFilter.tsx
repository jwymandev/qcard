'use client';

import React, { useState } from 'react';

interface ProjectArchiveFilterProps {
  showArchived: boolean;
  onToggle: (showArchived: boolean) => void;
}

export default function ProjectArchiveFilter({ showArchived, onToggle }: ProjectArchiveFilterProps) {
  return (
    <div className="flex items-center space-x-2 mb-4">
      <label className="inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="form-checkbox h-5 w-5 text-blue-600"
          checked={showArchived}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <span className="ml-2 text-gray-700">Show Archived Projects</span>
      </label>
    </div>
  );
}