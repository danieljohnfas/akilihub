"use client";

import { useEffect } from "react";
import Clarity from "@microsoft/clarity";

export function ClarityAnalytics() {
  useEffect(() => {
    // Only initialize in the browser, and only in production (optional, but good practice)
    if (typeof window !== "undefined") {
      Clarity.init("xpkd5pzndw");
    }
  }, []);

  return null;
}
