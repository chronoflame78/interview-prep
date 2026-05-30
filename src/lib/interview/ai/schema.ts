export const EVALUATION_PROPERTIES = {
  evaluation: {
    type: "object",
    properties: {
      score: { type: "number" },
      strengths: { type: "array", items: { type: "string" } },
      gaps: { type: "array", items: { type: "string" } },
    },
    required: ["score", "strengths", "gaps"],
  },
  decision: {
    type: "object",
    properties: {
      kind: { type: "string", enum: ["followUp", "nextQuestion", "end"] },
      question: { type: "string" },
      reason: { type: "string" },
    },
    required: ["kind", "reason"],
  },
} as const;

export const EVALUATION_SCHEMA = {
  type: "object",
  properties: EVALUATION_PROPERTIES,
  required: ["evaluation", "decision"],
} as const;
