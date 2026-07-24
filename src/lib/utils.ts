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
