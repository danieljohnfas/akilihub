import { ImageResponse } from 'next/og';
import { db, safeQuery } from '@/lib/db/client';
import { tenders, tenderSectors } from '@/lib/db/schema/tenders';
import { countries } from '@/lib/db/schema/shared';
import { eq } from 'drizzle-orm';

export const alt = 'Government tender on AkiliBrain';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage({
  params,
}: {
  params: { id: string };
}) {
  const data = await safeQuery(
    db
      .select({
        title: tenders.title,
        authority: tenders.contractingAuthority,
        status: tenders.status,
        country: countries.name,
        sector: tenderSectors.name,
      })
      .from(tenders)
      .leftJoin(countries, eq(tenders.countryId, countries.id))
      .leftJoin(tenderSectors, eq(tenders.sectorId, tenderSectors.id))
      .where(eq(tenders.id, params.id))
      .limit(1)
  );

  const tender = data[0];
  const title = tender?.title ?? 'Government Tender';
  const authority = tender?.authority ?? 'Government Authority';
  const country = tender?.country ?? 'East Africa';
  const sector = tender?.sector ?? 'Procurement';
  const isOpen = (tender?.status ?? 'open') === 'open';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0f0c29 0%, #111827 55%, #0a0f1e 100%)',
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
              'radial-gradient(circle at 15% 50%, rgba(79,70,229,0.15) 0%, transparent 50%), radial-gradient(circle at 85% 20%, rgba(124,58,237,0.12) 0%, transparent 45%)',
          }}
        />

        {/* Top: Brand + Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#4F46E5',
              }}
            />
            <span
              style={{
                color: '#818CF8',
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              AkiliBrain Tenders
            </span>
          </div>
          <div
            style={{
              background: isOpen ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)',
              border: `1px solid ${isOpen ? 'rgba(16,185,129,0.4)' : 'rgba(107,114,128,0.4)'}`,
              color: isOpen ? '#6EE7B7' : '#9CA3AF',
              padding: '6px 18px',
              borderRadius: 20,
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            {isOpen ? '🟢 OPEN' : '⚫ CLOSED'}
          </div>
        </div>

        {/* Middle: Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              background: 'rgba(79,70,229,0.12)',
              border: '1px solid rgba(79,70,229,0.25)',
              color: '#A5B4FC',
              padding: '6px 16px',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              width: 'fit-content',
            }}
          >
            {sector}
          </div>
          <div
            style={{
              color: '#F9FAFB',
              fontSize: title.length > 55 ? 42 : 54,
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              maxWidth: 900,
            }}
          >
            {title}
          </div>
        </div>

        {/* Bottom: Authority + Country */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ color: '#818CF8', fontSize: 22, fontWeight: 700 }}>{authority}</span>
            <span style={{ color: '#9CA3AF', fontSize: 18 }}>📍 {country}</span>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: '10px 20px',
              color: '#6B7280',
              fontSize: 16,
            }}
          >
            akilibrain.com/tenders
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
