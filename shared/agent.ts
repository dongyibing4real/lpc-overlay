import { z } from 'zod';

export const agentIntentSchema = z.enum(['scenario', 'analysis']);
export type AgentIntent = z.infer<typeof agentIntentSchema>;

export const agentPromptTemplateSchema = z.enum(['general', 'generate-plan', 'explain-view', 'generate-report']);
export type AgentPromptTemplateId = z.infer<typeof agentPromptTemplateSchema>;

export const providerKindSchema = z.enum(['local', 'api']);
export type AgentProviderKind = z.infer<typeof providerKindSchema>;

export const providerIdSchema = z.enum(['local-openai-compatible', 'remote-openai-compatible']);
export type AgentProviderId = z.infer<typeof providerIdSchema>;

export const providerDescriptorSchema = z.object({
  id: providerIdSchema,
  label: z.string(),
  kind: providerKindSchema,
  defaultBaseUrl: z.string(),
  defaultModel: z.string(),
  requiresApiKey: z.boolean(),
});
export type ProviderDescriptor = z.infer<typeof providerDescriptorSchema>;

export const agentProviderConfigSchema = z.object({
  id: providerIdSchema,
  kind: providerKindSchema,
  label: z.string(),
  baseUrl: z.url('Base URL must be a valid URL'),
  model: z.string().min(1, 'Model is required'),
  apiKey: z.string().optional(),
});
export type AgentProviderConfig = z.infer<typeof agentProviderConfigSchema>;

const waferDistortionPatchSchema = z.object({
  Tx: z.number().optional(),
  Ty: z.number().optional(),
  theta: z.number().optional(),
  M: z.number().optional(),
  Sx: z.number().optional(),
  Sy: z.number().optional(),
});

const fieldDistortionPatchSchema = z.object({
  FTx: z.number().optional(),
  FTy: z.number().optional(),
  Ftheta: z.number().optional(),
  FM: z.number().optional(),
  FSx: z.number().optional(),
  FSy: z.number().optional(),
});

const viewStatePatchSchema = z.object({
  granularity: z.enum(['die', 'field']).optional(),
  arrowScaleFactor: z.number().optional(),
  showDisplacementVectors: z.boolean().optional(),
  showFieldBoundaries: z.boolean().optional(),
  showDieBoundaries: z.boolean().optional(),
  colorMapRange: z.tuple([z.number(), z.number()]).optional(),
  dataSource: z.enum(['parameters', 'imported']).optional(),
});

const fieldTransformPatchSchema = z.object({
  Tx: z.number().optional(),
  Ty: z.number().optional(),
  theta: z.number().optional(),
  M: z.number().optional(),
  Sx: z.number().optional(),
  Sy: z.number().optional(),
});

const entityOverlaySchema = z.object({
  cornerDx: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  cornerDy: z.tuple([z.number(), z.number(), z.number(), z.number()]),
});

export const agentActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('set_wafer_distortion'),
    patch: waferDistortionPatchSchema,
  }),
  z.object({
    type: z.literal('set_field_distortion'),
    patch: fieldDistortionPatchSchema,
  }),
  z.object({
    type: z.literal('set_view_state'),
    patch: viewStatePatchSchema,
  }),
  z.object({
    type: z.literal('set_field_transform'),
    fieldId: z.string(),
    patch: fieldTransformPatchSchema,
  }),
  z.object({
    type: z.literal('set_field_corner_overlay'),
    fieldId: z.string(),
    overlay: entityOverlaySchema,
  }),
  z.object({
    type: z.literal('select_field'),
    fieldId: z.string().nullable(),
  }),
  z.object({
    type: z.literal('reset_model'),
  }),
]);
export type AgentAction = z.infer<typeof agentActionSchema>;

export const statsSummarySchema = z.object({
  meanDx: z.number(),
  meanDy: z.number(),
  stdDx: z.number(),
  stdDy: z.number(),
  maxMagnitude: z.number(),
  p99Magnitude: z.number(),
  count: z.number(),
});
export type StatsSummary = z.infer<typeof statsSummarySchema>;

