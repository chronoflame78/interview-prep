import { geminiProvider } from "./gemini";
import { openaiProvider } from "./openai";
import type { AiProviderName, InterviewAiProvider } from "./types";

export function getAiProvider(name?: AiProviderName): InterviewAiProvider {
  const resolved =
    name ??
    (process.env.INTERVIEW_AI_PROVIDER as AiProviderName | undefined) ??
    "gemini";

  switch (resolved) {
    case "gemini":
      return geminiProvider;
    case "openai":
      return openaiProvider;
    default:
      throw new Error(`Unknown AI provider: ${resolved}`);
  }
}

export type {
  AiProviderName,
  ConversationTurn,
  EvaluateAnswerInput,
  EvaluateAnswerOutput,
  Evaluation,
  EvaluationDecision,
  InterviewAiProvider,
} from "./types";
