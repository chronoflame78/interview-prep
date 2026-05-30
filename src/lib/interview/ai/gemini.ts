import type {
  EvaluateAnswerInput,
  EvaluateAnswerOutput,
  InterviewAiProvider,
} from "./types";
import { buildEvaluationPrompt } from "./prompts";
import { EVALUATION_SCHEMA } from "./schema";

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

export const geminiProvider: InterviewAiProvider = {
  name: "gemini",

  async evaluateAnswer(
    input: EvaluateAnswerInput
  ): Promise<EvaluateAnswerOutput> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

    const { system, user } = buildEvaluationPrompt(input);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: EVALUATION_SCHEMA,
          temperature: 0.4,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned no content");

    return JSON.parse(text) as EvaluateAnswerOutput;
  },
};
