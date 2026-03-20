import express from 'express';
import {
  DEFAULT_PROVIDER_DESCRIPTORS,
  agentRequestSchema,
  providerConnectionRequestSchema,
} from '../shared/agent.js';
import { generatePlanWithOpenAICompatible, testOpenAICompatibleConnection } from './agent/openaiCompatible.js';

const app = express();
const port = Number(process.env.AGENT_SERVER_PORT || 8787);

app.use(express.json({ limit: '1mb' }));

app.get('/api/agent/providers', (_req, res) => {
  res.json({ providers: DEFAULT_PROVIDER_DESCRIPTORS });
});

app.post('/api/agent/test-connection', async (req, res) => {
  const parsed = providerConnectionRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      message: parsed.error.issues.map((issue) => issue.message).join(' '),
    });
    return;
  }

  const result = await testOpenAICompatibleConnection(parsed.data.provider);
  res.status(result.ok ? 200 : 400).json(result);
});

app.post('/api/agent/plan', async (req, res) => {
  const parsed = agentRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: parsed.error.issues.map((issue) => issue.message).join(' '),
    });
    return;
  }

  try {
    const plan = await generatePlanWithOpenAICompatible(parsed.data);
    res.json({ plan });
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Unknown agent error',
    });
  }
});

app.listen(port, () => {
  console.log(`Overlay Agent server listening on http://127.0.0.1:${port}`);
});
