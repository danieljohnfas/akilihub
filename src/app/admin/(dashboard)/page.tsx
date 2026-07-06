export const dynamic = 'force-dynamic';

import { safeQuery, db } from '@/lib/db/client';
import { tenders } from '@/lib/db/schema/tenders';
import { businesses } from '@/lib/db/schema/compliance';
import { salarySubmissions } from '@/lib/db/schema/salaries';
import { healthDataPoints } from '@/lib/db/schema/health';
import { count } from 'drizzle-orm';
import { FileText, ShieldCheck, Banknote, Activity, TrendingUp, Database } from 'lucide-react';
import { TendersChart } from '@/components/dashboard/TendersChart';
import { sql } from 'drizzle-orm';

async function getStats() {
  const [t, b, s, h] = await Promise.all([
    safeQuery(db.select({ count: count() }).from(tenders)),
    safeQuery(db.select({ count: count() }).from(businesses)),
    safeQuery(db.select({ count: count() }).from(salarySubmissions)),
    safeQuery(db.select({ count: count() }).from(healthDataPoints)),
  ]);
  return {
    tenders: t[0]?.count ?? 0,
    businesses: b[0]?.count ?? 0,
    salaries: s[0]?.count ?? 0,
    health: h[0]?.count ?? 0,
  };
}

async function getChartData() {
  const data = await safeQuery(
    db.select({
      status: tenders.status,
      count: count(),
    })
    .from(tenders)
    .groupBy(tenders.status)
  );
  
  return data.map(d => ({
    status: String(d.status),
    count: Number(d.count)
  }));
}

export default async function AdminDashboardPage() {
  const stats = await getStats();
  const chartData = await getChartData();

  const cards = [
    { label: 'Tenders', value: stats.tenders, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
    { label: 'Businesses', value: stats.businesses, icon: ShieldCheck, color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20' },
    { label: 'Salary Reports', value: stats.salaries, icon: Banknote, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20' },
    { label: 'Health Records', value: stats.health, icon: Activity, color: 'text-teal-400', bg: 'bg-teal-400/10 border-teal-400/20' },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-white/40 text-sm mt-1">Overview of your AkiliBrain platform</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 hover:bg-white/[0.05] transition-colors">
            <div className={`w-10 h-10 rounded-lg ${bg} border flex items-center justify-center mb-4`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-3xl font-bold text-white tabular-nums">{value.toLocaleString()}</p>
            <p className="text-white/40 text-sm mt-1">{label}</p>
          </div>
        ))}
      </div>
      
      {/* Chart Section */}
      <div>
        <TendersChart data={chartData} />
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <h2 className="text-white font-medium text-sm">Platform Status</h2>
          </div>
          <div className="space-y-2.5">
            {[
              { label: 'Database', status: stats.tenders > 0 ? 'Connected' : 'Empty / Connecting…', ok: true },
              { label: 'API Routes', status: 'Active', ok: true },
              { label: 'Admin Auth', status: '2FA Enabled', ok: true },
            ].map(({ label, status, ok }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-white/50">{label}</span>
                <span className={`flex items-center gap-1.5 ${ok ? 'text-green-400' : 'text-yellow-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-400' : 'bg-yellow-400'}`} />
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-4 h-4 text-indigo-400" />
            <h2 className="text-white font-medium text-sm">Quick Actions</h2>
          </div>
          <div className="space-y-2">
            {[
              { label: 'View live site', href: '/', external: true },
              { label: 'Manage tenders', href: '/admin/tenders' },
              { label: 'Manage businesses', href: '/admin/compliance' },
            ].map(({ label, href, external }) => (
              <a
                key={label}
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-white/60 hover:text-white text-sm transition-all"
              >
                {label}
                <span className="text-white/20">→</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
