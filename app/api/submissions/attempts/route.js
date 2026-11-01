import { NextResponse } from 'next/server';
import { getSubmissionAttemptCount, getSubmissionAttemptCounts } from '../../../../lib/submissionService';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const candidateId = searchParams.get('candidateId');
        const scenarioId = searchParams.get('scenarioId');
        const scenarioIds = searchParams.get('scenarioIds');

        if (scenarioIds !== null) {
            const ids = scenarioIds.split(',').map((id) => Number(id));
            if (
                !candidateId ||
                ids.length === 0 ||
                ids.length > 100 ||
                ids.some((id) => !Number.isInteger(id) || id <= 0)
            ) {
                return NextResponse.json({ error: 'Valid candidateId and scenarioIds are required' }, { status: 400 });
            }

            const counts = await getSubmissionAttemptCounts(candidateId, ids);
            return NextResponse.json({ counts });
        }

        if (!candidateId || !scenarioId) {
            return NextResponse.json({ error: 'candidateId and scenarioId required' }, { status: 400 });
        }

        const result = await getSubmissionAttemptCount(candidateId, scenarioId);
        return NextResponse.json(result);
    } catch (err) {
        console.error('Attempt count error', err);
        return NextResponse.json({ error: 'internal' }, { status: 500 });
    }
}
