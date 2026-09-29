import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import { hasValidSecret } from "@/lib/security/secrets";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { scrapersDisabled } from "@/lib/scrapers/cost-controls";

export async function GET(request: Request) {
  // Accepts `Authorization: Bearer <secret>` / `x-trigger-secret` (preferred) or the
  // deprecated `?secret=` query parameter (which leaks into access logs).
  if (!hasValidSecret(request, process.env.SCRAPE_TRIGGER_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Each call fans out ~28 AI-backed scrape events, so cap how often it can fire.
  const limited = await enforceRateLimit(request, { prefix: "trigger-scrape", max: 3, window: "1 h", key: "global" });
  if (limited) return limited;

  if (scrapersDisabled()) {
    return NextResponse.json({ success: false, skipped: true, reason: "Scrapers disabled via SCRAPE_DISABLED" }, { status: 503 });
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
  } catch (err) {
    console.error("[trigger-scrape]", err);
    return NextResponse.json({ error: "Failed to dispatch scrape events" }, { status: 500 });
  }
}
