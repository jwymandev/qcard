'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { isUserSuperAdmin } from '@/lib/client-admin-helpers';

interface Settings {
  // Site settings
  siteName: string;
  siteDescription: string;
  supportEmail: string;
  contactPhone: string;
  
  // System settings
  maxUploadSizeMB: number;
  defaultUserRole: string;
  maxImageCount: number;
  
  // Email settings
  emailNotifications: boolean;
  emailService: string;
  emailFrom: string;
  
  // Security settings
  enableTwoFactor: boolean;
  passwordMinLength: number;
  sessionTimeoutMinutes: number;
  
  // Feature flags
  enablePublicProfiles: boolean;
  enableMessaging: boolean;
  enableApplications: boolean;
  
  // Maintenance
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<Settings>({
    siteName: 'QCard',
    siteDescription: 'Casting platform for connecting studios with talent',
    supportEmail: 'support@qcard.com',
    contactPhone: '123-456-7890',
    
    maxUploadSizeMB: 10,
    defaultUserRole: 'USER',
    maxImageCount: 10,
    
    emailNotifications: true,
    emailService: 'AWS SES',
    emailFrom: 'noreply@qcard.com',
    
    enableTwoFactor: false,
    passwordMinLength: 8,
    sessionTimeoutMinutes: 120,
    
    enablePublicProfiles: true,
    enableMessaging: true,
    enableApplications: true,
    
    maintenanceMode: false,
    maintenanceMessage: 'The site is undergoing scheduled maintenance. Please check back soon.',
  });
  
  const [activeTab, setActiveTab] = useState('site');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  
  const isSuperAdmin = isUserSuperAdmin(session);
  
