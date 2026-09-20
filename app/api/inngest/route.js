const { serve } = require('inngest/next');
const { inngest } = require('../../../lib/inngest');
const { evaluateSubmissionFunction } = require('../../../app/inngest/evaluationFunction');

const handler = serve({
  client: inngest,
  functions: [evaluateSubmissionFunction],
});

export const GET = handler.GET;
export const POST = handler.POST;
export const PUT = handler.PUT;
