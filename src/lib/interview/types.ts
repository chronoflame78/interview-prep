import type { Difficulty } from "@/generated/prisma/enums";
import type {
  AiProviderName,
  Evaluation,
  EvaluationDecision,
} from "@/lib/interview/ai/types";

export type InterviewLanguage = "en" | "vn";

export type InterviewConfig = {
  selectionMode: "random" | "picked";
  questionIds: string[];
  filters?: {
    topicIds?: string[];
    subTopicIds?: string[];
    difficulties?: Difficulty[];
    count: number;
  };
  followUps: { maxPerQuestion: number; enabled: boolean };
  voice: { name: string; rate: number };
  ai: { provider: AiProviderName; model?: string };
  language: InterviewLanguage;
};

export type TurnDto = {
  id: string;
  order: number;
  type: "DB_QUESTION" | "AI_FOLLOWUP";
  questionId: string | null;
  promptText: string;
  answerText: string | null;
  evaluation: Evaluation | null;
  decision: EvaluationDecision | null;
  createdAt: string;
};

export type InterviewSessionDto = {
  id: string;
  status: "ACTIVE" | "COMPLETED" | "ABANDONED";
  config: InterviewConfig;
  startedAt: string;
  endedAt: string | null;
  turns: TurnDto[];
};

export type SubmitAnswerResult = {
  evaluatedTurn: TurnDto;
  nextTurn: TurnDto | null;
  sessionStatus: InterviewSessionDto["status"];
};
