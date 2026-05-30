import type { EvaluateAnswerInput } from "./types";

export function buildEvaluationPrompt(input: EvaluateAnswerInput): {
  system: string;
  user: string;
} {
  const langLabel = input.language === "vn" ? "Vietnamese" : "English";
  const canFollowUp = input.followUpsRemaining > 0;

  const system = `You are an experienced technical interviewer conducting a mock interview in ${langLabel}.
Your job is to evaluate the candidate's latest answer and decide what to do next.

You MUST:
1. Score the answer 0-10 (0=no understanding, 10=expert mastery).
2. List specific strengths (what the candidate got right).
3. List specific gaps (what is missing, vague, or wrong).
4. Choose exactly one next action:
   - "followUp": ask a clarifying or deeper question. ONLY pick this if there are follow-ups remaining (${input.followUpsRemaining} left) AND the answer has a real gap worth probing. If you pick this, write the follow-up question in the same language as the interview (${langLabel}).
   - "nextQuestion": move on to the next question. Pick this when the answer is complete enough, OR follow-ups are exhausted, OR the gap is not worth probing.
   - "end": end the interview entirely. ONLY pick this if the candidate explicitly asked to stop, said they cannot continue, or gave up.

Be fair, specific, and concise. Do not reveal the reference answer. Respond with structured JSON only.`;

  const historyBlock = input.history.length
    ? input.history
        .map(
          (h) =>
            `${h.role === "interviewer" ? "Interviewer" : "Candidate"}: ${h.text}`
        )
        .join("\n")
    : "(no prior turns)";

  const expectedLine = input.expectedAnswer
    ? `Reference answer (for your grading only, never reveal): ${input.expectedAnswer}\n`
    : "";

  const user = `Difficulty: ${input.difficulty}
Follow-ups remaining for this question: ${input.followUpsRemaining}${canFollowUp ? "" : " (cannot pick followUp)"}

${expectedLine}Conversation so far:
${historyBlock}

Current question: ${input.question}
Candidate's latest answer: ${input.userAnswer}

Evaluate and decide.`;

  return { system, user };
}
