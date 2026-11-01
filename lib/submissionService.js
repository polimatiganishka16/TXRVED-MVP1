import { prisma } from './prisma';

/**
 * Get the number of submission attempts for a candidate on a scenario.
 * Counts rows in the Submission table where candidateId and scenarioId match.
 *
 * @param {number|string} candidateId
 * @param {number|string} scenarioId
 * @returns {Promise<{scenarioId:number,candidateId:number,attemptCount:number}>}
 */
export async function getSubmissionAttemptCount(candidateId, scenarioId) {
    const cand = Number(candidateId);
    const scen = Number(scenarioId);

    if (!Number.isFinite(cand) || !Number.isFinite(scen)) {
        return {
            scenarioId: scen || null,
            candidateId: cand || null,
            attemptCount: 0,
        };
    }

    const attemptCount = await prisma.submission.count({
        where: {
            candidateId: cand,
            scenarioId: scen,
        },
    });

    return {
        scenarioId: scen,
        candidateId: cand,
        attemptCount: Number(attemptCount || 0),
    };
}

export async function getSubmissionAttemptCounts(candidateId, scenarioIds) {
    const cand = Number(candidateId);
    const scenarios = [...new Set(scenarioIds.map(Number))];

    if (!Number.isInteger(cand) || cand <= 0 || scenarios.some((id) => !Number.isInteger(id) || id <= 0)) {
        throw new Error('Invalid candidate or scenario ID');
    }

    const groupedCounts = await prisma.submission.groupBy({
        by: ['scenarioId'],
        where: {
            candidateId: cand,
            scenarioId: { in: scenarios },
        },
        _count: { _all: true },
    });

    return Object.fromEntries(
        scenarios.map((scenarioId) => [
            scenarioId,
            groupedCounts.find((result) => result.scenarioId === scenarioId)?._count._all || 0,
        ])
    );
}

export default getSubmissionAttemptCount;
