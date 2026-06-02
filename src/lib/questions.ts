import { prisma } from "@/lib/prisma";
import type { Difficulty } from "@/generated/prisma/enums";
import type { QuestionFilters, QuestionWithRelations } from "@/types";

export async function getQuestionsForUser(
  userId: string,
  filters: QuestionFilters = {},
  domainId?: string | null
): Promise<QuestionWithRelations[]> {
  const [questions, overrides] = await Promise.all([
    prisma.question.findMany({
      where: {
        ...(domainId ? { domainId } : {}),
        OR: [
          { isDefault: true },
          { createdBy: userId, isDefault: false },
        ],
      },
      include: {
        topics: { include: { topic: true } },
        subTopics: { include: { subTopic: true } },
        relatedTo: {
          include: {
            toQuestion: {
              select: { id: true, question: true, difficulty: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.userQuestionOverride.findMany({
      where: { userId },
    }),
  ]);

  const overrideMap = new Map(overrides.map((o) => [o.questionId, o]));

  let merged = questions
    .map((q) => {
      const override = overrideMap.get(q.id);
      if (override?.isHidden) return null;

      const result: QuestionWithRelations = {
        id: q.id,
        question: override?.question ?? q.question,
        questionVn: override?.questionVn ?? q.questionVn,
        questionCus: override?.questionCus ?? q.questionCus,
        answer: override?.answer ?? q.answer,
        answerVn: override?.answerVn ?? q.answerVn,
        answerCus: override?.answerCus ?? q.answerCus,
        difficulty: override?.difficulty ?? q.difficulty,
        isDefault: q.isDefault,
        createdBy: q.createdBy,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
        hasOverride: !!override,
        topics: q.topics,
        subTopics: q.subTopics,
        relatedTo: q.relatedTo,
      };
      return result;
    })
    .filter((q): q is QuestionWithRelations => q !== null);

  if (filters.difficulty) {
    merged = merged.filter((q) => q.difficulty === filters.difficulty);
  }
  if (filters.topicId) {
    merged = merged.filter((q) =>
      q.topics.some((t) => t.topic.id === filters.topicId)
    );
  }
  if (filters.subTopicId) {
    merged = merged.filter((q) =>
      q.subTopics.some((s) => s.subTopic.id === filters.subTopicId)
    );
  }
  if (filters.search) {
    const term = filters.search.toLowerCase();
    merged = merged.filter(
      (q) =>
        q.question.toLowerCase().includes(term) ||
        q.questionVn?.toLowerCase().includes(term) ||
        q.answer?.toLowerCase().includes(term) ||
        q.answerVn?.toLowerCase().includes(term)
    );
  }
  if (filters.showOnly === "mine") {
    merged = merged.filter((q) => !q.isDefault);
  } else if (filters.showOnly === "defaults") {
    merged = merged.filter((q) => q.isDefault);
  }

  if (filters.sort) {
    const [field, dir] = filters.sort.split(":");
    merged.sort((a, b) => {
      let cmp = 0;
      if (field === "difficulty") {
        const order: Record<Difficulty, number> = { EASY: 0, MEDIUM: 1, HARD: 2 };
        cmp = order[a.difficulty] - order[b.difficulty];
      } else if (field === "date") {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return dir === "desc" ? -cmp : cmp;
    });
  }

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;
  const start = (page - 1) * limit;
  return merged.slice(start, start + limit);
}

export async function getQuestionForUser(userId: string, questionId: string) {
  const [question, override] = await Promise.all([
    prisma.question.findUnique({
      where: { id: questionId },
      include: {
        topics: { include: { topic: true } },
        subTopics: { include: { subTopic: true } },
        relatedTo: {
          include: {
            toQuestion: {
              select: { id: true, question: true, difficulty: true },
            },
          },
        },
      },
    }),
    prisma.userQuestionOverride.findUnique({
      where: { userId_questionId: { userId, questionId } },
    }),
  ]);

  if (!question) return null;

  return {
    id: question.id,
    question: override?.question ?? question.question,
    questionVn: override?.questionVn ?? question.questionVn,
    questionCus: override?.questionCus ?? question.questionCus,
    answer: override?.answer ?? question.answer,
    answerVn: override?.answerVn ?? question.answerVn,
    answerCus: override?.answerCus ?? question.answerCus,
    difficulty: override?.difficulty ?? question.difficulty,
    isDefault: question.isDefault,
    createdBy: question.createdBy,
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
    hasOverride: !!override,
    topics: question.topics,
    subTopics: question.subTopics,
    relatedTo: question.relatedTo,
  } satisfies QuestionWithRelations;
}
