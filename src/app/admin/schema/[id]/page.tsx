'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

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

// Validation rule interface
interface ValidationRule {
  type: 'min' | 'max' | 'pattern' | 'custom';
  value: string | number;
  message: string;
}

// Field option interface
interface FieldOption {
  id: string;
  value: string;
  label: string;
  color?: string;
  order: number;
  isDefault: boolean;
}

// Form data interface
interface FieldFormData {
  name: string;
  label: string;
  description: string;
  type: FieldType;
  profileType: ProfileType;
  isRequired: boolean;
  isVisible: boolean;
  defaultValue: string;
  placeholder: string;
  groupName: string;
  validationRules: ValidationRule[];
  options: FieldOption[];
}

export default function EditFieldPage() {
  const router = useRouter();
  const params = useParams();
  const fieldId = params.id as string;
  const isNewField = fieldId === 'new';
  
  const [loading, setLoading] = useState(!isNewField);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSystem, setIsSystem] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<FieldFormData>({
    name: '',
    label: '',
    description: '',
    type: 'TEXT',
    profileType: 'TALENT',
    isRequired: false,
    isVisible: true,
    defaultValue: '',
    placeholder: '',
    groupName: 'Basic Information',
    validationRules: [],
    options: [],
  });
  
  // Common groups for dropdown
  const commonGroups = [
    'Basic Information',
    'Contact Information',
    'Physical Attributes',
    'Professional Details',
    'Preferences',
    'Qualifications',
    'Other'
  ];
  
  // Fetch field data on component mount if editing existing field
  useEffect(() => {
    if (!isNewField) {
      fetchFieldData();
    }
  }, [fieldId]);
  
  // Fetch field data
  const fetchFieldData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // This will be implemented when we add the API
      // const response = await fetch(`/api/admin/schema/field/${fieldId}`);
      
      // For now, use mock data
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      
      // Find the field with the matching id (using the mock data for now)
      let fieldData: any = null;
      
      if (fieldId === '1') {
        fieldData = {
          id: '1',
          name: 'bio',
          label: 'Biography',
          description: 'Personal biography or description',
          type: 'TEXTAREA',
          profileType: 'TALENT',
          isRequired: false,
          isVisible: true,
          defaultValue: '',
          placeholder: 'Tell us about yourself...',
          order: 1,
          isSystem: true,
          groupName: 'Basic Information',
          validationRules: [],
          options: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      } else if (fieldId === '3') {
        fieldData = {
          id: '3',
          name: 'hairColor',
          label: 'Hair Color',
          description: '',
          type: 'DROPDOWN',
          profileType: 'TALENT',
          isRequired: false,
          isVisible: true,
          defaultValue: 'brown',
          placeholder: '',
          order: 3,
          isSystem: true,
          groupName: 'Physical Attributes',
          validationRules: [],
          options: [
            { id: '1', value: 'black', label: 'Black', order: 1, isDefault: false },
            { id: '2', value: 'brown', label: 'Brown', order: 2, isDefault: true },
            { id: '3', value: 'blonde', label: 'Blonde', order: 3, isDefault: false },
            { id: '4', value: 'red', label: 'Red', order: 4, isDefault: false },
            { id: '5', value: 'other', label: 'Other', order: 5, isDefault: false },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      
      if (!fieldData) {
        throw new Error('Field not found');
      }
      
      // Set form data
      setFormData({
        name: fieldData.name,
        label: fieldData.label,
        description: fieldData.description || '',
        type: fieldData.type,
        profileType: fieldData.profileType,
        isRequired: fieldData.isRequired,
        isVisible: fieldData.isVisible,
        defaultValue: fieldData.defaultValue || '',
        placeholder: fieldData.placeholder || '',
        groupName: fieldData.groupName || '',
        validationRules: fieldData.validationRules || [],
        options: fieldData.options || [],
      });
      
      // Set system field flag
      setIsSystem(fieldData.isSystem);
    } catch (error) {
      console.error('Error fetching field data:', error);
      setError('Failed to load field data');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };
  
  // Handle checkbox changes
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: checked,
    }));
  };
  
  // Add new option
  const handleAddOption = () => {
    const newOption: FieldOption = {
      id: `temp_${Date.now()}`, // Temporary ID until saved
      value: '',
      label: '',
      order: formData.options.length + 1,
      isDefault: false,
    };
    
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, newOption],
    }));
  };
  
  // Update option
  const handleOptionChange = (optionId: string, field: keyof FieldOption, value: any) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map(option => 
        option.id === optionId 
          ? { ...option, [field]: field === 'isDefault' ? value : value }
          : field === 'isDefault' && value === true
            ? { ...option, isDefault: false } // Ensure only one default
            : option
      ),
    }));
  };
  
  // Remove option
  const handleRemoveOption = (optionId: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter(option => option.id !== optionId),
    }));
  };
  
  // Add validation rule
  const handleAddValidationRule = () => {
    const newRule: ValidationRule = {
      type: 'min',
      value: '',
      message: '',
    };
    
    setFormData(prev => ({
      ...prev,
      validationRules: [...prev.validationRules, newRule],
    }));
  };
  
  // Update validation rule
  const handleValidationRuleChange = (index: number, field: keyof ValidationRule, value: any) => {
    setFormData(prev => ({
      ...prev,
      validationRules: prev.validationRules.map((rule, i) => 
        i === index ? { ...rule, [field]: value } : rule
      ),
    }));
  };
  
  // Remove validation rule
  const handleRemoveValidationRule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      validationRules: prev.validationRules.filter((_, i) => i !== index),
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      // Validate form data
      if (!formData.name.trim()) {
        throw new Error('Field name is required');
      }
      
      if (!formData.label.trim()) {
        throw new Error('Field label is required');
      }
      
      // Ensure name is a valid identifier (alphanumeric, no spaces, underscores allowed)
      if (!/^[a-zA-Z0-9_]+$/.test(formData.name)) {
        throw new Error('Field name must contain only letters, numbers, and underscores');
      }
      
      // For dropdown fields, ensure there are options
      if (formData.type === 'DROPDOWN' && formData.options.length === 0) {
        throw new Error('Dropdown fields must have at least one option');
      }
      
      // For dropdown fields, ensure all options have values and labels
      if (formData.type === 'DROPDOWN') {
        for (const option of formData.options) {
          if (!option.value.trim() || !option.label.trim()) {
            throw new Error('All dropdown options must have a value and a label');
          }
        }
      }
      
      // Prepare data for API
      const apiData = {
        ...formData,
        // Convert validation rules to JSON string
        validationRules: formData.validationRules.length > 0 
          ? JSON.stringify(formData.validationRules) 
          : null,
      };
      
      // API call (to be implemented)
      // const url = isNewField 
      //   ? '/api/admin/schema/field' 
      //   : `/api/admin/schema/field/${fieldId}`;
      // const method = isNewField ? 'POST' : 'PUT';
      // const response = await fetch(url, {
      //   method,
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(apiData),
      // });
      
      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Navigate back to schema management page
      router.push('/admin/schema');
    } catch (error) {
      console.error('Error saving field:', error);
      setError(error instanceof Error ? error.message : 'Failed to save field');
    } finally {
      setSaving(false);
    }
  };
  
  // Generate suggested name from label
  const generateSuggestedName = (label: string) => {
    if (!label) return '';
    
    // Convert to camelCase
    return label
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .trim()
      .split(/\s+/)
      .map((word, index) => 
        index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join('');
  };
  
  // Suggest name when label changes
  useEffect(() => {
    if (isNewField && formData.label && !formData.name) {
      setFormData(prev => ({
        ...prev,
        name: generateSuggestedName(prev.label),
      }));
    }
  }, [formData.label, isNewField]);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-500">Loading field data...</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {isNewField ? 'Add New Field' : `Edit Field: ${formData.label || formData.name}`}
          </h1>
          {isSystem && (
            <p className="mt-1 text-sm text-yellow-600">
              This is a system field. Some properties cannot be changed.
            </p>
          )}
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/admin/schema"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Schema
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
      
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              {/* Field identity */}
              <div className="sm:col-span-3">
                <label htmlFor="label" className="block text-sm font-medium text-gray-700">
                  Field Label <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="label"
                    id="label"
                    value={formData.label}
                    onChange={handleInputChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    required
                    disabled={isSystem}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  The display name shown to users
                </p>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Field Name <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    pattern="^[a-zA-Z0-9_]+$"
                    title="Use only letters, numbers, and underscores"
                    required
                    disabled={isSystem}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  The database field name (letters, numbers, underscores only)
                </p>
              </div>
              
              <div className="sm:col-span-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <div className="mt-1">
                  <textarea
                    name="description"
                    id="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleInputChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Optional help text shown to users
                </p>
              </div>
              
              {/* Field properties */}
              <div className="sm:col-span-3">
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                  Field Type <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <select
                    name="type"
                    id="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    required
                    disabled={isSystem}
                  >
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
              
              <div className="sm:col-span-3">
                <label htmlFor="profileType" className="block text-sm font-medium text-gray-700">
                  Profile Type <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <select
                    name="profileType"
                    id="profileType"
                    value={formData.profileType}
                    onChange={handleInputChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    required
                    disabled={isSystem}
                  >
                    <option value="TALENT">Talent Profiles Only</option>
                    <option value="STUDIO">Studio Profiles Only</option>
                    <option value="BOTH">Both Profile Types</option>
                  </select>
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="groupName" className="block text-sm font-medium text-gray-700">
                  Group Name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="groupName"
                    id="groupName"
                    value={formData.groupName}
                    onChange={handleInputChange}
                    list="commonGroups"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                  <datalist id="commonGroups">
                    {commonGroups.map(group => (
                      <option key={group} value={group} />
                    ))}
                  </datalist>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Fields are grouped by name in the profile form
                </p>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="placeholder" className="block text-sm font-medium text-gray-700">
                  Placeholder
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="placeholder"
                    id="placeholder"
                    value={formData.placeholder}
                    onChange={handleInputChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="defaultValue" className="block text-sm font-medium text-gray-700">
                  Default Value
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="defaultValue"
                    id="defaultValue"
                    value={formData.defaultValue}
                    onChange={handleInputChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="isRequired"
                      name="isRequired"
                      type="checkbox"
                      checked={formData.isRequired}
                      onChange={handleCheckboxChange}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="isRequired" className="font-medium text-gray-700">
                      Required Field
                    </label>
                    <p className="text-gray-500">Users must complete this field</p>
                  </div>
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="isVisible"
                      name="isVisible"
                      type="checkbox"
                      checked={formData.isVisible}
                      onChange={handleCheckboxChange}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="isVisible" className="font-medium text-gray-700">
                      Visible
                    </label>
                    <p className="text-gray-500">Show this field in forms</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Options for dropdown fields */}
        {formData.type === 'DROPDOWN' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Dropdown Options</h3>
              <div className="mt-2 mb-4 max-w-xl text-sm text-gray-500">
                <p>Define the options that will appear in the dropdown menu</p>
              </div>
              
              <div className="space-y-4">
                {formData.options.map((option, index) => (
                  <div key={option.id} className="flex items-center space-x-4">
                    <div className="w-6 text-center text-gray-500">{index + 1}</div>
                    
                    <div className="w-1/3">
                      <label className="sr-only">Label</label>
                      <input
                        type="text"
                        placeholder="Display label"
                        value={option.label}
                        onChange={(e) => handleOptionChange(option.id, 'label', e.target.value)}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                    
                    <div className="w-1/3">
                      <label className="sr-only">Value</label>
                      <input
                        type="text"
                        placeholder="Stored value"
                        value={option.value}
                        onChange={(e) => handleOptionChange(option.id, 'value', e.target.value)}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="radio"
                        checked={option.isDefault}
                        onChange={() => handleOptionChange(option.id, 'isDefault', true)}
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                      />
                      <label className="ml-2 text-sm text-gray-700">Default</label>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(option.id)}
                      className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Add Option
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Validation rules */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Validation Rules</h3>
            <div className="mt-2 mb-4 max-w-xl text-sm text-gray-500">
              <p>Define validation rules for this field</p>
            </div>
            
            <div className="space-y-4">
              {formData.validationRules.map((rule, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="w-1/4">
                    <label className="sr-only">Rule Type</label>
                    <select
                      value={rule.type}
                      onChange={(e) => handleValidationRuleChange(index, 'type', e.target.value)}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="min">Minimum</option>
                      <option value="max">Maximum</option>
                      <option value="pattern">Pattern</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  
                  <div className="w-1/4">
                    <label className="sr-only">Value</label>
                    <input
                      type="text"
                      placeholder="Value"
                      value={rule.value.toString()}
                      onChange={(e) => handleValidationRuleChange(index, 'value', e.target.value)}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="w-1/3">
                    <label className="sr-only">Error Message</label>
                    <input
                      type="text"
                      placeholder="Error message"
                      value={rule.message}
                      onChange={(e) => handleValidationRuleChange(index, 'message', e.target.value)}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => handleRemoveValidationRule(index)}
                    className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={handleAddValidationRule}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Add Validation Rule
              </button>
            </div>
          </div>
        </div>
        
        {/* Form actions */}
        <div className="flex justify-end">
          <Link
            href="/admin/schema"
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-3"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
          >
            {saving ? 'Saving...' : 'Save Field'}
          </button>
        </div>
      </form>
    </div>
  );
}