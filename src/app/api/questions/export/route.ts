import { NextResponse } from "next/server";
import TurndownService from "turndown";
import { tables } from "turndown-plugin-gfm";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getQuestionsForUser } from "@/lib/questions";
// Shared with the card view so the file and the screen use one fallback rule.
import {
  CONTENT_LANG_LABELS,
  normalizeLang,
  pickVariant,
  type ContentLang,
} from "@/lib/language";
import type { Difficulty } from "@/generated/prisma/enums";
import type { QuestionFilters, QuestionWithRelations } from "@/types";

function difficultyLabel(d: Difficulty) {
  return d.charAt(0) + d.slice(1).toLowerCase();
}

function buildMarkdown(
  questions: QuestionWithRelations[],
  lang: ContentLang,
  includeAnswers: boolean,
  turndown: TurndownService
) {
  const lines: string[] = [
    `# Interview Questions (${questions.length})`,
    "",
    `_Language: ${CONTENT_LANG_LABELS[lang]} · Exported: ${new Date().toISOString().slice(0, 10)}_`,
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
  const lang = normalizeLang(searchParams.get("lang"));
  const includeAnswers = searchParams.get("answers") !== "false";

  const filters: QuestionFilters = {
    difficulty: (searchParams.get("difficulty") as Difficulty) ?? undefined,
    topicId: searchParams.get("topicId") ?? undefined,
    subTopicId: searchParams.get("subTopicId") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    showOnly:
      (searchParams.get("showOnly") as QuestionFilters["showOnly"]) ??
      undefined,
    important: searchParams.get("important") === "1",
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
  // Turndown drops <table> markup by default; emit GFM tables instead
  turndown.use(tables);
  // Editor cells wrap their text in <p>, which the plugin's cell rule would
  // leave as blank lines and break the row — flatten each cell to one line.
  turndown.addRule("tableCell", {
    filter: ["th", "td"],
    replacement: (content, node) => {
      const text = content.trim().replace(/\|/g, "\\|").replace(/\n+/g, "<br>");
      const siblings = node.parentNode?.childNodes ?? [];
      const isFirst = Array.prototype.indexOf.call(siblings, node) === 0;
      return `${isFirst ? "| " : " "}${text} |`;
    },
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
