import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getQuestionsForUser } from "@/lib/questions";
import { questionSchema } from "@/lib/validations/question";
import type { Difficulty } from "@/generated/prisma/enums";
import type { QuestionFilters } from "@/types";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filters: QuestionFilters = {
    difficulty: searchParams.get("difficulty") as Difficulty | undefined,
    topicId: searchParams.get("topicId") ?? undefined,
    subTopicId: searchParams.get("subTopicId") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    showOnly:
      (searchParams.get("showOnly") as QuestionFilters["showOnly"]) ??
      undefined,
    sort: searchParams.get("sort") ?? undefined,
    page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 50,
  };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { activeDomainId: true },
  });

  const questions = await getQuestionsForUser(session.user.id, filters, user?.activeDomainId);
  return NextResponse.json(questions);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = questionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const isAdmin = session.user.role === "ADMIN";

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { activeDomainId: true },
  });

  const question = await prisma.question.create({
    data: {
      question: parsed.data.question,
      questionVn: parsed.data.questionVn,
      questionCus: parsed.data.questionCus,
      answer: parsed.data.answer,
      answerVn: parsed.data.answerVn,
      answerCus: parsed.data.answerCus,
      difficulty: parsed.data.difficulty,
      isDefault: isAdmin && body.isDefault === true,
      createdBy: session.user.id,
      domainId: currentUser?.activeDomainId,
      topics: {
        create: parsed.data.topicIds.map((topicId: string) => ({ topicId })),
      },
      subTopics: {
        create: parsed.data.subTopicIds.map((subTopicId: string) => ({
          subTopicId,
        })),
      },
    },
    include: {
      topics: { include: { topic: true } },
      subTopics: { include: { subTopic: true } },
    },
  });

  return NextResponse.json(question, { status: 201 });
}