  // Form change handler
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setSettings(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : 
              type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              value
    }));
  };
  
  // Toggle boolean settings
  const handleToggle = (name: keyof Settings) => {
    setSettings(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };
  
  // Save settings
  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    
    try {
      // In a real implementation, call API
      // const response = await fetch('/api/admin/settings', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(settings),
      // });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo, always succeed
      console.log('Settings would be saved:', settings);
      
      setSaveStatus('success');
      setSaveMessage('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
      setSaveMessage('Failed to save settings');
    } finally {
      setSaving(false);
      
      // Clear status after 3 seconds
      setTimeout(() => {
        setSaveStatus(null);
      }, 3000);
    }
  };
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">System Settings</h1>
        <p className="text-gray-600">
          Configure system-wide settings for the platform.
          {!isSuperAdmin && ' Some settings may require super admin privileges.'}
        </p>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveTab('site')}
            className={`${
              activeTab === 'site'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Site Settings
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`${
              activeTab === 'system'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            System Settings
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`${
              activeTab === 'email'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Email Settings
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`${
              activeTab === 'security'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Security
          </button>
          <button
            onClick={() => setActiveTab('features')}
            className={`${
              activeTab === 'features'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Feature Flags
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`${
              activeTab === 'maintenance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Maintenance
          </button>
        </nav>
      </div>
      
      {/* Save status notification */}
      {saveStatus && (
        <div className={`mb-6 rounded-md p-4 ${
          saveStatus === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {saveStatus === 'success' ? (
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                saveStatus === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {saveMessage}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Tab content */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          {/* Site Settings */}
          {activeTab === 'site' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Site Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="siteName" className="block text-sm font-medium text-gray-700 mb-1">
                    Site Name
                  </label>
                  <input
                    type="text"
                    name="siteName"
                    id="siteName"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={settings.siteName}
                    onChange={handleChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="supportEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    Support Email
                  </label>
                  <input
                    type="email"
                    name="supportEmail"
                    id="supportEmail"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={settings.supportEmail}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="siteDescription" className="block text-sm font-medium text-gray-700 mb-1">
                    Site Description
                  </label>
                  <textarea
                    name="siteDescription"
                    id="siteDescription"
                    rows={3}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={settings.siteDescription}
                    onChange={handleChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    name="contactPhone"
                    id="contactPhone"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={settings.contactPhone}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* System Settings */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">System Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="maxUploadSizeMB" className="block text-sm font-medium text-gray-700 mb-1">
                    Max Upload Size (MB)
                  </label>
                  <input
                    type="number"
                    name="maxUploadSizeMB"
                    id="maxUploadSizeMB"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={settings.maxUploadSizeMB}
                    onChange={handleChange}
                    disabled={!isSuperAdmin}
                  />
                  {!isSuperAdmin && (
                    <p className="mt-1 text-xs text-gray-500">Super admin access required</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="maxImageCount" className="block text-sm font-medium text-gray-700 mb-1">
                    Max Images Per Profile
                  </label>
                  <input
                    type="number"
                    name="maxImageCount"
                    id="maxImageCount"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={settings.maxImageCount}
                    onChange={handleChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="defaultUserRole" className="block text-sm font-medium text-gray-700 mb-1">
                    Default User Role
                  </label>
                  <select
                    name="defaultUserRole"
                    id="defaultUserRole"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={settings.defaultUserRole}
                    onChange={handleChange}
                    disabled={!isSuperAdmin}
                  >
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  {!isSuperAdmin && (
                    <p className="mt-1 text-xs text-gray-500">Super admin access required</p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Email Settings */}
          {activeTab === 'email' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Email Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="emailNotifications"
                    checked={settings.emailNotifications}
                    onChange={() => handleToggle('emailNotifications')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="emailNotifications" className="ml-2 block text-sm text-gray-900">
                    Enable Email Notifications
                  </label>
                </div>
                
                <div>
                  <label htmlFor="emailService" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Service Provider
                  </label>
                  <select
                    name="emailService"
                    id="emailService"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={settings.emailService}
                    onChange={handleChange}
                    disabled={!isSuperAdmin}
                  >
                    <option value="AWS SES">AWS SES</option>
                    <option value="SendGrid">SendGrid</option>
                    <option value="Mailgun">Mailgun</option>
                    <option value="SMTP">SMTP</option>
                  </select>
                  {!isSuperAdmin && (
                    <p className="mt-1 text-xs text-gray-500">Super admin access required</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="emailFrom" className="block text-sm font-medium text-gray-700 mb-1">
                    From Email Address
                  </label>
                  <input
                    type="email"
                    name="emailFrom"
                    id="emailFrom"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={settings.emailFrom}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              <div className="pt-5 border-t border-gray-200">
                <button
                  type="button"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={!isSuperAdmin}
                >
                  Test Email Configuration
                </button>
                {!isSuperAdmin && (
                  <p className="mt-2 text-xs text-gray-500">Super admin access required</p>
                )}
              </div>
            </div>
          )}
          
          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enableTwoFactor"
                    checked={settings.enableTwoFactor}
                    onChange={() => handleToggle('enableTwoFactor')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={!isSuperAdmin}
                  />
                  <label htmlFor="enableTwoFactor" className="ml-2 block text-sm text-gray-900">
                    Enable Two-Factor Authentication
                    {!isSuperAdmin && <span className="text-xs text-gray-500 ml-1">(Requires super admin)</span>}
                  </label>
                </div>
                
                <div>
                  <label htmlFor="passwordMinLength" className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Password Length
                  </label>
                  <input
                    type="number"
                    name="passwordMinLength"
                    id="passwordMinLength"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={settings.passwordMinLength}
                    onChange={handleChange}
                    min={6}
                    max={32}
                    disabled={!isSuperAdmin}
                  />
                  {!isSuperAdmin && (
                    <p className="mt-1 text-xs text-gray-500">Super admin access required</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="sessionTimeoutMinutes" className="block text-sm font-medium text-gray-700 mb-1">
                    Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    name="sessionTimeoutMinutes"
                    id="sessionTimeoutMinutes"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={settings.sessionTimeoutMinutes}
                    onChange={handleChange}
                    min={15}
                    disabled={!isSuperAdmin}
                  />
                  {!isSuperAdmin && (
                    <p className="mt-1 text-xs text-gray-500">Super admin access required</p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Feature Flags */}
          {activeTab === 'features' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Feature Flags</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enablePublicProfiles"
                      checked={settings.enablePublicProfiles}
                      onChange={() => handleToggle('enablePublicProfiles')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="enablePublicProfiles" className="ml-2 block text-sm text-gray-900">
                      Enable Public Talent Profiles
                    </label>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    settings.enablePublicProfiles ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {settings.enablePublicProfiles ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enableMessaging"
                      checked={settings.enableMessaging}
                      onChange={() => handleToggle('enableMessaging')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="enableMessaging" className="ml-2 block text-sm text-gray-900">
                      Enable In-App Messaging
                    </label>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    settings.enableMessaging ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {settings.enableMessaging ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enableApplications"
                      checked={settings.enableApplications}
                      onChange={() => handleToggle('enableApplications')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="enableApplications" className="ml-2 block text-sm text-gray-900">
                      Enable Casting Call Applications
                    </label>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    settings.enableApplications ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {settings.enableApplications ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Maintenance Mode */}
          {activeTab === 'maintenance' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Maintenance Settings</h3>
              
              <div className="flex items-center justify-between bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      Maintenance mode will display a message to all users and prevent access to the site.
                      {!isSuperAdmin && ' Super admin access required to enable.'}
                    </p>
                  </div>
                </div>
                
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  settings.maintenanceMode ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  {settings.maintenanceMode ? 'Maintenance Active' : 'Site Online'}
                </span>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="maintenanceMode"
                  checked={settings.maintenanceMode}
                  onChange={() => handleToggle('maintenanceMode')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={!isSuperAdmin}
                />
                <label htmlFor="maintenanceMode" className="ml-2 block text-sm text-gray-900">
                  Enable Maintenance Mode
                </label>
              </div>
              
              <div>
                <label htmlFor="maintenanceMessage" className="block text-sm font-medium text-gray-700 mb-1">
                  Maintenance Message
                </label>
                <textarea
                  name="maintenanceMessage"
                  id="maintenanceMessage"
                  rows={3}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={settings.maintenanceMessage}
                  onChange={handleChange}
                  disabled={!isSuperAdmin}
                />
              </div>
            </div>
          )}
          
          {/* Save button */}
          <div className="pt-5 border-t border-gray-200 mt-6">
            <div className="flex justify-end">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-3"
                onClick={() => window.location.reload()}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}