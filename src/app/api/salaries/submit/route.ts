import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { salarySubmissions, employers } from "@/lib/db/schema/salaries";
import { countries } from "@/lib/db/schema/shared";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { checkSalaryPlausibility } from "@/lib/salaries/verify-plausibility";
import { enforceRateLimit } from "@/lib/security/rate-limit";

/** Collapse whitespace and drop control characters so free-text fields cannot carry prompt/markup payloads. */
const cleanText = (max: number, min = 2) =>
  z
    .string()
    .transform((v) => v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim())
    .pipe(z.string().min(min).max(max));

const submitSchema = z
  .object({
    jobTitle: cleanText(100).describe("Job title"),
    employerName: cleanText(120),
    countryId: z.string().uuid("Invalid country ID"),
    experienceLevel: z.enum(["entry", "mid", "senior", "executive"]),
    employmentType: z.enum(["full_time", "part_time", "contract", "consultancy"]),
    currency: z.string().regex(/^[A-Za-z]{3}$/, "Currency must be a 3-letter ISO code").transform((v) => v.toUpperCase()),
    grossMonthlySalary: z.number().positive("Gross salary must be positive").min(100, "Salary too low").max(100000000, "Salary exceeds plausible maximum"),
    netMonthlySalary: z.number().positive().min(100).max(100000000).optional(),
    yearsOfExperience: z.number().int().min(0).max(60).optional(),
  })
  .refine((d) => d.netMonthlySalary === undefined || d.netMonthlySalary <= d.grossMonthlySalary, {
    message: "Net salary cannot exceed gross salary",
    path: ["netMonthlySalary"],
  });

export async function POST(req: NextRequest) {
  // Anonymous endpoint that feeds public statistics: cap submissions per IP.
  const limited = await enforceRateLimit(req, { prefix: "salary-submit", max: 5, window: "1 h" });
  if (limited) return limited;

  try {
    const body = await req.json().catch(() => null);
    const parsed = submitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;

    // Fetch country name for AI plausibility check
    const countryRow = await db
      .select({ name: countries.name })
      .from(countries)
      .where(eq(countries.id, data.countryId))
      .limit(1);
    const countryName = countryRow[0]?.name ?? "East Africa";

    // 1. Find or create employer (exact, case-insensitive match — never a LIKE pattern,
    //    so "%" in user input cannot attach the submission to an unrelated employer)
    const findEmployer = () =>
      db
        .select({ id: employers.id })
        .from(employers)
        .where(and(sql`lower(${employers.name}) = lower(${data.employerName})`, eq(employers.countryId, data.countryId)))
        .limit(1);

    let employerId: string;
    const existingEmployers = await findEmployer();

    if (existingEmployers.length > 0) {
      employerId = existingEmployers[0].id;
    } else {
      const inserted = await db
        .insert(employers)
        .values({ name: data.employerName, countryId: data.countryId, isVerified: false })
        .onConflictDoNothing()
        .returning({ id: employers.id });
      // A concurrent request may have created it first (unique on name+country).
      employerId = inserted[0]?.id ?? (await findEmployer())[0].id;
    }

    // 2. Strategy 1 — AI plausibility check (conservative: verify only on high confidence)
    const plausibility = await checkSalaryPlausibility({
      jobTitle: data.jobTitle,
      countryName,
      experienceLevel: data.experienceLevel,
      employmentType: data.employmentType,
      currency: data.currency,
      grossMonthlySalary: data.grossMonthlySalary,
    });
    const aiVerified = plausibility.plausible && plausibility.confidence === 'high';

    // 4. Insert salary submission
    const [inserted] = await db
      .insert(salarySubmissions)
      .values({
        jobTitle: data.jobTitle,
        employerId,
        countryId: data.countryId,
        experienceLevel: data.experienceLevel,
        employmentType: data.employmentType,
        currency: data.currency,
        grossMonthlySalary: data.grossMonthlySalary.toString(),
        netMonthlySalary: data.netMonthlySalary?.toString(),
        yearsOfExperience: data.yearsOfExperience,
        isAnonymous: true,
        isVerified: aiVerified,
      })
      .returning({ id: salarySubmissions.id });

    return NextResponse.json({
      success: true,
      message: "Salary submitted successfully",
      verified: aiVerified,
      verificationMethod: aiVerified ? 'ai' : 'pending',
    });
  } catch (error) {
    console.error("Salary submission error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
