import { z } from "zod/v4";

export const PLAN_MAX_QUESTIONS = 500;
export const PLAN_MAX_GROUPS = 50;
export const PLAN_MAX_ADD_PER_REQUEST = 200;

const planName = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(100, "Name must be at most 100 characters");

const planDescription = z
  .string()
  .trim()
  .max(500, "Description must be at most 500 characters")
  .optional()
  .nullable();

export const planSchema = z.object({
  name: planName,
  description: planDescription,
});

export const planUpdateSchema = z.object({
  name: planName.optional(),
  description: planDescription,
});

export const groupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Group name is required")
    .max(100, "Group name must be at most 100 characters"),
});

export const addItemsSchema = z.object({
  questionIds: z
    .array(z.string().min(1))
    .min(1, "Select at least one question")
    .max(
      PLAN_MAX_ADD_PER_REQUEST,
      `At most ${PLAN_MAX_ADD_PER_REQUEST} questions can be added at once`
    )
    .refine((ids) => new Set(ids).size === ids.length, "Duplicate question ids"),
  groupId: z.string().min(1).nullable(),
});

export const planLayoutSchema = z.object({
  ungrouped: z.array(z.string()),
  groups: z
    .array(z.object({ id: z.string(), itemIds: z.array(z.string()) }))
    .max(PLAN_MAX_GROUPS),
});

export type PlanInput = z.infer<typeof planSchema>;
export type PlanUpdateInput = z.infer<typeof planUpdateSchema>;
export type AddItemsInput = z.infer<typeof addItemsSchema>;
