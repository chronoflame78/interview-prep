// Which language variant of a question's content to show or emit.
// The reading surface holds the choice in the URL (`?lang=`), the export takes
// it from its own dropdown — both resolve it through this module so the screen
// and the exported file can never disagree about the fallback rule.

import { LANGUAGES } from "@/lib/constants";

export type ContentLang = (typeof LANGUAGES)[number]["key"];

export const CONTENT_LANGS: ContentLang[] = LANGUAGES.map((l) => l.key);

export const CONTENT_LANG_LABELS = Object.fromEntries(
  LANGUAGES.map((l) => [l.key, l.label])
) as Record<ContentLang, string>;

/** Anything that is not one of the three known keys reads as English. */
export function normalizeLang(value: string | null | undefined): ContentLang {
  return CONTENT_LANGS.includes(value as ContentLang)
    ? (value as ContentLang)
    : "en";
}

/**
 * The content fields the pickers read. `QuestionWithRelations` satisfies this,
 * and so does a related-question row carrying only the question variants.
 */
export type QuestionVariants = {
  question: string;
  questionVn?: string | null;
  questionCus?: string | null;
  answer?: string | null;
  answerVn?: string | null;
  answerCus?: string | null;
};

/** The question body in `lang`, falling back to English when it is empty. */
export function pickTitle(q: QuestionVariants, lang: ContentLang): string {
  const variant = lang === "vn" ? q.questionVn : lang === "cus" ? q.questionCus : null;
  return variant || q.question;
}

/**
 * Question and answer in `lang`. The fallback is per field, so a question with
 * a Vietnamese body but no Vietnamese answer shows the English answer.
 */
export function pickVariant(q: QuestionVariants, lang: ContentLang) {
  const variant = lang === "vn" ? q.answerVn : lang === "cus" ? q.answerCus : null;
  return {
    question: pickTitle(q, lang),
    answer: variant || q.answer || null,
  };
}
