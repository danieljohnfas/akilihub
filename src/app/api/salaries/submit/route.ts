import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { salarySubmissions, employers } from "@/lib/db/schema/salaries";
import { countries } from "@/lib/db/schema/shared";
import { z } from "zod";
import { eq, and, ilike } from "drizzle-orm";
import { checkSalaryPlausibility } from "@/lib/salaries/verify-plausibility";

const submitSchema = z.object({
  jobTitle: z.string().min(2, "Job title is required"),
  employerName: z.string().min(2, "Employer name is required"),
  countryId: z.string().uuid("Invalid country ID"),
  experienceLevel: z.enum(["entry", "mid", "senior", "executive"]),
  employmentType: z.enum(["full_time", "part_time", "contract", "consultancy"]),
  currency: z.string().min(3),
  grossMonthlySalary: z.number().positive("Gross salary must be positive"),
  netMonthlySalary: z.number().positive().optional(),
  yearsOfExperience: z.number().min(0).optional(),
  // Strategy 3: optional work email for email-domain verification
  workEmail: z.string().email().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
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

    // 1. Find or create employer
    let employerId: string;
    const existingEmployers = await db
      .select({ id: employers.id })
      .from(employers)
      .where(and(ilike(employers.name, data.employerName), eq(employers.countryId, data.countryId)))
      .limit(1);

    if (existingEmployers.length > 0) {
      employerId = existingEmployers[0].id;
    } else {
      const inserted = await db
        .insert(employers)
        .values({ name: data.employerName, countryId: data.countryId, isVerified: false })
        .returning({ id: employers.id });
      employerId = inserted[0].id;
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

    // 3. Strategy 3 — Email domain verification
    // If a work email is provided, verify it matches a non-generic domain.
    // We don't store the email — only use it to elevate trust at submission time.
    let emailVerified = false;
    if (data.workEmail) {
      const domain = data.workEmail.split('@')[1]?.toLowerCase() ?? '';
      const genericDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'protonmail.com'];
      emailVerified = !genericDomains.includes(domain);
    }

    const isVerified = aiVerified || emailVerified;

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
        isVerified,
      })
      .returning({ id: salarySubmissions.id });

    return NextResponse.json({
      success: true,
      message: "Salary submitted successfully",
      verified: isVerified,
      verificationMethod: aiVerified ? 'ai' : emailVerified ? 'email_domain' : 'pending',
    });
  } catch (error: any) {
    console.error("Salary submission error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
