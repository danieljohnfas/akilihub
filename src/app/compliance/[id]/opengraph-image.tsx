import { ImageResponse } from 'next/og';
import { db, safeQuery } from '@/lib/db/client';
import { businesses, businessTypes } from '@/lib/db/schema/compliance';
import { countries } from '@/lib/db/schema/shared';
import { eq } from 'drizzle-orm';

export const alt = 'Business compliance on AkiliBrain';
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
        name: businesses.name,
        typeName: businessTypes.name,
        status: businesses.status,
        country: countries.name,
      })
      .from(businesses)
      .leftJoin(countries, eq(businesses.countryId, countries.id))
      .leftJoin(businessTypes, eq(businesses.typeId, businessTypes.id))
      .where(eq(businesses.id, params.id))
      .limit(1)
  );

  const biz = data[0];
  const name = biz?.name ?? 'Business Record';
  const type = biz?.typeName ?? 'Business Entity';
  const country = biz?.country ?? 'East Africa';
  const status = biz?.status ?? 'active';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0f0c29 0%, #111827 55%, #1a0533 100%)',
          padding: '60px 72px',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle at 15% 50%, rgba(139,92,246,0.12) 0%, transparent 50%), radial-gradient(circle at 85% 20%, rgba(79,70,229,0.10) 0%, transparent 45%)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#8B5CF6',
            }}
          />
          <span
            style={{
              color: '#C4B5FD',
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            AkiliBrain Compliance
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                background: status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                border: `1px solid ${status === 'active' ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`,
                color: status === 'active' ? '#6EE7B7' : '#FCA5A5',
                padding: '6px 16px',
                borderRadius: 20,
                fontSize: 16,
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              {status}
            </div>
            <div
              style={{
                background: 'rgba(139,92,246,0.15)',
                border: '1px solid rgba(139,92,246,0.35)',
                color: '#C4B5FD',
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
              fontSize: name.length > 50 ? 48 : 60,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              maxWidth: 900,
            }}
          >
            {name}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <span style={{ color: '#9CA3AF', fontSize: 20 }}>📍 {country}</span>
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
            akilibrain.com/compliance
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
