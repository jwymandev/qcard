'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Button from '@/components/ui/button';
import Spinner from '@/components/ui/spinner';

export default function QuestionnairePage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="md" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/sign-in');
    return null;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <Link href="/studio/questionnaires" className="flex items-center">
          Back to Questionnaires
        </Link>
      </div>
      
      <div className="text-center py-12 bg-muted rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Questionnaire Details</h2>
        <p className="mb-6">
          This feature is currently being implemented.
        </p>
        <div className="space-x-4">
          <Link href="/studio/questionnaires">
            <Button>Back to Questionnaires</Button>
          </Link>
          <Link href={`/studio/questionnaires/${params.id}/questions/new`}>
            <Button>Add Question</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}