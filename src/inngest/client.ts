import { Inngest } from "inngest";

// Define strict event types for Fan-Out architecture
export type AppEvents = {
  "data.job.enrich": {
    data: { id: string; targetUrl: string; shallowTitle: string; shallowDesc: string; shallowReq: string | null };
  };
  "data.tender.enrich": {
    data: { id: string; targetUrl: string; shallowTitle: string; shallowDesc: string | null; issuingAuthority: string | null };
  };
  "data.compliance.enrich": {
    data: { id: string; targetUrl: string; shallowTitle: string; shallowDesc: string; issuingAuthority: string | null };
  };
  "data.url.resolve": {
    data: { id: string; module: 'jobs' | 'tenders' | 'compliance'; sourceUrl: string; companyName: string | null; title: string };
  };
  "manual.data.review": {
    data: {};
  };
  "data.verification.v2.start": {
    data: { 
      batchSize?: number;
      startTime?: number;
      lastEmailTime?: number;
    };
  };
};

// Picks up INNGEST_SIGNING_KEY and INNGEST_EVENT_KEY automatically from env
export const inngest = new Inngest({
  id: "akilibrain",
  name: "AkiliBrain",
  // In production, Inngest reads INNGEST_SIGNING_KEY from env for request verification
  // and INNGEST_EVENT_KEY for event publishing — no extra config needed here.
});
