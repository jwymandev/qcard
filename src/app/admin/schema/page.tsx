'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Field type definition
type FieldType = 
  | 'TEXT' 
  | 'TEXTAREA' 
  | 'NUMBER' 
  | 'DROPDOWN' 
  | 'BOOLEAN' 
  | 'DATE' 
  | 'EMAIL' 
  | 'URL' 
  | 'PHONE';

// Profile type definition
type ProfileType = 'TALENT' | 'STUDIO' | 'BOTH';

// Field definition interface
interface ProfileField {
  id: string;
  name: string;
  label: string;
  description?: string;
  type: FieldType;
  profileType: ProfileType;
  isRequired: boolean;
  isVisible: boolean;
  defaultValue?: string;
  placeholder?: string;
  order: number;
  isSystem: boolean;
  groupName?: string;
  options?: FieldOption[];
  validationRules?: string;
  createdAt: string;
  updatedAt: string;
}

// Option interface for dropdown fields
interface FieldOption {
  id: string;
  value: string;
  label: string;
  color?: string;
  order: number;
  isDefault: boolean;
}

export default function SchemaManagementPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'TALENT' | 'STUDIO'>('TALENT');
  const [fields, setFields] = useState<ProfileField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState<string | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<FieldType | 'all'>('all');
  const [groups, setGroups] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Load fields on component mount and tab change
  useEffect(() => {
    fetchFields();
  }, [activeTab]);

  // Extract unique groups when fields change
  useEffect(() => {
    if (fields.length > 0) {
      const uniqueGroups = Array.from(
        new Set(
          fields
            .filter(field => field.groupName)
            .map(field => field.groupName as string)
        )
      ).sort();
      setGroups(uniqueGroups);
    }
  }, [fields]);

  // Fetch fields from the API
  const fetchFields = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // This will be implemented when we add the API
      // const response = await fetch(`/api/admin/schema?profileType=${activeTab}`);
      
      // For now, use mock data
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      
      // Sample mock data
      const mockFields: ProfileField[] = [
        {
          id: '1',
          name: 'bio',
          label: 'Biography',
          description: 'Personal biography or description',
          type: 'TEXTAREA',
          profileType: 'TALENT',
          isRequired: false,
          isVisible: true,
          placeholder: 'Tell us about yourself...',
          order: 1,
          isSystem: true,
          groupName: 'Basic Information',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'height',
          label: 'Height',
          type: 'TEXT',
          profileType: 'TALENT',
          isRequired: false,
          isVisible: true,
          placeholder: 'e.g. 5\'10"',
          order: 2,
          isSystem: true,
          groupName: 'Physical Attributes',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '3',
          name: 'hairColor',
          label: 'Hair Color',
          type: 'DROPDOWN',
          profileType: 'TALENT',
          isRequired: false,
          isVisible: true,
          order: 3,
          isSystem: true,
          groupName: 'Physical Attributes',
          options: [
            { id: '1', value: 'black', label: 'Black', order: 1, isDefault: false },
            { id: '2', value: 'brown', label: 'Brown', order: 2, isDefault: true },
            { id: '3', value: 'blonde', label: 'Blonde', order: 3, isDefault: false },
            { id: '4', value: 'red', label: 'Red', order: 4, isDefault: false },
            { id: '5', value: 'other', label: 'Other', order: 5, isDefault: false },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '4',
          name: 'name',
          label: 'Studio Name',
          type: 'TEXT',
          profileType: 'STUDIO',
          isRequired: true,
          isVisible: true,
          order: 1,
          isSystem: true,
          groupName: 'Basic Information',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '5',
          name: 'description',
          label: 'Studio Description',
          type: 'TEXTAREA',
          profileType: 'STUDIO',
          isRequired: false,
          isVisible: true,
          order: 2,
          isSystem: true,
          groupName: 'Basic Information',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      
      // Filter based on the active tab
      const filteredFields = mockFields.filter(
        field => field.profileType === activeTab || field.profileType === 'BOTH'
      );
      
      setFields(filteredFields);
    } catch (error) {
      console.error('Error fetching fields:', error);
      setError('Failed to load field definitions');
    } finally {
      setLoading(false);
    }
  };

  // Handle field reordering
  const handleMoveField = async (fieldId: string, direction: 'up' | 'down') => {
    // Find the field to move
    const fieldIndex = fields.findIndex(f => f.id === fieldId);
    if (fieldIndex === -1) return;
    
    // Get current field and its order value
    const field = fields[fieldIndex];
    
    // Find adjacent field
    const adjacentIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
    
    // Ensure adjacent field exists
    if (adjacentIndex < 0 || adjacentIndex >= fields.length) return;
    
    const adjacentField = fields[adjacentIndex];
    
    // Swap order values
    const updatedFields = [...fields];
    const tempOrder = field.order;
    updatedFields[fieldIndex] = {...field, order: adjacentField.order};
    updatedFields[adjacentIndex] = {...adjacentField, order: tempOrder};
    
    // Sort by order
    updatedFields.sort((a, b) => a.order - b.order);
    
    // Update state
    setFields(updatedFields);
    
    // Save changes to API (to be implemented)
    try {
      // await fetch(`/api/admin/schema/reorder`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     field1: { id: field.id, order: adjacentField.order },
      //     field2: { id: adjacentField.id, order: field.order }
      //   }),
      // });
      
      // For now, just simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      setStatusMessage({
        type: 'success',
        message: 'Field order updated successfully'
      });
      
      // Auto-hide message after 3 seconds
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      console.error('Error updating field order:', error);
      setStatusMessage({
        type: 'error',
        message: 'Failed to update field order'
      });
    }
  };

  // Handle field visibility toggle
  const handleToggleVisibility = async (fieldId: string) => {
    // Find the field
    const fieldIndex = fields.findIndex(f => f.id === fieldId);
    if (fieldIndex === -1) return;
    
    // Get current field
    const field = fields[fieldIndex];
    
    // Update state optimistically
    const updatedFields = [...fields];
    updatedFields[fieldIndex] = {...field, isVisible: !field.isVisible};
    setFields(updatedFields);
    
    // Save changes to API (to be implemented)
    try {
      // await fetch(`/api/admin/schema/field/${fieldId}`, {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ isVisible: !field.isVisible }),
      // });
      
      // For now, just simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      setStatusMessage({
        type: 'success',
        message: `Field ${!field.isVisible ? 'shown' : 'hidden'} successfully`
      });
      
      // Auto-hide message after 3 seconds
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      console.error('Error updating field visibility:', error);
      
      // Revert state on error
      const revertedFields = [...fields];
      setFields(revertedFields);
      
      setStatusMessage({
        type: 'error',
        message: 'Failed to update field visibility'
      });
    }
  };

  // Filter fields based on search, group, and type
  const filteredFields = fields.filter(field => {
    const matchesSearch = field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         field.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = groupFilter === 'all' || field.groupName === groupFilter;
    const matchesType = typeFilter === 'all' || field.type === typeFilter;
    
    return matchesSearch && matchesGroup && matchesType;
  });

  // Sort fields by order
  const sortedFields = [...filteredFields].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Profile Schema Management</h1>
        <Link
          href="/admin/schema/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Add New Field
        </Link>
      </div>
      
      {statusMessage && (
        <div className={`p-4 rounded-md ${statusMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {statusMessage.message}
        </div>
      )}
      
      {/* Tabs for Talent/Studio */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('TALENT')}
            className={`${
              activeTab === 'TALENT'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Talent Profile Fields
          </button>
          <button
            onClick={() => setActiveTab('STUDIO')}
            className={`${
              activeTab === 'STUDIO'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Studio Profile Fields
          </button>
        </nav>
      </div>
      
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700">Search</label>
          <input
            type="text"
            id="search"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Search fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div>
          <label htmlFor="groupFilter" className="block text-sm font-medium text-gray-700">Group</label>
          <select
            id="groupFilter"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value === 'all' ? 'all' : e.target.value)}
          >
            <option value="all">All Groups</option>
            {groups.map(group => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="typeFilter" className="block text-sm font-medium text-gray-700">Field Type</label>
          <select
            id="typeFilter"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value === 'all' ? 'all' : e.target.value as FieldType)}
          >
            <option value="all">All Types</option>
            <option value="TEXT">Text</option>
            <option value="TEXTAREA">Text Area</option>
            <option value="NUMBER">Number</option>
            <option value="DROPDOWN">Dropdown</option>
            <option value="BOOLEAN">Boolean</option>
            <option value="DATE">Date</option>
            <option value="EMAIL">Email</option>
            <option value="URL">URL</option>
            <option value="PHONE">Phone</option>
          </select>
        </div>
      </div>
      
      {/* Fields Table */}
      <div className="bg-white shadow overflow-hidden rounded-md">
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading fields...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-500">
            {error}
          </div>
        ) : sortedFields.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No fields found. {searchTerm || groupFilter !== 'all' || typeFilter !== 'all' ? 'Try adjusting your filters.' : ''}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Field
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Group
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Required
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visible
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Options
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedFields.map((field, index) => (
                <tr key={field.id} className={field.isSystem ? 'bg-gray-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <span>{field.order}</span>
                      <div className="flex flex-col">
                        <button
                          onClick={() => handleMoveField(field.id, 'up')}
                          disabled={index === 0}
                          className={`text-gray-400 hover:text-gray-600 ${index === 0 ? 'cursor-not-allowed opacity-50' : ''}`}
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => handleMoveField(field.id, 'down')}
                          disabled={index === sortedFields.length - 1}
                          className={`text-gray-400 hover:text-gray-600 ${index === sortedFields.length - 1 ? 'cursor-not-allowed opacity-50' : ''}`}
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{field.label}</div>
                    <div className="text-sm text-gray-500">{field.name}</div>
                    {field.description && (
                      <div className="text-xs text-gray-400 italic">{field.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {field.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {field.groupName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {field.isRequired ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Required
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Optional
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button 
                      onClick={() => handleToggleVisibility(field.id)}
                      className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none ${field.isVisible ? 'bg-blue-600' : 'bg-gray-200'}`}
                    >
                      <span
                        className={`${field.isVisible ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                      />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {field.type === 'DROPDOWN' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {field.options?.length || 0} options
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/admin/schema/${field.id}`}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </Link>
                    {!field.isSystem && (
                      <button
                        onClick={() => {
                          // Handle field deletion (to be implemented)
                          if (confirm(`Are you sure you want to delete the "${field.label}" field?`)) {
                            // Delete logic here
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}