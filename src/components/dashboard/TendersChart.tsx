"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type ChartData = {
  status: string;
  count: number;
};

export function TendersChart({ data }: { data: ChartData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center border border-white/10 rounded-xl bg-white/[0.02]">
        <p className="text-white/40 text-sm">No data available for chart</p>
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full border border-white/10 rounded-xl bg-white/[0.02] p-4">
      <h3 className="text-white/80 font-medium mb-6 text-sm">Tenders by Status</h3>
      <ResponsiveContainer width="100%" height="80%">
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis 
            dataKey="status" 
            stroke="#ffffff40" 
            fontSize={12} 
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
          />
          <YAxis 
            stroke="#ffffff40" 
            fontSize={12} 
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip 
            cursor={{ fill: '#ffffff10' }}
            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
            itemStyle={{ color: '#fff' }}
          />
          <Bar dataKey="count" fill="#60a5fa" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