export const sceneContextSummarySchema = z.object({
  layoutConfig: z.object({
    waferDiameterMm: z.number(),
    edgeExclusionMm: z.number(),
    fieldWidthMm: z.number(),
    fieldHeightMm: z.number(),
    diesPerFieldX: z.number(),
    diesPerFieldY: z.number(),
    fieldOffsetX: z.number(),
    fieldOffsetY: z.number(),
  }),
  waferDistortion: waferDistortionPatchSchema.extend({
    Tx: z.number(),
    Ty: z.number(),
    theta: z.number(),
    M: z.number(),
    Sx: z.number(),
    Sy: z.number(),
  }),
  fieldDistortion: fieldDistortionPatchSchema.extend({
    FTx: z.number(),
    FTy: z.number(),
    Ftheta: z.number(),
    FM: z.number(),
    FSx: z.number(),
    FSy: z.number(),
  }),
  epeConfig: z.object({
    mode: z.enum(['none', 'random', 'systematic']),
    magnitude: z.number(),
    systematicAngle: z.number(),
    seed: z.number(),
  }),
  viewState: z.object({
    granularity: z.enum(['die', 'field']),
    dataSource: z.enum(['parameters', 'imported']),
    arrowScaleFactor: z.number(),
    showDisplacementVectors: z.boolean(),
    showFieldBoundaries: z.boolean(),
    showDieBoundaries: z.boolean(),
    colorMapRange: z.tuple([z.number(), z.number()]),
  }),
  selectedFieldId: z.string().nullable(),
  stats: statsSummarySchema.nullable(),
  activeFieldIds: z.array(z.string()),
  editableFieldIds: z.array(z.string()),
  limits: z.object({
    wafer: waferDistortionPatchSchema.extend({
      Tx: z.tuple([z.number(), z.number()]),
      Ty: z.tuple([z.number(), z.number()]),
      theta: z.tuple([z.number(), z.number()]),
      M: z.tuple([z.number(), z.number()]),
      Sx: z.tuple([z.number(), z.number()]),
      Sy: z.tuple([z.number(), z.number()]),
    }),
    field: fieldDistortionPatchSchema.extend({
      FTx: z.tuple([z.number(), z.number()]),
      FTy: z.tuple([z.number(), z.number()]),
      Ftheta: z.tuple([z.number(), z.number()]),
      FM: z.tuple([z.number(), z.number()]),
      FSx: z.tuple([z.number(), z.number()]),
      FSy: z.tuple([z.number(), z.number()]),
    }),
    fieldEdit: fieldTransformPatchSchema.extend({
      Tx: z.tuple([z.number(), z.number()]),
      Ty: z.tuple([z.number(), z.number()]),
      theta: z.tuple([z.number(), z.number()]),
      M: z.tuple([z.number(), z.number()]),
      Sx: z.tuple([z.number(), z.number()]),
      Sy: z.tuple([z.number(), z.number()]),
    }),
    cornerOverlayNm: z.tuple([z.number(), z.number()]),
    arrowScaleFactor: z.tuple([z.number(), z.number()]),
    colorMaxNm: z.tuple([z.number(), z.number()]),
  }),
});
export type SceneContextSummary = z.infer<typeof sceneContextSummarySchema>;

export const agentRequestSchema = z.object({
  planVersion: z.literal('v1'),
  intent: agentIntentSchema,
  templateId: agentPromptTemplateSchema.default('general'),
  userInput: z.string(),
  conversationContext: z.string().optional(),
  provider: agentProviderConfigSchema,
  scene: sceneContextSummarySchema,
});
export type AgentRequest = z.infer<typeof agentRequestSchema>;

export const agentPlanSchema = z.object({
  planVersion: z.literal('v1'),
  intent: agentIntentSchema,
  summary: z.string(),
  analysis: z.string().optional(),
  actions: z.array(agentActionSchema),
  suggestions: z.array(z.string()).default([]),
  providerId: providerIdSchema,
  requiresConfirmation: z.boolean().default(true),
});
export type AgentPlan = z.infer<typeof agentPlanSchema>;

export const agentPlanResponseSchema = z.object({
  plan: agentPlanSchema,
});
export type AgentPlanResponse = z.infer<typeof agentPlanResponseSchema>;

export const providerConnectionRequestSchema = z.object({
  provider: agentProviderConfigSchema,
});
export type ProviderConnectionRequest = z.infer<typeof providerConnectionRequestSchema>;

export const providerConnectionResponseSchema = z.object({
  ok: z.boolean(),
  message: z.string(),
});
export type ProviderConnectionResponse = z.infer<typeof providerConnectionResponseSchema>;

export const DEFAULT_PROVIDER_DESCRIPTORS: ProviderDescriptor[] = [
  {
    id: 'local-openai-compatible',
    label: 'Local OpenAI-Compatible',
    kind: 'local',
    defaultBaseUrl: 'http://127.0.0.1:8000',
    defaultModel: '',
    requiresApiKey: false,
  },
  {
    id: 'remote-openai-compatible',
    label: 'Remote OpenAI-Compatible',
    kind: 'api',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: '',
    requiresApiKey: true,
  },
];

export const DEFAULT_PROVIDER_CONFIGS: Record<AgentProviderId, AgentProviderConfig> = {
  'local-openai-compatible': {
    id: 'local-openai-compatible',
    kind: 'local',
    label: 'Local OpenAI-Compatible',
    baseUrl: 'http://127.0.0.1:8000',
    model: '',
    apiKey: '',
  },
  'remote-openai-compatible': {
    id: 'remote-openai-compatible',
    kind: 'api',
    label: 'Remote OpenAI-Compatible',
    baseUrl: 'https://api.openai.com/v1',
    model: '',
    apiKey: '',
  },
};

export type AgentHistoryItem = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
  plan?: AgentPlan;
};
