import { inngest } from './client';
import { db } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { tenders } from '@/lib/db/schema/tenders';
import { eq, and, gt, desc } from 'drizzle-orm';
import { countries } from '@/lib/db/schema/shared';

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

export const whatsappBroadcastJob = inngest.createFunction(
  { 
    id: 'whatsapp-daily-broadcast',
    triggers: [{ cron: '0 6 * * *' }] // 6:00 AM UTC -> 9:00 AM EAT
  },
  async ({ step }) => {
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      console.warn('WhatsApp API credentials missing. Skipping broadcast.');
      return { status: 'skipped', reason: 'Missing credentials' };
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // 1. Fetch latest jobs from last 24h
    const newJobs = await step.run('fetch-new-jobs', async () => {
      return db
        .select({
          id: jobs.id,
          title: jobs.title,
          companyName: jobs.companyName,
          country: countries.name,
        })
        .from(jobs)
        .leftJoin(countries, eq(jobs.countryId, countries.id))
        .where(
          and(
            eq(jobs.isActive, true),
            gt(jobs.createdAt, yesterday)
          )
        )
        .orderBy(desc(jobs.createdAt))
        .limit(10);
    });

    // 2. Fetch latest tenders from last 24h
    const newTenders = await step.run('fetch-new-tenders', async () => {
      return db
        .select({
          id: tenders.id,
          title: tenders.title,
          authority: tenders.contractingAuthority,
          country: countries.name,
        })
        .from(tenders)
        .leftJoin(countries, eq(tenders.countryId, countries.id))
        .where(
          and(
            eq(tenders.status, 'open'),
            gt(tenders.createdAt, yesterday)
          )
        )
        .orderBy(desc(tenders.createdAt))
        .limit(5);
    });

    if (newJobs.length === 0 && newTenders.length === 0) {
      return { status: 'skipped', reason: 'No new items to broadcast' };
    }

    // 3. Format message
    const message = await step.run('format-message', () => {
      let text = `🌅 *AkiliBrain Daily Digest* 🌅\nHere are the top opportunities posted in the last 24 hours:\n\n`;

      if (newJobs.length > 0) {
        text += `💼 *Top Jobs*\n`;
        newJobs.forEach((job, index) => {
          const location = job.country ?? 'East Africa';
          text += `${index + 1}. *${job.title}* at ${job.companyName} (${location})\n`;
          text += `👉 https://akilibrain.com/jobs/${job.id}\n\n`;
        });
      }

      if (newTenders.length > 0) {
        text += `🏢 *Top Tenders*\n`;
        newTenders.forEach((tender, index) => {
          const location = tender.country ?? 'East Africa';
          text += `${index + 1}. *${tender.title}* by ${tender.authority} (${location})\n`;
          text += `👉 https://akilibrain.com/tenders/${tender.id}\n\n`;
        });
      }

      text += `\n_View all opportunities on_ https://akilibrain.com`;
      return text;
    });

    // 4. Send Broadcast (assuming using an official WhatsApp channel / number)
    // Note: To broadcast to many users, Meta requires template messages unless users have messaged you in the last 24h.
    // Assuming we have a WhatsApp Channel or a group/list we are authorized to send free-form messages to,
    // or this acts as the foundation to be adapted into a template payload.
    await step.run('send-whatsapp', async () => {
      // In a real scenario with WhatsApp Cloud API, broadcasting to multiple users requires looping over a subscriber list
      // or using a specific group/channel integration. For this foundation, we simulate sending to a configured test number 
      // or a specific channel endpoint if supported by the provider.
      
      const targetPhone = process.env.WHATSAPP_TARGET_PHONE; // E.g., admin or broadcast group ID
      if (!targetPhone) {
        console.log('Simulation: Broadcast message generated:', message);
        return;
      }

      const response = await fetch(`https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: targetPhone,
          type: "text",
          text: { body: message }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`WhatsApp API error: ${errText}`);
      }
    });

    return { status: 'success', jobsSent: newJobs.length, tendersSent: newTenders.length };
  }
);
