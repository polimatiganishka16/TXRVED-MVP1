'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';

export default function ScoreChartRenderer({ result }) {
  const data = [
    { name: 'Understanding', score: result.understanding, fill: '#06B6D4' },
    { name: 'Awareness', score: result.awareness, fill: '#8B5CF6' },
    { name: 'Decision', score: result.decision, fill: '#F59E0B' },
    { name: 'Clarity', score: result.clarity, fill: '#EC4899' }
  ];

  return (
    <div className="rounded-3xl p-8 bg-gradient-to-br from-[#0f172a] to-[#111827] border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.4)]">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Signal Analysis</h2>
        <p className="text-slate-400">Behavioral signal comparison across evaluation dimensions</p>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
          <XAxis dataKey="name" tick={{ fill: '#CBD5E1', fontSize: 14 }} />
          <YAxis domain={[0, 100]} tick={{ fill: '#CBD5E1' }} />
          <Tooltip
            contentStyle={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '14px',
              color: '#fff'
            }}
          />
          <Bar dataKey="score" radius={[14, 14, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
