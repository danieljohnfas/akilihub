import { Inngest } from "inngest";

// Picks up INNGEST_SIGNING_KEY and INNGEST_EVENT_KEY automatically from env
export const inngest = new Inngest({
  id: "akilibrain",
  name: "AkiliBrain",
  // In production, Inngest reads INNGEST_SIGNING_KEY from env for request verification
  // and INNGEST_EVENT_KEY for event publishing — no extra config needed here.
});