'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Spinner,
  Card,
  Badge,
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';

interface Application {
  id: string;
  status: string;
  createdAt: string;
  castingCall: {
    id: string;
    title: string;
    project: {
      id: string;
      title: string;
    } | null;
  };
  Profile: {
    id: string;
    User: {
      firstName: string;
      lastName: string;
    };
  };
}

interface Submission {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: string;
  castingCodeId: string;
  castingCode: {
    id: string;
    name: string;
    code: string;
    projectId: string | null;
    project: {
      id: string;
      title: string;
    } | null;
  };
}

interface Project {
  id: string;
  title: string;
  status: string;
  applications: Application[];
  submissions: Submission[];
}

export default function ApplicationsOverviewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState('active');
  const [applicationCount, setApplicationCount] = useState(0);
  const [submissionCount, setSubmissionCount] = useState(0);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/sign-in');
    } else if (status === 'authenticated') {
      fetchProjects();
    }
  }, [status, router]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      // Fetch all projects
      const projectsResponse = await fetch('/api/studio/projects');
      
      if (!projectsResponse.ok) {
        throw new Error('Failed to fetch projects');
      }
      
      const projectsData = await projectsResponse.json();
      
      // Fetch applications for casting calls grouped by projects
      const applicationPromises = projectsData.map(async (project: any) => {
        try {
          // Skip if project has no casting calls
          if (!project.castingCalls || project.castingCalls.length === 0) {
            return { ...project, applications: [], submissions: [] };
          }
          
          // Get applications for all casting calls in this project
          let projectApplications: Application[] = [];
          
          for (const call of project.castingCalls) {
            const appResponse = await fetch(`/api/studio/casting-calls/${call.id}/applications`);
            
            if (appResponse.ok) {
              const appData = await appResponse.json();
              // Add casting call info to each application
              const appsWithCallInfo = appData.map((app: any) => ({
                ...app,
                castingCall: {
                  id: call.id,
                  title: call.title,
                  project: {
                    id: project.id,
                    title: project.title
                  }
                }
              }));
              
              projectApplications = [...projectApplications, ...appsWithCallInfo];
            }
          }
          
          // Get submissions for casting codes related to this project
          let projectSubmissions: Submission[] = [];
          const codesResponse = await fetch(`/api/studio/casting-codes?projectId=${project.id}`);
          
          if (codesResponse.ok) {
            const codesData = await codesResponse.json();
            
            for (const code of codesData) {
              const codeResponse = await fetch(`/api/studio/casting-codes/${code.id}`);
              
              if (codeResponse.ok) {
                const codeData = await codeResponse.json();
                if (codeData.submissions && codeData.submissions.length > 0) {
                  // Add code info to each submission
                  const subsWithCodeInfo = codeData.submissions.map((sub: any) => ({
                    ...sub,
                    castingCodeId: code.id,
                    castingCode: {
                      id: code.id,
                      name: code.name,
                      code: code.code,
                      projectId: project.id,
                      project: {
                        id: project.id,
                        title: project.title
                      }
                    }
                  }));
                  
                  projectSubmissions = [...projectSubmissions, ...subsWithCodeInfo];
                }
              }
            }
          }
          
          return {
            ...project,
            applications: projectApplications,
            submissions: projectSubmissions
          };
        } catch (error) {
          console.error(`Error fetching applications for project ${project.id}:`, error);
          return { ...project, applications: [], submissions: [] };
        }
      });
      
      // Wait for all promises to resolve
      const projectsWithApplications = await Promise.all(applicationPromises);
      
      // Calculate total counts for badges
      let totalApplications = 0;
      let totalSubmissions = 0;
      
      projectsWithApplications.forEach(project => {
        totalApplications += project.applications.length;
        totalSubmissions += project.submissions.length;
      });
      
      setApplicationCount(totalApplications);
      setSubmissionCount(totalSubmissions);
      setProjects(projectsWithApplications);
    } catch (error) {
      console.error('Error fetching projects and applications:', error);
      setError('Failed to load projects and applications. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Filter projects based on the active tab
  const filteredProjects = projects.filter(project => {
    if (activeTab === 'active') {
      return project.status !== 'COMPLETED' && project.status !== 'CANCELLED';
    } else if (activeTab === 'completed') {
      return project.status === 'COMPLETED';
    } else if (activeTab === 'all') {
      return true;
    }
    return false;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'default';
      case 'REJECTED': return 'destructive';
      case 'PENDING': return 'outline';
      default: return 'secondary';
    }
  };

  const getProjectStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'IN_PRODUCTION': return 'bg-blue-100 text-blue-800';
      case 'PLANNING': return 'bg-yellow-100 text-yellow-800';
      case 'CASTING': return 'bg-purple-100 text-purple-800';
      case 'PRE_PRODUCTION': return 'bg-indigo-100 text-indigo-800';
      case 'POST_PRODUCTION': return 'bg-orange-100 text-orange-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={fetchProjects}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Applications Overview</h1>
          <p className="text-gray-600">
            Review all applications and submissions across your projects
          </p>
        </div>
        <Link
          href="/studio/dashboard"
          className="mt-4 sm:mt-0 px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
        >
          Back to Dashboard
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Projects</h3>
          <p className="text-2xl font-bold">{projects.length}</p>
          <div className="mt-2 flex space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs ${getProjectStatusBadgeClass('CASTING')}`}>
              {projects.filter(p => p.status === 'CASTING').length} Casting
            </span>
            <span className={`px-2 py-1 rounded-full text-xs ${getProjectStatusBadgeClass('IN_PRODUCTION')}`}>
              {projects.filter(p => p.status === 'IN_PRODUCTION').length} In Production
            </span>
          </div>
        </Card>
        
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Applications</h3>
          <p className="text-2xl font-bold">{applicationCount}</p>
          <div className="mt-2 flex space-x-2">
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
              {projects.reduce((sum, project) => 
                sum + project.applications.filter(app => app.status === 'PENDING').length, 0)} Pending
            </span>
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
              {projects.reduce((sum, project) => 
                sum + project.applications.filter(app => app.status === 'APPROVED').length, 0)} Approved
            </span>
          </div>
        </Card>
        
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Casting Code Submissions</h3>
          <p className="text-2xl font-bold">{submissionCount}</p>
          <div className="mt-2 flex space-x-2">
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
              {projects.reduce((sum, project) => 
                sum + project.submissions.filter(sub => sub.status === 'PENDING').length, 0)} Pending
            </span>
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
              {projects.reduce((sum, project) => 
                sum + project.submissions.filter(sub => sub.status === 'APPROVED').length, 0)} Approved
            </span>
          </div>
        </Card>
      </div>
      
      <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="active">Active Projects</TabsTrigger>
          <TabsTrigger value="completed">Completed Projects</TabsTrigger>
          <TabsTrigger value="all">All Projects</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-4">
          {filteredProjects.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-gray-500">No projects found in this category.</p>
            </Card>
          ) : (
            <div className="space-y-8">
              {filteredProjects.map(project => (
                <Card key={project.id} className="overflow-hidden">
                  <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-lg">{project.title}</h3>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getProjectStatusBadgeClass(project.status)}`}>
                          {project.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/studio/projects/${project.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View Project
                    </Link>
                  </div>
                  
                  <div className="p-4">
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">Applications from Casting Calls</h4>
                        <Link
                          href={`/studio/projects/${project.id}/submissions`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View All Applications
                        </Link>
                      </div>
                      
                      {project.applications.length === 0 ? (
                        <p className="text-gray-500 text-sm">No applications yet</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Applicant
                                </th>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Casting Call
                                </th>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Date Applied
                                </th>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Status
                                </th>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {project.applications.slice(0, 5).map(application => (
                                <tr key={application.id}>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    {application.Profile.User.firstName} {application.Profile.User.lastName}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    {application.castingCall.title}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(application.createdAt).toLocaleDateString()}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    <Badge variant={getStatusBadgeVariant(application.status)}>
                                      {application.status}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-blue-600">
                                    <Link href={`/studio/applications/${application.castingCall.id}`}>
                                      Review
                                    </Link>
                                  </td>
                                </tr>
                              ))}
                              {project.applications.length > 5 && (
                                <tr>
                                  <td colSpan={5} className="px-4 py-2 text-center text-sm text-gray-500">
                                    + {project.applications.length - 5} more applications
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">Casting Code Submissions</h4>
                        <Link
                          href={`/studio/projects/${project.id}/submissions`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View All Submissions
                        </Link>
                      </div>
                      
                      {project.submissions.length === 0 ? (
                        <p className="text-gray-500 text-sm">No submissions yet</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Name
                                </th>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Casting Code
                                </th>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Date Submitted
                                </th>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Status
                                </th>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {project.submissions.slice(0, 5).map(submission => (
                                <tr key={submission.id}>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    {submission.firstName} {submission.lastName}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    {submission.castingCode?.name || 'Unknown'}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(submission.createdAt).toLocaleDateString()}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    <Badge variant={getStatusBadgeVariant(submission.status)}>
                                      {submission.status}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-blue-600">
                                    <Link href={`/studio/casting-codes/${submission.castingCodeId}/submissions`}>
                                      Review
                                    </Link>
                                  </td>
                                </tr>
                              ))}
                              {project.submissions.length > 5 && (
                                <tr>
                                  <td colSpan={5} className="px-4 py-2 text-center text-sm text-gray-500">
                                    + {project.submissions.length - 5} more submissions
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}