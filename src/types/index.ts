import type { Difficulty } from "@/generated/prisma/enums";

export type QuestionWithRelations = {
  id: string;
  question: string;
  questionVn: string | null;
  questionCus: string | null;
  answer: string | null;
  answerVn: string | null;
  answerCus: string | null;
  difficulty: Difficulty;
  isDefault: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  hasOverride: boolean;
  isImportant: boolean;
  topics: { topic: { id: string; name: string } }[];
  subTopics: { subTopic: { id: string; name: string } }[];
  relatedTo: {
    toQuestion: {
      id: string;
      question: string;
      questionVn: string | null;
      questionCus: string | null;
      difficulty: Difficulty;
    };
  }[];
};

export type TopicWithSubTopics = {
  id: string;
  name: string;
  isDefault: boolean;
  createdBy: string | null;
  subTopics: {
    id: string;
    name: string;
    isDefault: boolean;
  }[];
};

export type QuestionFilters = {
  difficulty?: Difficulty;
  topicId?: string;
  subTopicId?: string;
  search?: string;
  showOnly?: "all" | "mine" | "defaults";
  important?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
};

// ─── Study plans ───

export type PlanSummary = {
  id: string;
  name: string;
  description: string | null;
  /** Visible items only — hidden/unavailable questions are not counted. */
  questionCount: number;
  groupCount: number;
  updatedAt: Date;
};

export type PlanItemView = {
  /** StudyPlanItem.id */
  id: string;
  questionId: string;
  /** null when the question is not visible to the owner right now. */
  question: QuestionWithRelations | null;
};

export type PlanSectionView = {
  /** null = the built-in Ungrouped section. */
  id: string | null;
  name: string;
  /** Ordered by position; hidden items are included as placeholders. */
  items: PlanItemView[];
};

export type PlanView = {
  id: string;
  name: string;
  description: string | null;
  domainId: string | null;
  /** The plan's domain is not the viewer's active domain. */
  isForeignDomain: boolean;
  /** Ungrouped first, then groups by position. */
  sections: PlanSectionView[];
};

/** Body of PUT /api/plans/[id]/layout — the complete arrangement. */
export type PlanLayout = {
  ungrouped: string[];
  groups: { id: string; itemIds: string[] }[];
};
