import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { salarySubmissions, employers } from "@/lib/db/schema/salaries";
import { z } from "zod";
import { eq, and, ilike } from "drizzle-orm";

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
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = submitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;

    // 1. Find or create employer
    let employerId: string;
    
    // Simple lookup by exact or case-insensitive name within the country
    const existingEmployers = await db
      .select({ id: employers.id })
      .from(employers)
      .where(and(
        ilike(employers.name, data.employerName),
        eq(employers.countryId, data.countryId)
      ))
      .limit(1);

    if (existingEmployers.length > 0) {
      employerId = existingEmployers[0].id;
    } else {
      // Create unverified employer
      const inserted = await db.insert(employers).values({
        name: data.employerName,
        countryId: data.countryId,
        isVerified: false,
      }).returning({ id: employers.id });
      employerId = inserted[0].id;
    }

    // 2. Insert salary submission
    await db.insert(salarySubmissions).values({
      jobTitle: data.jobTitle,
      employerId,
      countryId: data.countryId,
      experienceLevel: data.experienceLevel,
      employmentType: data.employmentType,
      currency: data.currency,
      grossMonthlySalary: data.grossMonthlySalary.toString(), // numeric column expects string
      netMonthlySalary: data.netMonthlySalary?.toString(),
      yearsOfExperience: data.yearsOfExperience,
      isAnonymous: true,
      isVerified: false,
    });

    return NextResponse.json({ success: true, message: "Salary submitted successfully" });
  } catch (error: any) {
    console.error("Salary submission error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
