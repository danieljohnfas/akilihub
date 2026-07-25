import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isGeneratedSlug(ref: string | null | undefined): boolean {
  if (!ref) return true;
  // If it matches a slug pattern (lowercase, numbers, dashes only) and has dashes
  return /^[a-z0-9-]+$/.test(ref) && ref.includes('-');
}

/**
 * Appends standard UTM tracking tags to outgoing external URLs.
 * This lets the target website know the traffic came from AkiliBrain.
 */
export function appendTrackingTag(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsedUrl = new URL(url);
    // Only append to http/https (ignore mailto:, tel:, etc.)
    if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
      parsedUrl.searchParams.set('utm_source', 'akilibrain.com');
      parsedUrl.searchParams.set('utm_medium', 'referral');
      return parsedUrl.toString();
    }
    return url;
  } catch (e) {
    // If it's an invalid URL, return it as is
    return url;
  }
}

