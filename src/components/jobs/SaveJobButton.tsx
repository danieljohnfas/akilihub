'use client';

import { useTransition, useState } from 'react';
import { Bookmark, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SaveJobButton({ jobId }: { jobId: string }) {
  const [isPending, startTransition] = useTransition();
  const [optimisticSaved, setOptimisticSaved] = useState(false);

  const handleSave = () => {
    // 1. Instantly update the UI (No waiting for the server)
    setOptimisticSaved(true);

    // 2. Perform the actual slow backend work in a transition
    startTransition(async () => {
      try {
        await fetch('/api/user/save-job', {
          method: 'POST',
          body: JSON.stringify({ jobId })
        });
      } catch (err) {
        // If it actually fails, revert the optimistic state silently
        setOptimisticSaved(false);
      }
    });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border z-50 md:static md:p-0 md:bg-transparent md:border-none">
      {/* 
        Fixed mobile action bar (UX Rule 4: Consistent Onboarding/Action Buttons).
        Always at the bottom of the screen on mobile, falls back to normal flow on desktop.
      */}
      <Button 
        onClick={handleSave} 
        disabled={optimisticSaved || isPending}
        className={`w-full md:w-auto h-12 transition-all ${optimisticSaved ? 'bg-green-600 hover:bg-green-700' : ''}`}
        size="lg"
      >
        {optimisticSaved ? (
          <>
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Saved to Profile
          </>
        ) : (
          <>
            <Bookmark className="w-5 h-5 mr-2" />
            Save Job
          </>
        )}
      </Button>
    </div>
  );
}
