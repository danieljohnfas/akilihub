import { ImageResponse } from 'next/og';
import { db, safeQuery } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { countries, regions } from '@/lib/db/schema/shared';
import { eq } from 'drizzle-orm';

export const alt = 'Job posting on AkiliBrain';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const jobTypeLabels: Record<string, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract: 'Contract',
  internship: 'Internship',
  remote: 'Remote',
};

export default async function OgImage({
  params,
}: {
  params: { id: string };
}) {
  const data = await safeQuery(
    db
      .select({
        title: jobs.title,
        companyName: jobs.companyName,
        region: regions.name,
        jobType: jobs.jobType,
        country: countries.name,
      })
      .from(jobs)
      .leftJoin(countries, eq(jobs.countryId, countries.id))
      .leftJoin(regions, eq(jobs.regionId, regions.id))
      .where(eq(jobs.id, params.id))
      .limit(1)
  );

  const job = data[0];
  const title = job?.title ?? 'Job Opening';
  const company = job?.companyName ?? 'Company';
  const location = job?.region ? `${job.country} • ${job.region}` : job?.country ?? 'East Africa';
  const type = jobTypeLabels[job?.jobType ?? 'full_time'] ?? 'Full Time';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0f0c29 0%, #111827 55%, #0d1f0f 100%)',
          padding: '60px 72px',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle at 15% 50%, rgba(245,158,11,0.12) 0%, transparent 50%), radial-gradient(circle at 85% 20%, rgba(16,185,129,0.10) 0%, transparent 45%)',
          }}
        />

        {/* Top: Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#F59E0B',
            }}
          />
          <span
            style={{
              color: '#FCD34D',
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            AkiliBrain Jobs
          </span>
        </div>

        {/* Middle: Job title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Type badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                background: 'rgba(245,158,11,0.15)',
                border: '1px solid rgba(245,158,11,0.35)',
                color: '#FCD34D',
                padding: '6px 16px',
                borderRadius: 20,
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {type}
            </div>
          </div>

          <div
            style={{
              color: '#F9FAFB',
              fontSize: title.length > 50 ? 48 : 60,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              maxWidth: 900,
            }}
          >
            {title}
          </div>
        </div>

        {/* Bottom: Company + Location */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ color: '#6EE7B7', fontSize: 26, fontWeight: 700 }}>{company}</span>
            <span style={{ color: '#9CA3AF', fontSize: 20 }}>📍 {location}</span>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: '10px 20px',
              color: '#6B7280',
              fontSize: 16,
            }}
          >
            akilibrain.com/jobs
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
