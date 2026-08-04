"use client";

import { useEffect } from "react";
import { trackLastSearch } from "@/app/actions/tracking";

interface SearchTrackerProps {
  query: string;
  module: string;
}

export function SearchTracker({ query, module }: SearchTrackerProps) {
  useEffect(() => {
    if (query && query.trim().length > 0) {
      // Debounce slightly in case of rapid navigation or double rendering
      const timeoutId = setTimeout(() => {
        trackLastSearch(query.trim(), module).catch(console.error);
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [query, module]);

  return null;
}
