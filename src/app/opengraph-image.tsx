import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = "AkiliBrain — East Africa's Professional Intelligence Platform";
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
          background: 'linear-gradient(135deg, #0f0c29 0%, #111827 50%, #1a0533 100%)',
          padding: '72px 80px',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decorative grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle at 20% 50%, rgba(79,70,229,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(124,58,237,0.12) 0%, transparent 45%)',
          }}
        />

        {/* Logo mark */}
        <div
          style={{
            position: 'absolute',
            top: 60,
            right: 80,
            width: 200,
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(79,70,229,0.25) 0%, transparent 70%)',
          }}
        >
          {/* Neural network brain SVG inline */}
          <svg width="140" height="140" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 8C34 8 22 20 22 35c0 6 2 11 6 15-3 3-5 7-5 12 0 9 7 16 16 16 2 0 4 0 6-1v6c0 2 2 4 5 4s5-2 5-4v-6c2 1 4 1 6 1 9 0 16-7 16-16 0-5-2-9-5-12 4-4 6-9 6-15 0-15-12-27-28-27z" fill="url(#og-g)" opacity="0.2"/>
            <defs>
              <linearGradient id="og-g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#4F46E5"/>
                <stop offset="100%" stopColor="#7C3AED"/>
              </linearGradient>
            </defs>
            <line x1="50" y1="22" x2="35" y2="38" stroke="#6366F1" strokeWidth="2" strokeLinecap="round"/>
            <line x1="50" y1="22" x2="65" y2="38" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"/>
            <line x1="35" y1="38" x2="50" y2="52" stroke="#6366F1" strokeWidth="2" strokeLinecap="round"/>
            <line x1="65" y1="38" x2="50" y2="52" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"/>
            <line x1="35" y1="38" x2="27" y2="55" stroke="#6366F1" strokeWidth="2" strokeLinecap="round"/>
            <line x1="65" y1="38" x2="73" y2="55" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"/>
            <line x1="50" y1="52" x2="27" y2="55" stroke="#6366F1" strokeWidth="2" strokeLinecap="round"/>
            <line x1="50" y1="52" x2="73" y2="55" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"/>
            <line x1="27" y1="55" x2="38" y2="72" stroke="#6366F1" strokeWidth="2" strokeLinecap="round"/>
            <line x1="73" y1="55" x2="62" y2="72" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="50" cy="22" r="5" fill="#4F46E5"/>
            <circle cx="35" cy="38" r="4.5" fill="#5B50EA"/>
            <circle cx="65" cy="38" r="4.5" fill="#6B4FED"/>
            <circle cx="50" cy="52" r="6" fill="#5F3FEA"/>
            <circle cx="27" cy="55" r="4" fill="#4F46E5"/>
            <circle cx="73" cy="55" r="4" fill="#7C3AED"/>
            <circle cx="38" cy="72" r="4" fill="#6144EC"/>
            <circle cx="62" cy="72" r="4" fill="#7C3AED"/>
          </svg>
        </div>

        {/* Brand tag */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 28,
          }}
        >
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
              fontWeight: 600,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            AkiliBrain
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            color: '#F9FAFB',
            fontSize: 64,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            maxWidth: 820,
            marginBottom: 24,
          }}
        >
          East Africa&apos;s Professional{' '}
          <span style={{ color: '#818CF8' }}>Intelligence Platform</span>
        </div>

        {/* Sub */}
        <div
          style={{
            color: '#9CA3AF',
            fontSize: 26,
            fontWeight: 400,
            maxWidth: 720,
            lineHeight: 1.4,
          }}
        >
          Tenders · Compliance · Health Data · Salaries
        </div>
      </div>
    ),
    { ...size }
  );
}
