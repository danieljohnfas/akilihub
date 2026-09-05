import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  const expected = process.env.SCRAPE_TRIGGER_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const COUNTRIES = ["ke", "tz", "ug", "rw", "et", "cd", "bi", "so", "ss"];
  const MODULES = ["jobs", "tenders", "compliance"] as const;
  const events: { name: string; data: Record<string, unknown> }[] = [];

  for (const country of COUNTRIES) {
    for (const module of MODULES) {
      events.push({
        name: `manual.scrape.${module}`,
        data: { countryCode: country, isMassScrape: true },
      });
    }
  }

  events.push({ name: "manual.data.review", data: {} });

  try {
    await inngest.send(events as Parameters<typeof inngest.send>[0]);
    return NextResponse.json({ success: true, count: events.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
