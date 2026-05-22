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
  topics: { topic: { id: string; name: string } }[];
  subTopics: { subTopic: { id: string; name: string } }[];
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
  sort?: string;
  page?: number;
  limit?: number;
};
