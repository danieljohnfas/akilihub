"use client";

import { useEffect } from "react";
import { trackUserActivity } from "@/app/actions/tracking";

export function ActivityTracker() {
  useEffect(() => {
    // We only want to ping the database once every 24 hours per user.
    // We can use localStorage to keep track of the last ping time.
    const lastPing = localStorage.getItem("last_activity_ping");
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    if (!lastPing || (now - parseInt(lastPing, 10) > TWENTY_FOUR_HOURS)) {
      trackUserActivity()
        .then((res) => {
          if (res.success) {
            localStorage.setItem("last_activity_ping", now.toString());
          }
        })
        .catch(console.error);
    }
  }, []);

  return null;
}
