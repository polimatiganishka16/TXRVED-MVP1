import { notFound } from 'next/navigation';
import { prisma } from '../../../lib/prisma';
import DynamicAssessmentClient from '../../../components/assessment/DynamicAssessmentClient';

export const dynamic = 'force-dynamic';

import { getOrSetCache } from '../../../lib/cache';

async function getScenarioData(scenarioId) {
  const id = Number(scenarioId);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  const scenario = await getOrSetCache(`scenario:${id}:questions`, async () => {
    return prisma.scenario.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        icon: true,
        level: true,
        levelColor: true,
        questions: {
          orderBy: { orderNo: 'asc' },
          select: {
            id: true,
            questionText: true,
            questionType: true,
            orderNo: true,
            options: {
              orderBy: { id: 'asc' },
              select: {
                id: true,
                optionText: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });
  }, 60 * 60);

  if (!scenario) {
    return null;
  }

  return scenario;
}

export default async function AssessmentPage({ params }) {
  const resolvedParams = await params;
  const scenarioId = resolvedParams?.scenarioId;
  const scenario = await getScenarioData(scenarioId);

  if (!scenario) {
    notFound();
  }

  // Log raw audio/video question objects fetched from Prisma for debugging
  try {
    const mediaQuestions = (scenario.questions || []).filter((q) => {
      const t = String(q.questionType ?? q.type ?? '').toLowerCase();
      return t.includes('audio') || t.includes('video') || Boolean(q.audioSrc || q.audioUrl || q.videoSrc || q.videoUrl);
    });
    // Server-side log
    console.log('Raw media questions from Prisma for scenario', scenarioId, mediaQuestions);
  } catch (e) {
    console.log('Failed to log media questions', e);
  }

  return <DynamicAssessmentClient scenario={scenario} questions={scenario.questions} />;
}
