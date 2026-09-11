import { prisma } from '../../../lib/prisma';
import AdminDashboardContent from '../../../components/admin/AdminDashboardContent';

export const dynamic = 'force-dynamic';

function formatActivityTime(value) {
  if (!value) {
    return 'Just now';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

async function getAdminDashboardData() {
  const [scenarioCount, candidateCount, evaluatorCount, submissionCount, latestSubmissions, latestEvaluations] = await Promise.all([
    prisma.scenario.count(),
    prisma.user.count({ where: { role: 'CANDIDATE' } }),
    prisma.user.count({ where: { role: 'EVALUATOR' } }),
    prisma.submission.count(),
    prisma.submission.findMany({
      take: 5,
      orderBy: { id: 'desc' },
      select: {
        submittedAt: true,
        candidate: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.evaluationResult.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        evaluator: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  const recentActivity = [
    ...latestSubmissions.map((submission) => ({
      text: `Candidate ${submission.candidate?.name ?? 'Unknown'} submitted a response`,
      time: formatActivityTime(submission.submittedAt),
      icon: '📝',
      color: '#6366F1',
    })),
    ...latestEvaluations.map((evaluation) => ({
      text: `Evaluator ${evaluation.evaluator?.name ?? 'Review'} completed an evaluation`,
      time: formatActivityTime(evaluation.createdAt),
      icon: '✅',
      color: '#34D399',
    })),
  ].slice(0, 6);

  return {
    stats: [
      {
        label: 'Total Scenarios',
        value: scenarioCount.toString(),
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        ),
        color: '#6366F1',
        bg: 'rgba(99,102,241,0.1)',
        border: 'rgba(99,102,241,0.25)',
        glow: 'rgba(99,102,241,0.2)',
      },
      {
        label: 'Total Candidates',
        value: candidateCount.toString(),
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
        color: '#60A5FA',
        bg: 'rgba(96,165,250,0.1)',
        border: 'rgba(96,165,250,0.25)',
        glow: 'rgba(96,165,250,0.2)',
      },
      {
        label: 'Total Evaluators',
        value: evaluatorCount.toString(),
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
            <polyline points="9 11 12 14 22 4" />
          </svg>
        ),
        color: '#34D399',
        bg: 'rgba(52,211,153,0.1)',
        border: 'rgba(52,211,153,0.25)',
        glow: 'rgba(52,211,153,0.2)',
      },
      {
        label: 'Total Submissions',
        value: submissionCount.toString(),
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        ),
        color: '#A78BFA',
        bg: 'rgba(167,139,250,0.1)',
        border: 'rgba(167,139,250,0.25)',
        glow: 'rgba(167,139,250,0.2)',
      },
    ],
    recentActivity,
    scenarios: await (async () => {
      try {
        const scenarios = await prisma.scenario.findMany({
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            title: true,
            icon: true,
            accent: true,
          },
        });
        const counts = await Promise.all(scenarios.map(s => prisma.submission.count({ where: { scenarioId: s.id } }).catch(() => 0)));
        return scenarios.map((s, i) => ({ id: s.id, title: s.title, icon: s.icon, accent: s.accent, attemptCount: Number(counts[i] || 0) }));
      } catch (e) {
        console.error('Failed to load scenario attempt counts', e);
        return [];
      }
    })(),
  };
}
export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();
  return <AdminDashboardContent stats={data.stats} recentActivity={data.recentActivity} scenarios={data.scenarios} />;
}

