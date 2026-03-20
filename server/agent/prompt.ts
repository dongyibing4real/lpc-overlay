import type { AgentIntent, AgentPromptTemplateId, AgentRequest } from '../../shared/agent.js';

function buildIntentInstructions(intent: AgentIntent): string {
  if (intent === 'analysis') {
    return [
      'You are analyzing the current wafer overlay scene.',
      'Explain what visually dominates the current scene and vector map.',
      'Do not return mutation actions unless the user explicitly requests a change.',
    ].join(' ');
  }

  return [
    'You are planning changes to the current wafer overlay scene.',
    'Prefer the minimum set of actions needed to satisfy the request.',
    'When the user asks for stronger, softer, more centered, more regular, or different granularity, express that through structured actions.',
  ].join(' ');
}

function buildTemplateInstructions(templateId: AgentPromptTemplateId): string {
  switch (templateId) {
    case 'generate-plan':
      return 'Template: Generate a new overlay plan or scene proposal based on the user request and the current scene context.';
    case 'explain-view':
      return 'Template: Explain the current scene and vector map clearly, focusing on what is visually dominant and why.';
    case 'generate-report':
      return 'Template: Produce a concise report-style response about the current scene, including dominant effects, readability, and useful next adjustments.';
    default:
      return 'Template: Use the user request directly and choose the most appropriate response within the current scene context.';
  }
}

export function buildAgentSystemPrompt(request: AgentRequest): string {
  return [
    'You are Overlay Agent for a wafer overlay distortion visualization tool.',
    buildIntentInstructions(request.intent),
    buildTemplateInstructions(request.templateId),
    'Return valid JSON only. Do not wrap it in markdown fences.',
    'Use this exact shape:',
    JSON.stringify({
      planVersion: 'v1',
      intent: request.intent,
      summary: 'short summary',
      analysis: 'optional explanation',
      actions: [
        {
          type: 'set_view_state',
          patch: {
            granularity: 'die',
            arrowScaleFactor: 52000,
            colorMapRange: [0, 320],
          },
        },
      ],
      suggestions: ['Create a more center-focused variation'],
      providerId: request.provider.id,
      requiresConfirmation: true,
    }),
    'Available action types: set_wafer_distortion, set_field_distortion, set_view_state, set_field_transform, set_field_corner_overlay, select_field, reset_model.',
    'Action shape examples:',
    JSON.stringify({
      set_wafer_distortion: { type: 'set_wafer_distortion', patch: { Tx: 120, Ty: -80 } },
      set_field_distortion: { type: 'set_field_distortion', patch: { FTx: -40, FSx: 1.2 } },
      set_view_state: { type: 'set_view_state', patch: { granularity: 'die', arrowScaleFactor: 52000, colorMapRange: [0, 320] } },
      set_field_transform: { type: 'set_field_transform', fieldId: 'f_0_0', patch: { Tx: 80, theta: 0.8 } },
      set_field_corner_overlay: { type: 'set_field_corner_overlay', fieldId: 'f_0_0', overlay: { cornerDx: [120, 40, -120, -30], cornerDy: [80, -20, -80, 25] } },
      select_field: { type: 'select_field', fieldId: 'f_0_0' },
      reset_model: { type: 'reset_model' },
    }),
    'Never invent field ids outside scene.editableFieldIds.',
    'Stay within scene.limits.',
    'For analysis intent, return actions: [] unless the prompt clearly asks for a modification.',
  ].join('\n');
}

export function buildAgentUserPrompt(request: AgentRequest): string {
  return [
    `User intent: ${request.intent}`,
    `Prompt template: ${request.templateId}`,
    request.conversationContext ? `Previous conversation summary:\n${request.conversationContext}` : '',
    `User request: ${request.userInput || '(none)'}`,
    'Current scene summary:',
    JSON.stringify(request.scene, null, 2),
  ].filter(Boolean).join('\n\n');
}
