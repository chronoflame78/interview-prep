import { z } from "zod/v4";

export const questionSchema = z.object({
  question: z.string().min(1, "Question is required"),
  questionVn: z.string().optional().nullable(),
  questionCus: z.string().optional().nullable(),
  answer: z.string().optional().nullable(),
  answerVn: z.string().optional().nullable(),
  answerCus: z.string().optional().nullable(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  topicIds: z.array(z.string()).default([]),
  subTopicIds: z.array(z.string()).default([]),
});

export const overrideSchema = z.object({
  question: z.string().optional().nullable(),
  questionVn: z.string().optional().nullable(),
  questionCus: z.string().optional().nullable(),
  answer: z.string().optional().nullable(),
  answerVn: z.string().optional().nullable(),
  answerCus: z.string().optional().nullable(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional().nullable(),
  isHidden: z.boolean().optional(),
});

export type QuestionInput = z.infer<typeof questionSchema>;
export type OverrideInput = z.infer<typeof overrideSchema>;
