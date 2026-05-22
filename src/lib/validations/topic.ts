import { z } from "zod/v4";

export const topicSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export const subTopicSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  topicId: z.string().min(1, "Topic is required"),
});

export type TopicInput = z.infer<typeof topicSchema>;
export type SubTopicInput = z.infer<typeof subTopicSchema>;
