'use client';

import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';

export default function SignalRadarChart({ data }) {
  return (
    <div style={{ height: '400px', width: '100%', display: 'flex', justifyContent: 'center' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis dataKey="name" stroke="#94A3B8" />
          <PolarRadiusAxis angle={90} domain={[0, 5]} stroke="#64748B" />
          <Radar name="Score" dataKey="value" stroke="#6366F1" fill="#6366F1" fillOpacity={0.3} />
          <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E2E8F0' }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}