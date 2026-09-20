const { runEvaluationPipeline } = require('../../../services/evaluationPipelineService');

export async function POST(req) {
  try {
    const body = await req.json();
    const { submissionId, scenarioId } = body;
    const result = await runEvaluationPipeline({ submissionId, scenarioId });
    return Response.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error('EVALUATION ERROR:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
