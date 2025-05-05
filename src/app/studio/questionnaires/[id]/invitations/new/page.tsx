'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Button from '@/components/ui/button';
import Spinner from '@/components/ui/spinner';

export default function NewInvitationPage({ 
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
        <Link href={`/studio/questionnaires/${params.id}`} className="flex items-center">
          Back to Questionnaire
        </Link>
      </div>
      
      <div className="text-center py-12 bg-muted rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Questionnaire Invitations</h2>
        <p className="mb-6">
          This feature is currently being implemented.
        </p>
        <Link href={`/studio/questionnaires/${params.id}`}>
          <Button>Back to Questionnaire</Button>
        </Link>
      </div>
    </div>
  );
}