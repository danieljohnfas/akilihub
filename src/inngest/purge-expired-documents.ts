import { lt } from "drizzle-orm";
import { inngest } from "./client";
import { db } from "@/lib/db/client";
import { userDocuments } from "@/lib/db/schema/documents";
import { CV_RETENTION_DAYS } from "@/lib/cv-session";

/**
 * Data-retention job: anonymous CV uploads are deleted after CV_RETENTION_DAYS (30) days.
 * (They were previously kept forever with no way for the uploader to remove them.)
 */
export const purgeExpiredDocumentsJob = inngest.createFunction(
  {
    id: "purge-expired-cv-documents",
    name: "Purge expired CV uploads",
    triggers: [{ cron: "30 2 * * *" }], // daily 02:30 UTC
  },
  async ({ step }) => {
    const deleted = await step.run("delete-expired-cvs", async () => {
      const cutoff = new Date(Date.now() - CV_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const rows = await db
        .delete(userDocuments)
        .where(lt(userDocuments.createdAt, cutoff))
        .returning({ id: userDocuments.id });
      return rows.length;
    });
    return { deleted, retentionDays: CV_RETENTION_DAYS };
  }
);
