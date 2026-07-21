'use client';

import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface ShareButtonProps {
  url?: string;
  title?: string;
  className?: string;
  showLabel?: boolean;
}

export function ShareButton({ url, title, className, showLabel = false }: ShareButtonProps) {
  const handleShare = async () => {
    const shareUrl = url || window.location.href;
    const shareTitle = title || document.title;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // Fallback to clipboard if user cancels or it fails
        if ((err as Error).name !== 'AbortError') {
          copyToClipboard(shareUrl);
        }
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Link copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy link.');
    });
  };

  return (
    <Button
      variant="ghost"
      size={showLabel ? "default" : "icon"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleShare();
      }}
      className={`relative z-20 text-muted-foreground hover:text-foreground ${className}`}
      title="Share"
    >
      <Share2 className="w-4 h-4" />
      {showLabel && <span className="ml-2">Share</span>}
    </Button>
  );
}
