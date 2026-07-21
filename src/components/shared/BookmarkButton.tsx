'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Bookmark } from 'lucide-react';
import { toggleBookmark } from '@/app/actions/bookmarks';
import { toast } from 'sonner';

interface BookmarkButtonProps {
  itemId: string;
  itemType: 'job' | 'tender' | 'guide';
  initialBookmarked?: boolean;
  className?: string;
  showLabel?: boolean;
}

export function BookmarkButton({ itemId, itemType, initialBookmarked = false, className, showLabel = false }: BookmarkButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);

  const handleToggle = () => {
    // Optimistic update
    const nextState = !isBookmarked;
    setIsBookmarked(nextState);

    startTransition(async () => {
      const result = await toggleBookmark(itemId, itemType);
      
      if (result.error) {
        // Revert on error
        setIsBookmarked(!nextState);
        toast.error(result.error);
      } else {
        toast.success(nextState ? 'Saved to your bookmarks.' : 'Removed from your bookmarks.');
      }
    });
  };

  return (
    <Button
      variant="ghost"
      size={showLabel ? "default" : "icon"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleToggle();
      }}
      disabled={isPending}
      className={`relative z-20 ${className}`}
      title={isBookmarked ? "Remove Bookmark" : "Save Bookmark"}
    >
      <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
      {showLabel && <span className="ml-2">{isBookmarked ? 'Saved' : 'Save'}</span>}
    </Button>
  );
}
