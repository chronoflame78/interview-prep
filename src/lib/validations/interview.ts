import { z } from "zod";

export const DIFFICULTY_VALUES = ["EASY", "MEDIUM", "HARD"] as const;

const filtersSchema = z.object({
  topicIds: z.array(z.string()).optional(),
  subTopicIds: z.array(z.string()).optional(),
  difficulties: z.array(z.enum(DIFFICULTY_VALUES)).optional(),
  count: z.number().int().min(1).max(50),
});

export const createSessionSchema = z
  .object({
    selectionMode: z.enum(["random", "picked"]),
    questionIds: z.array(z.string()).optional(),
    filters: filtersSchema.optional(),
    followUps: z.object({
      enabled: z.boolean(),
      maxPerQuestion: z.number().int().min(0).max(5),
    }),
    voice: z.object({
      name: z.string().min(1),
      rate: z.number().min(0.5).max(2),
    }),
    ai: z.object({
      provider: z.enum(["gemini", "openai"]),
      model: z.string().optional(),
    }),
    language: z.enum(["en", "vn"]),
  })
  .refine(
    (v) =>
      v.selectionMode === "random"
        ? !!v.filters
        : !!v.questionIds && v.questionIds.length > 0,
    {
      message:
        "Provide filters for random mode, or questionIds for picked mode.",
    }
  );

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const submitAnswerSchema = z.object({
  turnId: z.string().min(1),
  answerText: z.string().min(1, "Answer cannot be empty"),
});

export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
