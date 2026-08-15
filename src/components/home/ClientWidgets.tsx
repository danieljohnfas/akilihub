'use client';

import dynamic from 'next/dynamic';

const LeadCapture = dynamic(() => import('@/components/home/LeadCapture').then(mod => mod.LeadCapture), { ssr: false });

export { LeadCapture };
