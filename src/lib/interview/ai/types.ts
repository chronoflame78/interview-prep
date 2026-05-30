import type { Difficulty } from "@/generated/prisma/enums";

export type EvaluationDecision =
  | { kind: "followUp"; question: string; reason: string }
  | { kind: "nextQuestion"; reason: string }
  | { kind: "end"; reason: string };

export type Evaluation = {
  score: number;
  strengths: string[];
  gaps: string[];
};

export type ConversationTurn = {
  role: "interviewer" | "candidate";
  text: string;
};

export type EvaluateAnswerInput = {
  question: string;
  expectedAnswer?: string | null;
  userAnswer: string;
  history: ConversationTurn[];
  followUpsRemaining: number;
  difficulty: Difficulty;
  language: "en" | "vn";
};

export type EvaluateAnswerOutput = {
  evaluation: Evaluation;
  decision: EvaluationDecision;
};

export type AiProviderName = "gemini" | "openai";

export interface InterviewAiProvider {
  readonly name: AiProviderName;
  evaluateAnswer(input: EvaluateAnswerInput): Promise<EvaluateAnswerOutput>;
}
