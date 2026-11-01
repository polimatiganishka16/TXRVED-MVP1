'use client';

import dynamic from 'next/dynamic';

const ScoreChartRenderer = dynamic(() => import('./ScoreChartRenderer'), {
  ssr: false,
  loading: () => (
    <div className="rounded-3xl p-8 bg-gradient-to-br from-[#0f172a] to-[#111827] border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.4)]">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Signal Analysis</h2>
        <p className="text-slate-400">Behavioral signal comparison across evaluation dimensions</p>
      </div>
      <div className="h-[400px]" aria-label="Loading signal analysis chart" />
    </div>
  ),
});

export default function ScoreChart({ result }) {
  return <ScoreChartRenderer result={result} />;
}