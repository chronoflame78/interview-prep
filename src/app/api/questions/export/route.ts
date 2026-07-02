import { NextResponse } from "next/server";
import TurndownService from "turndown";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getQuestionsForUser } from "@/lib/questions";
import type { Difficulty } from "@/generated/prisma/enums";
import type { QuestionFilters, QuestionWithRelations } from "@/types";

const LANGS = ["en", "vn", "cus"] as const;
type ExportLang = (typeof LANGS)[number];

const LANG_LABELS: Record<ExportLang, string> = {
  en: "English",
  vn: "Vietnamese",
  cus: "Custom",
};

function pickVariant(q: QuestionWithRelations, lang: ExportLang) {
  // Fall back to English when the requested variant is empty
  const question =
    (lang === "vn" ? q.questionVn : lang === "cus" ? q.questionCus : null) ||
    q.question;
  const answer =
    (lang === "vn" ? q.answerVn : lang === "cus" ? q.answerCus : null) ||
    q.answer;
  return { question, answer };
}

function difficultyLabel(d: Difficulty) {
  return d.charAt(0) + d.slice(1).toLowerCase();
}

function buildMarkdown(
  questions: QuestionWithRelations[],
  lang: ExportLang,
  includeAnswers: boolean,
  turndown: TurndownService
) {
  const lines: string[] = [
    `# Interview Questions (${questions.length})`,
    "",
    `_Language: ${LANG_LABELS[lang]} · Exported: ${new Date().toISOString().slice(0, 10)}_`,
    "",
  ];

  questions.forEach((q, i) => {
    const { question, answer } = pickVariant(q, lang);
    const questionMd = turndown.turndown(question).trim();

    if (questionMd.includes("\n")) {
      lines.push(`## Question ${i + 1}.`, "", questionMd);
    } else {
      lines.push(`## Question ${i + 1}. ${questionMd}`);
    }
    lines.push("");

    if (includeAnswers) {
      const meta = [`**Difficulty:** ${difficultyLabel(q.difficulty)}`];
      if (q.topics.length > 0) {
        meta.push(
          `**Topics:** ${q.topics.map((t) => t.topic.name).join(", ")}`
        );
      }
      if (q.subTopics.length > 0) {
        meta.push(
          `**Subtopics:** ${q.subTopics.map((s) => s.subTopic.name).join(", ")}`
        );
      }
      lines.push(meta.join(" · "), "");
    }

    if (includeAnswers && answer) {
      const answerMd = turndown.turndown(answer).trim();
      if (answerMd) {
        lines.push("### Answer", "", answerMd, "");
      }
    }

    if (includeAnswers) {
      lines.push("", "", "---", "", "");
    }
  });

  return lines.join("\n");
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const langParam = searchParams.get("lang");
  const lang: ExportLang = LANGS.includes(langParam as ExportLang)
    ? (langParam as ExportLang)
    : "en";
  const includeAnswers = searchParams.get("answers") !== "false";

  const filters: QuestionFilters = {
    difficulty: (searchParams.get("difficulty") as Difficulty) ?? undefined,
    topicId: searchParams.get("topicId") ?? undefined,
    subTopicId: searchParams.get("subTopicId") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    showOnly:
      (searchParams.get("showOnly") as QuestionFilters["showOnly"]) ??
      undefined,
    sort: searchParams.get("sort") ?? "date:desc",
    // Export everything matching the filters, not just the visible page
    page: 1,
    limit: Number.MAX_SAFE_INTEGER,
  };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { activeDomainId: true },
  });

  const questions = await getQuestionsForUser(
    session.user.id,
    filters,
    user?.activeDomainId
  );

  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });

  const markdown = buildMarkdown(questions, lang, includeAnswers, turndown);
  const filename = `questions${includeAnswers ? "" : "-only"}-${lang}-${new Date().toISOString().slice(0, 10)}.md`;

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
