import type {
  EvaluateAnswerInput,
  EvaluateAnswerOutput,
  InterviewAiProvider,
} from "./types";
import { buildEvaluationPrompt } from "./prompts";
import { EVALUATION_PROPERTIES } from "./schema";

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export const openaiProvider: InterviewAiProvider = {
  name: "openai",

  async evaluateAnswer(
    input: EvaluateAnswerInput
  ): Promise<EvaluateAnswerOutput> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

    const { system, user } = buildEvaluationPrompt(input);

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "evaluate_answer",
            strict: true,
            schema: {
              type: "object",
              properties: EVALUATION_PROPERTIES,
              required: ["evaluation", "decision"],
              additionalProperties: false,
            },
          },
        },
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("OpenAI returned no content");

    return JSON.parse(text) as EvaluateAnswerOutput;
  },
};
